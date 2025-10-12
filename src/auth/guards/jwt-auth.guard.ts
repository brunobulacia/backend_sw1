import {
  Injectable,
  ExecutionContext,
  CanActivate,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: { isAdmin?: boolean } }>();
    if (req.user?.isAdmin) return true;
    throw new ForbiddenException('Admin only');
  }
}
