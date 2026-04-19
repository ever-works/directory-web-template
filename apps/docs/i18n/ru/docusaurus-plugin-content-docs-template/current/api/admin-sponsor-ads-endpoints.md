---
id: admin-sponsor-ads-endpoints
title: Конечные точки API спонсорской рекламы для администраторов
sidebar_label: Спонсорская реклама администратора
sidebar_position: 39
---

# Конечные точки API спонсорской рекламы для администраторов

API спонсорской рекламы предоставляет конечные точки для управления спонсируемой рекламой, включая размещение, просмотр, утверждение, отклонение и отмену рекламы. Спонсорские объявления проходят жизненный цикл статусов `pending_payment`, `pending`, `active`, `rejected`, `expired` и `cancelled`. Все конечные точки требуют аутентификации администратора.

## Базовый путь

```
/api/admin/sponsor-ads
```

## Сводка маршрута

|Метод|Путь|Авторизация|Описание|
| -------- | ------------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/sponsor-ads`|Админ|Получить список спонсорских объявлений с разбивкой по страницам|
|`GET`|`/api/admin/sponsor-ads/{id}`|Админ|Получить рекламу спонсора по идентификатору|
|`DELETE`|`/api/admin/sponsor-ads/{id}`|Админ|Удалить рекламу спонсора навсегда|
|`POST`|`/api/admin/sponsor-ads/{id}/approve`|Админ|Одобрить и активировать спонсорское объявление|
|`POST`|`/api/admin/sponsor-ads/{id}/reject`|Админ|Отклонить рекламу спонсора|
|`POST`|`/api/admin/sponsor-ads/{id}/cancel`|Админ|Отменить рекламу спонсора|

---

## List Sponsor Ads

```
GET /api/admin/sponsor-ads
```

Returns a paginated list of sponsor ads with optional filtering by status and billing interval. Also returns aggregate statistics for the admin dashboard. Query parameters are validated with Zod.

**Query Parameters:**

| Parameter   | Type    | Default     | Description                                                          |
| ----------- | ------- | ----------- | -------------------------------------------------------------------- |
| `page`      | integer | `1`         | Page number (minimum: 1)                                              |
| `limit`     | integer | `10`        | Results per page (1--100)                                             |
| `status`    | string  | --          | Filter: `pending_payment`, `pending`, `rejected`, `active`, `expired`, `cancelled` |
| `interval`  | string  | --          | Filter: `weekly` or `monthly`                                         |
| `search`    | string  | --          | Search sponsor ads by text                                            |
| `sortBy`    | string  | `createdAt` | Sort field: `createdAt`, `updatedAt`, `startDate`, `endDate`, `status`|
| `sortOrder` | string  | `desc`      | Sort direction: `asc` or `desc`                                       |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "ad_123abc",
      "title": "Premium Tool Spotlight",
      "description": "Featured placement for premium tools",
      "status": "active",
      "interval": "monthly",
      "startDate": "2024-01-20T00:00:00.000Z",
      "endDate": "2024-02-20T00:00:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "stats": {
    "total": 25,
    "active": 8,
    "pending": 5,
    "expired": 10,
    "cancelled": 2
  }
}
```

---

## Получить спонсорскую рекламу

```
GET /api/admin/sponsor-ads/{id}
```

Возвращает конкретное рекламное объявление спонсора с полной информацией, включая информацию о связанном пользователе.

**Ответ (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "title": "Premium Tool Spotlight",
    "status": "active",
    "interval": "monthly",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

## Delete Sponsor Ad

```
DELETE /api/admin/sponsor-ads/{id}
```

Permanently deletes a sponsor ad. This action cannot be undone.

**Response (200):**

```json
{ "success": true, "message": "Sponsor ad deleted successfully" }
```

---

## Утвердить рекламу спонсора

```
POST /api/admin/sponsor-ads/{id}/approve
```

Утверждает и активирует спонсорскую рекламу. Объявления в статусе `pending` могут быть одобрены напрямую. Для объявлений со статусом `pending_payment` установите для `forceApprove` значение `true`, чтобы одобрить без подтверждения оплаты.

**Тело запроса (необязательно):**

|Поле|Тип|Требуется|Описание|
| -------------- | ------- | -------- | --------------------------------------------------- |
|`forceApprove`|логическое значение|Нет|Установите `true` для одобрения без оплаты (для статуса `pending_payment`)|

**Пример:**

```json
{
  "forceApprove": true
}
```

**Ответ (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "active",
    "startDate": "2024-01-20T00:00:00.000Z",
    "endDate": "2024-02-20T00:00:00.000Z"
  },
  "message": "Sponsor ad approved and activated successfully"
}
```

**Ответы об ошибках:**

|Статус|Ошибка|Описание|
| ------ | ------------------------ | ------------------------------------------------ |
| `400`  |`PAYMENT_NOT_RECEIVED`|Объявление имеет статус `pending_payment`; используйте `forceApprove`|
| `400`  |`Cannot approve...`|Статус объявления не позволяет одобрить|
| `404`  |`Sponsor ad not found`|Объявления с данным идентификатором не существует.|

---

## Reject Sponsor Ad

```
POST /api/admin/sponsor-ads/{id}/reject
```

Rejects a pending sponsor ad with a mandatory reason. Only ads in `pending` or `pending_payment` status can be rejected. The rejection reason is validated with Zod (`rejectSponsorAdSchema`).

**Request Body:**

| Field             | Type   | Required | Description                              |
| ----------------- | ------ | -------- | ---------------------------------------- |
| `rejectionReason` | string | Yes      | Reason for rejection (10--500 characters)|

**Example:**

```json
{
  "rejectionReason": "The ad content does not meet our quality standards. Please revise and resubmit."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "rejected",
    "rejectionReason": "The ad content does not meet our quality standards."
  },
  "message": "Sponsor ad rejected successfully"
}
```

---

## Отменить рекламу спонсора

```
POST /api/admin/sponsor-ads/{id}/cancel
```

Отменяет спонсорское объявление, имеющее статус `pending`, `pending_payment` или `active`. Можно указать дополнительную причину отмены. Подтверждено Зодом (`cancelSponsorAdSchema`).

**Тело запроса (необязательно):**

|Поле|Тип|Требуется|Описание|
| -------------- | ------ | -------- | --------------------------------------- |
|`cancelReason`|строка|Нет|Причина отмены (максимум 500 символов)|

**Пример:**

```json
{
  "cancelReason": "Client requested cancellation due to budget changes."
}
```

**Ответ (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "cancelled",
    "cancelReason": "Client requested cancellation due to budget changes."
  },
  "message": "Sponsor ad cancelled successfully"
}
```

---

## Status Lifecycle

Sponsor ads follow this status lifecycle:

```
pending_payment --> pending --> active --> expired
                       |          |
                       v          v
                   rejected   cancelled
```

- **`pending_payment`** -- Created by user, awaiting payment confirmation.
- **`pending`** -- Payment received, awaiting admin review.
- **`active`** -- Approved and currently running.
- **`rejected`** -- Declined by admin with a reason.
- **`expired`** -- Reached end date automatically.
- **`cancelled`** -- Cancelled by admin or user.

---

## Правила валидации

|Поле|Правило|
| ----------------- | ------------------------------------------------------ |
|`status`|Должен быть действительный статус спонсорского объявления.|
|`interval`|Должно быть `weekly` или `monthly`|
|`rejectionReason`|Требуется для отклонения; 10--500 символов|
|`cancelReason`|Необязательно для отмены; максимум 500 символов|
|`forceApprove`|логическое значение; актуально только для статуса `pending_payment`|
|`sortBy`|Должно быть `createdAt`, `updatedAt`, `startDate`, `endDate` или `status`|
|`sortOrder`|Должно быть `asc` или `desc`|

## Коды ошибок

|Статус|Значение|
| ------ | ------------------------------------------------------ |
| `400`  |Ошибка валидации, неверный переход статуса, платеж не получен|
| `401`  |Требуется аутентификация|
| `403`  |Требуются права администратора|
| `404`  |Спонсорское объявление не найдено|
| `500`  |Внутренняя ошибка сервера|

## Сопутствующая документация

- [API администраторов](./admin-users-endpoints.md) – управление учетными записями пользователей.
- [API клиентов администратора](./admin-clients-endpoints.md) – управление профилями клиентов.
- [Аутентификация](../architecture/nextauth-configuration.md) — управление сеансом и защита
