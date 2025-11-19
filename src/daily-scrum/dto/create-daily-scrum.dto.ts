import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, IsDateString } from 'class-validator';

export class CreateDailyScrumDto {
  @IsUUID()
  @IsNotEmpty()
  sprintId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string; // formato: YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  whatDidYesterday: string;

  @IsString()
  @IsNotEmpty()
  whatWillDoToday: string;

  @IsString()
  @IsOptional()
  impediments?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  storyIds?: string[]; // IDs de historias/tareas vinculadas
}

