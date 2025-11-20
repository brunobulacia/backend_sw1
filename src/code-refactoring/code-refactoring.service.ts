import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRefactoringDto } from './dto/create-refactoring.dto';
import { UpdateRefactoringDto } from './dto/update-refactoring.dto';
import { RefactorCodeDto, RefactorCodeResponseDto } from './dto/refactor-code.dto';

@Injectable()
export class CodeRefactoringService {
  constructor(private prisma: PrismaService) {}

  /**
   * Refactorizar código usando Claude API
   */
  async refactorCodeWithClaude(
    dto: RefactorCodeDto,
  ): Promise<RefactorCodeResponseDto> {
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      throw new BadRequestException('CLAUDE_API_KEY no configurada en el servidor');
    }

    const systemPrompt = `Eres un experto en refactorización de código. Tu tarea es analizar el código proporcionado y sugerir mejoras siguiendo las mejores prácticas de desarrollo.

IMPORTANTE: Debes responder ÚNICAMENTE con un objeto JSON válido, sin bloques de código markdown y sin explicaciones adicionales.

La estructura JSON debe ser exactamente:
{
  "refactoredCode": "código refactorizado aquí como string",
  "suggestions": "lista de sugerencias y mejoras aplicadas en formato markdown"
}

Considera:
- Mejores prácticas de clean code
- Optimizaciones de rendimiento
- Patrones de diseño aplicables
- Legibilidad y mantenibilidad
- Eliminación de código duplicado
- Nomenclatura consistente
- Manejo de errores apropiado
${dto.language ? `\n- El código está en ${dto.language}` : ''}
${dto.instructions ? `\n- Instrucciones adicionales: ${dto.instructions}` : ''}

CRÍTICO:
1. Mantén la funcionalidad original del código. Solo mejora la estructura, legibilidad y eficiencia.
2. El código refactorizado debe estar dentro del campo "refactoredCode" como un string (usa saltos de línea con \\n).
3. NO uses bloques de código markdown en tu respuesta.
4. Responde SOLO con el objeto JSON, nada más.`;

    const userPrompt = `Aquí está el código a refactorizar:\n\n${dto.code}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Claude API error:', errorData);
        throw new BadRequestException(
          `Error de Claude API: ${errorData.error?.message || 'Error desconocido'}`,
        );
      }

      const data = await response.json();
      const contentText = data.content[0].text;

      // Intentar parsear la respuesta JSON
      let parsedResponse;
      try {
        // Limpiar la respuesta removiendo bloques de código markdown
        let cleanedText = contentText;

        // Remover bloques de código markdown del JSON
        cleanedText = cleanedText.replace(/```[\w]*\n/g, '');
        cleanedText = cleanedText.replace(/```/g, '');

        // Buscar JSON en la respuesta limpia
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          // Si no hay JSON, intentar extraer código y sugerencias manualmente
          parsedResponse = {
            refactoredCode: contentText,
            suggestions: 'Ver el código refactorizado para los cambios aplicados.',
          };
        }
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError);
        console.error('Raw response:', contentText);

        // Intentar extraer el código de bloques markdown como fallback
        const codeBlockMatch = contentText.match(/```[\w]*\n([\s\S]*?)```/);
        parsedResponse = {
          refactoredCode: codeBlockMatch ? codeBlockMatch[1].trim() : contentText,
          suggestions: 'Ver el código refactorizado para los cambios aplicados.',
        };
      }

      return {
        originalCode: dto.code,
        refactoredCode: parsedResponse.refactoredCode || contentText,
        suggestions: parsedResponse.suggestions || 'Código refactorizado exitosamente.',
        language: dto.language,
      };
    } catch (error) {
      console.error('Error calling Claude API:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Error al comunicarse con Claude API. Intenta nuevamente.',
      );
    }
  }

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

