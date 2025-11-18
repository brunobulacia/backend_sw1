export class SprintMetricsResponseDto {
    sprintId: string;
    sprintName: string;
    sprintNumber: number;
    sprintGoal: string;

    effort: {
        commited: number;
        completed: number;
        remaining: number;
        inProgress: number;
        percentage: number;
    };

    stories: {
        total: number;
        backlog: number;
        selected: number;
        inProgress: number;
        testing: number;
        done: number;
        cancelled: number;
        percentage: number;
    };

    tasks: {
        total: number;
        todo: number;
        inProgress: number;
        testing: number;
        done: number;
        cancelled: number;
        percentage: number;
    };

    sprintGoalProcess: {
        percentage: number;
        onTrack: number;
        message: string;
    };
    
    timeline: {
        startDate: Date;
        endDate: Date;
        currentDate: Date;
        daysTotal: number;
        daysElapsed: number;
        daysRemaining: number;
        percentageTimeElapsed: number;
    };
    //para proyecciones
    velocity : {
        planned: number;
        actual: number;
        needed: number;
        projection: string;
    }
}