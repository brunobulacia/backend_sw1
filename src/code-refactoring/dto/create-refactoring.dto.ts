import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsUUID } from 'class-validator';
import { RefactoringSeverity } from '@prisma/client';

export class CreateRefactoringDto {
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(RefactoringSeverity)
  @IsNotEmpty()
  severity: RefactoringSeverity;

  @IsString()
  @IsOptional()
  tool?: string;

  @IsInt()
  @IsOptional()
  lineNumber?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsUUID()
  @IsOptional()
  sprintId?: string;
}

