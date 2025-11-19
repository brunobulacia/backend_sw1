import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintRetrospectiveDto } from './dto/create-sprint-retrospective.dto';
import { UpdateSprintRetrospectiveDto } from './dto/update-sprint-retrospective.dto';
import { UpdateImprovementActionDto } from './dto/update-improvement-action.dto';

@Injectable()
export class SprintRetrospectiveService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verificar acceso del usuario al sprint
   */
  async verifySprintAccess(sprintId: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          include: {
            members: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    const isOwner = sprint.project.ownerId === userId;
    const member = sprint.project.members.find((m) => m.userId === userId);
    const isMember = !!member;

    if (!isOwner && !isMember && sprint.project.visibility === 'PRIVATE') {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    return { sprint, isOwner, isMember, userRole: member?.role };
  }

  /**
   * Crear Sprint Retrospective
   */
  async createSprintRetrospective(
    sprintId: string,
    createDto: CreateSprintRetrospectiveDto,
    userId: string,
  ) {
    const { sprint, userRole, isOwner } = await this.verifySprintAccess(
      sprintId,
      userId,
    );

    // Solo Scrum Master puede crear retrospective
    if (userRole !== 'SCRUM_MASTER' && !isOwner) {
      throw new ForbiddenException(
        'Solo el Scrum Master puede crear Sprint Retrospectives',
      );
    }

    // Verificar que el sprint esté completado o en progreso
    if (sprint.status !== 'COMPLETED' && sprint.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Solo se puede crear una Retrospective para sprints en progreso o completados',
      );
    }

    // Verificar que no exista ya una retrospective para este sprint
    const existingRetrospective =
      await this.prisma.sprintRetrospective.findUnique({
        where: { sprintId },
      });

    if (existingRetrospective) {
      throw new BadRequestException(
        'Ya existe una Sprint Retrospective para este sprint',
      );
    }

    const { improvementActions, ...retroData } = createDto;

    // VALIDACIÓN CRÍTICA: Es obligatorio registrar al menos una acción de mejora
    if (!improvementActions || improvementActions.length === 0) {
      throw new BadRequestException(
        'Es obligatorio registrar al menos una acción de mejora',
      );
    }

    // Crear la retrospective
    const retrospective = await this.prisma.sprintRetrospective.create({
      data: {
        ...retroData,
        sprintId,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        sprint: {
          select: {
            id: true,
            number: true,
            name: true,
            goal: true,
            status: true,
          },
        },
      },
    });

    // Crear acciones de mejora si las hay
    if (improvementActions && improvementActions.length > 0) {
      await this.prisma.improvementAction.createMany({
        data: improvementActions.map((action) => ({
          retrospectiveId: retrospective.id,
          description: action.description,
          responsible: action.responsible,
          dueDate: action.dueDate ? new Date(action.dueDate) : null,
        })),
      });
    }

    // Retornar con las acciones de mejora
    return this.getSprintRetrospective(sprintId, userId);
  }

  /**
   * Obtener Sprint Retrospective de un sprint
   */
  async getSprintRetrospective(sprintId: string, userId: string) {
    await this.verifySprintAccess(sprintId, userId);

    const retrospective = await this.prisma.sprintRetrospective.findUnique({
      where: { sprintId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        sprint: {
          select: {
            id: true,
            number: true,
            name: true,
            goal: true,
            status: true,
          },
        },
        improvementActions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!retrospective) {
      throw new NotFoundException('Sprint Retrospective no encontrada');
    }

    return retrospective;
  }

  /**
   * Actualizar Sprint Retrospective
   */
  async updateSprintRetrospective(
    sprintId: string,
    updateDto: UpdateSprintRetrospectiveDto,
    userId: string,
  ) {
    const { userRole, isOwner } = await this.verifySprintAccess(sprintId, userId);

    if (userRole !== 'SCRUM_MASTER' && !isOwner) {
      throw new ForbiddenException(
        'Solo el Scrum Master puede actualizar Sprint Retrospectives',
      );
    }

    const retrospective = await this.prisma.sprintRetrospective.findUnique({
      where: { sprintId },
    });

    if (!retrospective) {
      throw new NotFoundException('Sprint Retrospective no encontrada');
    }

    const { improvementActions, ...retroData } = updateDto;

    // Actualizar la retrospective
    await this.prisma.sprintRetrospective.update({
      where: { sprintId },
      data: retroData,
    });

    // Si se proporcionaron acciones de mejora, reemplazarlas
    if (improvementActions !== undefined) {
      // Eliminar acciones existentes
      await this.prisma.improvementAction.deleteMany({
        where: { retrospectiveId: retrospective.id },
      });

      // Crear nuevas acciones
      if (improvementActions.length > 0) {
        await this.prisma.improvementAction.createMany({
          data: improvementActions.map((action) => ({
            retrospectiveId: retrospective.id,
            description: action.description,
            responsible: action.responsible,
            dueDate: action.dueDate ? new Date(action.dueDate) : null,
          })),
        });
      }
    }

    return this.getSprintRetrospective(sprintId, userId);
  }

  /**
   * Actualizar una acción de mejora
   */
  async updateImprovementAction(
    actionId: string,
    updateDto: UpdateImprovementActionDto,
    userId: string,
  ) {
    const action = await this.prisma.improvementAction.findUnique({
      where: { id: actionId },
      include: {
        retrospective: {
          include: {
            sprint: true,
          },
        },
      },
    });

    if (!action) {
      throw new NotFoundException('Acción de mejora no encontrada');
    }

    // Verificar acceso al sprint
    await this.verifySprintAccess(action.retrospective.sprint.id, userId);

    const updateData: any = { ...updateDto };
    if (updateDto.dueDate) {
      updateData.dueDate = new Date(updateDto.dueDate);
    }
    if (updateDto.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updatedAction = await this.prisma.improvementAction.update({
      where: { id: actionId },
      data: updateData,
    });

    return updatedAction;
  }

  /**
   * Obtener todas las acciones de mejora activas (pendientes/en progreso)
   */
  async getActiveImprovementActions(projectId: string, userId: string) {
    // Verificar acceso al proyecto
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

    // Obtener acciones activas
    const actions = await this.prisma.improvementAction.findMany({
      where: {
        retrospective: {
          sprint: {
            projectId,
          },
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
      include: {
        retrospective: {
          include: {
            sprint: {
              select: {
                id: true,
                number: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    return actions;
  }
}

