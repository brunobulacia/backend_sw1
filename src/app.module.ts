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
