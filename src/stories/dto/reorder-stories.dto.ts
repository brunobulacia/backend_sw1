import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderStoriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  storyIds: string[];
}
