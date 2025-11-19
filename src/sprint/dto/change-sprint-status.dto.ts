import { IsEnum } from 'class-validator';
import { SprintStatus } from '@prisma/client';

export class ChangeSprintStatusDto {
  @IsEnum(SprintStatus)
  status: SprintStatus;
}
