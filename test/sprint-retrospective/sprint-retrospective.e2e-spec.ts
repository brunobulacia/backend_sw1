import { INestApplication } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
import request = require('supertest');
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper, TestUser } from '../helpers/test-helper';

describe('Sprint Retrospective (e2e) - HU11 CRÍTICO', () => {
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

    const projectResponse = await testHelper
      .getAuthenticatedRequest(productOwner.token)
      .post('/api/projects')
      .send({
        name: `Proyecto Retrospective Test ${Date.now()}`,
        description: 'Test Retrospective',
        productObjective: 'Validar',
        qualityCriteria: 'Tests',
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

    const sprintResponse = await testHelper
      .getAuthenticatedRequest(scrumMaster.token)
      .post(`/api/projects/${projectId}/sprints`)
      .send({
        number: 1,
        name: 'Sprint 1',
        goal: 'Test Retrospective',
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

  describe('POST /api/sprints/:sprintId/retrospective - VALIDACIÓN CRÍTICA', () => {
    it('debe RECHAZAR retrospective SIN acciones de mejora (HU11 CRÍTICO)', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/sprints/${sprintId}/retrospective`)
        .send({
          whatWentWell: 'Todo bien',
          whatToImprove: 'Nada',
          whatToStopDoing: 'Nada',
          improvementActions: [], // VACÍO - debe rechazar
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('al menos una acción de mejora');
    });

    it('debe ACEPTAR retrospective CON al menos una acción de mejora', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/sprints/${sprintId}/retrospective`)
        .send({
          whatWentWell: 'Buena comunicación',
          whatToImprove: 'Mejorar estimaciones',
          whatToStopDoing: 'Dejar reuniones largas',
          improvementActions: [
            {
              description: 'Implementar daily scrums de 15 min máximo',
              responsible: 'Scrum Master',
              dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
            },
          ],
        })
        .expect(201);

      expect(response.body).toMatchObject({
        sprintId,
        whatWentWell: 'Buena comunicación',
      });
      expect(response.body.improvementActions).toHaveLength(1);
    });

    it('debe RECHAZAR creación por Developer (solo Scrum Master)', async () => {
      await testHelper
        .getAuthenticatedRequest(developer.token)
        .post(`/api/sprints/${sprintId}/retrospective`)
        .send({
          whatWentWell: 'Test',
          whatToImprove: 'Test',
          whatToStopDoing: 'Test',
          improvementActions: [{ description: 'Test' }],
        })
        .expect(403);
    });
  });
});

