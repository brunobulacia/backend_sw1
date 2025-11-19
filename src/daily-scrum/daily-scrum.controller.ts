import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DailyScrumService } from './daily-scrum.service';
import { CreateDailyScrumDto } from './dto/create-daily-scrum.dto';
import { UpdateDailyScrumDto } from './dto/update-daily-scrum.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('daily-scrum')
@UseGuards(JwtAuthGuard)
export class DailyScrumController {
  constructor(private readonly dailyScrumService: DailyScrumService) {}

  /**
   * Crear o actualizar un daily scrum
   * POST /daily-scrum
   */
  @Post()
  async createOrUpdateDailyScrum(
    @Body() createDto: CreateDailyScrumDto,
    @Req() req: any,
  ) {
    return this.dailyScrumService.createOrUpdateDailyScrum(
      createDto,
      req.user.userId,
    );
  }

  /**
   * Obtener un daily scrum por ID
   * GET /daily-scrum/:id
   */
  @Get(':id')
  async getDailyScrumById(@Param('id') id: string, @Req() req: any) {
    return this.dailyScrumService.getDailyScrumById(id, req.user.userId);
  }

  /**
   * Actualizar un daily scrum
   * PUT /daily-scrum/:id
   */
  @Put(':id')
  async updateDailyScrum(
    @Param('id') id: string,
    @Body() updateDto: UpdateDailyScrumDto,
    @Req() req: any,
  ) {
    return this.dailyScrumService.updateDailyScrum(
      id,
      updateDto,
      req.user.userId,
    );
  }

  /**
   * Obtener dailies de un sprint (con filtros)
   * GET /daily-scrum/sprint/:sprintId
   */
  @Get('sprint/:sprintId')
  async getSprintDailies(
    @Param('sprintId') sprintId: string,
    @Query('date') date?: string,
    @Query('memberId') memberId?: string,
    @Req() req?: any,
  ) {
    return this.dailyScrumService.getSprintDailies(sprintId, req.user.userId, {
      date,
      memberId,
    });
  }

  /**
   * Vista consolidada del daily (para Scrum Master)
   * GET /daily-scrum/sprint/:sprintId/consolidated
   */
  @Get('sprint/:sprintId/consolidated')
  async getConsolidatedDaily(
    @Param('sprintId') sprintId: string,
    @Query('date') date: string,
    @Req() req: any,
  ) {
    return this.dailyScrumService.getConsolidatedDaily(
      sprintId,
      date,
      req.user.userId,
    );
  }

  /**
   * Historial de dailies del sprint
   * GET /daily-scrum/sprint/:sprintId/history
   */
  @Get('sprint/:sprintId/history')
  async getDailyHistory(@Param('sprintId') sprintId: string, @Req() req: any) {
    return this.dailyScrumService.getDailyHistory(sprintId, req.user.userId);
  }
}

