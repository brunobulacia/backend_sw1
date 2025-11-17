import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
