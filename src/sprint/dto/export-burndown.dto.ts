import { IsEnum, IsOptional } from 'class-validator';

export enum ExportFormat {
  PNG = 'png',
  PDF = 'pdf',
  SVG = 'svg',
}

export class ExportBurndownDto {
  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat = ExportFormat.PNG;

  @IsOptional()
  width?: number = 1200; // ancho de la imagen en pixeles

  @IsOptional()
  height?: number = 600; // alto de la imagen en pixeles
}