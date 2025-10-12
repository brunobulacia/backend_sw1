import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthService } from 'src/auth/auth.service';

@UseGuards(AdminGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post(':id/send-reset-link')
  async sendResetLink(
    @Param('id') id: string,
    @Request()
    req: ExpressRequest & { user?: { id: string } },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }

    return this.authService.requestPasswordResetForUser(id, {
      requestedById: req.user.id,
      ip: this.extractClientIp(req),
      userAgent: req.headers['user-agent'] ?? null,
      allowInactive: false,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  private extractClientIp(req: ExpressRequest): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]?.trim() ?? null;
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0];
    }
    return req.ip ?? null;
  }
}
