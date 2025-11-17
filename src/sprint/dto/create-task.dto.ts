import { IsString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateTaskDto {
  @IsUUID()
  storyId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  effort: number;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
