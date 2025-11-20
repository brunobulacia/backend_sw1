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
import { Request } from 'express';
import { MLPredictionsService } from './ml-predictions.service';
import { GenerateAssignmentSuggestionDto } from './dto/generate-assignment-suggestion.dto';
import { GenerateRiskPredictionDto } from './dto/generate-risk-prediction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    id: string;
    // otros campos del payload JWT si los tienes
  };
}

@Controller('ml')
@UseGuards(JwtAuthGuard)
export class MLPredictionsController {
  constructor(private readonly mlPredictionsService: MLPredictionsService) {}

  /**
   * POST /api/ml/assignment-suggestion
   *
   * Genera una sugerencia de asignación de desarrollador para una historia/tarea,
   * llamando al modelo de ML (assignment_model.joblib) a través del servicio.
   *
   * - Usa features construidas desde la BD (historia, tarea, métricas PSP).
   * - NO asigna automáticamente: solo devuelve la sugerencia + probabilidad.
   */
  @Post('assignment-suggestion')
  async generateAssignmentSuggestion(
    @Body() generateDto: GenerateAssignmentSuggestionDto,
    @Req() req: AuthRequest,
  ) {
    const lol = await this.mlPredictionsService.generateAssignmentSuggestion(
      generateDto.storyId,
      generateDto.taskId,
      req.user.id,
    );
    console.log("Ejecutano Endpoint", lol, generateDto.storyId, generateDto.taskId, req.user.id)
    return lol
  }

  /**
   * POST /api/ml/risk-prediction
   *
   * Genera una predicción de riesgo para un sprint,
   * llamando al modelo de riesgo (risk_model.joblib).
   *
   * - Solo PO / SM verán este riesgo en el front (regla de la HU15).
   * - Calcula features a nivel de sprint (esfuerzo comprometido, capacidad,
   *   velocidad histórica, historias pendientes, etc.).
   */
  @Post('risk-prediction')
  async generateRiskPrediction(
    @Body() generateDto: GenerateRiskPredictionDto,
    @Req() req: AuthRequest,
  ) {
    return this.mlPredictionsService.generateRiskPrediction(
      generateDto.sprintId,
      req.user.id,
    );
  }

  /**
   * GET /api/ml/stories/:storyId/suggestions
   *
   * Devuelve el histórico de sugerencias ML de una historia.
   * Sirve para:
   * - Auditar qué sugirió el modelo.
   * - Ver quién aceptó/ignoró cada sugerencia (para alimentar MLTrainingData).
   */
  @Get('stories/:storyId/suggestions')
  async getStorySuggestions(
    @Param('storyId') storyId: string,
    @Req() req: AuthRequest,
  ) {
    return this.mlPredictionsService.getStorySuggestions(
      storyId,
      req.user.id,
    );
  }

  /**
   * GET /api/ml/sprints/:sprintId/risk-predictions
   *
   * Devuelve las últimas predicciones de riesgo para un sprint.
   * Útil para mostrar en dashboards de SM / PO y comparar cómo
   * fue evolucionando el riesgo a lo largo del tiempo.
   */
  @Get('sprints/:sprintId/risk-predictions')
  async getSprintRiskPredictions(
    @Param('sprintId') sprintId: string,
    @Req() req: AuthRequest,
  ) {
    return this.mlPredictionsService.getSprintRiskPredictions(
      sprintId,
      req.user.id,
    );
  }

  /**
   * PATCH /api/ml/suggestions/:id/accept
   *
   * Marca una sugerencia de ML como "aceptada" por el usuario actual.
   * IMPORTANTE para:
   * - Cumplir HU15 (confirmación humana).
   * - Guardar feedback explícito para re-entrenar el modelo.
   */
  @Patch('suggestions/:id/accept')
  async acceptSuggestion(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return this.mlPredictionsService.acceptSuggestion(id, req.user.id);
  }
}
