import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { KanbanService } from './kanban.service';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Controller('kanban')
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @Get('projects/:projectId/board')
  async getKanbanBoard(@Param('projectId') projectId: string, @Request() req: any) {
    return this.kanbanService.getKanbanBoard(projectId, req.user.id);
  }

  @Get('projects/:projectId/sprints/:sprintId/board')
  async getKanbanBoardBySprint(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Request() req: any,
  ) {
    return this.kanbanService.getKanbanBoardBySprint(projectId, sprintId, req.user.id);
  }

  @Patch('projects/:projectId/tasks/:taskId/status')
  async updateTaskStatus(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateDto: UpdateTaskStatusDto,
    @Request() req: any,
  ) {
    return this.kanbanService.updateTaskStatus(
      projectId,
      taskId,
      req.user.id,
      updateDto,
    );
  }

  @Get('projects/:projectId/tasks/:taskId/activity')
  async getTaskActivity(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Request() req: any,
  ) {
    return this.kanbanService.getTaskActivity(projectId, taskId, req.user.id);
  }

  @Post('projects/:projectId/tasks/:taskId/assign')
  async assignTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body('assignedToId') assignedToId: string | null,
    @Request() req: any,
  ) {
    return this.kanbanService.assignTask(
      projectId,
      taskId,
      assignedToId,
      req.user.id,
    );
  }
}
