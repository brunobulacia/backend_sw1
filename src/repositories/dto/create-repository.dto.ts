import { IsString, IsNotEmpty, IsOptional, Matches, IsBoolean } from 'class-validator';

export class CreateRepositoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/, {
    message: 'La URL debe tener el formato https://github.com/owner/repo',
  })
  url: string;

  @IsString()
  @IsOptional()
  mainBranch?: string; // default: "main"

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean; // default: false
}

