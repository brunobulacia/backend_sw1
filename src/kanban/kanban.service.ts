import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus } from '@prisma/client';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Injectable()
export class KanbanService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all tasks for the Kanban board grouped by status
   * Shows tasks from the active sprint (IN_PROGRESS)
   */
  async getKanbanBoard(projectId: string, userId: string) {
    // Verify user has access to the project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: true,
        members: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user is owner or member
    const isOwner = project.ownerId === userId;
    const isMember = project.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember && project.visibility === 'PRIVATE') {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Find active sprint (IN_PROGRESS)
    const activeSprint = await this.prisma.sprint.findFirst({
      where: {
        projectId,
        status: 'IN_PROGRESS',
      },
      orderBy: { startDate: 'desc' },
    });

    if (!activeSprint) {
      throw new NotFoundException('No active sprint found for this project');
    }

    // Fetch all tasks from stories assigned to the active sprint
    const tasks = await this.prisma.task.findMany({
      where: {
        story: {
          sprintId: activeSprint.id,
        },
        status: {
          in: ['TODO', 'IN_PROGRESS', 'TESTING', 'DONE'],
        },
      },
      include: {
        story: {
          select: {
            id: true,
            code: true,
            title: true,
            priority: true,
            businessValue: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });

    // Group by status
    const grouped = {
      TODO: tasks.filter((t) => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS'),
      TESTING: tasks.filter((t) => t.status === 'TESTING'),
      DONE: tasks.filter((t) => t.status === 'DONE'),
    };

    return {
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
        members: project.members.map((m) => ({
          id: m.user.id,
          email: m.user.email,
          username: m.user.username,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          role: m.role,
        })),
      },
      sprint: {
        id: activeSprint.id,
        number: activeSprint.number,
        name: activeSprint.name,
        goal: activeSprint.goal,
        startDate: activeSprint.startDate,
        endDate: activeSprint.endDate,
      },
      tasks: grouped,
    };
  }

  /**
   * Get Kanban board for a specific sprint
   */
  async getKanbanBoardBySprint(projectId: string, sprintId: string, userId: string) {
    // Verify user has access to the project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: true,
        members: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user is owner or member
    const isOwner = project.ownerId === userId;
    const isMember = project.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember && project.visibility === 'PRIVATE') {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Find the specific sprint
    const sprint = await this.prisma.sprint.findFirst({
      where: {
        id: sprintId,
        projectId,
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    // Fetch all tasks from stories assigned to this sprint
    const tasks = await this.prisma.task.findMany({
      where: {
        story: {
          sprintId: sprint.id,
        },
        status: {
          in: ['TODO', 'IN_PROGRESS', 'TESTING', 'DONE'],
        },
      },
      include: {
        story: {
          select: {
            id: true,
            code: true,
            title: true,
            priority: true,
            businessValue: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });

    // Group by status
    const grouped = {
      TODO: tasks.filter((t) => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS'),
      TESTING: tasks.filter((t) => t.status === 'TESTING'),
      DONE: tasks.filter((t) => t.status === 'DONE'),
    };

    return {
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
        members: project.members.map((m) => ({
          id: m.user.id,
          email: m.user.email,
          username: m.user.username,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          role: m.role,
        })),
      },
      sprint: {
        id: sprint.id,
        number: sprint.number,
        name: sprint.name,
        goal: sprint.goal,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        status: sprint.status,
      },
      tasks: grouped,
    };
  }

  /**
   * Update task status (move between columns)
   */
  async updateTaskStatus(
    projectId: string,
    taskId: string,
    userId: string,
    updateDto: UpdateTaskStatusDto,
  ) {
    // Verify task belongs to project via story
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        story: {
          include: {
            project: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!task || task.story.projectId !== projectId) {
      throw new NotFoundException('Task not found');
    }

    // Check if user is member of the project
    const isOwner = task.story.project.ownerId === userId;
    const isMember = task.story.project.members.some((m) => m.userId === userId && m.isActive);

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Validation rules
    const { status, assignedToId } = updateDto;

    // Cannot move to TESTING or DONE without assignedTo
    if ((status === 'TESTING' || status === 'DONE') && !task.assignedToId && !assignedToId) {
      throw new BadRequestException(
        'Cannot move to Testing or Done without assigning a responsible person',
      );
    }

    // Cannot move to TESTING or DONE without acceptance criteria on the user story
    if ((status === 'TESTING' || status === 'DONE') && !task.story.acceptanceCriteria) {
      throw new BadRequestException(
        'Cannot move to Testing or Done without acceptance criteria on the user story',
      );
    }

    const oldStatus = task.status;
    const newStatus = status;

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId;
    }

    // Set completedAt when moving to DONE
    if (newStatus === 'DONE' && oldStatus !== 'DONE') {
      updateData.completedAt = new Date();
    }

    // Clear completedAt when moving away from DONE
    if (newStatus !== 'DONE' && oldStatus === 'DONE') {
      updateData.completedAt = null;
    }

    // Detectar si se moverá a DONE o se reabrirá (para actualizar PSP)
    const willComplete = newStatus === 'DONE' && oldStatus !== 'DONE';
    const willReopen = oldStatus === 'DONE' && newStatus !== 'DONE';
    const startedNow = newStatus === 'IN_PROGRESS' && oldStatus === 'TODO' && !task.startedAt;

    // Update task and create activity log in a transaction
    const [updatedTask] = await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id: taskId },
        data: {
          ...updateData,
          startedAt: startedNow ? new Date() : task.startedAt,
          reopenCount: willReopen ? task.reopenCount + 1 : task.reopenCount,
        },
        include: {
          story: {
            select: {
              id: true,
              code: true,
              title: true,
              priority: true,
              businessValue: true,
              sprintId: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.taskActivityLog.create({
        data: {
          taskId,
          userId,
          action: 'moved',
          fromStatus: oldStatus,
          toStatus: newStatus,
          description: `Moved from ${oldStatus} to ${newStatus}`,
        },
      }),
    ]);

    // HU13: Actualizar métricas PSP automáticamente si la tarea tiene asignado y está en un sprint
    if ((willComplete || willReopen) && updatedTask.assignedToId && updatedTask.story.sprintId) {
      try {
        await this.recalculatePSPMetrics(
          updatedTask.story.sprintId,
          updatedTask.assignedToId,
        );
      } catch (error) {
        console.error('Error actualizando métricas PSP:', error);
        // No fallar la actualización de tarea por error en métricas
      }
    }

    return updatedTask;
  }

  /**
   * Recalcular métricas PSP de un developer en un sprint
   * Se llama automáticamente cuando cambia estado de tarea
   */
  private async recalculatePSPMetrics(sprintId: string, developerId: string) {
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

    const completedTasks = tasks.filter((t) => t.completedAt && t.startedAt);
    const avgTimePerTask =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => {
            const timeInMs =
              new Date(t.completedAt!).getTime() -
              new Date(t.startedAt!).getTime();
            return sum + timeInMs / (1000 * 60 * 60);
          }, 0) / completedTasks.length
        : null;

    await this.prisma.developerPSPMetrics.upsert({
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
  }

  /**
   * Get activity history for a task
   */
  async getTaskActivity(projectId: string, taskId: string, userId: string) {
    // Verify task belongs to project via story
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        story: {
          include: {
            project: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!task || task.story.projectId !== projectId) {
      throw new NotFoundException('Task not found');
    }

    // Check if user has access
    const isOwner = task.story.project.ownerId === userId;
    const isMember = task.story.project.members.some((m) => m.userId === userId && m.isActive);

    if (!isOwner && !isMember && task.story.project.visibility === 'PRIVATE') {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Fetch activity logs
    const activities = await this.prisma.taskActivityLog.findMany({
      where: { taskId },
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return activities;
  }

  /**
   * Assign a user to a task
   */
  async assignTask(
    projectId: string,
    taskId: string,
    assignedToId: string | null,
    userId: string,
  ) {
    // Verify task belongs to project via story
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        story: {
          include: {
            project: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!task || task.story.projectId !== projectId) {
      throw new NotFoundException('Task not found');
    }

    // Check if user is member of the project
    const isOwner = task.story.project.ownerId === userId;
    const isMember = task.story.project.members.some((m) => m.userId === userId && m.isActive);

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // If assigning to someone, verify they are a member
    if (assignedToId) {
      const assigneeIsMember =
        task.story.project.ownerId === assignedToId ||
        task.story.project.members.some((m) => m.userId === assignedToId && m.isActive);

      if (!assigneeIsMember) {
        throw new BadRequestException('Assigned user must be a project member');
      }
    }

    // Update task and create activity log
    const [updatedTask] = await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id: taskId },
        data: { assignedToId },
        include: {
          story: {
            select: {
              id: true,
              code: true,
              title: true,
              priority: true,
              businessValue: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.taskActivityLog.create({
        data: {
          taskId,
          userId,
          action: 'assigned',
          description: assignedToId
            ? `Assigned to user ${assignedToId}`
            : 'Unassigned from user',
        },
      }),
    ]);

    return updatedTask;
  }
}
