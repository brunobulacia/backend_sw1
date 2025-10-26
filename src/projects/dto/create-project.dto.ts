import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus, ProjectVisibility } from '@prisma/client';
import { ProjectTeamMemberDto } from './project-team-member.dto';

export class CreateProjectDto {
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @IsString()
  @MinLength(10, { message: 'La descripcion debe tener al menos 10 caracteres' })
  @MaxLength(500, {
    message: 'La descripcion no puede exceder 500 caracteres',
  })
  description: string;

  @IsOptional()
  @IsEnum(ProjectVisibility)
  visibility?: ProjectVisibility;

  @IsString()
  @MinLength(10, {
    message: 'El objetivo del producto debe tener al menos 10 caracteres',
  })
  @MaxLength(500, {
    message: 'El objetivo del producto no puede exceder 500 caracteres',
  })
  productObjective: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'La definicion de done no puede exceder 1000 caracteres',
  })
  definitionOfDone?: string;

  @IsOptional()
  @IsInt({ message: 'La duracion del sprint debe ser un numero entero' })
  @Min(1, { message: 'La duracion del sprint debe ser al menos 1 semana' })
  @Max(4, { message: 'La duracion del sprint no puede exceder 4 semanas' })
  sprintDuration?: number;

  @IsString()
  @MinLength(5, { message: 'Los criterios de calidad deben ser mas descriptivos' })
  @MaxLength(500, {
    message: 'Los criterios de calidad no pueden exceder 500 caracteres',
  })
  qualityCriteria: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsDateString({}, { message: 'La fecha de inicio debe ser valida' })
  startDate: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser valida' })
  endDate?: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Debe registrar al menos un miembro del equipo' })
  @ValidateNested({ each: true })
  @Type(() => ProjectTeamMemberDto)
  teamMembers: ProjectTeamMemberDto[];
}
