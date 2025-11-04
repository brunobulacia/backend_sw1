# 🌱 Seed de Base de Datos para Desarrollo

Este script pobla la base de datos con datos de prueba para facilitar el desarrollo.

## 🚀 Ejecución Rápida

```powershell
# Ejecutar el seed
npx ts-node prisma/seed.ts
```

## 📦 ¿Qué Crea el Seed?

### 👥 **6 Usuarios**

| Rol | Email | Password | Descripción |
|-----|-------|----------|-------------|
| **Admin** | `admin@proyecto.com` | `Admin123456` | Administrador del sistema |
| **Product Owner** | `po@proyecto.com` | `ProductOwner123` | Dueño de 2 proyectos |
| **Scrum Master** | `sm@proyecto.com` | `ScrumMaster123` | Scrum Master del Proyecto 1 |
| **Developer 1** | `dev1@proyecto.com` | `Developer123` | Developer en ambos proyectos |
| **Developer 2** | `dev2@proyecto.com` | `Developer123` | Developer en Proyecto 1 |
| **Usuario Regular** | `user@proyecto.com` | `User123456` | Sin proyectos asignados |

### 📦 **2 Proyectos**

#### **Proyecto 1: Sistema de Gestión Ágil (SGA-2025)**
- **Owner:** Product Owner (`po@proyecto.com`)
- **Estado:** ACTIVE
- **Equipo:** 4 miembros (PO + SM + 2 Devs)
- **Sprints:** 2 semanas
- **Historias:** 5 historias de usuario

#### **Proyecto 2: E-Commerce Platform (ECP-2025)**
- **Owner:** Product Owner (`po@proyecto.com`)
- **Estado:** PLANNING
- **Equipo:** 2 miembros (PO + Dev1)
- **Sprints:** 2 semanas
- **Historias:** 2 historias de usuario

### 📝 **7 Historias de Usuario**

**Proyecto 1 (Sistema de Gestión Ágil):**
1. ✅ **US-001**: Login de usuarios (DONE)
2. ✅ **US-002**: Crear nuevo proyecto (DONE)
3. 🔄 **US-003**: Gestionar historias de usuario (IN_PROGRESS)
4. 📋 **US-004**: Sesión de Planning Poker (BACKLOG)
5. 📋 **US-005**: Dashboard del proyecto (BACKLOG)

**Proyecto 2 (E-Commerce Platform):**
1. 📋 **US-001**: Catálogo de productos (BACKLOG)
2. 📋 **US-002**: Carrito de compras (BACKLOG)

Cada historia incluye:
- Formato completo: Como [rol], quiero [funcionalidad], para [beneficio]
- Criterios de aceptación detallados
- Prioridad y valor de negocio
- Estimación de horas
- Tags para categorización

## 🛠️ Cómo Usar

### **Opción 1: Primera vez (Base de datos limpia)**

```powershell
# 1. Resetear la base de datos (¡CUIDADO! Borra todos los datos)
npx prisma migrate reset --force

# 2. El seed se ejecuta automáticamente después del reset
# O puedes ejecutarlo manualmente:
npx ts-node prisma/seed.ts
```

### **Opción 2: Agregar datos sin borrar existentes**

```powershell
# Simplemente ejecuta el seed
# Usará "upsert" para no duplicar usuarios
npx ts-node prisma/seed.ts
```

### **Opción 3: Re-ejecutar completamente limpio**

```powershell
# Resetear todo y poblar desde cero
npx prisma migrate reset --force
```

## 📊 Verificar los Datos Creados

### **Con Prisma Studio (Recomendado)**

```powershell
npx prisma studio
```

Abre una interfaz web en `http://localhost:5555` donde puedes ver y editar todos los datos.

### **Con el Backend**

```powershell
# 1. Inicia el backend
npm run start:dev

# 2. Haz login desde el frontend o Postman
# POST http://localhost:3000/api/auth/login
# Body: { "email": "po@proyecto.com", "password": "ProductOwner123" }

# 3. Usa el token para acceder a los endpoints protegidos
```

## 🎯 Casos de Uso para Testing

### **Probar como Product Owner**

```json
{
  "email": "po@proyecto.com",
  "password": "ProductOwner123"
}
```

- ✅ Puede ver y editar SUS proyectos
- ✅ Puede crear/editar/eliminar historias en sus proyectos
- ✅ Puede invitar miembros a sus proyectos
- ❌ NO puede ver proyectos privados de otros
- ❌ NO tiene permisos de admin

### **Probar como Developer**

```json
{
  "email": "dev1@proyecto.com",
  "password": "Developer123"
}
```

- ✅ Puede ver proyectos donde es miembro
- ✅ Puede ver historias del proyecto
- ❌ NO puede editar el proyecto (solo el owner)
- ❌ NO puede crear/editar historias (solo el PO)
- ❌ NO puede invitar miembros

### **Probar como Admin**

```json
{
  "email": "admin@proyecto.com",
  "password": "Admin123456"
}
```

- ✅ Puede ver TODOS los proyectos
- ✅ Puede editar CUALQUIER proyecto
- ✅ Puede gestionar usuarios
- ✅ Puede crear usuarios administrativamente
- ✅ Acceso total al sistema

### **Probar como Usuario sin Proyectos**

```json
{
  "email": "user@proyecto.com",
  "password": "User123456"
}
```

- ✅ Puede crear su propio proyecto
- ✅ Puede ver proyectos públicos
- ❌ NO puede ver proyectos privados ajenos
- ❌ NO tiene proyectos asignados inicialmente

## 🔄 Re-ejecutar el Seed

El seed usa `upsert`, lo que significa:

- ✅ Si el usuario YA EXISTE (por email), NO lo duplica
- ✅ Si el proyecto YA EXISTE (por código), NO lo duplica
- ✅ Puedes ejecutarlo múltiples veces sin problemas

**PERO**, las historias de usuario SÍ se duplicarían. Para evitarlo:

```powershell
# Opción 1: Resetear completamente
npx prisma migrate reset --force

# Opción 2: Borrar manualmente las historias antes
# (Usando Prisma Studio o SQL)
```

## 🐛 Solución de Problemas

### Error: "Cannot find module 'ts-node'"

```powershell
# Instalar ts-node
npm install --save-dev ts-node
```

### Error: "Cannot connect to database"

```powershell
# Verifica que PostgreSQL esté corriendo
Get-Service -Name postgresql*

# Verifica tu DATABASE_URL en .env
cat .env
```

### Error: "Unique constraint failed"

Esto significa que los datos ya existen. Opciones:

```powershell
# Opción 1: Resetear todo
npx prisma migrate reset --force

# Opción 2: Borrar usuarios manualmente en Prisma Studio
npx prisma studio
```

## 📝 Personalizar el Seed

Puedes editar `prisma/seed.ts` para:

- Cambiar las contraseñas
- Agregar más usuarios
- Crear más proyectos
- Agregar más historias de usuario
- Modificar los roles o permisos

Después de editar, solo ejecuta:

```powershell
npx ts-node prisma/seed.ts
```

## ✨ Tips

1. **Usa Prisma Studio** para explorar visualmente los datos
2. **Ejecuta el seed cada vez** que resetees la base de datos
3. **Guarda las credenciales** en un archivo seguro durante desarrollo
4. **NO uses estos datos en producción** (son solo para desarrollo)
5. **Comenta las funciones** que no necesites en el seed

## 🎉 ¡Listo!

Ahora tienes una base de datos completamente poblada con:
- ✅ Usuarios de todos los roles
- ✅ Proyectos con equipos configurados
- ✅ Historias de usuario listas para trabajar
- ✅ Datos realistas para testing

**¡A desarrollar! 🚀**
