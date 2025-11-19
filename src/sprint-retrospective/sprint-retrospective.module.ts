import { Module } from '@nestjs/common';
import { SprintRetrospectiveController } from './sprint-retrospective.controller';
import { SprintRetrospectiveService } from './sprint-retrospective.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SprintRetrospectiveController],
  providers: [SprintRetrospectiveService],
  exports: [SprintRetrospectiveService],
})
export class SprintRetrospectiveModule {}

