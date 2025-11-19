import { Module } from '@nestjs/common';
import { PSPMetricsController } from './psp-metrics.controller';
import { PSPMetricsService } from './psp-metrics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PSPMetricsController],
  providers: [PSPMetricsService],
  exports: [PSPMetricsService],
})
export class PSPMetricsModule {}

