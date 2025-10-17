import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Project } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Genera un código único para el proyecto basado en las siglas del nombre y el año
   * Formato: [SIGLAS]-YYYY (ej: SGP-2025)
   */
  private async generateProjectCode(name: string): Promise<string> {
    const year = new Date().getFullYear();
    
    // Extraer siglas del nombre (primeras letras de cada palabra)
    const words = name.trim().split(/\s+/);
    let initials = '';
    
    if (words.length === 1) {
      // Si es una sola palabra, tomar las primeras 3 letras
      initials = words[0].substring(0, 3).toUpperCase();
    } else {
      // Si son múltiples palabras, tomar la primera letra de cada una (máximo 4)
      initials = words
        .slice(0, 4)
        .map(word => word[0])
        .join('')
        .toUpperCase();
    }

    // Buscar si ya existe un proyecto con este código base
    const baseCode = `${initials}-${year}`;
    const existingProject = await this.prismaService.project.findUnique({
      where: { code: baseCode },
    });

    if (!existingProject) {
      return baseCode;
    }

    // Si ya existe, agregar un sufijo numérico
    let counter = 1;
    let newCode = `${initials}-${year}-${counter}`;
    
    while (await this.prismaService.project.findUnique({ where: { code: newCode } })) {
      counter++;
      newCode = `${initials}-${year}-${counter}`;
    }

    return newCode;
  }

  /**
   * Crea un nuevo proyecto Scrum
   * Solo puede ser creado por el usuario autenticado (se convierte en owner)
   */
  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<Project> {
    // Validar que el usuario existe y está activo
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Usuario inactivo');
    }

    // Validar fechas
    const startDate = new Date(createProjectDto.startDate);
    const endDate = createProjectDto.endDate
      ? new Date(createProjectDto.endDate)
      : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Generar código único del proyecto
    const code = await this.generateProjectCode(createProjectDto.name);

    try {
      const project = await this.prismaService.project.create({
        data: {
          ...createProjectDto,
          code,
          startDate,
          endDate,
          ownerId: userId,
          visibility: createProjectDto.visibility ?? 'PRIVATE',
          status: createProjectDto.status ?? 'PLANNING',
        },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return project;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un proyecto con ese código');
      }
      throw e;
    }
  }

  /**
   * Obtiene todos los proyectos
   * Los usuarios pueden ver:
   * - Proyectos públicos
   * - Proyectos donde son owner
   * - Proyectos donde son miembros
   * Los admins ven todos
   */
  async findAll(userId: string, isAdmin: boolean): Promise<Project[]> {
    if (isAdmin) {
      // Los admins ven todos los proyectos
      return this.prismaService.project.findMany({
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              members: true,
              stories: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Usuarios normales ven proyectos públicos, propios o donde son miembros
    return this.prismaService.project.findMany({
      where: {
        OR: [
          { visibility: 'PUBLIC' },
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            members: true,
            stories: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtiene un proyecto por ID
   * Verifica permisos de acceso
   */
  async findOne(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<Project> {
    const project = await this.prismaService.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            role: true,
          },
        },
        _count: {
          select: {
            stories: true,
            estimationSessions: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Proyecto con id ${id} no encontrado`);
    }

    // Verificar permisos
    const hasAccess =
      isAdmin ||
      project.visibility === 'PUBLIC' ||
      project.ownerId === userId ||
      project.members.some((member) => member.userId === userId);

    if (!hasAccess) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    return project;
  }

  /**
   * Actualiza un proyecto
   * Solo el owner o admins pueden actualizar
   */
  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
    isAdmin: boolean,
  ): Promise<Project> {
    const project = await this.prismaService.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Proyecto con id ${id} no encontrado`);
    }

    // Solo el owner o admins pueden actualizar
    if (!isAdmin && project.ownerId !== userId) {
      throw new ForbiddenException(
        'Solo el propietario del proyecto o administradores pueden actualizarlo',
      );
    }

    // Validar fechas si se actualizan
    if (updateProjectDto.startDate || updateProjectDto.endDate) {
      const startDate = updateProjectDto.startDate
        ? new Date(updateProjectDto.startDate)
        : project.startDate;
      const endDate = updateProjectDto.endDate
        ? new Date(updateProjectDto.endDate)
        : project.endDate;

      if (endDate && endDate <= startDate) {
        throw new BadRequestException(
          'La fecha de fin debe ser posterior a la fecha de inicio',
        );
      }
    }

    const data: Prisma.ProjectUpdateInput = { ...updateProjectDto };

    // Convertir fechas si están presentes
    if (updateProjectDto.startDate) {
      data.startDate = new Date(updateProjectDto.startDate);
    }
    if (updateProjectDto.endDate) {
      data.endDate = new Date(updateProjectDto.endDate);
    }

    try {
      return await this.prismaService.project.update({
        where: { id },
        data,
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un proyecto con ese código');
      }
      throw e;
    }
  }

  /**
   * Elimina (archiva) un proyecto
   * Solo el owner o admins pueden eliminar
   */
  async remove(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<Project> {
    const project = await this.prismaService.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Proyecto con id ${id} no encontrado`);
    }

    // Solo el owner o admins pueden eliminar
    if (!isAdmin && project.ownerId !== userId) {
      throw new ForbiddenException(
        'Solo el propietario del proyecto o administradores pueden eliminarlo',
      );
    }

    // En lugar de eliminar, archivamos el proyecto
    return await this.prismaService.project.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });
  }

  /**
   * Obtiene proyectos del usuario (owner o miembro)
   */
  async findUserProjects(userId: string): Promise<Project[]> {
    return this.prismaService.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            members: true,
            stories: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}



