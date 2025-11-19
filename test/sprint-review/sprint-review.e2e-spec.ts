import { INestApplication } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
import request = require('supertest');
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper, TestUser } from '../helpers/test-helper';

describe('Sprint Review (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;
  let productOwner: TestUser;
  let scrumMaster: TestUser;
  let developer: TestUser;
  let projectId: string;
  let sprintId: string;

  beforeAll(async () => {
    app = await TestAppFactory.createTestApp();
    testHelper = new TestHelper(app);
    productOwner = await testHelper.createTestUser();
    scrumMaster = await testHelper.createTestUser();
    developer = await testHelper.createTestUser();

    // Crear proyecto
    const projectResponse = await testHelper
      .getAuthenticatedRequest(productOwner.token)
      .post('/api/projects')
      .send({
        name: `Proyecto Sprint Review Test ${Date.now()}`,
        description: 'Proyecto para testing de Sprint Review',
        productObjective: 'Validar Sprint Review',
        qualityCriteria: 'Tests completos',
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

    // Crear sprint
    const sprintResponse = await testHelper
      .getAuthenticatedRequest(scrumMaster.token)
      .post(`/api/projects/${projectId}/sprints`)
      .send({
        number: 1,
        name: 'Sprint 1',
        goal: 'Completar Sprint Review',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
        duration: 2,
      })
      .expect(201);

    sprintId = sprintResponse.body.id;
  });

  afterAll(async () => {
    await testHelper.cleanup();
    await app.close();
  });

  describe('POST /api/sprints/:sprintId/review', () => {
    it('debe permitir al Scrum Master crear un Sprint Review', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/sprints/${sprintId}/review`)
        .send({
          date: new Date().toISOString(),
          participants: 'Scrum Master, Product Owner, Developers',
          summary: 'Completamos todas las historias planificadas',
          feedbackGeneral: 'Excelente trabajo del equipo',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        sprintId,
        participants: 'Scrum Master, Product Owner, Developers',
        summary: 'Completamos todas las historias planificadas',
      });
      expect(response.body.id).toBeDefined();
    });

    it('debe rechazar duplicado de Sprint Review', async () => {
      await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/sprints/${sprintId}/review`)
        .send({
          date: new Date().toISOString(),
          participants: 'Equipo',
          summary: 'Resumen',
        })
        .expect(400);
    });
  });

  describe('GET /api/sprints/:sprintId/review', () => {
    it('debe obtener el Sprint Review', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(developer.token)
        .get(`/api/sprints/${sprintId}/review`)
        .expect(200);

      expect(response.body.sprintId).toBe(sprintId);
      expect(response.body.summary).toBeDefined();
    });
  });
});

