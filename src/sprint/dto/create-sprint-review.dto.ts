import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateSprintReviewDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  participants: string;

  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsString()
  @IsOptional()
  feedbackGeneral?: string;
}
