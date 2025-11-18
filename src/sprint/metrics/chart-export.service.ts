import { Injectable } from '@nestjs/common';
import { BurndownChartResponseDto } from '../dto/burndown-response.dto';
import { ExportFormat } from '../dto/export-burndown.dto';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import PDFDocument from 'pdfkit';

@Injectable()
export class ChartExportService {
  /**
   * Exportar el gráfico burndown a imagen (PNG/PDF/SVG)
   */
  async exportBurndownChart(
    burndownData: BurndownChartResponseDto,
    format: ExportFormat = ExportFormat.PNG,
    width: number = 1200,
    height: number = 600,
  ): Promise<Buffer> {
    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      width,
      height,
      backgroundColour: 'white',
    });

    const configuration = this.buildChartConfiguration(burndownData);

    // Generar la imagen según el formato
    if (format === ExportFormat.PNG) {
      return await chartJSNodeCanvas.renderToBuffer(configuration);
    } else if (format === ExportFormat.PDF) {
      // Para PDF, primero generamos PNG y luego lo convertimos
      const pngBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
      return this.convertToPDF(pngBuffer, burndownData);
    } else if (format === ExportFormat.SVG) {
      // SVG requiere configuración especial
      return Buffer.from(
        await chartJSNodeCanvas.renderToBufferSync(configuration, 'image/svg+xml'),
      );
    }

    // Fallback por si el formato no coincide
    return await chartJSNodeCanvas.renderToBuffer(configuration);
  }

  /**
   * Construir la configuración de Chart.js para el burndown
   */
  private buildChartConfiguration(
    burndownData: BurndownChartResponseDto,
  ): any {
    const { chartData, sprintInfo, summary } = burndownData;

    // Formatear fechas para el eje X
    const labels = chartData.dates.map((date) => {
      const d = new Date(date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    return {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Línea Ideal',
            data: chartData.idealLine,
            borderColor: 'rgb(59, 130, 246)', // blue-500
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5], // línea punteada
            pointRadius: 0,
            tension: 0, // línea recta
          },
          {
            label: 'Línea Real',
            data: chartData.actualLine,
            borderColor: 'rgb(239, 68, 68)', // red-500
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: 'rgb(239, 68, 68)',
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            tension: 0.1, // suavizado leve
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Burndown Chart - ${sprintInfo.name}`,
            font: {
              size: 20,
              weight: 'bold',
            },
            padding: {
              top: 10,
              bottom: 30,
            },
          },
          subtitle: {
            display: true,
            text: `${sprintInfo.goal} | Progreso: ${summary.percentageComplete.toFixed(1)}% | ${summary.isOnTrack ? '✓ En tiempo' : '⚠ Retrasado'}`,
            font: {
              size: 14,
            },
            padding: {
              bottom: 20,
            },
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += context.parsed.y.toFixed(1) + ' horas';
                return label;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Días del Sprint',
              font: {
                size: 14,
                weight: 'bold',
              },
            },
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Esfuerzo Restante (horas)',
              font: {
                size: 14,
                weight: 'bold',
              },
            },
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)',
            },
            ticks: {
              callback: function (value) {
                return value + ' h';
              },
            },
          },
        },
      },
    };
  }

  /**
   * Convertir imagen PNG a PDF
   */
  private async convertToPDF(
    imageBuffer: Buffer,
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

      doc.moveDown(1);

      // Insertar la imagen del gráfico
      doc.image(imageBuffer, {
        fit: [700, 400],
        align: 'center',
      });

      doc.moveDown(1);

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
