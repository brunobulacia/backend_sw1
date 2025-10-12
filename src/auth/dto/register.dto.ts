import { IsEmail, IsAlphanumeric, IsString } from 'class-validator';
import { IsStrongPassword } from 'class-validator';

export class RegisterDto {
  @IsEmail() email: string;
  @IsAlphanumeric() username: string;

  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  })
  password: string;

  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsString() timezone: string;
}
