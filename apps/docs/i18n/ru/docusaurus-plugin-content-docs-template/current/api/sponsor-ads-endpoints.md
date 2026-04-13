---
id: sponsor-ads-endpoints
title: "赞助商广告 API 端点"
sidebar_label: "赞助商广告"
sidebar_position: 16
---

# 赞助商广告 API 端点

赞助商广告 API 管理赞助商广告的整个生命周期：创建、付款结账、续订、取消和统计。它与多个支付提供商（Stripe、LemonSqueezy、Polar）集成进行计费。

**源文件：**
- `template/app/api/sponsor-ads/route.ts`
- `template/app/api/sponsor-ads/checkout/route.ts`
- `template/app/api/sponsor-ads/user/route.ts`
- `template/app/api/sponsor-ads/user/[id]/route.ts`
- `template/app/api/sponsor-ads/user/[id]/cancel/route.ts`
- `template/app/api/sponsor-ads/user/[id]/renew/route.ts`
- `template/app/api/sponsor-ads/user/stats/route.ts`

## 端点摘要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|获取|`/api/sponsor-ads`|无|获取活跃的赞助商广告（公开）|
|后处理|`/api/sponsor-ads/checkout`|会议|创建结账会话|
|获取|`/api/sponsor-ads/user`|会议|列出用户的赞助商广告|
|后处理|`/api/sponsor-ads/user`|会议|提交新的赞助商广告|
|获取|`/api/sponsor-ads/user/{id}`|会议|获取单一赞助商广告|
|后处理|`/api/sponsor-ads/user/{id}/cancel`|会议|取消赞助商广告|
|后处理|`/api/sponsor-ads/user/{id}/renew`|会议|续订赞助商广告|
|获取|`/api/sponsor-ads/user/stats`|会议|获取用户的广告统计信息|

---

## GET `/api/sponsor-ads`

Returns active sponsor ads with associated item data for public display. **No authentication required.**

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Max ads to return (1-50) |

### Response: 200

```json
{
  "success": true,
  "data": [
    {
      "sponsor": {
        "id": "sp_123",
        "itemSlug": "featured-tool",
        "status": "active",
        "interval": "monthly"
      },
      "item": {
        "name": "Featured Tool",
        "slug": "featured-tool",
        "description": "A great tool",
        "icon_url": "https://example.com/icon.png",
        "category": "productivity"
      }
    }
  ]
}
```

---

## 发布 `/api/sponsor-ads/checkout`

为已批准的赞助商广告创建付款结账会话。支持 Stripe、LemonSqueezy 和 Polar 提供商。

### 请求正文

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`sponsorAdId`|字符串|**是**|批准的赞助商广告 ID|
|`successUrl`|字符串|否|支付成功后重定向URL|
|`cancelUrl`|字符串|否|取消付款后重定向 URL|

### 安全性：开放重定向预防

重定向 URL 根据应用程序的来源进行验证，以防止开放重定向攻击：

```ts
function validateRedirectUrl(url, allowedOrigin) {
  const urlObj = new URL(url, allowedOrigin);
  const allowedUrlObj = new URL(allowedOrigin);
  // Only allow same protocol, hostname, and port
  return urlObj.protocol === allowedUrlObj.protocol &&
    urlObj.hostname === allowedUrlObj.hostname &&
    urlObj.port === allowedUrlObj.port;
}
```

无效的 URL 会默默地替换为安全的默认值。

### 回复：200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_live_abc123",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_abc123",
    "provider": "stripe"
  },
  "message": "Checkout session created successfully"
}
```

### 错误响应

|状态|描述|
|--------|-------------|
| 400 |缺少赞助商广告 ID、广告不处于 `pending_payment` 状态或缺少价格配置|
| 401 |未经过验证|
| 403 |User does not own this sponsor ad|
| 404 |找不到赞助商广告|

---

## GET `/api/sponsor-ads/user`

Returns a paginated list of sponsor ads belonging to the authenticated user.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 10 | Items per page |
| `status` | string | No | -- | Filter: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| `interval` | string | No | -- | Filter by billing interval |
| `search` | string | No | -- | Text search filter |

Query parameters are validated using the `querySponsorAdsSchema` Zod schema.

### Response: 200

```json
{
  "success": true,
  "data": [
    {
      "id": "sp_123",
      "itemSlug": "my-tool",
      "status": "active",
      "interval": "monthly"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## 发布 `/api/sponsor-ads/user`

Creates a new sponsor ad submission. The ad starts in a pending state awaiting admin approval.

### 请求正文

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`itemSlug`|字符串|**是**|Slug of the item to sponsor|
|`itemName`|字符串|**是**|项目的显示名称|
|`itemIconUrl`|字符串|否|图标网址|
|`itemCategory`|字符串|否|项目类别|
|`itemDescription`|字符串|否|Description (max 500 chars)|
|`interval`|`"weekly"` 或 `"monthly"`|**是**|订阅间隔|

### 响应：201 已创建

```json
{
  "success": true,
  "data": {
    "id": "sp_new123",
    "status": "pending",
    "interval": "monthly"
  },
  "message": "Sponsor ad submission created successfully. Pending admin approval."
}
```

### 400 -- Duplicate Submission

```json
{
  "success": false,
  "error": "You already have an active sponsor ad"
}
```

---

## GET `/api/sponsor-ads/user/{id}`

Retrieves a single sponsor ad owned by the authenticated user. Returns 404 if the ad does not exist or belongs to another user (to prevent information leakage).

---

## 发布 `/api/sponsor-ads/user/{id}/cancel`

取消赞助商广告。 Only ads with status `pending_payment`, `pending`, or `active` can be cancelled.

### 请求正文

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`cancelReason`|字符串|否|取消原因（最多 500 个字符）|

### 回复：200

```json
{
  "success": true,
  "data": { "id": "sp_123", "status": "cancelled" },
  "message": "Sponsor ad cancelled successfully"
}
```

### 错误响应

|状态|描述|
|--------|-------------|
| 400 |Cannot cancel ad with current status|
| 403 |User does not own this sponsor ad|
| 404 |找不到赞助商广告|

---

## POST `/api/sponsor-ads/user/{id}/renew`

Creates a checkout session to renew an active or expired sponsor ad. Only ads with status `active` or `expired` can be renewed.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `successUrl` | string | No | Redirect URL after payment |
| `cancelUrl` | string | No | Redirect URL on cancellation |

### Response: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_renewal_abc",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_renewal_abc",
    "provider": "stripe"
  },
  "message": "Renewal checkout session created successfully"
}
```

---

## 获取`/api/sponsor-ads/user/stats`

Returns statistics for the authenticated user's sponsor ads including status breakdown, interval distribution, and revenue metrics.

### 回复：200

```json
{
  "success": true,
  "stats": {
    "overview": {
      "total": 15,
      "pendingPayment": 2,
      "pending": 3,
      "active": 5,
      "rejected": 1,
      "expired": 3,
      "cancelled": 1
    },
    "byInterval": {
      "weekly": 8,
      "monthly": 7
    },
    "revenue": {
      "totalRevenue": 45000,
      "weeklyRevenue": 20000,
      "monthlyRevenue": 25000
    }
  }
}
```

Revenue values are in **minor currency units** (for example, cents for USD).

---

## Payment Provider Configuration

The active payment provider is determined by `NEXT_PUBLIC_PAYMENT_PROVIDER` (defaults to `"stripe"`). Each provider requires its own set of price/variant ID environment variables:

| Provider | Weekly Price Env Var | Monthly Price Env Var |
|----------|---------------------|-----------------------|
| Stripe | `STRIPE_SPONSOR_WEEKLY_PRICE_ID` | `STRIPE_SPONSOR_MONTHLY_PRICE_ID` |
| LemonSqueezy | `LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID` | `LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID` |
| Polar | `POLAR_SPONSOR_WEEKLY_PRICE_ID` | `POLAR_SPONSOR_MONTHLY_PRICE_ID` |

---

## 相关源文件

|文件|目的|
|------|---------|
|`template/app/api/sponsor-ads/route.ts`|Public active ads endpoint|
|`template/app/api/sponsor-ads/checkout/route.ts`|Checkout session creation|
|`template/app/api/sponsor-ads/user/route.ts`|User ads list and creation|
|`template/app/api/sponsor-ads/user/[id]/route.ts`|单个广告检索|
|`template/app/api/sponsor-ads/user/[id]/cancel/route.ts`|广告取消|
|`template/app/api/sponsor-ads/user/[id]/renew/route.ts`|广告续订|
|`template/app/api/sponsor-ads/user/stats/route.ts`|用户统计|
|`template/lib/services/sponsor-ad.service.ts`|业务逻辑层|
|`template/lib/validations/sponsor-ad.ts`|Zod 验证模式|
|`template/lib/payment/config/payment-provider-manager.ts`|支付提供商工厂|
