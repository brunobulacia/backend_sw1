# 🧪 GUÍA DE PRUEBAS MANUALES - Validar Correcciones Críticas

## 🎯 Objetivo

Esta guía te permite verificar manualmente que las correcciones críticas funcionan correctamente.

---

## ✅ PRUEBA 1: HU11 - Acción de Mejora Obligatoria

### Pasos:
1. Ejecuta el backend: `npm run start:dev`
2. Ejecuta el frontend: `npm run dev`
3. Ve a un sprint completado o en progreso
4. Click en "Crear Retrospective"
5. Llena las 3 preguntas
6. **NO agregues ninguna acción de mejora**
7. Click en "Guardar"

### Resultado Esperado:
❌ **Debe mostrar error:** "Es obligatorio registrar al menos una acción de mejora"

### Si pasa el test:
✅ HU11 corregido correctamente

---

## ✅ PRUEBA 2: HU12 - Vinculación Automática de Commits

### Preparación:
1. Crea un repositorio en el proyecto
2. Crea una historia con código "US-001"
3. Crea una tarea con código "T-001-1"

### Prueba con cURL (o Postman):
```bash
# Sincronizar repositorio (simulado - usará datos reales si el repo existe en GitHub)
curl -X POST http://localhost:8000/api/repositories/{repoId}/sync \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Si tienes repo real en GitHub:
1. Haz un commit con mensaje: `"Fix bug in US-001"`
2. Sincroniza en la UI
3. Ve al detalle de la historia US-001
4. Click en "Actividad de GitHub"

### Resultado Esperado:
✅ **El commit debe aparecer automáticamente vinculado** sin intervención manual

### API para verificar:
```bash
GET /api/stories/{storyId}/github-activity

Respuesta esperada:
{
  "commits": [
    {
      "shortSha": "a1b2c3d",
      "message": "Fix bug in US-001",
      "branch": "main",
      "url": "https://github.com/...",
      "linkedStoryId": "{storyId}"  ← AUTOMÁTICO
    }
  ]
}
```

---

## ✅ PRUEBA 3: HU13 - Actualización Automática de PSP

### Pasos:
1. Como Developer, asigna una tarea a ti mismo
2. Ve a "Mi PSP" y anota las métricas actuales
   ```
   Tareas completadas: 0
   Tareas reabiertas: 0
   ```
3. **NO cierres la pestaña del PSP**
4. Mueve la tarea en Kanban: TODO → IN_PROGRESS → DONE
5. Recarga la página "Mi PSP"

### Resultado Esperado:
✅ **Las métricas deben estar actualizadas:**
```
Tareas completadas: 1  ← Actualizado automáticamente
Tiempo promedio: X.X horas
```

### Prueba de Reapertura:
1. Mueve la tarea: DONE → IN_PROGRESS
2. Recarga "Mi PSP"

### Resultado Esperado:
✅ **Métricas actualizadas:**
```
Tareas completadas: 0  ← Actualizado
Tareas reabiertas: 1   ← Incrementado automáticamente
```

---

## ✅ PRUEBA 4: HU14 - Importar JSON de Refactoring

### Preparación:
Crea un archivo `refactoring-report.json`:
```json
{
  "suggestions": [
    {
      "filePath": "src/services/user.service.ts",
      "description": "Método muy largo (50+ líneas)",
      "severity": "HIGH",
      "lineNumber": 45,
      "tool": "SonarQube",
      "category": "complexity"
    },
    {
      "filePath": "src/controllers/auth.controller.ts",
      "description": "Duplicación de código",
      "severity": "MEDIUM",
      "lineNumber": 123,
      "tool": "ESLint",
      "category": "duplication"
    }
  ]
}
```

### Pasos:
1. Ve a la vista de Repositorios
2. Selecciona un repositorio
3. Click en "Importar JSON"
4. Selecciona el archivo `refactoring-report.json`
5. Click en "Abrir"

### Resultado Esperado:
✅ **Mensaje:** "2 sugerencias importadas exitosamente"
✅ **Lista muestra:** 2 sugerencias con severidad, archivo, línea
✅ **Sin duplicados** si ejecutas 2 veces

### Prueba de Resumen:
```bash
GET /api/sprints/{sprintId}/refactoring/summary

Respuesta esperada:
{
  "total": 2,
  "resolved": 0,
  "pending": 2,
  "percentageResolved": 0,
  "bySeverity": {
    "high": 1,
    "medium": 1,
    "low": 0
  }
}
```

---

## ✅ PRUEBA 5: HU14 - Solo Developers Pueden Actualizar

### Pasos:
1. Importa sugerencias (como Scrum Master o Product Owner)
2. Intenta marcar una como "Resolved"

### Resultado Esperado:
❌ **Error 403:** "Solo los Developers pueden cambiar el estado"

### Ahora como Developer:
1. Login como Developer
2. Intenta marcar como "Resolved"

### Resultado Esperado:
✅ **Success:** Estado cambiado a RESOLVED

---

## ✅ PRUEBA 6: HU15 - Algoritmo ML Mejorado

### Preparación:
- Developer 1: 10 tareas completadas, 2 activas
- Developer 2: 5 tareas completadas, 0 activas
- Historia nueva con tags similares a tareas de Dev 1

### Pasos:
```bash
POST /api/ml/assignment-suggestion
{
  "storyId": "{storyId}",
  "taskId": "{taskId}"
}
```

### Resultado Esperado:
```json
{
  "suggestedUserId": "{dev2Id}",  ← Dev 2 (menos carga)
  "confidenceScore": 0.85,
  "reason": "Carga: 0 tareas. Experiencia similar: 2. Total: 5",
  "suggestedUser": {
    "firstName": "Developer",
    "lastName": "Two"
  }
}
```

### Validar que considera:
- ✅ Carga actual (Dev 2 tiene 0, Dev 1 tiene 2)
- ✅ Experiencia similar (tags compartidos)
- ✅ Experiencia total
- ✅ Calidad (sin reaperturas)

---

## 🔍 VERIFICACIÓN DE ENDPOINTS CRÍTICOS

### Test con cURL/Postman

**HU11 - Retrospective sin acciones:**
```bash
POST /api/sprints/{sprintId}/retrospective
{
  "whatWentWell": "Test",
  "whatToImprove": "Test",
  "whatToStopDoing": "Test",
  "improvementActions": []
}

Esperado: 400 Bad Request
Mensaje: "Es obligatorio registrar al menos una acción de mejora"
```

**HU12 - Actividad de GitHub:**
```bash
GET /api/stories/{storyId}/github-activity

Esperado: 200 OK
{
  "storyId": "...",
  "commits": [...],
  "pullRequests": [...]
}
```

**HU13 - Mis Métricas:**
```bash
GET /api/sprints/{sprintId}/psp-metrics/my-metrics

Esperado: 200 OK
{
  "tasksCompleted": 5,
  "tasksReopened": 1,
  "defectsFixed": 2,
  "avgTimePerTask": 3.5
}
```

**HU14 - Importar JSON:**
```bash
POST /api/repositories/{repositoryId}/refactoring/import
{
  "suggestions": [
    {
      "filePath": "test.ts",
      "description": "Test",
      "severity": "LOW"
    }
  ]
}

Esperado: 201 Created
{
  "imported": 1,
  "duplicates": 0
}
```

**HU14 - Resumen:**
```bash
GET /api/sprints/{sprintId}/refactoring/summary

Esperado: 200 OK
{
  "total": 10,
  "resolved": 6,
  "percentageResolved": 60.0
}
```

---

## 📊 CHECKLIST DE PRUEBAS

### HU11
- [ ] Rechaza retrospective sin acciones de mejora
- [ ] Acepta retrospective con al menos una acción
- [ ] Solo Scrum Master puede crear
- [ ] Developer no puede crear (403)

### HU12
- [ ] Vincula automáticamente commit con "US-010" en mensaje
- [ ] Vincula automáticamente PR con "T-023" en título
- [ ] Endpoint /stories/:id/github-activity funciona
- [ ] Endpoint /tasks/:id/github-activity funciona
- [ ] Muestra sha corto, mensaje, rama, enlace

### HU13
- [ ] Al mover tarea a DONE, PSP se actualiza automáticamente
- [ ] Al reabrir tarea, reopenCount incrementa
- [ ] Campo startedAt se guarda automáticamente
- [ ] Campo completedAt se guarda automáticamente
- [ ] Endpoint /my-metrics funciona
- [ ] Developer solo ve sus métricas

### HU14
- [ ] Botón "Importar JSON" existe
- [ ] Acepta archivo .json
- [ ] Importa múltiples sugerencias a la vez
- [ ] Previene duplicados
- [ ] Endpoint /summary funciona
- [ ] Muestra porcentaje de resueltas
- [ ] Solo Developer puede marcar como Resolved
- [ ] SM/PO reciben 403 al intentar actualizar

### HU15
- [ ] Algoritmo considera carga actual
- [ ] Algoritmo considera tareas similares (por tags)
- [ ] Algoritmo considera experiencia total
- [ ] Algoritmo considera calidad (reaperturas)
- [ ] Score de confianza entre 0-1
- [ ] Reason explica factores

---

## 🎓 CASOS DE USO REALES

### Ejemplo 1: Sprint Retrospective Completa
```
1. Sprint termina
2. Scrum Master crea Retrospective:
   - ¿Qué salió bien? "Buena comunicación"
   - ¿Qué mejorar? "Estimaciones"
   - ¿Qué dejar? "Reuniones largas"
   - Acciones: [
       "Usar Planning Poker - Responsable: PO - Fecha: próxima semana"
     ]
3. Sistema valida: ✅ Tiene acción
4. Guarda exitosamente
```

### Ejemplo 2: GitHub Sync con Vinculación
```
1. Developer hace commit: "git commit -m 'Fix authentication bug US-042 T-042-3'"
2. Scrum Master click "Sincronizar"
3. Sistema detecta:
   - US-042 → Busca historia
   - T-042-3 → Busca tarea
4. Vincula automáticamente ambos
5. En detalle de US-042 aparece el commit
6. En detalle de T-042-3 aparece el commit
```

### Ejemplo 3: PSP Auto-Actualizado
```
Lunes 9:00 AM:
- Developer ve PSP: 5 tareas completadas

Lunes 10:00 AM:
- Developer completa tarea en Kanban

Lunes 10:05 AM:
- Developer recarga PSP: 6 tareas completadas ← Automático
```

### Ejemplo 4: Importar SonarQube
```
1. Ejecutar: sonarqube-scanner
2. Exportar: sonar-results.json
3. Cargar en sistema
4. Sistema importa 25 sugerencias
5. Muestra resumen: 25 total, 0 resueltas (0%)
6. Developer va resolviendo
7. Resumen actualiza: 25 total, 15 resueltas (60%)
```

---

## ⚡ PRUEBAS RÁPIDAS (5 minutos)

### Test Rápido HU11:
```bash
curl -X POST http://localhost:8000/api/sprints/{sprintId}/retrospective \
  -H "Authorization: Bearer {token}" \
  -d '{"whatWentWell":"x","whatToImprove":"x","whatToStopDoing":"x","improvementActions":[]}'

Esperado: 400 "Es obligatorio registrar al menos una acción de mejora"
```

### Test Rápido HU12:
```bash
curl http://localhost:8000/api/stories/{storyId}/github-activity \
  -H "Authorization: Bearer {token}"

Esperado: 200 { "commits": [], "pullRequests": [] }
```

### Test Rápido HU13:
```bash
curl http://localhost:8000/api/sprints/{sprintId}/psp-metrics/my-metrics \
  -H "Authorization: Bearer {token}"

Esperado: 200 { "tasksCompleted": X, "tasksReopened": Y, ... }
```

### Test Rápido HU14:
```bash
curl -X POST http://localhost:8000/api/repositories/{repoId}/refactoring/import \
  -H "Authorization: Bearer {token}" \
  -d '{"suggestions":[{"filePath":"test.ts","description":"test","severity":"LOW"}]}'

Esperado: 201 { "imported": 1, "duplicates": 0 }
```

---

## 🎉 RESUMEN

Si todos los tests pasan:
- ✅ Las correcciones críticas funcionan
- ✅ El código cumple con los criterios
- ✅ El sistema está listo para producción

**Tiempo total de pruebas:** ~15 minutos  
**Nivel de confianza:** Alto  
**Estado:** Listo para usar

---

**Fecha:** 19 de Noviembre de 2025  
**Versión:** 2.1.0 (Post-Correcciones)

