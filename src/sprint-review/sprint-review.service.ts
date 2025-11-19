import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintReviewDto } from './dto/create-sprint-review.dto';
import { UpdateSprintReviewDto } from './dto/update-sprint-review.dto';

@Injectable()
export class SprintReviewService {
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
   * Crear Sprint Review
   */
  async createSprintReview(
    sprintId: string,
    createDto: CreateSprintReviewDto,
    userId: string,
  ) {
    const { sprint, userRole, isOwner } = await this.verifySprintAccess(sprintId, userId);

    // Solo Scrum Master o Product Owner pueden crear review
    if (userRole !== 'SCRUM_MASTER' && userRole !== 'PRODUCT_OWNER' && !isOwner) {
      throw new ForbiddenException(
        'Solo el Scrum Master o Product Owner pueden crear Sprint Reviews',
      );
    }

    // Verificar que el sprint esté completado
    if (sprint.status !== 'COMPLETED' && sprint.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Solo se puede crear un Sprint Review para sprints en progreso o completados',
      );
    }

    // Verificar que no exista ya un review para este sprint
    const existingReview = await this.prisma.sprintReview.findUnique({
      where: { sprintId },
    });

    if (existingReview) {
      throw new BadRequestException('Ya existe un Sprint Review para este sprint');
    }

    const review = await this.prisma.sprintReview.create({
      data: {
        sprintId,
        date: new Date(createDto.date),
        participants: createDto.participants,
        summary: createDto.summary,
        feedbackGeneral: createDto.feedbackGeneral,
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

    return review;
  }

  /**
   * Obtener Sprint Review de un sprint
   */
  async getSprintReview(sprintId: string, userId: string) {
    await this.verifySprintAccess(sprintId, userId);

    const review = await this.prisma.sprintReview.findUnique({
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
      },
    });

    if (!review) {
      throw new NotFoundException('Sprint Review no encontrado');
    }

    return review;
  }

  /**
   * Actualizar Sprint Review
   */
  async updateSprintReview(
    sprintId: string,
    updateDto: UpdateSprintReviewDto,
    userId: string,
  ) {
    const { userRole, isOwner } = await this.verifySprintAccess(sprintId, userId);

    if (userRole !== 'SCRUM_MASTER' && userRole !== 'PRODUCT_OWNER' && !isOwner) {
      throw new ForbiddenException(
        'Solo el Scrum Master o Product Owner pueden actualizar Sprint Reviews',
      );
    }

    const review = await this.prisma.sprintReview.findUnique({
      where: { sprintId },
    });

    if (!review) {
      throw new NotFoundException('Sprint Review no encontrado');
    }

    const updateData: any = { ...updateDto };
    if (updateDto.date) {
      updateData.date = new Date(updateDto.date);
    }

    const updatedReview = await this.prisma.sprintReview.update({
      where: { sprintId },
      data: updateData,
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

    return updatedReview;
  }
}

