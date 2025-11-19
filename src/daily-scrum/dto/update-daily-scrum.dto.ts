import { PartialType } from '@nestjs/mapped-types';
import { CreateDailyScrumDto } from './create-daily-scrum.dto';
import { IsOptional, IsString, IsArray, IsUUID } from 'class-validator';

export class UpdateDailyScrumDto extends PartialType(CreateDailyScrumDto) {
  @IsString()
  @IsOptional()
  whatDidYesterday?: string;

  @IsString()
  @IsOptional()
  whatWillDoToday?: string;

  @IsString()
  @IsOptional()
  impediments?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  storyIds?: string[];
}

