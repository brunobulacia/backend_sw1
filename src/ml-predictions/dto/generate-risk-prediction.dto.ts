import { IsUUID, IsNotEmpty } from 'class-validator';

export class GenerateRiskPredictionDto {
  @IsUUID()
  @IsNotEmpty()
  sprintId: string;
}

