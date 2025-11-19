import { INestApplication } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
import request = require('supertest');
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper, TestUser } from '../helpers/test-helper';

describe('Repositories (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;
  let productOwner: TestUser;
  let scrumMaster: TestUser;
  let developer: TestUser;
  let outsider: TestUser;
  let projectId: string;

  beforeAll(async () => {
    app = await TestAppFactory.createTestApp();
    testHelper = new TestHelper(app);
    productOwner = await testHelper.createTestUser();
    scrumMaster = await testHelper.createTestUser();
    developer = await testHelper.createTestUser();
    outsider = await testHelper.createTestUser();

    // Crear proyecto con equipo
    const projectResponse = await testHelper
      .getAuthenticatedRequest(productOwner.token)
      .post('/api/projects')
      .send({
        name: `Proyecto Repositories Test ${Date.now()}`,
        description: 'Proyecto para testing de repositorios GitHub',
        productObjective: 'Validar integración con GitHub',
        qualityCriteria: 'Tests automatizados completos',
        visibility: 'PRIVATE',
        sprintDuration: 2,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 28).toISOString(),
        teamMembers: [
          { userId: scrumMaster.id, role: ProjectMemberRole.SCRUM_MASTER },
          { userId: developer.id, role: ProjectMemberRole.DEVELOPER },
        ],
      })
      .expect(201);

    projectId = projectResponse.body.project.id;
  });

  afterAll(async () => {
    await testHelper.cleanup();
    await app.close();
  });

  describe('POST /api/projects/:projectId/repositories', () => {
    it('debe permitir al Scrum Master crear un repositorio', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Frontend Repository',
          url: 'https://github.com/myorg/frontend-app',
          mainBranch: 'main',
          isPrimary: true,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Frontend Repository',
        url: 'https://github.com/myorg/frontend-app',
        mainBranch: 'main',
        isPrimary: true,
        projectId,
      });
      expect(response.body.id).toBeDefined();
    });

    it('debe permitir al Product Owner crear un repositorio', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(productOwner.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Backend Repository',
          url: 'https://github.com/myorg/backend-app',
          mainBranch: 'develop',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Backend Repository',
        url: 'https://github.com/myorg/backend-app',
        mainBranch: 'develop',
      });
    });

    it('debe rechazar URL con formato inválido', async () => {
      await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Invalid Repo',
          url: 'https://gitlab.com/myorg/repo', // No es GitHub
          mainBranch: 'main',
        })
        .expect(400);
    });

    it('debe rechazar URL duplicada en el mismo proyecto', async () => {
      const repoUrl = 'https://github.com/myorg/duplicate-test';

      // Primera vez - debe funcionar
      await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'First Duplicate',
          url: repoUrl,
        })
        .expect(201);

      // Segunda vez - debe rechazar
      await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Second Duplicate',
          url: repoUrl,
        })
        .expect(400);
    });

    it('debe rechazar creación por un Developer', async () => {
      await testHelper
        .getAuthenticatedRequest(developer.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Unauthorized Repo',
          url: 'https://github.com/myorg/unauthorized',
        })
        .expect(403);
    });

    it('debe rechazar creación por usuario sin acceso al proyecto', async () => {
      await testHelper
        .getAuthenticatedRequest(outsider.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Outsider Repo',
          url: 'https://github.com/myorg/outsider',
        })
        .expect(403);
    });

    it('debe desmarcar repositorio previo al marcar uno nuevo como primary', async () => {
      // Crear primer repositorio como primary
      const repo1Response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Primary Test 1',
          url: 'https://github.com/myorg/primary-test-1',
          isPrimary: true,
        })
        .expect(201);

      expect(repo1Response.body.isPrimary).toBe(true);

      // Crear segundo repositorio como primary
      const repo2Response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Primary Test 2',
          url: 'https://github.com/myorg/primary-test-2',
          isPrimary: true,
        })
        .expect(201);

      expect(repo2Response.body.isPrimary).toBe(true);

      // Verificar que el primero ya no es primary
      const repo1Check = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/repositories/${repo1Response.body.id}`)
        .expect(200);

      expect(repo1Check.body.isPrimary).toBe(false);
    });
  });

  describe('GET /api/projects/:projectId/repositories', () => {
    it('debe listar todos los repositorios del proyecto', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(developer.token)
        .get(`/api/projects/${projectId}/repositories`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('debe ordenar por isPrimary primero, luego por fecha de creación', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/repositories`)
        .expect(200);

      const repositories = response.body;
      if (repositories.length > 1) {
        // El primer repo debe ser el primary (si existe)
        const primaryRepos = repositories.filter((r: any) => r.isPrimary);
        if (primaryRepos.length > 0) {
          expect(repositories[0].isPrimary).toBe(true);
        }
      }
    });

    it('debe rechazar acceso a usuario sin permisos', async () => {
      await testHelper
        .getAuthenticatedRequest(outsider.token)
        .get(`/api/projects/${projectId}/repositories`)
        .expect(403);
    });
  });

  describe('GET /api/projects/:projectId/repositories/:id', () => {
    it('debe obtener un repositorio por ID', async () => {
      // Crear repositorio
      const createResponse = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Get By ID Test',
          url: 'https://github.com/myorg/get-by-id',
        })
        .expect(201);

      const repoId = createResponse.body.id;

      // Obtener por ID
      const response = await testHelper
        .getAuthenticatedRequest(developer.token)
        .get(`/api/projects/${projectId}/repositories/${repoId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: repoId,
        name: 'Get By ID Test',
        url: 'https://github.com/myorg/get-by-id',
      });
    });

    it('debe retornar 404 si el repositorio no existe', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await testHelper
        .getAuthenticatedRequest(developer.token)
        .get(`/api/projects/${projectId}/repositories/${fakeId}`)
        .expect(404);
    });
  });

  describe('PUT /api/projects/:projectId/repositories/:id', () => {
    it('debe permitir al Scrum Master actualizar un repositorio', async () => {
      // Crear repositorio
      const createResponse = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Update Test',
          url: 'https://github.com/myorg/update-test',
          mainBranch: 'main',
        })
        .expect(201);

      const repoId = createResponse.body.id;

      // Actualizar
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .put(`/api/projects/${projectId}/repositories/${repoId}`)
        .send({
          name: 'Updated Name',
          mainBranch: 'develop',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: repoId,
        name: 'Updated Name',
        mainBranch: 'develop',
        url: 'https://github.com/myorg/update-test', // No cambió
      });
    });

    it('debe rechazar actualización por Developer', async () => {
      // Crear repositorio
      const createResponse = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'No Update',
          url: 'https://github.com/myorg/no-update',
        })
        .expect(201);

      const repoId = createResponse.body.id;

      // Intentar actualizar como Developer
      await testHelper
        .getAuthenticatedRequest(developer.token)
        .put(`/api/projects/${projectId}/repositories/${repoId}`)
        .send({
          name: 'Hacked Name',
        })
        .expect(403);
    });

    it('debe rechazar URL duplicada al actualizar', async () => {
      const existingUrl = 'https://github.com/myorg/existing-for-dup';

      // Crear primer repositorio
      await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Existing Repo',
          url: existingUrl,
        })
        .expect(201);

      // Crear segundo repositorio
      const createResponse = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'To Update Repo',
          url: 'https://github.com/myorg/to-update-dup',
        })
        .expect(201);

      const repoId = createResponse.body.id;

      // Intentar actualizar con URL duplicada
      await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .put(`/api/projects/${projectId}/repositories/${repoId}`)
        .send({
          url: existingUrl, // Ya existe
        })
        .expect(400);
    });
  });

  describe('DELETE /api/projects/:projectId/repositories/:id', () => {
    it('debe permitir al Product Owner eliminar un repositorio', async () => {
      // Crear repositorio
      const createResponse = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Delete Test',
          url: 'https://github.com/myorg/delete-test',
        })
        .expect(201);

      const repoId = createResponse.body.id;

      // Eliminar
      await testHelper
        .getAuthenticatedRequest(productOwner.token)
        .delete(`/api/projects/${projectId}/repositories/${repoId}`)
        .expect(200);

      // Verificar que ya no existe
      await testHelper
        .getAuthenticatedRequest(productOwner.token)
        .get(`/api/projects/${projectId}/repositories/${repoId}`)
        .expect(404);
    });

    it('debe rechazar eliminación por Developer', async () => {
      // Crear repositorio
      const createResponse = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'No Delete',
          url: 'https://github.com/myorg/no-delete',
        })
        .expect(201);

      const repoId = createResponse.body.id;

      // Intentar eliminar como Developer
      await testHelper
        .getAuthenticatedRequest(developer.token)
        .delete(`/api/projects/${projectId}/repositories/${repoId}`)
        .expect(403);
    });
  });

  describe('PATCH /api/projects/:projectId/repositories/:id/set-primary', () => {
    it('debe marcar un repositorio como principal', async () => {
      // Crear dos repositorios
      const repo1Response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Set Primary Test 1',
          url: 'https://github.com/myorg/set-primary-1',
        })
        .expect(201);

      const repo2Response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'Set Primary Test 2',
          url: 'https://github.com/myorg/set-primary-2',
        })
        .expect(201);

      const repo2Id = repo2Response.body.id;

      // Marcar segundo como primary
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .patch(`/api/projects/${projectId}/repositories/${repo2Id}/set-primary`)
        .expect(200);

      expect(response.body.isPrimary).toBe(true);

      // Verificar que el primero no es primary
      const repo1Check = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/repositories/${repo1Response.body.id}`)
        .expect(200);

      expect(repo1Check.body.isPrimary).toBe(false);
    });

    it('debe rechazar marcado por Developer', async () => {
      // Crear repositorio
      const createResponse = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/repositories`)
        .send({
          name: 'No Set Primary',
          url: 'https://github.com/myorg/no-set-primary',
        })
        .expect(201);

      const repoId = createResponse.body.id;

      // Intentar marcar como primary siendo Developer
      await testHelper
        .getAuthenticatedRequest(developer.token)
        .patch(`/api/projects/${projectId}/repositories/${repoId}/set-primary`)
        .expect(403);
    });
  });
});

