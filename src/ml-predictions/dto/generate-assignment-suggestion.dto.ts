import { IsUUID, IsNotEmpty } from 'class-validator';

export class GenerateAssignmentSuggestionDto {
  @IsUUID()
  @IsNotEmpty()
  storyId: string;

  @IsUUID()
  @IsNotEmpty()
  taskId?: string;
}

