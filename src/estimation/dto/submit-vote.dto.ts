import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from "class-validator";


export class SubmitVoteDto{
    @IsString()
    @IsNotEmpty()
    voteValue: string; //valor del voto

    @IsInt()
    @Min(1)
    @IsNotEmpty()
    roundNumber: number; //numero de ronda

    @IsOptional()
    @IsString()
    justification?: string; //por si se quiere justificar el voto
}