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
import { MLPredictionsService } from './ml-predictions.service';
import { GenerateAssignmentSuggestionDto } from './dto/generate-assignment-suggestion.dto';
import { GenerateRiskPredictionDto } from './dto/generate-risk-prediction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ml')
@UseGuards(JwtAuthGuard)
export class MLPredictionsController {
  constructor(
    private readonly mlPredictionsService: MLPredictionsService,
  ) {}

  /**
   * POST /api/ml/assignment-suggestion
   * Generar sugerencia de asignación
   */
  @Post('assignment-suggestion')
  async generateAssignmentSuggestion(
    @Body() generateDto: GenerateAssignmentSuggestionDto,
    @Req() req: any,
  ) {
    return this.mlPredictionsService.generateAssignmentSuggestion(
      generateDto.storyId,
      generateDto.taskId,
      req.user.userId,
    );
  }

  /**
   * POST /api/ml/risk-prediction
   * Generar predicción de riesgo de sprint
   */
  @Post('risk-prediction')
  async generateRiskPrediction(
    @Body() generateDto: GenerateRiskPredictionDto,
    @Req() req: any,
  ) {
    return this.mlPredictionsService.generateRiskPrediction(
      generateDto.sprintId,
      req.user.userId,
    );
  }

  /**
   * GET /api/ml/stories/:storyId/suggestions
   * Obtener sugerencias de asignación de una historia
   */
  @Get('stories/:storyId/suggestions')
  async getStorySuggestions(
    @Param('storyId') storyId: string,
    @Req() req: any,
  ) {
    return this.mlPredictionsService.getStorySuggestions(
      storyId,
      req.user.userId,
    );
  }

  /**
   * GET /api/ml/sprints/:sprintId/risk-predictions
   * Obtener predicciones de riesgo de un sprint
   */
  @Get('sprints/:sprintId/risk-predictions')
  async getSprintRiskPredictions(
    @Param('sprintId') sprintId: string,
    @Req() req: any,
  ) {
    return this.mlPredictionsService.getSprintRiskPredictions(
      sprintId,
      req.user.userId,
    );
  }

  /**
   * PATCH /api/ml/suggestions/:id/accept
   * Aceptar sugerencia de asignación
   */
  @Patch('suggestions/:id/accept')
  async acceptSuggestion(@Param('id') id: string, @Req() req: any) {
    return this.mlPredictionsService.acceptSuggestion(id, req.user.userId);
  }
}

