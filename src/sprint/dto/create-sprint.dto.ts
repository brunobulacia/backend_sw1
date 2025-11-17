import { IsString, IsInt, IsDateString, Min, Max, IsOptional, IsArray } from 'class-validator';

export class CreateSprintDto {
  @IsInt()
  number: number;

  @IsString()
  name: string;

  @IsString()
  goal: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @Min(1)
  @Max(4)
  duration: number;

  @IsOptional()
  @IsInt()
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  storyIds?: string[]; // IDs de historias a seleccionar para el sprint
}
