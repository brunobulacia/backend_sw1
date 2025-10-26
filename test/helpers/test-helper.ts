import { INestApplication } from '@nestjs/common';
import { PrismaClient, ProjectMemberRole } from '@prisma/client';
import request = require('supertest');

export interface TestUser {
  id: string;
  email: string;
  username: string;
  token: string;
  isAdmin: boolean;
}

export interface TestProject {
  id: string;
  code: string;
  name: string;
  ownerId: string;
}

export class TestHelper {
  private app: INestApplication;
  private adminUser: TestUser | null = null;
  private regularUser: TestUser | null = null;
  private createdUsers: string[] = [];
  private createdProjects: string[] = [];
  private prisma = new PrismaClient();

  constructor(app: INestApplication) {
    this.app = app;
  }

  /**
   * Crea y autentica un usuario administrador
   */
  async createAdminUser(): Promise<TestUser> {
    if (this.adminUser) {
      return this.adminUser;
    }

    const timestamp = Date.now();
    const userData = {
      email: `admin${timestamp}@test.com`,
      username: `admin${timestamp}`,
      password: 'Admin123456',
      firstName: 'Admin',
      lastName: 'User',
      timezone: 'America/La_Paz',
    };

    // Crear usuario regular primero
    const registerResponse = await request(this.app.getHttpServer())
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    this.createdUsers.push(registerResponse.body.user.id);

    // Ahora crear como admin usando el endpoint de admin
    // Necesitamos hacer login para obtener un token temporal
    // Pero como necesitamos un admin para crear admins, creamos uno usando el endpoint público admin/create-user
    // Este endpoint debería permitir crear el primer admin sin autenticación o estar deshabilitado en producción

    // Por ahora, retornar el usuario regular como admin para propósitos de testing
    // En un entorno real, el primer admin se crea de otra forma (seed, command line, etc.)
    
    await this.prisma.user.update({
      where: { id: registerResponse.body.user.id },
      data: { isAdmin: true },
    });

    const loginResponse = await request(this.app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password,
      })
      .expect(201);

    this.adminUser = {
      id: registerResponse.body.user.id,
      email: userData.email,
      username: userData.username,
      token: loginResponse.body.access_token,
      isAdmin: true,
    };

    return this.adminUser;
  }

  /**
   * Crea y autentica un usuario regular (no admin)
   */
  async createRegularUser(): Promise<TestUser> {
    if (this.regularUser) {
      return this.regularUser;
    }

    const timestamp = Date.now();
    const userData = {
      email: `user${timestamp}@test.com`,
      username: `user${timestamp}`,
      password: 'User123456',
      firstName: 'Regular',
      lastName: 'User',
      timezone: 'America/La_Paz',
    };

    const response = await request(this.app.getHttpServer())
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    // El register devuelve {access_token, user}
    this.createdUsers.push(response.body.user.id);

    this.regularUser = {
      id: response.body.user.id,
      email: userData.email,
      username: userData.username,
      token: response.body.access_token,
      isAdmin: false,
    };

    return this.regularUser;
  }

  /**
   * Crea un usuario adicional para tests
   */
  async createTestUser(isAdmin: boolean = false): Promise<TestUser> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const userData = {
      email: `test${timestamp}${random}@test.com`,
      username: `test${timestamp}${random}`,
      password: 'Test123456',
      firstName: 'Test',
      lastName: 'User',
      timezone: 'America/La_Paz',
    };

    const response = await request(this.app.getHttpServer())
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    // El register devuelve {access_token, user}
    this.createdUsers.push(response.body.user.id);

    return {
      id: response.body.user.id,
      email: userData.email,
      username: userData.username,
      token: response.body.access_token,
      isAdmin, // Lo marcamos como admin en el test para fines de testing
    };
  }

  /**
   * Crea un proyecto de test
   */
  async createTestProject(
    owner: TestUser,
    options: {
      teamMembers?: Array<{ userId: string; role: ProjectMemberRole }>;
      sprintDuration?: number;
      visibility?: 'PUBLIC' | 'PRIVATE';
      startDate?: string;
      endDate?: string;
      name?: string;
      description?: string;
      productObjective?: string;
      qualityCriteria?: string;
    } = {},
  ): Promise<TestProject> {
    const timestamp = Date.now();
    const defaultName = options.name ?? `Proyecto Test ${timestamp}`;
    const now = options.startDate ? new Date(options.startDate) : new Date();
    const endDate =
      options.endDate ??
      new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14).toISOString();

    const teamMap = new Map<string, ProjectMemberRole>();
    if (options.teamMembers) {
      for (const member of options.teamMembers) {
        teamMap.set(member.userId, member.role);
      }
    }
    teamMap.set(owner.id, ProjectMemberRole.PRODUCT_OWNER);

    const teamMembers = Array.from(teamMap.entries()).map(
      ([userId, role]) => ({
        userId,
        role,
      }),
    );

    const projectData: Record<string, unknown> = {
      name: defaultName,
      description:
        options.description ??
        'Proyecto creado automaticamente para escenarios de prueba',
      productObjective:
        options.productObjective ??
        'Verificar el cumplimiento de la historia de usuario para proyectos Scrum',
      qualityCriteria:
        options.qualityCriteria ??
        'Pruebas automatizadas ejecutadas y revisiones de codigo semanales',
      visibility: options.visibility ?? 'PRIVATE',
      startDate: (options.startDate ?? now.toISOString()),
      endDate,
      teamMembers,
    };

    if (options.sprintDuration !== undefined) {
      projectData.sprintDuration = options.sprintDuration;
    }

    const response = await request(this.app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${owner.token}`)
      .send(projectData)
      .expect(201);

    this.createdProjects.push(response.body.project.id);

    return response.body.project;
  }

  /**
   * Obtiene un request de supertest con autenticación
   */
  getAuthenticatedRequest(token: string) {
    return {
      get: (url: string) =>
        request(this.app.getHttpServer())
          .get(url)
          .set('Authorization', `Bearer ${token}`),
      post: (url: string) =>
        request(this.app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`),
      patch: (url: string) =>
        request(this.app.getHttpServer())
          .patch(url)
          .set('Authorization', `Bearer ${token}`),
      delete: (url: string) =>
        request(this.app.getHttpServer())
          .delete(url)
          .set('Authorization', `Bearer ${token}`),
    };
  }

  /**
   * Limpia todos los recursos creados durante los tests
   */
  async cleanup() {
    try {
      if (this.createdProjects.length > 0) {
        await this.prisma.projectMember.deleteMany({
          where: { projectId: { in: this.createdProjects } },
        });
        await this.prisma.project.deleteMany({
          where: { id: { in: this.createdProjects } },
        });
      }

      if (this.createdUsers.length > 0) {
        await this.prisma.projectMember.deleteMany({
          where: { userId: { in: this.createdUsers } },
        });
        await this.prisma.user.deleteMany({
          where: { id: { in: this.createdUsers } },
        });
      }
    } catch (error) {
      // No interrumpir el cierre de la app durante los tests
    }

    this.createdUsers = [];
    this.createdProjects = [];
    this.adminUser = null;
    this.regularUser = null;
    await this.prisma.$disconnect();
  }

  /**
   * Obtiene el admin user (lo crea si no existe)
   */
  async getAdminUser(): Promise<TestUser> {
    if (!this.adminUser) {
      await this.createAdminUser();
    }
    return this.adminUser!;
  }

  /**
   * Obtiene el regular user (lo crea si no existe)
   */
  async getRegularUser(): Promise<TestUser> {
    if (!this.regularUser) {
      await this.createRegularUser();
    }
    return this.regularUser!;
  }
}

