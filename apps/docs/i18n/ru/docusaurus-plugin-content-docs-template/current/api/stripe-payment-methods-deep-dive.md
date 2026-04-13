---
id: stripe-payment-methods-deep-dive
title: Stripe 支付方式深入探讨
sidebar_label: 条纹付款方式
sidebar_position: 3
---

# Stripe 支付方式深入探讨

此页面涵盖支付方式列表、保存卡的设置意图、默认方法管理和卡验证。

## 概述

支付方式系统提供了两个关键功能：列出用户保存的默认状态的支付方式，以及创建设置意图，允许用户保存新的支付方式以供将来使用，而无需立即收费。

## 路由表

|方法|路径|授权|描述|
|--------|------|------|-------------|
|`GET`|`/api/stripe/payment-methods/list`|需要会话|列出用户的所有付款方式|
|`POST`|`/api/stripe/setup-intent`|需要会话|创建用于保存新付款方式的设置意图|

## 列出付款方式 (GET)

### 它是如何运作的

列表端点执行以下步骤：

1. 通过`auth()` 对用户进行身份验证
2. 通过 `getUserStripeCustomerId()` 解析用户的 Stripe 客户 ID
3. 检索客户以确定默认付款方式
4. 列出所有 `card` 类型的付款方式（最多 100 种）
5. 对结果进行格式化和排序（首先默认，然后按创建日期）

### 关键实施

```typescript
// Retrieve customer for default payment method detection
const customer = await stripe.customers.retrieve(stripeCustomerId);
const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

// List all card-type payment methods
const paymentMethods = await stripe.paymentMethods.list({
  customer: stripeCustomerId,
  type: 'card',
  limit: 100
});

// Format with default status
const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
  id: pm.id,
  type: pm.type,
  card: pm.card ? {
    brand: pm.card.brand,
    last4: pm.card.last4,
    funding: pm.card.funding,
    country: pm.card.country
  } : null,
  billing_details: pm.billing_details,
  created: pm.created,
  metadata: pm.metadata,
  is_default: pm.id === defaultPaymentMethodId
}));

// Sort: default first, then by newest
formattedPaymentMethods.sort((a, b) => {
  if (a.is_default && !b.is_default) return -1;
  if (!a.is_default && b.is_default) return 1;
  return b.created - a.created;
});
```

### 成功响应 (200)

```typescript
interface PaymentMethodListResponse {
  success: boolean;
  data: PaymentMethodItem[];
  meta: {
    total: number;
    default_payment_method: string | null;
    customer_id: string;
  };
  message?: string;  // Present when no payment methods found
}

interface PaymentMethodItem {
  id: string;                    // "pm_1234567890abcdef"
  type: string;                  // "card"
  card: {
    brand: string;               // "visa", "mastercard", "amex", "discover"
    last4: string;               // "4242"
    funding: string;             // "credit", "debit", "prepaid", "unknown"
    country: string;             // "US"
  } | null;
  billing_details: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: {
      line1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
  };
  created: number;               // Unix timestamp
  metadata: Record<string, string>;
  is_default: boolean;
}
```

### 示例：具有付款方式的用户

```json
{
  "success": true,
  "data": [
    {
      "id": "pm_1234567890abcdef",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "funding": "credit",
        "country": "US"
      },
      "billing_details": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": null,
        "address": null
      },
      "created": 1640995200,
      "metadata": {},
      "is_default": true
    }
  ],
  "meta": {
    "total": 1,
    "default_payment_method": "pm_1234567890abcdef",
    "customer_id": "cus_1234567890abcdef"
  }
}
```

### 示例：无付款方式

```json
{
  "success": true,
  "data": [],
  "message": "No payment methods found"
}
```

## 创建设置意图 (POST)

设置意图允许用户保存付款方式以供将来使用，而无需立即收费。当用户想要在订阅之前添加卡或管理多种付款方式时，可以使用此方法。

### 它是如何运作的

```typescript
async createSetupIntent(user: User | null): Promise<SetupIntent> {
  const customerId = user?.user_metadata?.customerId;
  const setupIntent = await this.stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card']
  });

  return { ...setupIntent, clientSecret: setupIntent.client_secret! };
}
```

### 成功响应 (200)

```typescript
interface SetupIntentResponse {
  id: string;                    // "seti_1234567890abcdef"
  client_secret: string;         // "seti_1234567890abcdef_secret_xyz"
  status: string;                // "requires_payment_method"
  usage: string;                 // "off_session"
  customer: string;              // "cus_1234567890abcdef"
  created: number;               // Unix timestamp
}
```

### 前端使用

在客户端，`client_secret` 用于确认 Stripe.js 的设置意图：

```typescript
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});
```

## 默认付款方式管理

默认付款方式由 Stripe 客户的 `invoice_settings.default_payment_method` 确定。创建订阅时，付款方式会自动设置为默认：

```typescript
// During subscription creation
await this.stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId
  }
});
```

付款方式列表响应中的 `is_default` 标志允许前端显示默认卡徽章。

## 错误处理

|状态|错误|原因|
|--------|-------|-------|
| 401 |`Unauthorized`|没有经过身份验证的会话|
| 404 |`Customer not found`|Stripe 客户已删除|
| 400 |条纹错误|对 Stripe API 的请求无效|
| 500 |`Failed to list payment methods`|内部错误|
| 500 |`Failed to create setup intent`|设置意图创建失败|

检测并处理特定于条带的错误：

```typescript
if (error instanceof Stripe.errors.StripeError) {
  const msg = safeErrorMessage(error, 'Stripe request failed');
  return NextResponse.json({ success: false, error: msg }, { status: 400 });
}
```

## 安全考虑

- 所有端点都需要经过身份验证的会话
- 列表端点仅返回属于经过身份验证的用户的 Stripe 客户的支付方式
- 卡号绝不会被存储或返回——只有最后 4 位数字和品牌会被暴露
- 设置意图中的 `client_secret` 只能传递到 Stripe.js 前端 SDK
- 客户 ID 在服务器端解析，不能被客户端请求覆盖

## 配置要求

|变量|必填|描述|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|是的|Stripe 秘密 API 密钥|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|是的|用于前端 Stripe.js 初始化|

## 相关页面

- [Stripe Checkout 深入探究](./stripe-checkout-deep-dive.md)
- [Stripe 订阅深度探究](./stripe-subscription-deep-dive.md)
- [Stripe Webhook 深度探究](./stripe-webhook-deep-dive.md)
- [支付提供商架构](./ payment-provider-architecture.md)
