# Tests E2E - Backend SW1

Este directorio contiene todos los tests end-to-end (E2E) para la API del proyecto.

## Estructura

```
test/
├── helpers/              # Utilidades compartidas para tests
│   ├── test-helper.ts   # Helpers para autenticación y creación de datos
│   └── test-app.factory.ts # Factory para crear instancia de la app
├── auth/                 # Tests de autenticación
│   └── auth.e2e-spec.ts
├── users/               # Tests de usuarios
│   └── users.e2e-spec.ts
├── projects/            # Tests de proyectos
│   └── projects.e2e-spec.ts
├── jest-e2e.json        # Configuración de Jest para E2E
└── README.md            # Este archivo
```

## Características

### ✅ Manejo Automático de Autenticación
Los tests utilizan el `TestHelper` que maneja automáticamente:
- Creación de usuarios admin y regulares
- Login automático y obtención de tokens
- Inyección de tokens en las peticiones
- Limpieza de datos al finalizar

### ✅ Tests Organizados por Módulo
- **Auth**: Registro, login, perfil, reset de password
- **Users**: CRUD de usuarios (requiere admin)
- **Projects**: CRUD de proyectos con control de permisos

### ✅ Cobertura de Casos
Cada endpoint tiene tests para:
- ✓ Casos exitosos (happy path)
- ✓ Autenticación y autorización
- ✓ Validación de datos
- ✓ Casos de error (404, 409, etc.)
- ✓ Permisos (admin vs usuario regular)

## Uso

### Ejecutar todos los tests E2E
```bash
npm run test:e2e
```

### Ejecutar tests específicos
```bash
# Solo tests de auth
npm run test:e2e -- auth

# Solo tests de users
npm run test:e2e -- users

# Solo tests de projects
npm run test:e2e -- projects
```

### Ejecutar en modo watch
```bash
npm run test:e2e -- --watch
```

### Ver cobertura
```bash
npm run test:e2e -- --coverage
```

## Configuración

### Variables de Entorno
Asegúrate de tener configurado tu archivo `.env` con:
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="tu-secreto-jwt"
JWT_EXPIRES_IN="7d"
```

### Base de Datos de Test
Los tests utilizan la misma base de datos configurada en `DATABASE_URL`. Se recomienda:

1. **Opción 1**: Base de datos separada para tests
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/proyecto_sw1_test"
   ```

2. **Opción 2**: Usar la misma BD (los tests crean/eliminan sus propios datos)

## Helper de Testing

### TestHelper
Utilidad principal para los tests que proporciona:

```typescript
// Crear usuarios de test con autenticación automática
const adminUser = await testHelper.getAdminUser();
const regularUser = await testHelper.getRegularUser();
const customUser = await testHelper.createTestUser(isAdmin);

// Hacer peticiones autenticadas
await testHelper
  .getAuthenticatedRequest(user.token)
  .get('/api/endpoint')
  .expect(200);

// Crear proyectos de test
const project = await testHelper.createTestProject(user.token);

// Limpieza automática al finalizar
await testHelper.cleanup();
```

## Ejemplos de Uso

### Test básico con autenticación
```typescript
describe('Endpoint protegido', () => {
  let testHelper: TestHelper;
  let user: any;

  beforeAll(async () => {
    testHelper = new TestHelper(app);
    user = await testHelper.getRegularUser();
  });

  it('debe acceder con autenticación', async () => {
    const response = await testHelper
      .getAuthenticatedRequest(user.token)
      .get('/api/protected-endpoint')
      .expect(200);
    
    expect(response.body).toBeDefined();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });
});
```

### Test de permisos
```typescript
it('debe permitir acceso solo a admin', async () => {
  const admin = await testHelper.getAdminUser();
  const regular = await testHelper.getRegularUser();

  // Admin puede acceder
  await testHelper
    .getAuthenticatedRequest(admin.token)
    .get('/api/admin-endpoint')
    .expect(200);

  // Regular no puede
  await testHelper
    .getAuthenticatedRequest(regular.token)
    .get('/api/admin-endpoint')
    .expect(403);
});
```

## Mejores Prácticas

1. **Usa `beforeAll` para setup costoso** (crear usuarios, app)
2. **Usa `beforeEach` para datos que se modifican** en cada test
3. **Siempre limpia los datos** con `testHelper.cleanup()`
4. **Genera IDs únicos** usando timestamp o random
5. **Verifica tanto éxito como errores**
6. **No hagas suposiciones sobre el orden** de ejecución de tests

## Troubleshooting

### Error de conexión a BD
- Verifica que PostgreSQL esté corriendo
- Verifica las credenciales en `.env`
- Ejecuta las migraciones: `npx prisma migrate dev`

### Tests fallan por timeout
- Aumenta el timeout en `jest-e2e.json`: `"testTimeout": 30000`
- Verifica que la BD responda rápido

### Conflictos de datos
- Asegúrate de llamar `testHelper.cleanup()` en `afterAll`
- Usa timestamps para generar datos únicos

## Contribuir

Al agregar nuevos endpoints:
1. Crea un archivo `*.e2e-spec.ts` en el módulo correspondiente
2. Usa el `TestHelper` para autenticación
3. Cubre todos los casos (éxito, error, permisos)
4. Actualiza este README si es necesario

