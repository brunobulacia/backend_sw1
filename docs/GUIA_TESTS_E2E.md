# Guía de Tests E2E - Backend SW1

## 🎯 ¿Qué se ha creado?

Se ha implementado una suite completa de tests end-to-end (E2E) para todos los endpoints de la API con las siguientes características:

### ✅ Características Principales

1. **Autenticación Automática**: Los tests manejan automáticamente el login y los tokens JWT
2. **Estructura Modular**: Tests organizados por módulo (auth, users, projects)
3. **Helpers Reutilizables**: Utilidades para crear usuarios, proyectos y hacer peticiones autenticadas
4. **Limpieza Automática**: Los datos de test se limpian automáticamente al finalizar
5. **Cobertura Completa**: Casos de éxito, errores, validaciones y permisos

## 📁 Estructura Creada

```
backend_sw1/
├── test/
│   ├── helpers/
│   │   ├── test-helper.ts         # Helper principal con autenticación automática
│   │   └── test-app.factory.ts    # Factory para crear la app de test
│   ├── auth/
│   │   └── auth.e2e-spec.ts       # Tests de autenticación (register, login, profile)
│   ├── users/
│   │   └── users.e2e-spec.ts      # Tests CRUD de usuarios
│   ├── projects/
│   │   └── projects.e2e-spec.ts   # Tests CRUD de proyectos
│   ├── jest-e2e.json               # Configuración de Jest para E2E
│   └── README.md                   # Documentación detallada
├── tsconfig.json                   # Actualizado con path alias @src/*
└── package.json                    # Actualizado con scripts de test
```

## 🚀 Cómo Ejecutar los Tests

### Instalar dependencia de tipos (si aún no lo hiciste)
```bash
cd backend_sw1
npm install
```

### Ejecutar todos los tests E2E
```bash
npm run test:e2e
```

### Ejecutar tests específicos
```bash
# Solo tests de autenticación
npm run test:e2e -- auth

# Solo tests de usuarios
npm run test:e2e -- users

# Solo tests de proyectos
npm run test:e2e -- projects
```

### Ejecutar en modo watch (útil durante desarrollo)
```bash
npm run test:e2e:watch
```

### Ver cobertura de código
```bash
npm run test:e2e:cov
```

## 📝 Ejemplos de Tests Creados

### 1. Tests de Autenticación (`auth.e2e-spec.ts`)

**Endpoints probados:**
- ✅ `POST /api/auth/register` - Registro de usuarios
- ✅ `POST /api/auth/login` - Login
- ✅ `GET /api/auth/profile` - Obtener perfil (requiere autenticación)
- ✅ `POST /api/auth/request-password-reset` - Solicitar reset de password
- ✅ `POST /api/auth/admin/create-user` - Crear usuario como admin

**Ejemplo de test:**
```typescript
it('debe hacer login exitosamente con email', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({
      email: testUser.email,
      password: 'Test123!@#',
    })
    .expect(201);

  expect(response.body).toHaveProperty('access_token');
});
```

### 2. Tests de Usuarios (`users.e2e-spec.ts`)

**Endpoints probados:**
- ✅ `POST /api/users` - Crear usuario (solo admin)
- ✅ `GET /api/users` - Listar usuarios (solo admin)
- ✅ `GET /api/users/:id` - Obtener usuario (solo admin)
- ✅ `PATCH /api/users/:id` - Actualizar usuario (solo admin)
- ✅ `POST /api/users/:id/send-reset-link` - Enviar link de reset (solo admin)
- ✅ `DELETE /api/users/:id` - Eliminar usuario (solo admin)

**Ejemplo con autenticación:**
```typescript
it('debe permitir a admin obtener todos los usuarios', async () => {
  const response = await testHelper
    .getAuthenticatedRequest(adminUser.token)
    .get('/api/users')
    .expect(200);

  expect(Array.isArray(response.body)).toBe(true);
});
```

### 3. Tests de Proyectos (`projects.e2e-spec.ts`)

**Endpoints probados:**
- ✅ `POST /api/projects` - Crear proyecto
- ✅ `GET /api/projects` - Listar proyectos
- ✅ `GET /api/projects/my-projects` - Mis proyectos
- ✅ `GET /api/projects/:id` - Obtener proyecto
- ✅ `PATCH /api/projects/:id` - Actualizar proyecto
- ✅ `DELETE /api/projects/:id` - Eliminar proyecto

**Ejemplo de permisos:**
```typescript
it('debe permitir al owner actualizar su proyecto', async () => {
  const response = await testHelper
    .getAuthenticatedRequest(regularUser.token)
    .patch(`/api/projects/${projectId}`)
    .send({ name: 'Nombre Actualizado' })
    .expect(200);
});
```

## 🔧 Uso del TestHelper

El `TestHelper` es la utilidad principal que simplifica los tests:

### Crear usuarios de test con autenticación automática

```typescript
// Obtener usuario admin (lo crea si no existe)
const adminUser = await testHelper.getAdminUser();

// Obtener usuario regular (lo crea si no existe)
const regularUser = await testHelper.getRegularUser();

// Crear usuario personalizado
const customUser = await testHelper.createTestUser(isAdmin);
```

### Hacer peticiones autenticadas

```typescript
// GET con autenticación
await testHelper
  .getAuthenticatedRequest(user.token)
  .get('/api/endpoint')
  .expect(200);

// POST con autenticación
await testHelper
  .getAuthenticatedRequest(user.token)
  .post('/api/endpoint')
  .send(data)
  .expect(201);

// PATCH con autenticación
await testHelper
  .getAuthenticatedRequest(user.token)
  .patch('/api/endpoint/123')
  .send(updateData)
  .expect(200);

// DELETE con autenticación
await testHelper
  .getAuthenticatedRequest(user.token)
  .delete('/api/endpoint/123')
  .expect(200);
```

### Crear proyectos de test

```typescript
const project = await testHelper.createTestProject(user.token);
// Retorna el proyecto creado con id, code, name, ownerId
```

### Limpieza automática

```typescript
afterAll(async () => {
  await testHelper.cleanup(); // Elimina todos los datos de test
  await app.close();
});
```

## 📊 Cobertura de Tests

Cada endpoint está probado con:

1. ✅ **Caso exitoso (happy path)**: Funcionalidad normal
2. ✅ **Autenticación**: Verifica que requiere token
3. ✅ **Autorización**: Verifica permisos (admin vs regular)
4. ✅ **Validación**: Datos inválidos retornan 400
5. ✅ **Errores**: 404, 409, etc.
6. ✅ **Casos límite**: Duplicados, no existentes, etc.

## 🎨 Escribir Nuevos Tests

### Plantilla básica

```typescript
import { INestApplication } from '@nestjs/common';
import { TestAppFactory } from '../helpers/test-app.factory';
import { TestHelper } from '../helpers/test-helper';

describe('MiController (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;
  let adminUser: any;

  beforeAll(async () => {
    app = await TestAppFactory.createTestApp();
    testHelper = new TestHelper(app);
    adminUser = await testHelper.getAdminUser();
  });

  afterAll(async () => {
    await testHelper.cleanup();
    await app.close();
  });

  describe('/api/mi-endpoint (GET)', () => {
    it('debe funcionar correctamente', async () => {
      const response = await testHelper
        .getAuthenticatedRequest(adminUser.token)
        .get('/api/mi-endpoint')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
```

## 🔍 Verificar Resultados

### Resultados esperados al ejecutar los tests:

```
PASS  test/auth/auth.e2e-spec.ts
  AuthController (e2e)
    /api/auth/register (POST)
      ✓ debe registrar un nuevo usuario exitosamente
      ✓ debe fallar con email duplicado
      ✓ debe fallar con username duplicado
      ✓ debe fallar con datos inválidos
    /api/auth/login (POST)
      ✓ debe hacer login exitosamente con email
      ✓ debe fallar con credenciales incorrectas
      ✓ debe fallar con email no existente
    /api/auth/profile (GET)
      ✓ debe obtener el perfil del usuario autenticado
      ✓ debe fallar sin token
      ✓ debe fallar con token inválido
    ...

PASS  test/users/users.e2e-spec.ts
PASS  test/projects/projects.e2e-spec.ts

Test Suites: 3 passed, 3 total
Tests:       XX passed, XX total
```

## 🛠️ Troubleshooting

### Error: Cannot connect to database
**Solución**: Verifica que PostgreSQL esté corriendo y que el `.env` tenga las credenciales correctas.

### Error: Port already in use
**Solución**: Asegúrate de que no haya otra instancia de la app corriendo. Los tests usan un puerto dinámico.

### Tests muy lentos
**Solución**: Verifica la conexión a la base de datos. Considera usar una BD local para tests.

### Error: Token invalid
**Solución**: Verifica que `JWT_SECRET` en `.env` sea el mismo usado por los tests.

## 📚 Más Información

Para más detalles sobre la implementación, consulta:
- `test/README.md` - Documentación detallada
- `test/helpers/test-helper.ts` - Código del helper
- Cualquier archivo `*.e2e-spec.ts` - Ejemplos de tests

## 🎓 Mejores Prácticas Aplicadas

1. ✅ **Tests independientes**: Cada test puede ejecutarse solo
2. ✅ **Datos únicos**: Uso de timestamps para evitar colisiones
3. ✅ **Limpieza automática**: No deja basura en la BD
4. ✅ **Setup compartido**: `beforeAll` para operaciones costosas
5. ✅ **Nomenclatura clara**: Descripción legible de cada test
6. ✅ **Assertions completas**: Verifica estructura de respuestas
7. ✅ **Manejo de errores**: Tests tanto para éxito como fallo

---

## 🎉 ¡Todo Listo!

Ya tienes una suite completa de tests E2E que:
- ✅ Prueba todos tus endpoints
- ✅ Maneja autenticación automáticamente
- ✅ Verifica permisos y validaciones
- ✅ Se ejecuta de forma automatizada
- ✅ Tiene estructura modular y mantenible

**Para ejecutar:** `npm run test:e2e`

