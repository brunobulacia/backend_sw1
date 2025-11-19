import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SprintReviewService } from './sprint-review.service';
import { CreateSprintReviewDto } from './dto/create-sprint-review.dto';
import { UpdateSprintReviewDto } from './dto/update-sprint-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sprints/:sprintId/review')
@UseGuards(JwtAuthGuard)
export class SprintReviewController {
  constructor(private readonly sprintReviewService: SprintReviewService) {}

  /**
   * POST /api/sprints/:sprintId/review
   * Crear Sprint Review
   */
  @Post()
  async createSprintReview(
    @Param('sprintId') sprintId: string,
    @Body() createDto: CreateSprintReviewDto,
    @Req() req: any,
  ) {
    return this.sprintReviewService.createSprintReview(
      sprintId,
      createDto,
      req.user.userId,
    );
  }

  /**
   * GET /api/sprints/:sprintId/review
   * Obtener Sprint Review
   */
  @Get()
  async getSprintReview(
    @Param('sprintId') sprintId: string,
    @Req() req: any,
  ) {
    return this.sprintReviewService.getSprintReview(sprintId, req.user.userId);
  }

  /**
   * PUT /api/sprints/:sprintId/review
   * Actualizar Sprint Review
   */
  @Put()
  async updateSprintReview(
    @Param('sprintId') sprintId: string,
    @Body() updateDto: UpdateSprintReviewDto,
    @Req() req: any,
  ) {
    return this.sprintReviewService.updateSprintReview(
      sprintId,
      updateDto,
      req.user.userId,
    );
  }
}

