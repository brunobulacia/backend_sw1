import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRefactoringDto } from './dto/create-refactoring.dto';
import { UpdateRefactoringDto } from './dto/update-refactoring.dto';

@Injectable()
export class CodeRefactoringService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verificar acceso al repositorio
   */
  async verifyRepositoryAccess(repositoryId: string, userId: string) {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      include: {
        project: {
          include: {
            members: { where: { isActive: true } },
          },
        },
      },
    });

    if (!repository) {
      throw new NotFoundException('Repositorio no encontrado');
    }

    const isOwner = repository.project.ownerId === userId;
    const member = repository.project.members.find((m) => m.userId === userId);
    const isMember = !!member;

    if (!isOwner && !isMember && repository.project.visibility === 'PRIVATE') {
      throw new ForbiddenException('No tienes acceso a este repositorio');
    }

    return { repository, isOwner, isMember, userRole: member?.role };
  }

  /**
   * IMPORTAR sugerencias desde herramienta externa (SonarQube, ESLint, etc.)
   * Este es el método principal según HU14
   */
  async importRefactoringSuggestions(
    repositoryId: string,
    suggestions: CreateRefactoringDto[],
    sprintId: string | undefined,
    userId: string,
  ) {
    await this.verifyRepositoryAccess(repositoryId, userId);

    const importedSuggestions: any[] = [];

    for (const suggestionDto of suggestions) {
      // Verificar si ya existe sugerencia similar para el mismo archivo y línea
      const existing = await this.prisma.codeRefactoringSuggestion.findFirst({
        where: {
          repositoryId,
          filePath: suggestionDto.filePath,
          lineNumber: suggestionDto.lineNumber || null,
          description: suggestionDto.description,
          status: 'PENDING',
        },
      });

      if (!existing) {
        const suggestion = await this.prisma.codeRefactoringSuggestion.create({
          data: {
            repositoryId,
            ...suggestionDto,
            sprintId: sprintId || suggestionDto.sprintId,
          },
          include: {
            repository: {
              select: {
                id: true,
                name: true,
                url: true,
              },
            },
          },
        });
        importedSuggestions.push(suggestion);
      }
    }

    return {
      message: `${importedSuggestions.length} sugerencias importadas exitosamente`,
      imported: importedSuggestions.length,
      total: suggestions.length,
      duplicates: suggestions.length - importedSuggestions.length,
      suggestions: importedSuggestions,
    };
  }

  /**
   * Crear sugerencia individual (para uso manual excepcional)
   */
  async createRefactoringSuggestion(
    repositoryId: string,
    createDto: CreateRefactoringDto,
    userId: string,
  ) {
    await this.verifyRepositoryAccess(repositoryId, userId);

    const suggestion = await this.prisma.codeRefactoringSuggestion.create({
      data: {
        repositoryId,
        ...createDto,
      },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
        sprint: {
          select: {
            id: true,
            number: true,
            name: true,
          },
        },
      },
    });

    return suggestion;
  }

  /**
   * Obtener sugerencias de refactoring de un repositorio
   */
  async getRepositorySuggestions(repositoryId: string, userId: string) {
    await this.verifyRepositoryAccess(repositoryId, userId);

    return this.prisma.codeRefactoringSuggestion.findMany({
      where: { repositoryId },
      include: {
        resolvedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        sprint: {
          select: {
            id: true,
            number: true,
            name: true,
          },
        },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Actualizar estado de sugerencia
   * HU14: Solo DEVELOPERS pueden cambiar el estado; PO y SM solo consultan
   */
  async updateRefactoringSuggestion(
    suggestionId: string,
    updateDto: UpdateRefactoringDto,
    userId: string,
  ) {
    const suggestion = await this.prisma.codeRefactoringSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        repository: {
          include: {
            project: {
              include: {
                members: { where: { isActive: true } },
              },
            },
          },
        },
      },
    });

    if (!suggestion) {
      throw new NotFoundException('Sugerencia de refactoring no encontrada');
    }

    const { repository, userRole, isOwner } = await this.verifyRepositoryAccess(
      suggestion.repositoryId,
      userId,
    );

    // CRÍTICO HU14: Solo DEVELOPERS pueden cambiar el estado
    if (userRole !== 'DEVELOPER' && !isOwner) {
      throw new ForbiddenException(
        'Solo los Developers pueden cambiar el estado de las sugerencias de refactoring',
      );
    }

    const updateData: any = { ...updateDto };
    if (updateDto.status === 'RESOLVED') {
      updateData.resolvedById = userId;
      updateData.resolvedAt = new Date();
    }

    const updated = await this.prisma.codeRefactoringSuggestion.update({
      where: { id: suggestionId },
      data: updateData,
      include: {
        resolvedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Obtener sugerencias pendientes de un sprint
   */
  async getSprintPendingSuggestions(sprintId: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          include: {
            members: { where: { isActive: true } },
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    // Verificar acceso
    const isOwner = sprint.project.ownerId === userId;
    const isMember = sprint.project.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember && sprint.project.visibility === 'PRIVATE') {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    return this.prisma.codeRefactoringSuggestion.findMany({
      where: {
        sprintId,
        status: 'PENDING',
      },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * RESUMEN POR SPRINT: número total de sugerencias y cuántas se resolvieron
   * Requerido por HU14
   */
  async getSprintRefactoringSummary(sprintId: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          include: {
            members: { where: { isActive: true } },
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    // Verificar acceso
    const isOwner = sprint.project.ownerId === userId;
    const isMember = sprint.project.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember && sprint.project.visibility === 'PRIVATE') {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    // Contar sugerencias por estado
    const total = await this.prisma.codeRefactoringSuggestion.count({
      where: { sprintId },
    });

    const resolved = await this.prisma.codeRefactoringSuggestion.count({
      where: { sprintId, status: 'RESOLVED' },
    });

    const pending = await this.prisma.codeRefactoringSuggestion.count({
      where: { sprintId, status: 'PENDING' },
    });

    const ignored = await this.prisma.codeRefactoringSuggestion.count({
      where: { sprintId, status: 'IGNORED' },
    });

    // Contar por severidad
    const bySeverity = {
      high: await this.prisma.codeRefactoringSuggestion.count({
        where: { sprintId, severity: 'HIGH' },
      }),
      medium: await this.prisma.codeRefactoringSuggestion.count({
        where: { sprintId, severity: 'MEDIUM' },
      }),
      low: await this.prisma.codeRefactoringSuggestion.count({
        where: { sprintId, severity: 'LOW' },
      }),
    };

    return {
      sprintId,
      total,
      resolved,
      pending,
      ignored,
      percentageResolved: total > 0 ? (resolved / total) * 100 : 0,
      bySeverity,
    };
  }
}

