import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PSPMetricsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcular métricas PSP para un developer en un sprint
   */
  async calculateDeveloperMetrics(
    sprintId: string,
    developerId: string,
    userId: string,
  ) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          include: {
            members: { where: { isActive: true } },
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    // Verificar acceso
    const isOwner = sprint.project.ownerId === userId;
    const isMember = sprint.project.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember && sprint.project.visibility === 'PRIVATE') {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    // Obtener tareas del developer en el sprint
    const tasks = await this.prisma.task.findMany({
      where: {
        assignedToId: developerId,
        story: {
          sprintId,
        },
      },
    });

    const tasksCompleted = tasks.filter((t) => t.status === 'DONE').length;
    const tasksReopened = tasks.reduce((sum, t) => sum + t.reopenCount, 0);
    const defectsFixed = tasks.filter((t) => t.isBug && t.status === 'DONE').length;
    const totalEffortHours = tasks
      .filter((t) => t.status === 'DONE')
      .reduce((sum, t) => sum + t.effort, 0);

    // Calcular tiempo promedio por tarea
    const completedTasks = tasks.filter((t) => t.completedAt && t.startedAt);
    const avgTimePerTask =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => {
            const timeInMs =
              new Date(t.completedAt!).getTime() -
              new Date(t.startedAt!).getTime();
            return sum + timeInMs / (1000 * 60 * 60); // horas
          }, 0) / completedTasks.length
        : null;

    // Guardar o actualizar métricas
    const metrics = await this.prisma.developerPSPMetrics.upsert({
      where: {
        sprintId_userId: {
          sprintId,
          userId: developerId,
        },
      },
      update: {
        tasksCompleted,
        tasksReopened,
        defectsFixed,
        totalEffortHours,
        avgTimePerTask,
        calculatedAt: new Date(),
      },
      create: {
        sprintId,
        userId: developerId,
        tasksCompleted,
        tasksReopened,
        defectsFixed,
        totalEffortHours,
        avgTimePerTask,
      },
    });

    return metrics;
  }

  /**
   * Obtener métricas PSP de un sprint (todos los developers)
   */
  async getSprintMetrics(sprintId: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          include: {
            members: { where: { isActive: true } },
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    // Verificar acceso
    const isOwner = sprint.project.ownerId === userId;
    const isMember = sprint.project.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember && sprint.project.visibility === 'PRIVATE') {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    const metrics = await this.prisma.developerPSPMetrics.findMany({
      where: { sprintId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { calculatedAt: 'desc' },
    });

    return metrics;
  }

  /**
   * Recalcular métricas de todo el equipo en un sprint
   */
  async recalculateSprintMetrics(sprintId: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          include: {
            members: { where: { isActive: true, role: 'DEVELOPER' } },
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    // Verificar acceso
    const isOwner = sprint.project.ownerId === userId;
    const member = sprint.project.members.find((m) => m.userId === userId);

    if (!isOwner && !member) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    // Solo Scrum Master puede recalcular
    if (member?.role !== 'SCRUM_MASTER' && !isOwner) {
      throw new ForbiddenException(
        'Solo el Scrum Master puede recalcular métricas',
      );
    }

    // Recalcular para cada developer
    const results: any[] = [];
    for (const member of sprint.project.members) {
      if (member.role === 'DEVELOPER') {
        const metrics = await this.calculateDeveloperMetrics(
          sprintId,
          member.userId,
          userId,
        );
        results.push(metrics);
      }
    }

    return results;
  }
}

