import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { StoriesModule } from './stories/stories.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { EstimationModule } from './estimation/estimation.module';
import { KanbanModule } from './kanban/kanban.module';
import { ProjectConfigModule } from './project-config/project-config.module';
import { SprintModule } from './sprint/sprint.module';
import { OAuthGHModule } from './oauth-github/oauthgh.module';
import { DailyScrumModule } from './daily-scrum/daily-scrum.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { SprintReviewModule } from './sprint-review/sprint-review.module';
import { SprintRetrospectiveModule } from './sprint-retrospective/sprint-retrospective.module';
import { GitHubSyncModule } from './github-sync/github-sync.module';
import { PSPMetricsModule } from './psp-metrics/psp-metrics.module';
import { CodeRefactoringModule } from './code-refactoring/code-refactoring.module';
import { MLPredictionsModule } from './ml-predictions/ml-predictions.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    ProjectsModule,
    StoriesModule,
    EstimationModule,
    KanbanModule,
    ProjectConfigModule,
    SprintModule,
    OAuthGHModule,
    DailyScrumModule,
    RepositoriesModule,
    SprintReviewModule,
    SprintRetrospectiveModule,
    GitHubSyncModule,
    PSPMetricsModule,
    CodeRefactoringModule,
    MLPredictionsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      //PARA PONER EL GUARD DE JWT EN TODOS LOS ENDPOINTS PERRITOUUUU
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
