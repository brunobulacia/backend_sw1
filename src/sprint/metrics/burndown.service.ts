import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsCalculatorService } from './metrics-calculator.service';
import { BurndownChartResponseDto } from '../dto/burndown-response.dto';

@Injectable()
export class BurndownService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly metricsCalculator: MetricsCalculatorService,
    ) {}

    //grafica  burndown    
    async getBurndownChart(sprintId: string): Promise<BurndownChartResponseDto> {
        const sprint = await this.prisma.sprint.findUnique({
            where: { id: sprintId },
            include: {
                stories: {
                    include: {
                        tasks: true,
                    },
                },
            },
        });

        if (!sprint) {
            throw new NotFoundException('Sprint no encontrado');
        }

        const snapshots = await this.prisma.burndownSnapshot.findMany({
            where: { sprintId },
            orderBy: { date: 'asc' },
        });

        if (sprint.status === 'IN_PROGRESS') {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // normalizar a medianoche

            const hasSnapshotToday = snapshots.some((snapshot) => {
                const snapshotDate = new Date(snapshot.date);
                snapshotDate.setHours(0, 0, 0, 0);
                return snapshotDate.getTime() === today.getTime();
            });

            if (!hasSnapshotToday) {
                const newSnapshot = await this.createSnapshot(sprintId);
                snapshots.push(newSnapshot);
            }
        }

        const metrics = await this.metricsCalculator.calculateSprintMetrics(sprintId);
        const chartData = this.generateChartData(sprint, snapshots, metrics);

        return {
            sprintInfo: {
                id: sprint.id,
                name: sprint.name,
                number: sprint.number,
                goal: sprint.goal,
                startDate: sprint.startDate,
                endDate: sprint.endDate,
                duration: sprint.duration,
                status: sprint.status,
            },
            chartData,
            dailySnapshots: snapshots.map((snapshot) => ({
                date: snapshot.date,
                effortRemaining: snapshot.effortRemaining,
                effortCompleted: snapshot.effortCompleted,
                effortCommitted: snapshot.effortCommitted,
                storiesCompleted: snapshot.storiesCompleted,
                storiesTotal: snapshot.storiesTotal,
                tasksCompleted: snapshot.tasksCompleted,
                tasksTotal: snapshot.tasksTotal,
            })),
            summary: {
                effortCommitted: metrics.effort.committed,
                effortCompleted: metrics.effort.completed,
                effortRemaining: metrics.effort.remaining,
                percentageComplete: metrics.effort.percentage,
                isOnTrack: metrics.onTrack,
                daysRemaining: metrics.timeline.daysRemaining,
                velocityNeeded: metrics.velocity.needed,
            },
        };
    }

    private generateChartData(sprint: any, snapshots: any[], metrics: any) {
        const startDate = new Date(sprint.startDate);
        const endDate = new Date(sprint.endDate);
    
    
        const totalDays = Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        const now = new Date();
        const daysElapsed = Math.max(
            0,
            Math.min(
                totalDays,
                Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
            ),
        );

        const dates: Date[] = [];
        for (let i = 0; i <= totalDays; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            dates.push(date);
        }

        const effortCommitted = metrics.effort.committed;
        const idealLine = this.metricsCalculator.generateIdealLine(
            effortCommitted,
            totalDays,
        );

        const actualLine = this.generateActualLineWithDates(
            dates,
            snapshots,
            effortCommitted,
            metrics.effort.remaining,
        );

        return {
            dates,
            idealLine,
            actualLine,
            effortCommitted,
            totalDays,
            daysElapsed,
        };
    }

    private generateActualLineWithDates(
            dates: Date[],
            snapshots: any[],
            initialEffort: number,
            currentRemaining: number,
        ): number[] {
        const actualLine: number[] = [];
        let lastKnownValue = initialEffort;

        for (const date of dates) {
            const dateNormalized = new Date(date);
            dateNormalized.setHours(0, 0, 0, 0);

            const snapshot = snapshots.find((s) => {
                const snapshotDate = new Date(s.date);
                snapshotDate.setHours(0, 0, 0, 0);
                return snapshotDate.getTime() === dateNormalized.getTime();
            });

            if (snapshot) {
                lastKnownValue = snapshot.effortRemaining;
                actualLine.push(lastKnownValue);
            } else {
                actualLine.push(lastKnownValue);
            }
        }

        if (actualLine.length > 0) {
            actualLine[actualLine.length - 1] = currentRemaining;
        }
        return actualLine;
    }

    async createSnapshot(sprintId: string, date?: Date) {
        const snapshotDate = date ? new Date(date) : new Date();
        snapshotDate.setHours(0, 0, 0, 0);
        const sprint = await this.prisma.sprint.findUnique({
            where: { id: sprintId },
            include: {
                stories: {
                    include: {
                        tasks: true,
                    },
                },
            },
        });

        if (!sprint) {
            throw new NotFoundException('Sprint no encontrado');
        }
        const metrics = await this.metricsCalculator.calculateSprintMetrics(sprintId);

        const existingSnapshot = await this.prisma.burndownSnapshot.findUnique({
            where: {
                sprintId_date: {
                    sprintId,
                    date: snapshotDate,
                },
            },
        });

        if (existingSnapshot) {
            return this.prisma.burndownSnapshot.update({
                where: { id: existingSnapshot.id },
                data: {
                    effortRemaining: metrics.effort.remaining,
                    effortCompleted: metrics.effort.completed,
                    effortCommitted: metrics.effort.committed,
                    storiesCompleted: metrics.stories.done,
                    storiesTotal: metrics.stories.total,
                    tasksCompleted: metrics.tasks.done,
                    tasksTotal: metrics.tasks.total,
                },
            });
        }
        return this.prisma.burndownSnapshot.create({
            data: {
                sprintId,
                date: snapshotDate,
                effortRemaining: metrics.effort.remaining,
                effortCompleted: metrics.effort.completed,
                effortCommitted: metrics.effort.committed,
                storiesCompleted: metrics.stories.done,
                storiesTotal: metrics.stories.total,
                tasksCompleted: metrics.tasks.done,
                tasksTotal: metrics.tasks.total,
            },
        });
    }

    async createDailySnapshotsForActiveSprints(): Promise<number> {
        const activeSprints = await this.prisma.sprint.findMany({
            where: { status: 'IN_PROGRESS' },
            select: { id: true },
        });

        let snapshotsCreated = 0;

    
        for (const sprint of activeSprints) {
            try {
                await this.createSnapshot(sprint.id);
                snapshotsCreated++;
            } catch (error) {
                console.error(
                    `Error creando snapshot para sprint ${sprint.id}:`,
                    error,
                );
            }
        }
        return snapshotsCreated;
    }

    async updateSnapshotOnChange(sprintId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await this.createSnapshot(sprintId, today);
    }

    async getSnapshotHistory(sprintId: string) {
        return this.prisma.burndownSnapshot.findMany({
            where: { sprintId },
            orderBy: { date: 'asc' },
        });
    }
}