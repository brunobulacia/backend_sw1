import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  private sanitize(user: User): SafeUser {
    const { password: _password, ...safe } = user;
    void _password;
    return safe;
  }

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    try {
      const hashed = await bcrypt.hash(createUserDto.password, 10);
      const normalizedEmail = createUserDto.email.trim().toLowerCase();
      const user = await this.prismaService.user.create({
        data: {
          ...createUserDto,
          email: normalizedEmail,
          password: hashed,
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

  async findAll(): Promise<SafeUser[]> {
    const users = await this.prismaService.user.findMany();
    return users.map((u) => this.sanitize(u));
  }

  async findOne(id: string): Promise<SafeUser> {
    const foundUser = await this.prismaService.user.findUnique({
      where: { id },
    });
    if (!foundUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.sanitize(foundUser);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const current = await this.prismaService.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`User with id ${id} not found`);

    // si viene nueva password, hashearla
    const data = { ...updateUserDto } as Prisma.UserUpdateInput;
    if (updateUserDto.email) {
      data.email = updateUserDto.email.trim().toLowerCase();
    }
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
      data.failedAttempts = 0;
      data.lockedUntil = null;
      data.passwordChangedAt = new Date();
      data.tokenVersion = { increment: 1 };
    }

    if (updateUserDto.isActive === true) {
      data.failedAttempts = 0;
      data.lockedUntil = null;
    }

    // proteger "último admin": no permitir quitar admin o desactivar al único admin activo
    const willRemoveAdmin = updateUserDto.isAdmin === false;
    const willDeactivate = updateUserDto.isActive === false;
    if (current.isAdmin && (willRemoveAdmin || willDeactivate)) {
      const otherAdmins = await this.prismaService.user.count({
        where: { id: { not: id }, isAdmin: true, isActive: true },
      });
      if (otherAdmins === 0) {
        throw new ForbiddenException(
          'El sistema debe conservar al menos un administrador',
        );
      }
    }

    try {
      const updatedUser = await this.prismaService.user.update({
        where: { id },
        data,
      });
      return this.sanitize(updatedUser);
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

  async remove(id: string): Promise<SafeUser> {
    const current = await this.prismaService.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`User with id ${id} not found`);

    // no borrar al último admin
    if (current.isAdmin) {
      const otherAdmins = await this.prismaService.user.count({
        where: { id: { not: id }, isAdmin: true, isActive: true },
      });
      if (otherAdmins === 0) {
        throw new ForbiddenException(
          'No se puede eliminar al último administrador',
        );
      }
    }

    const deletedUser = await this.prismaService.user.delete({ where: { id } });
    return this.sanitize(deletedUser);
  }
}




