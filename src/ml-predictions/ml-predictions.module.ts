import { Module } from '@nestjs/common';
import { MLPredictionsController } from './ml-predictions.controller';
import { MLPredictionsService } from './ml-predictions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MLPredictionsController],
  providers: [MLPredictionsService],
  exports: [MLPredictionsService],
})
export class MLPredictionsModule {}

