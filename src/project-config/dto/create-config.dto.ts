import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateConfigDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsString()
  type: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isSystemSetting?: boolean;
}
