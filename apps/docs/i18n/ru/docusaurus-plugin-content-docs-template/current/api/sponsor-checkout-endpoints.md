---
id: sponsor-checkout-endpoints
title: "赞助商广告和结帐 API 参考"
sidebar_label: "赞助商广告和结账"
sidebar_position: 59
---

# 赞助商广告和结帐 API 参考

## 概述

赞助商广告端点管理目录项上的赞助商广告展示位置的整个生命周期。这包括浏览活动广告、提交新的赞助商请求、管理用户拥有的广告、通过多个提供商（Stripe、LemonSqueezy、Polar）处理付款以及处理取消和续订。结帐流程支持每周和每月的计费间隔。

## 端点

### GET /api/赞助商广告

返回当前有效的赞助商广告及其关联项目数据的列表，以供公开展示。

**请求**

|参数|类型|在|描述|
| --------- | ------- | ----- | ------------------------------------------------ |
|限制|整数|查询|返回的赞助商广告数量上限（默认值：10，最大值：50）|

**回应**

```typescript
{
  success: true;
  data: Array<{
    sponsor: {
      id: string;
      itemSlug: string;
      status: string;
      interval: string;
    };
    item: {
      name: string;
      slug: string;
      description: string;
      icon_url: string;
      category: string;
    } | null;
  }>;
}
```

**示例**

```typescript
const response = await fetch("/api/sponsor-ads?limit=5");
const { data: sponsoredItems } = await response.json();
```

### GET /api/赞助商广告/用户

返回经过身份验证的用户提交的赞助商广告的分页列表。

**请求**

|参数|类型|在|描述|
| --------- | ------- | ----- | --------------------------------------------------------------------------------------- |
|页面|整数|查询|页码（默认：1）|
|限制|整数|查询|每页项目数（默认值：10）|
|状态|字符串|查询|过滤器：`"pending"`、`"approved"`、`"rejected"`、`"active"`、`"expired"`、`"cancelled"`|
|间隔|字符串|查询|筛选器：`"weekly"`、`"monthly"`|
|搜索|字符串|查询|搜索词|

**回应**

```typescript
{
  success: true;
  data: Array<SponsorAd>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

**示例**

```typescript
const response = await fetch("/api/sponsor-ads/user?status=active&page=1");
const { data, pagination } = await response.json();
```

### POST /api/赞助商广告/用户

为经过身份验证的用户创建新的赞助商广告提交。提交开始时处于待处理状态，等待管理员批准。

**请求**

```typescript
{
  itemSlug: string;          // Slug of the item to sponsor (required)
  itemName: string;          // Name of the item (required)
  itemIconUrl?: string;      // Icon URL
  itemCategory?: string;     // Category of the item
  itemDescription?: string;  // Description (max 500 chars)
  interval: "weekly" | "monthly"; // Billing interval (required)
}
```

**回应**

```typescript
{
  success: true;
  data: SponsorAd;
  message: "Sponsor ad submission created successfully. Pending admin approval.";
}
```

**示例**

```typescript
const response = await fetch("/api/sponsor-ads/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    itemSlug: "my-awesome-tool",
    itemName: "My Awesome Tool",
    interval: "monthly",
  }),
});
```

### 获取/api/赞助商广告/用户/统计信息

返回经过身份验证的用户的赞助商广告的统计信息，包括按状态、间隔分布和收入指标划分的计数。

**请求**

无需参数。通过会话 cookie 进行身份验证。

**回应**

```typescript
{
  success: true;
  stats: {
    overview: {
      total: number;
      pendingPayment: number;
      pending: number;
      active: number;
      rejected: number;
      expired: number;
      cancelled: number;
    }
    byInterval: {
      weekly: number;
      monthly: number;
    }
    revenue: {
      totalRevenue: number; // In minor currency units (cents)
      weeklyRevenue: number;
      monthlyRevenue: number;
    }
  }
}
```

**示例**

```typescript
const response = await fetch("/api/sponsor-ads/user/stats");
const { stats } = await response.json();
console.log(
  `Active ads: ${stats.overview.active}, Total revenue: ${stats.revenue.totalRevenue}`,
);
```

### 获取`/api/sponsor-ads/user/{id}`

返回经过身份验证的用户拥有的单个赞助商广告。

**请求**

|参数|类型|在|描述|
| --------- | ------ | ---- | ------------------------ |
|编号|字符串|路径|赞助商广告 ID（必填）|

**回应**

```typescript
{
  success: true;
  data: SponsorAd;
}
```

### POST /api/赞助商广告/结帐

为已批准的赞助商广告创建结帐会话。赞助商广告必须处于 `pending_payment` 状态并且由经过身份验证的用户拥有。

**请求**

```typescript
{
  sponsorAdId: string;      // ID of the approved sponsor ad (required)
  successUrl?: string;      // Redirect URL after successful payment
  cancelUrl?: string;       // Redirect URL after cancelled payment
}
```

**回应**

```typescript
{
  success: true;
  data: {
    checkoutId: string; // Provider checkout session ID
    checkoutUrl: string; // URL to redirect user to for payment
    provider: string; // "stripe", "lemonsqueezy", or "polar"
  }
  message: "Checkout session created successfully";
}
```

**示例**

```typescript
const response = await fetch("/api/sponsor-ads/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sponsorAdId: "ad-123",
    successUrl: "https://myapp.com/sponsor/success?sponsorAdId=ad-123",
    cancelUrl: "https://myapp.com/sponsor?cancelled=true",
  }),
});

const { data } = await response.json();
window.location.href = data.checkoutUrl; // Redirect to payment
```

### 发布 `/api/sponsor-ads/user/{id}/cancel`

取消经过身份验证的用户拥有的赞助商广告。只能取消状态为 `pending_payment`、`pending` 或 `active` 的广告。

**请求**

```typescript
{
  cancelReason?: string;   // Optional reason for cancellation (max 500 chars)
}
```

**回应**

```typescript
{
  success: true;
  data: SponsorAd; // The cancelled sponsor ad
  message: "Sponsor ad cancelled successfully";
}
```

**示例**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/cancel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cancelReason: "No longer needed" }),
});
```

### 发布 `/api/sponsor-ads/user/{id}/renew`

创建结帐会话以续订有效或过期的赞助商广告。仅状态为 `active` 或 `expired` 的广告可以续订。

**请求**

```typescript
{
  successUrl?: string;     // Redirect URL after successful payment
  cancelUrl?: string;      // Redirect URL after cancelled payment
}
```

**回应**

```typescript
{
  success: true;
  data: {
    checkoutId: string;
    checkoutUrl: string;
    provider: string;
  }
  message: "Renewal checkout session created successfully";
}
```

**示例**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/renew", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    successUrl:
      "https://myapp.com/sponsor/success?sponsorAdId=ad-123&renewal=true",
  }),
});
const { data } = await response.json();
window.location.href = data.checkoutUrl;
```

## 认证

|端点|需要身份验证|
| ---------------------------------------- | ------------------------------------- |
|GET /api/赞助商广告|公共|
|GET /api/赞助商广告/用户|需要会话|
|POST /api/赞助商广告/用户|需要会话|
|获取/api/赞助商广告/用户/统计信息|需要会话|
|`GET /api/sponsor-ads/user/{id}`|需要会话（所有权已验证）|
|POST /api/赞助商广告/结帐|需要会话（所有权已验证）|
|`POST /api/sponsor-ads/user/{id}/cancel`|需要会话（所有权已验证）|
|`POST /api/sponsor-ads/user/{id}/renew`|需要会话（所有权已验证）|

所有特定于用户的端点都会验证所有权 - 尝试访问其他用户的赞助商广告会返回 `404`（对于 GET）或 `403`（对于操作）。

## 错误响应

|状态|描述|
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 400    |Invalid input, duplicate submission, non-cancellable/non-renewable status, missing price configuration, or malformed JSON|
| 401    |未经授权——没有经过身份验证的会话|
| 403    |禁止——用户不拥有赞助商广告|
| 404    |找不到赞助商广告|
| 500    |内部服务器错误——支付提供商故障或数据库错误|

## 速率限制

没有明确的速率限制。结账和续订端点中的重定向 URL 根据应用程序域进行验证，以防止开放重定向漏洞。有效的支付提供商由 `NEXT_PUBLIC_PAYMENT_PROVIDER` 环境变量（默认为 Stripe）确定。

## 相关端点

- [User Payment Endpoints](./user- payment-endpoints) -- 用户支付历史和订阅管理
