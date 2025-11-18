import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MetricsCalculatorService {
    constructor(private readonly prisma: PrismaService) {}

    async calculateSprintMetrics(sprintId: string) {
        const sprint = await this.prisma.sprint.findUnique({
            where: {id: sprintId},
            include: {
                stories: {
                    include : {
                        tasks: true, //tareas de cada story
                    },
                },
            },
        });
        if (!sprint) {
            throw new Error('Sprint no encontrado');
        }

        const effortMetrics = this.calculateEffortMetrics(sprint);
        const storiesMetrics = this.countStoriesByStatus(sprint.stories);
        const tasksMetrics = this.countTasksByStatus(sprint.stories);
        const timelineMetrics = this.calculateTimelineMetrics(sprint.startDate, sprint.endDate);

        const velocityMetrics = this.calculateVelocity(
            effortMetrics,
            timelineMetrics,
        );
        const onTrack = this.isSprintOnTrack(effortMetrics, timelineMetrics);

        return {
            effort: effortMetrics,
            stories: storiesMetrics,
            tasks: tasksMetrics,
            timeline: timelineMetrics,
            velocity: velocityMetrics,
            onTrack,
        };
    }

    private calculateEffortMetrics(sprint: any){
        const stories = sprint.stories || [];
        
        // Esfuerzo comprometido: suma de todas las historias del sprint
        const committed = stories.reduce(
            (sum: number, story: any) => sum + (story.estimateHours || 0), 0
        );

        // Esfuerzo completado: suma del esfuerzo de TAREAS completadas
        const completed = stories.reduce((sum: number, story: any) => {
            const doneTasks = (story.tasks || [])
                .filter((task: any) => task.status === 'DONE');
            return sum + doneTasks.reduce((taskSum: number, task: any) => taskSum + (task.effort || 0), 0);
        }, 0);

        // Esfuerzo en progreso: suma del esfuerzo de TAREAS en progreso
        const inProgress = stories.reduce((sum: number, story: any) => {
            const inProgressTasks = (story.tasks || [])
                .filter((task: any) => task.status === 'IN_PROGRESS');
            return sum + inProgressTasks.reduce((taskSum: number, task: any) => taskSum + (task.effort || 0), 0);
        }, 0);

        const remaining = committed - completed;
        const percentage = committed > 0 ? (completed / committed) * 100 : 0;

        return {
            committed,
            completed,
            remaining,
            inProgress,
            percentage: Math.round(percentage * 100) / 100 //dos decimales
        };
    }

    private countStoriesByStatus(stories: any[]){
        const total = stories.length;
        const backlog = stories.filter((s) => s.status === 'BACKLOG').length;
        const selected = stories.filter((s) => s.status === 'SELECTED').length;
        const inProgress = stories.filter((s) => s.status === 'IN_PROGRESS').length;
        const testing = stories.filter((s) => s.status === 'TESTING').length;
        const done = stories.filter((s) => s.status === 'DONE').length;
        const cancelled = stories.filter((s) => s.status === 'CANCELLED').length;

        const percentage = total > 0 ? (done / total) * 100 : 0;
        return {
            total,
            backlog,
            selected,
            inProgress,
            testing,
            done,
            cancelled,
            percentage: Math.round(percentage * 100) / 100,
        };
    }

    private countTasksByStatus(stories: any[]) {
        const allTasks = stories.flatMap((story) => story.tasks || []);

        const total = allTasks.length;
        const todo = allTasks.filter((t) => t.status === 'TODO').length;
        const inProgress = allTasks.filter((t) => t.status === 'IN_PROGRESS').length;
        const testing = allTasks.filter((t) => t.status === 'TESTING').length;
        const done = allTasks.filter((t) => t.status === 'DONE').length;
        const cancelled = allTasks.filter((t) => t.status === 'CANCELLED').length;

        const percentage = total > 0 ? (done / total) * 100 : 0;

        return {
            total,
            todo,
            inProgress,
            testing,
            done,
            cancelled,
            percentage: Math.round(percentage * 100) / 100,
        };
    }

    private calculateTimelineMetrics(startDate: Date, endDate: Date) {
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);

        const totalDays = Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
        );

    
        const elapsedDays = Math.max(
            0,
            Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        );

        const remainingDays = Math.max(
            0,
            Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        );

        const percentageTimeElapsed = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;

        return {
            startDate: start,
            endDate: end,
            currentDate: now,
            daysTotal: totalDays,
            daysElapsed: elapsedDays,
            daysRemaining: remainingDays,
            percentageTimeElapsed: Math.round(percentageTimeElapsed * 100) / 100,
        };
    }

    private calculateVelocity(effortMetrics: any, timelineMetrics: any) {
        const { committed, completed, remaining } = effortMetrics;
        const { daysTotal, daysElapsed, daysRemaining } = timelineMetrics;

        const planned = daysTotal > 0 ? committed / daysTotal : 0;
        const actual = daysElapsed > 0 ? completed / daysElapsed : 0;
        const needed = daysRemaining > 0 ? remaining / daysRemaining : 0;

        let projection = 'ON_TIME';
        if (actual < planned * 0.8) {
            projection = 'DELAYED';
        } else if (actual < planned * 0.9) {
            projection = 'AT_RISK';
        }

        return {
            planned: Math.round(planned * 100) / 100,
            actual: Math.round(actual * 100) / 100,
            needed: Math.round(needed * 100) / 100,
            projection,
        };
    }

    private isSprintOnTrack(effortMetrics: any, timelineMetrics: any): boolean {
        const { percentage: effortPercentage } = effortMetrics;
        const { percentageTimeElapsed } = timelineMetrics;

        return effortPercentage >= percentageTimeElapsed * 0.9; // 90% de tolerancia
    }

    generateIdealLine(committed: number, totalDays: number): number[] {
        const idealLine: number[] = [];
        const decrementPerDay = committed / totalDays;

        for (let day = 0; day <= totalDays; day++) {
            const value = committed - decrementPerDay * day;
            idealLine.push(Math.max(0, Math.round(value * 100) / 100));
        }
        return idealLine;
    }
    generateActualLine(snapshots: any[]): number[] {
        return snapshots.map((snapshot) => snapshot.effortRemaining);
    }

}