import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from "class-validator";

export class FinalizeEstimationDto{
    @IsString()
    @IsNotEmpty()
    finalEstimation: string; //valor de la carta acordada

    @IsInt()
    @Min(1)
    @IsNotEmpty()
    estimateHours: number; //se convierte a horas para el planning

    @IsOptional()
    @IsString()
    notes?: string; //info opcional
}