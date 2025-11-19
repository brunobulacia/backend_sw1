# Historia de Usuario HU8: Daily Scrum Digital

## 📋 Descripción

Implementación completa de la funcionalidad de Daily Scrum Digital que permite al equipo Scrum registrar sus daily scrums respondiendo las 3 preguntas clave y visualizando impedimentos.

## 🎯 Criterios de Aceptación Cumplidos

✅ Permitir seleccionar el sprint en curso y la fecha de la daily (por defecto, el día actual del sprint)

✅ Mostrar para cada miembro del equipo un formulario con las preguntas estándar:
  - ¿Qué hice ayer?
  - ¿Qué haré hoy?
  - ¿Qué impedimentos tengo?

✅ Registrar una entrada de daily por usuario y por día, editable solo durante ese día

✅ Permitir vincular la daily con una o varias historias/tareas del Sprint Backlog

✅ Ofrecer al Scrum Master una vista consolidada con todas las respuestas del día

✅ Mantener un historial de dailies por sprint, con filtros por fecha y por miembro del equipo

## 📂 Estructura de Archivos Creados

### Backend (`backend_sw1/`)

```
src/daily-scrum/
├── dto/
│   ├── create-daily-scrum.dto.ts
│   ├── update-daily-scrum.dto.ts
│   └── daily-scrum-response.dto.ts
├── daily-scrum.controller.ts
├── daily-scrum.service.ts
└── daily-scrum.module.ts

test/daily-scrum/
└── daily-scrum.e2e-spec.ts
```

### Frontend (`frontend_sw1/`)

```
src/components/daily-scrum/
├── DailyScrumForm.tsx
├── DailyScrumCard.tsx
└── ConsolidatedDailyView.tsx

src/app/api/daily-scrum/
├── route.ts
├── [id]/route.ts
└── sprint/[sprintId]/
    ├── route.ts
    ├── consolidated/route.ts
    └── history/route.ts

src/app/(private)/projects/[id]/sprints/[sprintId]/daily/
├── page.tsx                    # Crear/editar daily
├── consolidated/page.tsx       # Vista consolidada
└── history/page.tsx            # Historial
```

## 🔧 Instalación

### 1. Solución del Problema de Canvas

Se eliminó la dependencia `chartjs-node-canvas` del `package.json` que causaba errores de compilación en Windows debido a que requería Visual Studio con herramientas de C++.

### 2. Instalar Dependencias del Backend

```bash
cd backend_sw1
npm install
```

### 3. Ejecutar Migraciones de Prisma

Los modelos `DailyScrum` y `DailyScrumStory` ya están definidos en el schema de Prisma. Si no has ejecutado las migraciones:

```bash
npx prisma migrate dev
```

### 4. Instalar Dependencias del Frontend

```bash
cd frontend_sw1
npm install
```

## 🧪 Ejecución de Pruebas

### Pruebas E2E del Backend

```bash
cd backend_sw1

# Ejecutar todas las pruebas E2E
npm run test:e2e

# Ejecutar solo pruebas de Daily Scrum
npm run test:e2e -- daily-scrum.e2e-spec.ts

# Con cobertura
npm run test:e2e:cov
```

### Pruebas Unitarias

```bash
npm run test
```

## 🚀 Ejecución

### Backend

```bash
cd backend_sw1

# Modo desarrollo
npm run start:dev

# Modo producción
npm run start:prod
```

El backend estará disponible en `http://localhost:3000`

### Frontend

```bash
cd frontend_sw1

# Modo desarrollo
npm run dev

# Construir para producción
npm run build
npm start
```

El frontend estará disponible en `http://localhost:3001`

## 📡 Endpoints de la API

### POST /api/daily-scrum
Crear o actualizar un daily scrum

**Body:**
```json
{
  "sprintId": "uuid",
  "date": "2025-11-19",
  "whatDidYesterday": "Implementé la funcionalidad X",
  "whatWillDoToday": "Voy a hacer pruebas",
  "impediments": "Problema con el servidor",
  "storyIds": ["uuid1", "uuid2"]
}
```

### GET /api/daily-scrum/:id
Obtener un daily scrum por ID

### PUT /api/daily-scrum/:id
Actualizar un daily scrum (solo del día actual)

### GET /api/daily-scrum/sprint/:sprintId
Listar dailies de un sprint

**Query params:**
- `date`: Filtrar por fecha (YYYY-MM-DD)
- `memberId`: Filtrar por miembro del equipo (UUID)

### GET /api/daily-scrum/sprint/:sprintId/consolidated
Vista consolidada del daily (para Scrum Master)

**Query params:**
- `date`: Fecha del daily (default: hoy)

### GET /api/daily-scrum/sprint/:sprintId/history
Historial de dailies del sprint agrupado por fecha

## 🎨 Rutas del Frontend

### `/projects/[id]/sprints/[sprintId]/daily`
Formulario para crear/editar el daily scrum del día actual

### `/projects/[id]/sprints/[sprintId]/daily/consolidated`
Vista consolidada para el Scrum Master con todos los reportes del día y impedimentos destacados

### `/projects/[id]/sprints/[sprintId]/daily/history`
Historial completo de dailies del sprint con filtros

## 🔐 Reglas de Negocio Implementadas

1. **Unicidad**: Cada combinación (sprint, fecha, miembro) tiene máximo una daily registrada
2. **Permisos**: Solo usuarios con rol del equipo de desarrollo pueden registrar o visualizar dailies
3. **Edición temporal**: Los dailies solo pueden editarse el mismo día de su creación
4. **Validación de fechas**: La fecha del daily debe estar dentro del rango del sprint
5. **Impedimentos**: Los impedimentos se destacan automáticamente en la vista consolidada

## 📊 Características Principales

### Para Desarrolladores
- Formulario intuitivo con las 3 preguntas clave
- Selección de historias relacionadas
- Edición del daily del día actual
- Vista de su propio historial

### Para Scrum Master
- Vista consolidada de todos los reportes del día
- Impedimentos destacados visualmente
- Filtros por fecha y miembro del equipo
- Historial completo del sprint

### Para Product Owner
- Acceso a todas las vistas para seguimiento del equipo
- Visualización de progreso y bloqueos

## ✅ Validaciones

- Campo requerido: ¿Qué hice ayer?
- Campo requerido: ¿Qué haré hoy?
- Campo opcional: Impedimentos
- Selección opcional de historias del sprint
- La fecha debe estar dentro del rango del sprint
- Solo se puede editar el daily del día actual

## 🎨 Interfaz de Usuario

- Diseño responsivo con Tailwind CSS
- Componentes reutilizables
- Feedback visual para impedimentos
- Estados de carga y error
- Navegación intuitiva

## 📝 Notas Técnicas

### Backend
- Arquitectura modular con NestJS
- DTOs con validación mediante class-validator
- Servicios con lógica de negocio separada
- Controladores RESTful
- Integración completa con Prisma ORM
- Pruebas E2E completas

### Frontend
- Next.js 15 con App Router
- React Server Components y Client Components
- TypeScript para type-safety
- Componentes modulares y reutilizables
- Manejo de estados con hooks de React

## 🐛 Solución de Problemas

### Error de Canvas en Windows
**Problema:** `npm install` falla con error de `canvas` requiriendo Visual Studio

**Solución:** Se eliminó `chartjs-node-canvas` del package.json. La funcionalidad de exportación de gráficos ahora usa solo PDF con datos textuales.

### Error de CORS
**Problema:** El frontend no puede conectarse al backend

**Solución:** Verificar que el backend esté corriendo en el puerto correcto y que las variables de entorno estén configuradas.

## 📚 Referencias

- [Scrum Guide](https://scrumguides.org/)
- [Daily Scrum Best Practices](https://www.scrum.org/resources/what-is-a-daily-scrum)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Desarrollado por:** Sistema de Gestión Scrum  
**Fecha de implementación:** Noviembre 2025  
**Versión:** 1.0.0

