---
id: lemonsqueezy-deep-dive
title: LemonSqueezy 深度探索
sidebar_label: 挤柠檬
sidebar_position: 5
---

# LemonSqueezy 深度探索

此页面涵盖了完整的 LemonSqueezy 集成，包括结帐创建、订阅管理、Webhook 处理和产品同步。

## 概述

LemonSqueezy 是一家记录商户支付提供商，负责处理税收、合规性和支付处理。该集成使用 LemonSqueezy 的托管结账流程、基于变体的产品模型和 Webhook 系统。与 Stripe 不同，LemonSqueezy 不支持设置意图或直接支付方式管理——所有支付处理都通过其托管 UI 进行。

## 路由表

|方法|路径|授权|描述|
|--------|------|------|-------------|
|`POST`|`/api/lemonsqueezy/checkout`|需要会话|从 JSON 正文创建结帐会话|
|`GET`|`/api/lemonsqueezy/checkout`|无|从查询参数创建结帐会话|
|`POST`|`/api/lemonsqueezy/webhook`|需要签名|处理传入的 Webhook 事件|

## 结帐创建 (POST)

### 请求正文

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // LemonSqueezy product variant ID
  dark?: boolean;                           // Enable dark mode checkout
  customPrice?: number;                     // Custom price in cents (optional)
  metadata?: Record<string, string>;        // Additional metadata
}
```

### 请求示例

```bash
curl -X POST /api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "variantId": "123456",
    "dark": true,
    "metadata": { "plan": "pro", "source": "website" }
  }'
```

### 它是如何运作的

1. 通过`auth()` 对用户进行身份验证
2. 使用 `validateCheckoutRequestBody()` 验证请求正文
3. 使用用户元数据调用`lemonsqueezyProvider.createCustomCheckout()`
4. 返回结帐 URL

### 提供商实施

`createCustomCheckout` 方法创建一个具有全面配置的 LemonSqueezy 结账：

```typescript
const { data, error } = await createCheckout(Number(this.storeId), Number(params.variantId), {
  customPrice: params.customPrice,
  productOptions: {
    redirectUrl: `${env.API_BASE_URL}/billing/success`,
    receiptButtonText: 'View Receipt',
    receiptLinkUrl: `${env.API_BASE_URL}/billing/receipt`,
    receiptThankYouNote: 'Thank you for your purchase!',
    enabledVariants: [Number(params.variantId)]
  },
  checkoutOptions: {
    embed: true,
    media: false,
    logo: false,
    dark: params.dark
  },
  checkoutData: {
    email: params.email,
    custom: params.metadata ?? {},
    variantQuantities: [{ variantId: Number(params.variantId), quantity: 1 }]
  },
  testMode: process.env.NODE_ENV === 'development',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
});
```

### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.lemonsqueezy.com/checkout/custom/abc123",
    "email": "user@example.com",
    "customPrice": 2999,
    "variantId": "123456",
    "metadata": {
      "userId": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "pro"
    }
  },
  "message": "Checkout session created successfully"
}
```

## 通过查询参数 (GET) 结帐

GET 端点支持通过查询参数为直接链接场景创建结帐：

|参数|必填|描述|
|-----------|----------|-------------|
|`variantId`|是的|LemonSqueezy 变体 ID|
|`email`|是的|客户邮箱|
|`customPrice`|否|定制价格（以美分为单位）|
|`metadata`|否|元数据的 JSON 字符串|

## 订阅管理

### 创建订阅

订阅是通过结账流程创建的。 `createSubscription` 方法包装了 LemonSqueezy 的结账 API：

```typescript
const { data, error } = await createCheckout(Number(this.storeId), finalProductId, {
  checkoutOptions: {
    embed: true,
    subscriptionPreview: true
  },
  checkoutData: {
    email: email || '',
    custom: metadata ?? {}
  }
});
```

### 取消订阅

```typescript
async cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
  const { data, error } = await cancelSubscription(Number(subscriptionId));
  return {
    id: subscriptionId,
    status: 'canceled' as SubscriptionStatus,
    // ...
  };
}
```

### 更新订阅

更新方法支持计划更改、暂停、恢复和重新激活：

```typescript
// Plan change via variant ID
if (params.priceId) {
  updatePayload.variantId = Number(params.priceId);
}

// Pause subscription
if (params.metadata?.pauseMode) {
  updatePayload.pause = {
    mode: params.metadata.pauseMode as 'void' | 'free',
    resumesAt: params.metadata.pauseUntil || null
  };
}

// Resume subscription
if (params.metadata?.resumeAction) {
  if (currentSubscription?.status === 'paused') {
    updatePayload.pause = null;
  } else if (currentSubscription?.status === 'cancelled') {
    updatePayload.cancelled = false;
  }
}
```

## Webhook 处理

### 签名验证

LemonSqueezy 使用 HMAC SHA-256 进行 Webhook 签名验证。提供商使用 Web Crypto API 验证签名：

```typescript
const cryptoKey = await crypto.subtle.importKey(
  'raw', encoder.encode(this.webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

if (calculatedSignature !== signature) {
  return { received: false, type: 'verification_failed', ... };
}
```

### 事件映射

|挤柠檬活动|内部型|
|-------------------|---------------|
|`subscription_created`|`SUBSCRIPTION_CREATED`|
|`subscription_updated`|`SUBSCRIPTION_UPDATED`|
|`subscription_cancelled`|`SUBSCRIPTION_CANCELLED`|
|`subscription_payment_success`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|
|`subscription_payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|
|`subscription_trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|
|`order_created`|`PAYMENT_SUCCEEDED`|
|`order_refunded`|`REFUND_SUCCEEDED`|

### Webhook 处理程序结构

每个处理程序都遵循一致的模式：

```typescript
async function handleSubscriptionCreated(data: any) {
  if (isSponsorAdSubscription(data)) {
    await handleSponsorAdActivation(data);
    return;
  }
  try {
    const result = await webhookSubscriptionService.handleSubscriptionCreated(data);
    // ... log result
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

### 赞助商广告检测

LemonSqueezy 使用 `custom_data` 代替 Stripe 的 `metadata`：

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const customData = data.custom_data as Record<string, string> | undefined;
  const meta = data.meta as Record<string, unknown> | undefined;
  const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
  return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## 客户管理

该提供商遵循与其他提供商相同的三步客户解决模式：

1. 检查 `lemonsqueezy_customer_id` 的用户元数据
2. 查询`PaymentAccount`数据库表
3. 通过 LemonSqueezy API 创建新客户

```typescript
const { data, error } = await createCustomer(Number(this.storeId), {
  email: params.email,
  name: params.name || '',
  city: params.metadata?.city || '',
  region: params.metadata?.region || '',
  country: params.metadata?.country || ''
});
```

## 错误处理

|状态|错误代码|原因|
|--------|-----------|-------|
| 400 |`VALIDATION_ERROR`|请求正文或参数无效|
| 401 |`Unauthorized`|没有经过身份验证的会话|
| 500 |`CONFIGURATION_ERROR`|缺少环境变量|
| 500 |`INTERNAL_ERROR`|未处理的错误|
| 503 |`PAYMENT_SERVICE_ERROR`|LemonSqueezy API 不可用|

## 配置要求

|变量|必填|描述|
|----------|----------|-------------|
|`LEMONSQUEEZY_API_KEY`|是的|LemonSqueezy API 密钥|
|`LEMONSQUEEZY_WEBHOOK_SECRET`|是的|Webhook 签名秘密|
|`LEMONSQUEEZY_STORE_ID`|是的|数字商店 ID|

## 局限性

- **无设置意图**：LemonSqueezy 不支持在未购买的情况下保存卡片。 `createSetupIntent` 方法抛出错误。
- **无直接退款 API**：退款必须通过 LemonSqueezy 仪表板处理。
- **基于变体的定价**：产品使用变体 ID 而不是价格 ID。计划变更使用`variantId`。

## 安全考虑

- Webhook 签名使用 HMAC SHA-256 进行验证
- 原始正文文本用于签名验证，以防止 JSON 重新序列化问题
- API 密钥永远不会暴露给客户端
- 开发模式日志记录可净化 PII（电子邮件地址已部分编辑）

## 相关页面

- [Stripe Checkout 深入探究](./stripe-checkout-deep-dive.md)
- [极地深潜](./polar-deep-dive.md)
- [Solidgate 深度潜水](./solidgate-deep-dive.md)
- [支付提供商架构](./ payment-provider-architecture.md)
