import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PSPMetricsService } from './psp-metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sprints/:sprintId/psp-metrics')
@UseGuards(JwtAuthGuard)
export class PSPMetricsController {
  constructor(private readonly pspMetricsService: PSPMetricsService) {}

  /**
   * GET /api/sprints/:sprintId/psp-metrics
   * Obtener métricas PSP del sprint (vista para Scrum Master - resumen del equipo)
   */
  @Get()
  async getSprintMetrics(
    @Param('sprintId') sprintId: string,
    @Req() req: any,
  ) {
    return this.pspMetricsService.getSprintMetrics(sprintId, req.user.userId);
  }

  /**
   * GET /api/sprints/:sprintId/psp-metrics/my-metrics
   * Obtener MIS métricas PSP (vista para developer - solo sus propias métricas)
   */
  @Get('my-metrics')
  async getMyPSPMetrics(
    @Param('sprintId') sprintId: string,
    @Req() req: any,
  ) {
    return this.pspMetricsService.calculateDeveloperMetrics(
      sprintId,
      req.user.userId, // El propio usuario
      req.user.userId,
    );
  }

  /**
   * GET /api/sprints/:sprintId/psp-metrics/developer/:developerId
   * Obtener métricas de un developer específico
   */
  @Get('developer/:developerId')
  async getDeveloperMetrics(
    @Param('sprintId') sprintId: string,
    @Param('developerId') developerId: string,
    @Req() req: any,
  ) {
    return this.pspMetricsService.calculateDeveloperMetrics(
      sprintId,
      developerId,
      req.user.userId,
    );
  }

  /**
   * POST /api/sprints/:sprintId/psp-metrics/recalculate
   * Recalcular métricas de todo el equipo
   */
  @Post('recalculate')
  async recalculateSprintMetrics(
    @Param('sprintId') sprintId: string,
    @Req() req: any,
  ) {
    return this.pspMetricsService.recalculateSprintMetrics(
      sprintId,
      req.user.userId,
    );
  }
}

