import { INestApplication } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
import request = require('supertest');
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper, TestUser } from '../helpers/test-helper';

describe('Burndown & Metrics (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;
  let productOwner: TestUser;
  let scrumMaster: TestUser;
  let developer: TestUser;
  let projectId: string;
  let sprintId: string;
  let storyId: string;
  let taskId: string;

  beforeAll(async () => {
    app = await TestAppFactory.createTestApp();
    testHelper = new TestHelper(app);
    productOwner = await testHelper.createTestUser();
    scrumMaster = await testHelper.createTestUser();
    developer = await testHelper.createTestUser();

    // Crear proyecto con equipo completo
    const projectResponse = await testHelper
      .getAuthenticatedRequest(productOwner.token)
      .post('/api/projects')
      .send({
        name: `Proyecto Burndown Test ${Date.now()}`,
        description: 'Proyecto para testing de burndown charts',
        productObjective: 'Validar funcionalidad de métricas',
        qualityCriteria: 'Cobertura de tests completa',
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

    // Crear user story con estimación
    const storyResponse = await testHelper
      .getAuthenticatedRequest(productOwner.token)
      .post(`/api/projects/${projectId}/stories`)
      .send({
        title: 'Historia de prueba para burndown',
        asA: 'Scrum Master',
        iWant: 'visualizar el progreso del sprint',
        soThat: 'pueda tomar decisiones informadas',
        acceptanceCriteria: [
          'El gráfico burndown muestra línea ideal y real',
          'Las métricas se actualizan automáticamente',
          'Los snapshots se crean diariamente',
        ],
        priority: 8,
        businessValue: 8,
        estimateHours: 16,
        description: 'Historia para testing de métricas',
      })
      .expect(201);

    storyId = storyResponse.body.id;

    // Crear sprint
    const sprintResponse = await testHelper
      .getAuthenticatedRequest(scrumMaster.token)
      .post(`/api/projects/${projectId}/sprints`)
      .send({
        number: 1,
        name: 'Sprint 1',
        goal: 'Completar features de burndown',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
        duration: 2,
      })
      .expect(201);

    sprintId = sprintResponse.body.id;

    // Agregar historia al sprint
    await testHelper
      .getAuthenticatedRequest(scrumMaster.token)
      .post(`/api/projects/${projectId}/sprints/${sprintId}/add-stories`)
      .send({
        storyIds: [storyId],
      })
      .expect(201);

    // Crear tarea para la historia
    const taskResponse = await testHelper
      .getAuthenticatedRequest(developer.token)
      .post(`/api/projects/${projectId}/sprints/${sprintId}/tasks`)
      .send({
        title: 'Tarea de prueba',
        description: 'Implementar funcionalidad',
        storyId: storyId,
        effort: 8,
        assignedToId: developer.id,
      })
      .expect(201);

    taskId = taskResponse.body.id;

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

  describe('GET /api/projects/:projectId/sprints/:sprintId/burndown', () => {
    it('retorna el gráfico de burndown completo con datos correctos', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/sprints/${sprintId}/burndown`)
        .expect(200);

      // Validar estructura de respuesta
      expect(response.body).toHaveProperty('sprintInfo');
      expect(response.body).toHaveProperty('chartData');
      expect(response.body).toHaveProperty('dailySnapshots');
      expect(response.body).toHaveProperty('summary');

      // Validar sprintInfo
      const { sprintInfo } = response.body;
      expect(sprintInfo.name).toBe('Sprint 1');
      expect(sprintInfo.number).toBe(1);
      expect(sprintInfo.status).toBe('IN_PROGRESS');
      expect(sprintInfo.duration).toBe(2);

      // Validar chartData
      const { chartData } = response.body;
      expect(chartData).toHaveProperty('dates');
      expect(chartData).toHaveProperty('idealLine');
      expect(chartData).toHaveProperty('actualLine');
      expect(chartData).toHaveProperty('effortCommitted');
      expect(chartData).toHaveProperty('totalDays');
      expect(chartData).toHaveProperty('daysElapsed');

      expect(Array.isArray(chartData.dates)).toBe(true);
      expect(Array.isArray(chartData.idealLine)).toBe(true);
      expect(Array.isArray(chartData.actualLine)).toBe(true);
      expect(chartData.effortCommitted).toBeGreaterThan(0);

      // Validar que las líneas tienen la misma longitud
      expect(chartData.idealLine.length).toBe(chartData.dates.length);
      expect(chartData.actualLine.length).toBe(chartData.dates.length);

      // Validar summary
      const { summary } = response.body;
      expect(summary).toHaveProperty('effortCommitted');
      expect(summary).toHaveProperty('effortCompleted');
      expect(summary).toHaveProperty('effortRemaining');
      expect(summary).toHaveProperty('percentageComplete');
      expect(summary).toHaveProperty('isOnTrack');
      expect(summary).toHaveProperty('daysRemaining');
      expect(summary).toHaveProperty('velocityNeeded');

      expect(summary.effortCommitted).toBeGreaterThan(0);
      expect(summary.percentageComplete).toBeGreaterThanOrEqual(0);
      expect(summary.percentageComplete).toBeLessThanOrEqual(100);
      expect(typeof summary.isOnTrack).toBe('boolean');

      // Validar dailySnapshots
      expect(Array.isArray(response.body.dailySnapshots)).toBe(true);
      expect(response.body.dailySnapshots.length).toBeGreaterThan(0);

      const snapshot = response.body.dailySnapshots[0];
      expect(snapshot).toHaveProperty('date');
      expect(snapshot).toHaveProperty('effortRemaining');
      expect(snapshot).toHaveProperty('effortCompleted');
      expect(snapshot).toHaveProperty('effortCommitted');
      expect(snapshot).toHaveProperty('storiesCompleted');
      expect(snapshot).toHaveProperty('storiesTotal');
      expect(snapshot).toHaveProperty('tasksCompleted');
      expect(snapshot).toHaveProperty('tasksTotal');
    });

    it('crea un snapshot automáticamente si no existe para el día actual', async () => {
      // Obtener burndown (debería crear snapshot si no existe)
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/sprints/${sprintId}/burndown`)
        .expect(200);

      // Verificar que hay al menos un snapshot
      expect(response.body.dailySnapshots.length).toBeGreaterThan(0);

      // Verificar que el último snapshot tiene una fecha válida
      const lastSnapshot = response.body.dailySnapshots[response.body.dailySnapshots.length - 1];
      expect(lastSnapshot.date).toBeDefined();
      expect(new Date(lastSnapshot.date)).toBeInstanceOf(Date);
    });

    it('retorna 404 si el sprint no existe', async () => {
      await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/sprints/00000000-0000-0000-0000-000000000000/burndown`)
        .expect(404);
    });

    it('retorna 403 si el usuario no tiene acceso al proyecto', async () => {
      const unauthorizedUser = await testHelper.createTestUser();
      
      await testHelper
        .getAuthenticatedRequest(unauthorizedUser.token)
        .get(`/api/projects/${projectId}/sprints/${sprintId}/burndown`)
        .expect(403);
    });
  });

  describe('GET /api/projects/:projectId/sprints/:sprintId/metrics', () => {
    it('retorna métricas detalladas del sprint', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/sprints/${sprintId}/metrics`)
        .expect(200);

      // Validar estructura de métricas
      expect(response.body).toHaveProperty('effort');
      expect(response.body).toHaveProperty('stories');
      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('velocity');
      expect(response.body).toHaveProperty('timeline');
      expect(response.body).toHaveProperty('onTrack');

      // Validar effort
      const { effort } = response.body;
      expect(effort).toHaveProperty('committed');
      expect(effort).toHaveProperty('completed');
      expect(effort).toHaveProperty('remaining');
      expect(effort).toHaveProperty('percentage');
      expect(effort.committed).toBeGreaterThan(0);
      expect(effort.remaining).toBeGreaterThanOrEqual(0);
      expect(effort.percentage).toBeGreaterThanOrEqual(0);
      expect(effort.percentage).toBeLessThanOrEqual(100);

      // Validar stories
      const { stories } = response.body;
      expect(stories).toHaveProperty('total');
      expect(stories).toHaveProperty('backlog');
      expect(stories).toHaveProperty('inProgress');
      expect(stories).toHaveProperty('done');
      expect(stories.total).toBeGreaterThan(0);

      // Validar tasks
      const { tasks } = response.body;
      expect(tasks).toHaveProperty('total');
      expect(tasks).toHaveProperty('todo');
      expect(tasks).toHaveProperty('inProgress');
      expect(tasks).toHaveProperty('done');
      expect(tasks.total).toBeGreaterThan(0);

      // Validar velocity
      const { velocity } = response.body;
      expect(velocity).toHaveProperty('planned');
      expect(velocity).toHaveProperty('actual');
      expect(velocity).toHaveProperty('needed');
      expect(velocity.planned).toBeGreaterThan(0);

      // Validar timeline
      const { timeline } = response.body;
      expect(timeline).toHaveProperty('daysElapsed');
      expect(timeline).toHaveProperty('daysRemaining');
      expect(timeline).toHaveProperty('daysTotal');
      expect(timeline).toHaveProperty('percentageTimeElapsed');
      expect(timeline.daysTotal).toBeGreaterThan(0);
      expect(timeline.percentageTimeElapsed).toBeGreaterThanOrEqual(0);
      expect(timeline.percentageTimeElapsed).toBeLessThanOrEqual(100);
    });
  });

  describe('POST /api/projects/:projectId/sprints/:sprintId/snapshots', () => {
    it('crea un snapshot manual del sprint', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/sprints/${sprintId}/snapshots`)
        .send({})
        .expect(201);

      // Validar estructura del snapshot
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('sprintId');
      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('effortRemaining');
      expect(response.body).toHaveProperty('effortCompleted');
      expect(response.body).toHaveProperty('effortCommitted');
      expect(response.body).toHaveProperty('storiesCompleted');
      expect(response.body).toHaveProperty('storiesTotal');
      expect(response.body).toHaveProperty('tasksCompleted');
      expect(response.body).toHaveProperty('tasksTotal');

      expect(response.body.sprintId).toBe(sprintId);
    });

    it('crea un snapshot con fecha específica', async () => {
      const customDate = new Date('2024-11-15').toISOString();
      
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/sprints/${sprintId}/snapshots`)
        .send({ date: customDate })
        .expect(201);

      // Solo verificar que la fecha del snapshot está dentro del rango correcto
      const snapshotDate = new Date(response.body.date);
      const expectedDate = new Date('2024-11-15');
      
      // Verificar año, mes y día (ignorando timezone issues)
      expect(snapshotDate.getUTCFullYear()).toBe(expectedDate.getUTCFullYear());
      expect(snapshotDate.getUTCMonth()).toBe(expectedDate.getUTCMonth());
      // El día puede variar por ±1 debido a timezone
      expect(Math.abs(snapshotDate.getUTCDate() - expectedDate.getUTCDate())).toBeLessThanOrEqual(1);
    });

    it('actualiza un snapshot existente si ya existe para esa fecha', async () => {
      const today = new Date().toISOString();

      // Crear primer snapshot
      const response1 = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/sprints/${sprintId}/snapshots`)
        .send({ date: today })
        .expect(201);

      const snapshotId1 = response1.body.id;

      // Crear segundo snapshot para la misma fecha (debería actualizar)
      const response2 = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/sprints/${sprintId}/snapshots`)
        .send({ date: today })
        .expect(201);

      const snapshotId2 = response2.body.id;

      // Deberían tener el mismo ID (actualización, no creación)
      expect(snapshotId1).toBe(snapshotId2);
    });
  });

  describe('GET /api/projects/:projectId/sprints/:sprintId/snapshots', () => {
    it('retorna el historial completo de snapshots ordenados por fecha', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/sprints/${sprintId}/snapshots`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verificar que están ordenados por fecha ascendente
      for (let i = 1; i < response.body.length; i++) {
        const date1 = new Date(response.body[i - 1].date);
        const date2 = new Date(response.body[i].date);
        expect(date1.getTime()).toBeLessThanOrEqual(date2.getTime());
      }

      // Verificar estructura de cada snapshot
      response.body.forEach((snapshot: any) => {
        expect(snapshot).toHaveProperty('id');
        expect(snapshot).toHaveProperty('sprintId');
        expect(snapshot).toHaveProperty('date');
        expect(snapshot).toHaveProperty('effortRemaining');
        expect(snapshot).toHaveProperty('effortCompleted');
        expect(snapshot).toHaveProperty('effortCommitted');
      });
    });

    it('retorna array vacío si no hay snapshots', async () => {
      // Crear un nuevo sprint sin snapshots
      const newSprintResponse = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .post(`/api/projects/${projectId}/sprints`)
        .send({
          number: 2,
          name: 'Sprint sin snapshots',
          goal: 'Testing de snapshots vacíos',
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 29).toISOString(),
          duration: 2,
        })
        .expect(201);

      const newSprintId = newSprintResponse.body.id;

      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/sprints/${newSprintId}/snapshots`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/projects/:projectId/sprints/:sprintId/burndown/export', () => {
    it('exporta el burndown como PNG por defecto', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/sprints/${sprintId}/burndown/export`)
        .expect(200);

      // Verificar headers
      expect(response.headers['content-type']).toBe('image/png');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.png');

      // Verificar que es un buffer de imagen
      expect(Buffer.isBuffer(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('exporta el burndown como PDF cuando se especifica', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/sprints/${sprintId}/burndown/export?format=pdf`)
        .expect(200);

      // Verificar headers
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.pdf');

      // Verificar que es un buffer
      expect(Buffer.isBuffer(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('acepta parámetros personalizados de width y height', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(scrumMaster.token)
        .get(`/api/projects/${projectId}/sprints/${sprintId}/burndown/export?width=1600&height=900`)
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
      expect(Buffer.isBuffer(response.body)).toBe(true);
    });
  });
});
