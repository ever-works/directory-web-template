---
id: admin-sponsor-ads-endpoints
title: Admin Sponsor Ads API Endpoints
sidebar_label: Admin Sponsor Ads
sidebar_position: 39
---

# Admin Sponsor Ads API Endpoints

API за реклами на спонсори предоставя крайни точки за управление на спонсорирани реклами, включително изброяване, преглед, одобряване, отхвърляне и анулиране на реклами. Рекламите на спонсори напредват през жизнения цикъл на статуси `pending_payment`, `pending`, `active`, `rejected`, `expired` и `cancelled`. Всички крайни точки изискват администраторско удостоверяване.

## Основен път

```
/api/admin/sponsor-ads
```

## Резюме на маршрута

|Метод|Пътека|авт|Описание|
| -------- | ------------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/sponsor-ads`|Админ|Вземете пагиниран списък със спонсорски реклами|
|`GET`|`/api/admin/sponsor-ads/{id}`|Админ|Вземете реклама на спонсор по ID|
|`DELETE`|`/api/admin/sponsor-ads/{id}`|Админ|Изтрийте рекламата на спонсор за постоянно|
|`POST`|`/api/admin/sponsor-ads/{id}/approve`|Админ|Одобрете и активирайте реклама на спонсор|
|`POST`|`/api/admin/sponsor-ads/{id}/reject`|Админ|Отхвърлете реклама на спонсор|
|`POST`|`/api/admin/sponsor-ads/{id}/cancel`|Админ|Отменете реклама на спонсор|

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

## Вземете реклама на спонсор

```
GET /api/admin/sponsor-ads/{id}
```

Връща конкретна реклама на спонсор с пълни подробности, включително свързаната потребителска информация.

**Отговор (200):**

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

## Одобряване на реклама на спонсор

```
POST /api/admin/sponsor-ads/{id}/approve
```

Одобрява и активира реклама на спонсор. Рекламите със статус `pending` могат да бъдат одобрени директно. За реклами със статус `pending_payment`, задайте `forceApprove` на `true`, за да одобрите без потвърждение на плащането.

**Тяло на заявката (по избор):**

|Поле|Тип|Задължително|Описание|
| -------------- | ------- | -------- | --------------------------------------------------- |
|`forceApprove`|булево|не|Задайте на `true` за одобрение без плащане (за `pending_payment` статус)|

**Пример:**

```json
{
  "forceApprove": true
}
```

**Отговор (200):**

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

**Отговори за грешка:**

|Статус|Грешка|Описание|
| ------ | ------------------------ | ------------------------------------------------ |
| `400`  |`PAYMENT_NOT_RECEIVED`|Обявата е със статус `pending_payment`; използвай `forceApprove`|
| `400`  |`Cannot approve...`|Състоянието на рекламата не позволява одобрение|
| `404`  |`Sponsor ad not found`|Не съществува реклама с посочения ID|

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

## Анулиране на реклама на спонсор

```
POST /api/admin/sponsor-ads/{id}/cancel
```

Анулира реклама на спонсор, която е в статус `pending`, `pending_payment` или `active`. Може да се посочи незадължителна причина за анулиране. Валидирано със Zod (`cancelSponsorAdSchema`).

**Тяло на заявката (по избор):**

|Поле|Тип|Задължително|Описание|
| -------------- | ------ | -------- | --------------------------------------- |
|`cancelReason`|низ|не|Причина за анулиране (макс. 500 знака)|

**Пример:**

```json
{
  "cancelReason": "Client requested cancellation due to budget changes."
}
```

**Отговор (200):**

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

## Правила за валидиране

|Поле|правило|
| ----------------- | ------------------------------------------------------ |
|`status`|Трябва да е валиден рекламен статус на спонсор|
|`interval`|Трябва да е `weekly` или `monthly`|
|`rejectionReason`|Изисква се за отхвърляне; 10--500 знака|
|`cancelReason`|По избор за отмяна; максимум 500 знака|
|`forceApprove`|булев; приложимо само за статус `pending_payment`|
|`sortBy`|Трябва да е `createdAt`, `updatedAt`, `startDate`, `endDate` или `status`|
|`sortOrder`|Трябва да е `asc` или `desc`|

## Кодове за грешки

|Статус|Значение|
| ------ | ------------------------------------------------------ |
| `400`  |Грешка при валидиране, невалиден преход на статус, плащането не е получено|
| `401`  |Изисква се удостоверяване|
| `403`  |Необходими са администраторски права|
| `404`  |Рекламата на спонсор не е намерена|
| `500`  |Вътрешна грешка на сървъра|

## Свързана документация

- [API за администраторски потребители](./admin-users-endpoints.md) -- управление на потребителски акаунти
- [API за администраторски клиенти](./admin-clients-endpoints.md) -- управление на клиентски профил
- [Удостоверяване](../architecture/nextauth-configuration.md) -- управление на сесии и охрана
