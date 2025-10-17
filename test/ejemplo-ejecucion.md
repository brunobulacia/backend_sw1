# Ejemplo de Ejecución de Tests E2E

## 📋 Pre-requisitos

Antes de ejecutar los tests, asegúrate de:

1. ✅ Tener PostgreSQL corriendo
2. ✅ Tener el archivo `.env` configurado correctamente
3. ✅ Haber instalado las dependencias: `npm install`
4. ✅ Haber ejecutado las migraciones: `npx prisma migrate dev`

## 🚀 Ejecución Paso a Paso

### 1. Verificar que el backend funciona

```bash
# Asegúrate de que el backend puede conectarse a la BD
npm start
```

Deberías ver algo como:
```
[Nest] Starting Nest application...
[Nest] Nest application successfully started
```

Si ves esto, presiona `Ctrl+C` para detener el servidor y continuar con los tests.

### 2. Ejecutar todos los tests

```bash
npm run test:e2e
```

**Salida esperada:**
```
 PASS  test/auth/auth.e2e-spec.ts (12.456 s)
  AuthController (e2e)
    /api/auth/register (POST)
      ✓ debe registrar un nuevo usuario exitosamente (234 ms)
      ✓ debe fallar con email duplicado (156 ms)
      ✓ debe fallar con username duplicado (145 ms)
      ✓ debe fallar con datos inválidos (89 ms)
    /api/auth/login (POST)
      ✓ debe hacer login exitosamente con email (178 ms)
      ✓ debe fallar con credenciales incorrectas (156 ms)
      ✓ debe fallar con email no existente (123 ms)
    /api/auth/profile (GET)
      ✓ debe obtener el perfil del usuario autenticado (134 ms)
      ✓ debe fallar sin token (45 ms)
      ✓ debe fallar con token inválido (67 ms)
    /api/auth/request-password-reset (POST)
      ✓ debe solicitar reset de password exitosamente (189 ms)
      ✓ debe aceptar solicitud incluso con email no existente (145 ms)
    /api/auth/admin/create-user (POST)
      ✓ debe permitir a admin crear un nuevo usuario (234 ms)
      ✓ debe denegar acceso a usuario regular (123 ms)
      ✓ debe denegar acceso sin autenticación (89 ms)

 PASS  test/users/users.e2e-spec.ts (10.234 s)
  UsersController (e2e)
    /api/users (POST)
      ✓ debe permitir a admin crear un nuevo usuario (245 ms)
      ✓ debe denegar acceso a usuario regular (134 ms)
      ✓ debe denegar acceso sin autenticación (78 ms)
    /api/users (GET)
      ✓ debe permitir a admin obtener todos los usuarios (156 ms)
      ✓ debe denegar acceso a usuario regular (123 ms)
      ✓ debe denegar acceso sin autenticación (67 ms)
    /api/users/:id (GET)
      ✓ debe permitir a admin obtener un usuario específico (178 ms)
      ✓ debe retornar 404 para usuario no existente (89 ms)
      ✓ debe denegar acceso a usuario regular (112 ms)
    /api/users/:id (PATCH)
      ✓ debe permitir a admin actualizar un usuario (189 ms)
      ✓ debe permitir actualizar el timezone (167 ms)
      ✓ debe denegar acceso a usuario regular (134 ms)
    /api/users/:id/send-reset-link (POST)
      ✓ debe permitir a admin enviar link de reset (198 ms)
      ✓ debe denegar acceso a usuario regular (123 ms)
      ✓ debe denegar acceso sin autenticación (78 ms)
    /api/users/:id (DELETE)
      ✓ debe permitir a admin eliminar un usuario (234 ms)
      ✓ debe retornar 404 para usuario no existente (89 ms)
      ✓ debe denegar acceso a usuario regular (112 ms)

 PASS  test/projects/projects.e2e-spec.ts (11.567 s)
  ProjectsController (e2e)
    /api/projects (POST)
      ✓ debe permitir a usuario autenticado crear un proyecto (256 ms)
      ✓ debe crear proyecto con visibilidad PUBLIC (234 ms)
      ✓ debe fallar con código duplicado (198 ms)
      ✓ debe denegar acceso sin autenticación (67 ms)
      ✓ debe fallar con datos inválidos (89 ms)
    /api/projects (GET)
      ✓ debe permitir a admin ver todos los proyectos (178 ms)
      ✓ debe permitir a usuario regular ver sus proyectos (167 ms)
      ✓ debe denegar acceso sin autenticación (78 ms)
    /api/projects/my-projects (GET)
      ✓ debe retornar solo los proyectos del usuario autenticado (189 ms)
      ✓ debe retornar array vacío si no tiene proyectos (145 ms)
      ✓ debe denegar acceso sin autenticación (67 ms)
    /api/projects/:id (GET)
      ✓ debe permitir al owner ver su proyecto (156 ms)
      ✓ debe permitir a admin ver cualquier proyecto (134 ms)
      ✓ debe denegar acceso a proyecto privado de otro usuario (123 ms)
      ✓ debe retornar 404 para proyecto no existente (89 ms)
    /api/projects/:id (PATCH)
      ✓ debe permitir al owner actualizar su proyecto (234 ms)
      ✓ debe permitir a admin actualizar cualquier proyecto (198 ms)
      ✓ debe denegar acceso a usuario no autorizado (123 ms)
      ✓ debe permitir cambiar visibilidad del proyecto (178 ms)
    /api/projects/:id (DELETE)
      ✓ debe permitir al owner eliminar su proyecto (245 ms)
      ✓ debe permitir a admin eliminar cualquier proyecto (212 ms)
      ✓ debe denegar acceso a usuario no autorizado (134 ms)
      ✓ debe retornar 404 para proyecto no existente (89 ms)

Test Suites: 3 passed, 3 total
Tests:       48 passed, 48 total
Snapshots:   0 total
Time:        34.257 s
```

### 3. Ejecutar tests de un módulo específico

#### Solo tests de Auth:
```bash
npm run test:e2e -- auth
```

#### Solo tests de Users:
```bash
npm run test:e2e -- users
```

#### Solo tests de Projects:
```bash
npm run test:e2e -- projects
```

### 4. Ejecutar en modo watch (desarrollo)

```bash
npm run test:e2e:watch
```

Esto mantendrá los tests corriendo y se re-ejecutarán automáticamente cuando modifiques algún archivo.

### 5. Ejecutar tests con cobertura

```bash
npm run test:e2e:cov
```

Esto generará un reporte de cobertura en `coverage-e2e/`:

```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
--------------------|---------|----------|---------|---------|-------------------
All files           |   87.45 |    78.92 |   91.23 |   88.67 |                   
 auth               |   92.15 |    85.45 |   95.67 |   93.45 |                   
  auth.controller   |   95.23 |    88.12 |   98.45 |   96.78 | 78,85            
  auth.service      |   89.67 |    82.34 |   92.45 |   90.12 | 145,167,234      
 users              |   88.34 |    76.89 |   89.45 |   87.23 |                   
  users.controller  |   91.23 |    79.45 |   93.67 |   90.45 | 45,67            
  users.service     |   85.45 |    74.12 |   85.23 |   84.01 | 89,123,167       
 projects           |   82.67 |    74.56 |   87.89 |   83.45 |                   
  projects.controller| 89.12 |    78.34 |   91.23 |   88.67 | 56,78            
  projects.service  |   76.23 |    70.78 |   84.56 |   78.23 | 123,156,234,267  
--------------------|---------|----------|---------|---------|-------------------
```

## 🔍 Interpretando los Resultados

### ✅ Test Exitoso
```
✓ debe registrar un nuevo usuario exitosamente (234 ms)
```
- ✅ Checkmark verde: El test pasó
- `234 ms`: Tiempo que tardó el test

### ❌ Test Fallido
```
✕ debe registrar un nuevo usuario exitosamente (234 ms)

  Expected: 201
  Received: 400

  > 45 |     .expect(201);
```
- ❌ X roja: El test falló
- Muestra qué esperaba vs qué recibió
- Indica la línea donde falló

### ⚠️ Test Omitido
```
○ debe registrar un nuevo usuario exitosamente
```
- ○ Círculo: Test omitido (skip)

## 🐛 Problemas Comunes y Soluciones

### 1. Error: "Cannot connect to database"

**Problema:**
```
PrismaClientInitializationError: Authentication failed against database
```

**Solución:**
```bash
# Verifica que PostgreSQL esté corriendo
# Windows:
services.msc  # Busca PostgreSQL y verifica que esté corriendo

# Verifica tu .env
cat .env  # O abre el archivo

# Asegúrate de que DATABASE_URL sea correcta
DATABASE_URL="postgresql://postgres:tupassword@localhost:5432/proyecto_sw1"
```

### 2. Error: "Port 3000 already in use"

**Problema:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución:**
```bash
# Detén el servidor que esté corriendo
# Windows PowerShell:
Get-Process -Name node | Stop-Process

# O simplemente cierra la terminal donde tengas npm start
```

### 3. Tests muy lentos

**Problema:** Los tests tardan más de 1 minuto.

**Solución:**
```bash
# Verifica la conexión a la BD
# Considera usar una BD local en lugar de una remota

# Aumenta el timeout en jest-e2e.json si es necesario
{
  "testTimeout": 60000  // 60 segundos
}
```

### 4. Error: "JWT must be provided"

**Problema:**
```
401 Unauthorized: JWT must be provided
```

**Solución:**
Verifica que tu `.env` tenga:
```env
JWT_SECRET="tu-secreto-jwt"
JWT_EXPIRES_IN="7d"
```

### 5. Tests fallan aleatoriamente

**Problema:** Algunos tests pasan a veces y fallan otras veces.

**Posibles causas:**
- Datos de tests anteriores no se limpiaron
- Tests no son independientes
- Condiciones de carrera

**Solución:**
```bash
# Ejecuta los tests uno por uno para identificar el problema
npm run test:e2e -- --runInBand

# Esto ejecuta los tests secuencialmente en lugar de en paralelo
```

## 📊 Verificar Estado de la Base de Datos

Si quieres ver los datos que se crearon durante los tests:

```bash
# Abrir Prisma Studio
npx prisma studio
```

Esto abrirá una interfaz web donde puedes ver todas las tablas y datos.

**Nota:** Los tests deberían limpiar sus datos automáticamente, pero si ves muchos usuarios/proyectos con nombres como `testuser-1234567890`, es normal que queden algunos si los tests fueron interrumpidos.

## 🎯 Siguiente Paso: Integración Continua

Una vez que los tests funcionen localmente, puedes configurar CI/CD:

```yaml
# .github/workflows/test.yml (ejemplo para GitHub Actions)
name: Tests E2E

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: proyecto_sw1_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'
    
    - name: Install dependencies
      run: |
        cd backend_sw1
        npm install
    
    - name: Run migrations
      run: |
        cd backend_sw1
        npx prisma migrate deploy
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/proyecto_sw1_test
    
    - name: Run E2E tests
      run: |
        cd backend_sw1
        npm run test:e2e
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/proyecto_sw1_test
        JWT_SECRET: test-secret-key
```

## ✨ Resumen

```bash
# 1. Instalar dependencias
npm install

# 2. Verificar conexión a BD
npm start  # Luego Ctrl+C

# 3. Ejecutar tests
npm run test:e2e

# 4. Ver cobertura
npm run test:e2e:cov

# 5. Modo desarrollo
npm run test:e2e:watch
```

¡Eso es todo! 🎉

