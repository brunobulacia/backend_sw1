import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { GitHubSyncService } from './github-sync.service';
import { SyncRepositoryDto } from './dto/sync-repository.dto';
import { LinkCommitDto } from './dto/link-commit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('repositories/:repositoryId')
@UseGuards(JwtAuthGuard)
export class GitHubSyncController {
  constructor(private readonly githubSyncService: GitHubSyncService) {}

  /**
   * POST /api/repositories/:repositoryId/sync
   * Sincronizar commits y PRs desde GitHub
   */
  @Post('sync')
  async syncRepository(
    @Param('repositoryId') repositoryId: string,
    @Body() syncDto: SyncRepositoryDto,
    @Req() req: any,
  ) {
    return this.githubSyncService.syncRepository(
      repositoryId,
      req.user.userId,
      syncDto.since,
      syncDto.branch,
    );
  }

  /**
   * GET /api/repositories/:repositoryId/commits
   * Obtener commits sincronizados
   */
  @Get('commits')
  async getRepositoryCommits(
    @Param('repositoryId') repositoryId: string,
    @Req() req: any,
  ) {
    return this.githubSyncService.getRepositoryCommits(
      repositoryId,
      req.user.userId,
    );
  }

  /**
   * GET /api/repositories/:repositoryId/pull-requests
   * Obtener Pull Requests sincronizados
   */
  @Get('pull-requests')
  async getRepositoryPullRequests(
    @Param('repositoryId') repositoryId: string,
    @Req() req: any,
  ) {
    return this.githubSyncService.getRepositoryPullRequests(
      repositoryId,
      req.user.userId,
    );
  }

  /**
   * GET /api/repositories/:repositoryId/sync-logs
   * Obtener historial de sincronizaciones
   */
  @Get('sync-logs')
  async getSyncLogs(
    @Param('repositoryId') repositoryId: string,
    @Req() req: any,
  ) {
    return this.githubSyncService.getSyncLogs(repositoryId, req.user.userId);
  }

  /**
   * PATCH /api/repositories/commits/:commitId/link
   * Vincular commit con historia/tarea
   */
  @Patch('/commits/:commitId/link')
  async linkCommit(
    @Param('commitId') commitId: string,
    @Body() linkDto: LinkCommitDto,
    @Req() req: any,
  ) {
    return this.githubSyncService.linkCommit(
      commitId,
      linkDto.storyId,
      linkDto.taskId,
      req.user.userId,
    );
  }

  /**
   * GET /api/stories/:storyId/github-activity
   * Obtener commits y PRs vinculados a una historia
   */
  @Get('stories/:storyId/github-activity')
  async getStoryGitHubActivity(
    @Param('storyId') storyId: string,
    @Req() req: any,
  ) {
    return this.githubSyncService.getStoryGitHubActivity(
      storyId,
      req.user.userId,
    );
  }

  /**
   * GET /api/tasks/:taskId/github-activity
   * Obtener commits y PRs vinculados a una tarea
   */
  @Get('tasks/:taskId/github-activity')
  async getTaskGitHubActivity(
    @Param('taskId') taskId: string,
    @Req() req: any,
  ) {
    return this.githubSyncService.getTaskGitHubActivity(
      taskId,
      req.user.userId,
    );
  }
}

