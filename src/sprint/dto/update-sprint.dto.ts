import { IsString, IsInt, IsDateString, Min, Max, IsOptional } from 'class-validator';

export class UpdateSprintDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  duration?: number;

  @IsOptional()
  @IsInt()
  capacity?: number;
}
