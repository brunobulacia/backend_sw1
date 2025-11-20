import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RefactorCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  instructions?: string;
}

export class RefactorCodeResponseDto {
  originalCode: string;
  refactoredCode: string;
  suggestions: string;
  language?: string;
}
