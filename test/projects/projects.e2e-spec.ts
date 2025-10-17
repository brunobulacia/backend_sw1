import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper } from '../helpers/test-helper';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;
  let adminUser: any;
  let regularUser: any;
  let otherUser: any;

  beforeAll(async () => {
    app = await TestAppFactory.createTestApp();
    testHelper = new TestHelper(app);
    adminUser = await testHelper.getAdminUser();
    regularUser = await testHelper.getRegularUser();
    otherUser = await testHelper.createTestUser();
  });

  afterAll(async () => {
    await testHelper.cleanup();
    await app.close();
  });

  describe('/api/projects (POST)', () => {
    it('debe permitir a usuario autenticado crear un proyecto', async () => {
      const timestamp = Date.now();
      const projectData = {
        code: `PRJ-${timestamp}`,
        name: `Proyecto Test ${timestamp}`,
        description: 'Descripción del proyecto de test',
        visibility: 'PRIVATE',
        sprintDuration: 14,
        startDate: new Date().toISOString(),
      };

      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe(projectData.code);
      expect(response.body.name).toBe(projectData.name);
      expect(response.body.ownerId).toBe(regularUser.id);
      expect(response.body.status).toBe('PLANNING');
    });

    it('debe crear proyecto con visibilidad PUBLIC', async () => {
      const timestamp = Date.now();
      const projectData = {
        code: `PUBLIC-${timestamp}`,
        name: `Proyecto Público ${timestamp}`,
        visibility: 'PUBLIC',
        sprintDuration: 14,
        startDate: new Date().toISOString(),
      };

      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.visibility).toBe('PUBLIC');
    });

    it('debe fallar con código duplicado', async () => {
      const timestamp = Date.now();
      const projectData = {
        code: `DUP-${timestamp}`,
        name: `Proyecto Duplicado ${timestamp}`,
        visibility: 'PRIVATE',
        sprintDuration: 14,
        startDate: new Date().toISOString(),
      };

      // Crear primer proyecto
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      // Intentar crear proyecto con mismo código
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/projects')
        .send(projectData)
        .expect(409);
    });

    it('debe denegar acceso sin autenticación', async () => {
      const projectData = {
        code: 'NO-AUTH',
        name: 'Proyecto sin auth',
        visibility: 'PRIVATE',
        sprintDuration: 14,
        startDate: new Date().toISOString(),
      };

      await request(app.getHttpServer())
        .post('/api/projects')
        .send(projectData)
        .expect(401);
    });

    it('debe fallar con datos inválidos', async () => {
      const invalidData = {
        code: '', // código vacío
        name: 'Test',
        sprintDuration: -1, // duración negativa
      };

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/projects')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('/api/projects (GET)', () => {
    beforeAll(async () => {
      // Crear algunos proyectos de test
      await testHelper.createTestProject(regularUser.token);
      await testHelper.createTestProject(adminUser.token);
    });

    it('debe permitir a admin ver todos los proyectos', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .get('/api/projects')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('debe permitir a usuario regular ver sus proyectos y públicos', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get('/api/projects')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // El usuario debería ver al menos sus propios proyectos
      const userProjects = response.body.filter(
        (p: any) => p.ownerId === regularUser.id,
      );
      expect(userProjects.length).toBeGreaterThan(0);
    });

    it('debe denegar acceso sin autenticación', async () => {
      await request(app.getHttpServer())
        .get('/api/projects')
        .expect(401);
    });
  });

  describe('/api/projects/my-projects (GET)', () => {
    let userProject: any;

    beforeAll(async () => {
      userProject = await testHelper.createTestProject(regularUser.token);
    });

    it('debe retornar solo los proyectos del usuario autenticado', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get('/api/projects/my-projects')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Todos los proyectos deben pertenecer al usuario
      response.body.forEach((project: any) => {
        expect(project.ownerId).toBe(regularUser.id);
      });
    });

    it('debe retornar array vacío si el usuario no tiene proyectos', async () => {
      const newUser = await testHelper.createTestUser();
      
      const response = await testHelper
        .getAuthenticatedRequest(newUser.token)
        .get('/api/projects/my-projects')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('debe denegar acceso sin autenticación', async () => {
      await request(app.getHttpServer())
        .get('/api/projects/my-projects')
        .expect(401);
    });
  });

  describe('/api/projects/:id (GET)', () => {
    let ownProject: any;
    let otherProject: any;

    beforeAll(async () => {
      ownProject = await testHelper.createTestProject(regularUser.token);
      otherProject = await testHelper.createTestProject(otherUser.token);
    });

    it('debe permitir al owner ver su proyecto', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get(`/api/projects/${ownProject.id}`)
        .expect(200);

      expect(response.body.id).toBe(ownProject.id);
      expect(response.body.ownerId).toBe(regularUser.id);
    });

    it('debe permitir a admin ver cualquier proyecto', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .get(`/api/projects/${otherProject.id}`)
        .expect(200);

      expect(response.body.id).toBe(otherProject.id);
    });

    it('debe denegar acceso a proyecto privado de otro usuario', async () => {
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get(`/api/projects/${otherProject.id}`)
        .expect(403);
    });

    it('debe retornar 404 para proyecto no existente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get(`/api/projects/${fakeId}`)
        .expect(404);
    });
  });

  describe('/api/projects/:id (PATCH)', () => {
    let projectToUpdate: any;

    beforeEach(async () => {
      projectToUpdate = await testHelper.createTestProject(regularUser.token);
    });

    it('debe permitir al owner actualizar su proyecto', async () => {
      const updateData = {
        name: 'Nombre Actualizado',
        description: 'Descripción actualizada',
        status: 'ACTIVE',
      };

      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .patch(`/api/projects/${projectToUpdate.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.status).toBe(updateData.status);
    });

    it('debe permitir a admin actualizar cualquier proyecto', async () => {
      const updateData = {
        name: 'Actualizado por Admin',
      };

      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .patch(`/api/projects/${projectToUpdate.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });

    it('debe denegar acceso a usuario no autorizado', async () => {
      const updateData = {
        name: 'Intento no autorizado',
      };

      await testHelper
        .getAuthenticatedRequest(otherUser.token)
        .patch(`/api/projects/${projectToUpdate.id}`)
        .send(updateData)
        .expect(403);
    });

    it('debe permitir cambiar visibilidad del proyecto', async () => {
      const updateData = {
        visibility: 'PUBLIC',
      };

      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .patch(`/api/projects/${projectToUpdate.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.visibility).toBe('PUBLIC');
    });
  });

  describe('/api/projects/:id (DELETE)', () => {
    it('debe permitir al owner eliminar su proyecto', async () => {
      const projectToDelete = await testHelper.createTestProject(
        regularUser.token,
      );

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .delete(`/api/projects/${projectToDelete.id}`)
        .expect(200);

      // Verificar que el proyecto fue eliminado
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get(`/api/projects/${projectToDelete.id}`)
        .expect(404);
    });

    it('debe permitir a admin eliminar cualquier proyecto', async () => {
      const projectToDelete = await testHelper.createTestProject(
        regularUser.token,
      );

      await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .delete(`/api/projects/${projectToDelete.id}`)
        .expect(200);
    });

    it('debe denegar acceso a usuario no autorizado', async () => {
      const projectToDelete = await testHelper.createTestProject(
        regularUser.token,
      );

      await testHelper
        .getAuthenticatedRequest(otherUser.token)
        .delete(`/api/projects/${projectToDelete.id}`)
        .expect(403);
    });

    it('debe retornar 404 para proyecto no existente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .delete(`/api/projects/${fakeId}`)
        .expect(404);
    });
  });
});

