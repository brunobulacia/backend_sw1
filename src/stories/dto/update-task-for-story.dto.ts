import { IsString, IsInt, Min, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class UpdateTaskForStoryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  effort?: number;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
