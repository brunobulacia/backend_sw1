import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { UpdateRepositoryDto } from './dto/update-repository.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('projects/:projectId/repositories')
@UseGuards(JwtAuthGuard)
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  /**
   * POST /api/projects/:projectId/repositories
   * Crear un repositorio
   */
  @Post()
  async createRepository(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateRepositoryDto,
    @Req() req: any,
  ) {
    return this.repositoriesService.createRepository(
      projectId,
      createDto,
      req.user.userId,
    );
  }

  /**
   * GET /api/projects/:projectId/repositories
   * Obtener todos los repositorios del proyecto
   */
  @Get()
  async getProjectRepositories(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    return this.repositoriesService.getProjectRepositories(
      projectId,
      req.user.userId,
    );
  }

  /**
   * GET /api/projects/:projectId/repositories/:id
   * Obtener un repositorio por ID
   */
  @Get(':id')
  async getRepositoryById(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.repositoriesService.getRepositoryById(
      projectId,
      id,
      req.user.userId,
    );
  }

  /**
   * PUT /api/projects/:projectId/repositories/:id
   * Actualizar un repositorio
   */
  @Put(':id')
  async updateRepository(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateRepositoryDto,
    @Req() req: any,
  ) {
    return this.repositoriesService.updateRepository(
      projectId,
      id,
      updateDto,
      req.user.userId,
    );
  }

  /**
   * DELETE /api/projects/:projectId/repositories/:id
   * Eliminar un repositorio
   */
  @Delete(':id')
  async deleteRepository(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.repositoriesService.deleteRepository(
      projectId,
      id,
      req.user.userId,
    );
  }

  /**
   * PATCH /api/projects/:projectId/repositories/:id/set-primary
   * Marcar un repositorio como principal
   */
  @Patch(':id/set-primary')
  async setPrimaryRepository(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.repositoriesService.setPrimaryRepository(
      projectId,
      id,
      req.user.userId,
    );
  }
}

