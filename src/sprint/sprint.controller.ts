import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SprintService } from './sprint.service';
import { BurndownService } from './metrics/burndown.service';
import { MetricsCalculatorService } from './metrics/metrics-calculator.service';
import { ChartExportService } from './metrics/chart-export.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddStoriesToSprintDto } from './dto/add-stories-to-sprint.dto';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { ExportBurndownDto, ExportFormat } from './dto/export-burndown.dto';
import { ChangeSprintStatusDto } from './dto/change-sprint-status.dto';
import { CreateSprintReviewDto } from './dto/create-sprint-review.dto';
import { CreateSprintRetrospectiveDto } from './dto/create-sprint-retrospective.dto';

@Controller('projects/:projectId/sprints')
@UseGuards(JwtAuthGuard)
export class SprintController {
  constructor(
    private readonly sprintService: SprintService,
    private readonly burndownService: BurndownService,
    private readonly metricsCalculator: MetricsCalculatorService,
    private readonly chartExportService: ChartExportService,
  ) {}

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

  @Patch(':sprintId/status')
  async changeSprintStatus(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: ChangeSprintStatusDto,
    @Request() req: any,
  ) {
    return this.sprintService.changeSprintStatus(
      projectId,
      sprintId,
      dto.status,
      req.user.id,
    );
  }

  // ========== ENDPOINTS DE BURNDOWN Y MÉTRICAS ==========

  /**
   * Obtener el gráfico de burndown completo del sprint
   * Incluye: línea ideal, línea real, snapshots diarios y resumen
   */
  @Get(':sprintId/burndown')
  async getBurndownChart(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Request() req: any,
  ) {
    // Verificar acceso al proyecto
    await this.sprintService.verifyProjectAccess(projectId, req.user.id);
    return this.burndownService.getBurndownChart(sprintId);
  }

  /**
   * Obtener métricas detalladas del sprint
   * Incluye: esfuerzo, historias, tareas, velocidad
   */
  @Get(':sprintId/metrics')
  async getSprintMetrics(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Request() req: any,
  ) {
    // Verificar acceso al proyecto
    await this.sprintService.verifyProjectAccess(projectId, req.user.id);
    return this.metricsCalculator.calculateSprintMetrics(sprintId);
  }

  /**
   * Crear un snapshot manual del sprint
   * Útil para crear snapshots fuera del horario automático
   */
  @Post(':sprintId/snapshots')
  async createManualSnapshot(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: CreateSnapshotDto,
    @Request() req: any,
  ) {
    // Verificar acceso al proyecto
    await this.sprintService.verifyProjectAccess(projectId, req.user.id);
    
    const date = dto.date ? new Date(dto.date) : undefined;
    return this.burndownService.createSnapshot(sprintId, date);
  }

  /**
   * Obtener el historial de snapshots del sprint
   */
  @Get(':sprintId/snapshots')
  async getSnapshotHistory(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Request() req: any,
  ) {
    // Verificar acceso al proyecto
    await this.sprintService.verifyProjectAccess(projectId, req.user.id);
    return this.burndownService.getSnapshotHistory(sprintId);
  }

  /**
   * Exportar el gráfico burndown a imagen (PNG/PDF/SVG)
   * Query params: format (png|pdf|svg), width, height
   */
  @Get(':sprintId/burndown/export')
  async exportBurndownChart(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Query('format') format?: ExportFormat,
    @Query('width') width?: string,
    @Query('height') height?: string,
    @Request() req?: any,
    @Res({ passthrough: true }) res?: Response,
  ) {
    // Verificar acceso al proyecto
    await this.sprintService.verifyProjectAccess(projectId, req.user.id);

    // Obtener datos del burndown
    const burndownData = await this.burndownService.getBurndownChart(sprintId);

    // Parámetros de exportación
    const exportFormat = format || ExportFormat.PNG;
    const imageWidth = width ? parseInt(width) : 1200;
    const imageHeight = height ? parseInt(height) : 600;

    // Generar la imagen
    const buffer = await this.chartExportService.exportBurndownChart(
      burndownData,
      exportFormat,
      imageWidth,
      imageHeight,
    );

    // Configurar headers de respuesta según el formato
    const contentTypes = {
      [ExportFormat.PNG]: 'image/png',
      [ExportFormat.PDF]: 'application/pdf',
      [ExportFormat.SVG]: 'image/svg+xml',
    };

    const extensions = {
      [ExportFormat.PNG]: 'png',
      [ExportFormat.PDF]: 'pdf',
      [ExportFormat.SVG]: 'svg',
    };

    if (res) {
      res.set({
        'Content-Type': contentTypes[exportFormat],
        'Content-Disposition': `attachment; filename="burndown-sprint-${burndownData.sprintInfo.number}.${extensions[exportFormat]}"`,
        'Content-Length': buffer.length,
      });
    }

    return new StreamableFile(buffer);
  }

  // ========== SPRINT REVIEW ENDPOINTS ==========

  @Get(':sprintId/review')
  async getSprintReview(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Request() req: any,
  ) {
    return this.sprintService.getSprintReview(projectId, sprintId, req.user.id);
  }

  @Post(':sprintId/review')
  async createSprintReview(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: CreateSprintReviewDto,
    @Request() req: any,
  ) {
    return this.sprintService.createSprintReview(projectId, sprintId, dto, req.user.id);
  }

  @Put(':sprintId/review')
  async updateSprintReview(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: CreateSprintReviewDto,
    @Request() req: any,
  ) {
    return this.sprintService.updateSprintReview(projectId, sprintId, dto, req.user.id);
  }

  @Delete(':sprintId/review')
  async deleteSprintReview(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Request() req: any,
  ) {
    return this.sprintService.deleteSprintReview(projectId, sprintId, req.user.id);
  }

  // ========== SPRINT RETROSPECTIVE ENDPOINTS ==========

  @Get(':sprintId/retrospective')
  async getSprintRetrospective(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Request() req: any,
  ) {
    return this.sprintService.getSprintRetrospective(projectId, sprintId, req.user.id);
  }

  @Post(':sprintId/retrospective')
  async createSprintRetrospective(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: CreateSprintRetrospectiveDto,
    @Request() req: any,
  ) {
    return this.sprintService.createSprintRetrospective(projectId, sprintId, dto, req.user.id);
  }

  @Put(':sprintId/retrospective')
  async updateSprintRetrospective(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: CreateSprintRetrospectiveDto,
    @Request() req: any,
  ) {
    return this.sprintService.updateSprintRetrospective(projectId, sprintId, dto, req.user.id);
  }

  @Delete(':sprintId/retrospective')
  async deleteSprintRetrospective(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Request() req: any,
  ) {
    return this.sprintService.deleteSprintRetrospective(projectId, sprintId, req.user.id);
  }
}
