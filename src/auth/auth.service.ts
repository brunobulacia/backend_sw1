import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { MailerService } from 'src/mailer/mailer.service';
import { createHash, randomBytes } from 'crypto';

type SafeUser = Omit<User, 'password'>;
const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MINUTES = 15;
const LOCK_DURATION_MS = LOCK_DURATION_MINUTES * 60 * 1000;
const RESET_TOKEN_TTL_MINUTES = 30;
const RESET_TOKEN_TTL_MS = RESET_TOKEN_TTL_MINUTES * 60 * 1000;
const RESET_REQUEST_LIMIT_MINUTES = 5;
const RESET_REQUEST_LIMIT_MS = RESET_REQUEST_LIMIT_MINUTES * 60 * 1000;
const RESET_REQUEST_LIMIT_COUNT = 3;

type PasswordResetRequestOptions = {
  requestedById?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  allowInactive?: boolean;
  raiseOnRateLimit?: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  // ---------- Helpers ----------
  private sanitize(user: User): SafeUser {
    const { password: _password, ...safe } = user;
    void _password;
    return safe;
  }

  private sign(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      tokenVersion: user.tokenVersion,
      type: 'access' as const,
    };
    return this.jwtService.sign(payload);
  }

  // ---------- Registro público (self-signup) ----------
  async register(
    dto: RegisterDto,
  ): Promise<{ user: SafeUser; access_token: string }> {
    const password = await bcrypt.hash(dto.password, 10);
    const normalizedEmail = dto.email.trim().toLowerCase();
    try {
      const user = await this.prismaService.user.create({
        data: {
          ...dto,
          email: normalizedEmail,
          password,
          isAdmin: false,
          isActive: true,
          passwordChangedAt: new Date(),
        },
      });
      return { user: this.sanitize(user), access_token: this.sign(user) };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email o username ya registrados');
      }
      throw e;
    }
  }

  async adminCreateUser(dto: CreateUserDto): Promise<SafeUser> {
    const password = await bcrypt.hash(dto.password, 10);
    const normalizedEmail = dto.email.trim().toLowerCase();
    try {
      const user = await this.prismaService.user.create({
        data: {
          ...dto,
          email: normalizedEmail,
          password,
          isAdmin: dto.isAdmin ?? false,
          isActive: dto.isActive ?? true,
          passwordChangedAt: new Date(),
        },
      });
      return this.sanitize(user);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email o username ya registrados');
      }
      throw e;
    }
  }

  // ---------- Login ----------
  async login(
    dto: LoginDto,
  ): Promise<{ access_token: string; user: SafeUser }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prismaService.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new ForbiddenException('User disabled');
    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      throw new ForbiddenException('Account locked. Try later.');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      const previousAttempts =
        user.lockedUntil && user.lockedUntil <= now
          ? 0
          : (user.failedAttempts ?? 0);
      const failedAttempts = previousAttempts + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          failedAttempts,
          lockedUntil: shouldLock
            ? new Date(now.getTime() + LOCK_DURATION_MS)
            : null,
        },
      });

      if (shouldLock) {
        throw new ForbiddenException(
          `Account locked for ${LOCK_DURATION_MINUTES} minutes after ${MAX_FAILED_ATTEMPTS} failed attempts. Try later.`,
        );
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLogin: now },
    });

    return {
      access_token: this.sign(updatedUser),
      user: this.sanitize(updatedUser),
    };
  }

  // ---------- Recuperacion de contrasena ----------
  async requestPasswordReset(
    dto: RequestPasswordResetDto,
    metadata?: { ip?: string | null; userAgent?: string | null },
  ): Promise<{ message: string; previewToken?: string; previewUrl?: string }> {
    const genericResponse = {
      message:
        'Si el correo existe en el sistema, se enviaron las instrucciones para recuperar la contrasena.',
    };

    const emailInput = dto.email.trim();
    if (!emailInput) {
      return genericResponse;
    }

    const normalizedEmail = emailInput.toLowerCase();
    const emailHash = this.hashEmail(normalizedEmail);
    const ip = metadata?.ip ?? null;
    const userAgent = metadata?.userAgent ?? null;

    const user = await this.prismaService.user.findUnique({
      where: { email: normalizedEmail },
    });

    const rateLimited = await this.isRateLimited({
      emailHash,
      ip,
      userId: user?.id ?? null,
      throwOnLimit: false,
    });

    await this.registerResetRequestLog({
      emailHash,
      userId: user?.id ?? null,
      ip,
      userAgent,
    });

    if (rateLimited || !user || !user.isActive) {
      return genericResponse;
    }

    const result = await this.issuePasswordResetToken(user, {
      ip,
      userAgent,
      allowInactive: false,
      raiseOnRateLimit: false,
    });

    if (!result) {
      return genericResponse;
    }

    if (process.env.NODE_ENV !== 'production') {
      return {
        ...genericResponse,
        previewToken: result.rawToken,
        previewUrl: result.resetUrl,
      };
    }

    return genericResponse;
  }

  async requestPasswordResetForUser(
    userId: string,
    options: {
      requestedById: string;
      ip?: string | null;
      userAgent?: string | null;
      allowInactive?: boolean;
    },
  ): Promise<{ message: string; previewToken?: string; previewUrl?: string }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    if (!user.isActive && !(options.allowInactive ?? false)) {
      throw new BadRequestException(
        'El usuario esta inactivo. Reactivalo antes de enviar un enlace.',
      );
    }

    const normalizedEmail = user.email.trim().toLowerCase();
    const emailHash = this.hashEmail(normalizedEmail);
    const ip = options.ip ?? null;
    const userAgent = options.userAgent ?? null;

    const rateLimited = await this.isRateLimited({
      emailHash,
      ip,
      userId: user.id,
      throwOnLimit: false,
    });

    await this.registerResetRequestLog({
      emailHash,
      userId: user.id,
      ip,
      userAgent,
    });

    if (rateLimited) {
      throw new HttpException(
        'Ya se envio recientemente un enlace de recuperacion. Intenta nuevamente en unos minutos.', HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const result = await this.issuePasswordResetToken(user, {
      requestedById: options.requestedById,
      ip,
      userAgent,
      allowInactive: options.allowInactive ?? false,
      raiseOnRateLimit: true,
    });

    if (!result) {
      throw new HttpException(
        'Ya se envio recientemente un enlace de recuperacion. Intenta nuevamente en unos minutos.', HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const payload: {
      message: string;
      previewToken?: string;
      previewUrl?: string;
    } = {
      message: 'Enlace de restablecimiento enviado al correo del usuario.',
    };

    if (process.env.NODE_ENV !== 'production') {
      payload.previewToken = result.rawToken;
      payload.previewUrl = result.resetUrl;
    }

    return payload;
  }

  async validatePasswordResetToken(
    token: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    if (!token) {
      return { valid: false, reason: 'Token requerido' };
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prismaService.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || !record.user || !record.user.isActive) {
      return { valid: false, reason: 'Token invalido o expirado' };
    }

    if (record.usedAt) {
      return { valid: false, reason: 'Token ya utilizado' };
    }

    if (record.expiresAt.getTime() < Date.now()) {
      return { valid: false, reason: 'Token expirado' };
    }

    return { valid: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const token = await this.prismaService.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !token ||
      token.usedAt ||
      !token.user ||
      !token.user.isActive ||
      token.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Token invalido o expirado');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);

    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { id: token.userId },
        data: {
          password: hashed,
          failedAttempts: 0,
          lockedUntil: null,
          passwordChangedAt: new Date(),
          tokenVersion: { increment: 1 },
        },
      }),
      this.prismaService.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prismaService.passwordResetToken.deleteMany({
        where: {
          userId: token.userId,
          usedAt: null,
          id: { not: token.id },
        },
      }),
    ]);

    return { message: 'Contrasena actualizada correctamente' };
  }

  private getAppBaseUrl(): string {
    const appUrlRaw =
      process.env.APP_BASE_URL ||
      process.env.FRONTEND_BASE_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(appUrlRaw);
    return hasProtocol ? appUrlRaw : `http://${appUrlRaw}`;
  }

  private async issuePasswordResetToken(
    user: User,
    options: PasswordResetRequestOptions = {},
  ): Promise<{ rawToken: string; resetUrl: string } | null> {
    if (!user.isActive && !options.allowInactive) {
      return null;
    }

    const since = new Date(Date.now() - RESET_REQUEST_LIMIT_MS);
    const existingToken = await this.prismaService.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: since },
        usedAt: null,
      },
    });

    if (existingToken) {
      if (options.raiseOnRateLimit) {
        throw new HttpException(
          'Ya se envio recientemente un enlace de recuperacion. Intenta nuevamente en unos minutos.', HttpStatus.TOO_MANY_REQUESTS
        );
      }
      return null;
    }

    const rawToken = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prismaService.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    await this.prismaService.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        requestedById: options.requestedById ?? null,
        requestedIp: options.ip ?? null,
        requestedUserAgent: options.userAgent ?? null,
      },
    });

    const resetUrl = new URL('/reset-password', this.getAppBaseUrl());
    resetUrl.searchParams.set('token', rawToken);

    await this.mailerService.sendPasswordResetEmail(
      user.email,
      resetUrl.toString(),
    );

    return { rawToken, resetUrl: resetUrl.toString() };
  }

  private hashEmail(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async registerResetRequestLog(params: {
    emailHash: string;
    userId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await this.prismaService.passwordResetRequest.create({
      data: {
        emailHash: params.emailHash,
        userId: params.userId ?? null,
        requestedIp: params.ip ?? null,
        requestedUserAgent: params.userAgent ?? null,
      },
    });
  }

  private async isRateLimited(params: {
    emailHash: string;
    ip?: string | null;
    userId?: string | null;
    throwOnLimit: boolean;
  }): Promise<boolean> {
    const since = new Date(Date.now() - RESET_REQUEST_LIMIT_MS);

    const [emailCount, ipCount, userCount] = await Promise.all([
      this.prismaService.passwordResetRequest.count({
        where: { emailHash: params.emailHash, createdAt: { gte: since } },
      }),
      params.ip
        ? this.prismaService.passwordResetRequest.count({
            where: { requestedIp: params.ip, createdAt: { gte: since } },
          })
        : Promise.resolve(0),
      params.userId
        ? this.prismaService.passwordResetRequest.count({
            where: { userId: params.userId, createdAt: { gte: since } },
          })
        : Promise.resolve(0),
    ]);

    const limited =
      emailCount >= RESET_REQUEST_LIMIT_COUNT ||
      (params.ip && ipCount >= RESET_REQUEST_LIMIT_COUNT) ||
      (params.userId && userCount >= RESET_REQUEST_LIMIT_COUNT);

    if (limited && params.throwOnLimit) {
      throw new HttpException(
        'Ya se envio recientemente un enlace de recuperacion. Intenta nuevamente en unos minutos.', HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return Boolean(limited);
  }

  // ---------- Perfil ----------
  async me(userId: string): Promise<SafeUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException();
    return this.sanitize(user);
  }
}






