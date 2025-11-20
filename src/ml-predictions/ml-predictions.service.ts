import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskLevel, StoryStatus, TaskStatus } from '@prisma/client';
import { spawn } from 'child_process';
import * as path from 'path';

@Injectable()
export class MLPredictionsService {
  constructor(private prisma: PrismaService) { }


  private getPythonScriptPath(scriptName: string): string {
    return path.join(process.cwd(), 'ml', scriptName);
  }

  private runPython(scriptName: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const scriptPath = this.getPythonScriptPath(scriptName);
      const py = spawn('python', [scriptPath]);

      let stdout = '';
      let stderr = '';
      console.log("Ejecutado")
      py.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      py.on('close', (code) => {
        if (code !== 0) {
          return reject(
            new Error(
              `Python (${scriptName}) salió con código ${code}: ${stderr}`,
            ),
          );
        }
        try {
          const json = JSON.parse(stdout);
          console.log(json);
          resolve(json);
        } catch (err) {
          reject(
            new Error(
              `Error parseando salida de ${scriptName}: ${(err as Error).message
              } - OUTPUT: ${stdout}`,
            ),
          );
        }
      });

      py.stdin.write(JSON.stringify(payload));
      py.stdin.end();
    });
  }

  // ---------------------------------------------------------------------------
  // Verificación de acceso
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // 1) SUGERENCIA DE ASIGNACIÓN (HU15) usando modelo ML (assignment_model.joblib)
  // ---------------------------------------------------------------------------

  /**
   * Generar sugerencia de asignación para una tarea,
   * llamando al modelo de Python (assignment).
   */

  async generateAssignmentSuggestion(
    storyId: string,
    taskId: string | undefined,
    userId: string,
  ) {
    const story = await this.prisma.userStory.findUnique({
      where: { id: storyId },
      include: {
        sprint: true,
        project: {
          include: {
            members: {
              where: { isActive: true, role: 'DEVELOPER' },
              include: { user: true },
            },
          },
        },
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

    let task: any = null;
    if (taskId) {
      task = await this.prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        throw new NotFoundException('Tarea no encontrada');
      }
    }

    const sprintNumber = story.sprint ? story.sprint.number : 1;

    type AssignmentPythonResponse = {
      label: number;
      probability: number;
    };

    // 1) Preparamos todas las features en memoria
    const featuresList: any[] = [];
    const devMeta: { developerId: string; displayName: string }[] = [];

    for (const member of developers) {
      const user = member.user;

      const developerPastTasksCompleted = await this.prisma.task.count({
        where: {
          assignedToId: user.id,
          status: TaskStatus.DONE,
          story: { projectId: story.projectId },
        },
      });

      const developerPastDefectsFixed = await this.prisma.task.count({
        where: {
          assignedToId: user.id,
          status: TaskStatus.DONE,
          isBug: true,
          story: { projectId: story.projectId },
        },
      });

      const features = {
        storyPriority: story.priority,
        storyBusinessValue: story.businessValue,
        taskEffort: task?.effort ?? 3,
        sprintNumber,
        isBug: task?.isBug ?? false,
        developerPastTasksCompleted,
        developerPastDefectsFixed,
      };

      featuresList.push(features);
      devMeta.push({
        developerId: user.id,
        displayName: `${user.firstName} ${user.lastName}`,
      });
    }

    // 2) 🔥 Una sola llamada a Python para todos los devs
    const pyResult = (await this.runPython('predict_assignment.py', {
      featuresList,
    })) as { results: AssignmentPythonResponse[] };

    const candidateResults = devMeta.map((meta, index) => ({
      developerId: meta.developerId,
      displayName: meta.displayName,
      modelOutput: pyResult.results[index],
    }));

    // 3) Elegimos el dev con mayor probabilidad
    candidateResults.sort(
      (a, b) => b.modelOutput.probability - a.modelOutput.probability,
    );

    const best = candidateResults[0];

    const suggestion = await this.prisma.mLDeveloperAssignmentSuggestion.create({
      data: {
        storyId,
        taskId: taskId ?? null,
        suggestedUserId: best.developerId,
        confidenceScore: best.modelOutput.probability,
        reason: `Recomendación generada por modelo ML de asignación (probabilidad de éxito ${(best.modelOutput.probability * 100).toFixed(
          1,
        )}%).`,
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

    return {
      suggestion,
      candidates: candidateResults.map((c) => ({
        developerId: c.developerId,
        displayName: c.displayName,
        probability: c.modelOutput.probability,
        label: c.modelOutput.label,
      })),
    };
  }
  // ---------------------------------------------------------------------------
  // 2) PREDICCIÓN DE RIESGO DE SPRINT usando modelo ML (risk_model.joblib)
  // ---------------------------------------------------------------------------

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

    const allTasks = sprint.stories.flatMap((s) => s.tasks);
    const committedEffort = allTasks.reduce((sum, t) => sum + t.effort, 0);

    const teamCapacity =
      sprint.capacity ??
      sprint.project.members.length * 40; // 40h por dev como aproximación

    const bugsOpen = allTasks.filter(
      (t) => t.isBug && t.status !== TaskStatus.DONE,
    ).length;

    const missedStories = sprint.stories.filter(
      (st) => st.status !== StoryStatus.DONE,
    ).length;

    // Velocidad histórica: promedio de últimos 5 sprints completados del mismo proyecto
    const previousSprints = await this.prisma.sprint.findMany({
      where: {
        projectId: sprint.projectId,
        number: { lt: sprint.number },
        actualVelocity: { not: null },
      },
      select: { actualVelocity: true },
      orderBy: { number: 'desc' },
      take: 5,
    });

    const historicalVelocity =
      previousSprints.length > 0
        ? previousSprints.reduce(
          (acc, s) => acc + (s.actualVelocity ?? 0),
          0,
        ) / previousSprints.length
        : 0;

    // Cambios en el equipo: miembros que entraron en los últimos 30 días
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const recentJoiners = await this.prisma.projectMember.count({
      where: {
        projectId: sprint.projectId,
        joinedAt: {
          gt: new Date(sprint.startDate.getTime() - thirtyDaysMs),
        },
      },
    });

    const teamChanges = recentJoiners;

    const features = {
      committedEffort,
      teamCapacity,
      historicalVelocity,
      missedStories,
      teamChanges,
      bugsOpen,
    };

    type RiskPythonResponse = {
      label: 'LOW' | 'MEDIUM' | 'HIGH';
      confidence: number;
    };

    const modelOutput = (await this.runPython('predict_risk.py', {
      features,
    })) as RiskPythonResponse;

    const riskLevel = RiskLevel[modelOutput.label];

    const prediction = await this.prisma.mLSprintRiskPrediction.create({
      data: {
        sprintId,
        riskLevel,
        confidenceScore: modelOutput.confidence,
        factors: features,
        committedEffort,
        teamCapacity,
        historicalVelocity,
      },
    });

    return prediction;
  }

  // ---------------------------------------------------------------------------
  // 3) Consultas y aceptación de sugerencias (esto casi no toca el modelo)
  // ---------------------------------------------------------------------------

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
}
