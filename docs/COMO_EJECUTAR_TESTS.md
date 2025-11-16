# 🚀 Cómo Ejecutar los Tests E2E

## ⚡ Inicio Rápido

### 1. Abre tu terminal en la carpeta del backend
```bash
cd backend_sw1
```

### 2. Ejecuta los tests
```bash
npm run test:e2e
```

¡Eso es todo! Los tests deberían comenzar a ejecutarse automáticamente.

---

## 📋 Requisitos Previos

Antes de ejecutar los tests por primera vez:

### ✅ 1. PostgreSQL debe estar corriendo
Verifica que PostgreSQL esté activo:
- Abre "Servicios" en Windows (tecla Windows + R, escribe `services.msc`)
- Busca PostgreSQL y verifica que esté "En ejecución"

### ✅ 2. Archivo .env configurado
Asegúrate de tener un archivo `.env` en la carpeta `backend_sw1` con:

```env
DATABASE_URL="postgresql://postgres:tupassword@localhost:5432/proyecto_sw1?schema=public"
JWT_SECRET="tu-secreto-jwt-aqui"
JWT_EXPIRES_IN="7d"
PORT=3000
```

**Importante**: Reemplaza `postgres` y `tupassword` con tus credenciales de PostgreSQL.

### ✅ 3. Dependencias instaladas
```bash
npm install
```

### ✅ 4. Migraciones ejecutadas
```bash
npx prisma migrate dev
```

---

## 🎮 Comandos Disponibles

### Ejecutar todos los tests
```bash
npm run test:e2e
```
**Ejecuta**: Los 56 tests de todos los módulos (Auth, Users, Projects)  
**Tiempo**: ~30-40 segundos

### Ejecutar tests de un módulo específico

```bash
# Solo tests de autenticación (15 tests)
npm run test:e2e -- auth

# Solo tests de usuarios (18 tests)
npm run test:e2e -- users

# Solo tests de proyectos (23 tests)
npm run test:e2e -- projects
```

### Modo desarrollo (watch)
```bash
npm run test:e2e:watch
```
**Útil para**: Los tests se re-ejecutan automáticamente cuando modificas archivos

### Ver cobertura de código
```bash
npm run test:e2e:cov
```
**Genera**: Un reporte HTML en `coverage-e2e/` que puedes abrir en el navegador

---

## 📊 ¿Qué Verás al Ejecutar los Tests?

### Salida Exitosa ✅

```
 PASS  test/auth/auth.e2e-spec.ts
  AuthController (e2e)
    /api/auth/register (POST)
      ✓ debe registrar un nuevo usuario exitosamente (234 ms)
      ✓ debe fallar con email duplicado (156 ms)
      ✓ debe fallar con username duplicado (145 ms)
      ✓ debe fallar con datos inválidos (89 ms)
    /api/auth/login (POST)
      ✓ debe hacer login exitosamente con email (178 ms)
      ...

 PASS  test/users/users.e2e-spec.ts
 PASS  test/projects/projects.e2e-spec.ts

Test Suites: 3 passed, 3 total
Tests:       56 passed, 56 total
Time:        34.257 s
```

### Si hay errores ❌

```
 FAIL  test/auth/auth.e2e-spec.ts
  ● AuthController (e2e) › debe registrar un nuevo usuario

    Expected: 201
    Received: 500

      45 |     .send(userData)
      46 |     .expect(201);
         |      ^
```

Ver la sección "Problemas Comunes" más abajo.

---

## 🐛 Problemas Comunes y Soluciones

### ❌ Error: "Cannot connect to database"

**Mensaje completo:**
```
PrismaClientInitializationError: Authentication failed against database server
```

**Solución:**
1. Verifica que PostgreSQL esté corriendo
2. Revisa tu archivo `.env` y asegúrate de que `DATABASE_URL` sea correcta
3. Intenta conectarte manualmente con:
   ```bash
   psql -U postgres -d proyecto_sw1
   ```
   Si esto falla, hay un problema con PostgreSQL

---

### ❌ Error: "Port already in use"

**Mensaje completo:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución:**
Tienes el backend corriendo en otra terminal. Ciérralo primero:
- Encuentra la terminal donde ejecutaste `npm start`
- Presiona `Ctrl+C`
- Vuelve a ejecutar los tests

---

### ❌ Tests muy lentos (>1 minuto)

**Posibles causas:**
- Base de datos lenta
- Conexión de red lenta (si la BD está en la nube)

**Solución:**
Usa una base de datos local para tests. Crea una BD separada:
```sql
CREATE DATABASE proyecto_sw1_test;
```

Y úsala solo para tests en tu `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/proyecto_sw1_test"
```

---

### ❌ Error: "JWT must be provided"

**Mensaje completo:**
```
401 Unauthorized
```

**Solución:**
Falta `JWT_SECRET` en tu `.env`. Añádelo:
```env
JWT_SECRET="cualquier-texto-secreto-aqui"
JWT_EXPIRES_IN="7d"
```

---

### ❌ Error: "Module not found: @src/app.module"

**Solución:**
Este es un problema de configuración. Ejecuta:
```bash
npm install
```

Si persiste, verifica que `tsconfig.json` tenga:
```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@src/*": ["src/*"]
    }
  }
}
```

---

## 🎯 ¿Qué Están Probando Estos Tests?

### Módulo Auth (Autenticación)
- ✅ Registro de nuevos usuarios
- ✅ Login con email y password
- ✅ Obtener perfil del usuario autenticado
- ✅ Solicitar reset de password
- ✅ Crear usuarios como administrador

### Módulo Users (Usuarios)
- ✅ Crear usuarios (solo admin)
- ✅ Listar todos los usuarios (solo admin)
- ✅ Obtener un usuario específico (solo admin)
- ✅ Actualizar información de usuario (solo admin)
- ✅ Enviar link de reset de password (solo admin)
- ✅ Eliminar usuarios (solo admin)

### Módulo Projects (Proyectos)
- ✅ Crear proyectos (cualquier usuario autenticado)
- ✅ Listar proyectos (con filtrado por permisos)
- ✅ Ver mis proyectos
- ✅ Obtener detalles de un proyecto
- ✅ Actualizar proyectos (owner o admin)
- ✅ Eliminar proyectos (owner o admin)

---

## 💡 Características Especiales

### 🔐 Autenticación Automática
Los tests manejan automáticamente:
- Creación de usuarios de prueba
- Login y obtención de tokens JWT
- Inyección de tokens en las peticiones
- No necesitas hacer nada manualmente!

### 🧹 Limpieza Automática
Los tests:
- Crean sus propios datos de prueba
- Los limpian al terminar
- No ensucian tu base de datos
- Cada ejecución es independiente

### 🎭 Múltiples Roles
Los tests prueban con:
- **Usuario Admin**: Tiene todos los permisos
- **Usuario Regular**: Permisos limitados
- **Sin Autenticación**: Debe ser rechazado

---

## 📚 Documentación Adicional

Para más detalles, revisa estos archivos:

1. **RESUMEN_TESTS_CREADOS.md** - Resumen completo de lo creado
2. **GUIA_TESTS_E2E.md** - Guía técnica detallada
3. **test/README.md** - Documentación de la estructura de tests
4. **test/ejemplo-ejecucion.md** - Ejemplos paso a paso

---

## 🆘 ¿Aún Tienes Problemas?

### Paso 1: Verifica la conexión del backend
```bash
npm start
```

Si el backend inicia sin errores, presiona `Ctrl+C` y continúa.  
Si falla, soluciona ese problema primero.

### Paso 2: Verifica las migraciones
```bash
npx prisma migrate dev
```

Esto asegura que tu base de datos tenga las tablas correctas.

### Paso 3: Reinstala dependencias
```bash
rm -rf node_modules package-lock.json
npm install
```

### Paso 4: Ejecuta tests en modo verbose
```bash
npm run test:e2e -- --verbose
```

Esto mostrará más detalles sobre qué está fallando.

---

## ✅ Checklist Antes de Ejecutar

- [ ] PostgreSQL está corriendo
- [ ] Archivo `.env` existe y tiene `DATABASE_URL` y `JWT_SECRET`
- [ ] Ejecutaste `npm install`
- [ ] Ejecutaste `npx prisma migrate dev`
- [ ] El backend puede iniciar sin errores (`npm start`)

Si todos están marcados, ejecuta:
```bash
npm run test:e2e
```

---

## 🎉 ¡Éxito!

Si ves esto:
```
Test Suites: 3 passed, 3 total
Tests:       56 passed, 56 total
```

**¡Felicidades! 🎊** Todos los tests pasaron exitosamente.

Tu API está:
- ✅ Funcionando correctamente
- ✅ Validando datos apropiadamente
- ✅ Manejando autenticación
- ✅ Verificando permisos
- ✅ Retornando respuestas correctas

---

## 🚀 Siguientes Pasos

Ahora que tienes tests funcionando:

1. **Ejecuta los tests regularmente** antes de hacer commits
2. **Añade tests nuevos** cuando agregues funcionalidad
3. **Usa `test:e2e:watch`** mientras desarrollas
4. **Revisa la cobertura** con `test:e2e:cov`

---

**¿Listo? ¡Ejecuta los tests ahora!**

```bash
npm run test:e2e
```

