import { PartialType } from '@nestjs/mapped-types';
import { CreateSprintRetrospectiveDto } from './create-sprint-retrospective.dto';

export class UpdateSprintRetrospectiveDto extends PartialType(CreateSprintRetrospectiveDto) {}

