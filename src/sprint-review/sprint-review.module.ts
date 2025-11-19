import { Module } from '@nestjs/common';
import { SprintReviewController } from './sprint-review.controller';
import { SprintReviewService } from './sprint-review.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SprintReviewController],
  providers: [SprintReviewService],
  exports: [SprintReviewService],
})
export class SprintReviewModule {}

