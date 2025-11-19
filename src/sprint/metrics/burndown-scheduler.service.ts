import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BurndownService } from './burndown.service';

@Injectable()
export class BurndownSchedulerService {
    private readonly logger = new Logger(BurndownSchedulerService.name);

    constructor(private readonly burndownService: BurndownService) {}

    /**
     * Tarea programada: Crear snapshots diarios
     * 
     * Se ejecuta todos los días a las 23:55 (11:55 PM)
     * 
     * Cron expression: '55 23 * * *'
     * - Minuto: 55
     * - Hora: 23 (11 PM)
     * - Día del mes: * (todos)
     * - Mes: * (todos)
     * - Día de la semana: * (todos)
     */
    @Cron('55 23 * * *', {
        name: 'create-daily-snapshots',
        timeZone: 'America/La_Paz',
    })
    async handleDailySnapshotCreation() {
        this.logger.log('Iniciando creación de snapshots diarios...');

        try {
            const snapshotsCreated =
                await this.burndownService.createDailySnapshotsForActiveSprints();

        this.logger.log(
            `Snapshots diarios creados exitosamente: ${snapshotsCreated} sprints procesados`,
        );
        } catch (error) {
            this.logger.error('Error al crear snapshots diarios:', error);
        }
    }

  /**
   * Tarea programada adicional: Limpiar snapshots antiguos (opcional)
   * 
   * Se ejecuta el primer día de cada mes a las 02:00 AM
   * Elimina snapshots de sprints completados hace más de 6 meses
   */
    @Cron('0 2 1 * *', {
        name: 'cleanup-old-snapshots',
        timeZone: 'America/La_Paz',
    })
    async handleOldSnapshotsCleanup() {
        this.logger.log('Iniciando limpieza de snapshots antiguos...');

        try {
        // Calcular fecha hace 6 meses
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            // Aquí podrías implementar lógica para eliminar snapshots antiguos
            // Por ahora solo registramos
            this.logger.log('Limpieza de snapshots completada (no implementada aún)');
        } catch (error) {
            this.logger.error('Error al limpiar snapshots antiguos:', error);
        }
    }
}