import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AdminGuard } from './guards/jwt-auth.guard';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  async userProfile(
    @Request() req: ExpressRequest & { user?: { id: string } },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException();
    }
    return this.authService.me(req.user.id);
  }

  @Public()
  @Post('request-password-reset')
  requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.requestPasswordReset(dto, {
      ip: this.extractClientIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Get('reset-password/validate')
  validateResetToken(@Query('token') token: string | undefined) {
    return this.authService.validatePasswordResetToken(token ?? '');
  }

  @Public()
  @Post('github')
  githubAuth(@Body() dto: { accessToken: string }) {
    return this.authService.githubAuth(dto.accessToken);
  }

  @UseGuards(AdminGuard)
  @Post('admin/create-user')
  createUserAsAdmin(@Body() dto: CreateUserDto) {
    return this.authService.adminCreateUser(dto);
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
