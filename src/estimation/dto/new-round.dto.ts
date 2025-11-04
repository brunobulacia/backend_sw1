import { IsInt, Min, IsNotEmpty, IsOptional, IsString } from "class-validator"; 

export class NewRoundDto{
    @IsInt()
    @Min(2) //desde la dos, ya que se asume que se crea la primera
    @IsNotEmpty()
    newRoundNumber: number;

    @IsOptional()
    @IsString()
    reason?: string; //justificacion de la nueva ronda
}