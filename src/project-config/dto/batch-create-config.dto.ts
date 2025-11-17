import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateConfigDto } from './create-config.dto';

export class BatchCreateConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConfigDto)
  configs: CreateConfigDto[];
}
