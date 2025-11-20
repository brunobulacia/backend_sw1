// prisma/seed.ts
import {
  PrismaClient,
  ProjectVisibility,
  ProjectStatus,
  ProjectMemberRole,
  StoryStatus,
  EstimationMethod,
  SessionStatus,
  SprintStatus,
  TaskStatus,
  ImprovementActionStatus,
  GitHubSyncStatus,
  RefactoringSeverity,
  RefactoringStatus,
  RiskLevel,
  MLDataType,
  User,
  Sprint,
  UserStory,
  Task,
} from '@prisma/client';

import * as bcrypt from 'bcrypt';

// -----------------------------------------------------------------------------
// CONFIGURACIÓN DEL SEED (AJUSTA ESTO PARA TENER MÁS / MENOS DATOS)
// -----------------------------------------------------------------------------

const SEED_CONFIG = {
  NUM_PROJECTS: 8,
  SPRINTS_PER_PROJECT: 10,
  STORIES_PER_SPRINT: 15,
  TASKS_PER_STORY: 6,
  DAILY_SCRUM_DAYS: 5,
  BCRYPT_ROUNDS: 10,
};

const BASE_DATE = new Date('2025-01-06T13:00:00.000Z');

// -----------------------------------------------------------------------------
// UTILIDADES
// -----------------------------------------------------------------------------

const prisma = new PrismaClient();

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type SeedUser = {
  email: string;
  username: string;
  password: string; // en plano, se hashea con bcrypt
  firstName: string;
  lastName: string;
  timezone: string;
  githubUsername?: string | null;
  isAdmin?: boolean;
};

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

async function main() {
  console.log('🚀 Seeding base de datos para Scrum Planning Poker & ML (HU15)...');

  // ---------------------------------------------------------------------------
  // 1. Usuarios base (PO, SM, devs, admin) - contraseñas hasheadas con bcrypt
  // ---------------------------------------------------------------------------
  const usersData: SeedUser[] = [
    {
      email: 'admin@example.com',
      username: 'admin',
      password: 'Admin123!',
      firstName: 'Ana',
      lastName: 'Admin',
      timezone: 'America/La_Paz',
      githubUsername: null,
      isAdmin: true,
    },
    {
      email: 'po@example.com',
      username: 'product_owner',
      password: 'Po123!',
      firstName: 'Pablo',
      lastName: 'Owner',
      timezone: 'America/La_Paz',
      githubUsername: null,
    },
    {
      email: 'sm@example.com',
      username: 'scrum_master',
      password: 'Sm123!',
      firstName: 'Sara',
      lastName: 'Scrum',
      timezone: 'America/La_Paz',
      githubUsername: null,
    },
    {
      email: 'alice@example.com',
      username: 'alice_dev',
      password: 'Dev123!',
      firstName: 'Alice',
      lastName: 'Dev',
      timezone: 'America/La_Paz',
      githubUsername: 'alice-dev',
    },
    {
      email: 'bruno@example.com',
      username: 'bruno_dev',
      password: 'Dev123!',
      firstName: 'Bruno',
      lastName: 'Dev',
      timezone: 'America/La_Paz',
      githubUsername: 'bruno-dev',
    },
    {
      email: 'carla@example.com',
      username: 'carla_dev',
      password: 'Dev123!',
      firstName: 'Carla',
      lastName: 'Dev',
      timezone: 'America/La_Paz',
      githubUsername: 'carla-dev',
    },
  ];

  const users: User[] = [];
  for (const u of usersData) {
    const hashedPassword = await bcrypt.hash(u.password, SEED_CONFIG.BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: u.email,
        username: u.username,
        password: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        timezone: u.timezone,
        githubUsername: u.githubUsername ?? undefined,
        isAdmin: u.isAdmin ?? false,
        isActive: true,
      },
    });

    users.push(user);
  }

  const [admin, po, sm, dev1, dev2, dev3] = users;

  // ---------------------------------------------------------------------------
  // 2. Roles de sistema
  // ---------------------------------------------------------------------------
  await prisma.role.createMany({
    data: [
      {
        name: 'Administrador',
        code: 'ADMIN',
        description: 'Acceso completo al sistema',
        permission: {
          canManageUsers: true,
          canConfigureSystem: true,
          canSeeAllProjects: true,
        },
        isSystemRole: true,
        createdById: admin.id,
      },
      {
        name: 'Product Owner',
        code: 'PO',
        description: 'Gestiona el backlog y prioridades',
        permission: {
          canManageBacklog: true,
          canManageReleases: true,
        },
        isSystemRole: true,
        createdById: admin.id,
      },
      {
        name: 'Scrum Master',
        code: 'SM',
        description: 'Facilita eventos Scrum',
        permission: {
          canManageScrumEvents: true,
          canSeeMetrics: true,
        },
        isSystemRole: true,
        createdById: admin.id,
      },
    ],
  });

  // ---------------------------------------------------------------------------
  // 3. Proyectos base (plantillas) - se usará hasta NUM_PROJECTS
  // ---------------------------------------------------------------------------
  const projectTemplates = [
    {
      code: 'FICCT-PP',
      name: 'Sistema de Planning Poker FICCT',
      description: 'Plataforma para estimar historias con Planning Poker.',
      visibility: ProjectVisibility.PRIVATE,
      sprintDuration: 14,
      productObjective:
        'Mejorar la precisión de las estimaciones de las materias de la facultad.',
    },
    {
      code: 'FICCT-SCRM',
      name: 'Gestor de Proyectos Scrum',
      description: 'Aplicación para gestionar proyectos Scrum académicos.',
      visibility: ProjectVisibility.PUBLIC,
      sprintDuration: 14,
      productObjective:
        'Centralizar la planificación de trabajos prácticos y proyectos.',
    },
    {
      code: 'FICCT-ML',
      name: 'Motor de Recomendación ML',
      description:
        'Módulo ML para sugerir asignación de tareas y predecir riesgos de sprint.',
      visibility: ProjectVisibility.PRIVATE,
      sprintDuration: 14,
      productObjective:
        'Recomendar el mejor desarrollador para cada tarea y detectar sprints en riesgo.',
    },
  ];

  let globalStoryCounter = 1;
  let globalTaskCounter = 1;

  const projectCount = Math.min(SEED_CONFIG.NUM_PROJECTS, projectTemplates.length);

  for (let i = 0; i < projectCount; i++) {
    const tmpl = projectTemplates[i];
    const projectStart = addDays(BASE_DATE, i * 28);

    const project = await prisma.project.create({
      data: {
        code: tmpl.code,
        name: tmpl.name,
        description: tmpl.description,
        visibility: tmpl.visibility,
        productObjective: tmpl.productObjective,
        definitionOfDone:
          'Tests pasando, código revisado, documentación mínima actualizada.',
        sprintDuration: tmpl.sprintDuration,
        qualityCriteria:
          'Cobertura de tests > 70%, revisión de código obligatoria, SonarQube sin issues críticos.',
        status: ProjectStatus.ACTIVE,
        startDate: projectStart,
        endDate: addDays(
          projectStart,
          tmpl.sprintDuration * SEED_CONFIG.SPRINTS_PER_PROJECT,
        ),
        ownerId: admin.id,
      },
    });

    console.log(`📁 Proyecto creado: ${project.name}`);

    // Configuración del proyecto
    await prisma.projectConfig.createMany({
      data: [
        {
          projectId: project.id,
          key: 'planningPoker.method',
          value: 'FIBONACCI',
          type: 'string',
          category: 'estimation',
          description: 'Método de estimación por defecto.',
        },
        {
          projectId: project.id,
          key: 'sprint.duration',
          value: tmpl.sprintDuration.toString(),
          type: 'int',
          category: 'sprint',
          description: 'Duración estándar de los sprints en días.',
        },
        {
          projectId: project.id,
          key: 'quality.minCoverage',
          value: '70',
          type: 'int',
          category: 'quality',
          description: 'Cobertura mínima de tests.',
        },
      ],
    });

    // Miembros del proyecto: PO, SM y 3 devs
    const memberUsers: User[] = [po, sm, dev1, dev2, dev3];
    for (const [idx, user] of memberUsers.entries()) {
      let role: ProjectMemberRole;
      if (idx === 0) role = ProjectMemberRole.PRODUCT_OWNER;
      else if (idx === 1) role = ProjectMemberRole.SCRUM_MASTER;
      else role = ProjectMemberRole.DEVELOPER;

      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: user.id,
          role,
        },
      });
    }

    // Repositorio principal
    const repo = await prisma.repository.create({
      data: {
        projectId: project.id,
        name: `${project.code.toLowerCase()}-repo`,
        url: `https://github.com/example/${project.code.toLowerCase()}`,
        mainBranch: 'main',
        isPrimary: true,
        syncEnabled: true,
      },
    });

    // -------------------------------------------------------------------------
    // 4. Sprints, historias, tareas, eventos Scrum, métricas y ML
    // -------------------------------------------------------------------------
    const sprints: Sprint[] = [];

    for (let s = 1; s <= SEED_CONFIG.SPRINTS_PER_PROJECT; s++) {
      const sprintStart = addDays(projectStart, (s - 1) * tmpl.sprintDuration);
      const sprintEnd = addDays(sprintStart, tmpl.sprintDuration - 1);

      let status: SprintStatus;
      if (s === SEED_CONFIG.SPRINTS_PER_PROJECT) status = SprintStatus.PLANNED;
      else if (s === SEED_CONFIG.SPRINTS_PER_PROJECT - 1)
        status = SprintStatus.IN_PROGRESS;
      else status = SprintStatus.COMPLETED;

      const plannedVelocity = 40 + s * 5;
      let actualVelocity: number | null = null;

      if (status === SprintStatus.COMPLETED) {
        const performanceFactor = Math.random();
        if (performanceFactor > 0.6) {
          // sobrecumple
          actualVelocity = plannedVelocity + Math.floor(Math.random() * 5);
        } else {
          // no cumple
          actualVelocity = plannedVelocity - (1 + Math.floor(Math.random() * 5));
        }
      }

      const sprint = await prisma.sprint.create({
        data: {
          projectId: project.id,
          number: s,
          name: `Sprint ${s}`,
          goal:
            s === 1
              ? 'Base de autenticación y proyectos.'
              : s === 2
              ? 'Historias y tareas principales.'
              : s === 3
              ? 'Integraciones GitHub y métricas.'
              : 'Optimización y ML.',
          startDate: sprintStart,
          endDate: sprintEnd,
          duration: tmpl.sprintDuration,
          status,
          capacity: 120,
          plannedVelocity,
          actualVelocity,
        },
      });

      sprints.push(sprint);

      // Sprint Review y Retrospective para sprints completados / en progreso
      if (
        sprint.status === SprintStatus.COMPLETED ||
        sprint.status === SprintStatus.IN_PROGRESS
      ) {
        await prisma.sprintReview.create({
          data: {
            sprintId: sprint.id,
            date: addDays(sprintEnd, 1),
            participants: `${po.firstName} ${po.lastName}, ${sm.firstName} ${sm.lastName}, equipo de desarrollo`,
            summary: `Revisión del sprint ${s} del proyecto ${project.name}`,
            feedbackGeneral:
              s === 1
                ? 'Buenas bases técnicas, pero falta mejorar las estimaciones.'
                : 'Equipo estable, se cumplieron la mayoría de los objetivos.',
            createdById: po.id,
          },
        });

        await prisma.sprintRetrospective.create({
          data: {
            sprintId: sprint.id,
            whatWentWell:
              'Colaboración diaria, comunicación clara y objetivos visibles.',
            whatToImprove:
              'Reducir trabajo en progreso y mejorar refinamiento del backlog.',
            whatToStopDoing:
              'Dejar de iniciar tareas grandes sin dividirlas en subtareas.',
            createdById: sm.id,
            improvementActions: {
              create: [
                {
                  description:
                    'Limitar WIP a 2 tareas simultáneas por desarrollador.',
                  responsible: `${sm.firstName} ${sm.lastName}`,
                  dueDate: addDays(sprintEnd, 7),
                  status: ImprovementActionStatus.IN_PROGRESS,
                },
                {
                  description: 'Agendar refinamiento de backlog semanal.',
                  responsible: `${po.firstName} ${po.lastName}`,
                  dueDate: addDays(sprintEnd, 3),
                  status: ImprovementActionStatus.PENDING,
                },
              ],
            },
          },
        });

        // PSP metrics por desarrollador (para features históricas)
        for (const dev of [dev1, dev2, dev3]) {
          const tasksCompleted = 5 + s + Math.floor(Math.random() * 4);
          const totalEffortHours = 20 + s * 5 + Math.floor(Math.random() * 6);

          await prisma.developerPSPMetrics.create({
            data: {
              sprintId: sprint.id,
              userId: dev.id,
              tasksCompleted,
              tasksReopened: s - 1,
              defectsFixed: 2 + s,
              totalEffortHours,
              avgTimePerTask: totalEffortHours / tasksCompleted,
            },
          });
        }

        // ------------------- Riesgo de sprint (para ML de riesgo) -------------
        const committedEffort = 30 + s * 5 + i * 2;
        const teamCapacity = 45 + (i % 3) * 3;
        const historicalVelocity = 28 + (s - 1) * 4;

        const missedStories =
          sprint.status === SprintStatus.COMPLETED
            ? Math.max(0, Math.floor(s / 3) - 1)
            : Math.floor(s / 2);

        const teamChanges = i >= 2 && s > 3 ? 1 : 0;
        const bugsOpen = 4 + s + i;

        const loadRatio = committedEffort / teamCapacity;

        let riskLevel: RiskLevel;
        if (loadRatio < 0.8 && missedStories === 0 && bugsOpen < 10) {
          riskLevel = RiskLevel.LOW;
        } else if (loadRatio < 1.1 && bugsOpen < 15) {
          riskLevel = RiskLevel.MEDIUM;
        } else {
          riskLevel = RiskLevel.HIGH;
        }

        const confidenceScore =
          riskLevel === RiskLevel.HIGH
            ? 0.82
            : riskLevel === RiskLevel.MEDIUM
            ? 0.71
            : 0.6;

        await prisma.mLSprintRiskPrediction.create({
          data: {
            sprintId: sprint.id,
            riskLevel,
            confidenceScore,
            factors: {
              missedStories,
              teamChanges,
              bugsOpen,
              loadRatio,
            },
            committedEffort,
            teamCapacity,
            historicalVelocity,
          },
        });
      }

      // -----------------------------------------------------------------------
      // Historias de usuario para el sprint (alimentan ML ASSIGNMENT/VELOCITY)
      // -----------------------------------------------------------------------
      const storiesForSprint: UserStory[] = [];

      for (let j = 1; j <= SEED_CONFIG.STORIES_PER_SPRINT; j++) {
        const storyStatus: StoryStatus =
          j <= Math.floor(SEED_CONFIG.STORIES_PER_SPRINT / 2)
            ? StoryStatus.DONE
            : j <= SEED_CONFIG.STORIES_PER_SPRINT - 1
            ? StoryStatus.IN_PROGRESS
            : StoryStatus.BACKLOG;

        const story = await prisma.userStory.create({
          data: {
            projectId: project.id,
            sprintId: storyStatus === StoryStatus.BACKLOG ? null : sprint.id,
            code: `${project.code}-US-${globalStoryCounter}`,
            title: `Historia ${globalStoryCounter} del proyecto ${project.code}`,
            asA: j % 2 === 0 ? 'Docente' : 'Estudiante',
            iWant: 'Gestionar tareas del sprint de forma eficiente',
            soThat: 'el equipo pueda entregar valor continuo a los usuarios',
            acceptanceCriteria:
              '- Todas las tareas tienen responsable\n- Las pruebas pasan en CI\n- Código revisado en PR',
            description: 'Historia generada para datos de entrenamiento ML.',
            priority: j,
            businessValue: 100 - j * 5,
            orderRank: globalStoryCounter,
            estimateHours: 8 + j,
            label: j % 3,
            status: storyStatus,
          },
        });

        storiesForSprint.push(story);

        await prisma.userStoryTag.createMany({
          data: [
            {
              storyId: story.id,
              value: 'backend',
            },
            {
              storyId: story.id,
              value: j % 2 === 0 ? 'bugfix' : 'feature',
            },
          ],
          skipDuplicates: true,
        });

        // Sesión de estimación y votos (Planning Poker)
        const estimationSession = await prisma.estimationSession.create({
          data: {
            projectId: project.id,
            name: `Estimación ${story.code}`,
            status: SessionStatus.CLOSED,
            finalEstimation: `${story.estimateHours}`,
            method: EstimationMethod.FIBONACCI,
            sequence: { values: [1, 2, 3, 5, 8, 13] },
            currentRound: 2,
            startedAt: addDays(sprintStart, -1),
            completedAt: sprintStart,
            storyId: story.id,
            moderatorId: sm.id,
            isRevealed: true,
          },
        });

        for (const [idx, voter] of [dev1, dev2, dev3].entries()) {
          await prisma.estimationVote.create({
            data: {
              sessionId: estimationSession.id,
              userId: voter.id,
              voteValue: `${story.estimateHours + (idx - 1)}`,
              roundNumber: 1,
              justification: 'Basado en complejidad percibida y dependencias.',
            },
          });
        }

        // ---------------------------------------------------------------------
        // Tareas para la historia (alimentan ML ASSIGNMENT/COMPLETION)
        // ---------------------------------------------------------------------
        const tasksForStory: Task[] = [];

        for (let k = 1; k <= SEED_CONFIG.TASKS_PER_STORY; k++) {
          const statusMap = [
            TaskStatus.TODO,
            TaskStatus.IN_PROGRESS,
            TaskStatus.TESTING,
            TaskStatus.DONE,
            TaskStatus.CANCELLED,
          ];
          const taskStatus = statusMap[(k + j + s) % statusMap.length];
          const assignee = [dev1, dev2, dev3][(k + j) % 3];
          const isDone = taskStatus === TaskStatus.DONE;

          const startedAt = addDays(sprintStart, k);
          const completedAt = isDone ? addDays(startedAt, 1) : null;

          const task = await prisma.task.create({
            data: {
              storyId: story.id,
              code: `${project.code}-T-${globalTaskCounter}`,
              title: `Tarea ${globalTaskCounter} para ${story.code}`,
              description: 'Trabajo detallado asociado a la historia.',
              effort: 2 + (k % 3),
              status: taskStatus,
              assignedToId: assignee.id,
              isBug: k === SEED_CONFIG.TASKS_PER_STORY, // última tarea como bug
              reopenCount: taskStatus === TaskStatus.CANCELLED ? 1 : 0,
              startedAt,
              completedAt,
            },
          });

          tasksForStory.push(task);

          await prisma.taskActivityLog.create({
            data: {
              taskId: task.id,
              userId: assignee.id,
              action: 'STATUS_CHANGE',
              fromStatus: TaskStatus.TODO,
              toStatus: taskStatus,
              description: `Cambio de estado a ${taskStatus}`,
            },
          });

          // Commits / PRs sólo para tareas hechas (para features “históricas”)
          if (isDone) {
            await prisma.gitHubCommit.create({
              data: {
                repositoryId: repo.id,
                sha: `sha-${project.code}-${globalStoryCounter}-${globalTaskCounter}`,
                shortSha: `short-${globalTaskCounter}`,
                message: `Implementa ${task.title}`,
                author: `${assignee.firstName} ${assignee.lastName}`,
                authorEmail: assignee.email,
                committedAt: completedAt ?? startedAt,
                branch: 'main',
                url: `https://github.com/example/${project.code.toLowerCase()}/commit/sha-${globalTaskCounter}`,
                linkedStoryId: story.id,
                linkedTaskId: task.id,
              },
            });

            await prisma.gitHubPullRequest.create({
              data: {
                repositoryId: repo.id,
                number: globalTaskCounter,
                title: `PR para ${task.title}`,
                state: 'merged',
                author: `${assignee.firstName} ${assignee.lastName}`,
                sourceBranch: `feature/${task.code.toLowerCase()}`,
                targetBranch: 'main',
                url: `https://github.com/example/${project.code.toLowerCase()}/pull/${globalTaskCounter}`,
                createdAtGitHub: startedAt,
                closedAtGitHub: completedAt,
                linkedStoryId: story.id,
                linkedTaskId: task.id,
              },
            });

            await prisma.gitHubSyncLog.create({
              data: {
                repositoryId: repo.id,
                userId: admin.id,
                status: GitHubSyncStatus.SUCCESS,
                commitsFound: 1,
                prsFound: 1,
                errorMessage: null,
              },
            });
          }

          // -----------------------------------------------------------------
          // HU15: Sugerencias ML de asignación (no asignan automáticamente)
          //  - Aquí diseñamos la relación entre features y etiqueta
          // -----------------------------------------------------------------

          // "Historial" del dev (coherente con el sprint)
          const developerPastTasksCompleted =
            5 + s * 2 + (assignee.id === dev1.id ? 3 : assignee.id === dev2.id ? 1 : 0);
          const developerPastDefectsFixed =
            2 + s + (assignee.id === dev2.id ? 2 : 0);

          // Probabilidad base de que la asignación sea "buena"
          let baseProb = 0.5;

          // Historias muy prioritarias tienden a tener más foco
          if (story.priority <= 3) {
            baseProb += 0.15;
          } else if (story.priority >= 10) {
            baseProb -= 0.05;
          }

          // Tareas pequeñas suelen cerrarse mejor
          if (task.effort <= 3) {
            baseProb += 0.05;
          } else {
            baseProb -= 0.05;
          }

          // Historial del dev
          if (developerPastTasksCompleted > 5 + 2 * s) {
            baseProb += 0.1;
          } else {
            baseProb -= 0.05;
          }

          if (developerPastDefectsFixed > 3 + s / 2) {
            baseProb += 0.05;
          }

          // Bugs son más delicados
          if (task.isBug) {
            baseProb -= 0.1;
          }

          // Ruido pequeño y recorte a [0.1, 0.9]
          baseProb += (Math.random() - 0.5) * 0.1; // +/- 0.05
          baseProb = Math.min(0.9, Math.max(0.1, baseProb));

          const successProb = baseProb;
          const acceptProb = Math.min(0.9, Math.max(0.05, baseProb - 0.05));

          const assignmentSuccessful = Math.random() < successProb;
          const suggestionAccepted = Math.random() < acceptProb;

          await prisma.mLDeveloperAssignmentSuggestion.create({
            data: {
              storyId: story.id,
              taskId: task.id,
              suggestedUserId: assignee.id,
              confidenceScore: baseProb,
              reason:
                'Histórico de tareas similares en este módulo y experiencia previa.',
              wasAccepted: suggestionAccepted,
              acceptedById: suggestionAccepted ? sm.id : null, // Scrum Master confirma
            },
          });

          // MLTrainingData: ASSIGNMENT (para entrenar recomendador)
          await prisma.mLTrainingData.create({
            data: {
              sprintId: sprint.id,
              projectId: project.id,
              developerId: assignee.id,
              storyId: story.id,
              taskId: task.id,
              dataType: MLDataType.ASSIGNMENT,
              features: {
                storyPriority: story.priority,
                storyBusinessValue: story.businessValue,
                taskEffort: task.effort,
                sprintNumber: sprint.number,
                isBug: task.isBug,
                developerPastTasksCompleted,
                developerPastDefectsFixed,
              },
              outcome: {
                assignedToSuggested: suggestionAccepted,
                successfulAssignment: assignmentSuccessful,
              },
              wasSuccessful: assignmentSuccessful,
            },
          });

          // MLTrainingData: COMPLETION para tareas DONE (tiempo de finalización)
          if (isDone && completedAt) {
            const completionTimeHours = 4 + (k % 4);

            await prisma.mLTrainingData.create({
              data: {
                sprintId: sprint.id,
                projectId: project.id,
                developerId: assignee.id,
                storyId: story.id,
                taskId: task.id,
                dataType: MLDataType.COMPLETION,
                features: {
                  taskEffort: task.effort,
                  sprintNumber: sprint.number,
                  reopenCount: task.reopenCount,
                },
                outcome: {
                  completedInHours: completionTimeHours,
                  completedInSprint: true,
                },
                wasSuccessful: true,
                completionTime: completionTimeHours,
              },
            });
          }

          globalTaskCounter++;
        } // fin loop tareas

        // Daily Scrums (por sprint / dev / día) y link a historias
        for (let dayOffset = 0; dayOffset < SEED_CONFIG.DAILY_SCRUM_DAYS; dayOffset++) {
          const date = addDays(sprintStart, dayOffset);

          for (const user of [dev1, dev2, dev3]) {
            const daily = await prisma.dailyScrum.upsert({
              where: {
                sprintId_userId_date: {
                  sprintId: sprint.id,
                  userId: user.id,
                  date,
                },
              },
              create: {
                sprintId: sprint.id,
                userId: user.id,
                date,
                whatDidYesterday: `Trabajé en tareas de ${story.code}.`,
                whatWillDoToday:
                  'Continuar tareas pendientes y escribir pruebas.',
                impediments:
                  dayOffset === 2 && user.id === dev2.id
                    ? 'Bloqueado por duda funcional del PO.'
                    : null,
              },
              update: {},
            });

            await prisma.dailyScrumStory.create({
              data: {
                dailyScrumId: daily.id,
                storyId: story.id,
              },
            });
          }
        }

        // MLTrainingData: VELOCITY a nivel de historia-sprint
        await prisma.mLTrainingData.create({
          data: {
            sprintId: sprint.id,
            projectId: project.id,
            developerId: null,
            storyId: story.id,
            taskId: null,
            dataType: MLDataType.VELOCITY,
            features: {
              sprintNumber: sprint.number,
              tasksCount: tasksForStory.length,
              doneTasks: tasksForStory.filter(
                (t) => t.status === TaskStatus.DONE,
              ).length,
              estimateHours: story.estimateHours,
            },
            outcome: {
              storyCompleted: story.status === StoryStatus.DONE,
            },
            wasSuccessful: story.status === StoryStatus.DONE,
          },
        });

        globalStoryCounter++;
      } // fin loop historias

      // Burndown snapshots (diarios por sprint)
      for (let d = 0; d < sprint.duration; d++) {
        const date = addDays(sprintStart, d);
        const totalStories = storiesForSprint.length;
        const totalTasks = totalStories * SEED_CONFIG.TASKS_PER_STORY;

        const completedTasks = Math.floor((d / sprint.duration) * totalTasks);
        const committedEffort = totalTasks * 3;
        const effortCompleted = Math.floor(
          (d / sprint.duration) * committedEffort,
        );
        const effortRemaining = committedEffort - effortCompleted;

        await prisma.burndownSnapshot.create({
          data: {
            sprintId: sprint.id,
            date,
            effortRemaining,
            effortCompleted,
            effortCommitted: committedEffort,
            storiesCompleted: Math.floor(
              (d / sprint.duration) * totalStories,
            ),
            storiesTotal: totalStories,
            tasksCompleted: completedTasks,
            tasksTotal: totalTasks,
          },
        });
      }

      // Sugerencias de refactorización por sprint (para ruido “realista”)
      await prisma.codeRefactoringSuggestion.createMany({
        data: [
          {
            repositoryId: repo.id,
            sprintId: sprint.id,
            filePath: 'src/services/planningPoker.ts',
            description: 'Extraer lógica de estimación a un patrón Strategy.',
            severity: RefactoringSeverity.MEDIUM,
            tool: 'SonarQube',
            status: RefactoringStatus.PENDING,
            lineNumber: 120,
            category: 'Design',
          },
          {
            repositoryId: repo.id,
            sprintId: sprint.id,
            filePath: 'src/controllers/taskController.ts',
            description:
              'Reducir complejidad ciclomática y duplicación de código.',
            severity: RefactoringSeverity.HIGH,
            tool: 'ESLint',
            status: RefactoringStatus.RESOLVED,
            resolvedById: dev2.id,
            resolvedAt: addDays(sprintEnd, 1),
            lineNumber: 80,
            category: 'Complexity',
          },
        ],
      });
    } // fin loop sprints

    // MLTrainingData de VELOCITY a nivel de sprint-proyecto (para riesgo/compromiso)
    for (const sprint of sprints) {
      await prisma.mLTrainingData.create({
        data: {
          sprintId: sprint.id,
          projectId: project.id,
          developerId: null,
          storyId: null,
          taskId: null,
          dataType: MLDataType.VELOCITY,
          features: {
            sprintNumber: sprint.number,
            plannedVelocity: sprint.plannedVelocity,
            actualVelocity: sprint.actualVelocity,
          },
          outcome: {
            metCommitment:
              sprint.actualVelocity && sprint.plannedVelocity
                ? sprint.actualVelocity >= sprint.plannedVelocity
                : null,
          },
          wasSuccessful:
            sprint.actualVelocity && sprint.plannedVelocity
              ? sprint.actualVelocity >= sprint.plannedVelocity
              : null,
        },
      });
    }
  } // fin loop proyectos

  console.log('✅ Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
