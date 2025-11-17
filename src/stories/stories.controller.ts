import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { ReorderStoriesDto } from './dto/reorder-stories.dto';
import { CreateTaskForStoryDto } from './dto/create-task-for-story.dto';
import { UpdateTaskForStoryDto } from './dto/update-task-for-story.dto';

interface AuthRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  private getUserId(req: AuthRequest) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }
    return req.user.id;
  }

  @Get()
  async findAll(
    @Param('projectId') projectId: string,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.storiesService.findAll(projectId, userId);
  }

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() createStoryDto: CreateStoryDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.storiesService.create(projectId, createStoryDto, userId);
  }

  @Patch(':storyId')
  async update(
    @Param('projectId') projectId: string,
    @Param('storyId') storyId: string,
    @Body() updateStoryDto: UpdateStoryDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.storiesService.update(
      projectId,
      storyId,
      updateStoryDto,
      userId,
    );
  }

  @Patch('reorder')
  async reorder(
    @Param('projectId') projectId: string,
    @Body() reorderDto: ReorderStoriesDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.storiesService.reorder(projectId, reorderDto, userId);
  }

  // Endpoints para gestionar tareas de historias

  @Get(':storyId/tasks')
  async getStoryTasks(
    @Param('projectId') projectId: string,
    @Param('storyId') storyId: string,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.storiesService.getStoryTasks(projectId, storyId, userId);
  }

  @Post(':storyId/tasks')
  async createTaskForStory(
    @Param('projectId') projectId: string,
    @Param('storyId') storyId: string,
    @Body() createTaskDto: CreateTaskForStoryDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.storiesService.createTaskForStory(
      projectId,
      storyId,
      createTaskDto,
      userId,
    );
  }

  @Patch(':storyId/tasks/:taskId')
  async updateTaskForStory(
    @Param('projectId') projectId: string,
    @Param('storyId') storyId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskForStoryDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.storiesService.updateTaskForStory(
      projectId,
      storyId,
      taskId,
      updateTaskDto,
      userId,
    );
  }

  @Delete(':storyId/tasks/:taskId')
  async deleteTaskForStory(
    @Param('projectId') projectId: string,
    @Param('storyId') storyId: string,
    @Param('taskId') taskId: string,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.storiesService.deleteTaskForStory(
      projectId,
      storyId,
      taskId,
      userId,
    );
  }
}
