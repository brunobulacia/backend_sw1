import { Injectable } from '@nestjs/common';
import { BurndownChartResponseDto } from '../dto/burndown-response.dto';
import { ExportFormat } from '../dto/export-burndown.dto';
import PDFDocument from 'pdfkit';

@Injectable()
export class ChartExportService {
  /**
   * Exportar el gráfico burndown a PDF con datos textuales
   * Nota: Se eliminó la generación de imágenes PNG/SVG para evitar dependencias nativas
   */
  async exportBurndownChart(
    burndownData: BurndownChartResponseDto,
    format: ExportFormat = ExportFormat.PNG,
    width: number = 1200,
    height: number = 600,
  ): Promise<Buffer> {
    // Solo exportamos a PDF con datos textuales
    if (format === ExportFormat.PDF) {
      return this.generateTextPDF(burndownData);
    }

    // Para PNG y SVG, devolvemos un PDF como fallback
    return this.generateTextPDF(burndownData);
  }

  /**
   * Generar PDF con datos textuales del burndown (sin gráfico visual)
   */
  private async generateTextPDF(
    burndownData: BurndownChartResponseDto,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Título
      doc.fontSize(20).text(`Burndown Chart - ${burndownData.sprintInfo.name}`, {
        align: 'center',
      });

      doc.moveDown(0.5);

      // Información del sprint
      doc.fontSize(12);
      doc.text(`Sprint ${burndownData.sprintInfo.number}`, { continued: true });
      doc.text(` | ${burndownData.sprintInfo.goal}`, { align: 'left' });
      doc.text(
        `Duración: ${new Date(burndownData.sprintInfo.startDate).toLocaleDateString()} - ${new Date(burndownData.sprintInfo.endDate).toLocaleDateString()}`,
      );

      doc.moveDown(2);

      // Resumen de métricas
      doc.fontSize(14).text('Resumen de Métricas:', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(11);
      doc.text(`• Esfuerzo Comprometido: ${burndownData.summary.effortCommitted} horas`);
      doc.text(`• Esfuerzo Completado: ${burndownData.summary.effortCompleted} horas`);
      doc.text(`• Esfuerzo Restante: ${burndownData.summary.effortRemaining} horas`);
      doc.text(
        `• Progreso: ${burndownData.summary.percentageComplete.toFixed(1)}%`,
      );
      doc.text(`• Días Restantes: ${burndownData.summary.daysRemaining}`);
      doc.text(
        `• Velocidad Necesaria: ${burndownData.summary.velocityNeeded.toFixed(2)} horas/día`,
      );
      doc.text(
        `• Estado: ${burndownData.summary.isOnTrack ? '✓ En tiempo' : '⚠ Retrasado'}`,
      );

      doc.moveDown(1.5);

      // Datos del gráfico
      doc.fontSize(14).text('Datos del Burndown:', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10);
      const { dates, idealLine, actualLine } = burndownData.chartData;
      
      for (let i = 0; i < dates.length; i++) {
        const date = new Date(dates[i]).toLocaleDateString();
        doc.text(`${date}: Ideal=${idealLine[i].toFixed(1)}h, Real=${actualLine[i]?.toFixed(1) || 'N/A'}h`);
      }

      // Footer
      doc.fontSize(9).text(
        `Generado el ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 30,
        { align: 'center' },
      );

      doc.end();
    });
  }
}
