import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ImprovementActionStatus } from '@prisma/client';

export class UpdateImprovementActionDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  responsible?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(ImprovementActionStatus)
  @IsOptional()
  status?: ImprovementActionStatus;
}

