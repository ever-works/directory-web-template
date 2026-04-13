---
id: admin-items-endpoints
title: Конечные точки API элементов администрирования
sidebar_label: Административные элементы
sidebar_position: 37
---

# Конечные точки API элементов администрирования

API Items предоставляет конечные точки для управления списками каталогов, включая создание, обновление, рабочие процессы проверки (утверждение/отклонение), историю аудита, массовые операции и статистику. Элементы проходят жизненный цикл статусов `draft`, `pending`, `approved` и `rejected`. Все конечные точки требуют аутентификации администратора.

## Базовый путь

```
/api/admin/items
```

## Сводка маршрута

|Метод|Путь|Авторизация|Описание|
| -------- | ------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/items`|Админ|Получить список элементов с разбивкой на страницы|
|`POST`|`/api/admin/items`|Админ|Создать новый элемент|
|`GET`|`/api/admin/items/stats`|Админ|Получить статистику предметов|
|`POST`|`/api/admin/items/bulk`|Админ|Массовое одобрение, отклонение или удаление|
|`GET`|`/api/admin/items/{id}`|Админ|Получить товар по идентификатору|
|`PUT`|`/api/admin/items/{id}`|Админ|Обновить элемент|
|`DELETE`|`/api/admin/items/{id}`|Админ|Удалить элемент навсегда|
|`POST`|`/api/admin/items/{id}/review`|Админ|Утвердить или отклонить элемент|
|`GET`|`/api/admin/items/{id}/history`|Админ|Получить историю аудита элементов|

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

## Создать элемент

```
POST /api/admin/items
```

Создает новый элемент с повторяющимися проверками как идентификатора, так и ярлыка. Запускает синхронизацию CRM (если включена) и индексацию местоположения (если включена).

**Тело запроса:**

|Поле|Тип|Требуется|Описание|
| ------------ | -------- | -------- | ---------------------------------------------- |
|`id`|строка|Да|Уникальный идентификатор товара|
|`name`|строка|Да|Название предмета|
|`slug`|строка|Да|URL-адресный фрагмент (должен быть уникальным)|
|`description`|строка|Да|Описание товара|
|`source_url`|строка|Да|Исходный URL элемента|
|`category`|строка[]|Нет|Массив ярлыков категорий|
|`tags`|строка[]|Нет|Массив тегов|
|`brand`|строка|Нет|Название бренда (используется для синхронизации компании CRM)|
|`featured`|логическое значение|Нет|Рекомендуемый флаг (по умолчанию: `false`)|
|`icon_url`|строка|Нет|URL-адрес значка|
|`status`|строка|Нет|Исходное состояние (по умолчанию: `draft`)|
|`location`|объект|Нет|Данные о местоположении для геоиндексации|

**Ответ (201):**

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

## Массовые действия

```
POST /api/admin/items/bulk
```

Выполняет массовое утверждение, отклонение или удаление до 100 элементов. Каждый товар обрабатывается индивидуально; Частичные сбои не прерывают всю операцию. Отправляет уведомления по электронной почте отправителям об утверждении/отклонении.

**Тело запроса:**

|Поле|Тип|Требуется|Описание|
| -------- | -------- | ------------------ | ---------------------------------------------------- |
|`action`|строка|Да|`approve`, `reject` или `delete`|
|`ids`|строка[]|Да|Идентификаторы элементов для обработки (1–100, дубликатов нет)|
|`reason`|строка|Да (для `reject`)|Причина отклонения (минимум 10 символов)|

**Ответ (200):**

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

## Обзор элемента

```
POST /api/admin/items/{id}/review
```

Утверждает или отклоняет элемент. Записывает решение о проверке с дополнительными примечаниями. Отправляет уведомление по электронной почте исходному отправителю (если отправитель является зарегистрированным пользователем).

**Тело запроса:**

|Поле|Тип|Требуется|Описание|
| -------------- | ------ | -------- | ------------------------------------ |
|`status`|строка|Да|`approved` или `rejected`|
|`review_notes`|строка|Нет|Разъяснение решения о проверке|

**Ответ (200):**

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

## Правила валидации

|Поле|Правило|
| ------------ | ---------------------------------------------------------- |
|`id`|Требуется; должно быть уникальным для всех элементов|
|`name`|Требуется для создания|
|`slug`|Требуется; должно быть уникальным для всех элементов|
|`description`|Требуется для создания|
|`source_url`|Требуется для создания; действительный формат URL|
|`status`|Должно быть `draft`, `pending`, `approved` или `rejected`|
|`reason`|Требуется для массового отклонения; минимум 10 символов|
|`ids`|Массовое: 1–100 непустых уникальных строк.|
|`action`|Фильтр истории: только допустимые типы действий аудита|

## Коды ошибок

|Статус|Значение|
| ------ | -------------------------------------------------------- |
| `400`  |Ошибка проверки, неверные параметры, отсутствующие поля.|
| `401`  |Требуется аутентификация|
| `403`  |Требуются права администратора|
| `404`  |Товар не найден|
| `409`  |Повторяющийся идентификатор элемента или ярлык|
| `500`  |Внутренняя ошибка сервера|

## Сопутствующая документация

- [API ролей администратора](./admin-roles-endpoints.md) — управление ролями, назначенными пользователям.
- [API администраторов](./admin-users-endpoints.md) – управление учетными записями пользователей.
- [Аутентификация](../architecture/nextauth-configuration.md) — управление сеансом и защита
