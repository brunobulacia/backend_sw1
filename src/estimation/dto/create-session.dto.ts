import { IsString, IsNotEmpty, IsUUID, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import {Type} from 'class-transformer';
import {EstimationMethod} from '@prisma/client'

export class CreateSessionDto {
    @IsUUID()
    @IsNotEmpty()
    projectId: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsUUID()
    @IsString()
    storyId: string;
    
    @IsEnum(EstimationMethod)
    @IsNotEmpty()
    method: EstimationMethod; //fibo, tshirt etc
    
    //por si se quiere una secuencia personalizada
    @IsOptional()
    @IsArray()
    @IsString({each: true})
    customSequence?: string[];
}