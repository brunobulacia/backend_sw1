import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectMemberRole } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectTeamMemberDto } from './dto/project-team-member.dto';
import { InviteProjectMemberDto } from './dto/invite-project-member.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailerService } from 'src/mailer/mailer.service';

const BASE_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
} as const;

const PROJECT_DETAILS_INCLUDE = {
  owner: { select: BASE_USER_SELECT },
  members: {
    include: {
      user: { select: BASE_USER_SELECT },
    },
  },
} as const;

const PROJECT_SUMMARY_INCLUDE = {
  owner: { select: BASE_USER_SELECT },
  _count: {
    select: {
      members: true,
      stories: true,
    },
  },
} as const;

type ProjectWithDetails = Prisma.ProjectGetPayload<{
  include: typeof PROJECT_DETAILS_INCLUDE;
}>;

type ProjectSummary = Prisma.ProjectGetPayload<{
  include: typeof PROJECT_SUMMARY_INCLUDE;
}>;

type ProjectMemberWithUser = Prisma.ProjectMemberGetPayload<{
  include: { user: { select: typeof BASE_USER_SELECT } };
}>;

const DEFAULT_SPRINT_DURATION_WEEKS = 2;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Genera un codigo unico para el proyecto basado en las siglas del nombre y el anio.
   * Formato: [SIGLAS]-YYYY (ej: SGP-2025)
   */
  private async generateProjectCode(name: string): Promise<string> {
    const year = new Date().getFullYear();
    const words = name.trim().split(/\s+/);

    let initials = '';
    const collectedInitials: string[] = [];
    for (const word of words) {
      const firstLetter = word.match(/[a-zA-Z]/);
      if (firstLetter) {
        collectedInitials.push(firstLetter[0].toUpperCase());
      }
      if (collectedInitials.length === 4) {
        break;
      }
    }

    if (collectedInitials.length > 0) {
      initials = collectedInitials.join('');
    } else {
      const fallbackLetters = name.replace(/[^a-zA-Z]/g, '');
      initials = fallbackLetters.slice(0, 3).toUpperCase() || 'PRJ';
    }

    const baseCode = `${initials}-${year}`;
    const existingProject = await this.prismaService.project.findUnique({
      where: { code: baseCode },
    });

    if (!existingProject) {
      return baseCode;
    }

    let counter = 1;
    let newCode = `${initials}-${year}-${counter}`;

    // Buscar un sufijo disponible
    // eslint-disable-next-line no-await-in-loop
    while (
      await this.prismaService.project.findUnique({
        where: { code: newCode },
      })
    ) {
      counter += 1;
      newCode = `${initials}-${year}-${counter}`;
    }

    return newCode;
  }

  private normalizeOptionalField(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async buildTeamAssignments(
    rawMembers: ProjectTeamMemberDto[],
    currentOwnerId: string,
    allowOwnerChange: boolean,
  ): Promise<{
    assignments: Array<{ userId: string; role: ProjectMemberRole }>;
    nextOwnerId: string;
  }> {
    const assignments = new Map<string, ProjectMemberRole>();
    let requestedOwnerId: string | null = null;

    for (const member of rawMembers) {
      const trimmedId = member.userId.trim();
      if (!trimmedId) {
        throw new BadRequestException(
          'Todos los miembros del equipo deben incluir un identificador valido.',
        );
      }

      if (assignments.has(trimmedId)) {
        throw new ConflictException(
          'El equipo contiene miembros duplicados. Verifica los integrantes seleccionados.',
        );
      }

      assignments.set(trimmedId, member.role);

      if (member.role === ProjectMemberRole.PRODUCT_OWNER) {
        if (requestedOwnerId && requestedOwnerId !== trimmedId) {
          throw new ConflictException(
            'Solo puede existir un Product Owner en el equipo.',
          );
        }
        requestedOwnerId = trimmedId;
      }
    }

    if (!allowOwnerChange) {
      if (requestedOwnerId && requestedOwnerId !== currentOwnerId) {
        throw new ForbiddenException(
          'El creador del proyecto debe permanecer como Product Owner al crear el proyecto.',
        );
      }
      requestedOwnerId = currentOwnerId;
    } else {
      if (!requestedOwnerId) {
        requestedOwnerId = currentOwnerId;
      }
    }

    assignments.set(requestedOwnerId, ProjectMemberRole.PRODUCT_OWNER);

    const scrumMasters = Array.from(assignments.entries()).filter(
      ([, role]) => role === ProjectMemberRole.SCRUM_MASTER,
    );

    if (scrumMasters.length > 1) {
      throw new ConflictException(
        'Solo puede existir un Scrum Master activo en el equipo.',
      );
    }

    const memberIds = Array.from(assignments.keys());

    const users = await this.prismaService.user.findMany({
      where: { id: { in: memberIds } },
    });

    if (users.length !== memberIds.length) {
      const foundIds = new Set(users.map((user) => user.id));
      const missing = memberIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `No se encontraron usuarios con los identificadores: ${missing.join(
          ', ',
        )}`,
      );
    }

    const now = new Date();
    for (const user of users) {
      if (!user.isActive) {
        throw new ForbiddenException(
          `El usuario ${user.email} esta inactivo y no puede ser agregado al proyecto.`,
        );
      }
      if (user.lockedUntil && user.lockedUntil > now) {
        throw new ForbiddenException(
          `El usuario ${user.email} no posee permisos vigentes para unirse al proyecto.`,
        );
      }
    }

    const normalizedAssignments = memberIds.map((userId) => ({
      userId,
      role: assignments.get(userId)!,
    }));

    return {
      assignments: normalizedAssignments,
      nextOwnerId: requestedOwnerId,
    };
  }

  private ensureValidSchedule(startDate: Date, endDate: Date | null): void {
    if (endDate && endDate <= startDate) {
      throw new BadRequestException(
        'La fecha estimada de finalizacion debe ser posterior a la fecha de inicio.',
      );
    }
  }

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<{ message: string; project: ProjectWithDetails }> {
    const requester = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!requester) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (!requester.isActive) {
      throw new ForbiddenException(
        'El usuario autenticado esta inactivo y no puede crear proyectos.',
      );
    }

    const name = createProjectDto.name.trim();
    const description = createProjectDto.description.trim();
    const productObjective = createProjectDto.productObjective.trim();
    const qualityCriteria = createProjectDto.qualityCriteria.trim();

    const existingByName = await this.prismaService.project.findUnique({
      where: { name },
    });

    if (existingByName) {
      throw new ConflictException(
        'Ya existe un proyecto con el mismo nombre. Debe ser unico.',
      );
    }

    const startDate = new Date(createProjectDto.startDate);
    const endDate = createProjectDto.endDate
      ? new Date(createProjectDto.endDate)
      : null;

    this.ensureValidSchedule(startDate, endDate);

    const sprintDuration =
      createProjectDto.sprintDuration ?? DEFAULT_SPRINT_DURATION_WEEKS;

    const { assignments: teamAssignments } = await this.buildTeamAssignments(
      createProjectDto.teamMembers,
      userId,
      false,
    );

    const code = await this.generateProjectCode(name);

    const project = await this.prismaService.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          code,
          name,
          description,
          visibility: createProjectDto.visibility ?? 'PRIVATE',
          productObjective,
          definitionOfDone: this.normalizeOptionalField(
            createProjectDto.definitionOfDone,
          ),
          sprintDuration,
          qualityCriteria,
          status: createProjectDto.status ?? 'PLANNING',
          startDate,
          endDate,
          ownerId: userId,
        },
      });

      await tx.projectMember.createMany({
        data: teamAssignments.map((member) => ({
          projectId: createdProject.id,
          userId: member.userId,
          role: member.role,
          isActive: true,
        })),
      });

      return tx.project.findUniqueOrThrow({
        where: { id: createdProject.id },
        include: PROJECT_DETAILS_INCLUDE,
      });
    });

    return {
      message: 'Proyecto creado exitosamente',
      project,
    };
  }

  async findAll(userId: string, isAdmin: boolean): Promise<ProjectSummary[]> {
    if (isAdmin) {
      return this.prismaService.project.findMany({
        include: PROJECT_SUMMARY_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prismaService.project.findMany({
      where: {
        OR: [
          { visibility: 'PUBLIC' },
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: PROJECT_SUMMARY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<ProjectWithDetails> {
    const project = await this.prismaService.project.findUnique({
      where: { id },
      include: PROJECT_DETAILS_INCLUDE,
    });

    if (!project) {
      throw new NotFoundException(
        `Proyecto con identificador ${id} no encontrado.`,
      );
    }

    const hasAccess =
      isAdmin ||
      project.visibility === 'PUBLIC' ||
      project.ownerId === userId ||
      project.members.some((member) => member.userId === userId);

    if (!hasAccess) {
      throw new ForbiddenException('No tienes acceso a este proyecto.');
    }

    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
    isAdmin: boolean,
  ): Promise<ProjectWithDetails> {
    const project = await this.prismaService.project.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundException(
        `Proyecto con identificador ${id} no encontrado.`,
      );
    }

    if (!isAdmin && project.ownerId !== userId) {
      throw new ForbiddenException(
        'Solo el Product Owner del proyecto o un administrador pueden actualizarlo.',
      );
    }

    if (updateProjectDto.startDate || updateProjectDto.endDate) {
      const startDate = updateProjectDto.startDate
        ? new Date(updateProjectDto.startDate)
        : project.startDate;
      const endDate = updateProjectDto.endDate
        ? new Date(updateProjectDto.endDate)
        : project.endDate;
      this.ensureValidSchedule(startDate, endDate);
    }

    const { teamMembers, ...projectFields } = updateProjectDto;

    if (teamMembers && project.ownerId !== userId) {
      throw new ForbiddenException(
        'Solo el Product Owner del proyecto puede asignar o editar los roles del equipo.',
      );
    }

    const sprintDuration =
      projectFields.sprintDuration ?? project.sprintDuration;
    if (projectFields.sprintDuration) {
      if (
        projectFields.sprintDuration < 1 ||
        projectFields.sprintDuration > 4
      ) {
        throw new BadRequestException(
          'La duracion del sprint debe estar entre 1 y 4 semanas.',
        );
      }
    }

    const projectData: Prisma.ProjectUpdateInput = {};

    if (projectFields.name) {
      projectData.name = projectFields.name.trim();
    }
    if (projectFields.description !== undefined) {
      projectData.description = projectFields.description.trim();
    }
    if (projectFields.visibility !== undefined) {
      projectData.visibility = projectFields.visibility;
    }
    if (projectFields.productObjective !== undefined) {
      projectData.productObjective = projectFields.productObjective.trim();
    }
    if (projectFields.definitionOfDone !== undefined) {
      projectData.definitionOfDone = this.normalizeOptionalField(
        projectFields.definitionOfDone,
      );
    }
    if (projectFields.qualityCriteria !== undefined) {
      projectData.qualityCriteria = projectFields.qualityCriteria.trim();
    }
    if (projectFields.status !== undefined) {
      projectData.status = projectFields.status;
    }
    if (projectFields.startDate) {
      projectData.startDate = new Date(projectFields.startDate);
    }
    if (projectFields.endDate !== undefined) {
      projectData.endDate = projectFields.endDate
        ? new Date(projectFields.endDate)
        : null;
    }
    projectData.sprintDuration = sprintDuration;

    let teamAssignmentsResult:
      | {
          assignments: Array<{ userId: string; role: ProjectMemberRole }>;
          nextOwnerId: string;
        }
      | null = null;

    if (teamMembers) {
      teamAssignmentsResult = await this.buildTeamAssignments(
        teamMembers,
        project.ownerId,
        true,
      );
      if (teamAssignmentsResult.nextOwnerId !== project.ownerId) {
        projectData.owner = {
          connect: { id: teamAssignmentsResult.nextOwnerId },
        };
      }
    }

    const result = await this.prismaService.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: projectData,
      });

      if (teamAssignmentsResult) {
        const memberIds = teamAssignmentsResult.assignments.map(
          (member) => member.userId,
        );

        await tx.projectMember.deleteMany({
          where: {
            projectId: id,
            userId: { notIn: memberIds },
          },
        });

        for (const member of teamAssignmentsResult.assignments) {
          await tx.projectMember.upsert({
            where: {
              projectId_userId: {
                projectId: id,
                userId: member.userId,
              },
            },
            update: {
              role: member.role,
              isActive: true,
            },
            create: {
              projectId: id,
              userId: member.userId,
              role: member.role,
              isActive: true,
            },
          });
        }
      }

      return tx.project.findUniqueOrThrow({
        where: { id },
        include: PROJECT_DETAILS_INCLUDE,
      });
    });

    return result;
  }

  async inviteMember(
    projectId: string,
    inviteDto: InviteProjectMemberDto,
    inviterId: string,
    isAdmin: boolean,
  ): Promise<{ message: string; member: ProjectMemberWithUser }> {
    const project = await this.prismaService.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: BASE_USER_SELECT },
      },
    });

    if (!project) {
      throw new NotFoundException(
        `Proyecto con identificador ${projectId} no encontrado.`,
      );
    }

    if (!isAdmin && project.ownerId !== inviterId) {
      throw new ForbiddenException(
        'Solo el Product Owner del proyecto puede invitar miembros.',
      );
    }

    const normalizedEmail = inviteDto.email.trim().toLowerCase();
    const userToInvite = await this.prismaService.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!userToInvite) {
      throw new NotFoundException(
        `No existe un usuario registrado con el correo ${inviteDto.email}.`,
      );
    }

    if (!userToInvite.isActive) {
      throw new ForbiddenException(
        'El usuario invitado se encuentra inactivo y no puede unirse al proyecto.',
      );
    }

    const now = new Date();
    if (userToInvite.lockedUntil && userToInvite.lockedUntil > now) {
      throw new ForbiddenException(
        'El usuario invitado no posee permisos vigentes para unirse al proyecto.',
      );
    }

    if (
      inviteDto.role === ProjectMemberRole.PRODUCT_OWNER &&
      userToInvite.id !== project.ownerId
    ) {
      throw new ForbiddenException(
        'Solo el propietario del proyecto puede tener el rol de Product Owner.',
      );
    }

    if (inviteDto.role === ProjectMemberRole.SCRUM_MASTER) {
      const existingScrumMaster =
        await this.prismaService.projectMember.findFirst({
          where: {
            projectId,
            role: ProjectMemberRole.SCRUM_MASTER,
            isActive: true,
            userId: { not: userToInvite.id },
          },
        });

      if (existingScrumMaster) {
        throw new ConflictException(
          'Solo puede existir un Scrum Master activo en el equipo.',
        );
      }
    }

    const existingMember =
      await this.prismaService.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: userToInvite.id,
          },
        },
      });

    if (existingMember?.isActive) {
      throw new ConflictException(
        'El usuario ya forma parte del equipo del proyecto.',
      );
    }

    const member = existingMember
      ? await this.prismaService.projectMember.update({
          where: {
            projectId_userId: {
              projectId,
              userId: userToInvite.id,
            },
          },
          data: {
            role: inviteDto.role,
            isActive: true,
            joinedAt: new Date(),
          },
          include: {
            user: { select: BASE_USER_SELECT },
          },
        })
      : await this.prismaService.projectMember.create({
          data: {
            projectId,
            userId: userToInvite.id,
            role: inviteDto.role,
            isActive: true,
          },
          include: {
            user: { select: BASE_USER_SELECT },
          },
        });

    const inviter =
      inviterId === project.ownerId
        ? project.owner
        : await this.prismaService.user.findUnique({
            where: { id: inviterId },
            select: BASE_USER_SELECT,
          });

    const inviterNameCandidates = [
      inviter?.firstName,
      inviter?.lastName,
    ].filter((value) => value && value.trim().length > 0);

    const inviterDisplayName =
      inviterNameCandidates.length > 0
        ? inviterNameCandidates.join(' ').trim()
        : inviter?.username || inviter?.email || 'Un miembro del equipo';

    await this.mailerService.sendProjectInvitationEmail({
      to: userToInvite.email,
      projectName: project.name,
      role: inviteDto.role,
      inviterName: inviterDisplayName,
    });

    return {
      message: `Se envió la invitación a ${userToInvite.email}`,
      member,
    };
  }

  async remove(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<ProjectSummary> {
    const project = await this.prismaService.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(
        `Proyecto con identificador ${id} no encontrado.`,
      );
    }

    if (!isAdmin && project.ownerId !== userId) {
      throw new ForbiddenException(
        'Solo el Product Owner del proyecto o un administrador pueden archivarlo.',
      );
    }

    await this.prismaService.project.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    return this.prismaService.project.findUniqueOrThrow({
      where: { id },
      include: PROJECT_SUMMARY_INCLUDE,
    });
  }

  async findUserProjects(userId: string): Promise<ProjectSummary[]> {
    return this.prismaService.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: PROJECT_SUMMARY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }
}
