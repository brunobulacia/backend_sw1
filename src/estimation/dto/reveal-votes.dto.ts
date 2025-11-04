import {IsInt, Min, IsNotEmpty } from 'class-validator';

export class RevealVotesDto{
    @IsInt()
    @Min(1)
    @IsNotEmpty()
    roundNumber: number; //numero de la ronda
}