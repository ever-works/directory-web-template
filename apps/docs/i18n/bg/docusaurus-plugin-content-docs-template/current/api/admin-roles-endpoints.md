---
id: admin-roles-endpoints
title: Крайни точки на API за администраторски роли
sidebar_label: Административни роли
sidebar_position: 35
---

# Крайни точки на API за администраторски роли

API за роли предоставя крайни точки за управление на потребителски роли и свързаните с тях разрешения. Ролите контролират нивата на достъп в приложението и могат да бъдат присвоени на потребители чрез [API на администраторските потребители](./admin-users-endpoints.md).

## Основен път

```
/api/admin/roles
```

## Резюме на маршрута

|Метод|Пътека|авт|Описание|
| -------- | --------------------------------- | -------- | ------------------------------------ |
|`GET`|`/api/admin/roles`|Админ|Вземете списък с пагинирани роли|
|`POST`|`/api/admin/roles`|Админ|Създайте нова роля|
|`GET`|`/api/admin/roles/active`|Обществен|Вземете всички активни роли|
|`GET`|`/api/admin/roles/stats`|Админ|Вземете статистика за ролите|
|`GET`|`/api/admin/roles/{id}`|Админ|Вземете една роля по ID|
|`PUT`|`/api/admin/roles/{id}`|Админ|Актуализирайте роля|
|`DELETE`|`/api/admin/roles/{id}`|Админ|Изтриване на роля (мека или твърда)|
|`GET`|`/api/admin/roles/{id}/permissions`|Админ|Получете разрешения за роля|
|`PUT`|`/api/admin/roles/{id}/permissions`|Админ|Актуализирайте разрешенията за роля|

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

## Създаване на роля

```
POST /api/admin/roles
```

Създава нова роля. Идентификаторът на ролята се генерира автоматично от името чрез нормализиране, премахване на диакритичните знаци и преобразуване в безопасен за URL охлюв (максимум 64 знака). Дублиращи се имена (включително меко изтрити записи) се отхвърлят.

**Тяло на заявката:**

|Поле|Тип|Задължително|Описание|
| ------------- | ------- | -------- | ---------------------------------- |
|`name`|низ|да|Име на ролята (3--100 знака)|
|`description`|низ|да|Описание на ролята (макс. 500 знака)|
|`status`|низ|не|`active` (по подразбиране) или `inactive`|
|`isAdmin`|булево|не|Флаг за права на администратор (по подразбиране: `false`)|

**Пример:**

```json
{
  "name": "Content Moderator",
  "description": "Responsible for moderating user-generated content",
  "status": "active",
  "isAdmin": false
}
```

**Отговор (201):**

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

## Вземете статистика за ролята

```
GET /api/admin/roles/stats
```

Връща обобщена статистика за ролите. Изисква администраторска сесия.

**Отговор (200):**

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

## Разрешения за роли

### Вземете разрешения

```
GET /api/admin/roles/{id}/permissions
```

Връща масива с разрешения и основните метаданни за ролята.

**Отговор (200):**

```json
{
  "success": true,
  "data": {
    "permissions": ["users.read", "users.write", "roles.read"],
    "role": { "id": "moderator", "name": "Moderator", "description": "..." }
  }
}
```

### Актуализиране на разрешения

```
PUT /api/admin/roles/{id}/permissions
```

Заменя целия масив с разрешения. Всеки низ за разрешение се валидира спрямо дефинициите на системните разрешения. В отговора за грешка се връщат невалидни разрешения.

**Тяло на заявката:**

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
