import { IsDateString, IsOptional } from 'class-validator';

export class CreateSnapshotDto {
  @IsDateString()
  @IsOptional()
  date?: string;
}