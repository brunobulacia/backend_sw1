import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskLevel, MLDataType } from '@prisma/client';

@Injectable()
export class MLPredictionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verificar acceso al proyecto
   */
  async verifyProjectAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { where: { isActive: true } },
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
   * Generar sugerencia de asignación usando ML
   * Basado en: tareas similares completadas, carga actual, experiencia en el proyecto
   */
  async generateAssignmentSuggestion(
    storyId: string,
    taskId: string | undefined,
    userId: string,
  ) {
    const story = await this.prisma.userStory.findUnique({
      where: { id: storyId },
      include: {
        project: {
          include: {
            members: {
              where: { isActive: true, role: 'DEVELOPER' },
              include: {
                user: true,
              },
            },
          },
        },
        tags: true,
      },
    });

    if (!story) {
      throw new NotFoundException('Historia no encontrada');
    }

    await this.verifyProjectAccess(story.projectId, userId);

    const developers = story.project.members;
    
    if (developers.length === 0) {
      return null;
    }

    // Obtener datos completos de cada developer
    const developerScores = await Promise.all(
      developers.map(async (member) => {
        // Factor 1: Carga actual (tareas activas)
        const activeTasks = await this.prisma.task.count({
          where: {
            assignedToId: member.userId,
            status: { in: ['TODO', 'IN_PROGRESS'] },
          },
        });

        // Factor 2: Tareas similares completadas (por tags)
        const tagValues = story.tags.map(t => t.value);
        const similarTasksCompleted = await this.prisma.task.count({
          where: {
            assignedToId: member.userId,
            status: 'DONE',
            story: {
              projectId: story.projectId,
              tags: {
                some: {
                  value: { in: tagValues },
                },
              },
            },
          },
        });

        // Factor 3: Experiencia en el proyecto (total de tareas completadas)
        const totalCompleted = await this.prisma.task.count({
          where: {
            assignedToId: member.userId,
            status: 'DONE',
            story: {
              projectId: story.projectId,
            },
          },
        });

        // Factor 4: Tasa de reapertura (calidad)
        const reopenedTasks = await this.prisma.task.count({
          where: {
            assignedToId: member.userId,
            reopenCount: { gt: 0 },
            story: {
              projectId: story.projectId,
            },
          },
        });

        const reopenRate = totalCompleted > 0 ? reopenedTasks / totalCompleted : 0;

        return {
          userId: member.userId,
          user: member.user,
          activeTasks,
          similarTasksCompleted,
          totalCompleted,
          reopenRate,
        };
      }),
    );

    // Calcular score compuesto para cada developer
    const scoredDevelopers = developerScores.map((dev) => {
      // Normalizar factores (0-1)
      const maxActive = Math.max(...developerScores.map(d => d.activeTasks));
      const maxSimilar = Math.max(...developerScores.map(d => d.similarTasksCompleted));
      const maxTotal = Math.max(...developerScores.map(d => d.totalCompleted));

      const loadScore = maxActive === 0 ? 1.0 : 1.0 - (dev.activeTasks / maxActive);
      const similarityScore = maxSimilar === 0 ? 0.5 : (dev.similarTasksCompleted / maxSimilar);
      const experienceScore = maxTotal === 0 ? 0.3 : (dev.totalCompleted / maxTotal);
      const qualityScore = 1.0 - dev.reopenRate;

      // Pesos: carga (40%), similitud (30%), experiencia (20%), calidad (10%)
      const totalScore = 
        loadScore * 0.4 + 
        similarityScore * 0.3 + 
        experienceScore * 0.2 + 
        qualityScore * 0.1;

      return {
        ...dev,
        totalScore,
        factors: {
          loadScore,
          similarityScore,
          experienceScore,
          qualityScore,
        },
      };
    });

    // Ordenar por score descendente
    scoredDevelopers.sort((a, b) => b.totalScore - a.totalScore);
    const suggestedDeveloper = scoredDevelopers[0];

    const reason = `Carga: ${suggestedDeveloper.activeTasks} tareas. ` +
      `Experiencia similar: ${suggestedDeveloper.similarTasksCompleted} tareas. ` +
      `Total completadas: ${suggestedDeveloper.totalCompleted}`;

    // Crear sugerencia
    const suggestion = await this.prisma.mLDeveloperAssignmentSuggestion.create({
      data: {
        storyId,
        taskId,
        suggestedUserId: suggestedDeveloper.userId,
        confidenceScore: suggestedDeveloper.totalScore,
        reason,
      },
      include: {
        suggestedUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Guardar datos de entrenamiento
    await this.collectTrainingData(story.projectId, storyId, taskId, MLDataType.ASSIGNMENT);

    return suggestion;
  }

  /**
   * Generar predicción de riesgo de sprint
   */
  async generateRiskPrediction(sprintId: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          include: {
            members: { where: { isActive: true } },
          },
        },
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

    await this.verifyProjectAccess(sprint.projectId, userId);

    // Calcular factores de riesgo
    const allTasks = sprint.stories.flatMap((s) => s.tasks);
    const committedEffort = allTasks.reduce((sum, t) => sum + t.effort, 0);
    const teamCapacity = sprint.capacity || sprint.project.members.length * 40; // 40h por semana por developer

    const unassignedTasks = allTasks.filter((t) => !t.assignedToId).length;
    const unassignedPercentage = allTasks.length > 0 ? unassignedTasks / allTasks.length : 0;

    // Calcular velocidad histórica
    const historicalSprints = await this.prisma.sprint.findMany({
      where: {
        projectId: sprint.projectId,
        status: 'COMPLETED',
      },
      select: {
        actualVelocity: true,
      },
      take: 3,
    });

    const historicalVelocity =
      historicalSprints.length > 0
        ? historicalSprints.reduce((sum, s) => sum + (s.actualVelocity || 0), 0) /
          historicalSprints.length
        : null;

    // Determinar nivel de riesgo (simplificado)
    let riskLevel: RiskLevel = RiskLevel.LOW;
    let confidenceScore = 0.7;

    if (committedEffort > teamCapacity * 1.2) {
      riskLevel = RiskLevel.HIGH;
      confidenceScore = 0.9;
    } else if (committedEffort > teamCapacity || unassignedPercentage > 0.3) {
      riskLevel = RiskLevel.MEDIUM;
      confidenceScore = 0.8;
    }

    // Crear predicción
    const prediction = await this.prisma.mLSprintRiskPrediction.create({
      data: {
        sprintId,
        riskLevel,
        confidenceScore,
        factors: {
          committedEffort,
          teamCapacity,
          unassignedTasks,
          unassignedPercentage,
          historicalVelocity,
        },
        committedEffort,
        teamCapacity,
        historicalVelocity,
      },
    });

    // Guardar datos de entrenamiento
    await this.collectTrainingData(sprint.projectId, sprintId, null, MLDataType.VELOCITY);

    return prediction;
  }

  /**
   * Obtener sugerencias de asignación de una historia
   */
  async getStorySuggestions(storyId: string, userId: string) {
    const story = await this.prisma.userStory.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Historia no encontrada');
    }

    await this.verifyProjectAccess(story.projectId, userId);

    return this.prisma.mLDeveloperAssignmentSuggestion.findMany({
      where: { storyId },
      include: {
        suggestedUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
    });
  }

  /**
   * Obtener predicciones de riesgo de un sprint
   */
  async getSprintRiskPredictions(sprintId: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    await this.verifyProjectAccess(sprint.projectId, userId);

    return this.prisma.mLSprintRiskPrediction.findMany({
      where: { sprintId },
      orderBy: { generatedAt: 'desc' },
      take: 10,
    });
  }

  /**
   * Aceptar sugerencia de asignación
   */
  async acceptSuggestion(suggestionId: string, userId: string) {
    const suggestion =
      await this.prisma.mLDeveloperAssignmentSuggestion.findUnique({
        where: { id: suggestionId },
        include: {
          story: true,
        },
      });

    if (!suggestion) {
      throw new NotFoundException('Sugerencia no encontrada');
    }

    await this.verifyProjectAccess(suggestion.story.projectId, userId);

    return this.prisma.mLDeveloperAssignmentSuggestion.update({
      where: { id: suggestionId },
      data: {
        wasAccepted: true,
        acceptedById: userId,
      },
    });
  }

  /**
   * Recolectar datos de entrenamiento
   */
  private async collectTrainingData(
    projectId: string,
    storyId: string | null,
    taskId: string | null | undefined,
    dataType: MLDataType,
  ) {
    const features: any = {
      timestamp: new Date().toISOString(),
      dataType,
    };

    await this.prisma.mLTrainingData.create({
      data: {
        projectId,
        sprintId: storyId ? (await this.prisma.userStory.findUnique({
          where: { id: storyId },
          select: { sprintId: true },
        }))?.sprintId || projectId : projectId,
        storyId,
        taskId: taskId || null,
        dataType,
        features,
      },
    });
  }
}

