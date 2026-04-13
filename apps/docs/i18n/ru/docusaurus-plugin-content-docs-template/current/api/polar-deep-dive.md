---
id: polar-deep-dive
title: 极地深潜
sidebar_label: 极地
sidebar_position: 6
---

# 极地深潜

此页面涵盖完整的 Polar 集成，包括结帐创建、订阅管理、客户门户和 Webhook 处理。

## 概述

Polar 是专为软件和数字产品设计的现代支付平台。该集成支持通过 Polar 结账系统进行一次性支付和订阅，并具有 webhook 驱动的生命周期管理。 Polar 使用组织范围的产品和 `@polar-sh/sdk` 进行 API 交互。

## 路由表

|方法|路径|授权|描述|
|--------|------|------|-------------|
|`POST`|`/api/polar/checkout`|需要会话|创建结帐会话（订阅或一次性）|
|`GET`|`/api/polar/checkout`|需要会话|检索结帐会话状态|
|`POST`|`/api/polar/webhook`|需要签名|处理传入的 Webhook 事件|

## 结帐创建 (POST)

### 请求正文

```typescript
interface PolarCheckoutRequest {
  productId: string;                        // Polar product ID
  mode?: 'one_time' | 'subscription';       // Defaults to "subscription"
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: {
    planId?: string;
    planName?: string;
    billingInterval?: string;
    [key: string]: any;
  };
}
```

### 请求示例

```bash
curl -X POST /api/polar/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "productId": "prod_1234567890abcdef",
    "mode": "subscription",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### 它是如何运作的

结帐路由处理两个流程：

**订阅模式：**
1. 对用户进行身份验证并解析 Polar 客户
2. 清理元数据（删除`undefined`值——Polar拒绝它们）
3. 调用 `polarProvider.createSubscription()` 创建结帐会话
4. 返回订阅结果的结帐 URL

**一次性付款方式：**
1. 对用户进行身份验证并解析 Polar 客户
2. 直接使用Polar SDK创建结账
3. 返回结帐 URL

### 元数据清理

Polar 要求所有元数据值均非空且非未定义：

```typescript
const sanitizedMetadata: Record<string, any> = {
  userId: session.user.id || ''
};
if (metadata.planId) sanitizedMetadata.planId = metadata.planId;
if (metadata.planName) sanitizedMetadata.planName = metadata.planName;
// Only include defined values
Object.entries(metadata).forEach(([key, value]) => {
  if (value !== undefined && value !== null) {
    sanitizedMetadata[key] = value;
  }
});
```

### 成功响应 (200)

```json
{
  "data": {
    "id": "checkout_1234567890abcdef",
    "url": "https://polar.sh/checkout/checkout_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## 检索结帐会话 (GET)

### 查询参数

|参数|必填|描述|
|-----------|----------|-------------|
|`checkout_id`|是的|Polar 结账会话 ID|

### 成功响应 (200)

```json
{
  "checkout": { "...full Polar checkout object..." },
  "status": "complete",
  "customer": "customer_1234567890abcdef",
  "subscription": "subscription_1234567890abcdef"
}
```

## 订阅管理

### 创建订阅

`PolarProvider.createSubscription()` 方法为订阅创建结账：

```typescript
const checkout = await this.polar.checkouts.create({
  products: [priceId],
  organizationId: this.organizationId,
  customerId: customerId,
  successUrl: metadata?.successUrl,
  metadata: sanitizedMetadata
});
```

### 取消订阅

Polar 支持两种取消策略：

```typescript
// Cancel at period end (soft cancel)
await cancelSubscriptionAtPeriodEnd({ polar, subscriptionId });

// Cancel immediately (hard cancel)
await cancelSubscriptionImmediately({ polar, subscriptionId });
```

提供者在取消之前验证订阅状态：

```typescript
const validateResult = validateSubscriptionId(subscriptionId);
if (!validateResult.isValid) {
  throw new PolarFatalError(validateResult.error);
}
```

### 重新激活订阅

可以重新激活计划取消的订阅：

```typescript
if (isScheduledForCancellation(subscription)) {
  const result = await reactivatePolarSubscription({
    polar, subscriptionId, subscription
  });
}
```

### 更新订阅

计划变更通过`polar.subscriptions.update()`处理：

```typescript
const updated = await this.polar.subscriptions.update({
  id: subscriptionId,
  productId: newProductId
});
```

## Webhook 处理

### 签名验证

Polar 使用 `@polar-sh/sdk/webhooks` `validateEvent` 函数进行验证。 Webhook 需要三个标头：

|标头|描述|
|--------|-------------|
|`webhook-signature`|HMAC SHA256签名（格式：`v1,<hex_signature>`）|
|`webhook-timestamp`|事件的 Unix 时间戳|
|`webhook-id`|唯一的 Webhook 交付 ID|

```typescript
const webhookResult = await polarProvider.handleWebhook(
  body,           // Parsed JSON
  signatureHeader, // Full "v1,..." signature
  bodyText,        // Raw body for verification
  timestampHeader,
  webhookIdHeader
);
```

### 事件类型

|极地事件|内部映射|
|-------------|-----------------|
|`checkout.succeeded`|付款成功|
|`checkout.failed`|付款失败|
|`subscription.created`|订阅已创建|
|`subscription.updated`|订阅已更新|
|`subscription.canceled`|订阅已取消|
|`invoice.paid`|订阅付款成功|
|`invoice.payment_failed`|订阅付款失败|

### Webhook 路由器

事件通过专用路由器模块调度：

```typescript
await routeWebhookEvent(webhookResult.type, webhookResult.data);
```

路由器将事件类型映射到处理程序函数，这些函数通过 `WebhookSubscriptionService` 更新数据库并发送电子邮件通知。

### 有效负载验证

Webhook 端点在处理之前验证有效负载结构：

```typescript
if (!validateWebhookPayload(body)) {
  return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
}
```

## 客户管理

提供商遵循标准的三步解决模式：

1. 检查 Polar 客户 ID 的用户元数据
2. 查询`PaymentAccount`数据库表
3. 通过 Polar SDK 创建新客户

```typescript
const customer = await this.polar.customers.create({
  organizationId: this.organizationId,
  email: params.email,
  name: params.name,
  metadata: params.metadata
});
```

## 错误处理

|状态|错误|原因|
|--------|-------|-------|
| 400 |`Product ID is required`|请求中缺少`productId`|
| 400 |`Checkout ID is required`|GET 请求缺失`checkout_id`|
| 400 |`No signature provided`|Webhook 缺少签名标头|
| 401 |`Unauthorized`|没有经过身份验证的会话|
| 500 |`Failed to create checkout`|结账网址不可用|
| 500 |`Configuration error`|Polar 提供商未配置|
| 503 |付款设置不完整|组织尚未在 Polar 中完成付款设置|

结账端点包括对支付设置错误的特殊检测：

```typescript
if (error.message.includes('Payments are currently unavailable') ||
    error.message.includes('needs to complete their payment setup')) {
  statusCode = 503;
  fallbackMessage = 'Polar payment setup incomplete...';
}
```

## 配置要求

|变量|必填|描述|
|----------|----------|-------------|
|`POLAR_ACCESS_TOKEN`|是的|Polar API 访问令牌|
|`POLAR_WEBHOOK_SECRET`|是的|Webhook 签名秘密|
|`POLAR_ORGANIZATION_ID`|是的|Polar 组织 ID|

## 安全考虑

- Webhook 签名使用官方 SDK 中的 `validateEvent` 函数进行验证
- 保留原始正文文本用于签名验证（JSON 重新序列化可能会更改正文）
- 检查三个单独的标头：签名、时间戳和 Webhook ID
- 元数据在服务器端进行清理，以防止注入未定义的值
- 错误响应使用`safeErrorResponse`防止信息泄露

## 相关页面

- [LemonSqueezy 深度潜水](./lemonsqueezy-deep-dive.md)
- [Solidgate 深度潜水](./solidgate-deep-dive.md)
- [Stripe Checkout 深入探究](./stripe-checkout-deep-dive.md)
- [支付提供商架构](./ payment-provider-architecture.md)
