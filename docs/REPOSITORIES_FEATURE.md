# Historia de Usuario HU10: Integración con Repositorios GitHub

## 📋 Descripción

Implementación completa de la funcionalidad de integración con repositorios GitHub que permite al equipo Scrum registrar y consultar los repositorios asociados a cada proyecto.

## 🎯 Criterios de Aceptación Cumplidos

✅ Registrar por proyecto uno o varios repositorios con nombre, URL GitHub y rama principal

✅ Ver en la vista del proyecto una lista de repositorios con su nombre, URL y rama

✅ Abrir el repositorio directamente en GitHub haciendo clic en la URL

✅ Validar que la URL tenga formato `https://github.com/owner/repo`

✅ Marcar un repositorio como principal dentro del proyecto

✅ Solo 1 repositorio puede ser principal por proyecto

✅ No se permiten URLs duplicadas dentro del mismo proyecto

✅ Solo Scrum Master/Product Owner/Propietario pueden crear/editar/eliminar repositorios

## 📂 Estructura de Archivos Creados

### Backend (`backend_sw1/`)

```
src/repositories/
├── dto/
│   ├── create-repository.dto.ts
│   └── update-repository.dto.ts
├── repositories.controller.ts
├── repositories.service.ts
└── repositories.module.ts

src/oauth-github/
├── oauthgh.controller.ts
├── oauthgh.service.ts
└── oauthgh.module.ts

test/repositories/
└── repositories.e2e-spec.ts
```

### Frontend (`frontend_sw1/`)

```
src/components/repositories/
├── RepositoryForm.tsx
├── RepositoryCard.tsx
└── RepositoryList.tsx

src/app/api/projects/[projectId]/repositories/
├── route.ts
├── [id]/
│   ├── route.ts
│   └── set-primary/route.ts

src/app/(private)/projects/[id]/repositories/
└── page.tsx
```

## 🔧 Configuración

### Variables de Entorno (Backend)

Para habilitar OAuth de GitHub, agrega a `.env`:

```env
# GitHub OAuth (Opcional)
CLIENT_ID_GITHUB=tu_client_id
CLIENT_SECRET_GITHUB=tu_client_secret
REDIRECT_URI_GITHUB=http://localhost:3000/auth/github/callback
```

**Nota:** OAuth es opcional. La funcionalidad de repositorios funciona sin OAuth.

## 🧪 Ejecución de Pruebas

### Pruebas E2E del Backend

```bash
cd backend_sw1

# Ejecutar todas las pruebas E2E
npm run test:e2e

# Ejecutar solo pruebas de Repositories
npm run test:e2e -- repositories.e2e-spec.ts

# Con cobertura
npm run test:e2e:cov
```

## 🚀 Ejecución

### Backend

```bash
cd backend_sw1
npm run start:dev
```

El backend estará disponible en `http://localhost:3000`

### Frontend

```bash
cd frontend_sw1
npm run dev
```

El frontend estará disponible en `http://localhost:3001`

## 📡 Endpoints de la API

### POST /api/projects/:projectId/repositories
Crear un repositorio

**Body:**
```json
{
  "name": "Frontend App",
  "url": "https://github.com/myorg/frontend",
  "mainBranch": "main",
  "isPrimary": true
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "name": "Frontend App",
  "url": "https://github.com/myorg/frontend",
  "mainBranch": "main",
  "isPrimary": true,
  "createdAt": "2025-11-19T00:00:00.000Z",
  "updatedAt": "2025-11-19T00:00:00.000Z"
}
```

### GET /api/projects/:projectId/repositories
Listar todos los repositorios del proyecto

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Frontend App",
    "url": "https://github.com/myorg/frontend",
    "mainBranch": "main",
    "isPrimary": true,
    "createdAt": "2025-11-19T00:00:00.000Z"
  }
]
```

### GET /api/projects/:projectId/repositories/:id
Obtener un repositorio por ID

### PUT /api/projects/:projectId/repositories/:id
Actualizar un repositorio

### DELETE /api/projects/:projectId/repositories/:id
Eliminar un repositorio

### PATCH /api/projects/:projectId/repositories/:id/set-primary
Marcar un repositorio como principal

## 🎨 Rutas del Frontend

### `/projects/[id]/repositories`
Vista principal de repositorios con:
- Lista de todos los repositorios del proyecto
- Formulario para agregar/editar repositorios
- Opciones de edición y eliminación (con permisos)
- Marcado de repositorio principal

## 🔐 Reglas de Negocio Implementadas

1. **Formato de URL**: Solo se aceptan URLs de GitHub con formato `https://github.com/owner/repo`
2. **Unicidad**: No se permiten URLs duplicadas dentro del mismo proyecto
3. **Repositorio Principal**: Solo puede haber un repositorio marcado como principal por proyecto
4. **Permisos de Creación/Edición**: Solo Scrum Master, Product Owner o propietario del proyecto
5. **Permisos de Consulta**: Todos los miembros del equipo pueden visualizar los repositorios
6. **Auto-actualización**: Al marcar un repo como principal, el anterior se desmarca automáticamente

## 📊 Características Principales

### Para Scrum Master / Product Owner
- Agregar nuevos repositorios al proyecto
- Editar información de repositorios existentes
- Eliminar repositorios
- Marcar/desmarcar repositorio principal
- Validación automática de formato de URL

### Para Desarrolladores
- Visualizar lista de repositorios del proyecto
- Acceder directamente a GitHub con un clic
- Ver información de rama principal
- Identificar fácilmente el repositorio principal

### Validaciones en el Formulario
- Campo requerido: Nombre del repositorio
- Campo requerido: URL de GitHub
- Validación de formato de URL GitHub
- Rama principal (default: "main")
- Opción para marcar como principal

## ✅ Validaciones Implementadas

### Backend
- DTO con `class-validator` para validación de datos
- Regex para validar formato de URL: `/^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/`
- Verificación de URL duplicada en el mismo proyecto
- Control de repositorio principal único por proyecto
- Verificación de permisos por rol de usuario

### Frontend
- Validación de formato de URL antes de enviar
- Mensajes de error claros y específicos
- Confirmación antes de eliminar
- Feedback visual para repositorio principal
- Estados de carga y error

## 🎨 Interfaz de Usuario

- Diseño responsivo con Tailwind CSS
- Tarjetas para cada repositorio con información relevante
- Botón para abrir directamente en GitHub (nueva pestaña)
- Badge visual para identificar el repositorio principal
- Formulario intuitivo con validación en tiempo real
- Grid responsivo (1, 2 o 3 columnas según pantalla)

## 📝 Modelo de Datos (Prisma)

```prisma
model Repository {
  id         String   @id @default(uuid()) @db.Uuid
  projectId  String   @db.Uuid
  name       String
  url        String
  mainBranch String   @default("main")
  isPrimary  Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, url])
  @@index([projectId])
}
```

## 🐛 Solución de Problemas

### Error: URL duplicada
**Problema:** "Ya existe un repositorio con esa URL en este proyecto"

**Solución:** Cada proyecto solo puede tener una vez la misma URL. Verifica que no hayas agregado ese repositorio anteriormente.

### Error: Formato de URL inválido
**Problema:** "La URL debe tener el formato https://github.com/owner/repo"

**Solución:** La URL debe seguir exactamente este formato:
- Debe comenzar con `https://github.com/`
- Debe incluir el owner (usuario u organización)
- Debe incluir el nombre del repositorio
- Ejemplo válido: `https://github.com/facebook/react`

### Error: Permisos insuficientes
**Problema:** "Solo el Scrum Master o Product Owner pueden crear repositorios"

**Solución:** Contacta al Scrum Master o Product Owner del proyecto para que agregue los repositorios.

## 🔗 Integración con GitHub OAuth (Opcional)

La aplicación incluye endpoints para OAuth de GitHub:

### Configurar OAuth App en GitHub

1. Ve a GitHub → Settings → Developer settings → OAuth Apps
2. Crea nueva OAuth App:
   - **Application Name**: Nombre de tu app
   - **Homepage URL**: `http://localhost:3000`
   - **Callback URL**: `http://localhost:3000/auth/github/callback`
3. Copia Client ID y Client Secret
4. Agrégalos a `.env` del backend

### Endpoints OAuth

- `GET /api/oauth/github/getAccessToken/:code` - Intercambiar código por token
- `GET /api/oauth/github/getUserData` - Obtener datos del usuario de GitHub

## 📚 Referencias

- [GitHub REST API](https://docs.github.com/en/rest)
- [OAuth Apps GitHub](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)

## 🧪 Casos de Prueba Cubiertos

✅ Crear repositorio por Scrum Master  
✅ Crear repositorio por Product Owner  
✅ Rechazar URL con formato inválido  
✅ Rechazar URL duplicada  
✅ Rechazar creación por Developer  
✅ Rechazar creación sin permisos  
✅ Desmarcar repo previo al marcar nuevo como primary  
✅ Listar todos los repositorios  
✅ Ordenar por isPrimary y fecha de creación  
✅ Obtener repositorio por ID  
✅ Actualizar repositorio  
✅ Rechazar actualización por Developer  
✅ Rechazar URL duplicada al actualizar  
✅ Eliminar repositorio  
✅ Rechazar eliminación por Developer  
✅ Marcar repositorio como principal  
✅ Rechazar marcado por Developer  

---

**Desarrollado por:** Sistema de Gestión Scrum  
**Fecha de implementación:** Noviembre 2025  
**Versión:** 1.0.0

