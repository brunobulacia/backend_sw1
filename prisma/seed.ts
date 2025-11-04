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

  console.log('    ✅ Equipo asignado (4 miembros)');

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

  console.log('👤 USUARIO REGULAR:');
  console.log('   Email:    user@proyecto.com');
  console.log('   Password: User123456');
  console.log('   Rol:      Sin proyectos asignados\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 DATOS CREADOS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('✅ 6 Usuarios (1 admin + 5 regulares)');
  console.log('✅ 2 Proyectos');
  console.log('✅ 6 Miembros de equipo asignados');
  console.log('✅ 7 Historias de usuario (5 en Proyecto 1, 2 en Proyecto 2)');
  console.log('✅ 18 Tags en historias\n');

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
