---
id: admin-clients-endpoints
title: Конечные точки API клиентов администратора
sidebar_label: Клиенты администратора
sidebar_position: 38
---

# Конечные точки API клиентов администратора

Clients API предоставляет конечные точки для управления профилями клиентов, включая создание, обновление, расширенный поиск, массовые операции, аналитику информационной панели и комплексную статистику. Клиенты представляют собой профили конечных пользователей, связанные с учетными записями аутентификации. Все конечные точки требуют аутентификации администратора.

## Базовый путь

```
/api/admin/clients
```

## Сводка маршрута

|Метод|Путь|Авторизация|Описание|
| -------- | --------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/clients`|Админ|Получить постраничный список клиентов|
|`POST`|`/api/admin/clients`|Админ|Создать новый профиль клиента|
|`GET`|`/api/admin/clients/stats`|Админ|Получите полную статистику по клиентам|
|`GET`|`/api/admin/clients/dashboard`|Админ|Получить объединенные данные информационной панели|
|`GET`|`/api/admin/clients/advanced-search`|Админ|Расширенный поиск с несколькими фильтрами|
|`PUT`|`/api/admin/clients/bulk`|Админ|Массовое обновление профилей клиентов|
|`DELETE`|`/api/admin/clients/bulk`|Админ|Массовое удаление профилей клиентов|
|`GET`|`/api/admin/clients/{clientId}`|Админ|Получить клиента по ID|
|`PUT`|`/api/admin/clients/{clientId}`|Админ|Обновить профиль клиента|
|`DELETE`|`/api/admin/clients/{clientId}`|Админ|Удалить профиль клиента|

---

## List Clients

```
GET /api/admin/clients
```

Returns a paginated list of client profiles with basic filtering.

**Query Parameters:**

| Parameter     | Type    | Default | Description                                            |
| ------------- | ------- | ------- | ------------------------------------------------------ |
| `page`        | integer | `1`     | Page number (minimum: 1)                                |
| `limit`       | integer | `10`    | Results per page (1--100)                               |
| `search`      | string  | --      | Search by name or email                                 |
| `status`      | string  | --      | Filter: `active`, `inactive`, `suspended`, `trial`      |
| `plan`        | string  | --      | Filter: `free`, `standard`, `premium`                   |
| `accountType` | string  | --      | Filter: `individual`, `business`, `enterprise`          |
| `provider`    | string  | --      | Filter by authentication provider                       |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client_123abc",
        "displayName": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "company": "Tech Corp Inc",
        "status": "active",
        "plan": "premium",
        "accountType": "business",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "lastActiveAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10
  }
}
```

---

## Создать клиента

```
POST /api/admin/clients
```

Создает новый профиль клиента. Если для указанного адреса электронной почты не существует учетной записи пользователя, автоматически создается новый пользователь с временным паролем. Запускает синхронизацию CRM при включении.

**Тело запроса:**

|Поле|Тип|Требуется|Описание|
| ---------------- | ------- | -------- | -------------------------------------------- |
|`email`|строка|Да|Адрес электронной почты клиента|
|`displayName`|строка|Нет|Отображаемое имя (по умолчанию префикс электронной почты)|
|`username`|строка|Нет|Уникальное имя пользователя|
|`bio`|строка|Нет|Биография клиента|
|`jobTitle`|строка|Нет|Должность|
|`company`|строка|Нет|Название компании|
|`industry`|строка|Нет|Промышленный сектор|
|`phone`|строка|Нет|Номер телефона|
|`website`|строка|Нет|URL-адрес веб-сайта|
|`location`|строка|Нет|Расположение|
|`accountType`|строка|Нет|`individual` (по умолчанию), `business`, `enterprise`|
|`status`|строка|Нет|`active` (по умолчанию), `inactive`, `suspended`, `trial`|
|`plan`|строка|Нет|`free` (по умолчанию), `standard`, `premium`|

**Ответ (200):**

```json
{
  "success": true,
  "data": {
    "id": "client_789ghi",
    "displayName": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "plan": "premium",
    "accountType": "business",
    "createdAt": "2024-01-20T16:45:00.000Z"
  },
  "message": "Client created successfully"
}
```

---

## Get Client Statistics

```
GET /api/admin/clients/stats
```

Returns comprehensive analytics across all clients, grouped by overview, growth, plans, account types, engagement, demographics, and authentication providers.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClients": 1247,
      "activeClients": 1156,
      "inactiveClients": 67,
      "suspendedClients": 24,
      "trialClients": 89
    },
    "growth": {
      "newClientsToday": 3,
      "newClientsThisWeek": 18,
      "newClientsThisMonth": 45,
      "growthRate": 3.8
    },
    "plans": {
      "free": 856,
      "standard": 267,
      "premium": 124,
      "conversionRate": 31.4
    },
    "accountTypes": {
      "individual": 789,
      "business": 356,
      "enterprise": 102
    },
    "engagement": {
      "averageSubmissions": 12.5,
      "totalSubmissions": 15587,
      "activeThisWeek": 892,
      "activeThisMonth": 1034
    },
    "demographics": {
      "topCountries": [{ "country": "United States", "count": 456 }],
      "topCompanies": [{ "company": "Tech Corp Inc", "count": 25 }],
      "topIndustries": [{ "industry": "Technology", "count": 234 }]
    },
    "providers": { "google": 567, "github": 234, "email": 446 }
  }
}
```

---

## Панель управления

```
GET /api/admin/clients/dashboard
```

Возвращает комбинированный ответ со списком клиентов с разбивкой на страницы, совокупной статистикой и метаданными разбивки на страницы. Поддерживает все основные фильтры, а также параметры диапазона дат.

**Параметры запроса (помимо параметров списка):**

|Параметр|Тип|Описание|
| --------------- | ------ | ------------------------------------------ |
|`createdAfter`|строка|Дата ISO или `YYYY-MM-DD` -- создано после|
|`createdBefore`|строка|Дата ISO или `YYYY-MM-DD` — создано ранее|

---

## Advanced Search

```
GET /api/admin/clients/advanced-search
```

Performs a multi-dimensional search across client profiles. In addition to the basic list filters, supports field-specific searches, numeric ranges, boolean flags, and date ranges. Returns search metadata including applied filters and execution time.

**Additional Query Parameters:**

| Parameter          | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `sortBy`           | string  | `createdAt`, `updatedAt`, `name`, `email`, `company`, `totalSubmissions` |
| `sortOrder`        | string  | `asc` or `desc`                                |
| `createdAfter`     | string  | ISO date-time filter                           |
| `createdBefore`    | string  | ISO date-time filter                           |
| `emailDomain`      | string  | Filter by email domain (e.g., `example.com`)   |
| `companySearch`    | string  | Search within company names                    |
| `locationSearch`   | string  | Search within locations                        |
| `industrySearch`   | string  | Search within industries                       |
| `minSubmissions`   | integer | Minimum submission count                       |
| `maxSubmissions`   | integer | Maximum submission count                       |
| `emailVerified`    | boolean | Filter by email verification status            |
| `twoFactorEnabled` | boolean | Filter by 2FA status                          |
| `hasAvatar`        | boolean | Filter clients with/without avatar             |
| `hasWebsite`       | boolean | Filter clients with/without website            |
| `hasPhone`         | boolean | Filter clients with/without phone              |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "clients": [{ "id": "client_123abc", "..." : "..." }],
    "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 },
    "searchMetadata": {
      "appliedFilters": { "status": "active", "plan": "premium" },
      "searchTime": 45.2
    }
  }
}
```

---

## Массовые операции

### Массовое обновление

```
PUT /api/admin/clients/bulk
```

Обновляет несколько профилей клиентов в одном запросе. Каждый клиентский объект должен включать поле `id`, а также поля для обновления. Отдельные сбои не приводят к отмене всего пакета.

**Тело запроса:**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### Массовое удаление

```
DELETE /api/admin/clients/bulk
```

Безвозвратно удаляет несколько профилей клиентов. Каждый объект в массиве должен включать поле `id`.

**Тело запроса:**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**Ответ (200) – обе массовые конечные точки:**

```json
{
  "success": true,
  "message": "Bulk update completed: 2 successful, 1 failed",
  "results": [{ "index": 0, "success": true }],
  "errors": [{ "index": 2, "error": "Client not found" }],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Get / Update / Delete Client

### Get Client

```
GET /api/admin/clients/{clientId}
```

Returns the complete client profile including display name, company, plan, account type, and activity timestamps.

### Update Client

```
PUT /api/admin/clients/{clientId}
```

Partial update -- only provided fields are modified. Triggers CRM sync when company or profile data changes.

**Request Body (all fields optional):**

```json
{
  "displayName": "John Doe Updated",
  "username": "johndoe_updated",
  "bio": "Senior Developer",
  "jobTitle": "Lead Developer",
  "company": "Tech Corp Inc",
  "status": "active",
  "plan": "premium",
  "accountType": "business"
}
```

### Delete Client

```
DELETE /api/admin/clients/{clientId}
```

Permanently deletes a client profile. This action cannot be undone.

**Response (200):**

```json
{ "success": true, "message": "Client deleted successfully" }
```

---

## Правила валидации

|Поле|Правило|
| ------------- | ---------------------------------------------------------- |
|`email`|Требуется для создания; действительный формат электронной почты|
|`status`|Должно быть `active`, `inactive`, `suspended` или `trial`|
|`plan`|Должно быть `free`, `standard` или `premium`.|
|`accountType`|Должно быть `individual`, `business` или `enterprise`.|
|`clients`|Массовый: непустой массив с `id`, необходимым для каждого объекта.|

## Коды ошибок

|Статус|Значение|
| ------ | ------------------------------------------------------ |
| `400`  |Ошибка проверки, отсутствует адрес электронной почты, не удалось создать пользователя.|
| `401`  |Требуется аутентификация|
| `403`  |Требуются права администратора|
| `404`  |Клиент не найден|
| `500`  |Внутренняя ошибка сервера|

## Сопутствующая документация

- [API администраторов](./admin-users-endpoints.md) – управление учетными записями пользователей.
- [API ролей администратора](./admin-roles-endpoints.md) – управление ролями и разрешениями.
- [Аутентификация](../architecture/nextauth-configuration.md) — управление сеансом и защита
