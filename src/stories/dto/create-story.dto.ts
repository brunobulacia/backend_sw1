import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { StoryStatus } from '@prisma/client';

export class CreateStoryDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(200)
  asA: string;

  @IsString()
  @MaxLength(200)
  iWant: string;

  @IsString()
  @MaxLength(200)
  soThat: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  acceptanceCriteria: string[];

  @IsInt()
  @Min(1)
  priority: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  businessValue?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimateHours?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus;
}
