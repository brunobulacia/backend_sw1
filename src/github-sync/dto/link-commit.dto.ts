import { IsUUID, IsOptional } from 'class-validator';

export class LinkCommitDto {
  @IsUUID()
  @IsOptional()
  storyId?: string;

  @IsUUID()
  @IsOptional()
  taskId?: string;
}

