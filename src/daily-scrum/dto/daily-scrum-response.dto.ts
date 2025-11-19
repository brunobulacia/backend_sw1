export class DailyScrumResponseDto {
  id: string;
  sprintId: string;
  userId: string;
  date: string;
  whatDidYesterday: string;
  whatWillDoToday: string;
  impediments?: string;
  createdAt: Date;
  updatedAt: Date;

  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  linkedStories: {
    id: string;
    code: string;
    title: string;
    status: string;
  }[];

  sprint?: {
    id: string;
    number: number;
    name: string;
    status: string;
  };
}

export class DailyConsolidatedDto {
  date: string;
  sprintId: string;
  sprintName: string;
  sprintNumber: number;
  entries: DailyScrumResponseDto[];
  impediments: {
    userId: string;
    userName: string;
    impediment: string;
  }[];
}

