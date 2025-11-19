import { INestApplication } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
import request = require('supertest');
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper, TestUser } from '../helpers/test-helper';

describe('PSP Metrics (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;
  let productOwner: TestUser;
  let scrumMaster: TestUser;
  let projectId: string;
  let sprintId: string;

  beforeAll(async () => {
    app = await TestAppFactory.createTestApp();
    testHelper = new TestHelper(app);
    productOwner = await testHelper.createTestUser();
    scrumMaster = await testHelper.createTestUser();

    const projectResponse = await testHelper
      .getAuthenticatedRequest(productOwner.token)
      .post('/api/projects')
      .send({
        name: `Proyecto PSP Metrics Test ${Date.now()}`,
        description: 'Test PSP',
        productObjective: 'Validar PSP',
        qualityCriteria: 'Tests',
        visibility: 'PRIVATE',
        sprintDuration: 2,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 28).toISOString(),
        teamMembers: [
          { userId: scrumMaster.id, role: ProjectMemberRole.SCRUM_MASTER },
        ],
      })
      .expect(201);

    projectId = projectResponse.body.project.id;

    const sprintResponse = await testHelper
      .getAuthenticatedRequest(scrumMaster.token)
      .post(`/api/projects/${projectId}/sprints`)
      .send({
        number: 1,
        name: 'Sprint 1',
        goal: 'PSP Testing',
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

  describe('GET /api/sprints/:sprintId/psp-metrics', () => {
    it('debe obtener métricas PSP del sprint', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/sprints/${sprintId}/psp-metrics`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/sprints/:sprintId/psp-metrics/recalculate', () => {
    it('debe permitir al Scrum Master recalcular métricas', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/sprints/${sprintId}/psp-metrics/recalculate`)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

