---
id: payment-provider-architecture
title: 支付提供商架构
sidebar_label: 提供商架构
sidebar_position: 8
---

# 支付提供商架构

本页介绍了支付提供商工厂和服务层的工作方式、如何交换提供商以及统一所有四种支付集成的与提供商无关的接口。

## 概述

该模板使用策略模式实现与提供商无关的支付架构。工厂创建提供程序实例，服务层公开统一的 API，每个提供程序实现公共接口。这种设计允许应用程序通过一组接口支持 Stripe、LemonSqueezy、Polar 和 Solidgate。

## 架构图

```
Application Code
      |
      v
PaymentService (unified API)
      |
      v
PaymentProviderFactory.createProvider()
      |
      +---> StripeProvider
      +---> LemonSqueezyProvider
      +---> PolarProvider
      +---> SolidgateProvider
```

## 支持的提供商

|提供者|类型 ID|特点|
|----------|---------|----------|
|条纹|`stripe`|完整结帐、订阅、付款方式、设置意图、退款|
|挤柠檬|`lemonsqueezy`|托管结帐、订阅、基于变体的定价|
|极地|`polar`|结帐、订阅、组织范围内的产品|
|固体门|`solidgate`|基于API的支付、嵌入式SDK、订阅、退款|

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## 提供者接口

所有提供商均实施`PaymentProviderInterface`：

```typescript
interface PaymentProviderInterface {
  // Customer management
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;

  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Subscription management
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;

  // Webhooks
  handleWebhook(payload: any, signature: string, rawBody?: string,
    timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client configuration
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

## 工厂

`PaymentProviderFactory` 基于字符串标识符创建提供程序实例：

```typescript
export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':
        return new StripeProvider(config);
      case 'solidgate':
        return new SolidgateProvider(config);
      case 'lemonsqueezy':
        return new LemonSqueezyProvider(config as unknown as LemonSqueezyConfig);
      case 'polar':
        return new PolarProvider(config as unknown as PolarConfig);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## 服务层

`PaymentService` 包装一个提供程序实例并公开统一的 API：

```typescript
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  // Delegates all calls to the underlying provider
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }

  // ... all other methods delegate to this.provider
}
```

### 使用示例

```typescript
const paymentService = new PaymentService({
  provider: 'stripe',
  config: {
    apiKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    options: {
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    }
  }
});

// Same API regardless of provider
const intent = await paymentService.createPaymentIntent({
  amount: 29.99,
  currency: 'usd',
  customerId: 'cus_123'
});
```

## 单例提供商管理

该模板对提供程序实例使用单例模式，通过 `@/lib/auth` 进行管理：

```typescript
import { getOrCreateStripeProvider } from '@/lib/auth';
import { getOrCreateLemonsqueezyProvider } from '@/lib/auth';
import { getOrCreatePolarProvider } from '@/lib/auth';
import { getOrCreateSolidgateProvider } from '@/lib/auth';
```

这些函数确保每个运行时仅存在一个提供程序实例，从而避免不必要的 API 客户端重新初始化。

## 键类型定义

### 支付提供商配置

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  secretKey?: string;
  webhookSecret?: string;
  options?: {
    publishableKey?: string;
    storeId?: string;
    organizationId?: string;
    merchantId?: string;
    apiBaseUrl?: string;
    testMode?: boolean;
    appUrl?: string;
  };
}
```

### 付款意向

```typescript
interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
  customerId?: string;
}
```

### 订阅信息

```typescript
interface SubscriptionInfo {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd: boolean;
  cancelAt?: number | null;
  trialEnd?: number | null;
  priceId: string;
  paymentIntentId?: string;
  checkoutData?: any;
}
```

### 订阅状态

```typescript
enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid'
}
```

### Webhook结果

```typescript
interface WebhookResult {
  received: boolean;
  type: string;
  id: string;
  data: any;
}
```

### Webhook事件类型

```typescript
enum WebhookEventType {
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  BILLING_PORTAL_SESSION_UPDATED = 'billing_portal_session_updated',
  REFUND_SUCCEEDED = 'refund_succeeded'
}
```

## 如何更换提供商

### 第1步：设置环境变量

每个提供程序都需要自己的一组环境变量。仅配置您选择的提供商的变量。

### 第 2 步：更新提供程序初始化

更改路由处理程序中使用的 `getOrCreate*Provider` 函数，或使用不同的提供程序字符串配置 `PaymentService`：

```typescript
// Before (Stripe)
const paymentService = new PaymentService({
  provider: 'stripe',
  config: { apiKey: process.env.STRIPE_SECRET_KEY!, ... }
});

// After (Polar)
const paymentService = new PaymentService({
  provider: 'polar',
  config: { apiKey: process.env.POLAR_ACCESS_TOKEN!, ... }
});
```

### 第 3 步：更新 Webhook 端点

每个提供商都有自己的 webhook 路由（`/api/stripe/webhook`、`/api/lemonsqueezy/webhook` 等）。确保仅注册活动提供商的 Webhook。

### 第 4 步：处理特定于提供商的功能

一些功能是特定于提供商的：
- **设置意图**：仅 Stripe 和 Solidgate（模拟）
- **嵌入式支付表单**：通过 React SDK 的 Stripe 和 Solidgate
- **基于变体的定价**：仅限 LemonSqueezy
- **组织范围内的产品**：仅限 Polar
- **直接退款 API**：仅限 Stripe 和 Solidgate

## 客户解决模式

所有四家提供商都遵循相同的三步客户解决模式：

```
1. Check user metadata (e.g., user.user_metadata.stripe_customer_id)
   |
   v (not found)
2. Query PaymentAccount database table
   |
   v (not found)
3. Create new customer via provider API
   -> Synchronize to PaymentAccount table
   -> Return new customer ID
```

此模式在每个提供程序的 `getCustomerId()` 方法中以相同的方式实现，从而确保无论哪个提供程序处于活动状态都具有一致的行为。

## Webhook 事件规范化

每个提供程序将其本机事件类型映射到公共`WebhookEventType` 枚举。这允许 `WebhookSubscriptionService` 一般处理事件：

|行动|条纹|挤柠檬|极地|固体门|
|--------|--------|-------------|-------|-----------|
|子已创建|`customer.subscription.created`|`subscription_created`|`subscription.created`|`subscription.created`|
|子取消|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|`subscription.cancelled`|
|支付成功|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|`payment.succeeded`|
|付款失败|`payment_intent.payment_failed`|不适用|`checkout.failed`|`payment.failed`|

## 用户界面组件

每个提供者通过`getUIComponents()`公开UI组件：

```typescript
interface UIComponents {
  PaymentForm: (props: PaymentFormProps) => React.ReactElement | null;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

这使得前端能够在不知道哪个提供商处于活动状态的情况下呈现正确的支付表单、徽标和卡品牌图标。

## 文件结构

```
lib/payment/
  lib/
    payment-service.ts            # PaymentService class
    payment-provider-factory.ts   # PaymentProviderFactory
    providers/
      stripe-provider.ts          # StripeProvider
      lemonsqueezy-provider.ts    # LemonSqueezyProvider
      polar-provider.ts           # PolarProvider
      solidgate-provider.ts       # SolidgateProvider
  types/
    payment-types.ts              # Shared interfaces and enums
  ui/
    stripe/                       # Stripe Elements wrapper
    solidgate/                    # Solidgate Elements wrapper
```

## 相关页面

- [Stripe Checkout 深入探究](./stripe-checkout-deep-dive.md)
- [Stripe 订阅深度探究](./stripe-subscription-deep-dive.md)
- [Stripe 支付方式深入探究](./stripe- payment-methods-deep-dive.md)
- [Stripe Webhook 深度探究](./stripe-webhook-deep-dive.md)
- [LemonSqueezy 深度潜水](./lemonsqueezy-deep-dive.md)
- [极地深潜](./polar-deep-dive.md)
- [Solidgate 深度潜水](./solidgate-deep-dive.md)
