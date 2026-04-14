---
id: admin-roles-endpoints
title: "Endpoints Admin Roles"
sidebar_label: "Admin Roles"
sidebar_position: 35
---

# Endpoints Admin Roles

La API de Roles proporciona puntos finales para gestionar roles de usuario y sus permisos asociados. Los roles controlan los niveles de acceso en toda la aplicación y se pueden asignar a usuarios a través de la [API Admin de Usuarios](./admin-users-endpoints.md).

## Ruta Base

```
/api/admin/roles
```

## Resumen de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `GET` | `/api/admin/roles` | Admin | Obtener lista paginada de roles |
| `POST` | `/api/admin/roles` | Admin | Crear un nuevo rol |
| `GET` | `/api/admin/roles/active` | Público | Obtener todos los roles activos |
| `GET` | `/api/admin/roles/stats` | Admin | Obtener estadísticas de roles |
| `GET` | `/api/admin/roles/{id}` | Admin | Obtener un rol por ID |
| `PUT` | `/api/admin/roles/{id}` | Admin | Actualizar un rol |
| `DELETE` | `/api/admin/roles/{id}` | Admin | Eliminar un rol (suave o permanente) |
| `GET` | `/api/admin/roles/{id}/permissions` | Admin | Obtener permisos de un rol |
| `PUT` | `/api/admin/roles/{id}/permissions` | Admin | Actualizar permisos de un rol |

---

## Listar Roles

```
GET /api/admin/roles
```

Devuelve una lista paginada de roles con filtrado y ordenamiento opcionales.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `page` | entero | `1` | Número de página (mínimo: 1) |
| `limit` | entero | `10` | Resultados por página (1--100) |
| `status` | string | -- | Filtrar por `active` o `inactive` |
| `sortBy` | string | `name` | Campo de ordenamiento: `name`, `id`, `created_at` |
| `sortOrder` | string | `asc` | Dirección: `asc` o `desc` |

**Respuesta (200):**

```json
{
  "success": true,
  "roles": [
    {
      "id": "admin",
      "name": "Administrator",
      "description": "Full system administrator with all permissions",
      "status": "active",
      "isAdmin": true,
      "permissions": ["users.read", "users.write", "roles.read", "roles.write"],
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

## Crear Rol

```
POST /api/admin/roles
```

Crea un nuevo rol. El ID del rol se genera automáticamente a partir del nombre normalizando, quitando diacríticos y convirtiendo a un slug seguro para URL (máx. 64 caracteres). Se rechazan nombres duplicados (incluidos registros con eliminación suave).

**Cuerpo de la Solicitud:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | Sí | Nombre del rol (3--100 caracteres) |
| `description` | string | Sí | Descripción del rol (máx. 500 caracteres) |
| `status` | string | No | `active` (predeterminado) o `inactive` |
| `isAdmin` | booleano | No | Indicador de privilegios de administrador (predeterminado: `false`) |

**Ejemplo:**

```json
{
  "name": "Content Moderator",
  "description": "Responsible for moderating user-generated content",
  "status": "active",
  "isAdmin": false
}
```

**Respuesta (201):**

```json
{
  "success": true,
  "data": {
    "id": "content-moderator",
    "name": "Content Moderator",
    "description": "Responsible for moderating user-generated content",
    "status": "active",
    "isAdmin": false,
    "permissions": [],
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Role created successfully"
}
```

---

## Obtener Roles Activos

```
GET /api/admin/roles/active
```

Devuelve todos los roles con estado `active`. Se usa habitualmente para poblar menús desplegables de roles en formularios de gestión de usuarios. No requiere autenticación.

**Respuesta (200):**

```json
{
  "roles": [
    { "id": "admin", "name": "Administrator", "status": "active", "isAdmin": true, "permissions": ["..."] },
    { "id": "moderator", "name": "Moderator", "status": "active", "isAdmin": false, "permissions": ["..."] }
  ]
}
```

---

## Obtener Estadísticas de Roles

```
GET /api/admin/roles/stats
```

Devuelve estadísticas agregadas sobre los roles. Requiere sesión de administrador.

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "total": 25,
    "active": 20,
    "inactive": 5,
    "averagePermissions": 4.2
  }
}
```

---

## Obtener / Actualizar / Eliminar Rol

### Obtener Rol

```
GET /api/admin/roles/{id}
```

Devuelve los detalles completos de un rol incluyendo permisos, estado y marcas de tiempo.

### Actualizar Rol

```
PUT /api/admin/roles/{id}
```

Actualización parcial — solo se cambian los campos proporcionados. Valida la longitud del nombre (3--100) y la longitud de la descripción (máx. 500).

**Cuerpo de la Solicitud (todos los campos son opcionales):**

```json
{
  "name": "Senior Moderator",
  "description": "Senior content moderator with enhanced permissions",
  "status": "active",
  "isAdmin": false
}
```

### Eliminar Rol

```
DELETE /api/admin/roles/{id}?hard=false
```

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `hard` | string | `false` | `true` para eliminación permanente, `false` para eliminación suave (marca como inactivo) |

---

## Permisos del Rol

### Obtener Permisos

```
GET /api/admin/roles/{id}/permissions
```

Devuelve el array de permisos y metadatos básicos del rol.

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "permissions": ["users.read", "users.write", "roles.read"],
    "role": { "id": "moderator", "name": "Moderator", "description": "..." }
  }
}
```

### Actualizar Permisos

```
PUT /api/admin/roles/{id}/permissions
```

Reemplaza el array de permisos completo. Cada string de permiso se valida contra las definiciones de permisos del sistema. Los permisos inválidos se devuelven en la respuesta de error.

**Cuerpo de la Solicitud:**

```json
{
  "permissions": ["users.read", "items.read", "items.moderate", "comments.moderate"]
}
```

---

## Reglas de Validación

| Campo | Regla |
|-------|-------|
| `name` | 3--100 caracteres; se usa para derivar un ID slug único |
| `description` | Máximo 500 caracteres |
| `status` | Debe ser `active` o `inactive` |
| `permissions` | Array de strings; cada uno debe ser un permiso válido del sistema |

## Códigos de Error

| Estado | Significado |
|--------|-------------|
| `400` | Error de validación (parámetros inválidos, campos faltantes) |
| `401` | Se requiere autenticación |
| `403` | Se requieren privilegios de administrador |
| `404` | Rol no encontrado |
| `409` | Nombre de rol duplicado / conflicto de ID |
| `500` | Error interno del servidor |

## Documentación Relacionada

- [API Admin Usuarios](./admin-users-endpoints.md) — asignar roles a usuarios
- [Autenticación](../architecture/nextauth-configuration.md) — detalles de sesión y guardia de administrador
- [Sistema de Permisos](../architecture/permissions-system.md) — definiciones y validación de permisos
