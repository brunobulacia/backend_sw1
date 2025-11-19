import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { UpdateRepositoryDto } from './dto/update-repository.dto';

@Injectable()
export class RepositoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verificar acceso y permisos del usuario al proyecto
   */
  async verifyProjectAccess(projectId: string, userId: string) {
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
    const member = project.members.find((m) => m.userId === userId);
    const isMember = !!member;

    if (!isOwner && !isMember && project.visibility === 'PRIVATE') {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    // Verificar si tiene permisos para editar (Scrum Master, Owner)
    const canEdit =
      isOwner || member?.role === 'SCRUM_MASTER' || member?.role === 'PRODUCT_OWNER';

    return { project, isOwner, isMember, userRole: member?.role, canEdit };
  }

  /**
   * Crear un repositorio para un proyecto
   */
  async createRepository(
    projectId: string,
    createDto: CreateRepositoryDto,
    userId: string,
  ) {
    const { canEdit } = await this.verifyProjectAccess(projectId, userId);

    if (!canEdit) {
      throw new ForbiddenException(
        'Solo el Scrum Master, Product Owner o propietario pueden crear repositorios',
      );
    }

    // Validar URL duplicada dentro del proyecto
    const existingRepo = await this.prisma.repository.findUnique({
      where: {
        projectId_url: {
          projectId,
          url: createDto.url,
        },
      },
    });

    if (existingRepo) {
      throw new BadRequestException('Ya existe un repositorio con esa URL en este proyecto');
    }

    // Si se marca como principal, desmarcar el anterior
    if (createDto.isPrimary) {
      await this.prisma.repository.updateMany({
        where: {
          projectId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // Crear el repositorio
    const repository = await this.prisma.repository.create({
      data: {
        projectId,
        name: createDto.name,
        url: createDto.url,
        mainBranch: createDto.mainBranch || 'main',
        isPrimary: createDto.isPrimary || false,
      },
    });

    return repository;
  }

  /**
   * Obtener todos los repositorios de un proyecto
   */
  async getProjectRepositories(projectId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    const repositories = await this.prisma.repository.findMany({
      where: { projectId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return repositories;
  }

  /**
   * Obtener un repositorio por ID
   */
  async getRepositoryById(
    projectId: string,
    repositoryId: string,
    userId: string,
  ) {
    await this.verifyProjectAccess(projectId, userId);

    const repository = await this.prisma.repository.findFirst({
      where: {
        id: repositoryId,
        projectId,
      },
    });

    if (!repository) {
      throw new NotFoundException('Repositorio no encontrado');
    }

    return repository;
  }

  /**
   * Actualizar un repositorio
   */
  async updateRepository(
    projectId: string,
    repositoryId: string,
    updateDto: UpdateRepositoryDto,
    userId: string,
  ) {
    const { canEdit } = await this.verifyProjectAccess(projectId, userId);

    if (!canEdit) {
      throw new ForbiddenException(
        'Solo el Scrum Master, Product Owner o propietario pueden editar repositorios',
      );
    }

    const repository = await this.prisma.repository.findFirst({
      where: {
        id: repositoryId,
        projectId,
      },
    });

    if (!repository) {
      throw new NotFoundException('Repositorio no encontrado');
    }

    // Validar URL duplicada si se está cambiando
    if (updateDto.url && updateDto.url !== repository.url) {
      const existingRepo = await this.prisma.repository.findUnique({
        where: {
          projectId_url: {
            projectId,
            url: updateDto.url,
          },
        },
      });

      if (existingRepo) {
        throw new BadRequestException(
          'Ya existe un repositorio con esa URL en este proyecto',
        );
      }
    }

    // Si se marca como principal, desmarcar el anterior
    if (updateDto.isPrimary && !repository.isPrimary) {
      await this.prisma.repository.updateMany({
        where: {
          projectId,
          isPrimary: true,
          id: { not: repositoryId },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // Actualizar el repositorio
    const updatedRepository = await this.prisma.repository.update({
      where: { id: repositoryId },
      data: updateDto,
    });

    return updatedRepository;
  }

  /**
   * Eliminar un repositorio
   */
  async deleteRepository(
    projectId: string,
    repositoryId: string,
    userId: string,
  ) {
    const { canEdit } = await this.verifyProjectAccess(projectId, userId);

    if (!canEdit) {
      throw new ForbiddenException(
        'Solo el Scrum Master, Product Owner o propietario pueden eliminar repositorios',
      );
    }

    const repository = await this.prisma.repository.findFirst({
      where: {
        id: repositoryId,
        projectId,
      },
    });

    if (!repository) {
      throw new NotFoundException('Repositorio no encontrado');
    }

    await this.prisma.repository.delete({
      where: { id: repositoryId },
    });

    return { message: 'Repositorio eliminado correctamente' };
  }

  /**
   * Marcar un repositorio como principal
   */
  async setPrimaryRepository(
    projectId: string,
    repositoryId: string,
    userId: string,
  ) {
    const { canEdit } = await this.verifyProjectAccess(projectId, userId);

    if (!canEdit) {
      throw new ForbiddenException(
        'Solo el Scrum Master, Product Owner o propietario pueden marcar repositorios como principales',
      );
    }

    const repository = await this.prisma.repository.findFirst({
      where: {
        id: repositoryId,
        projectId,
      },
    });

    if (!repository) {
      throw new NotFoundException('Repositorio no encontrado');
    }

    // Desmarcar todos los repositorios del proyecto
    await this.prisma.repository.updateMany({
      where: {
        projectId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });

    // Marcar el seleccionado como principal
    const updatedRepository = await this.prisma.repository.update({
      where: { id: repositoryId },
      data: { isPrimary: true },
    });

    return updatedRepository;
  }
}

