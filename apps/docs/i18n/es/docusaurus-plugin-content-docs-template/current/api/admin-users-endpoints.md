---
id: admin-users-endpoints
title: "Endpoints Admin Usuarios"
sidebar_label: "Admin Usuarios"
sidebar_position: 36
---

# Endpoints Admin Usuarios

La API de Usuarios proporciona puntos finales para gestionar cuentas de usuario, incluyendo creación, actualizaciones, cambios de estado, asignación de roles y utilidades de validación. Todos los puntos finales requieren autenticación de administrador salvo que se indique lo contrario.

## Ruta Base

```
/api/admin/users
```

## Resumen de Rutas

| Método   | Ruta                                | Autenticación | Descripción                          |
| -------- | ----------------------------------- | ------------- | ------------------------------------ |
| `GET`    | `/api/admin/users`                  | Admin | Obtener lista paginada de usuarios             |
| `POST`   | `/api/admin/users`                  | Admin | Crear un nuevo usuario                    |
| `GET`    | `/api/admin/users/stats`            | Admin | Obtener estadísticas de usuarios                  |
| `POST`   | `/api/admin/users/check-email`      | Admin | Verificar disponibilidad de correo             |
| `POST`   | `/api/admin/users/check-username`   | Admin | Verificar disponibilidad de nombre de usuario          |
| `GET`    | `/api/admin/users/{id}`             | Admin | Obtener usuario por ID                       |
| `PUT`    | `/api/admin/users/{id}`             | Admin | Actualizar usuario                          |
| `DELETE` | `/api/admin/users/{id}`             | Admin | Eliminar usuario                          |

---

## Listar Usuarios

```
GET /api/admin/users
```

Devuelve una lista paginada de usuarios con búsqueda, filtrado y ordenamiento.

**Parámetros de Consulta:**

| Parámetro         | Tipo    | Predeterminado  | Descripción                                              |
| ----------------- | ------- | -------- | -------------------------------------------------------- |
| `page`            | entero | `1`      | Número de página (mínimo: 1)                                  |
| `limit`           | entero | `10`     | Resultados por página (1--100)                                 |
| `search`          | string  | --       | Buscar por nombre, correo o nombre de usuario (máx. 100 chars)        |
| `role`            | string  | --       | Filtrar por ID de rol (máx. 50 chars)                          |
| `status`          | string  | --       | Filtrar: `active` o `inactive`                            |
| `sortBy`          | string  | `name`   | Campo de ordenamiento: `name`, `username`, `email`, `role`, `created_at` |
| `sortOrder`       | string  | `asc`    | Dirección de ordenamiento: `asc` o `desc`                           |
| `includeInactive` | boolean | `false`  | Incluir usuarios inactivos en resultados                         |

**Respuesta (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "user_123abc",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "title": "Senior Developer",
      "avatar": "https://example.com/avatars/john.jpg",
      "role": "admin",
      "status": "active",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z",
      "last_login": "2024-01-20T16:20:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Crear Usuario

```
POST /api/admin/users
```

Crea un nuevo usuario con validación completa. El rol debe existir en el sistema (validado contra la tabla de roles).

**Cuerpo de la Solicitud:**

| Campo      | Tipo   | Requerido | Descripción                                                |
| ---------- | ------ | --------- | ---------------------------------------------------------- |
| `username` | string | Sí      | 3--30 caracteres, alfanumérico más `-` y `_`            |
| `email`    | string | Sí      | Formato de correo electrónico válido                                         |
| `name`     | string | Sí      | Nombre completo (2--100 caracteres)                              |
| `password` | string | Sí      | Mínimo 8 caracteres (validado por Zod `passwordSchema`)   |
| `role`     | string | Sí      | Debe referenciar un ID de rol existente                         |
| `title`    | string | No       | Título del puesto (máx. 100 caracteres)                             |
| `avatar`   | string | No       | URL de avatar (máx. 500 caracteres)                            |

**Ejemplo:**

```json
{
  "username": "johndoe",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "password": "SecurePass123!",
  "role": "admin",
  "title": "Senior Developer",
  "avatar": "https://example.com/avatars/john.jpg"
}
```

**Respuesta (201):**

```json
{
  "success": true,
  "data": {
    "id": "user_123abc",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "admin",
    "status": "active",
    "created_at": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Obtener Estadísticas de Usuarios

```
GET /api/admin/users/stats
```

Devuelve estadísticas completas para el panel de administración.

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "totalUsers": 1247,
    "activeUsers": 1156,
    "inactiveUsers": 91,
    "recentRegistrations": 67,
    "roleDistribution": {
      "admin": 5,
      "moderator": 23,
      "user": 1219
    },
    "averageLoginFrequency": 12.5,
    "topActiveUsers": [
      {
        "id": "user_123abc",
        "username": "johndoe",
        "name": "John Doe",
        "loginCount": 45,
        "lastLogin": "2024-01-20T16:20:00.000Z"
      }
    ]
  }
}
```

---

## Verificar Disponibilidad de Correo

```
POST /api/admin/users/check-email
```

Verifica si ya se está usando una dirección de correo electrónico. Admite un parámetro `excludeId` para escenarios de actualización donde el correo del usuario actual debe excluirse de la verificación de duplicados.

**Cuerpo de la Solicitud:**

```json
{
  "email": "john.doe@example.com",
  "excludeId": "user_123abc"
}
```

**Respuesta (200):**

```json
{ "available": true, "exists": false }
```

---

## Verificar Disponibilidad de Nombre de Usuario

```
POST /api/admin/users/check-username
```

Verifica si ya se está usando un nombre de usuario. Mismo patrón `excludeId` que la verificación de correo.

**Cuerpo de la Solicitud:**

```json
{
  "username": "johndoe",
  "excludeId": "user_123abc"
}
```

**Respuesta (200):**

```json
{ "available": false, "exists": true }
```

---

## Obtener / Actualizar / Eliminar Usuario

### Obtener Usuario

```
GET /api/admin/users/{id}
```

Devuelve información completa del perfil de un solo usuario.

### Actualizar Usuario

```
PUT /api/admin/users/{id}
```

Actualización parcial: solo se modifican los campos proporcionados. Valida formato de correo, longitud de nombre de usuario (3--50), longitud de nombre (2--100) y que el rol exista en el sistema.

**Cuerpo de la Solicitud (todos los campos opcionales):**

```json
{
  "username": "johndoe_updated",
  "email": "john.updated@example.com",
  "name": "John Updated Doe",
  "title": "Lead Developer",
  "avatar": "https://example.com/avatars/john_new.jpg",
  "role": "moderator",
  "status": "active"
}
```

### Eliminar Usuario

```
DELETE /api/admin/users/{id}
```

Elimina permanentemente un usuario. Incluye una protección contra auto-eliminación: un administrador no puede eliminar su propia cuenta.

**Respuesta (200):**

```json
{ "success": true, "message": "User deleted successfully" }
```

---

## Reglas de Validación

| Campo      | Regla                                                        |
| ---------- | ----------------------------------------------------------- |
| `username` | 3--30 chars; regex `^[a-zA-Z0-9_-]{3,30}$` (crear), 3--50 chars (actualizar) |
| `email`    | Formato de correo válido mediante la utilidad `isValidEmail`                |
| `name`     | 2--100 caracteres                                           |
| `password` | Mínimo 8 caracteres; validado por Zod `passwordSchema`     |
| `role`     | Debe referenciar un rol existente en la base de datos              |
| `status`   | Debe ser `active` o `inactive`                              |
| `title`    | Máximo 100 caracteres                                      |
| `avatar`   | Máximo 500 caracteres                                      |

## Códigos de Error

| Estado | Significado                                           |
| ------ | ------------------------------------------------- |
| `400`  | Error de validación, auto-eliminación, correo/nombre de usuario duplicado |
| `401`  | Autenticación requerida                            |
| `403`  | Privilegios de administrador requeridos                          |
| `404`  | Usuario no encontrado                                     |
| `500`  | Error interno del servidor                              |

## Documentación Relacionada

- [API Admin Roles](./admin-roles-endpoints.md) -- gestionar roles asignados a usuarios
- [Autenticación](../architecture/nextauth-configuration.md) -- gestión de sesiones y protecciones
- [API Admin Clientes](./admin-clients-endpoints.md) -- gestión de perfiles de cliente
