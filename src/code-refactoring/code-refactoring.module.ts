import { Module } from '@nestjs/common';
import { CodeRefactoringController } from './code-refactoring.controller';
import { CodeRefactoringService } from './code-refactoring.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CodeRefactoringController],
  providers: [CodeRefactoringService],
  exports: [CodeRefactoringService],
})
export class CodeRefactoringModule {}

