---
id: admin-items-endpoints
title: Крайни точки на API за административни елементи
sidebar_label: Административни елементи
sidebar_position: 37
---

# Крайни точки на API за административни елементи

API за артикули предоставя крайни точки за управление на списъци с директории, включително създаване, актуализации, преглед на работни потоци (одобряване/отхвърляне), хронология на одита, групови операции и статистика. Елементите преминават през жизнен цикъл от състояния `draft`, `pending`, `approved` и `rejected`. Всички крайни точки изискват администраторско удостоверяване.

## Основен път

```
/api/admin/items
```

## Резюме на маршрута

|Метод|Пътека|авт|Описание|
| -------- | ------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/items`|Админ|Вземете списък с пагинирани елементи|
|`POST`|`/api/admin/items`|Админ|Създайте нов елемент|
|`GET`|`/api/admin/items/stats`|Админ|Вземете статистика за артикулите|
|`POST`|`/api/admin/items/bulk`|Админ|Групово одобрение, отхвърляне или изтриване|
|`GET`|`/api/admin/items/{id}`|Админ|Вземете артикул по ID|
|`PUT`|`/api/admin/items/{id}`|Админ|Актуализирайте елемента|
|`DELETE`|`/api/admin/items/{id}`|Админ|Изтрийте елемента за постоянно|
|`POST`|`/api/admin/items/{id}/review`|Админ|Одобряване или отхвърляне на елемент|
|`GET`|`/api/admin/items/{id}/history`|Админ|Вземете хронология на одита на артикул|

---

## List Items

```
GET /api/admin/items
```

Returns a paginated list of items with search, filtering by status/category/tags, and sorting.

**Query Parameters:**

| Parameter    | Type    | Default      | Description                                              |
| ------------ | ------- | ------------ | -------------------------------------------------------- |
| `page`       | integer | `1`          | Page number (minimum: 1)                                  |
| `limit`      | integer | `10`         | Results per page (1--100)                                 |
| `search`     | string  | --           | Search items by name or description                       |
| `status`     | string  | --           | Filter: `draft`, `pending`, `approved`, `rejected`        |
| `categories` | string  | --           | Comma-separated category slugs                            |
| `tags`       | string  | --           | Comma-separated tag slugs                                 |
| `sortBy`     | string  | `updated_at` | Sort field: `name`, `updated_at`, `status`, `submitted_at`|
| `sortOrder`  | string  | `desc`       | Sort direction: `asc` or `desc`                           |

**Response (200):**

```json
{
  "success": true,
  "items": [
    {
      "id": "item_123abc",
      "name": "Awesome Productivity Tool",
      "slug": "awesome-productivity-tool",
      "description": "A powerful tool to boost your productivity",
      "source_url": "https://example.com/tool",
      "category": ["productivity", "business"],
      "tags": ["saas", "productivity"],
      "featured": true,
      "icon_url": "https://example.com/icon.png",
      "status": "approved",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Създаване на елемент

```
POST /api/admin/items
```

Създава нов елемент с дублирани проверки както на ID, така и на slug. Задейства синхронизиране на CRM (ако е активирано) и индексиране на местоположение (ако е активирано).

**Тяло на заявката:**

|Поле|Тип|Задължително|Описание|
| ------------ | -------- | -------- | ---------------------------------------------- |
|`id`|низ|да|Уникален идентификатор на елемент|
|`name`|низ|да|Име на артикул|
|`slug`|низ|да|Удобен за URL охлюв (трябва да е уникален)|
|`description`|низ|да|Описание на артикула|
|`source_url`|низ|да|URL адрес на източника на елемента|
|`category`|низ []|не|Масив от категории плужеци|
|`tags`|низ []|не|Масив от тагове|
|`brand`|низ|не|Име на марката (използвано за синхронизиране на CRM компания)|
|`featured`|булево|не|Представен флаг (по подразбиране: `false`)|
|`icon_url`|низ|не|URL адрес на икона|
|`status`|низ|не|Първоначално състояние (по подразбиране: `draft`)|
|`location`|обект|не|Данни за местоположение за геоиндексиране|

**Отговор (201):**

```json
{
  "success": true,
  "item": {
    "id": "item_123abc",
    "name": "Awesome Productivity Tool",
    "slug": "awesome-productivity-tool",
    "status": "draft",
    "created_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Item created successfully"
}
```

---

## Get Item Statistics

```
GET /api/admin/items/stats
```

Returns counts by status. Supports optional filters to scope the statistics.

**Query Parameters:**

| Parameter    | Type   | Description                        |
| ------------ | ------ | ---------------------------------- |
| `search`     | string | Filter stats by search term        |
| `categories` | string | Comma-separated category slugs     |
| `tags`       | string | Comma-separated tag slugs          |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "total": 1247,
    "draft": 45,
    "pending": 23,
    "approved": 1156,
    "rejected": 23
  }
}
```

---

## Групови действия

```
POST /api/admin/items/bulk
```

Извършва групово одобрение, отхвърляне или изтриване на до 100 елемента. Всеки артикул се обработва индивидуално; частичните повреди не прекъсват цялата операция. Изпраща имейл известия до подателите при одобрение/отхвърляне.

**Тяло на заявката:**

|Поле|Тип|Задължително|Описание|
| -------- | -------- | ------------------ | ---------------------------------------------------- |
|`action`|низ|да|`approve`, `reject` или `delete`|
|`ids`|низ []|да|Идентификационни номера на елементи за обработка (1--100, без дубликати)|
|`reason`|низ|Да (за `reject`)|Причина за отхвърляне (минимум 10 знака)|

**Отговор (200):**

```json
{
  "success": true,
  "message": "Bulk approve completed: 3 approved, 0 failed",
  "results": [
    { "id": "item_1", "success": true },
    { "id": "item_2", "success": true },
    { "id": "item_3", "success": false, "error": "Item not found" }
  ],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Get / Update / Delete Item

### Get Item

```
GET /api/admin/items/{id}
```

Returns complete item details including metadata, categories, tags, review notes, and engagement metrics.

### Update Item

```
PUT /api/admin/items/{id}
```

Partial update -- only provided fields are modified. Triggers CRM sync when `brand` is provided and location re-indexing when location data changes.

**Request Body (all fields optional):**

```json
{
  "name": "Updated Tool Name",
  "slug": "updated-tool-name",
  "description": "Updated description",
  "source_url": "https://example.com/updated",
  "category": ["productivity", "automation"],
  "tags": ["saas", "ai"],
  "brand": "Acme Corp",
  "featured": true,
  "icon_url": "https://example.com/new-icon.png",
  "status": "approved"
}
```

### Delete Item

```
DELETE /api/admin/items/{id}
```

Permanently deletes an item and removes it from the location index (if enabled). This action cannot be undone.

**Response (200):**

```json
{ "success": true, "message": "Item deleted successfully" }
```

---

## Преглед на елемент

```
POST /api/admin/items/{id}/review
```

Одобрява или отхвърля елемент. Записва решението за преглед с незадължителни бележки. Изпраща имейл известие до първоначалния подател (ако подателят е регистриран потребител).

**Тяло на заявката:**

|Поле|Тип|Задължително|Описание|
| -------------- | ------ | -------- | ------------------------------------ |
|`status`|низ|да|`approved` или `rejected`|
|`review_notes`|низ|не|Обяснение на решението за преглед|

**Отговор (200):**

```json
{
  "success": true,
  "data": {
    "id": "item_123abc",
    "status": "approved",
    "review_notes": "Great tool, approved for listing.",
    "reviewed_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Item approved successfully"
}
```

---

## Get Item Audit History

```
GET /api/admin/items/{id}/history
```

Returns the complete audit trail for an item, including creation, updates, status changes, reviews, deletions, and restorations.

**Query Parameters:**

| Parameter | Type    | Default | Description                                                            |
| --------- | ------- | ------- | ---------------------------------------------------------------------- |
| `page`    | integer | `1`     | Page number                                                             |
| `limit`   | integer | `20`    | Results per page (max 100)                                              |
| `action`  | string  | --      | Comma-separated filter: `created`, `updated`, `status_changed`, `reviewed`, `deleted`, `restored` |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_abc123",
        "itemId": "awesome-tool",
        "action": "reviewed",
        "previousStatus": "pending",
        "newStatus": "approved",
        "performedByName": "Admin User",
        "notes": "Approved for listing",
        "createdAt": "2024-01-20T16:45:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## Правила за валидиране

|Поле|правило|
| ------------ | ---------------------------------------------------------- |
|`id`|Задължително; трябва да бъде уникален за всички елементи|
|`name`|Изисква се за създаване|
|`slug`|Задължително; трябва да бъде уникален за всички елементи|
|`description`|Изисква се за създаване|
|`source_url`|Изисква се за създаване; валиден URL формат|
|`status`|Трябва да е `draft`, `pending`, `approved` или `rejected`|
|`reason`|Изисква се за групово отхвърляне; минимум 10 знака|
|`ids`|Групово: 1--100 непразни уникални низа|
|`action`|Филтър за хронология: само валидни типове одитни действия|

## Кодове за грешки

|Статус|Значение|
| ------ | -------------------------------------------------------- |
| `400`  |Грешка при валидиране, невалидни параметри, липсващи полета|
| `401`  |Изисква се удостоверяване|
| `403`  |Необходими са администраторски права|
| `404`  |Артикулът не е намерен|
| `409`  |Дублиран идентификатор на елемент или охлюв|
| `500`  |Вътрешна грешка на сървъра|

## Свързана документация

- [API за администраторски роли](./admin-roles-endpoints.md) – управлявайте ролите, присвоени на потребителите
- [API за администраторски потребители](./admin-users-endpoints.md) -- управление на потребителски акаунти
- [Удостоверяване](../architecture/nextauth-configuration.md) -- управление на сесии и охрана
