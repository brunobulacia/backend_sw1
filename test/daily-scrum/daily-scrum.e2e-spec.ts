import { INestApplication } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
import request = require('supertest');
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper, TestUser } from '../helpers/test-helper';

describe('Daily Scrum (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;
  let productOwner: TestUser;
  let scrumMaster: TestUser;
  let developer1: TestUser;
  let developer2: TestUser;
  let projectId: string;
  let sprintId: string;
  let storyId1: string;
  let storyId2: string;

  beforeAll(async () => {
    app = await TestAppFactory.createTestApp();
    testHelper = new TestHelper(app);
    productOwner = await testHelper.createTestUser();
    scrumMaster = await testHelper.createTestUser();
    developer1 = await testHelper.createTestUser();
    developer2 = await testHelper.createTestUser();

    // Crear proyecto con equipo completo
    const projectResponse = await testHelper
      .getAuthenticatedRequest(productOwner.token)
      .post('/api/projects')
      .send({
        name: `Proyecto Daily Scrum Test ${Date.now()}`,
        description: 'Proyecto para testing de Daily Scrum',
        productObjective: 'Validar funcionalidad de Daily Scrum',
        qualityCriteria: 'Cobertura de tests completa',
        visibility: 'PRIVATE',
        sprintDuration: 2,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 28).toISOString(),
        teamMembers: [
          { userId: scrumMaster.id, role: ProjectMemberRole.SCRUM_MASTER },
          { userId: developer1.id, role: ProjectMemberRole.DEVELOPER },
          { userId: developer2.id, role: ProjectMemberRole.DEVELOPER },
        ],
      })
      .expect(201);

    projectId = projectResponse.body.project.id;

    // Crear historias de usuario
    const story1Response = await testHelper
      .getAuthenticatedRequest(productOwner.token)
      .post(`/api/projects/${projectId}/stories`)
      .send({
        title: 'Historia 1 para Daily Scrum',
        asA: 'Developer',
        iWant: 'implementar funcionalidad X',
        soThat: 'el sistema funcione correctamente',
        acceptanceCriteria: ['Criterio 1', 'Criterio 2'],
        priority: 8,
        businessValue: 8,
        estimateHours: 8,
      })
      .expect(201);

    storyId1 = story1Response.body.id;

    const story2Response = await testHelper
      .getAuthenticatedRequest(productOwner.token)
      .post(`/api/projects/${projectId}/stories`)
      .send({
        title: 'Historia 2 para Daily Scrum',
        asA: 'Developer',
        iWant: 'implementar funcionalidad Y',
        soThat: 'el sistema funcione correctamente',
        acceptanceCriteria: ['Criterio 1'],
        priority: 5,
        businessValue: 5,
        estimateHours: 5,
      })
      .expect(201);

    storyId2 = story2Response.body.id;

    // Crear sprint
    const sprintResponse = await testHelper
      .getAuthenticatedRequest(scrumMaster.token)
      .post(`/api/projects/${projectId}/sprints`)
      .send({
        number: 1,
        name: 'Sprint 1',
        goal: 'Completar daily scrum feature',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
        duration: 2,
      })
      .expect(201);

    sprintId = sprintResponse.body.id;

    // Agregar historias al sprint
    await testHelper
      .getAuthenticatedRequest(scrumMaster.token)
      .post(`/api/projects/${projectId}/sprints/${sprintId}/add-stories`)
      .send({
        storyIds: [storyId1, storyId2],
      })
      .expect(201);

    // Iniciar el sprint
    await testHelper
      .getAuthenticatedRequest(scrumMaster.token)
      .post(`/api/projects/${projectId}/sprints/${sprintId}/start`)
      .expect(201);
  });

  afterAll(async () => {
    await testHelper.cleanup();
    await app.close();
  });

  describe('POST /daily-scrum - Crear Daily Scrum', () => {
    it('debe permitir a un developer crear un daily scrum', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Revisé el backlog y planifiqué tareas',
          whatWillDoToday: 'Implementar funcionalidad de login',
          impediments: 'Ninguno',
          storyIds: [storyId1],
        })
        .expect(201);

      expect(response.body).toMatchObject({
        sprintId,
        userId: developer1.id,
        date: today,
        whatDidYesterday: 'Revisé el backlog y planifiqué tareas',
        whatWillDoToday: 'Implementar funcionalidad de login',
        impediments: 'Ninguno',
      });

      expect(response.body.linkedStories).toHaveLength(1);
      expect(response.body.linkedStories[0].id).toBe(storyId1);
    });

    it('debe permitir crear un daily sin impedimentos', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await testHelper
        .getAuthenticatedRequest(developer2.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Configuré el ambiente de desarrollo',
          whatWillDoToday: 'Implementar funcionalidad de registro',
        })
        .expect(201);

      expect(response.body.impediments).toBeUndefined();
    });

    it('debe rechazar daily con fecha fuera del rango del sprint', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
        .toISOString()
        .split('T')[0];

      await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: futureDate,
          whatDidYesterday: 'Algo',
          whatWillDoToday: 'Algo más',
        })
        .expect(400);
    });

    it('debe actualizar daily existente si ya hay uno para ese día', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Crear daily
      const response1 = await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Primera versión',
          whatWillDoToday: 'Primera versión',
        })
        .expect(201);

      const dailyId = response1.body.id;

      // Actualizar (creando de nuevo)
      const response2 = await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Segunda versión',
          whatWillDoToday: 'Segunda versión',
        })
        .expect(201);

      // Debe ser el mismo daily actualizado
      expect(response2.body.id).toBe(dailyId);
      expect(response2.body.whatDidYesterday).toBe('Segunda versión');
    });
  });

  describe('GET /daily-scrum/:id - Obtener Daily por ID', () => {
    it('debe obtener un daily scrum por ID', async () => {
      const today = new Date().toISOString().split('T')[0];

      const createResponse = await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Algo ayer',
          whatWillDoToday: 'Algo hoy',
          storyIds: [storyId1, storyId2],
        })
        .expect(201);

      const dailyId = createResponse.body.id;

      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/daily-scrum/${dailyId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: dailyId,
        sprintId,
        userId: developer1.id,
      });

      expect(response.body.linkedStories).toHaveLength(2);
    });

    it('debe rechazar acceso a daily de proyecto privado sin permisos', async () => {
      const today = new Date().toISOString().split('T')[0];

      const createResponse = await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Algo',
          whatWillDoToday: 'Algo',
        })
        .expect(201);

      const dailyId = createResponse.body.id;

      // Usuario sin acceso al proyecto
      const outsider = await testHelper.createTestUser();

      await testHelper
        .getAuthenticatedRequest(outsider.token)
        .get(`/api/daily-scrum/${dailyId}`)
        .expect(403);
    });
  });

  describe('PUT /daily-scrum/:id - Actualizar Daily', () => {
    it('debe permitir actualizar daily del día actual', async () => {
      const today = new Date().toISOString().split('T')[0];

      const createResponse = await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Versión original',
          whatWillDoToday: 'Versión original',
        })
        .expect(201);

      const dailyId = createResponse.body.id;

      const response = await testHelper
        .getAuthenticatedRequest(developer1.token)
        .put(`/api/daily-scrum/${dailyId}`)
        .send({
          whatDidYesterday: 'Versión actualizada',
          impediments: 'Problema con el servidor',
        })
        .expect(200);

      expect(response.body.whatDidYesterday).toBe('Versión actualizada');
      expect(response.body.impediments).toBe('Problema con el servidor');
    });

    it('debe rechazar actualización de daily de otro usuario', async () => {
      const today = new Date().toISOString().split('T')[0];

      const createResponse = await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Mi daily',
          whatWillDoToday: 'Mi daily',
        })
        .expect(201);

      const dailyId = createResponse.body.id;

      await testHelper
        .getAuthenticatedRequest(developer2.token)
        .put(`/api/daily-scrum/${dailyId}`)
        .send({
          whatDidYesterday: 'Intento modificar',
        })
        .expect(403);
    });
  });

  describe('GET /daily-scrum/sprint/:sprintId - Listar Dailies del Sprint', () => {
    it('debe listar todos los dailies del sprint', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Crear dailies para múltiples usuarios
      await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Dev1 ayer',
          whatWillDoToday: 'Dev1 hoy',
        })
        .expect(201);

      await testHelper
        .getAuthenticatedRequest(developer2.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Dev2 ayer',
          whatWillDoToday: 'Dev2 hoy',
        })
        .expect(201);

      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/daily-scrum/sprint/${sprintId}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('debe filtrar dailies por fecha', async () => {
      const today = new Date().toISOString().split('T')[0];

      await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Algo',
          whatWillDoToday: 'Algo',
        })
        .expect(201);

      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/daily-scrum/sprint/${sprintId}?date=${today}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((daily: any) => {
        expect(daily.date).toBe(today);
      });
    });

    it('debe filtrar dailies por miembro del equipo', async () => {
      const today = new Date().toISOString().split('T')[0];

      await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Algo',
          whatWillDoToday: 'Algo',
        })
        .expect(201);

      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/daily-scrum/sprint/${sprintId}?memberId=${developer1.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((daily: any) => {
        expect(daily.userId).toBe(developer1.id);
      });
    });
  });

  describe('GET /daily-scrum/sprint/:sprintId/consolidated - Vista Consolidada', () => {
    it('debe obtener vista consolidada del daily para el Scrum Master', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Crear dailies con impedimentos
      await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Dev1 ayer',
          whatWillDoToday: 'Dev1 hoy',
          impediments: 'Problema con la base de datos',
        })
        .expect(201);

      await testHelper
        .getAuthenticatedRequest(developer2.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Dev2 ayer',
          whatWillDoToday: 'Dev2 hoy',
        })
        .expect(201);

      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/daily-scrum/sprint/${sprintId}/consolidated?date=${today}`)
        .expect(200);

      expect(response.body).toMatchObject({
        date: today,
        sprintId,
      });

      expect(response.body.entries).toBeInstanceOf(Array);
      expect(response.body.entries.length).toBeGreaterThanOrEqual(2);

      expect(response.body.impediments).toBeInstanceOf(Array);
      expect(response.body.impediments.length).toBeGreaterThanOrEqual(1);
      
      const impediment = response.body.impediments.find(
        (i: any) => i.userId === developer1.id,
      );
      expect(impediment).toBeDefined();
      expect(impediment.impediment).toBe('Problema con la base de datos');
    });
  });

  describe('GET /daily-scrum/sprint/:sprintId/history - Historial', () => {
    it('debe obtener historial de dailies agrupado por fecha', async () => {
      const today = new Date().toISOString().split('T')[0];

      await testHelper
        .getAuthenticatedRequest(developer1.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Historia dev1',
          whatWillDoToday: 'Historia dev1',
        })
        .expect(201);

      await testHelper
        .getAuthenticatedRequest(developer2.token)
        .post('/api/daily-scrum')
        .send({
          sprintId,
          date: today,
          whatDidYesterday: 'Historia dev2',
          whatWillDoToday: 'Historia dev2',
        })
        .expect(201);

      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/daily-scrum/sprint/${sprintId}/history`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const todayHistory = response.body.find((h: any) => h.date === today);
      expect(todayHistory).toBeDefined();
      expect(todayHistory.entries.length).toBeGreaterThanOrEqual(2);
    });
  });
});

