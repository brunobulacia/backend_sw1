import { IsString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class UpdateTaskDto {
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
}
