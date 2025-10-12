import { IsString } from 'class-validator';
import { IsStrongPassword } from 'class-validator';

export class ResetPasswordDto {
  // Token del enlace de recuperación (puede ser JWT o string propio)
  @IsString()
  token!: string;

  // HU1: ≥ 8, con mayúscula, minúscula y número (sin símbolo obligatorio)
  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  })
  newPassword!: string;
}
