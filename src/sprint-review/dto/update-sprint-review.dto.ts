import { PartialType } from '@nestjs/mapped-types';
import { CreateSprintReviewDto } from './create-sprint-review.dto';

export class UpdateSprintReviewDto extends PartialType(CreateSprintReviewDto) {}

