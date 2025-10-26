import { IsEmail, IsEnum } from 'class-validator';
import { ProjectMemberRole } from '@prisma/client';

export class InviteProjectMemberDto {
  @IsEmail({}, { message: 'Debe proporcionar un correo válido' })
  email: string;

  @IsEnum(ProjectMemberRole, {
    message:
      'El rol debe ser uno de: Product Owner, Scrum Master o Developer',
  })
  role: ProjectMemberRole;
}
