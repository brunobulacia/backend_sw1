import { PrismaClient, ProjectMemberRole, StoryStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // ============================================================
  // 1. CREAR USUARIOS
  // ============================================================
  console.log('👤 Creando usuarios...');

  // Usuario Administrador
  const adminPassword = await bcrypt.hash('Admin123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@proyecto.com' },
    update: {},
    create: {
      email: 'admin@proyecto.com',
      username: 'admin',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'Sistema',
      timezone: 'America/La_Paz',
      isAdmin: true,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  });
  console.log('  ✅ Admin creado:', admin.email);

  // Product Owner
  const poPassword = await bcrypt.hash('ProductOwner123', 10);
  const productOwner = await prisma.user.upsert({
    where: { email: 'po@proyecto.com' },
    update: {},
    create: {
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
  console.log('  ✅ Product Owner creado:', productOwner.email);

  // Scrum Master
  const smPassword = await bcrypt.hash('ScrumMaster123', 10);
  const scrumMaster = await prisma.user.upsert({
    where: { email: 'sm@proyecto.com' },
    update: {},
    create: {
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
  console.log('  ✅ Scrum Master creado:', scrumMaster.email);

  // Desarrollador 1
  const dev1Password = await bcrypt.hash('Developer123', 10);
  const developer1 = await prisma.user.upsert({
    where: { email: 'dev1@proyecto.com' },
    update: {},
    create: {
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
  console.log('  ✅ Developer 1 creado:', developer1.email);

  // Desarrollador 2
  const dev2Password = await bcrypt.hash('Developer123', 10);
  const developer2 = await prisma.user.upsert({
    where: { email: 'dev2@proyecto.com' },
    update: {},
    create: {
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
  console.log('  ✅ Developer 2 creado:', developer2.email);

  // Desarrollador 3
  const dev3Password = await bcrypt.hash('Developer123', 10);
  const developer3 = await prisma.user.upsert({
    where: { email: 'dev3@proyecto.com' },
    update: {},
    create: {
      email: 'dev3@proyecto.com',
      username: 'developer3',
      password: dev3Password,
      firstName: 'Luis',
      lastName: 'Martinez',
      timezone: 'America/La_Paz',
      githubUsername: 'luismartinez',
      isAdmin: false,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  });
  console.log('  ✅ Developer 3 creado:', developer3.email);

  // Usuario Regular (sin proyecto asignado)
  const userPassword = await bcrypt.hash('User123456', 10);
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@proyecto.com' },
    update: {},
    create: {
      email: 'user@proyecto.com',
      username: 'usuario_regular',
      password: userPassword,
      firstName: 'Pedro',
      lastName: 'Lopez',
      timezone: 'America/La_Paz',
      isAdmin: false,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  });
  console.log('  ✅ Usuario Regular creado:', regularUser.email);

  // ============================================================
  // 2. CREAR PROYECTOS
  // ============================================================
  console.log('\n📦 Creando proyectos...');

  // Proyecto 1: Sistema de Gestión Ágil
  const project1 = await prisma.project.upsert({
    where: { code: 'SGA-2025' },
    update: {},
    create: {
      code: 'SGA-2025',
      name: 'Sistema de Gestión Ágil',
      description:
        'Plataforma web para gestionar proyectos siguiendo metodologías ágiles como Scrum',
      visibility: 'PRIVATE',
      productObjective:
        'Facilitar la planificación y seguimiento de proyectos Scrum para equipos de desarrollo de software',
      definitionOfDone:
        'Código revisado, tests pasando, documentación actualizada, desplegado en staging',
      sprintDuration: 2,
      qualityCriteria:
        'Cobertura de tests >80%, sin errores críticos de seguridad, UI responsiva',
      status: 'ACTIVE',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-06-30'),
      ownerId: productOwner.id,
    },
  });
  console.log('  ✅ Proyecto creado:', project1.name);

  // Equipo del Proyecto 1
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project1.id,
        userId: productOwner.id,
      },
    },
    update: {},
    create: {
      projectId: project1.id,
      userId: productOwner.id,
      role: ProjectMemberRole.PRODUCT_OWNER,
      isActive: true,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project1.id,
        userId: scrumMaster.id,
      },
    },
    update: {},
    create: {
      projectId: project1.id,
      userId: scrumMaster.id,
      role: ProjectMemberRole.SCRUM_MASTER,
      isActive: true,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project1.id,
        userId: developer1.id,
      },
    },
    update: {},
    create: {
      projectId: project1.id,
      userId: developer1.id,
      role: ProjectMemberRole.DEVELOPER,
      isActive: true,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project1.id,
        userId: developer2.id,
      },
    },
    update: {},
    create: {
      projectId: project1.id,
      userId: developer2.id,
      role: ProjectMemberRole.DEVELOPER,
      isActive: true,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project1.id,
        userId: developer3.id,
      },
    },
    update: {},
    create: {
      projectId: project1.id,
      userId: developer3.id,
      role: ProjectMemberRole.DEVELOPER,
      isActive: true,
    },
  });

  console.log('    ✅ Equipo asignado (5 miembros)');

  // Proyecto 2: E-Commerce Platform
  const project2 = await prisma.project.upsert({
    where: { code: 'ECP-2025' },
    update: {},
    create: {
      code: 'ECP-2025',
      name: 'E-Commerce Platform',
      description:
        'Plataforma de comercio electrónico con gestión de inventario y pagos',
      visibility: 'PUBLIC',
      productObjective:
        'Crear una plataforma escalable para ventas en línea con integración de múltiples métodos de pago',
      definitionOfDone:
        'Feature completa, tests E2E pasando, documentación API actualizada',
      sprintDuration: 2,
      qualityCriteria:
        'Performance <2s carga página, tests de integración completos, accesibilidad WCAG 2.1',
      status: 'PLANNING',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-08-31'),
      ownerId: productOwner.id,
    },
  });
  console.log('  ✅ Proyecto creado:', project2.name);

  // Equipo del Proyecto 2 (más pequeño)
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project2.id,
        userId: productOwner.id,
      },
    },
    update: {},
    create: {
      projectId: project2.id,
      userId: productOwner.id,
      role: ProjectMemberRole.PRODUCT_OWNER,
      isActive: true,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project2.id,
        userId: developer1.id,
      },
    },
    update: {},
    create: {
      projectId: project2.id,
      userId: developer1.id,
      role: ProjectMemberRole.DEVELOPER,
      isActive: true,
    },
  });

  console.log('    ✅ Equipo asignado (2 miembros)');

  // ============================================================
  // 3. CREAR HISTORIAS DE USUARIO
  // ============================================================
  console.log('\n📝 Creando historias de usuario...');

  // Historias para Proyecto 1
  const story1 = await prisma.userStory.create({
    data: {
      projectId: project1.id,
      code: 'US-001',
      title: 'Login de usuarios en el sistema',
      asA: 'Usuario del sistema',
      iWant: 'Poder iniciar sesión con email y contraseña',
      soThat: 'Pueda acceder a las funcionalidades protegidas',
      acceptanceCriteria: [
        'El usuario puede ingresar email y contraseña',
        'El sistema valida las credenciales',
        'Se genera un token JWT válido',
        'El token expira después de 7 días',
        'Se muestra error si las credenciales son incorrectas',
      ].join('\n'),
      description: 'Sistema de autenticación básico con JWT',
      priority: 1,
      businessValue: 100,
      orderRank: 1,
      estimateHours: 8,
      status: StoryStatus.DONE,
    },
  });

  await prisma.userStoryTag.createMany({
    data: [
      { storyId: story1.id, value: 'autenticación' },
      { storyId: story1.id, value: 'seguridad' },
      { storyId: story1.id, value: 'backend' },
    ],
  });

  const story2 = await prisma.userStory.create({
    data: {
      projectId: project1.id,
      code: 'US-002',
      title: 'Crear nuevo proyecto',
      asA: 'Product Owner',
      iWant: 'Crear un nuevo proyecto con su equipo',
      soThat: 'Pueda comenzar a gestionar historias de usuario',
      acceptanceCriteria: [
        'Ingresar nombre, descripción y objetivo del producto',
        'Definir duración del sprint (1-4 semanas)',
        'Asignar miembros del equipo con sus roles',
        'Validar que haya un Product Owner',
        'Validar que no haya más de un Scrum Master',
      ].join('\n'),
      description:
        'Funcionalidad completa para crear y configurar un nuevo proyecto Scrum',
      priority: 2,
      businessValue: 90,
      orderRank: 2,
      estimateHours: 16,
      status: StoryStatus.DONE,
    },
  });

  await prisma.userStoryTag.createMany({
    data: [
      { storyId: story2.id, value: 'proyectos' },
      { storyId: story2.id, value: 'gestión' },
      { storyId: story2.id, value: 'backend' },
    ],
  });

  const story3 = await prisma.userStory.create({
    data: {
      projectId: project1.id,
      code: 'US-003',
      title: 'Gestionar historias de usuario',
      asA: 'Product Owner',
      iWant: 'Crear, editar y eliminar historias de usuario',
      soThat: 'Pueda mantener el product backlog actualizado',
      acceptanceCriteria: [
        'Crear historia con formato: Como [rol] quiero [funcionalidad] para [beneficio]',
        'Definir criterios de aceptación',
        'Asignar prioridad y valor de negocio',
        'Agregar tags para categorización',
        'Reordenar historias por prioridad',
      ].join('\n'),
      description: 'CRUD completo de historias de usuario con reordenamiento',
      priority: 3,
      businessValue: 85,
      orderRank: 3,
      estimateHours: 20,
      status: StoryStatus.IN_PROGRESS,
    },
  });

  await prisma.userStoryTag.createMany({
    data: [
      { storyId: story3.id, value: 'historias' },
      { storyId: story3.id, value: 'backlog' },
      { storyId: story3.id, value: 'backend' },
    ],
  });

  const story4 = await prisma.userStory.create({
    data: {
      projectId: project1.id,
      code: 'US-004',
      title: 'Sesión de Planning Poker',
      asA: 'Scrum Master',
      iWant: 'Facilitar sesiones de estimación con Planning Poker',
      soThat:
        'El equipo pueda estimar historias de manera colaborativa y consensuada',
      acceptanceCriteria: [
        'Crear sesión vinculada a una historia de usuario',
        'Seleccionar método de estimación (Fibonacci, T-Shirt, etc)',
        'Los miembros pueden votar de forma anónima',
        'Revelar votos simultáneamente',
        'Registrar la estimación final consensuada',
      ].join('\n'),
      description:
        'Sistema completo de Planning Poker con votación anónima y revelación simultánea',
      priority: 4,
      businessValue: 80,
      orderRank: 4,
      estimateHours: 24,
      status: StoryStatus.BACKLOG,
    },
  });

  await prisma.userStoryTag.createMany({
    data: [
      { storyId: story4.id, value: 'estimación' },
      { storyId: story4.id, value: 'planning-poker' },
      { storyId: story4.id, value: 'backend' },
      { storyId: story4.id, value: 'websockets' },
    ],
  });

  const story5 = await prisma.userStory.create({
    data: {
      projectId: project1.id,
      code: 'US-005',
      title: 'Dashboard del proyecto',
      asA: 'Miembro del equipo',
      iWant: 'Ver un resumen visual del estado del proyecto',
      soThat: 'Pueda entender rápidamente el progreso y métricas clave',
      acceptanceCriteria: [
        'Mostrar burndown chart del sprint actual',
        'Indicadores de historias por estado',
        'Velocidad del equipo (últimos 3 sprints)',
        'Lista de historias en riesgo',
        'Gráfico de distribución de trabajo',
      ].join('\n'),
      description:
        'Dashboard con métricas ágiles y visualización del progreso del proyecto',
      priority: 5,
      businessValue: 70,
      orderRank: 5,
      estimateHours: 30,
      status: StoryStatus.BACKLOG,
    },
  });

  await prisma.userStoryTag.createMany({
    data: [
      { storyId: story5.id, value: 'dashboard' },
      { storyId: story5.id, value: 'métricas' },
      { storyId: story5.id, value: 'frontend' },
      { storyId: story5.id, value: 'visualización' },
    ],
  });

  console.log('  ✅ 5 historias creadas para', project1.name);

  // Historias para Proyecto 2
  const story6 = await prisma.userStory.create({
    data: {
      projectId: project2.id,
      code: 'US-001',
      title: 'Catálogo de productos',
      asA: 'Cliente',
      iWant: 'Ver el catálogo de productos disponibles',
      soThat: 'Pueda explorar y seleccionar productos para comprar',
      acceptanceCriteria: [
        'Mostrar productos con imagen, nombre y precio',
        'Filtrar por categorías',
        'Buscar por nombre o descripción',
        'Ordenar por precio, popularidad, novedad',
        'Paginación de resultados',
      ].join('\n'),
      description: 'Listado de productos con filtros y búsqueda',
      priority: 1,
      businessValue: 100,
      orderRank: 1,
      estimateHours: 12,
      status: StoryStatus.BACKLOG,
    },
  });

  await prisma.userStoryTag.createMany({
    data: [
      { storyId: story6.id, value: 'catálogo' },
      { storyId: story6.id, value: 'productos' },
      { storyId: story6.id, value: 'frontend' },
    ],
  });

  const story7 = await prisma.userStory.create({
    data: {
      projectId: project2.id,
      code: 'US-002',
      title: 'Carrito de compras',
      asA: 'Cliente',
      iWant: 'Agregar productos a un carrito de compras',
      soThat: 'Pueda gestionar mi orden antes de finalizar la compra',
      acceptanceCriteria: [
        'Agregar/quitar productos del carrito',
        'Modificar cantidades',
        'Ver subtotal y total',
        'Aplicar códigos de descuento',
        'Persistir carrito en sesión',
      ].join('\n'),
      description: 'Gestión completa del carrito de compras',
      priority: 2,
      businessValue: 95,
      orderRank: 2,
      estimateHours: 16,
      status: StoryStatus.BACKLOG,
    },
  });

  await prisma.userStoryTag.createMany({
    data: [
      { storyId: story7.id, value: 'carrito' },
      { storyId: story7.id, value: 'compras' },
      { storyId: story7.id, value: 'fullstack' },
    ],
  });

  console.log('  ✅ 2 historias creadas para', project2.name);

  // ============================================================
  // 4. CREAR TAREAS PARA LAS HISTORIAS
  // ============================================================
  console.log('\n📋 Creando tareas para las historias de usuario...');

  // Tareas para Story 1 (Login) - COMPLETADAS
  await prisma.task.createMany({
    data: [
      {
        storyId: story1.id,
        code: 'T-US-001-1',
        title: 'Implementar endpoint de login',
        description: 'Crear endpoint POST /auth/login que reciba email y password',
        effort: 3,
        status: 'DONE',
        assignedToId: developer1.id,
        completedAt: new Date('2025-01-20T10:00:00'),
        startedAt: new Date('2025-01-18T09:00:00'),
      },
      {
        storyId: story1.id,
        code: 'T-US-001-2',
        title: 'Validación de credenciales',
        description: 'Implementar lógica de validación con bcrypt',
        effort: 2,
        status: 'DONE',
        assignedToId: developer1.id,
        completedAt: new Date('2025-01-20T15:00:00'),
        startedAt: new Date('2025-01-20T11:00:00'),
      },
      {
        storyId: story1.id,
        code: 'T-US-001-3',
        title: 'Generación de token JWT',
        description: 'Configurar passport-jwt y generar tokens con expiración',
        effort: 2,
        status: 'DONE',
        assignedToId: developer2.id,
        completedAt: new Date('2025-01-21T12:00:00'),
        startedAt: new Date('2025-01-21T09:00:00'),
      },
      {
        storyId: story1.id,
        code: 'T-US-001-4',
        title: 'Tests unitarios de autenticación',
        description: 'Escribir tests para validación y generación de tokens',
        effort: 1,
        status: 'DONE',
        assignedToId: developer2.id,
        completedAt: new Date('2025-01-21T16:00:00'),
        startedAt: new Date('2025-01-21T14:00:00'),
      },
    ],
  });

  // Tareas para Story 2 (Crear proyecto) - COMPLETADAS
  await prisma.task.createMany({
    data: [
      {
        storyId: story2.id,
        code: 'T-US-002-1',
        title: 'Diseñar schema de proyectos',
        description: 'Crear modelos Project, ProjectMember en Prisma',
        effort: 2,
        status: 'DONE',
        assignedToId: developer1.id,
        completedAt: new Date('2025-01-22T11:00:00'),
        startedAt: new Date('2025-01-22T09:00:00'),
      },
      {
        storyId: story2.id,
        code: 'T-US-002-2',
        title: 'Endpoint de creación de proyecto',
        description: 'POST /projects con validación de datos',
        effort: 4,
        status: 'DONE',
        assignedToId: developer1.id,
        completedAt: new Date('2025-01-23T16:00:00'),
        startedAt: new Date('2025-01-23T09:00:00'),
      },
      {
        storyId: story2.id,
        code: 'T-US-002-3',
        title: 'Asignación de miembros al equipo',
        description: 'Lógica para agregar miembros con roles y validaciones',
        effort: 5,
        status: 'DONE',
        assignedToId: developer3.id,
        completedAt: new Date('2025-01-24T17:00:00'),
        startedAt: new Date('2025-01-24T09:00:00'),
      },
      {
        storyId: story2.id,
        code: 'T-US-002-4',
        title: 'Generación automática de código de proyecto',
        description: 'Algoritmo para generar códigos únicos tipo SGA-2025',
        effort: 3,
        status: 'DONE',
        assignedToId: developer2.id,
        completedAt: new Date('2025-01-25T14:00:00'),
        startedAt: new Date('2025-01-25T10:00:00'),
      },
      {
        storyId: story2.id,
        code: 'T-US-002-5',
        title: 'Validaciones de roles',
        description: 'Validar que solo haya 1 PO y máximo 1 SM',
        effort: 2,
        status: 'DONE',
        assignedToId: developer2.id,
        completedAt: new Date('2025-01-25T17:00:00'),
        startedAt: new Date('2025-01-25T15:00:00'),
      },
    ],
  });

  // Tareas para Story 3 (Gestión de historias) - EN PROGRESO
  await prisma.task.createMany({
    data: [
      {
        storyId: story3.id,
        code: 'T-US-003-1',
        title: 'Modelo de datos para historias',
        description: 'Crear schema UserStory con todos los campos requeridos',
        effort: 2,
        status: 'DONE',
        assignedToId: developer1.id,
        completedAt: new Date('2025-01-26T12:00:00'),
        startedAt: new Date('2025-01-26T09:00:00'),
      },
      {
        storyId: story3.id,
        code: 'T-US-003-2',
        title: 'CRUD de historias de usuario',
        description: 'Endpoints para crear, listar, actualizar y eliminar historias',
        effort: 6,
        status: 'DONE',
        assignedToId: developer3.id,
        completedAt: new Date('2025-01-27T18:00:00'),
        startedAt: new Date('2025-01-27T09:00:00'),
      },
      {
        storyId: story3.id,
        code: 'T-US-003-3',
        title: 'Sistema de tags para categorización',
        description: 'Modelo UserStoryTag y endpoints para gestionar tags',
        effort: 3,
        status: 'IN_PROGRESS',
        assignedToId: developer2.id,
        startedAt: new Date('2025-01-28T09:00:00'),
      },
      {
        storyId: story3.id,
        code: 'T-US-003-4',
        title: 'Reordenamiento de historias',
        description: 'Endpoint para actualizar orderRank con drag & drop',
        effort: 4,
        status: 'TODO',
        assignedToId: developer2.id,
      },
      {
        storyId: story3.id,
        code: 'T-US-003-5',
        title: 'Validaciones de prioridad y negocio',
        description: 'DTOs con class-validator para campos numéricos',
        effort: 2,
        status: 'TODO',
      },
      {
        storyId: story3.id,
        code: 'T-US-003-6',
        title: 'Tests E2E del CRUD',
        description: 'Suite completa de tests para todas las operaciones',
        effort: 3,
        status: 'TODO',
      },
    ],
  });

  // Tareas para Story 4 (Planning Poker) - PENDIENTES
  await prisma.task.createMany({
    data: [
      {
        storyId: story4.id,
        code: 'T-US-004-1',
        title: 'Modelo de sesiones de estimación',
        description: 'Schema para EstimationSession y EstimationVote',
        effort: 3,
        status: 'TODO',
      },
      {
        storyId: story4.id,
        code: 'T-US-004-2',
        title: 'Crear y configurar sesión',
        description: 'Endpoint para crear sesión con método de estimación',
        effort: 4,
        status: 'TODO',
      },
      {
        storyId: story4.id,
        code: 'T-US-004-3',
        title: 'Sistema de votación anónima',
        description: 'Endpoint para votar y almacenar votos ocultos',
        effort: 5,
        status: 'TODO',
      },
      {
        storyId: story4.id,
        code: 'T-US-004-4',
        title: 'Revelación de votos',
        description: 'Lógica para revelar todos los votos simultáneamente',
        effort: 3,
        status: 'TODO',
      },
      {
        storyId: story4.id,
        code: 'T-US-004-5',
        title: 'Múltiples rondas de votación',
        description: 'Permitir reiniciar votación si no hay consenso',
        effort: 4,
        status: 'TODO',
      },
      {
        storyId: story4.id,
        code: 'T-US-004-6',
        title: 'Finalizar sesión y guardar estimación',
        description: 'Guardar estimación final en la historia',
        effort: 2,
        status: 'TODO',
      },
      {
        storyId: story4.id,
        code: 'T-US-004-7',
        title: 'Historial de sesiones',
        description: 'Endpoint para ver sesiones pasadas con votos',
        effort: 3,
        status: 'TODO',
      },
    ],
  });

  // Tareas para Story 5 (Dashboard) - PENDIENTES
  await prisma.task.createMany({
    data: [
      {
        storyId: story5.id,
        code: 'T-US-005-1',
        title: 'Endpoint de métricas del proyecto',
        description: 'API que devuelva métricas agregadas del proyecto',
        effort: 5,
        status: 'TODO',
      },
      {
        storyId: story5.id,
        code: 'T-US-005-2',
        title: 'Cálculo de velocidad del equipo',
        description: 'Obtener velocidad promedio de últimos 3 sprints',
        effort: 4,
        status: 'TODO',
      },
      {
        storyId: story5.id,
        code: 'T-US-005-3',
        title: 'Componente de Burndown Chart',
        description: 'Gráfico interactivo con Recharts',
        effort: 6,
        status: 'TODO',
      },
      {
        storyId: story5.id,
        code: 'T-US-005-4',
        title: 'Tarjetas de indicadores',
        description: 'Cards con métricas clave (historias, velocidad, etc)',
        effort: 4,
        status: 'TODO',
      },
      {
        storyId: story5.id,
        code: 'T-US-005-5',
        title: 'Gráfico de distribución de trabajo',
        description: 'Chart mostrando asignación por desarrollador',
        effort: 5,
        status: 'TODO',
      },
      {
        storyId: story5.id,
        code: 'T-US-005-6',
        title: 'Actualización en tiempo real',
        description: 'Polling o WebSockets para actualizar métricas',
        effort: 6,
        status: 'TODO',
      },
    ],
  });

  // Tareas para Story 6 (Catálogo de productos) - E-Commerce
  await prisma.task.createMany({
    data: [
      {
        storyId: story6.id,
        code: 'T-US-001-1',
        title: 'Modelo de productos',
        description: 'Schema de Product con categorías',
        effort: 2,
        status: 'TODO',
      },
      {
        storyId: story6.id,
        code: 'T-US-001-2',
        title: 'Listado de productos con paginación',
        description: 'Endpoint GET /products con filtros y paginación',
        effort: 4,
        status: 'TODO',
      },
      {
        storyId: story6.id,
        code: 'T-US-001-3',
        title: 'Filtros por categoría',
        description: 'Implementar filtrado por categorías múltiples',
        effort: 3,
        status: 'TODO',
      },
      {
        storyId: story6.id,
        code: 'T-US-001-4',
        title: 'Búsqueda full-text',
        description: 'Búsqueda por nombre y descripción de productos',
        effort: 3,
        status: 'TODO',
      },
    ],
  });

  // Tareas para Story 7 (Carrito de compras)
  await prisma.task.createMany({
    data: [
      {
        storyId: story7.id,
        code: 'T-US-002-1',
        title: 'Modelo de carrito',
        description: 'Schema Cart y CartItem',
        effort: 2,
        status: 'TODO',
      },
      {
        storyId: story7.id,
        code: 'T-US-002-2',
        title: 'Agregar/quitar productos del carrito',
        description: 'Endpoints para gestionar items del carrito',
        effort: 4,
        status: 'TODO',
      },
      {
        storyId: story7.id,
        code: 'T-US-002-3',
        title: 'Cálculo de totales',
        description: 'Lógica para calcular subtotales, impuestos y total',
        effort: 3,
        status: 'TODO',
      },
      {
        storyId: story7.id,
        code: 'T-US-002-4',
        title: 'Sistema de descuentos',
        description: 'Validación y aplicación de códigos promocionales',
        effort: 5,
        status: 'TODO',
      },
      {
        storyId: story7.id,
        code: 'T-US-002-5',
        title: 'Persistencia del carrito',
        description: 'Guardar carrito en sesión/base de datos',
        effort: 2,
        status: 'TODO',
      },
    ],
  });

  console.log('  ✅ Tareas creadas:');
  console.log('     - Story 1: 4 tareas (TODAS COMPLETADAS)');
  console.log('     - Story 2: 5 tareas (TODAS COMPLETADAS)');
  console.log('     - Story 3: 6 tareas (2 completadas, 1 en progreso, 3 pendientes)');
  console.log('     - Story 4: 7 tareas (TODAS PENDIENTES)');
  console.log('     - Story 5: 6 tareas (TODAS PENDIENTES)');
  console.log('     - Story 6: 4 tareas (TODAS PENDIENTES)');
  console.log('     - Story 7: 5 tareas (TODAS PENDIENTES)');
  console.log('     TOTAL: 37 tareas');

  // ============================================================
  // RESUMEN FINAL
  // ============================================================
  console.log('\n✨ ¡Seed completado exitosamente!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 CREDENCIALES DE ACCESO PARA DESARROLLO');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('👑 ADMINISTRADOR:');
  console.log('   Email:    admin@proyecto.com');
  console.log('   Password: Admin123456');
  console.log('   Rol:      Admin del sistema\n');

  console.log('📦 PRODUCT OWNER:');
  console.log('   Email:    po@proyecto.com');
  console.log('   Password: ProductOwner123');
  console.log('   Rol:      Owner de 2 proyectos\n');

  console.log('🎯 SCRUM MASTER:');
  console.log('   Email:    sm@proyecto.com');
  console.log('   Password: ScrumMaster123');
  console.log('   Rol:      Scrum Master del Proyecto 1\n');

  console.log('💻 DESARROLLADORES:');
  console.log('   Email:    dev1@proyecto.com');
  console.log('   Password: Developer123');
  console.log('   Rol:      Developer en ambos proyectos\n');

  console.log('   Email:    dev2@proyecto.com');
  console.log('   Password: Developer123');
  console.log('   Rol:      Developer en Proyecto 1\n');

  console.log('   Email:    dev3@proyecto.com');
  console.log('   Password: Developer123');
  console.log('   Rol:      Developer en Proyecto 1\n');

  console.log('👤 USUARIO REGULAR:');
  console.log('   Email:    user@proyecto.com');
  console.log('   Password: User123456');
  console.log('   Rol:      Sin proyectos asignados\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 DATOS CREADOS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('✅ 7 Usuarios (1 admin + 6 regulares)');
  console.log('✅ 2 Proyectos');
  console.log('✅ 7 Miembros de equipo asignados');
  console.log('✅ 7 Historias de usuario (5 en Proyecto 1, 2 en Proyecto 2)');
  console.log('✅ 18 Tags en historias');
  console.log('✅ 37 Tareas asignadas a las historias\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 PRÓXIMOS PASOS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('1. Inicia el backend:');
  console.log('   npm run start:dev\n');

  console.log('2. Abre Prisma Studio para ver los datos:');
  console.log('   npx prisma studio\n');

  console.log('3. Usa las credenciales de arriba para hacer login desde el frontend\n');

  console.log('4. API disponible en:');
  console.log('   http://localhost:3000/api\n');

  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
