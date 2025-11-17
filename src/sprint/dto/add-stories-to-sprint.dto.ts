import { IsArray, IsUUID } from 'class-validator';

export class AddStoriesToSprintDto {
  @IsArray()
  @IsUUID('4', { each: true })
  storyIds: string[];
}
