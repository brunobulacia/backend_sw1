import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class ProjectConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verificar acceso del usuario al proyecto
   */
  private async verifyProjectAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { isActive: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const isOwner = project.ownerId === userId;
    const isMember = project.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember && project.visibility === 'PRIVATE') {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    return { project, isOwner, isMember };
  }

  /**
   * Verificar si el usuario es Scrum Master
   */
  private async verifyScrumMaster(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        isActive: true,
        role: 'SCRUM_MASTER',
      },
    });

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    const isOwner = project?.ownerId === userId;

    if (!member && !isOwner) {
      throw new ForbiddenException(
        'Solo el Scrum Master puede modificar las configuraciones del proyecto',
      );
    }

    return true;
  }

  /**
   * Obtener todas las configuraciones de un proyecto
   */
  async getProjectConfigs(projectId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    const configs = await this.prisma.projectConfig.findMany({
      where: { projectId },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Agrupar por categoría
    const grouped = configs.reduce(
      (acc, config) => {
        if (!acc[config.category]) {
          acc[config.category] = [];
        }
        acc[config.category].push(config);
        return acc;
      },
      {} as Record<string, typeof configs>,
    );

    return {
      all: configs,
      byCategory: grouped,
      categories: Object.keys(grouped),
    };
  }

  /**
   * Obtener configuraciones por categoría
   */
  async getConfigsByCategory(
    projectId: string,
    category: string,
    userId: string,
  ) {
    await this.verifyProjectAccess(projectId, userId);

    return this.prisma.projectConfig.findMany({
      where: { projectId, category },
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Crear una configuración
   */
  async createConfig(
    projectId: string,
    createDto: CreateConfigDto,
    userId: string,
  ) {
    await this.verifyScrumMaster(projectId, userId);

    // Verificar si ya existe una config con el mismo key
    const existing = await this.prisma.projectConfig.findFirst({
      where: {
        projectId,
        key: createDto.key,
        category: createDto.category,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Ya existe una configuración con el key "${createDto.key}" en la categoría "${createDto.category}"`,
      );
    }

    return this.prisma.projectConfig.create({
      data: {
        projectId,
        ...createDto,
      },
    });
  }

  /**
   * Crear múltiples configuraciones (batch)
   */
  async batchCreateConfigs(
    projectId: string,
    configs: CreateConfigDto[],
    userId: string,
  ) {
    await this.verifyScrumMaster(projectId, userId);

    // Crear todas las configuraciones en una transacción
    const created = await this.prisma.$transaction(
      configs.map((config) =>
        this.prisma.projectConfig.create({
          data: {
            projectId,
            ...config,
          },
        }),
      ),
    );

    return created;
  }

  /**
   * Actualizar una configuración
   */
  async updateConfig(
    projectId: string,
    configId: string,
    updateDto: UpdateConfigDto,
    userId: string,
  ) {
    await this.verifyScrumMaster(projectId, userId);

    const config = await this.prisma.projectConfig.findUnique({
      where: { id: configId },
    });

    if (!config || config.projectId !== projectId) {
      throw new NotFoundException('Configuración no encontrada');
    }

    if (config.isSystemSetting) {
      throw new ForbiddenException(
        'No se pueden modificar las configuraciones del sistema',
      );
    }

    return this.prisma.projectConfig.update({
      where: { id: configId },
      data: updateDto,
    });
  }

  /**
   * Eliminar una configuración
   */
  async deleteConfig(projectId: string, configId: string, userId: string) {
    await this.verifyScrumMaster(projectId, userId);

    const config = await this.prisma.projectConfig.findUnique({
      where: { id: configId },
    });

    if (!config || config.projectId !== projectId) {
      throw new NotFoundException('Configuración no encontrada');
    }

    if (config.isSystemSetting) {
      throw new ForbiddenException(
        'No se pueden eliminar las configuraciones del sistema',
      );
    }

    await this.prisma.projectConfig.delete({
      where: { id: configId },
    });

    return { message: 'Configuración eliminada correctamente' };
  }

  /**
   * Inicializar configuraciones de Sprint 0
   */
  async initializeSprint0(projectId: string, userId: string) {
    await this.verifyScrumMaster(projectId, userId);

    // Verificar si ya existen configuraciones
    const existingConfigs = await this.prisma.projectConfig.count({
      where: { projectId },
    });

    if (existingConfigs > 0) {
      throw new BadRequestException(
        'El proyecto ya tiene configuraciones. Usa los endpoints de creación individual.',
      );
    }

    // Configuraciones iniciales del Sprint 0
    const sprint0Configs: CreateConfigDto[] = [
      // Definition of Done
      {
        key: 'dod_code_review',
        value: 'true',
        type: 'boolean',
        category: 'definition_of_done',
        description: 'El código debe pasar revisión de pares',
      },
      {
        key: 'dod_unit_tests',
        value: 'true',
        type: 'boolean',
        category: 'definition_of_done',
        description: 'Debe tener pruebas unitarias',
      },
      {
        key: 'dod_integration_tests',
        value: 'false',
        type: 'boolean',
        category: 'definition_of_done',
        description: 'Debe tener pruebas de integración',
      },
      {
        key: 'dod_documentation',
        value: 'true',
        type: 'boolean',
        category: 'definition_of_done',
        description: 'Debe estar documentado',
      },

      // Patrones de Desarrollo
      {
        key: 'architecture_pattern',
        value: 'Clean Architecture',
        type: 'string',
        category: 'development_patterns',
        description: 'Patrón arquitectónico del proyecto',
      },
      {
        key: 'coding_standard',
        value: 'ESLint + Prettier',
        type: 'string',
        category: 'development_patterns',
        description: 'Estándar de código',
      },
      {
        key: 'git_workflow',
        value: 'GitFlow',
        type: 'string',
        category: 'development_patterns',
        description: 'Flujo de trabajo en Git',
      },

      // Infraestructura Tecnológica
      {
        key: 'backend_framework',
        value: 'NestJS',
        type: 'string',
        category: 'tech_infrastructure',
        description: 'Framework del backend',
      },
      {
        key: 'frontend_framework',
        value: 'Next.js',
        type: 'string',
        category: 'tech_infrastructure',
        description: 'Framework del frontend',
      },
      {
        key: 'database',
        value: 'PostgreSQL',
        type: 'string',
        category: 'tech_infrastructure',
        description: 'Base de datos',
      },
      {
        key: 'orm',
        value: 'Prisma',
        type: 'string',
        category: 'tech_infrastructure',
        description: 'ORM utilizado',
      },

      // Modelos Iniciales
      {
        key: 'context_diagram',
        value: '',
        type: 'text',
        category: 'initial_models',
        description: 'URL o descripción del diagrama de contexto',
      },
      {
        key: 'data_model',
        value: '',
        type: 'text',
        category: 'initial_models',
        description: 'URL o descripción del modelo de datos',
      },
      {
        key: 'architecture_diagram',
        value: '',
        type: 'text',
        category: 'initial_models',
        description: 'URL o descripción del diagrama de arquitectura',
      },
    ];

    const created = await this.prisma.$transaction(
      sprint0Configs.map((config) =>
        this.prisma.projectConfig.create({
          data: {
            projectId,
            ...config,
          },
        }),
      ),
    );

    return {
      message: 'Configuraciones de Sprint 0 inicializadas correctamente',
      count: created.length,
      configs: created,
    };
  }
}
