export class BurndownChartResponseDto {
    sprintInfo: {
        id: string;
        name: string;
        number: number;
        goal: string;
        startDate: Date;
        endDate: Date;
        duration: number; //en semanas
        status: string;
    };
    //grafiqueta
    chartData: {
        dates: Date[];
        idealLine: number[];
        actualLine: number[];
        effortCommitted: number;
        totalDays: number;
        daysElapsed: number;
    };
    //snapshots diarios del sprint (un historico diario digamos)
    dailySnapshots: Array<{
        date: Date;
        effortRemaining: number;
        effortCompleted: number;
        effortCommitted: number;
        storiesCompleted: number;
        storiesTotal: number;
        tasksCompleted: number;
        tasksTotal: number;
    }>;
    //resumen del sprint
    summary: {
        effortCommitted: number;
        effortCompleted: number;
        effortRemaining: number;
        percentageComplete: number;
        isOnTrack: boolean;
        daysRemaining: number;
        velocityNeeded: number;
    };

}