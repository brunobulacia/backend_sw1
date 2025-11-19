import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddStoriesToSprintDto } from './dto/add-stories-to-sprint.dto';
import { BurndownService } from './metrics/burndown.service';

@Injectable()
export class SprintService {
  private burndownService: BurndownService;

  constructor(private prisma: PrismaService) {}

  /**
   * Inyección manual de BurndownService para evitar dependencia circular
   * Se llama desde el módulo después de la inicialización
   */
  setBurndownService(burndownService: BurndownService) {
    this.burndownService = burndownService;
  }

  /**
   * Verificar acceso del usuario al proyecto
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

    return { project, isOwner, isMember, userRole: member?.role };
  }

  /**
   * Listar todos los sprints de un proyecto
   */
  async getProjectSprints(projectId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    const sprints = await this.prisma.sprint.findMany({
      where: { projectId },
      include: {
        stories: {
          include: {
            tags: true,
            tasks: {
              include: {
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
            },
          },
        },
      },
      orderBy: { number: 'desc' },
    });

    return sprints;
  }

  /**
   * Obtener detalles de un sprint específico
   */
  async getSprintById(projectId: string, sprintId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    const sprint = await this.prisma.sprint.findFirst({
      where: {
        id: sprintId,
        projectId,
      },
      include: {
        stories: {
          include: {
            tags: true,
            tasks: {
              include: {
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
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    // Calcular esfuerzo total comprometido
    const allTasks = sprint.stories.flatMap((story) => story.tasks);
    const totalEffort = allTasks.reduce((sum, task) => sum + task.effort, 0);

    return {
      ...sprint,
      totalEffort,
      tasks: allTasks,
    };
  }

  /**
   * Crear un nuevo sprint
   */
  async createSprint(
    projectId: string,
    createDto: CreateSprintDto,
    userId: string,
  ) {
    const { project, userRole } = await this.verifyProjectAccess(projectId, userId);

    // Solo Scrum Master y Product Owner pueden crear sprints
    if (userRole !== 'SCRUM_MASTER' && userRole !== 'PRODUCT_OWNER' && project.ownerId !== userId) {
      throw new ForbiddenException('Solo el Scrum Master o Product Owner pueden crear sprints');
    }

    // Verificar que no exista ya un sprint con ese número
    const existingSprint = await this.prisma.sprint.findUnique({
      where: {
        projectId_number: {
          projectId,
          number: createDto.number,
        },
      },
    });

    if (existingSprint) {
      throw new BadRequestException(`Ya existe un sprint con el número ${createDto.number}`);
    }

    // Verificar que la duración coincida con la configuración del proyecto
    if (createDto.duration > 4 || createDto.duration < 1) {
      throw new BadRequestException('La duración debe estar entre 1 y 4 semanas');
    }

    const { storyIds, ...sprintData } = createDto;

    // Convertir las fechas a DateTime ISO-8601
    const startDate = new Date(sprintData.startDate);
    const endDate = new Date(sprintData.endDate);

    // Crear el sprint
    const sprint = await this.prisma.sprint.create({
      data: {
        ...sprintData,
        startDate,
        endDate,
        projectId,
      },
    });

    // Si se proporcionaron historias, marcarlas como SELECTED
    if (storyIds && storyIds.length > 0) {
      await this.addStoriesToSprint(projectId, sprint.id, { storyIds }, userId);
    }

    return sprint;
  }

  /**
   * Actualizar un sprint (solo si está en PLANNED)
   */
  async updateSprint(
    projectId: string,
    sprintId: string,
    updateDto: UpdateSprintDto,
    userId: string,
  ) {
    const { userRole, project } = await this.verifyProjectAccess(projectId, userId);

    // Solo Scrum Master y Product Owner pueden editar sprints
    if (userRole !== 'SCRUM_MASTER' && userRole !== 'PRODUCT_OWNER' && project.ownerId !== userId) {
      throw new ForbiddenException('Solo el Scrum Master o Product Owner pueden editar sprints');
    }

    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    if (sprint.status !== 'PLANNED') {
      throw new BadRequestException('Solo se pueden editar sprints en estado PLANNED');
    }

    // Convertir las fechas si están presentes en el DTO
    const updateData: any = { ...updateDto };
    if (updateDto.startDate) {
      updateData.startDate = new Date(updateDto.startDate);
    }
    if (updateDto.endDate) {
      updateData.endDate = new Date(updateDto.endDate);
    }

    return this.prisma.sprint.update({
      where: { id: sprintId },
      data: updateData,
    });
  }

  /**
   * Agregar historias al sprint (marcarlas como SELECTED)
   */
  async addStoriesToSprint(
    projectId: string,
    sprintId: string,
    dto: AddStoriesToSprintDto,
    userId: string,
  ) {
    const { userRole, project } = await this.verifyProjectAccess(projectId, userId);

    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    // Verificar que las historias existan, estén estimadas y en estado válido
    const stories = await this.prisma.userStory.findMany({
      where: {
        id: { in: dto.storyIds },
        projectId,
      },
    });

    if (stories.length !== dto.storyIds.length) {
      throw new BadRequestException('Algunas historias no fueron encontradas');
    }

    // Asignar las historias al sprint (se pueden mover entre sprints libremente, sin validar estimación)
    await this.prisma.userStory.updateMany({
      where: {
        id: { in: dto.storyIds },
      },
      data: {
        sprintId: sprint.id,
      },
    });

    // Crear automáticamente una tarea por cada historia agregada
    // (solo si la historia no tiene tareas)
    for (const story of stories) {
      const existingTasks = await this.prisma.task.count({
        where: {
          storyId: story.id,
        },
      });

      // Si la historia no tiene tareas, crear una automáticamente
      if (existingTasks === 0) {
        const taskCode = `T-${story.code}-1`;

        await this.prisma.task.create({
          data: {
            storyId: story.id,
            code: taskCode,
            title: story.title,
            description: story.description || `Implementar: ${story.iWant}`,
            effort: story.estimateHours,
            status: 'TODO',
          },
        });
      }
    }

    return { message: 'Historias y tareas agregadas al sprint correctamente' };
  }

  /**
   * Quitar historias del sprint
   */
  async removeStoriesFromSprint(
    projectId: string,
    sprintId: string,
    dto: AddStoriesToSprintDto,
    userId: string,
  ) {
    await this.verifyProjectAccess(projectId, userId);

    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    // Eliminar todas las tareas asociadas a esas historias
    await this.prisma.task.deleteMany({
      where: {
        storyId: { in: dto.storyIds },
      },
    });

    // Quitar sprintId de las historias (mantienen su estado actual)
    await this.prisma.userStory.updateMany({
      where: {
        id: { in: dto.storyIds },
      },
      data: {
        sprintId: null,
      },
    });

    return { message: 'Historias removidas del sprint correctamente' };
  }

  /**
   * Crear una tarea en el Sprint Backlog
   */
  async createTask(
    projectId: string,
    sprintId: string,
    createDto: CreateTaskDto,
    userId: string,
  ) {
    const { userRole, project } = await this.verifyProjectAccess(projectId, userId);

    // Solo DEVELOPER puede crear tareas
    if (userRole !== 'DEVELOPER' && project.ownerId !== userId) {
      throw new ForbiddenException('Solo los Developers pueden crear tareas');
    }

    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    if (sprint.status !== 'PLANNED') {
      throw new BadRequestException(
        'Solo se pueden crear tareas en sprints en estado PLANNED',
      );
    }

    // Verificar que la historia exista, esté en el proyecto y asignada a este sprint
    const story = await this.prisma.userStory.findFirst({
      where: {
        id: createDto.storyId,
        projectId,
        sprintId: sprintId,
      },
      include: {
        tasks: true,
      },
    });

    if (!story) {
      throw new NotFoundException('Historia no encontrada o no está asignada a este sprint');
    }

    // Generar código de tarea basado en las tareas de la historia
    const taskCount = story.tasks.length;
    const code = `T-${story.code}-${taskCount + 1}`;

    // Si se asigna un responsable, verificar que sea miembro del proyecto
    if (createDto.assignedToId) {
      const assignee = await this.prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: createDto.assignedToId,
          isActive: true,
        },
      });

      if (!assignee && project.ownerId !== createDto.assignedToId) {
        throw new BadRequestException('El usuario asignado no es miembro del proyecto');
      }
    }

    const task = await this.prisma.task.create({
      data: {
        ...createDto,
        code,
        status: 'TODO',
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
    });

    return task;
  }

  /**
   * Actualizar una tarea del Sprint Backlog
   */
  async updateTask(
    projectId: string,
    sprintId: string,
    taskId: string,
    updateDto: UpdateTaskDto,
    userId: string,
  ) {
    const { userRole, project } = await this.verifyProjectAccess(projectId, userId);

    // Solo DEVELOPER puede editar tareas
    if (userRole !== 'DEVELOPER' && project.ownerId !== userId) {
      throw new ForbiddenException('Solo los Developers pueden editar tareas');
    }

    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    if (sprint.status !== 'PLANNED') {
      throw new BadRequestException(
        'Solo se pueden editar tareas en sprints en estado PLANNED',
      );
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        story: {
          sprintId: sprintId,
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada en este sprint');
    }

    // Si se asigna un responsable, verificar que sea miembro del proyecto
    if (updateDto.assignedToId) {
      const assignee = await this.prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: updateDto.assignedToId,
          isActive: true,
        },
      });

      if (!assignee && project.ownerId !== updateDto.assignedToId) {
        throw new BadRequestException('El usuario asignado no es miembro del proyecto');
      }
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: updateDto,
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
    });
  }

  /**
   * Actualizar estado de una tarea durante el sprint (usado por Kanban)
   * Este método NO tiene restricciones de sprint.status y actualiza snapshots automáticamente
   */
  async updateTaskStatus(
    taskId: string,
    status: 'TODO' | 'IN_PROGRESS' | 'DONE',
    completedAt?: Date,
  ) {
    // Obtener la tarea con información del sprint
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        story: {
          include: {
            sprint: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    // Actualizar la tarea
    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === 'DONE' ? completedAt || new Date() : null,
      },
    });

    // Si la tarea pertenece a un sprint IN_PROGRESS, actualizar el snapshot
    if (
      task.story?.sprint &&
      task.story.sprint.status === 'IN_PROGRESS' &&
      this.burndownService
    ) {
      try {
        await this.burndownService.updateSnapshotOnChange(task.story.sprint.id);
      } catch (error) {
        console.error('Error actualizando snapshot:', error);
        // No lanzar error para no interrumpir la actualización de la tarea
      }
    }

    return updatedTask;
  }

  /**
   * Eliminar una tarea del Sprint Backlog
   */
  async deleteTask(
    projectId: string,
    sprintId: string,
    taskId: string,
    userId: string,
  ) {
    const { userRole, project } = await this.verifyProjectAccess(projectId, userId);

    // Solo DEVELOPER puede eliminar tareas
    if (userRole !== 'DEVELOPER' && project.ownerId !== userId) {
      throw new ForbiddenException('Solo los Developers pueden eliminar tareas');
    }

    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    if (sprint.status !== 'PLANNED') {
      throw new BadRequestException(
        'Solo se pueden eliminar tareas en sprints en estado PLANNED',
      );
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        story: {
          sprintId: sprintId,
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada en este sprint');
    }

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    return { message: 'Tarea eliminada correctamente' };
  }

  /**
   * Iniciar un sprint (cambiar estado a IN_PROGRESS)
   */
  async startSprint(projectId: string, sprintId: string, userId: string) {
    const { userRole, project } = await this.verifyProjectAccess(projectId, userId);

    // Solo Scrum Master puede iniciar sprints
    if (userRole !== 'SCRUM_MASTER' && project.ownerId !== userId) {
      throw new ForbiddenException('Solo el Scrum Master puede iniciar sprints');
    }

    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
      include: {
        stories: {
          include: {
            tasks: true,
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    if (sprint.status !== 'PLANNED') {
      throw new BadRequestException('Solo se pueden iniciar sprints en estado PLANNED');
    }

    // Validar que haya al menos una historia seleccionada
    if (sprint.stories.length === 0) {
      throw new BadRequestException(
        'No se puede iniciar un sprint sin historias seleccionadas',
      );
    }

    // Validar que todas las historias seleccionadas tengan al menos una tarea
    const storiesWithoutTasks = sprint.stories.filter((story) => story.tasks.length === 0);

    if (storiesWithoutTasks.length > 0) {
      throw new BadRequestException(
        `Las siguientes historias no tienen tareas: ${storiesWithoutTasks.map((s) => s.code).join(', ')}`,
      );
    }

    // Verificar que no haya otro sprint en curso
    const activeSprintCount = await this.prisma.sprint.count({
      where: {
        projectId,
        status: 'IN_PROGRESS',
      },
    });

    if (activeSprintCount > 0) {
      throw new BadRequestException('Ya existe un sprint en curso para este proyecto');
    }

    // Iniciar el sprint y asegurar que todas las tareas estén en TODO
    const updatedSprint = await this.prisma.$transaction(async (tx) => {
      // Actualizar estado del sprint
      const updated = await tx.sprint.update({
        where: { id: sprintId },
        data: { status: 'IN_PROGRESS' },
      });

      // Asegurar que todas las tareas de historias en este sprint estén en TODO
      const allTasks = sprint.stories.flatMap((story) => story.tasks);
      const taskIds = allTasks.map((t) => t.id);

      await tx.task.updateMany({
        where: { id: { in: taskIds } },
        data: { status: 'TODO' },
      });

      // Marcar las historias seleccionadas como IN_PROGRESS
      const storyIds = sprint.stories.map((s) => s.id);
      await tx.userStory.updateMany({
        where: { id: { in: storyIds } },
        data: { status: 'IN_PROGRESS' },
      });

      return updated;
    });

    return updatedSprint;
  }

  /**
   * Obtener todas las historias del proyecto para asignar a sprints
   */
  async getAvailableStories(projectId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    // Obtener TODAS las historias del proyecto, sin importar estimación ni sprint
    const stories = await this.prisma.userStory.findMany({
      where: {
        projectId,
      },
      include: {
        tags: true,
        sprint: {
          select: {
            id: true,
            number: true,
            name: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { businessValue: 'desc' }],
    });

    return stories;
  }
}
