import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ProjectVisibility, ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;

  @IsOptional()
  @IsEnum(ProjectVisibility)
  visibility?: ProjectVisibility;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'El objetivo del producto no puede exceder 500 caracteres' })
  productObjective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La definición de done no puede exceder 1000 caracteres' })
  definitionOfDone?: string;

  @IsInt({ message: 'La duración del sprint debe ser un número entero' })
  @Min(1, { message: 'La duración del sprint debe ser al menos 1 semana' })
  @Max(4, { message: 'La duración del sprint no puede exceder 4 semanas' })
  sprintDuration: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  qualityCriteria?: number;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsDateString({}, { message: 'La fecha de inicio debe ser válida' })
  startDate: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser válida' })
  endDate?: string;
}



