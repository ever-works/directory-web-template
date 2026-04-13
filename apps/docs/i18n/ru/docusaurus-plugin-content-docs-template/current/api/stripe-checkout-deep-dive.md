---
id: stripe-checkout-deep-dive
title: Stripe Checkout 深入探讨
sidebar_label: 条纹结账
sidebar_position: 1
---

# Stripe Checkout 深入探讨

此页面涵盖了完整的 Stripe 结账流程，包括会话创建、价格 ID 解析、货币处理、重定向 URL、成功/取消流程和元数据传播。

## 概述

Stripe 结账集成提供了一个服务器端 API，可为一次性付款和订阅创建 Stripe 结账会话。该流程对用户进行身份验证，解析或创建 Stripe 客户，构建具有可选试用支持的订单项，并返回托管结帐 URL。

## 路由表

|方法|路径|授权|描述|
|--------|------|------|-------------|
|`POST`|`/api/stripe/checkout`|需要会话|创建新的结帐会话|
|`GET`|`/api/stripe/checkout`|需要会话|检索现有的结帐会话|

## 创建结帐会话 (POST)

### 请求正文

```typescript
interface CreateCheckoutRequest {
  priceId: string;                          // Stripe price ID (e.g., "price_1234567890abcdef")
  mode?: 'one_time' | 'subscription';       // Defaults to "one_time"
  trialPeriodDays?: number;                 // Trial days (subscription mode only, default: 0)
  billingInterval?: 'month' | 'year';       // Billing interval (default: "month")
  trialAmountId?: string;                   // Price ID for trial setup fee
  isAuthorizedTrialAmount?: boolean;        // Whether trial amount is authorized
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: Record<string, string>;        // Custom metadata (planId, planName, etc.)
}
```

### 请求示例

```bash
curl -X POST /api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "mode": "subscription",
    "trialPeriodDays": 14,
    "billingInterval": "month",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": {
      "planId": "pro_plan",
      "planName": "Pro Plan"
    }
  }'
```

### 成功响应 (200)

```json
{
  "data": {
    "id": "cs_test_1234567890abcdef",
    "url": "https://checkout.stripe.com/pay/cs_test_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## 模式映射

API 将传入模式映射到 Stripe 预期的 `Mode` 类型：

```typescript
const stripeMode: 'payment' | 'setup' | 'subscription' =
  mode === 'one_time' ? 'payment'
    : mode === 'subscription' ? 'subscription'
    : 'setup';
```

- `one_time` 映射到 Stripe `payment` 模式
- `subscription` 映射到 Stripe `subscription` 模式
- 任何其他值映射到 `setup` 模式

## 客户解决方案

在创建结帐会话之前，API 会解析或创建 Stripe 客户：

```typescript
const stripeCustomerId = await stripeProvider.getCustomerId(session.user);
```

`getCustomerId` 方法遵循三步解析：

1. **元数据检查** -- 在用户元数据中查找 `stripe_customer_id`
2. **数据库查找** -- 查询 `PaymentAccount` 表中的现有记录
3. **创建新** -- 创建新的 Stripe 客户并与数据库同步

如果客户创建失败，端点将返回 `400` 错误。

## 试用配置

试验需要满足两个条件：

```typescript
const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;
```

When a trial is enabled, `trialAmountId` is required.这允许在试用期间收取安装费。 `buildCheckoutLineItems` 帮助程序构建包含订阅价格和可选试用金额的行项目。

如果 `hasTrial` 为 true 但 `trialAmountId` 缺失，则端点返回：

```json
{
  "error": "Invalid trial configuration",
  "message": "trialAmountId is required when trial is enabled"
}
```

## 特定于订阅的配置

当模式为`subscription`时，通过`applySubscriptionConfig`应用附加配置：

```typescript
if (stripeMode === 'subscription') {
  applySubscriptionConfig(checkoutParams, {
    userId: session.user.id || '',
    planId: metadata.planId,
    planName: metadata.planName,
    billingInterval,
    trialPeriodDays: hasTrial ? trialPeriodDays : 0
  });
}
```

这会将订阅元数据（包括 `userId`、`planId`、`planName` 和计费间隔）附加到结账会话的 `subscription_data`。

## 元数据传播

来自请求的元数据与会话用户数据合并：

```typescript
metadata: {
  ...metadata,
  ...session.user
}
```

这可确保用户身份信息（ID、电子邮件、姓名）始终附加到结帐会话，以便在 Webhook 处理程序中进行协调。

## 检索结帐会话 (GET)

### 查询参数

|参数|必填|描述|
|-----------|----------|-------------|
|`session_id`|是的|Stripe 结帐会话 ID|

### 请求示例

```bash
curl -X GET "/api/stripe/checkout?session_id=cs_test_1234567890abcdef" \
  -H "Cookie: session=..."
```

### 成功响应 (200)

```json
{
  "session": { "...full Stripe checkout session object..." },
  "status": "complete",
  "customer": "cus_1234567890abcdef",
  "subscription": "sub_1234567890abcdef"
}
```

使用扩展的 `line_items` 和 `subscription` 数据检索会话：

```typescript
const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## 多币种支持

货币处理通过 `stripe.config.ts` 配置。 `STRIPE_CONFIG` 对象将计划映射到特定于货币的价格 ID：

```typescript
export const STRIPE_CONFIG: Record<PlanName, PlanConfig> = {
  premium: {
    usd: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'USD', symbol: '$' },
    eur: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'EUR', symbol: '$' },
    // ... gbp, cad
  },
  standard: { /* ... */ },
  free: { productId: undefined }
};
```

使用 `getStripePriceConfig(plan, currency, interval)` 解析给定计划、货币和计费间隔的正确价格 ID。

## 动态定价

当 `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true` 时，`/api/stripe/products` 端点直接从 Stripe API 获取产品和价格，缓存 TTL 为 5 分钟。产品必须在 Stripe 仪表板中设置以下元数据键：

- `plan` -- 计划类型（`free`、`standard`、`premium`）
- `type` -- 产品类型 (`subscription`, `sponsor_ad`)
- `features` -- 特征字符串的 JSON 数组
- `annualDiscount` -- 年度折扣百分比

## 配置要求

|变量|必填|描述|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|是的|Stripe 秘密 API 密钥|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|是的|Stripe 可发布密钥|
|`STRIPE_WEBHOOK_SECRET`|是的|Webhook 签名秘密|
|`NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING`|否|启用动态定价|
|`NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD`|有条件的|每个计划/货币的价格 ID|

## 错误处理

|状态|错误|原因|
|--------|-------|-------|
| 400 |`Failed to create customer`|客户解析/创建失败|
| 400 |`Invalid trial configuration`|无需 `trialAmountId` 即可试用|
| 400 |`Session ID is required`|GET request missing `session_id` param|
| 401 |`Unauthorized`|没有经过身份验证的会话|
| 500 |`Failed to create checkout session`|Stripe API 错误或内部错误|

在开发模式下，错误响应包括带有堆栈跟踪的 `details` 字段。

## 安全考虑

- 所有结帐端点都需要通过 `auth()` 进行身份验证的会话
- Stripe 密钥永远不会暴露给客户端
- 元数据在服务器端合并；客户端无法欺骗用户身份
- 结帐会话的范围仅限于经过身份验证的用户的 Stripe 客户
- 错误消息通过 `safeErrorMessage` 进行清理，以防止生产中的信息泄露

## 相关页面

- [Stripe 订阅深度探究](./stripe-subscription-deep-dive.md)
- [Stripe Webhook 深度探究](./stripe-webhook-deep-dive.md)
- [Stripe 支付方式深入探究](./stripe- payment-methods-deep-dive.md)
- [支付提供商架构](./ payment-provider-architecture.md)
