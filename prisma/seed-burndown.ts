import {
  PrismaClient,
  ProjectMemberRole,
  StoryStatus,
  SprintStatus,
  TaskStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * 🎯 SEED PARA HU9: BURNDOWN CHARTS Y MÉTRICAS
 * 
 * Este seed crea datos específicos para testear el burndown chart:
 * - Reutiliza usuarios existentes del seed principal
 * - Crea un proyecto con 3 sprints en diferentes estados
 * - Genera historias con estimaciones realistas
 * - Crea tareas con progreso parcial
 * - Genera snapshots históricos para visualizar el burndown
 */

async function main() {
  console.log('🎯 Iniciando seed para HU9: Burndown Charts y Métricas...\n');

  // ============================================================
  // 1. VERIFICAR Y OBTENER USUARIOS EXISTENTES
  // ============================================================
  console.log('👥 Verificando usuarios existentes...');

  const productOwner = await prisma.user.findUnique({
    where: { email: 'po@proyecto.com' },
  });

  const scrumMaster = await prisma.user.findUnique({
    where: { email: 'sm@proyecto.com' },
  });

  const developer1 = await prisma.user.findUnique({
    where: { email: 'dev1@proyecto.com' },
  });

  const developer2 = await prisma.user.findUnique({
    where: { email: 'dev2@proyecto.com' },
  });

  // Si no existen los usuarios, crearlos
  let po = productOwner;
  let sm = scrumMaster;
  let dev1 = developer1;
  let dev2 = developer2;

  if (!po) {
    console.log('  ⚠️  Product Owner no encontrado, creando...');
    const poPassword = await bcrypt.hash('ProductOwner123', 10);
    po = await prisma.user.create({
      data: {
        email: 'po@proyecto.com',
        username: 'product_owner',
        password: poPassword,
        firstName: 'Carlos',
        lastName: 'Mendoza',
        timezone: 'America/La_Paz',
        isAdmin: false,
        isActive: true,
        passwordChangedAt: new Date(),
      },
    });
  }

  if (!sm) {
    console.log('  ⚠️  Scrum Master no encontrado, creando...');
    const smPassword = await bcrypt.hash('ScrumMaster123', 10);
    sm = await prisma.user.create({
      data: {
        email: 'sm@proyecto.com',
        username: 'scrum_master',
        password: smPassword,
        firstName: 'Ana',
        lastName: 'Rodriguez',
        timezone: 'America/La_Paz',
        isAdmin: false,
        isActive: true,
        passwordChangedAt: new Date(),
      },
    });
  }

  if (!dev1) {
    console.log('  ⚠️  Developer 1 no encontrado, creando...');
    const dev1Password = await bcrypt.hash('Developer123', 10);
    dev1 = await prisma.user.create({
      data: {
        email: 'dev1@proyecto.com',
        username: 'developer1',
        password: dev1Password,
        firstName: 'Juan',
        lastName: 'Perez',
        timezone: 'America/La_Paz',
        isAdmin: false,
        isActive: true,
        passwordChangedAt: new Date(),
      },
    });
  }

  if (!dev2) {
    console.log('  ⚠️  Developer 2 no encontrado, creando...');
    const dev2Password = await bcrypt.hash('Developer123', 10);
    dev2 = await prisma.user.create({
      data: {
        email: 'dev2@proyecto.com',
        username: 'developer2',
        password: dev2Password,
        firstName: 'Maria',
        lastName: 'Garcia',
        timezone: 'America/La_Paz',
        isAdmin: false,
        isActive: true,
        passwordChangedAt: new Date(),
      },
    });
  }

  console.log('  ✅ Usuarios verificados/creados correctamente\n');

  // ============================================================
  // 2. CREAR PROYECTO ESPECÍFICO PARA BURNDOWN
  // ============================================================
  console.log('📦 Creando proyecto para testing de burndown...');

  const project = await prisma.project.upsert({
    where: { code: 'BURN-2025' },
    update: {},
    create: {
      code: 'BURN-2025',
      name: 'Proyecto Burndown Test',
      description:
        'Proyecto de prueba para visualizar y validar burndown charts y métricas de sprint',
      visibility: 'PRIVATE',
      productObjective:
        'Testear el sistema de burndown charts con datos realistas de múltiples sprints',
      definitionOfDone:
        'Tests pasando, código revisado, métricas calculadas correctamente',
      sprintDuration: 2, // 2 semanas
      qualityCriteria: 'Cobertura >80%, burndown preciso, métricas correctas',
      status: 'ACTIVE',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2025-12-31'),
      ownerId: po.id,
    },
  });

  console.log('  ✅ Proyecto creado:', project.name);

  // Asignar equipo al proyecto
  console.log('  👥 Asignando equipo al proyecto...');

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: po.id },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: po.id,
      role: ProjectMemberRole.PRODUCT_OWNER,
      isActive: true,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: sm.id },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: sm.id,
      role: ProjectMemberRole.SCRUM_MASTER,
      isActive: true,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: dev1.id },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: dev1.id,
      role: ProjectMemberRole.DEVELOPER,
      isActive: true,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: dev2.id },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: dev2.id,
      role: ProjectMemberRole.DEVELOPER,
      isActive: true,
    },
  });

  console.log('    ✅ Equipo de 4 miembros asignado\n');

  // ============================================================
  // 3. CREAR HISTORIAS DE USUARIO (PRODUCT BACKLOG)
  // ============================================================
  console.log('📝 Creando product backlog con historias estimadas...');

  // Historia 1: Login (COMPLETADA en Sprint 1)
  const story1 = await prisma.userStory.create({
    data: {
      projectId: project.id,
      code: 'BURN-001',
      title: 'Sistema de autenticación',
      asA: 'Usuario',
      iWant: 'Poder iniciar sesión de forma segura',
      soThat: 'Pueda acceder a mis proyectos',
      acceptanceCriteria: [
        'Login con email y contraseña',
        'Generación de JWT',
        'Validación de credenciales',
        'Manejo de errores',
      ].join('\n'),
      description: 'Sistema de login con JWT',
      priority: 1,
      businessValue: 100,
      orderRank: 1,
      estimateHours: 8,
      status: StoryStatus.DONE,
    },
  });

  // Historia 2: Gestión de proyectos (COMPLETADA en Sprint 1)
  const story2 = await prisma.userStory.create({
    data: {
      projectId: project.id,
      code: 'BURN-002',
      title: 'CRUD de proyectos',
      asA: 'Product Owner',
      iWant: 'Crear y gestionar proyectos',
      soThat: 'Pueda organizar el trabajo del equipo',
      acceptanceCriteria: [
        'Crear proyecto con todos los campos',
        'Editar información del proyecto',
        'Asignar miembros del equipo',
        'Ver listado de proyectos',
      ].join('\n'),
      description: 'CRUD completo de proyectos',
      priority: 2,
      businessValue: 95,
      orderRank: 2,
      estimateHours: 12,
      status: StoryStatus.DONE,
    },
  });

  // Historia 3: Historias de usuario (EN PROGRESO en Sprint 2)
  const story3 = await prisma.userStory.create({
    data: {
      projectId: project.id,
      code: 'BURN-003',
      title: 'Gestión de historias de usuario',
      asA: 'Product Owner',
      iWant: 'Crear y priorizar historias de usuario',
      soThat: 'Pueda mantener el backlog actualizado',
      acceptanceCriteria: [
        'Crear historia con formato correcto',
        'Editar y eliminar historias',
        'Reordenar por prioridad',
        'Agregar tags',
      ].join('\n'),
      description: 'CRUD de historias con reordenamiento',
      priority: 3,
      businessValue: 90,
      orderRank: 3,
      estimateHours: 16,
      status: StoryStatus.IN_PROGRESS,
    },
  });

  // Historia 4: Sprint planning (EN PROGRESO en Sprint 2)
  const story4 = await prisma.userStory.create({
    data: {
      projectId: project.id,
      code: 'BURN-004',
      title: 'Planificación de sprints',
      asA: 'Scrum Master',
      iWant: 'Planificar sprints y asignar historias',
      soThat: 'El equipo tenga trabajo organizado',
      acceptanceCriteria: [
        'Crear sprint con fechas',
        'Agregar historias al sprint',
        'Iniciar sprint',
        'Finalizar sprint',
      ].join('\n'),
      description: 'Gestión completa de sprints',
      priority: 4,
      businessValue: 85,
      orderRank: 4,
      estimateHours: 20,
      status: StoryStatus.IN_PROGRESS,
    },
  });

  // Historia 5: Tablero Kanban (BACKLOG para Sprint 3)
  const story5 = await prisma.userStory.create({
    data: {
      projectId: project.id,
      code: 'BURN-005',
      title: 'Tablero Kanban',
      asA: 'Miembro del equipo',
      iWant: 'Ver y mover tareas en un tablero Kanban',
      soThat: 'Pueda visualizar el flujo de trabajo',
      acceptanceCriteria: [
        'Ver columnas por estado',
        'Mover tareas con drag & drop',
        'Actualizar estado de tareas',
        'Ver detalle de tarea',
      ].join('\n'),
      description: 'Tablero Kanban interactivo',
      priority: 5,
      businessValue: 80,
      orderRank: 5,
      estimateHours: 24,
      status: StoryStatus.BACKLOG,
    },
  });

  // Historia 6: Burndown Charts (BACKLOG para Sprint 3)
  const story6 = await prisma.userStory.create({
    data: {
      projectId: project.id,
      code: 'BURN-006',
      title: 'Burndown Charts y Métricas',
      asA: 'Scrum Master',
      iWant: 'Ver burndown charts y métricas del sprint',
      soThat: 'Pueda monitorear el progreso y tomar decisiones',
      acceptanceCriteria: [
        'Gráfico burndown con línea ideal y real',
        'Métricas de esfuerzo, historias y tareas',
        'Indicador de si está on-track',
        'Exportar gráfico como PNG/PDF',
      ].join('\n'),
      description: 'Sistema completo de burndown y métricas',
      priority: 6,
      businessValue: 75,
      orderRank: 6,
      estimateHours: 30,
      status: StoryStatus.BACKLOG,
    },
  });

  console.log('  ✅ 6 historias creadas en el backlog\n');

  // ============================================================
  // 4. CREAR SPRINT 1 (COMPLETADO)
  // ============================================================
  console.log('🏃 Creando Sprint 1 (COMPLETADO)...');

  const sprint1StartDate = new Date('2025-11-01');
  const sprint1EndDate = new Date('2025-11-14'); // 14 días (2 semanas)

  const sprint1 = await prisma.sprint.create({
    data: {
      projectId: project.id,
      number: 1,
      name: 'Sprint 1 - Fundamentos',
      goal: 'Implementar autenticación y gestión básica de proyectos',
      startDate: sprint1StartDate,
      endDate: sprint1EndDate,
      duration: 2, // 2 semanas
      status: SprintStatus.COMPLETED,
    },
  });

  // Agregar historias al Sprint 1
  await prisma.userStory.update({
    where: { id: story1.id },
    data: { sprintId: sprint1.id },
  });

  await prisma.userStory.update({
    where: { id: story2.id },
    data: { sprintId: sprint1.id },
  });

  // Crear tareas para las historias del Sprint 1
  console.log('  📋 Creando tareas para Sprint 1...');

  // Tareas de Historia 1 (Login) - TODAS COMPLETADAS
  const s1h1t1 = await prisma.task.create({
    data: {
      storyId: story1.id,
      code: 'T1',
      title: 'Diseñar DTOs de autenticación',
      description: 'Crear DTOs para login, register, cambio de contraseña',
      effort: 2,
      status: TaskStatus.DONE,
      completedAt: new Date('2025-11-03'),
    },
  });

  const s1h1t2 = await prisma.task.create({
    data: {
      storyId: story1.id,
      code: 'T2',
      title: 'Implementar servicio de autenticación',
      description: 'Lógica de login, JWT, validaciones',
      effort: 4,
      status: TaskStatus.DONE,
      completedAt: new Date('2025-11-05'),
    },
  });

  const s1h1t3 = await prisma.task.create({
    data: {
      storyId: story1.id,
      code: 'T3',
      title: 'Crear tests E2E de auth',
      description: 'Tests de login, registro, errores',
      effort: 2,
      status: TaskStatus.DONE,
      completedAt: new Date('2025-11-06'),
    },
  });

  // Tareas de Historia 2 (Proyectos) - TODAS COMPLETADAS
  const s1h2t1 = await prisma.task.create({
    data: {
      storyId: story2.id,
      code: 'T1',
      title: 'Diseñar modelo de proyectos',
      description: 'Schema Prisma para proyectos y miembros',
      effort: 2,
      status: TaskStatus.DONE,
      completedAt: new Date('2025-11-07'),
    },
  });

  const s1h2t2 = await prisma.task.create({
    data: {
      storyId: story2.id,
      code: 'T2',
      title: 'Implementar CRUD de proyectos',
      description: 'Crear, editar, eliminar, listar proyectos',
      effort: 6,
      status: TaskStatus.DONE,
      completedAt: new Date('2025-11-11'),
    },
  });

  const s1h2t3 = await prisma.task.create({
    data: {
      storyId: story2.id,
      code: 'T3',
      title: 'Gestión de miembros de equipo',
      description: 'Agregar, quitar, cambiar rol de miembros',
      effort: 4,
      status: TaskStatus.DONE,
      completedAt: new Date('2025-11-13'),
    },
  });

  console.log('    ✅ 6 tareas creadas (todas completadas)');

  // Crear snapshots históricos del Sprint 1 (simulando progreso real)
  console.log('  📊 Generando snapshots históricos del Sprint 1...');

  const sprint1Snapshots = [
    { date: '2025-11-01', completed: 0, remaining: 20, total: 20 }, // Día 1
    { date: '2025-11-04', completed: 2, remaining: 18, total: 20 }, // Día 4
    { date: '2025-11-05', completed: 6, remaining: 14, total: 20 }, // Día 5
    { date: '2025-11-06', completed: 8, remaining: 12, total: 20 }, // Día 6
    { date: '2025-11-07', completed: 10, remaining: 10, total: 20 }, // Día 7
    { date: '2025-11-11', completed: 16, remaining: 4, total: 20 }, // Día 11
    { date: '2025-11-13', completed: 20, remaining: 0, total: 20 }, // Día 13 (completado antes!)
  ];

  for (const snapshot of sprint1Snapshots) {
    await prisma.burndownSnapshot.create({
      data: {
        sprintId: sprint1.id,
        date: new Date(snapshot.date),
        effortCompleted: snapshot.completed,
        effortRemaining: snapshot.remaining,
        effortCommitted: snapshot.total,
        storiesCompleted: snapshot.completed === 20 ? 2 : snapshot.completed >= 8 ? 1 : 0,
        storiesTotal: 2,
        tasksCompleted: Math.floor((snapshot.completed / 20) * 6),
        tasksTotal: 6,
      },
    });
  }

  console.log(`    ✅ ${sprint1Snapshots.length} snapshots históricos creados`);
  console.log('  ✅ Sprint 1 completado (20h en 13 días - ¡adelantado!)\n');

  // ============================================================
  // 5. CREAR SPRINT 2 (EN PROGRESO - ATRASADO)
  // ============================================================
  console.log('🏃 Creando Sprint 2 (EN PROGRESO - Atrasado)...');

  const sprint2StartDate = new Date('2025-11-15');
  const sprint2EndDate = new Date('2025-11-28'); // 14 días (2 semanas)

  const sprint2 = await prisma.sprint.create({
    data: {
      projectId: project.id,
      number: 2,
      name: 'Sprint 2 - Gestión de Backlog',
      goal: 'Implementar gestión de historias de usuario y planificación de sprints',
      startDate: sprint2StartDate,
      endDate: sprint2EndDate,
      duration: 2, // 2 semanas
      status: SprintStatus.IN_PROGRESS,
    },
  });

  // Agregar historias al Sprint 2
  await prisma.userStory.update({
    where: { id: story3.id },
    data: { sprintId: sprint2.id },
  });

  await prisma.userStory.update({
    where: { id: story4.id },
    data: { sprintId: sprint2.id },
  });

  console.log('  📋 Creando tareas para Sprint 2...');

  // Tareas de Historia 3 (Historias de usuario) - PARCIALMENTE COMPLETADAS
  const s2h3t1 = await prisma.task.create({
    data: {
      storyId: story3.id,
      code: 'T1',
      title: 'Diseñar DTOs de historias',
      description: 'CreateStoryDto, UpdateStoryDto',
      effort: 2,
      status: TaskStatus.DONE,
      completedAt: new Date('2025-11-17'),
    },
  });

  const s2h3t2 = await prisma.task.create({
    data: {
      storyId: story3.id,
      code: 'T2',
      title: 'Implementar CRUD de historias',
      description: 'Crear, editar, eliminar historias',
      effort: 6,
      status: TaskStatus.DONE,
      completedAt: new Date('2025-11-20'),
    },
  });

  const s2h3t3 = await prisma.task.create({
    data: {
      storyId: story3.id,
      code: 'T3',
      title: 'Sistema de reordenamiento',
      description: 'Drag & drop y actualización de prioridades',
      effort: 4,
      status: TaskStatus.IN_PROGRESS,
      completedAt: null,
    },
  });

  const s2h3t4 = await prisma.task.create({
    data: {
      storyId: story3.id,
      code: 'T4',
      title: 'Gestión de tags',
      description: 'Agregar, quitar, filtrar por tags',
      effort: 4,
      status: TaskStatus.TODO,
      completedAt: null,
    },
  });

  // Tareas de Historia 4 (Sprint planning) - POCO PROGRESO
  const s2h4t1 = await prisma.task.create({
    data: {
      storyId: story4.id,
      code: 'T1',
      title: 'Modelo de datos de sprints',
      description: 'Schema Prisma para sprints',
      effort: 2,
      status: TaskStatus.DONE,
      completedAt: new Date('2025-11-21'),
    },
  });

  const s2h4t2 = await prisma.task.create({
    data: {
      storyId: story4.id,
      code: 'T2',
      title: 'Crear y editar sprints',
      description: 'CRUD básico de sprints',
      effort: 5,
      status: TaskStatus.IN_PROGRESS,
      completedAt: null,
    },
  });

  const s2h4t3 = await prisma.task.create({
    data: {
      storyId: story4.id,
      code: 'T3',
      title: 'Asignar historias al sprint',
      description: 'Lógica para mover historias al sprint',
      effort: 5,
      status: TaskStatus.TODO,
      completedAt: null,
    },
  });

  const s2h4t4 = await prisma.task.create({
    data: {
      storyId: story4.id,
      code: 'T4',
      title: 'Iniciar y finalizar sprint',
      description: 'Estado del sprint y validaciones',
      effort: 4,
      status: TaskStatus.TODO,
      completedAt: null,
    },
  });

  const s2h4t5 = await prisma.task.create({
    data: {
      storyId: story4.id,
      code: 'T5',
      title: 'Tests de sprints',
      description: 'Tests E2E de toda la funcionalidad',
      effort: 4,
      status: TaskStatus.TODO,
      completedAt: null,
    },
  });

  console.log('    ✅ 9 tareas creadas (3 completadas, 2 en progreso, 4 pendientes)');

  // Crear snapshots del Sprint 2 (mostrando retraso)
  console.log('  📊 Generando snapshots del Sprint 2 (día actual: 17 Nov)...');

  // Total comprometido: 16h (historia 3) + 20h (historia 4) = 36h
  // Completado hasta hoy: 10h (2+6+2 = 3 tareas)
  // Ideal a día 3: debería llevar ~7.7h completadas
  // Progreso: 10h/36h = 27.8% pero tiempo: 3/14 = 21.4% → ligeramente adelantado

  const sprint2Snapshots = [
    { date: '2025-11-15', completed: 0, remaining: 36, total: 36, stories: 0, tasks: 0 }, // Día 1
    { date: '2025-11-16', completed: 0, remaining: 36, total: 36, stories: 0, tasks: 0 }, // Día 2 (fin de semana)
    { date: '2025-11-17', completed: 10, remaining: 26, total: 36, stories: 0, tasks: 3 }, // Día 3 (hoy)
  ];

  for (const snapshot of sprint2Snapshots) {
    await prisma.burndownSnapshot.create({
      data: {
        sprintId: sprint2.id,
        date: new Date(snapshot.date),
        effortCompleted: snapshot.completed,
        effortRemaining: snapshot.remaining,
        effortCommitted: snapshot.total,
        storiesCompleted: snapshot.stories,
        storiesTotal: 2,
        tasksCompleted: snapshot.tasks,
        tasksTotal: 9,
      },
    });
  }

  console.log(`    ✅ ${sprint2Snapshots.length} snapshots creados`);
  console.log('  ✅ Sprint 2 en progreso (10h/36h completadas - 27.8%)\n');

  // ============================================================
  // 6. CREAR SPRINT 3 (PLANNING - NO INICIADO)
  // ============================================================
  console.log('🏃 Creando Sprint 3 (PLANNING - No iniciado)...');

  const sprint3StartDate = new Date('2025-11-29');
  const sprint3EndDate = new Date('2025-12-12'); // 14 días (2 semanas)

  const sprint3 = await prisma.sprint.create({
    data: {
      projectId: project.id,
      number: 3,
      name: 'Sprint 3 - Visualización y Métricas',
      goal: 'Implementar tablero Kanban y burndown charts',
      startDate: sprint3StartDate,
      endDate: sprint3EndDate,
      duration: 2, // 2 semanas
      status: SprintStatus.PLANNED,
    },
  });

  // Agregar historias al Sprint 3
  await prisma.userStory.update({
    where: { id: story5.id },
    data: { sprintId: sprint3.id },
  });

  await prisma.userStory.update({
    where: { id: story6.id },
    data: { sprintId: sprint3.id },
  });

  console.log('  📋 Historias asignadas al Sprint 3 (sin tareas aún)');
  console.log('  ⏳ Sprint 3 en planificación (inicia el 29 Nov)\n');

  // ============================================================
  // RESUMEN FINAL
  // ============================================================
  console.log('✨ ¡Seed de HU9 completado exitosamente!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 DATOS CREADOS PARA TESTING DE BURNDOWN');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('✅ 1 Proyecto: "Proyecto Burndown Test" (BURN-2025)');
  console.log('✅ 4 Miembros del equipo (PO, SM, 2 Devs)');
  console.log('✅ 6 Historias de usuario con estimaciones');
  console.log('✅ 3 Sprints en diferentes estados:\n');

  console.log('   🏁 Sprint 1 (COMPLETADO):');
  console.log('      • Fechas: 1 Nov - 14 Nov (14 días)');
  console.log('      • Esfuerzo: 20h comprometidas, 20h completadas');
  console.log('      • Historias: 2/2 completadas');
  console.log('      • Tareas: 6/6 completadas');
  console.log('      • Snapshots: 7 días registrados');
  console.log('      • Resultado: ✅ Completado ADELANTADO (día 13/14)\n');

  console.log('   🏃 Sprint 2 (EN PROGRESO):');
  console.log('      • Fechas: 15 Nov - 28 Nov (14 días)');
  console.log('      • Día actual: 3/14 (21.4% tiempo transcurrido)');
  console.log('      • Esfuerzo: 36h comprometidas, 10h completadas (27.8%)');
  console.log('      • Historias: 0/2 completadas');
  console.log('      • Tareas: 3/9 completadas, 2 en progreso, 4 pendientes');
  console.log('      • Snapshots: 3 días registrados');
  console.log('      • Estado: ⚠️  Ligeramente adelantado pero vulnerable\n');

  console.log('   📋 Sprint 3 (PLANNING):');
  console.log('      • Fechas: 29 Nov - 12 Dic (14 días)');
  console.log('      • Esfuerzo: 54h estimadas (24h + 30h)');
  console.log('      • Historias: 2 asignadas (Kanban + Burndown)');
  console.log('      • Tareas: Sin crear aún');
  console.log('      • Estado: 📅 No iniciado\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 CÓMO TESTEAR LA HU9');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('1. Inicia sesión como Scrum Master:');
  console.log('   Email:    sm@proyecto.com');
  console.log('   Password: ScrumMaster123\n');

  console.log('2. Navega al proyecto "Proyecto Burndown Test"\n');

  console.log('3. Endpoints disponibles para testear:\n');

  console.log('   📊 Burndown del Sprint 1 (completado):');
  console.log(`   GET /projects/${project.id}/sprints/${sprint1.id}/burndown`);
  console.log('   → Verás gráfico completo con línea que llegó a 0\n');

  console.log('   📊 Burndown del Sprint 2 (en progreso):');
  console.log(`   GET /projects/${project.id}/sprints/${sprint2.id}/burndown`);
  console.log('   → Verás progreso actual con predicción\n');

  console.log('   📈 Métricas del Sprint 2:');
  console.log(`   GET /projects/${project.id}/sprints/${sprint2.id}/metrics`);
  console.log('   → Verás métricas detalladas de esfuerzo, historias, tareas\n');

  console.log('   📸 Snapshots del Sprint 2:');
  console.log(`   GET /projects/${project.id}/sprints/${sprint2.id}/snapshots`);
  console.log('   → Verás historial de 3 snapshots\n');

  console.log('   💾 Exportar burndown:');
  console.log(`   GET /projects/${project.id}/sprints/${sprint2.id}/burndown/export?format=pdf`);
  console.log('   → Descargará PDF con gráfico y métricas\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 IDs IMPORTANTES (cópialos)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Project ID:  ${project.id}`);
  console.log(`Sprint 1 ID: ${sprint1.id}`);
  console.log(`Sprint 2 ID: ${sprint2.id}`);
  console.log(`Sprint 3 ID: ${sprint3.id}\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 PRÓXIMOS PASOS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('1. Abre Prisma Studio para visualizar los datos:');
  console.log('   npx prisma studio\n');

  console.log('2. Usa Postman/Insomnia para probar los endpoints arriba\n');

  console.log('3. En el frontend, podrás ver:');
  console.log('   • Sprint 1: Burndown perfecto (línea llegó a 0)');
  console.log('   • Sprint 2: Burndown actual con predicción');
  console.log('   • Métricas: Esfuerzo, historias, tareas, velocidad');
  console.log('   • Indicador: "On track" o "At risk"\n');

  console.log('4. Para simular más progreso en Sprint 2:');
  console.log('   • Marca tareas como DONE en Prisma Studio');
  console.log('   • Llama al endpoint POST /snapshots para actualizar\n');

  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed de burndown:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
