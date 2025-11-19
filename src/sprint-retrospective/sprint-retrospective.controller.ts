import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SprintRetrospectiveService } from './sprint-retrospective.service';
import { CreateSprintRetrospectiveDto } from './dto/create-sprint-retrospective.dto';
import { UpdateSprintRetrospectiveDto } from './dto/update-sprint-retrospective.dto';
import { UpdateImprovementActionDto } from './dto/update-improvement-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class SprintRetrospectiveController {
  constructor(
    private readonly retrospectiveService: SprintRetrospectiveService,
  ) {}

  /**
   * POST /api/sprints/:sprintId/retrospective
   * Crear Sprint Retrospective
   */
  @Post('sprints/:sprintId/retrospective')
  async createSprintRetrospective(
    @Param('sprintId') sprintId: string,
    @Body() createDto: CreateSprintRetrospectiveDto,
    @Req() req: any,
  ) {
    return this.retrospectiveService.createSprintRetrospective(
      sprintId,
      createDto,
      req.user.userId,
    );
  }

  /**
   * GET /api/sprints/:sprintId/retrospective
   * Obtener Sprint Retrospective
   */
  @Get('sprints/:sprintId/retrospective')
  async getSprintRetrospective(
    @Param('sprintId') sprintId: string,
    @Req() req: any,
  ) {
    return this.retrospectiveService.getSprintRetrospective(
      sprintId,
      req.user.userId,
    );
  }

  /**
   * PUT /api/sprints/:sprintId/retrospective
   * Actualizar Sprint Retrospective
   */
  @Put('sprints/:sprintId/retrospective')
  async updateSprintRetrospective(
    @Param('sprintId') sprintId: string,
    @Body() updateDto: UpdateSprintRetrospectiveDto,
    @Req() req: any,
  ) {
    return this.retrospectiveService.updateSprintRetrospective(
      sprintId,
      updateDto,
      req.user.userId,
    );
  }

  /**
   * PATCH /api/improvement-actions/:id
   * Actualizar acción de mejora
   */
  @Patch('improvement-actions/:id')
  async updateImprovementAction(
    @Param('id') id: string,
    @Body() updateDto: UpdateImprovementActionDto,
    @Req() req: any,
  ) {
    return this.retrospectiveService.updateImprovementAction(
      id,
      updateDto,
      req.user.userId,
    );
  }

  /**
   * GET /api/projects/:projectId/improvement-actions/active
   * Obtener acciones de mejora activas del proyecto
   */
  @Get('projects/:projectId/improvement-actions/active')
  async getActiveImprovementActions(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    return this.retrospectiveService.getActiveImprovementActions(
      projectId,
      req.user.userId,
    );
  }
}

