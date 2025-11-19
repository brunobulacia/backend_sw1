import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateSprintReviewDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  participants: string; // Lista de participantes separados por comas

  @IsString()
  @IsNotEmpty()
  summary: string; // Resumen de lo completado

  @IsString()
  @IsOptional()
  feedbackGeneral?: string; // Feedback del Product Owner/Stakeholders
}

