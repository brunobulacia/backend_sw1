import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type JwtPayload = {
  sub: string;
  email: string;
  isAdmin?: boolean;
  type?: string;
  tokenVersion?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      // 👇 devolvemos lo que necesitamos en req.user
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        isActive: true,
        lockedUntil: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Invalid token');
    }

    // ❗ Política HU1: usuarios desactivados o bloqueados no pueden acceder
    if (!user.isActive) {
      throw new ForbiddenException('User is disabled');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account locked. Try later.');
    }

    // ✅ req.user tendrá { id, email, username, isAdmin, isActive, lockedUntil }
    return user;
  }
}



