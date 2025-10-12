import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  // Política mínima HU1 (≥ 8). La fuerza completa se valida en creación/cambio.
  @IsString()
  @MinLength(8)
  password!: string;
}
