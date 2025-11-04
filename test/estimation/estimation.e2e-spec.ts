import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper, TestUser, TestProject } from '../helpers/test-helper';
import { ProjectMemberRole } from '@prisma/client';

/**
 * Tests E2E para Planning Poker (Estimation Module)
 * 
 * Cobertura:
 * 1. Crear sesiones de estimación (solo Scrum Master)
 * 2. Enviar votos privados (todos los miembros)
 * 3. Revelar votos (solo moderador)
 * 4. Múltiples rondas si no hay consenso
 * 5. Finalizar y actualizar story points
 * 6. Consultar sesiones e histórico
 * 7. Validaciones de permisos
 */
describe('EstimationController (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;

  // Usuarios de prueba
  let productOwner: TestUser;
  let scrumMaster: TestUser;
  let developer1: TestUser;
  let developer2: TestUser;
  let outsider: TestUser; // Usuario que NO es miembro del proyecto

  // Proyecto y historia de prueba
  let testProject: TestProject;
  let testStory: any;

  /**
   * Setup: Crear la app y los datos de prueba
   */
  beforeAll(async () => {
    app = await TestAppFactory.createTestApp();
    testHelper = new TestHelper(app);

    // Crear usuarios con diferentes roles
    productOwner = await testHelper.createTestUser();
    scrumMaster = await testHelper.createTestUser();
    developer1 = await testHelper.createTestUser();
    developer2 = await testHelper.createTestUser();
    outsider = await testHelper.createTestUser();

    // Crear proyecto con equipo completo
    testProject = await testHelper.createTestProject(productOwner, {
      name: 'Proyecto Planning Poker Test',
      teamMembers: [
        { userId: scrumMaster.id, role: ProjectMemberRole.SCRUM_MASTER },
        { userId: developer1.id, role: ProjectMemberRole.DEVELOPER },
        { userId: developer2.id, role: ProjectMemberRole.DEVELOPER },
      ],
    });

    // Crear una historia de usuario para estimar
    const storyResponse = await request(app.getHttpServer())
      .post(`/api/projects/${testProject.id}/stories`)
      .set('Authorization', `Bearer ${productOwner.token}`)
      .send({
        title: 'Implementar Planning Poker',
        asA: 'Desarrollador',
        iWant: 'Participar en sesiones de estimación',
        soThat: 'Podamos planificar el sprint colaborativamente',
        acceptanceCriteria: [
          'El sistema debe permitir crear sesiones',
          'Los votos deben ser privados hasta revelarlos',
          'Se debe poder iniciar múltiples rondas',
        ],
        priority: 1,
        businessValue: 10,
        estimateHours: 0,
      })
      .expect(201);

    testStory = storyResponse.body;
  });

  /**
   * Teardown: Limpiar todos los datos de prueba
   */
  afterAll(async () => {
    await testHelper.cleanup();
    await app.close();
  });

  // ========================================================================
  // TESTS: CREAR SESIÓN DE ESTIMACIÓN
  // ========================================================================

  describe('POST /api/estimation/sessions', () => {
    it('debe permitir al Scrum Master crear una sesión de estimación', async () => {
      const sessionData = {
        projectId: testProject.id,
        name: 'Sprint 1 - Estimación Inicial',
        storyId: testStory.id,
        method: 'FIBONACCI',
      };

      const response = await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send(sessionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(sessionData.name);
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.method).toBe('FIBONACCI');
      expect(response.body.isRevealed).toBe(false);
      expect(response.body.sequence).toEqual(['1', '2', '3', '5', '8', '13', '21', '?']);
      expect(response.body.story.id).toBe(testStory.id);
      expect(response.body.moderator.id).toBe(scrumMaster.id);
    });

    it('debe permitir al Product Owner crear una sesión de estimación', async () => {
      const sessionData = {
        projectId: testProject.id,
        name: 'Estimación por Product Owner',
        storyId: testStory.id,
        method: 'FIBONACCI',
      };

      const response = await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${productOwner.token}`)
        .send(sessionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.moderator.id).toBe(productOwner.id);
    });

    it('NO debe permitir a un Developer crear sesión', async () => {
      const sessionData = {
        projectId: testProject.id,
        name: 'Intento de Developer',
        storyId: testStory.id,
        method: 'FIBONACCI',
      };

      const response = await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${developer1.token}`)
        .send(sessionData)
        .expect(403);

      expect(response.body.message).toContain('Scrum master');
    });

    it('NO debe permitir crear sesión a un usuario externo', async () => {
      const sessionData = {
        projectId: testProject.id,
        name: 'Intento externo',
        storyId: testStory.id,
        method: 'FIBONACCI',
      };

      await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${outsider.token}`)
        .send(sessionData)
        .expect(403);
    });

    it('debe fallar si la historia no existe', async () => {
      const sessionData = {
        projectId: testProject.id,
        name: 'Sesión con historia inexistente',
        storyId: '00000000-0000-0000-0000-000000000000',
        method: 'FIBONACCI',
      };

      await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send(sessionData)
        .expect(404);
    });

    it('debe crear sesión con secuencia personalizada', async () => {
      const sessionData = {
        projectId: testProject.id,
        name: 'Sesión con cartas custom',
        storyId: testStory.id,
        method: 'CUSTOM',
        customSequence: ['XS', 'S', 'M', 'L', 'XL', '?'],
      };

      const response = await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send(sessionData)
        .expect(201);

      expect(response.body.sequence).toEqual(['XS', 'S', 'M', 'L', 'XL', '?']);
    });
  });

  // ========================================================================
  // TESTS: FLUJO COMPLETO DE PLANNING POKER
  // ========================================================================

  describe('Flujo completo de Planning Poker', () => {
    let sessionId: string;

    /**
     * Escenario: Flujo exitoso con consenso en la primera ronda
     */
    it('debe completar un flujo de estimación exitoso con consenso', async () => {
      // 1. Scrum Master crea la sesión
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          projectId: testProject.id,
          name: 'Estimación con consenso',
          storyId: testStory.id,
          method: 'FIBONACCI',
        })
        .expect(201);

      sessionId = sessionResponse.body.id;
      expect(sessionResponse.body.status).toBe('DRAFT');

      // 2. Los desarrolladores votan (mismo valor = consenso)
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .send({
          voteValue: '8',
          roundNumber: 1,
          justification: 'Parece moderadamente complejo',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer2.token}`)
        .send({
          voteValue: '8',
          roundNumber: 1,
        })
        .expect(201);

      // El Scrum Master también puede votar
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          voteValue: '8',
          roundNumber: 1,
        })
        .expect(201);

      // 3. Verificar que los votos NO sean visibles aún
      const beforeReveal = await request(app.getHttpServer())
        .get(`/api/estimation/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .expect(200);

      expect(beforeReveal.body.isRevealed).toBe(false);
      expect(beforeReveal.body.votes).toEqual([]); // Vacío porque no están revelados

      // 4. Moderador revela los votos
      const revealResponse = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({ roundNumber: 1 })
        .expect(200);

      expect(revealResponse.body.isRevealed).toBe(true);
      expect(revealResponse.body.votes).toHaveLength(3);
      expect(revealResponse.body.statistics.hasConsensus).toBe(true);
      expect(revealResponse.body.statistics.hasNumericConsensus).toBe(true);

      // 5. Verificar que ahora los votos SÍ sean visibles
      const afterReveal = await request(app.getHttpServer())
        .get(`/api/estimation/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .expect(200);

      expect(afterReveal.body.isRevealed).toBe(true);
      expect(afterReveal.body.votes).toHaveLength(3);

      // 6. Finalizar la estimación con el valor acordado
      const finalizeResponse = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          finalEstimation: '8',
          estimateHours: 8,
          notes: 'Equipo acordó 8 puntos en primera ronda',
        })
        .expect(200);

      expect(finalizeResponse.body.status).toBe('CLOSED');
      expect(finalizeResponse.body.finalEstimation).toBe('8');
      expect(finalizeResponse.body.story.newEstimate).toBe(8);

      // 7. Verificar que la historia se haya actualizado
      const storiesResponse = await request(app.getHttpServer())
        .get(`/api/projects/${testProject.id}/stories`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .expect(200);

      const updatedStory = storiesResponse.body.find((s: any) => s.id === testStory.id);
      expect(updatedStory).toBeDefined();
      expect(updatedStory.estimateHours).toBe(8);
    });

    /**
     * Escenario: Sin consenso, se requiere una segunda ronda
     */
    it('debe manejar múltiples rondas cuando no hay consenso', async () => {
      // 1. Crear sesión
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          projectId: testProject.id,
          name: 'Estimación con desacuerdo',
          storyId: testStory.id,
          method: 'FIBONACCI',
        })
        .expect(201);

      sessionId = sessionResponse.body.id;

      // 2. Ronda 1: Votos diferentes (NO hay consenso)
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .send({ voteValue: '3', roundNumber: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer2.token}`)
        .send({ voteValue: '13', roundNumber: 1 })
        .expect(201);

      // 3. Revelar votos de ronda 1
      const reveal1 = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({ roundNumber: 1 })
        .expect(200);

      expect(reveal1.body.statistics.hasConsensus).toBe(false);
      expect(reveal1.body.statistics.uniqueValues).toBe(2);

      // 4. Iniciar nueva ronda (después de discutir)
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/new-round`)
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          newRoundNumber: 2,
          reason: 'Necesitamos aclarar los criterios de aceptación',
        })
        .expect(200);

      // 5. Ronda 2: Ahora hay acuerdo
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .send({ voteValue: '5', roundNumber: 2 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer2.token}`)
        .send({ voteValue: '5', roundNumber: 2 })
        .expect(201);

      // 6. Revelar votos de ronda 2
      const reveal2 = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({ roundNumber: 2 })
        .expect(200);

      expect(reveal2.body.statistics.hasConsensus).toBe(true);

      // 7. Finalizar
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          finalEstimation: '5',
          estimateHours: 5,
        })
        .expect(200);

      // 8. Verificar histórico (debe tener 2 rondas)
      const history = await request(app.getHttpServer())
        .get(`/api/estimation/sessions/${sessionId}/history`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .expect(200);

      expect(history.body.totalRounds).toBe(2);
      expect(history.body.rounds[0].votes).toHaveLength(2);
      expect(history.body.rounds[1].votes).toHaveLength(2);
    });
  });

  // ========================================================================
  // TESTS: ENVIAR VOTOS
  // ========================================================================

  describe('POST /api/estimation/sessions/:id/vote', () => {
    let sessionId: string;

    beforeEach(async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          projectId: testProject.id,
          name: 'Test Votación',
          storyId: testStory.id,
          method: 'FIBONACCI',
        })
        .expect(201);

      sessionId = sessionResponse.body.id;
    });

    it('debe permitir votar a cualquier miembro del proyecto', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .send({
          voteValue: '5',
          roundNumber: 1,
        })
        .expect(201);

      expect(response.body.voteValue).toBe('5');
      expect(response.body.roundNumber).toBe(1);
      expect(response.body.user.id).toBe(developer1.id);
    });

    it('debe aceptar la carta "?" (necesito más información)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer2.token}`)
        .send({
          voteValue: '?',
          roundNumber: 1,
          justification: 'Necesito más detalles sobre los requisitos',
        })
        .expect(201);

      expect(response.body.voteValue).toBe('?');
      expect(response.body.justification).toBe('Necesito más detalles sobre los requisitos');
    });

    it('NO debe permitir votar dos veces en la misma ronda', async () => {
      // Primer voto
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .send({ voteValue: '3', roundNumber: 1 })
        .expect(201);

      // Segundo voto (debe fallar)
      const response = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .send({ voteValue: '5', roundNumber: 1 })
        .expect(400);

      expect(response.body.message).toContain('Ya votaste');
    });

    it('NO debe permitir votar con un valor inválido', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .send({
          voteValue: '99', // No está en la secuencia Fibonacci
          roundNumber: 1,
        })
        .expect(400);

      expect(response.body.message).toContain('Valor del voto invalido');
    });

    it('NO debe permitir votar a usuarios externos', async () => {
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .send({ voteValue: '5', roundNumber: 1 })
        .expect(403);
    });
  });

  // ========================================================================
  // TESTS: REVELAR VOTOS (Solo moderador)
  // ========================================================================

  describe('POST /api/estimation/sessions/:id/reveal', () => {
    let sessionId: string;

    beforeEach(async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          projectId: testProject.id,
          name: 'Test Revelar',
          storyId: testStory.id,
          method: 'FIBONACCI',
        })
        .expect(201);

      sessionId = sessionResponse.body.id;

      // Crear algunos votos
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .send({ voteValue: '8', roundNumber: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer2.token}`)
        .send({ voteValue: '5', roundNumber: 1 })
        .expect(201);
    });

    it('debe permitir al moderador revelar los votos', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({ roundNumber: 1 })
        .expect(200);

      expect(response.body.isRevealed).toBe(true);
      expect(response.body.votes).toHaveLength(2);
      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.totalVotes).toBe(2);
    });

    it('NO debe permitir a un developer revelar los votos', async () => {
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .send({ roundNumber: 1 })
        .expect(403);
    });

    it('debe fallar si no hay votos en la ronda', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/reveal`)
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({ roundNumber: 99 }) // Ronda que no existe
        .expect(400);

      expect(response.body.message).toContain('No se encotraron votos');
    });
  });

  // ========================================================================
  // TESTS: FINALIZAR ESTIMACIÓN (Solo moderador)
  // ========================================================================

  describe('POST /api/estimation/sessions/:id/finalize', () => {
    let sessionId: string;

    beforeEach(async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          projectId: testProject.id,
          name: 'Test Finalizar',
          storyId: testStory.id,
          method: 'FIBONACCI',
        })
        .expect(201);

      sessionId = sessionResponse.body.id;
    });

    it('debe permitir al moderador finalizar la sesión', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          finalEstimation: '13',
          estimateHours: 13,
          notes: 'Acuerdo del equipo',
        })
        .expect(200);

      expect(response.body.status).toBe('CLOSED');
      expect(response.body.finalEstimation).toBe('13');
      expect(response.body.story.newEstimate).toBe(13);
    });

    it('NO debe permitir a un developer finalizar', async () => {
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .send({
          finalEstimation: '8',
          estimateHours: 8,
        })
        .expect(403);
    });

    it('NO debe permitir votar en una sesión cerrada', async () => {
      // Finalizar la sesión
      await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          finalEstimation: '5',
          estimateHours: 5,
        })
        .expect(200);

      // Intentar votar
      const response = await request(app.getHttpServer())
        .post(`/api/estimation/sessions/${sessionId}/vote`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .send({ voteValue: '8', roundNumber: 1 })
        .expect(400);

      expect(response.body.message).toContain('cerrada');
    });
  });

  // ========================================================================
  // TESTS: CONSULTAR SESIONES
  // ========================================================================

  describe('GET /api/estimation/sessions/:id', () => {
    let sessionId: string;

    beforeEach(async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          projectId: testProject.id,
          name: 'Test Consulta',
          storyId: testStory.id,
          method: 'FIBONACCI',
        })
        .expect(201);

      sessionId = sessionResponse.body.id;
    });

    it('debe retornar los detalles completos de la sesión', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/estimation/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .expect(200);

      expect(response.body.id).toBe(sessionId);
      expect(response.body.story).toBeDefined();
      expect(response.body.story.acceptanceCriteria).toBeInstanceOf(Array);
      expect(response.body.moderator).toBeDefined();
      expect(response.body.sequence).toEqual(['1', '2', '3', '5', '8', '13', '21', '?']);
    });

    it('NO debe permitir acceso a usuarios externos', async () => {
      await request(app.getHttpServer())
        .get(`/api/estimation/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .expect(403);
    });
  });

  describe('GET /api/estimation/projects/:projectId', () => {
    it('debe listar todas las sesiones del proyecto', async () => {
      // Crear varias sesiones
      await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          projectId: testProject.id,
          name: 'Sesión 1',
          storyId: testStory.id,
          method: 'FIBONACCI',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/estimation/sessions')
        .set('Authorization', `Bearer ${scrumMaster.token}`)
        .send({
          projectId: testProject.id,
          name: 'Sesión 2',
          storyId: testStory.id,
          method: 'TSHIRT',
        })
        .expect(201);

      // Listar
      const response = await request(app.getHttpServer())
        .get(`/api/estimation/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${developer1.token}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });
});