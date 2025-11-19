import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyScrumDto } from './dto/create-daily-scrum.dto';
import { UpdateDailyScrumDto } from './dto/update-daily-scrum.dto';
import { DailyScrumResponseDto, DailyConsolidatedDto } from './dto/daily-scrum-response.dto';

@Injectable()
export class DailyScrumService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verificar acceso del usuario al sprint
   */
  async verifySprintAccess(sprintId: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          include: {
            members: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint no encontrado');
    }

    const isOwner = sprint.project.ownerId === userId;
    const member = sprint.project.members.find((m) => m.userId === userId);
    const isMember = !!member;

    if (!isOwner && !isMember && sprint.project.visibility === 'PRIVATE') {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    return { sprint, isOwner, isMember, userRole: member?.role };
  }

  /**
   * Crear o actualizar un Daily Scrum
   * Si ya existe uno para ese día y usuario, lo actualiza
   */
  async createOrUpdateDailyScrum(
    createDto: CreateDailyScrumDto,
    userId: string,
  ): Promise<DailyScrumResponseDto> {
    const { sprintId, date, storyIds, ...dailyData } = createDto;

    // Verificar acceso al sprint
    const { sprint, userRole } = await this.verifySprintAccess(sprintId, userId);

    // Solo miembros del equipo pueden registrar dailies
    if (!userRole && sprint.project.ownerId !== userId) {
      throw new ForbiddenException(
        'Solo los miembros del equipo pueden registrar daily scrums',
      );
    }

    // Verificar que la fecha esté dentro del rango del sprint
    const dailyDate = new Date(date);
    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);

    if (dailyDate < sprintStart || dailyDate > sprintEnd) {
      throw new BadRequestException(
        'La fecha debe estar dentro del rango del sprint',
      );
    }

    // Verificar si ya existe un daily para este día
    const existingDaily = await this.prisma.dailyScrum.findUnique({
      where: {
        sprintId_userId_date: {
          sprintId,
          userId,
          date: dailyDate,
        },
      },
    });

    // Solo se puede editar el daily del día actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dailyDate.setHours(0, 0, 0, 0);

    if (existingDaily && dailyDate.getTime() !== today.getTime()) {
      throw new BadRequestException(
        'Solo puedes editar el daily scrum del día actual',
      );
    }

    // Crear o actualizar el daily
    const dailyScrum = existingDaily
      ? await this.prisma.dailyScrum.update({
          where: { id: existingDaily.id },
          data: dailyData,
        })
      : await this.prisma.dailyScrum.create({
          data: {
            ...dailyData,
            sprintId,
            userId,
            date: dailyDate,
          },
        });

    // Si se proporcionaron IDs de historias, vincularlas
    if (storyIds && storyIds.length > 0) {
      // Verificar que las historias existan y pertenezcan al sprint
      const stories = await this.prisma.userStory.findMany({
        where: {
          id: { in: storyIds },
          sprintId,
        },
      });

      if (stories.length !== storyIds.length) {
        throw new BadRequestException(
          'Algunas historias no fueron encontradas o no pertenecen al sprint',
        );
      }

      // Eliminar vínculos anteriores
      await this.prisma.dailyScrumStory.deleteMany({
        where: { dailyScrumId: dailyScrum.id },
      });

      // Crear nuevos vínculos
      await this.prisma.dailyScrumStory.createMany({
        data: storyIds.map((storyId) => ({
          dailyScrumId: dailyScrum.id,
          storyId,
        })),
      });
    }

    return this.getDailyScrumById(dailyScrum.id, userId);
  }

  /**
   * Obtener un daily scrum por ID
   */
  async getDailyScrumById(
    dailyId: string,
    userId: string,
  ): Promise<DailyScrumResponseDto> {
    const daily = await this.prisma.dailyScrum.findUnique({
      where: { id: dailyId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        linkedStories: {
          include: {
            story: {
              select: {
                id: true,
                code: true,
                title: true,
                status: true,
              },
            },
          },
        },
        sprint: {
          select: {
            id: true,
            number: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!daily) {
      throw new NotFoundException('Daily scrum no encontrado');
    }

    // Verificar acceso
    await this.verifySprintAccess(daily.sprintId, userId);

    return {
      id: daily.id,
      sprintId: daily.sprintId,
      userId: daily.userId,
      date: daily.date.toISOString().split('T')[0],
      whatDidYesterday: daily.whatDidYesterday,
      whatWillDoToday: daily.whatWillDoToday,
      impediments: daily.impediments || undefined,
      createdAt: daily.createdAt,
      updatedAt: daily.updatedAt,
      user: daily.user,
      linkedStories: daily.linkedStories.map((link) => link.story),
      sprint: daily.sprint,
    };
  }

  /**
   * Actualizar un daily scrum (solo si es del día actual)
   */
  async updateDailyScrum(
    dailyId: string,
    updateDto: UpdateDailyScrumDto,
    userId: string,
  ): Promise<DailyScrumResponseDto> {
    const daily = await this.prisma.dailyScrum.findUnique({
      where: { id: dailyId },
    });

    if (!daily) {
      throw new NotFoundException('Daily scrum no encontrado');
    }

    // Verificar que el usuario sea el dueño del daily
    if (daily.userId !== userId) {
      throw new ForbiddenException('Solo puedes editar tus propios daily scrums');
    }

    // Verificar que sea del día actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyDate = new Date(daily.date);
    dailyDate.setHours(0, 0, 0, 0);

    if (dailyDate.getTime() !== today.getTime()) {
      throw new BadRequestException('Solo puedes editar el daily scrum del día actual');
    }

    const { storyIds, ...updateData } = updateDto;

    // Actualizar el daily
    await this.prisma.dailyScrum.update({
      where: { id: dailyId },
      data: updateData,
    });

    // Si se proporcionaron IDs de historias, actualizar vínculos
    if (storyIds !== undefined) {
      if (storyIds.length > 0) {
        // Verificar que las historias existan y pertenezcan al sprint
        const stories = await this.prisma.userStory.findMany({
          where: {
            id: { in: storyIds },
            sprintId: daily.sprintId,
          },
        });

        if (stories.length !== storyIds.length) {
          throw new BadRequestException(
            'Algunas historias no fueron encontradas o no pertenecen al sprint',
          );
        }

        // Eliminar vínculos anteriores
        await this.prisma.dailyScrumStory.deleteMany({
          where: { dailyScrumId: daily.id },
        });

        // Crear nuevos vínculos
        await this.prisma.dailyScrumStory.createMany({
          data: storyIds.map((storyId) => ({
            dailyScrumId: daily.id,
            storyId,
          })),
        });
      } else {
        // Si se pasa un array vacío, eliminar todos los vínculos
        await this.prisma.dailyScrumStory.deleteMany({
          where: { dailyScrumId: daily.id },
        });
      }
    }

    return this.getDailyScrumById(dailyId, userId);
  }

  /**
   * Obtener dailies de un sprint (con filtros opcionales)
   */
  async getSprintDailies(
    sprintId: string,
    userId: string,
    filters?: {
      date?: string;
      memberId?: string;
    },
  ): Promise<DailyScrumResponseDto[]> {
    await this.verifySprintAccess(sprintId, userId);

    const where: any = { sprintId };

    if (filters?.date) {
      where.date = new Date(filters.date);
    }

    if (filters?.memberId) {
      where.userId = filters.memberId;
    }

    const dailies = await this.prisma.dailyScrum.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        linkedStories: {
          include: {
            story: {
              select: {
                id: true,
                code: true,
                title: true,
                status: true,
              },
            },
          },
        },
        sprint: {
          select: {
            id: true,
            number: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return dailies.map((daily) => ({
      id: daily.id,
      sprintId: daily.sprintId,
      userId: daily.userId,
      date: daily.date.toISOString().split('T')[0],
      whatDidYesterday: daily.whatDidYesterday,
      whatWillDoToday: daily.whatWillDoToday,
      impediments: daily.impediments || undefined,
      createdAt: daily.createdAt,
      updatedAt: daily.updatedAt,
      user: daily.user,
      linkedStories: daily.linkedStories.map((link) => link.story),
      sprint: daily.sprint,
    }));
  }

  /**
   * Vista consolidada para el Scrum Master
   * Todas las respuestas del día para el sprint
   */
  async getConsolidatedDaily(
    sprintId: string,
    date: string,
    userId: string,
  ): Promise<DailyConsolidatedDto> {
    const { sprint } = await this.verifySprintAccess(sprintId, userId);

    const dailyDate = new Date(date);

    const dailies = await this.getSprintDailies(sprintId, userId, { date });

    // Extraer impedimentos
    const impediments = dailies
      .filter((d) => d.impediments)
      .map((d) => ({
        userId: d.userId,
        userName: `${d.user.firstName} ${d.user.lastName}`,
        impediment: d.impediments!,
      }));

    return {
      date,
      sprintId: sprint.id,
      sprintName: sprint.name,
      sprintNumber: sprint.number,
      entries: dailies,
      impediments,
    };
  }

  /**
   * Obtener historial de dailies (agrupado por fecha)
   */
  async getDailyHistory(
    sprintId: string,
    userId: string,
  ): Promise<DailyConsolidatedDto[]> {
    await this.verifySprintAccess(sprintId, userId);

    const dailies = await this.getSprintDailies(sprintId, userId);

    // Agrupar por fecha
    const grouped = dailies.reduce((acc, daily) => {
      const dateKey = daily.date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(daily);
      return acc;
    }, {} as Record<string, DailyScrumResponseDto[]>);

    // Convertir a array de DailyConsolidatedDto
    return Object.entries(grouped).map(([date, entries]) => {
      const impediments = entries
        .filter((e) => e.impediments)
        .map((e) => ({
          userId: e.userId,
          userName: `${e.user.firstName} ${e.user.lastName}`,
          impediment: e.impediments!,
        }));

      return {
        date,
        sprintId: entries[0].sprintId,
        sprintName: entries[0].sprint?.name || '',
        sprintNumber: entries[0].sprint?.number || 0,
        entries,
        impediments,
      };
    });
  }
}

