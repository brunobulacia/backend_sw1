import { IsString } from 'class-validator';
import { IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  })
  newPassword!: string;
}
