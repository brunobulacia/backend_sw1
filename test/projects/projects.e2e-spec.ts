import { INestApplication } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
import request = require('supertest');
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper, TestUser } from '../helpers/test-helper';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;
  let adminUser: TestUser;
  let regularUser: TestUser;
  let otherUser: TestUser;

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
    it('crea un proyecto Scrum con configuracion inicial y confirma la creacion', async () => {
      const scrumMaster = await testHelper.createTestUser();
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 1000 * 60 * 60 * 24 * 21);

      const payload = {
        name: `Proyecto Configurado ${Date.now()}`,
        description: 'Proyecto orientado a validar la creacion completa',
        productObjective:
          'Entregar una base de trabajo alineada a la metodologia Scrum',
        qualityCriteria:
          'Definicion clara de calidad y cobertura de pruebas superior al 80%',
        visibility: 'PRIVATE',
        sprintDuration: 3,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        teamMembers: [
          { userId: regularUser.id, role: ProjectMemberRole.PRODUCT_OWNER },
          { userId: scrumMaster.id, role: ProjectMemberRole.SCRUM_MASTER },
        ],
      };

      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/projects')
        .send(payload)
        .expect(201);

      expect(response.body.message).toBe('Proyecto creado exitosamente');

      const project = response.body.project;
      expect(project).toBeDefined();
      expect(project.name).toBe(payload.name);
      expect(project.code).toMatch(/^[A-Z]{2,4}-\d{4}(-\d+)?$/);
      expect(project.sprintDuration).toBe(payload.sprintDuration);
      expect(project.ownerId).toBe(regularUser.id);
      expect(project.qualityCriteria).toBe(payload.qualityCriteria);
      expect(project.members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: regularUser.id,
            role: ProjectMemberRole.PRODUCT_OWNER,
          }),
          expect.objectContaining({
            userId: scrumMaster.id,
            role: ProjectMemberRole.SCRUM_MASTER,
          }),
        ]),
      );
    });

    it('usa duracion de sprint por defecto cuando no se especifica', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/projects')
        .send({
          name: `Proyecto Default Sprint ${Date.now()}`,
          description: 'Proyecto con duracion por defecto',
          productObjective: 'Validar sprint de dos semanas por defecto',
          qualityCriteria: 'Equipo aplica control de calidad semanal',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
          teamMembers: [
            {
              userId: regularUser.id,
              role: ProjectMemberRole.PRODUCT_OWNER,
            },
          ],
        })
        .expect(201);

      expect(response.body.project.sprintDuration).toBe(2);
    });

    it('rechaza nombres de proyecto duplicados', async () => {
      const duplicatedName = `Proyecto Unico ${Date.now()}`;

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/projects')
        .send({
          name: duplicatedName,
          description: 'Proyecto base para validar nombre unico',
          productObjective: 'Mantener la unicidad del nombre de proyecto',
          qualityCriteria: 'Verificacion manual y automatica del entregable',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
          teamMembers: [
            {
              userId: regularUser.id,
              role: ProjectMemberRole.PRODUCT_OWNER,
            },
          ],
        })
        .expect(201);

      const duplicateResponse = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/projects')
        .send({
          name: duplicatedName,
          description: 'Intento duplicado',
          productObjective: 'Duplicidad no permitida',
          qualityCriteria: 'Control duplicado',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
          teamMembers: [
            {
              userId: regularUser.id,
              role: ProjectMemberRole.PRODUCT_OWNER,
            },
          ],
        });

      expect(duplicateResponse.status).toBe(409);
    });

    it('impide declarar a otro usuario como Product Owner', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/projects')
        .send({
          name: `Proyecto Rol Invalido ${Date.now()}`,
          description: 'Intento de asignar Product Owner distinto',
          productObjective: 'Validar reglas de asignacion de roles',
          qualityCriteria:
            'Equipo cumple con criterios de calidad preestablecidos',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
          sprintDuration: 1,
          teamMembers: [
            {
              userId: otherUser.id,
              role: ProjectMemberRole.PRODUCT_OWNER,
            },
          ],
        })
        .expect(403);

      expect(response.body.message).toContain('Product Owner');
    });

    it('requiere autenticacion para crear proyectos', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .send({
          name: 'Proyecto sin autenticacion',
          description: 'Intento sin credenciales',
          productObjective: 'Debe ser rechazado',
          qualityCriteria: 'No aplica',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
          teamMembers: [
            {
              userId: regularUser.id,
              role: ProjectMemberRole.PRODUCT_OWNER,
            },
          ],
        })
        .expect(401);
    });

    it('rechaza duraciones de sprint fuera del rango permitido', async () => {
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post('/api/projects')
        .send({
          name: `Proyecto Sprint Invalido ${Date.now()}`,
          description: 'Duracion fuera de rango',
          productObjective: 'Validar limites de sprint',
          qualityCriteria: 'Control de calidad basico',
          sprintDuration: 6,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
          teamMembers: [
            {
              userId: regularUser.id,
              role: ProjectMemberRole.PRODUCT_OWNER,
            },
          ],
        })
        .expect(400);
    });
  });

  describe('/api/projects (GET)', () => {
    beforeAll(async () => {
      await testHelper.createTestProject(regularUser);
      await testHelper.createTestProject(regularUser, {
        visibility: 'PUBLIC',
      });
      await testHelper.createTestProject(adminUser);
    });

    it('lista proyectos accesibles para el usuario autenticado', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get('/api/projects')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      response.body.forEach((project: any) => {
        expect(project).toHaveProperty('code');
        expect(project).toHaveProperty('ownerId');
        expect(project).toHaveProperty('_count');
      });
    });

    it('requiere autenticacion para listar proyectos', async () => {
      await request(app.getHttpServer()).get('/api/projects').expect(401);
    });
  });

  describe('/api/projects/my-projects (GET)', () => {
    it('retorna proyectos donde el usuario es owner o miembro', async () => {
      await testHelper.createTestProject(regularUser);

      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get('/api/projects/my-projects')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((project: any) => {
        expect(
          project.ownerId === regularUser.id ||
            project.members.some((member: any) => member.userId === regularUser.id),
        ).toBeTruthy();
      });
    });
  });

  describe('/api/projects/:id (GET)', () => {
    let ownProject: any;
    let publicProject: any;

    beforeAll(async () => {
      ownProject = await testHelper.createTestProject(regularUser);
      publicProject = await testHelper.createTestProject(adminUser, {
        visibility: 'PUBLIC',
      });
    });

    it('permite al owner consultar su proyecto', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get(`/api/projects/${ownProject.id}`)
        .expect(200);

      expect(response.body.id).toBe(ownProject.id);
      expect(response.body.members.length).toBeGreaterThanOrEqual(1);
    });

    it('permite consultar proyectos publicos aun sin pertenecer', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get(`/api/projects/${publicProject.id}`)
        .expect(200);

      expect(response.body.id).toBe(publicProject.id);
    });

    it('deniega acceso a proyectos privados ajenos', async () => {
      const privateProject = await testHelper.createTestProject(otherUser);

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get(`/api/projects/${privateProject.id}`)
        .expect(403);
    });

    it('retorna 404 cuando el proyecto no existe', async () => {
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get('/api/projects/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('/api/projects/:id (PATCH)', () => {
    let projectToUpdate: any;

    beforeEach(async () => {
      projectToUpdate = await testHelper.createTestProject(regularUser);
    });

    it('permite al Product Owner actualizar los datos del proyecto', async () => {
      const updatedName = `Proyecto Actualizado ${Date.now()}`;
      const updateData = {
        name: updatedName,
        description: 'Descripcion actualizada para el proyecto',
        status: 'ACTIVE',
      };

      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .patch(`/api/projects/${projectToUpdate.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updatedName);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.status).toBe(updateData.status);
    });

    it('permite al Product Owner redefinir el equipo del proyecto', async () => {
      const newDeveloper = await testHelper.createTestUser();

      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .patch(`/api/projects/${projectToUpdate.id}`)
        .send({
          teamMembers: [
            {
              userId: regularUser.id,
              role: ProjectMemberRole.PRODUCT_OWNER,
            },
            {
              userId: newDeveloper.id,
              role: ProjectMemberRole.DEVELOPER,
            },
          ],
        })
        .expect(200);

      expect(response.body.members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: regularUser.id,
            role: ProjectMemberRole.PRODUCT_OWNER,
          }),
          expect.objectContaining({
            userId: newDeveloper.id,
            role: ProjectMemberRole.DEVELOPER,
          }),
        ]),
      );
    });

    it('permite al Product Owner delegar el rol de Product Owner a otro miembro', async () => {
      const newProductOwner = await testHelper.createTestUser();

      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .patch(`/api/projects/${projectToUpdate.id}`)
        .send({
          teamMembers: [
            {
              userId: regularUser.id,
              role: ProjectMemberRole.DEVELOPER,
            },
            {
              userId: newProductOwner.id,
              role: ProjectMemberRole.PRODUCT_OWNER,
            },
          ],
        })
        .expect(200);

      expect(response.body.ownerId).toBe(newProductOwner.id);
      expect(response.body.members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: newProductOwner.id,
            role: ProjectMemberRole.PRODUCT_OWNER,
          }),
          expect.objectContaining({
            userId: regularUser.id,
            role: ProjectMemberRole.DEVELOPER,
          }),
        ]),
      );
    });

    it('impide registrar mas de un Scrum Master en el equipo', async () => {
      const scrumMasterA = await testHelper.createTestUser();
      const scrumMasterB = await testHelper.createTestUser();

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .patch(`/api/projects/${projectToUpdate.id}`)
        .send({
          teamMembers: [
            {
              userId: regularUser.id,
              role: ProjectMemberRole.PRODUCT_OWNER,
            },
            {
              userId: scrumMasterA.id,
              role: ProjectMemberRole.SCRUM_MASTER,
            },
            {
              userId: scrumMasterB.id,
              role: ProjectMemberRole.SCRUM_MASTER,
            },
          ],
        })
        .expect(409);
    });

    it('impide a un usuario sin rol Product Owner modificar el equipo', async () => {
      const projectWithOwner = await testHelper.createTestProject(otherUser);

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .patch(`/api/projects/${projectWithOwner.id}`)
        .send({
          teamMembers: [
            {
              userId: otherUser.id,
              role: ProjectMemberRole.PRODUCT_OWNER,
            },
          ],
        })
        .expect(403);
    });

    it('permite a un administrador actualizar datos generales (sin equipo)', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .patch(`/api/projects/${projectToUpdate.id}`)
        .send({
          visibility: 'PUBLIC',
        })
        .expect(200);

      expect(response.body.visibility).toBe('PUBLIC');
    });
  });

  describe('/api/projects/:id/invite (POST)', () => {
    let projectForInvites: any;

    beforeEach(async () => {
      projectForInvites = await testHelper.createTestProject(regularUser);
    });

    it('permite al Product Owner invitar a un usuario activo asignando un rol', async () => {
      const invitedUser = await testHelper.createTestUser();

      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post(`/api/projects/${projectForInvites.id}/invite`)
        .send({
          email: invitedUser.email,
          role: ProjectMemberRole.DEVELOPER,
        })
        .expect(201);

      expect(response.body.message).toContain(invitedUser.email);
      expect(response.body.member.userId).toBe(invitedUser.id);
      expect(response.body.member.role).toBe(ProjectMemberRole.DEVELOPER);
      expect(response.body.member.isActive).toBe(true);
      expect(response.body.member.user.email).toBe(invitedUser.email.toLowerCase());
    });

    it('impide que un usuario ajeno invite miembros al proyecto', async () => {
      const unauthorizedUser = await testHelper.createTestUser();

      await testHelper
        .getAuthenticatedRequest(otherUser.token)
        .post(`/api/projects/${projectForInvites.id}/invite`)
        .send({
          email: unauthorizedUser.email,
          role: ProjectMemberRole.DEVELOPER,
        })
        .expect(403);
    });

    it('impide asignar el rol de Product Owner a un usuario diferente del dueño', async () => {
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post(`/api/projects/${projectForInvites.id}/invite`)
        .send({
          email: otherUser.email,
          role: ProjectMemberRole.PRODUCT_OWNER,
        })
        .expect(403);
    });

    it('rechaza invitaciones duplicadas para el mismo usuario activo', async () => {
      const invitedUser = await testHelper.createTestUser();

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post(`/api/projects/${projectForInvites.id}/invite`)
        .send({
          email: invitedUser.email,
          role: ProjectMemberRole.SCRUM_MASTER,
        })
        .expect(201);

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post(`/api/projects/${projectForInvites.id}/invite`)
        .send({
          email: invitedUser.email,
          role: ProjectMemberRole.SCRUM_MASTER,
        })
        .expect(409);
    });

    it('rechaza invitar un segundo Scrum Master activo', async () => {
      const firstScrumMaster = await testHelper.createTestUser();
      const projectWithScrum = await testHelper.createTestProject(
        regularUser,
        {
          teamMembers: [
            {
              userId: regularUser.id,
              role: ProjectMemberRole.PRODUCT_OWNER,
            },
            {
              userId: firstScrumMaster.id,
              role: ProjectMemberRole.SCRUM_MASTER,
            },
          ],
        },
      );
      const secondScrumMaster = await testHelper.createTestUser();

      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .post(`/api/projects/${projectWithScrum.id}/invite`)
        .send({
          email: secondScrumMaster.email,
          role: ProjectMemberRole.SCRUM_MASTER,
        })
        .expect(409);
    });
  });

  describe('/api/projects/:id (DELETE)', () => {
    it('permite al Product Owner archivar su proyecto', async () => {
      const projectToDelete = await testHelper.createTestProject(regularUser);

      const response = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .delete(`/api/projects/${projectToDelete.id}`)
        .expect(200);

      expect(response.body.status).toBe('ARCHIVED');
      expect(response.body.archivedAt).toBeTruthy();

      const detail = await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .get(`/api/projects/${projectToDelete.id}`)
        .expect(200);

      expect(detail.body.status).toBe('ARCHIVED');
    });

    it('permite a un administrador archivar cualquier proyecto', async () => {
      const projectToDelete = await testHelper.createTestProject(regularUser);

      await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .delete(`/api/projects/${projectToDelete.id}`)
        .expect(200);
    });

    it('deniega archivar un proyecto sin permisos', async () => {
      const projectToDelete = await testHelper.createTestProject(regularUser);

      await testHelper
        .getAuthenticatedRequest(otherUser.token)
        .delete(`/api/projects/${projectToDelete.id}`)
        .expect(403);
    });

    it('retorna 404 al intentar archivar un proyecto inexistente', async () => {
      await testHelper
        .getAuthenticatedRequest(regularUser.token)
        .delete('/api/projects/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });
});
