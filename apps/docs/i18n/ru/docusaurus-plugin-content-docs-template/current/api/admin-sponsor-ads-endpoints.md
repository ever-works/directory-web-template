---
id: admin-sponsor-ads-endpoints
title: 管理员赞助商广告 API 端点
sidebar_label: 管理员赞助商广告
sidebar_position: 39
---

# 管理员赞助商广告 API 端点

赞助商广告 API 提供用于管理赞助广告的端点，包括列出、查看、批准、拒绝和取消广告。赞助商广告在 `pending_payment`、`pending`、`active`、`rejected`、`expired` 和 `cancelled` 状态的生命周期中进展。所有端点都需要管理员身份验证。

## 基本路径

```
/api/admin/sponsor-ads
```

## 路线概要

|方法|路径|授权|描述|
| -------- | ------------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/sponsor-ads`|管理员|获取分页的赞助商广告列表|
|`GET`|`/api/admin/sponsor-ads/{id}`|管理员|通过ID获取赞助商广告|
|`DELETE`|`/api/admin/sponsor-ads/{id}`|管理员|永久删除赞助商广告|
|`POST`|`/api/admin/sponsor-ads/{id}/approve`|管理员|批准并激活赞助商广告|
|`POST`|`/api/admin/sponsor-ads/{id}/reject`|管理员|拒绝赞助商广告|
|`POST`|`/api/admin/sponsor-ads/{id}/cancel`|管理员|取消赞助商广告|

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

## 获取赞助商广告

```
GET /api/admin/sponsor-ads/{id}
```

返回特定的赞助商广告，其中包含完整的详细信息，包括关联的用户信息。

**回复 (200)：**

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

## 批准赞助商广告

```
POST /api/admin/sponsor-ads/{id}/approve
```

批准并激活赞助商广告。 `pending` 状态的广告可以直接获得批准。对于`pending_payment`状态的广告，将`forceApprove`设置为`true`即可批准，无需付款确认。

**请求正文（可选）：**

|领域|类型|必填|描述|
| -------------- | ------- | -------- | --------------------------------------------------- |
|`forceApprove`|布尔值|否|设置为 `true` 以无需付款即可批准（`pending_payment` 状态）|

**示例：**

```json
{
  "forceApprove": true
}
```

**回复 (200)：**

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

**错误响应：**

|状态|错误|描述|
| ------ | ------------------------ | ------------------------------------------------ |
| `400`  |`PAYMENT_NOT_RECEIVED`|广告的状态为`pending_payment`；使用`forceApprove`|
| `400`  |`Cannot approve...`|广告状态不允许批准|
| `404`  |`Sponsor ad not found`|不存在具有给定 ID 的广告|

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

## 取消赞助商广告

```
POST /api/admin/sponsor-ads/{id}/cancel
```

取消处于 `pending`、`pending_payment` 或 `active` 状态的赞助商广告。可以提供可选的取消原因。已通过 Zod (`cancelSponsorAdSchema`) 验证。

**请求正文（可选）：**

|领域|类型|必填|描述|
| -------------- | ------ | -------- | --------------------------------------- |
|`cancelReason`|字符串|否|取消原因（最多 500 个字符）|

**示例：**

```json
{
  "cancelReason": "Client requested cancellation due to budget changes."
}
```

**回复 (200)：**

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

## 验证规则

|领域|规则|
| ----------------- | ------------------------------------------------------ |
|`status`|必须是有效的赞助商广告状态|
|`interval`|必须是 `weekly` 或 `monthly`|
|`rejectionReason`|需要拒绝； 10--500个字符|
|`cancelReason`|可选择取消；最多 500 个字符|
|`forceApprove`|布尔值；仅与 `pending_payment` 状态相关|
|`sortBy`|必须是 `createdAt`、`updatedAt`、`startDate`、`endDate` 或 `status`|
|`sortOrder`|必须是 `asc` 或 `desc`|

## 错误代码

|状态|含义|
| ------ | ------------------------------------------------------ |
| `400`  |验证错误、状态转换无效、未收到付款|
| `401`  |需要身份验证|
| `403`  |需要管理员权限|
| `404`  |找不到赞助商广告|
| `500`  |服务器内部错误|

## 相关文档

- [Admin Users API](./admin-users-endpoints.md) -- 用户账户管理
- [Admin Clients API](./admin-clients-endpoints.md) -- 客户端配置文件管理
- [Authentication](../architecture/nextauth-configuration.md) -- 会话管理和防护
