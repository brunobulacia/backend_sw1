import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InviteProjectMemberDto } from './dto/invite-project-member.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

interface AuthRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @Request() req: AuthRequest) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }
    return this.projectsService.create(createProjectDto, req.user.id);
  }

  @Get()
  findAll(@Request() req: AuthRequest) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }
    return this.projectsService.findAll(req.user.id, req.user.isAdmin ?? false);
  }

  @Get('my-projects')
  findMyProjects(@Request() req: AuthRequest) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }
    return this.projectsService.findUserProjects(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }
    return this.projectsService.findOne(id, req.user.id, req.user.isAdmin ?? false);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: AuthRequest,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }
    return this.projectsService.update(
      id,
      updateProjectDto,
      req.user.id,
      req.user.isAdmin ?? false,
    );
  }

  @Post(':id/invite')
  inviteMember(
    @Param('id') id: string,
    @Body() inviteDto: InviteProjectMemberDto,
    @Request() req: AuthRequest,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }
    return this.projectsService.inviteMember(
      id,
      inviteDto,
      req.user.id,
      req.user.isAdmin ?? false,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }
    return this.projectsService.remove(id, req.user.id, req.user.isAdmin ?? false);
  }
}



