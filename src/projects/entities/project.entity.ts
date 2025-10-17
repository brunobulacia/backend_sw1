import { Project } from '@prisma/client';

export class ProjectEntity implements Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  productObjective: string | null;
  definitionOfDone: string | null;
  sprintDuration: number;
  qualityCriteria: number | null;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  ownerId: string;
}



