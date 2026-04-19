---
id: admin-roles-endpoints
title: Конечные точки API ролей администратора
sidebar_label: Роли администратора
sidebar_position: 35
---

# Конечные точки API ролей администратора

API ролей предоставляет конечные точки для управления ролями пользователей и связанными с ними разрешениями. Роли управляют уровнями доступа к приложению и могут назначаться пользователям через [API администраторов пользователей](./admin-users-endpoints.md).

## Базовый путь

```
/api/admin/roles
```

## Сводка маршрута

|Метод|Путь|Авторизация|Описание|
| -------- | --------------------------------- | -------- | ------------------------------------ |
|`GET`|`/api/admin/roles`|Админ|Получить постраничный список ролей|
|`POST`|`/api/admin/roles`|Админ|Создать новую роль|
|`GET`|`/api/admin/roles/active`|Общественный|Получить все активные роли|
|`GET`|`/api/admin/roles/stats`|Админ|Получить статистику ролей|
|`GET`|`/api/admin/roles/{id}`|Админ|Получить одну роль по идентификатору|
|`PUT`|`/api/admin/roles/{id}`|Админ|Обновить роль|
|`DELETE`|`/api/admin/roles/{id}`|Админ|Удаление роли (мягкой или жесткой)|
|`GET`|`/api/admin/roles/{id}/permissions`|Админ|Получение разрешений для роли|
|`PUT`|`/api/admin/roles/{id}/permissions`|Админ|Обновление разрешений для роли|

---

## List Roles

```
GET /api/admin/roles
```

Returns a paginated list of roles with optional filtering and sorting.

**Query Parameters:**

| Parameter   | Type    | Default  | Description                                   |
| ----------- | ------- | -------- | --------------------------------------------- |
| `page`      | integer | `1`      | Page number (minimum: 1)                       |
| `limit`     | integer | `10`     | Results per page (1--100)                      |
| `status`    | string  | --       | Filter by `active` or `inactive`               |
| `sortBy`    | string  | `name`   | Sort field: `name`, `id`, `created_at`         |
| `sortOrder` | string  | `asc`    | Sort direction: `asc` or `desc`                |

**Response (200):**

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

## Создать роль

```
POST /api/admin/roles
```

Создает новую роль. Идентификатор роли автоматически генерируется из имени путем нормализации, удаления диакритических знаков и преобразования в URL-безопасный фрагмент (максимум 64 символа). Повторяющиеся имена (включая обратимо удаленные записи) отклоняются.

**Тело запроса:**

|Поле|Тип|Требуется|Описание|
| ------------- | ------- | -------- | ---------------------------------- |
|`name`|строка|Да|Имя роли (3–100 символов)|
|`description`|строка|Да|Описание роли (максимум 500 символов)|
|`status`|строка|Нет|`active` (по умолчанию) или `inactive`|
|`isAdmin`|логическое значение|Нет|Флаг привилегий администратора (по умолчанию: `false`)|

**Пример:**

```json
{
  "name": "Content Moderator",
  "description": "Responsible for moderating user-generated content",
  "status": "active",
  "isAdmin": false
}
```

**Ответ (201):**

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

## Get Active Roles

```
GET /api/admin/roles/active
```

Returns all roles with `active` status. Commonly used to populate role dropdowns in user management forms. No authentication required.

**Response (200):**

```json
{
  "roles": [
    { "id": "admin", "name": "Administrator", "status": "active", "isAdmin": true, "permissions": [...] },
    { "id": "moderator", "name": "Moderator", "status": "active", "isAdmin": false, "permissions": [...] }
  ]
}
```

---

## Получить статистику ролей

```
GET /api/admin/roles/stats
```

Возвращает совокупную статистику о ролях. Требуется сеанс администратора.

**Ответ (200):**

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

## Get / Update / Delete Role

### Get Role

```
GET /api/admin/roles/{id}
```

Returns full details for a single role including permissions, status, and timestamps.

### Update Role

```
PUT /api/admin/roles/{id}
```

Partial update -- only provided fields are changed. Validates name length (3--100) and description length (max 500).

**Request Body (all fields optional):**

```json
{
  "name": "Senior Moderator",
  "description": "Senior content moderator with enhanced permissions",
  "status": "active",
  "isAdmin": false
}
```

### Delete Role

```
DELETE /api/admin/roles/{id}?hard=false
```

| Parameter | Type   | Default | Description                              |
| --------- | ------ | ------- | ---------------------------------------- |
| `hard`    | string | `false` | `true` for permanent removal, `false` for soft delete (marks inactive) |

---

## Ролевые разрешения

### Получить разрешения

```
GET /api/admin/roles/{id}/permissions
```

Возвращает массив разрешений и метаданные базовой роли.

**Ответ (200):**

```json
{
  "success": true,
  "data": {
    "permissions": ["users.read", "users.write", "roles.read"],
    "role": { "id": "moderator", "name": "Moderator", "description": "..." }
  }
}
```

### Обновить разрешения

```
PUT /api/admin/roles/{id}/permissions
```

Заменяет весь массив разрешений. Каждая строка разрешений проверяется на соответствие определениям системных разрешений. В ответе об ошибке возвращаются недопустимые разрешения.

**Тело запроса:**

```json
{
  "permissions": ["users.read", "items.read", "items.moderate", "comments.moderate"]
}
```

---

## Validation Rules

| Field         | Rule                                                    |
| ------------- | ------------------------------------------------------- |
| `name`        | 3--100 characters; used to derive a unique slug ID      |
| `description` | Maximum 500 characters                                  |
| `status`      | Must be `active` or `inactive`                          |
| `permissions` | Array of strings; each must be a valid system permission |

## Error Codes

| Status | Meaning                                          |
| ------ | ------------------------------------------------ |
| `400`  | Validation error (invalid params, missing fields) |
| `401`  | Authentication required                           |
| `403`  | Admin privileges required                         |
| `404`  | Role not found                                    |
| `409`  | Duplicate role name / ID conflict                 |
| `500`  | Internal server error                             |

## Related Documentation

- [Admin Users API](./admin-users-endpoints.md) -- assign roles to users
- [Authentication](../architecture/nextauth-configuration.md) -- session and admin guard details
- [Permissions System](../architecture/permissions-system.md) -- permission definitions and validation
