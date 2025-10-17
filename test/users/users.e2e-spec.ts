import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper } from '../helpers/test-helper';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;
  let adminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    app = await TestAppFactory.createTestApp();
    testHelper = new TestHelper(app);
    adminUser = await testHelper.getAdminUser();
    regularUser = await testHelper.getRegularUser();
  });

  afterAll(async () => {
    await testHelper.cleanup();
    await app.close();
  });

  describe('/api/users (POST)', () => {
    it('debe permitir a admin crear un nuevo usuario', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `newuser-${timestamp}@test.com`,
        username: `newuser${timestamp}`,
        password: 'NewUser123!@#',
        firstName: 'New',
        lastName: 'User',
        timezone: 'America/La_Paz',
        isAdmin: false,
      };

      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(userData.email);
      expect(response.body.username).toBe(userData.username);
      expect(response.body).not.toHaveProperty('password');
    });

    it('debe denegar acceso a usuario regular', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `denied-${timestamp}@test.com`,
        username: `denied${timestamp}`,
        password: 'Denied123!@#',
        firstName: 'Denied',
        lastName: 'User',
        timezone: 'America/La_Paz',
      };

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/users')
        .send(userData)
        .expect(403);
    });

    it('debe denegar acceso sin autenticación', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `noauth-${timestamp}@test.com`,
        username: `noauth${timestamp}`,
        password: 'NoAuth123!@#',
        firstName: 'No',
        lastName: 'Auth',
        timezone: 'America/La_Paz',
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .send(userData)
        .expect(401);
    });
  });

  describe('/api/users (GET)', () => {
    it('debe permitir a admin obtener todos los usuarios', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .get('/api/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).not.toHaveProperty('password');
    });

    it('debe denegar acceso a usuario regular', async () => {
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get('/api/users')
        .expect(403);
    });

    it('debe denegar acceso sin autenticación', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .expect(401);
    });
  });

  describe('/api/users/:id (GET)', () => {
    let testUser: any;

    beforeAll(async () => {
      testUser = await testHelper.createTestUser();
    });

    it('debe permitir a admin obtener un usuario específico', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .get(`/api/users/${testUser.id}`)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('debe retornar 404 para usuario no existente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .get(`/api/users/${fakeId}`)
        .expect(404);
    });

    it('debe denegar acceso a usuario regular', async () => {
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get(`/api/users/${testUser.id}`)
        .expect(403);
    });
  });

  describe('/api/users/:id (PATCH)', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await testHelper.createTestUser();
    });

    it('debe permitir a admin actualizar un usuario', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .patch(`/api/users/${testUser.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe(updateData.firstName);
      expect(response.body.lastName).toBe(updateData.lastName);
      expect(response.body.email).toBe(testUser.email);
    });

    it('debe permitir actualizar el timezone', async () => {
      const updateData = {
        timezone: 'America/New_York',
      };

      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .patch(`/api/users/${testUser.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.timezone).toBe(updateData.timezone);
    });

    it('debe denegar acceso a usuario regular', async () => {
      const updateData = {
        firstName: 'Hacked',
      };

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .patch(`/api/users/${testUser.id}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('/api/users/:id/send-reset-link (POST)', () => {
    let testUser: any;

    beforeAll(async () => {
      testUser = await testHelper.createTestUser();
    });

    it('debe permitir a admin enviar link de reset de password', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .post(`/api/users/${testUser.id}/send-reset-link`)
        .expect(201);

      expect(response.body).toHaveProperty('message');
    });

    it('debe denegar acceso a usuario regular', async () => {
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post(`/api/users/${testUser.id}/send-reset-link`)
        .expect(403);
    });

    it('debe denegar acceso sin autenticación', async () => {
      await request(app.getHttpServer())
        .post(`/api/users/${testUser.id}/send-reset-link`)
        .expect(401);
    });
  });

  describe('/api/users/:id (DELETE)', () => {
    it('debe permitir a admin eliminar un usuario', async () => {
      const userToDelete = await testHelper.createTestUser();

      await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .delete(`/api/users/${userToDelete.id}`)
        .expect(200);

      // Verificar que el usuario fue eliminado
      await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .get(`/api/users/${userToDelete.id}`)
        .expect(404);
    });

    it('debe retornar 404 para usuario no existente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .delete(`/api/users/${fakeId}`)
        .expect(404);
    });

    it('debe denegar acceso a usuario regular', async () => {
      const userToDelete = await testHelper.createTestUser();

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .delete(`/api/users/${userToDelete.id}`)
        .expect(403);
    });
  });
});

