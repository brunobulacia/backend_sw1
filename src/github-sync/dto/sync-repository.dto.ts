import { IsString, IsOptional, IsDateString } from 'class-validator';

export class SyncRepositoryDto {
  @IsDateString()
  @IsOptional()
  since?: string; // Fecha desde la cual sincronizar

  @IsString()
  @IsOptional()
  branch?: string; // Rama específica (default: mainBranch del repo)
}

