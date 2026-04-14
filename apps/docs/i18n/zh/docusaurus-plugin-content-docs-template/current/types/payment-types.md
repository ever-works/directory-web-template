---
id: payment-types
title: 付款类型定义
sidebar_label: 付款方式
sidebar_position: 11
---

# 付款类型定义

**来源：** `lib/payment/types/payment-types.ts`、`lib/constants/payment.ts`

支付类型为多提供商计费系统提供支持。它们定义了如何在 Stripe、LemonSqueezy、Polar 和 Solidgate 上创建、验证和管理付款。

## 枚举

### `PaymentPlan`

可用的订阅级别。

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

经常性费用的计费周期选项。

```typescript
enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### `PaymentType`

将付款分类为一次性付款、定期付款或免费付款。

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

跟踪单次付款尝试的生命周期。

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

支持的支付工具。

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

平台接受的货币。

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

所有支付提供商标识符的联合类型。

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## 接口

### `PaymentIntent`

代表待处理或已完成的付款。

```typescript
interface PaymentIntent {
  id: string;
  amount: number;         // Amount in smallest currency unit (cents)
  currency: string;
  status: string;
  clientSecret?: string;  // For client-side confirmation
  customerId?: string;
}
```

|领域|描述|
|-------|-------------|
|`id`|提供商分配的付款标识符|
|`amount`|金额以美分为单位（例如，1000 = $10.00）|
|`currency`|ISO 4217 货币代码|
|`clientSecret`|Token传递给前端SDK进行确认|

### `CheckoutParams`

用于启动结帐会话的参数。

```typescript
interface CheckoutParams {
  priceId?: string;
  variantId?: number;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  email?: string;
  customPrice?: number;
  metadata?: Record<string, any>;
  dark?: boolean;
}
```

### `BillingDetails`

付款附带的客户账单信息。

```typescript
interface BillingDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}
```

### `PaymentProviderConfig`

初始化提供程序所需的凭据。

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

`getClientConfig()` 返回的前端安全配置。

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## 使用示例

```typescript
import { PaymentPlan, PaymentType } from '@/lib/constants/payment';
import type { CheckoutParams } from '@/lib/payment/types/payment-types';

const params: CheckoutParams = {
  priceId: 'price_abc123',
  successUrl: '/checkout/success',
  cancelUrl: '/pricing',
  metadata: { plan: PaymentPlan.PREMIUM },
};
```

## 相关类型

- [订阅类型](./subscription-types.md) -- 订阅生命周期和状态
- [配置/付款](../configuration/ payment-config.md) -- 提供商设置和定价层
- [配置类型](./config-types.md) -- `PaymentConfig` 模式
