import { IsArray, ValidateNested, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRefactoringDto } from './create-refactoring.dto';

/**
 * DTO para importar archivo JSON con sugerencias de refactoring
 * Formato compatible con SonarQube, ESLint, etc.
 */
export class ImportRefactoringDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRefactoringDto)
  suggestions: CreateRefactoringDto[];

  @IsUUID()
  @IsOptional()
  sprintId?: string;
}

/**
 * Formato esperado del JSON:
 * {
 *   "suggestions": [
 *     {
 *       "filePath": "src/services/user.service.ts",
 *       "description": "Método muy largo (50+ líneas)",
 *       "severity": "MEDIUM",
 *       "lineNumber": 123,
 *       "category": "complexity",
 *       "tool": "SonarQube"
 *     }
 *   ]
 * }
 */

