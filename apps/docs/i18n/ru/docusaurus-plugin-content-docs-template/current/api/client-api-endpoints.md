---
id: client-api-endpoints
title: Конечные точки клиентского API
sidebar_label: Клиентский API
sidebar_position: 58
---

# Конечные точки клиентского API

Клиентский API предоставляет зарегистрированным пользователям аутентифицированные конечные точки для управления отправленными ими элементами, просмотра статистики информационной панели и доступа к географическим данным. Все конечные точки требуют аутентификации на основе сеанса через `requireClientAuth()`.

**Исходный каталог:** `template/app/api/client/`

---

## Authentication

Every endpoint in this group requires a valid user session. Unauthenticated requests receive:

**Status 401**
```json
{
  "success": false,
  "error": "Unauthorized. Please sign in to continue."
}
```

---

## Статистика информационной панели

### Получить статистику панели мониторинга

Возвращает подробную статистику информационной панели для аутентифицированного пользователя.

|Недвижимость|Значение|
|----------|-------|
|**Метод**|`GET`|
|**Путь**|`/api/client/dashboard/stats`|
|**Аутентификация**|Сеанс (пользователь)|
|**Источник**|`client/dashboard/stats/route.ts`|

#### Ответ

**Статус 200**

```json
{
  "success": true,
  "totalSubmissions": 23,
  "totalViews": 0,
  "totalVotesReceived": 156,
  "totalCommentsReceived": 89,
  "viewsAvailable": false,
  "recentActivity": {
    "newSubmissions": 3,
    "newViews": 0
  },
  "uniqueItemsInteracted": 45,
  "totalActivity": 237,
  "activityChartData": [
    { "date": "Mon", "submissions": 1, "views": 0, "engagement": 5 }
  ],
  "engagementChartData": [
    { "name": "Votes", "value": 156, "color": "#8884d8" }
  ],
  "submissionTimeline": [
    { "month": "Mar", "submissions": 5 }
  ],
  "engagementOverview": [
    { "week": "W1", "votes": 10, "comments": 3 }
  ],
  "statusBreakdown": [
    { "status": "Approved", "value": 15, "color": "#22c55e" },
    { "status": "Pending", "value": 5, "color": "#f59e0b" },
    { "status": "Rejected", "value": 3, "color": "#ef4444" }
  ],
  "topItems": [
    { "id": "item_1", "title": "My Tool", "views": 100, "votes": 25, "comments": 8 }
  ]
}
```

#### Пример завитка

```bash
curl -s http://localhost:3000/api/client/dashboard/stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Get Geographic Stats

Returns geographic coverage statistics for the authenticated user's items.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/geo-stats` |
| **Auth** | Session (user) |
| **Source** | `client/geo-stats/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "total_items": 10,
  "items_with_location": 7,
  "items_remote": 2,
  "service_area_breakdown": [
    { "area": "local", "count": 3 },
    { "area": "regional", "count": 2 }
  ],
  "top_cities": [
    { "city": "New York", "count": 3 }
  ],
  "top_countries": [
    { "country": "United States", "count": 5 }
  ]
}
```

#### curl Example

```bash
curl -s http://localhost:3000/api/client/geo-stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Получить координаты объекта

Возвращает координаты для всех пользовательских элементов, имеющих данные о местоположении, подходящие для рендеринга карты.

|Недвижимость|Значение|
|----------|-------|
|**Метод**|`GET`|
|**Путь**|`/api/client/items/coordinates`|
|**Аутентификация**|Сеанс (пользователь)|
|**Источник**|`client/items/coordinates/route.ts`|

#### Ответ

**Статус 200**

```json
{
  "success": true,
  "coordinates": [
    {
      "slug": "my-item",
      "name": "My Item",
      "latitude": 40.7128,
      "longitude": -74.006
    }
  ]
}
```

#### Пример завитка

```bash
curl -s http://localhost:3000/api/client/items/coordinates \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Items Management

### List User Items

Returns a paginated list of items submitted by the authenticated user.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/items` |
| **Auth** | Session (user) |
| **Source** | `client/items/route.ts` |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | `integer` | No | `1` | Page number (min: 1) |
| `limit` | `integer` | No | `10` | Items per page (1-100) |
| `status` | `string` | No | -- | Filter: `all`, `pending`, `approved`, `rejected` |
| `search` | `string` | No | -- | Search by item name or description |
| `sortBy` | `string` | No | -- | Sort field |
| `sortOrder` | `string` | No | -- | Sort direction |
| `deleted` | `boolean` | No | `false` | If `true`, returns soft-deleted items |

#### Response

**Status 200**

```json
{
  "success": true,
  "items": [ /* item objects */ ],
  "total": 23,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "stats": {
    "total": 20,
    "pending": 3,
    "approved": 15,
    "rejected": 2,
    "deleted": 1
  }
}
```

#### curl Example

```bash
# List approved items, page 2
curl -s "http://localhost:3000/api/client/items?status=approved&page=2&limit=10" \
  -H "Cookie: next-auth.session-token=<session_token>"

# Search for items
curl -s "http://localhost:3000/api/client/items?search=productivity" \
  -H "Cookie: next-auth.session-token=<session_token>"

# List deleted items
curl -s "http://localhost:3000/api/client/items?deleted=true" \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Создать элемент

Создает новую отправку элемента. Для элемента установлен статус `pending` для проверки администратором.

|Недвижимость|Значение|
|----------|-------|
|**Метод**|`POST`|
|**Путь**|`/api/client/items`|
|**Аутентификация**|Сеанс (пользователь)|
|**Источник**|`client/items/route.ts`|

#### Тело запроса

```json
{
  "name": "Awesome Tool",
  "description": "A great productivity tool that helps teams collaborate.",
  "source_url": "https://example.com",
  "category": "Productivity",
  "tags": ["collaboration", "remote-work"],
  "icon_url": "https://example.com/icon.png"
}
```

|Поле|Тип|Требуется|Описание|
|-------|------|----------|-------------|
|`name`|`string`|Да|Название товара (3–100 символов)|
|`description`|`string`|Да|Описание товара (10-500 символов)|
|`source_url`|`string` (URI)|Да|Основной URL/ссылка на элемент|
|`category`|`строка \|строка[]`|Нет|Имя категории или массив категорий|
|`tags`|`string[]`|Нет|Массив строк тегов|
|`icon_url`|`string` (URI)|Нет|URL-адрес значка элемента|

#### Ответ

**Статус 201**

```json
{
  "success": true,
  "item": { /* created item object */ },
  "message": "Item submitted successfully. It will be reviewed by our team before being published."
}
```

**Статус 400** – Ошибка проверки.

```json
{
  "success": false,
  "error": "Name must be at least 3 characters"
}
```

#### Пример завитка

```bash
curl -s -X POST http://localhost:3000/api/client/items \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{
    "name": "Awesome Tool",
    "description": "A great productivity tool that helps teams collaborate effectively.",
    "source_url": "https://example.com",
    "category": "Productivity",
    "tags": ["collaboration"]
  }'
```

---

### Get Single Item

Returns details of a specific item owned by the authenticated user.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/items/{id}` |
| **Auth** | Session (user, owner) |
| **Source** | `client/items/[id]/route.ts` |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Item ID |

#### Response

**Status 200**

```json
{
  "success": true,
  "item": { /* item object */ },
  "engagement": {
    "views": 150,
    "likes": 23
  }
}
```

| Status | Description |
|--------|-------------|
| 400 | Invalid item ID |
| 401 | Unauthorized |
| 403 | Not the item owner |
| 404 | Item not found |

---

### Обновить элемент

Обновляет элемент, принадлежащий аутентифицированному пользователю. Если элемент был ранее одобрен, его обновление меняет его статус на `pending` для повторного рассмотрения.

|Недвижимость|Значение|
|----------|-------|
|**Метод**|`PUT`|
|**Путь**|`/api/client/items/{id}`|
|**Аутентификация**|Сеанс (пользователь, владелец)|
|**Источник**|`client/items/[id]/route.ts`|

#### Тело запроса

Все поля являются необязательными. Должно быть указано хотя бы одно поле.

```json
{
  "name": "Updated Tool Name",
  "description": "Updated description with more details.",
  "source_url": "https://example.com/v2",
  "category": ["Productivity", "Developer Tools"],
  "tags": ["collaboration", "ai"],
  "icon_url": "https://example.com/new-icon.png"
}
```

#### Ответ

**Статус 200**

```json
{
  "success": true,
  "item": { /* updated item object */ },
  "statusChanged": true,
  "previousStatus": "approved",
  "message": "Item updated successfully. Since it was previously approved, it has been moved to pending for re-review."
}
```

|Поле|Тип|Описание|
|-------|------|-------------|
|`statusChanged`|`boolean`|`true`, если статус изменился с одобренного на ожидающий|
|`previousStatus`|`string`|Статус предмета до обновления|

#### Пример завитка

```bash
curl -s -X PUT http://localhost:3000/api/client/items/item_123 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "name": "Updated Tool Name" }'
```

---

### Delete Item (Soft Delete)

Soft-deletes an item owned by the authenticated user. The item is hidden but can be restored later.

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/client/items/{id}` |
| **Auth** | Session (user, owner) |
| **Source** | `client/items/[id]/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

| Status | Description |
|--------|-------------|
| 400 | Item is already deleted |
| 401 | Unauthorized |
| 403 | Not the item owner |
| 404 | Item not found |

---

### Восстановить предмет

Восстанавливает ранее обратимо удаленный элемент.

|Недвижимость|Значение|
|----------|-------|
|**Метод**|`POST`|
|**Путь**|`/api/client/items/{id}/restore`|
|**Аутентификация**|Сеанс (пользователь, владелец)|
|**Источник**|`client/items/[id]/restore/route.ts`|

#### Ответ

**Статус 200**

```json
{
  "success": true,
  "item": { /* restored item object */ },
  "message": "Item restored successfully"
}
```

|Статус|Описание|
|--------|-------------|
| 400 |Элемент не удален (невозможно восстановить активный элемент)|
| 401 |Несанкционированный|
| 403 |Не владелец предмета|
| 404 |Товар не найден|

#### Пример завитка

```bash
curl -s -X POST http://localhost:3000/api/client/items/item_123/restore \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Get Submission Statistics

Returns statistics about the authenticated user's submissions grouped by status.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/items/stats` |
| **Auth** | Session (user) |
| **Source** | `client/items/stats/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "stats": {
    "total": 12,
    "draft": 2,
    "pending": 3,
    "approved": 5,
    "rejected": 2,
    "deleted": 1
  }
}
```

#### curl Example

```bash
curl -s http://localhost:3000/api/client/items/stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Использование TypeScript

```typescript
import type { ClientCreateItemResponse } from '@/lib/types/client-item';

// Fetch dashboard stats
const dashboardRes = await fetch('/api/client/dashboard/stats');
const dashboard = await dashboardRes.json();

// Create a new item submission
const createRes = await fetch('/api/client/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My New Tool',
    description: 'A detailed description of what this tool does.',
    source_url: 'https://mytool.com',
    category: 'Productivity',
  }),
});
const created: ClientCreateItemResponse = await createRes.json();

// Update an item
const updateRes = await fetch(`/api/client/items/${itemId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Updated Name' }),
});
const updated = await updateRes.json();
if (updated.statusChanged) {
  console.log('Item moved back to pending for re-review');
}
```

## Шаблон ответа об ошибке

Все конечные точки клиентского API имеют единообразную форму ошибки:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

В ответах на ошибки используется утилита `serverErrorResponse()`, которая регистрирует подробную информацию об ошибках на стороне сервера, возвращая клиенту только общее сообщение, чтобы предотвратить раскрытие информации.
