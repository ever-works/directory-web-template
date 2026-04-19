---
id: admin-users-endpoints
title: Крайни точки на API за администраторски потребители
sidebar_label: Административни потребители
sidebar_position: 36
---

# Крайни точки на API за администраторски потребители

Потребителският API предоставя крайни точки за управление на потребителски акаунти, включително създаване, актуализации, промени в състоянието, присвояване на роли и помощни програми за валидиране. Всички крайни точки изискват администраторско удостоверяване, освен ако не е отбелязано друго.

## Основен път

```
/api/admin/users
```

## Резюме на маршрута

|Метод|Пътека|авт|Описание|
| -------- | ----------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/users`|Админ|Вземете списък с потребители с страници|
|`POST`|`/api/admin/users`|Админ|Създайте нов потребител|
|`GET`|`/api/admin/users/stats`|Админ|Вземете потребителска статистика|
|`POST`|`/api/admin/users/check-email`|Админ|Проверете наличността на имейл|
|`POST`|`/api/admin/users/check-username`|Админ|Проверете наличността на потребителското име|
|`GET`|`/api/admin/users/{id}`|Админ|Вземете потребител по ID|
|`PUT`|`/api/admin/users/{id}`|Админ|Актуализирайте потребителя|
|`DELETE`|`/api/admin/users/{id}`|Админ|Изтриване на потребител|

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

## Създаване на потребител

```
POST /api/admin/users
```

Създава нов потребител с цялостно валидиране. Ролята трябва да съществува в системата (проверена спрямо таблицата с ролите).

**Тяло на заявката:**

|Поле|Тип|Задължително|Описание|
| ---------- | ------ | -------- | ---------------------------------------------------------- |
|`username`|низ|да|3--30 знака, буквено-цифрови плюс `-` и `_`|
|`email`|низ|да|Валиден имейл формат|
|`name`|низ|да|Пълно име (2--100 знака)|
|`password`|низ|да|Минимум 8 знака (проверени от Zod `passwordSchema`)|
|`role`|низ|да|Трябва да препраща към съществуващ идентификатор на роля|
|`title`|низ|не|Длъжност (максимум 100 знака)|
|`avatar`|низ|не|URL адрес на аватар (максимум 500 знака)|

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

**Отговор (201):**

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

## Проверете наличността на имейл

```
POST /api/admin/users/check-email
```

Проверява дали даден имейл адрес вече се използва. Поддържа параметър `excludeId` за сценарии за актуализиране, при които имейлът на текущия потребител трябва да бъде изключен от проверката за дублиране.

**Тяло на заявката:**

```json
{
  "email": "john.doe@example.com",
  "excludeId": "user_123abc"
}
```

**Отговор (200):**

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

## Вземете / актуализирайте / изтрийте потребител

### Вземи потребител

```
GET /api/admin/users/{id}
```

Връща пълна информация за профила за един потребител.

### Актуализиране на потребителя

```
PUT /api/admin/users/{id}
```

Частична актуализация -- променят се само предоставените полета. Потвърждава имейл формата, дължината на потребителското име (3--50), дължината на името (2--100) и дали ролята съществува в системата.

**Тяло на заявката (всички полета са незадължителни):**

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

### Изтриване на потребител

```
DELETE /api/admin/users/{id}
```

Изтрива завинаги потребител. Включва защита за самоизтриване: администраторът не може да изтрие собствения си акаунт.

**Отговор (200):**

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
