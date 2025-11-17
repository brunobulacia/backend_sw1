import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SprintService } from './sprint.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddStoriesToSprintDto } from './dto/add-stories-to-sprint.dto';

@Controller('projects/:projectId/sprints')
@UseGuards(JwtAuthGuard)
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Get()
  async getProjectSprints(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.sprintService.getProjectSprints(projectId, req.user.id);
  }

  @Get('available-stories')
  async getAvailableStories(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.sprintService.getAvailableStories(projectId, req.user.id);
  }

  @Get(':sprintId')
  async getSprintById(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Request() req: any,
  ) {
    return this.sprintService.getSprintById(projectId, sprintId, req.user.id);
  }

  @Post()
  async createSprint(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateSprintDto,
    @Request() req: any,
  ) {
    return this.sprintService.createSprint(projectId, createDto, req.user.id);
  }

  @Patch(':sprintId')
  async updateSprint(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() updateDto: UpdateSprintDto,
    @Request() req: any,
  ) {
    return this.sprintService.updateSprint(projectId, sprintId, updateDto, req.user.id);
  }

  @Post(':sprintId/add-stories')
  async addStoriesToSprint(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: AddStoriesToSprintDto,
    @Request() req: any,
  ) {
    return this.sprintService.addStoriesToSprint(projectId, sprintId, dto, req.user.id);
  }

  @Post(':sprintId/remove-stories')
  async removeStoriesFromSprint(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: AddStoriesToSprintDto,
    @Request() req: any,
  ) {
    return this.sprintService.removeStoriesFromSprint(
      projectId,
      sprintId,
      dto,
      req.user.id,
    );
  }

  @Post(':sprintId/tasks')
  async createTask(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() createDto: CreateTaskDto,
    @Request() req: any,
  ) {
    return this.sprintService.createTask(projectId, sprintId, createDto, req.user.id);
  }

  @Patch(':sprintId/tasks/:taskId')
  async updateTask(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Param('taskId') taskId: string,
    @Body() updateDto: UpdateTaskDto,
    @Request() req: any,
  ) {
    return this.sprintService.updateTask(
      projectId,
      sprintId,
      taskId,
      updateDto,
      req.user.id,
    );
  }

  @Delete(':sprintId/tasks/:taskId')
  async deleteTask(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Param('taskId') taskId: string,
    @Request() req: any,
  ) {
    return this.sprintService.deleteTask(projectId, sprintId, taskId, req.user.id);
  }

  @Post(':sprintId/start')
  async startSprint(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Request() req: any,
  ) {
    return this.sprintService.startSprint(projectId, sprintId, req.user.id);
  }
}
