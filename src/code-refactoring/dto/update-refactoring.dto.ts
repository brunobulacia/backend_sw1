import { IsEnum, IsOptional } from 'class-validator';
import { RefactoringStatus } from '@prisma/client';

export class UpdateRefactoringDto {
  @IsEnum(RefactoringStatus)
  @IsOptional()
  status?: RefactoringStatus;
}

