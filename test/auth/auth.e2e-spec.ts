import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper } from '../helpers/test-helper';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;

  beforeAll(async () => {
    app = await TestAppFactory.createTestApp();
    testHelper = new TestHelper(app);
  });

  afterAll(async () => {
    await testHelper.cleanup();
    await app.close();
  });

  describe('/api/auth/register (POST)', () => {
    it('debe registrar un nuevo usuario exitosamente', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `newuser${timestamp}@test.com`,
        username: `newuser${timestamp}`,
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
        timezone: 'America/La_Paz',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user.isActive).toBe(true);
      expect(response.body.user.isAdmin).toBe(false);
    });

    it('debe fallar con email duplicado', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `duplicate${timestamp}@test.com`,
        username: `duplicate${timestamp}`,
        password: 'Password123',
        firstName: 'Duplicate',
        lastName: 'User',
        timezone: 'America/La_Paz',
      };

      // Crear primer usuario
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Intentar crear usuario con mismo email
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...userData,
          username: `different${timestamp}`,
        })
        .expect(409);
    });

    it('debe fallar con username duplicado', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `userdup${timestamp}@test.com`,
        username: `userdup${timestamp}`,
        password: 'Password123',
        firstName: 'User',
        lastName: 'Dup',
        timezone: 'America/La_Paz',
      };

      // Crear primer usuario
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Intentar crear usuario con mismo username
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...userData,
          email: `different${timestamp}@test.com`,
        })
        .expect(409);
    });

    it('debe fallar con datos inválidos', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // password muy corta
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('/api/auth/login (POST)', () => {
    let testUser: any;

    beforeAll(async () => {
      testUser = await testHelper.createTestUser();
    });

    it('debe hacer login exitosamente con email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'Test123456',
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(typeof response.body.access_token).toBe('string');
    });

    it('debe fallar con credenciales incorrectas', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'Wrong123456',
        })
        .expect(401);
    });

    it('debe fallar con email no existente', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123',
        })
        .expect(401);
    });
  });

  describe('/api/auth/profile (GET)', () => {
    let testUser: any;

    beforeAll(async () => {
      testUser = await testHelper.createTestUser();
    });

    it('debe obtener el perfil del usuario autenticado', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(testUser.token)
        .get('/api/auth/profile')
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('debe fallar sin token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });

    it('debe fallar con token inválido', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/api/auth/request-password-reset (POST)', () => {
    let testUser: any;

    beforeAll(async () => {
      testUser = await testHelper.createTestUser();
    });

    it('debe solicitar reset de password exitosamente', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/request-password-reset')
        .send({
          email: testUser.email,
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
    });

    it('debe aceptar solicitud incluso con email no existente (seguridad)', async () => {
      // Por seguridad, no debe revelar si el email existe o no
      const response = await request(app.getHttpServer())
        .post('/api/auth/request-password-reset')
        .send({
          email: 'nonexistent@test.com',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('/api/auth/admin/create-user (POST)', () => {
    let adminUser: any;
    let regularUser: any;

    beforeAll(async () => {
      adminUser = await testHelper.getAdminUser();
      regularUser = await testHelper.getRegularUser();
    });

    it('debe permitir a admin crear un nuevo usuario', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `admin-created-${timestamp}@test.com`,
        username: `admincreated${timestamp}`,
        password: 'AdminCreated123!@#',
        firstName: 'Admin',
        lastName: 'Created',
        timezone: 'America/La_Paz',
        isAdmin: false,
      };

      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .post('/api/auth/admin/create-user')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(userData.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('debe denegar acceso a usuario regular', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `regular-attempt-${timestamp}@test.com`,
        username: `regularattempt${timestamp}`,
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'User',
        timezone: 'America/La_Paz',
      };

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/auth/admin/create-user')
        .send(userData)
        .expect(403);
    });

    it('debe denegar acceso sin autenticación', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `no-auth-${timestamp}@test.com`,
        username: `noauth${timestamp}`,
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'User',
        timezone: 'America/La_Paz',
      };

      await request(app.getHttpServer())
        .post('/api/auth/admin/create-user')
        .send(userData)
        .expect(401);
    });
  });
});

