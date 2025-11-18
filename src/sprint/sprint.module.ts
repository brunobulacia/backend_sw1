import { Module } from '@nestjs/common';
import { SprintController } from './sprint.controller';
import { SprintService } from './sprint.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsCalculatorService } from './metrics/metrics-calculator.service';
import { BurndownService } from './metrics/burndown.service';
import { BurndownSchedulerService } from './metrics/burndown-scheduler.service';
import { ChartExportService } from './metrics/chart-export.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [SprintController],
  providers: [
      SprintService,
      MetricsCalculatorService,
      BurndownService,
      BurndownSchedulerService,
      ChartExportService,
    ],
  exports: [
      SprintService,
      BurndownService
    ],
})
export class SprintModule {
  constructor(
    private readonly sprintService: SprintService,
    private readonly burndownService: BurndownService,
  ) {
    // Inyectar manualmente BurndownService en SprintService para evitar dependencia circular
    this.sprintService.setBurndownService(this.burndownService);
  }
}
