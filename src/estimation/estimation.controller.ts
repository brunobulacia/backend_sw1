import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { EstimationService } from './estimation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitVoteDto } from './dto/submit-vote.dto';
import { RevealVotesDto } from './dto/reveal-votes.dto';
import { NewRoundDto } from './dto/new-round.dto';
import { FinalizeEstimationDto } from './dto/finalize-estimation.dto';

interface AuthRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
  };
}

/**
 *
 * Rutas:
 * - POST   /estimation/sessions                    Crear sesión
 * - GET    /estimation/sessions/:id                Ver detalles de sesión
 * - POST   /estimation/sessions/:id/vote           Enviar voto
 * - POST   /estimation/sessions/:id/reveal         Revelar votos (moderador)
 * - POST   /estimation/sessions/:id/new-round      Nueva ronda (moderador)
 * - POST   /estimation/sessions/:id/finalize       Finalizar (moderador)
 * - GET    /estimation/sessions/:id/history        Histórico de votos
 * - GET    /estimation/projects/:projectId         Listar sesiones del proyecto
 *
 * Todas las rutas requieren autenticación
 */


@Controller('estimation')
@UseGuards(JwtAuthGuard)
export class EstimationController {
  constructor(private readonly estimationService: EstimationService) {}

  private getUserId(req: AuthRequest): string {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }
    return req.user.id;
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.estimationService.createSession(createSessionDto, userId);
  }

  @Get('sessions/:id')
  async getSessionDetails(
    @Param('id') sessionId: string,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.estimationService.getSessionDetails(sessionId, userId);
  }

  @Post('sessions/:id/vote')
  @HttpCode(HttpStatus.CREATED)
  async submitVote(
    @Param('id') sessionId: string,
    @Body() submitVoteDto: SubmitVoteDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.estimationService.submitVote(sessionId, submitVoteDto, userId);
  }

  @Post('sessions/:id/reveal')
  @HttpCode(HttpStatus.OK)
  async revealVotes(
    @Param('id') sessionId: string,
    @Body() revealVotesDto: RevealVotesDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.estimationService.revealVotes(sessionId, revealVotesDto, userId);
  }

  @Post('sessions/:id/new-round')
  @HttpCode(HttpStatus.OK)
  async startNewRound(
    @Param('id') sessionId: string,
    @Body() newRoundDto: NewRoundDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.estimationService.startNewRound(sessionId, newRoundDto, userId);
  }

  @Post('sessions/:id/finalize')
  @HttpCode(HttpStatus.OK)
  async finalizeEstimation(
    @Param('id') sessionId: string,
    @Body() finalizeDto: FinalizeEstimationDto,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.estimationService.finalizeEstimation(sessionId, finalizeDto, userId);
  }

  @Get('sessions/:id/history')
  async getVotingHistory(
    @Param('id') sessionId: string,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.estimationService.getVotingHistory(sessionId, userId);
  }

  @Get('projects/:projectId')
  async listProjectSessions(
    @Param('projectId') projectId: string,
    @Request() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.estimationService.listProjectSessions(projectId, userId);
  }
}
