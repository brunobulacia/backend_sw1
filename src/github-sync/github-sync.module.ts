import { Module } from '@nestjs/common';
import { GitHubSyncController } from './github-sync.controller';
import { GitHubSyncService } from './github-sync.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GitHubSyncController],
  providers: [GitHubSyncService],
  exports: [GitHubSyncService],
})
export class GitHubSyncModule {}

