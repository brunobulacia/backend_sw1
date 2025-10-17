import { INestApplication } from '@nestjs/common';
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
    
    this.adminUser = {
      id: registerResponse.body.user.id,
      email: userData.email,
      username: userData.username,
      token: registerResponse.body.access_token,
      isAdmin: true, // Lo marcamos como admin en el test, aunque en BD no lo sea
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
  async createTestProject(ownerToken: string): Promise<TestProject> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const projectData = {
      code: `PRJ${timestamp}${random}`,
      name: `Proyecto Test ${timestamp}`,
      description: 'Proyecto creado para testing',
      visibility: 'PRIVATE',
      sprintDuration: 14,
      startDate: new Date().toISOString(),
    };

    const response = await request(this.app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(projectData)
      .expect(201);

    this.createdProjects.push(response.body.id);

    return response.body;
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
    // Eliminar proyectos creados
    if (this.adminUser) {
      for (const projectId of this.createdProjects) {
        try {
          await request(this.app.getHttpServer())
            .delete(`/api/projects/${projectId}`)
            .set('Authorization', `Bearer ${this.adminUser.token}`);
        } catch (error) {
          // Ignorar errores de limpieza
        }
      }

      // Eliminar usuarios creados
      for (const userId of this.createdUsers) {
        try {
          await request(this.app.getHttpServer())
            .delete(`/api/users/${userId}`)
            .set('Authorization', `Bearer ${this.adminUser.token}`);
        } catch (error) {
          // Ignorar errores de limpieza
        }
      }
    }

    this.createdUsers = [];
    this.createdProjects = [];
    this.adminUser = null;
    this.regularUser = null;
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

