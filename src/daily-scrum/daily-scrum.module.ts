import { Module } from '@nestjs/common';
import { DailyScrumController } from './daily-scrum.controller';
import { DailyScrumService } from './daily-scrum.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DailyScrumController],
  providers: [DailyScrumService],
  exports: [DailyScrumService],
})
export class DailyScrumModule {}

