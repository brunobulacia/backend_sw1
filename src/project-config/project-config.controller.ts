import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectConfigService } from './project-config.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { BatchCreateConfigDto } from './dto/batch-create-config.dto';

@Controller('projects/:projectId/configs')
@UseGuards(JwtAuthGuard)
export class ProjectConfigController {
  constructor(private readonly configService: ProjectConfigService) {}

  @Get()
  async getProjectConfigs(@Param('projectId') projectId: string, @Request() req: any) {
    return this.configService.getProjectConfigs(projectId, req.user.id);
  }

  @Get('category/:category')
  async getConfigsByCategory(
    @Param('projectId') projectId: string,
    @Param('category') category: string,
    @Request() req: any,
  ) {
    return this.configService.getConfigsByCategory(projectId, category, req.user.id);
  }

  @Post()
  async createConfig(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateConfigDto,
    @Request() req: any,
  ) {
    return this.configService.createConfig(projectId, createDto, req.user.id);
  }

  @Post('batch')
  async batchCreateConfigs(
    @Param('projectId') projectId: string,
    @Body() batchDto: BatchCreateConfigDto,
    @Request() req: any,
  ) {
    return this.configService.batchCreateConfigs(projectId, batchDto.configs, req.user.id);
  }

  @Post('initialize-sprint0')
  async initializeSprint0(@Param('projectId') projectId: string, @Request() req: any) {
    return this.configService.initializeSprint0(projectId, req.user.id);
  }

  @Patch(':configId')
  async updateConfig(
    @Param('projectId') projectId: string,
    @Param('configId') configId: string,
    @Body() updateDto: UpdateConfigDto,
    @Request() req: any,
  ) {
    return this.configService.updateConfig(projectId, configId, updateDto, req.user.id);
  }

  @Delete(':configId')
  async deleteConfig(
    @Param('projectId') projectId: string,
    @Param('configId') configId: string,
    @Request() req: any,
  ) {
    return this.configService.deleteConfig(projectId, configId, req.user.id);
  }
}
