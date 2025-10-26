import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StoryStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { ReorderStoriesDto } from './dto/reorder-stories.dto';

type StoryWithTags = Prisma.UserStoryGetPayload<{
  include: { tags: true };
}>;

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeStory(story: StoryWithTags) {
    const acceptance =
      story.acceptanceCriteria
        ?.split('\n')
        .map((item) => item.trim())
        .filter((item) => item.length > 0) ?? [];

    return {
      id: story.id,
      projectId: story.projectId,
      code: story.code,
      title: story.title,
      asA: story.asA,
      iWant: story.iWant,
      soThat: story.soThat,
      acceptanceCriteria: acceptance,
      description: story.description,
      priority: story.priority,
      businessValue: story.businessValue,
      orderRank: story.orderRank,
      estimateHours: story.estimateHours,
      status: story.status,
      tags: story.tags.map((tag) => tag.value),
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
    };
  }

  private normalizeAcceptance(criteria: string[]) {
    return criteria
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .join('\n');
  }

  private normalizeTags(tags?: string[]) {
    if (!tags || tags.length === 0) {
      return [];
    }
    const unique = new Set<string>();
    tags.forEach((tag) => {
      const trimmed = tag.trim();
      if (trimmed.length > 0 && trimmed.length <= 40) {
        unique.add(trimmed);
      }
    });
    return Array.from(unique);
  }

  private async ensureProjectOwner(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the Product Owner can perform this action',
      );
    }
  }

  private async ensureProjectMember(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, isActive: true } } },
        ],
      },
      select: { id: true },
    });
    if (!project) {
      throw new ForbiddenException('Access denied to this project');
    }
  }

  private async generateCode(
    tx: Prisma.TransactionClient,
    projectId: string,
  ) {
    const stories = await tx.userStory.findMany({
      where: { projectId },
      select: { code: true },
    });
    let maxNumber = 0;
    for (const story of stories) {
      const match = story.code.match(/US-(\d+)/);
      if (match) {
        const value = parseInt(match[1], 10);
        if (!Number.isNaN(value) && value > maxNumber) {
          maxNumber = value;
        }
      }
    }
    const nextNumber = maxNumber + 1;
    return `US-${nextNumber.toString().padStart(3, '0')}`;
  }

  private async createTags(
    tx: Prisma.TransactionClient,
    storyId: string,
    tags: string[],
  ) {
    if (tags.length === 0) {
      return;
    }
    await tx.userStoryTag.createMany({
      data: tags.map((value) => ({ storyId, value })),
      skipDuplicates: true,
    });
  }

  private async updateTags(
    tx: Prisma.TransactionClient,
    storyId: string,
    tags: string[],
  ) {
    const current = await tx.userStoryTag.findMany({
      where: { storyId },
      select: { value: true },
    });
    const currentValues = new Set(current.map((item) => item.value));
    const nextValues = new Set(tags);

    const toRemove = Array.from(currentValues).filter(
      (value) => !nextValues.has(value),
    );
    if (toRemove.length > 0) {
      await tx.userStoryTag.deleteMany({
        where: { storyId, value: { in: toRemove } },
      });
    }

    const toAdd = Array.from(nextValues).filter(
      (value) => !currentValues.has(value),
    );
    if (toAdd.length > 0) {
      await this.createTags(tx, storyId, toAdd);
    }
  }

  async findAll(projectId: string, userId: string) {
    await this.ensureProjectMember(projectId, userId);
    const stories = await this.prisma.userStory.findMany({
      where: { projectId },
      orderBy: [{ priority: 'asc' }, { orderRank: 'asc' }, { createdAt: 'asc' }],
      include: { tags: true },
    });
    return stories.map((story) => this.serializeStory(story));
  }

  async create(
    projectId: string,
    dto: CreateStoryDto,
    userId: string,
  ) {
    await this.ensureProjectOwner(projectId, userId);
    const acceptance = this.normalizeAcceptance(dto.acceptanceCriteria);
    if (acceptance.length === 0) {
      throw new BadRequestException(
        'Acceptance criteria list cannot be empty',
      );
    }
    const tags = this.normalizeTags(dto.tags);

    const story = await this.prisma.$transaction(async (tx) => {
      const code = await this.generateCode(tx, projectId);
      const rankAggregate = await tx.userStory.aggregate({
        where: { projectId },
        _max: { orderRank: true },
      });
      const nextRank = (rankAggregate._max.orderRank ?? 0) + 1;

      const created = await tx.userStory.create({
        data: {
          projectId,
          code,
          title: dto.title,
          asA: dto.asA,
          iWant: dto.iWant,
          soThat: dto.soThat,
          acceptanceCriteria: acceptance,
          description: dto.description ?? null,
          priority: dto.priority,
          businessValue: dto.businessValue ?? 0,
          orderRank: nextRank,
          estimateHours: dto.estimateHours ?? 0,
          status: dto.status ?? StoryStatus.BACKLOG,
        },
        include: { tags: true },
      });

      if (tags.length > 0) {
        await this.createTags(tx, created.id, tags);
      }

      return tx.userStory.findUnique({
        where: { id: created.id },
        include: { tags: true },
      });
    });

    return this.serializeStory(story!);
  }

  async update(
    projectId: string,
    storyId: string,
    dto: UpdateStoryDto,
    userId: string,
  ) {
    await this.ensureProjectOwner(projectId, userId);
    const story = await this.prisma.userStory.findFirst({
      where: { id: storyId, projectId },
    });
    if (!story) {
      throw new NotFoundException('Story not found');
    }

    const updateData: Prisma.UserStoryUpdateInput = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }
    if (dto.asA !== undefined) {
      updateData.asA = dto.asA;
    }
    if (dto.iWant !== undefined) {
      updateData.iWant = dto.iWant;
    }
    if (dto.soThat !== undefined) {
      updateData.soThat = dto.soThat;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description ?? null;
    }
    if (dto.priority !== undefined) {
      updateData.priority = dto.priority;
    }
    if (dto.businessValue !== undefined) {
      updateData.businessValue = dto.businessValue;
    }
    if (dto.estimateHours !== undefined) {
      updateData.estimateHours = dto.estimateHours;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }
    if (dto.acceptanceCriteria !== undefined) {
      const acceptance = this.normalizeAcceptance(dto.acceptanceCriteria);
      if (acceptance.length === 0) {
        throw new BadRequestException(
          'Acceptance criteria list cannot be empty',
        );
      }
      updateData.acceptanceCriteria = acceptance;
    }

    const tags = dto.tags ? this.normalizeTags(dto.tags) : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userStory.update({
        where: { id: storyId },
        data: updateData,
      });

      if (tags) {
        await this.updateTags(tx, storyId, tags);
      }

      return tx.userStory.findUnique({
        where: { id: storyId },
        include: { tags: true },
      });
    });

    return this.serializeStory(updated!);
  }

  async reorder(
    projectId: string,
    dto: ReorderStoriesDto,
    userId: string,
  ) {
    await this.ensureProjectOwner(projectId, userId);
    const stories = await this.prisma.userStory.findMany({
      where: { projectId, id: { in: dto.storyIds } },
      select: { id: true },
    });
    if (stories.length !== dto.storyIds.length) {
      throw new BadRequestException('One or more stories are invalid');
    }

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < dto.storyIds.length; index += 1) {
        const storyId = dto.storyIds[index];
        const nextPriority = index + 1;
        await tx.userStory.update({
          where: { id: storyId },
          data: {
            priority: nextPriority,
            orderRank: nextPriority,
          },
        });
      }
    });

    return this.findAll(projectId, userId);
  }
}
