---
id: stripe-subscription-deep-dive
title: Stripe 订阅深入探究
sidebar_label: 条纹订阅
sidebar_position: 2
---

# Stripe 订阅深入探究

本页面涵盖了所有订阅管理路径：创建、更新、取消以及带有请求/响应示例的底层提供程序方法。

## 概述

订阅 API 为 Stripe 订阅提供完整的生命周期管理。它支持使用付款方式和试用期创建订阅、更新计划或取消设置，以及立即或在计费周期结束时取消订阅。

## 路由表

|方法|路径|授权|描述|
|--------|------|------|-------------|
|`POST`|`/api/stripe/subscription`|需要会话|创建新订阅|
|`PUT`|`/api/stripe/subscription`|需要会话|更新现有订阅|
|`DELETE`|`/api/stripe/subscription`|需要会话|取消订阅|

## 创建订阅 (POST)

### 请求正文

```typescript
interface CreateSubscriptionRequest {
  priceId: string;            // Stripe price ID
  paymentMethodId: string;    // Stripe payment method ID
  trialPeriodDays?: number;   // Optional trial period in days
}
```

### 请求示例

```bash
curl -X POST /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "paymentMethodId": "pm_1234567890abcdef",
    "trialPeriodDays": 14
  }'
```

### 它是如何运作的

路由处理程序执行以下步骤：

1. 通过`auth()` 对用户进行身份验证
2. 通过 `stripeProvider.getCustomerId()` 解析或创建 Stripe 客户
3. 致电 `stripeProvider.createSubscription()`，并提供客户 ID、价格、付款方式、试用天数和元数据

### 提供商实施

`StripeProvider.createSubscription()` 内部：

```typescript
// Attach payment method to customer
if (paymentMethodId) {
  await this.stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });
  // Set as default payment method
  await this.stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

// Create the subscription
const subscriptionParams: Stripe.SubscriptionCreateParams = {
  customer: customerId,
  items: [{ price: priceId }],
  default_payment_method: paymentMethodId,
  expand: ['latest_invoice'],
  metadata,
  collection_method: 'charge_automatically'
};

// Without trial: charge immediately
if (trialPeriodDays === 0) {
  subscriptionParams.off_session = true;
  subscriptionParams.payment_settings = {
    save_default_payment_method: 'on_subscription'
  };
} else {
  subscriptionParams.trial_period_days = trialPeriodDays;
}
```

### 成功响应 (200)

```typescript
interface SubscriptionInfo {
  id: string;                    // "sub_1234567890abcdef"
  customerId: string;            // "cus_1234567890abcdef"
  status: SubscriptionStatus;    // "active" | "trialing" | etc.
  currentPeriodEnd?: number;     // Unix timestamp
  cancelAtPeriodEnd: boolean;    // false
  cancelAt: number | null;       // null
  trialEnd: number | null;       // Unix timestamp or null
  priceId: string;               // "price_1234567890abcdef"
  paymentIntentId?: string;      // "pi_..." if available
}
```

## 更新订阅 (PUT)

### 请求正文

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;          // Required: subscription to update
  priceId?: string;                // New price ID (plan change)
  cancelAtPeriodEnd?: boolean;     // Schedule cancellation
}
```

### 请求示例

```bash
curl -X PUT /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "priceId": "price_0987654321fedcba",
    "cancelAtPeriodEnd": false
  }'
```

### 提供商实施

`updateSubscription` 方法通过替换订阅项来处理计划更改：

```typescript
if (priceId) {
  const existingSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
  if (existingSubscription.items.data[0]) {
    updateParams.items = [{
      id: existingSubscription.items.data[0].id,
      price: priceId
    }];
  }
}
```

它还支持设置`cancel_at_period_end`、`cancel_at`和更新元数据。

### 成功响应 (200)

返回具有更新值的相同 `SubscriptionInfo` 形状。

## 取消订阅（DELETE）

### 请求正文

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;           // Required: subscription to cancel
  cancelAtPeriodEnd?: boolean;      // true = cancel at period end, false = immediately
}
```

### 请求示例

```bash
curl -X DELETE /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "cancelAtPeriodEnd": true
  }'
```

### 提供商实施

取消逻辑支持两种策略：

```typescript
if (cancelAtPeriodEnd) {
  // Soft cancel: subscription remains active until period ends
  subscription = await this.stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
} else {
  // Hard cancel: subscription ends immediately
  subscription = await this.stripe.subscriptions.cancel(subscriptionId);
}
```

### 成功响应 (200)

```json
{
  "id": "sub_1234567890abcdef",
  "customerId": "cus_1234567890abcdef",
  "status": "active",
  "cancelAtPeriodEnd": true,
  "cancelAt": null,
  "currentPeriodEnd": 1643673600,
  "trialEnd": null,
  "priceId": "price_1234567890abcdef"
}
```

## 订阅状态映射

提供程序将 Stripe 状态映射到内部 `SubscriptionStatus` 枚举：

|条带状态|内部状态|
|---------------|-----------------|
|`incomplete`|`INCOMPLETE`|
|`incomplete_expired`|`INCOMPLETE_EXPIRED`|
|`trialing`|`TRIALING`|
|`active`|`ACTIVE`|
|`past_due`|`PAST_DUE`|
|`canceled`|`CANCELED`|
|`unpaid`|`UNPAID`|

## 元数据追踪

所有订阅操作都将 `userId` 从会话附加到订阅元数据：

```typescript
metadata: {
  userId: session.user.id
}
```

这允许 Webhook 处理程序将订阅与内部用户记录进行协调。

## 错误处理

|状态|错误|原因|
|--------|-------|-------|
| 400 |`Failed to create customer`|客户解决失败|
| 401 |`Unauthorized`|没有经过身份验证的会话|
| 500 |`Failed to create subscription`|创建期间 Stripe API 错误|
| 500 |`Failed to update subscription`|更新期间 Stripe API 错误|
| 500 |`Failed to cancel subscription`|取消期间 Stripe API 错误|

## 安全考虑

- 所有订阅端点都需要身份验证
- 付款方式附件和默认设置在服务器端执行
- `off_session` 标志仅针对非试用订阅设置，以启用自动收费
- 订阅元数据始终包含经过身份验证的用户 ID 以供审核
- 在开发模式下，仅使用非敏感字段记录订阅更新

## 相关页面

- [Stripe Checkout 深入探究](./stripe-checkout-deep-dive.md)
- [Stripe Webhook 深度探究](./stripe-webhook-deep-dive.md)
- [Stripe 支付方式深入探究](./stripe- payment-methods-deep-dive.md)
- [支付提供商架构](./ payment-provider-architecture.md)
