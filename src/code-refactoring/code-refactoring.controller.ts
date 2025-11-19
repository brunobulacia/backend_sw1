import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CodeRefactoringService } from './code-refactoring.service';
import { CreateRefactoringDto } from './dto/create-refactoring.dto';
import { UpdateRefactoringDto } from './dto/update-refactoring.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class CodeRefactoringController {
  constructor(
    private readonly codeRefactoringService: CodeRefactoringService,
  ) {}

  /**
   * POST /api/repositories/:repositoryId/refactoring/import
   * IMPORTAR archivo JSON con sugerencias (HU14 - Método principal)
   */
  @Post('repositories/:repositoryId/refactoring/import')
  async importRefactoringSuggestions(
    @Param('repositoryId') repositoryId: string,
    @Body() importDto: any, // Acepta formato flexible de herramientas externas
    @Req() req: any,
  ) {
    const { suggestions, sprintId } = importDto;
    return this.codeRefactoringService.importRefactoringSuggestions(
      repositoryId,
      suggestions,
      sprintId,
      req.user.userId,
    );
  }

  /**
   * POST /api/repositories/:repositoryId/refactoring
   * Crear sugerencia individual (manual excepcional)
   */
  @Post('repositories/:repositoryId/refactoring')
  async createRefactoringSuggestion(
    @Param('repositoryId') repositoryId: string,
    @Body() createDto: CreateRefactoringDto,
    @Req() req: any,
  ) {
    return this.codeRefactoringService.createRefactoringSuggestion(
      repositoryId,
      createDto,
      req.user.userId,
    );
  }

  /**
   * GET /api/repositories/:repositoryId/refactoring
   */
  @Get('repositories/:repositoryId/refactoring')
  async getRepositorySuggestions(
    @Param('repositoryId') repositoryId: string,
    @Req() req: any,
  ) {
    return this.codeRefactoringService.getRepositorySuggestions(
      repositoryId,
      req.user.userId,
    );
  }

  /**
   * PATCH /api/refactoring/:id
   */
  @Patch('refactoring/:id')
  async updateRefactoringSuggestion(
    @Param('id') id: string,
    @Body() updateDto: UpdateRefactoringDto,
    @Req() req: any,
  ) {
    return this.codeRefactoringService.updateRefactoringSuggestion(
      id,
      updateDto,
      req.user.userId,
    );
  }

  /**
   * GET /api/sprints/:sprintId/refactoring/pending
   */
  @Get('sprints/:sprintId/refactoring/pending')
  async getSprintPendingSuggestions(
    @Param('sprintId') sprintId: string,
    @Req() req: any,
  ) {
    return this.codeRefactoringService.getSprintPendingSuggestions(
      sprintId,
      req.user.userId,
    );
  }

  /**
   * GET /api/sprints/:sprintId/refactoring/summary
   * RESUMEN POR SPRINT requerido por HU14
   */
  @Get('sprints/:sprintId/refactoring/summary')
  async getSprintRefactoringSummary(
    @Param('sprintId') sprintId: string,
    @Req() req: any,
  ) {
    return this.codeRefactoringService.getSprintRefactoringSummary(
      sprintId,
      req.user.userId,
    );
  }
}

