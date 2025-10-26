import { IsEnum, IsUUID } from 'class-validator';
import { ProjectMemberRole } from '@prisma/client';

export class ProjectTeamMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(ProjectMemberRole, {
    message:
      'El rol del miembro del equipo debe ser Product Owner, Scrum Master o Developer',
  })
  role: ProjectMemberRole;
}
