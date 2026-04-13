---
id: admin-users-endpoints
title: Конечные точки API пользователей-администраторов
sidebar_label: Администраторы пользователей
sidebar_position: 36
---

# Конечные точки API пользователей-администраторов

Users API предоставляет конечные точки для управления учетными записями пользователей, включая утилиты создания, обновления, изменения статуса, назначения ролей и проверки. Все конечные точки требуют аутентификации администратора, если не указано иное.

## Базовый путь

```
/api/admin/users
```

## Сводка маршрута

|Метод|Путь|Авторизация|Описание|
| -------- | ----------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/users`|Админ|Получить постраничный список пользователей|
|`POST`|`/api/admin/users`|Админ|Создать нового пользователя|
|`GET`|`/api/admin/users/stats`|Админ|Получить статистику пользователей|
|`POST`|`/api/admin/users/check-email`|Админ|Проверить доступность электронной почты|
|`POST`|`/api/admin/users/check-username`|Админ|Проверить доступность имени пользователя|
|`GET`|`/api/admin/users/{id}`|Админ|Получить пользователя по идентификатору|
|`PUT`|`/api/admin/users/{id}`|Админ|Обновить пользователя|
|`DELETE`|`/api/admin/users/{id}`|Админ|Удалить пользователя|

---

## List Users

```
GET /api/admin/users
```

Returns a paginated list of users with search, filtering, and sorting.

**Query Parameters:**

| Parameter         | Type    | Default  | Description                                              |
| ----------------- | ------- | -------- | -------------------------------------------------------- |
| `page`            | integer | `1`      | Page number (minimum: 1)                                  |
| `limit`           | integer | `10`     | Results per page (1--100)                                 |
| `search`          | string  | --       | Search by name, email, or username (max 100 chars)        |
| `role`            | string  | --       | Filter by role ID (max 50 chars)                          |
| `status`          | string  | --       | Filter: `active` or `inactive`                            |
| `sortBy`          | string  | `name`   | Sort field: `name`, `username`, `email`, `role`, `created_at` |
| `sortOrder`       | string  | `asc`    | Sort direction: `asc` or `desc`                           |
| `includeInactive` | boolean | `false`  | Include inactive users in results                         |

**Response (200):**

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

## Создать пользователя

```
POST /api/admin/users
```

Создает нового пользователя с комплексной проверкой. Роль должна существовать в системе (проверено по таблице ролей).

**Тело запроса:**

|Поле|Тип|Требуется|Описание|
| ---------- | ------ | -------- | ---------------------------------------------------------- |
|`username`|строка|Да|3–30 символов, буквенно-цифровые, плюс `-` и `_`|
|`email`|строка|Да|Действительный формат электронной почты|
|`name`|строка|Да|Полное имя (2--100 символов)|
|`password`|строка|Да|Минимум 8 символов (проверено Зодом `passwordSchema`)|
|`role`|строка|Да|Должен ссылаться на существующий идентификатор роли.|
|`title`|строка|Нет|Должность (максимум 100 символов)|
|`avatar`|строка|Нет|URL аватара (максимум 500 символов)|

**Пример:**

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

**Ответ (201):**

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

## Get User Statistics

```
GET /api/admin/users/stats
```

Returns comprehensive statistics for the admin dashboard.

**Response (200):**

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

## Проверить доступность электронной почты

```
POST /api/admin/users/check-email
```

Проверяет, используется ли уже адрес электронной почты. Поддерживает параметр `excludeId` для сценариев обновления, в которых адрес электронной почты текущего пользователя должен быть исключен из проверки дубликатов.

**Тело запроса:**

```json
{
  "email": "john.doe@example.com",
  "excludeId": "user_123abc"
}
```

**Ответ (200):**

```json
{ "available": true, "exists": false }
```

---

## Check Username Availability

```
POST /api/admin/users/check-username
```

Checks whether a username is already in use. Same `excludeId` pattern as email check.

**Request Body:**

```json
{
  "username": "johndoe",
  "excludeId": "user_123abc"
}
```

**Response (200):**

```json
{ "available": false, "exists": true }
```

---

## Получить/обновить/удалить пользователя

### Получить пользователя

```
GET /api/admin/users/{id}
```

Возвращает полную информацию профиля для одного пользователя.

### Обновить пользователя

```
PUT /api/admin/users/{id}
```

Частичное обновление – изменяются только предоставленные поля. Проверяет формат электронной почты, длину имени пользователя (3–50), длину имени (2–100) и наличие роли в системе.

**Тело запроса (все поля необязательны):**

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

### Удалить пользователя

```
DELETE /api/admin/users/{id}
```

Безвозвратно удаляет пользователя. Включает защиту от самоудаления: администратор не может удалить свою учетную запись.

**Ответ (200):**

```json
{ "success": true, "message": "User deleted successfully" }
```

---

## Validation Rules

| Field      | Rule                                                        |
| ---------- | ----------------------------------------------------------- |
| `username` | 3--30 chars; regex `^[a-zA-Z0-9_-]{3,30}$` (create), 3--50 chars (update) |
| `email`    | Valid email format via `isValidEmail` utility                |
| `name`     | 2--100 characters                                           |
| `password` | Minimum 8 characters; validated by Zod `passwordSchema`     |
| `role`     | Must reference an existing role in the database              |
| `status`   | Must be `active` or `inactive`                              |
| `title`    | Maximum 100 characters                                      |
| `avatar`   | Maximum 500 characters                                      |

## Error Codes

| Status | Meaning                                           |
| ------ | ------------------------------------------------- |
| `400`  | Validation error, self-deletion, duplicate email/username |
| `401`  | Authentication required                            |
| `403`  | Admin privileges required                          |
| `404`  | User not found                                     |
| `500`  | Internal server error                              |

## Related Documentation

- [Admin Roles API](./admin-roles-endpoints.md) -- manage roles assigned to users
- [Authentication](../architecture/nextauth-configuration.md) -- session management and guards
- [Admin Clients API](./admin-clients-endpoints.md) -- client profile management
