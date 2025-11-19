import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ImprovementActionDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  responsible?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class CreateSprintRetrospectiveDto {
  @IsString()
  @IsNotEmpty()
  whatWentWell: string;

  @IsString()
  @IsNotEmpty()
  whatToImprove: string;

  @IsString()
  @IsNotEmpty()
  whatToStopDoing: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImprovementActionDto)
  @IsOptional()
  improvementActions?: ImprovementActionDto[];
}

