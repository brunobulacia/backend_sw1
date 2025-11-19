import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GitHubSyncStatus } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class GitHubSyncService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verificar acceso al repositorio
   */
  async verifyRepositoryAccess(repositoryId: string, userId: string) {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
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

    if (!repository) {
      throw new NotFoundException('Repositorio no encontrado');
    }

    const isOwner = repository.project.ownerId === userId;
    const member = repository.project.members.find((m) => m.userId === userId);
    const isMember = !!member;

    if (!isOwner && !isMember && repository.project.visibility === 'PRIVATE') {
      throw new ForbiddenException('No tienes acceso a este repositorio');
    }

    return { repository, isOwner, isMember, userRole: member?.role };
  }

  /**
   * Sincronizar commits y PRs desde GitHub
   */
  async syncRepository(
    repositoryId: string,
    userId: string,
    since?: string,
    branch?: string,
  ) {
    const { repository, userRole, isOwner } = await this.verifyRepositoryAccess(
      repositoryId,
      userId,
    );

    // Solo Scrum Master y Product Owner pueden sincronizar
    if (userRole !== 'SCRUM_MASTER' && userRole !== 'PRODUCT_OWNER' && !isOwner) {
      throw new ForbiddenException(
        'Solo el Scrum Master o Product Owner pueden sincronizar repositorios',
      );
    }

    if (!repository.syncEnabled) {
      throw new BadRequestException('La sincronización está deshabilitada para este repositorio');
    }

    let syncLog: {
      repositoryId: string;
      userId: string;
      status: GitHubSyncStatus;
      commitsFound: number;
      prsFound: number;
      errorMessage: string | null;
    } = {
      repositoryId,
      userId,
      status: GitHubSyncStatus.SUCCESS,
      commitsFound: 0,
      prsFound: 0,
      errorMessage: null,
    };

    try {
      // Extraer owner y repo de la URL
      const urlMatch = repository.url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!urlMatch) {
        throw new Error('URL de repositorio inválida');
      }

      const [, owner, repo] = urlMatch;
      const targetBranch = branch || repository.mainBranch;

      // Sincronizar commits
      const commits = await this.fetchGitHubCommits(
        owner,
        repo,
        targetBranch,
        since,
        repository.githubToken || undefined,
      );

      syncLog.commitsFound = commits.length;

      // Guardar commits en la base de datos con vinculación AUTOMÁTICA
      for (const commit of commits) {
        // Buscar códigos de historias/tareas en el mensaje del commit
        const linkedStory = await this.findStoryByCode(commit.message, repository.projectId);
        const linkedTask = await this.findTaskByCode(commit.message, repository.projectId);

        await this.prisma.gitHubCommit.upsert({
          where: {
            repositoryId_sha: {
              repositoryId,
              sha: commit.sha,
            },
          },
          update: {
            message: commit.message,
            author: commit.author,
            authorEmail: commit.authorEmail,
            branch: targetBranch,
            linkedStoryId: linkedStory?.id || null,
            linkedTaskId: linkedTask?.id || null,
          },
          create: {
            repositoryId,
            sha: commit.sha,
            shortSha: commit.sha.substring(0, 7),
            message: commit.message,
            author: commit.author,
            authorEmail: commit.authorEmail,
            committedAt: new Date(commit.committedAt),
            branch: targetBranch,
            url: commit.url,
            linkedStoryId: linkedStory?.id || null,
            linkedTaskId: linkedTask?.id || null,
          },
        });
      }

      // Sincronizar branches (solo listar, no guardar por ahora)
      // La info principal ya está en commits y PRs
      // const branches = await this.fetchGitHubBranches(owner, repo, repository.githubToken || undefined);

      // Sincronizar Pull Requests
      const pullRequests = await this.fetchGitHubPullRequests(
        owner,
        repo,
        repository.githubToken || undefined,
      );

      syncLog.prsFound = pullRequests.length;

      // Guardar PRs en la base de datos con vinculación AUTOMÁTICA
      for (const pr of pullRequests) {
        // Buscar códigos en título del PR
        const linkedStory = await this.findStoryByCode(pr.title, repository.projectId);
        const linkedTask = await this.findTaskByCode(pr.title, repository.projectId);

        await this.prisma.gitHubPullRequest.upsert({
          where: {
            repositoryId_number: {
              repositoryId,
              number: pr.number,
            },
          },
          update: {
            title: pr.title,
            state: pr.state,
            closedAtGitHub: pr.closedAt ? new Date(pr.closedAt) : null,
            linkedStoryId: linkedStory?.id || null,
            linkedTaskId: linkedTask?.id || null,
          },
          create: {
            repositoryId,
            number: pr.number,
            title: pr.title,
            state: pr.state,
            author: pr.author,
            sourceBranch: pr.sourceBranch,
            targetBranch: pr.targetBranch,
            url: pr.url,
            createdAtGitHub: new Date(pr.createdAt),
            closedAtGitHub: pr.closedAt ? new Date(pr.closedAt) : null,
            linkedStoryId: linkedStory?.id || null,
            linkedTaskId: linkedTask?.id || null,
          },
        });
      }

      // Actualizar lastSyncAt del repositorio
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { lastSyncAt: new Date() },
      });
    } catch (error: any) {
      syncLog.status = GitHubSyncStatus.ERROR;
      syncLog.errorMessage = error.message;
    }

    // Guardar log de sincronización
    await this.prisma.gitHubSyncLog.create({
      data: syncLog,
    });

    return syncLog;
  }

  /**
   * Obtener commits de GitHub API
   */
  private async fetchGitHubCommits(
    owner: string,
    repo: string,
    branch: string,
    since?: string,
    token?: string,
  ) {
    const headers: any = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Scrum-App',
    };

    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const params: any = { sha: branch, per_page: 100 };
    if (since) {
      params.since = since;
    }

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      { headers, params },
    );

    return response.data.map((commit: any) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      authorEmail: commit.commit.author.email,
      committedAt: commit.commit.author.date,
      url: commit.html_url,
    }));
  }

  /**
   * Obtener Pull Requests de GitHub API
   */
  private async fetchGitHubPullRequests(
    owner: string,
    repo: string,
    token?: string,
  ) {
    const headers: any = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Scrum-App',
    };

    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      { headers, params: { state: 'all', per_page: 100 } },
    );

    return response.data.map((pr: any) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user.login,
      sourceBranch: pr.head.ref,
      targetBranch: pr.base.ref,
      url: pr.html_url,
      createdAt: pr.created_at,
      closedAt: pr.closed_at,
    }));
  }

  /**
   * Vincular commit con historia/tarea
   */
  async linkCommit(
    commitId: string,
    storyId?: string,
    taskId?: string,
    userId?: string,
  ) {
    const commit = await this.prisma.gitHubCommit.findUnique({
      where: { id: commitId },
      include: {
        repository: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!commit) {
      throw new NotFoundException('Commit no encontrado');
    }

    // Verificar que la historia/tarea pertenezca al proyecto
    if (storyId) {
      const story = await this.prisma.userStory.findFirst({
        where: {
          id: storyId,
          projectId: commit.repository.projectId,
        },
      });

      if (!story) {
        throw new BadRequestException('La historia no pertenece a este proyecto');
      }
    }

    if (taskId) {
      const task = await this.prisma.task.findFirst({
        where: {
          id: taskId,
          story: {
            projectId: commit.repository.projectId,
          },
        },
      });

      if (!task) {
        throw new BadRequestException('La tarea no pertenece a este proyecto');
      }
    }

    return this.prisma.gitHubCommit.update({
      where: { id: commitId },
      data: {
        linkedStoryId: storyId || null,
        linkedTaskId: taskId || null,
      },
    });
  }

  /**
   * Obtener commits de un repositorio
   */
  async getRepositoryCommits(repositoryId: string, userId: string) {
    await this.verifyRepositoryAccess(repositoryId, userId);

    return this.prisma.gitHubCommit.findMany({
      where: { repositoryId },
      include: {
        linkedStory: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
        linkedTask: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
      orderBy: { committedAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Obtener Pull Requests de un repositorio
   */
  async getRepositoryPullRequests(repositoryId: string, userId: string) {
    await this.verifyRepositoryAccess(repositoryId, userId);

    return this.prisma.gitHubPullRequest.findMany({
      where: { repositoryId },
      include: {
        linkedStory: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
        linkedTask: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
      orderBy: { createdAtGitHub: 'desc' },
      take: 50,
    });
  }

  /**
   * Obtener historial de sincronizaciones
   */
  async getSyncLogs(repositoryId: string, userId: string) {
    await this.verifyRepositoryAccess(repositoryId, userId);

    return this.prisma.gitHubSyncLog.findMany({
      where: { repositoryId },
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
      orderBy: { executedAt: 'desc' },
      take: 20,
    });
  }

  /**
   * VINCULACIÓN AUTOMÁTICA: Buscar historia por código en el mensaje
   * Busca patrones como: US-010, HU-5, STORY-123
   */
  private async findStoryByCode(message: string, projectId: string) {
    const patterns = [
      /\b(US|HU|STORY)[-_](\d+)\b/i,
      /\b#(\d+)\b/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const code = match[1] ? `${match[1]}-${match[2]}` : `US-${match[1]}`;
        
        // Buscar historia con código similar
        const story = await this.prisma.userStory.findFirst({
          where: {
            projectId,
            code: {
              contains: match[2], // Busca por el número
            },
          },
        });

        if (story) return story;
      }
    }

    return null;
  }

  /**
   * VINCULACIÓN AUTOMÁTICA: Buscar tarea por código en el mensaje
   * Busca patrones como: T-023, TASK-5, T_123
   */
  private async findTaskByCode(message: string, projectId: string) {
    const patterns = [
      /\b(T|TASK)[-_](\d+)(?:[-_](\d+))?\b/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const taskCodePart = match[3] ? `${match[2]}-${match[3]}` : match[2];
        
        // Buscar tarea con código similar
        const task = await this.prisma.task.findFirst({
          where: {
            code: {
              contains: taskCodePart,
            },
            story: {
              projectId,
            },
          },
        });

        if (task) return task;
      }
    }

    return null;
  }

  /**
   * Obtener actividad de GitHub de una historia
   * MUESTRA EN DETALLE: sha corto, mensaje, rama, PR, enlace
   */
  async getStoryGitHubActivity(storyId: string, userId: string) {
    const story = await this.prisma.userStory.findUnique({
      where: { id: storyId },
      include: { project: true },
    });

    if (!story) {
      throw new NotFoundException('Historia no encontrada');
    }

    // Verificar acceso al proyecto
    const project = await this.prisma.project.findUnique({
      where: { id: story.projectId },
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

    // Obtener commits vinculados
    const commits = await this.prisma.gitHubCommit.findMany({
      where: { linkedStoryId: storyId },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy: { committedAt: 'desc' },
    });

    // Obtener PRs vinculados
    const pullRequests = await this.prisma.gitHubPullRequest.findMany({
      where: { linkedStoryId: storyId },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy: { createdAtGitHub: 'desc' },
    });

    return {
      storyId,
      storyCode: story.code,
      commits: commits.map((c) => ({
        id: c.id,
        shortSha: c.shortSha,
        message: c.message,
        author: c.author,
        branch: c.branch,
        url: c.url,
        committedAt: c.committedAt,
        repository: c.repository,
      })),
      pullRequests: pullRequests.map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.author,
        sourceBranch: pr.sourceBranch,
        targetBranch: pr.targetBranch,
        url: pr.url,
        repository: pr.repository,
      })),
    };
  }

  /**
   * Obtener actividad de GitHub de una tarea
   */
  async getTaskGitHubActivity(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        story: {
          include: { project: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const project = task.story.project;
    const isOwner = project.ownerId === userId;
    const members = await this.prisma.projectMember.findMany({
      where: { projectId: project.id, isActive: true },
    });
    const isMember = members.some((m) => m.userId === userId);

    if (!isOwner && !isMember && project.visibility === 'PRIVATE') {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    // Obtener commits vinculados
    const commits = await this.prisma.gitHubCommit.findMany({
      where: { linkedTaskId: taskId },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy: { committedAt: 'desc' },
    });

    // Obtener PRs vinculados
    const pullRequests = await this.prisma.gitHubPullRequest.findMany({
      where: { linkedTaskId: taskId },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy: { createdAtGitHub: 'desc' },
    });

    return {
      taskId,
      taskCode: task.code,
      commits: commits.map((c) => ({
        id: c.id,
        shortSha: c.shortSha,
        message: c.message,
        author: c.author,
        branch: c.branch,
        url: c.url,
        committedAt: c.committedAt,
        repository: c.repository,
      })),
      pullRequests: pullRequests.map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.author,
        url: pr.url,
        repository: pr.repository,
      })),
    };
  }
}

