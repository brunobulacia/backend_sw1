import { Module } from '@nestjs/common';
import { EstimationController } from './estimation.controller';
import { EstimationService } from './estimation.service';
import { PrismaModule } from '../prisma/prisma.module';


@Module({
    imports: [PrismaModule],
    controllers: [EstimationController],
    providers: [EstimationService],
    exports: [EstimationService] //porsi
})
export class EstimationModule{}