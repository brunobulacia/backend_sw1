import { IsString, IsInt, Min, IsOptional, IsUUID } from 'class-validator';

export class CreateTaskForStoryDto {
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
