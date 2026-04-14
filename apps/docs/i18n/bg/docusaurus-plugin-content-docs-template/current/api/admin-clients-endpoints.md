---
id: admin-clients-endpoints
title: Крайни точки на API за администраторски клиенти
sidebar_label: Административни клиенти
sidebar_position: 38
---

# Крайни точки на API за администраторски клиенти

Клиентският API предоставя крайни точки за управление на клиентски профили, включително създаване, актуализации, разширено търсене, групови операции, анализ на таблото за управление и изчерпателна статистика. Клиентите представляват профили на крайни потребители, свързани с акаунти за удостоверяване. Всички крайни точки изискват администраторско удостоверяване.

## Основен път

```
/api/admin/clients
```

## Резюме на маршрута

|Метод|Пътека|авт|Описание|
| -------- | --------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/clients`|Админ|Вземете пагиниран списък с клиенти|
|`POST`|`/api/admin/clients`|Админ|Създайте нов клиентски профил|
|`GET`|`/api/admin/clients/stats`|Админ|Получете изчерпателна клиентска статистика|
|`GET`|`/api/admin/clients/dashboard`|Админ|Вземете комбинирани данни от таблото|
|`GET`|`/api/admin/clients/advanced-search`|Админ|Разширено търсене с множество филтри|
|`PUT`|`/api/admin/clients/bulk`|Админ|Групово актуализиране на клиентски профили|
|`DELETE`|`/api/admin/clients/bulk`|Админ|Групово изтриване на клиентски профили|
|`GET`|`/api/admin/clients/{clientId}`|Админ|Вземете клиент по ID|
|`PUT`|`/api/admin/clients/{clientId}`|Админ|Актуализирайте клиентския профил|
|`DELETE`|`/api/admin/clients/{clientId}`|Админ|Изтриване на клиентски профил|

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

## Създаване на клиент

```
POST /api/admin/clients
```

Създава нов клиентски профил. Ако не съществува потребителски акаунт за предоставения имейл, автоматично се създава нов потребител с временна парола. Задейства CRM синхронизиране, когато е активирано.

**Тяло на заявката:**

|Поле|Тип|Задължително|Описание|
| ---------------- | ------- | -------- | -------------------------------------------- |
|`email`|низ|да|Имейл адрес на клиента|
|`displayName`|низ|не|Екранно име (по подразбиране е имейл префикс)|
|`username`|низ|не|Уникално потребителско име|
|`bio`|низ|не|Биография на клиента|
|`jobTitle`|низ|не|Длъжност|
|`company`|низ|не|Име на фирмата|
|`industry`|низ|не|Индустриален сектор|
|`phone`|низ|не|телефонен номер|
|`website`|низ|не|URL адрес на уебсайт|
|`location`|низ|не|Местоположение|
|`accountType`|низ|не|`individual` (по подразбиране), `business`, `enterprise`|
|`status`|низ|не|`active` (по подразбиране), `inactive`, `suspended`, `trial`|
|`plan`|низ|не|`free` (по подразбиране), `standard`, `premium`|

**Отговор (200):**

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

## Табло за управление

```
GET /api/admin/clients/dashboard
```

Връща комбиниран отговор с пагиниран списък с клиенти, обобщени статистики и метаданни за пагиниране. Поддържа всички основни филтри плюс параметри за диапазон от дати.

**Параметри на заявката (в допълнение към параметрите на списъка):**

|Параметър|Тип|Описание|
| --------------- | ------ | ------------------------------------------ |
|`createdAfter`|низ|ISO дата или `YYYY-MM-DD` -- създадена след|
|`createdBefore`|низ|ISO дата или `YYYY-MM-DD` -- създаден преди|

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

## Масови операции

### Групово актуализиране

```
PUT /api/admin/clients/bulk
```

Актуализира множество клиентски профили в една заявка. Всеки клиентски обект трябва да включва поле `id` плюс полетата за актуализиране. Индивидуалните повреди не прекъсват цялата партида.

**Тяло на заявката:**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### Групово изтриване

```
DELETE /api/admin/clients/bulk
```

Изтрива за постоянно множество клиентски профили. Всеки обект в масива трябва да включва поле `id`.

**Тяло на заявката:**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**Отговор (200) -- и двете групови крайни точки:**

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

## Правила за валидиране

|Поле|правило|
| ------------- | ---------------------------------------------------------- |
|`email`|Изисква се за създаване; валиден имейл формат|
|`status`|Трябва да е `active`, `inactive`, `suspended` или `trial`|
|`plan`|Трябва да е `free`, `standard` или `premium`|
|`accountType`|Трябва да е `individual`, `business` или `enterprise`|
|`clients`|Групово: непразен масив с `id`, изискван за всеки обект|

## Кодове за грешки

|Статус|Значение|
| ------ | ------------------------------------------------------ |
| `400`  |Грешка при валидиране, липсващ имейл, неуспешно създаване на потребител|
| `401`  |Изисква се удостоверяване|
| `403`  |Необходими са администраторски права|
| `404`  |Клиентът не е намерен|
| `500`  |Вътрешна грешка на сървъра|

## Свързана документация

- [API за администраторски потребители](./admin-users-endpoints.md) -- управление на потребителски акаунти
- [API на администраторски роли](./admin-roles-endpoints.md) – управление на роли и разрешения
- [Удостоверяване](../architecture/nextauth-configuration.md) -- управление на сесии и охрана
