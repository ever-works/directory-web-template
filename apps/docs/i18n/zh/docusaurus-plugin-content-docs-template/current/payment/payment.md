---
id: payment-overview
title: 支付集成概述
sidebar_label: 集成指南
sidebar_position: 1.5
---

# 支付集成概述

本指南提供了 Ever Works 支付系统的实践演练。它涵盖了提供者抽象层、如何配置每个提供者、结帐和订阅生命周期、功能门控和 Webhook 处理。

## 提供商架构概览

支付系统建立在**与提供商无关的抽象**之上。每个支付提供商都实现相同的0，并且工厂模式允许您在不更改应用程序代码的情况下切换提供商。

```
lib/payment/
  index.ts                          # Public API exports
  config/
    provider-configs.ts             # Provider configuration factory
    payment-provider-manager.ts     # Singleton manager + ConfigManager
    validation.ts                   # Input validation utilities
  guards/
    feature.guard.tsx               # Plan-based feature gating
  hooks/
    use-payment.tsx                 # React context + usePayment hook
  lib/
    payment-provider-factory.ts     # Factory for creating providers
    payment-service.ts              # Service wrapping the active provider
    payment-service-manager.ts      # Singleton for service lifecycle
    providers/
      stripe-provider.ts
      lemonsqueezy-provider.ts
      polar-provider.ts
      solidgate-provider.ts
    client/
      payment-account-client.ts     # Client-side account API
    utils/
      prices.ts                     # Price formatting utilities
      polar-subscription-helpers.ts
  services/
    payment-email.service.ts        # Email notifications on payment events
  types/
    payment-types.ts                # Core type definitions
    payment.ts                      # Payment flow and submission types
  ui/
    stripe/stripe-elements.tsx
    lemonsqueezy/lemonsqueezy-elements.tsx
    polar/polar-elements.tsx
    solidgate/solidgate-elements.tsx
```

### 支持的提供商

|供应商|一次性付款|订阅 |试验|网络钩子 |记录商人 |
|-------------|:-:|:-:|:-:|:-:|:-:|
|条纹|是的 |是的 |是的 |是的 |没有 |
|柠檬挤压 |是的 |是的 |是的 |是的 |是的 |
|极地 |是的 |是的 |是的 |是的 |没有 |
|固体门|是的 |是的 |没有 |是的 |没有 |

## 核心接口

### PaymentProvider接口

每个提供者都实现这个接口，定义在0中：

```typescript
// lib/payment/types/payment-types.ts
export interface PaymentProviderInterface {
  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Subscription management
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;

  // Webhooks
  handleWebhook(payload: any, signature: string, rawBody?: string,
                timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client-side configuration
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

### 关键数据类型

```typescript
// Subscription statuses
export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

// Payment types
export enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}

// Supported providers
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## 快速设置

### 第 1 步：设置环境变量

每个提供商都需要 API 密钥和 Webhook 机密。将它们添加到0：

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# LemonSqueezy
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_STORE_ID=...

# Polar
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...
POLAR_ORGANIZATION_ID=...

# Solidgate
SOLIDGATE_API_KEY=...
SOLIDGATE_SECRET_KEY=...
SOLIDGATE_WEBHOOK_SECRET=...
SOLIDGATE_MERCHANT_ID=...
NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY=...
```

### 第 2 步：配置定价计划

定价计划在您的 0 中定义：

```yaml
pricing:
  provider: stripe          # Default provider
  currency: USD
  plans:
    FREE:
      id: free
      name: Free
      description: Basic access
      price: 0
      features:
        - "List your product"
        - "Basic analytics"
    STANDARD:
      id: standard
      name: Standard
      description: Enhanced features
      price: 9
      stripePriceId: price_xxx
      annualDiscount: 20
      features:
        - "Everything in Free"
        - "Priority listing"
        - "Advanced analytics"
    PREMIUM:
      id: premium
      name: Premium
      description: Full access
      price: 29
      stripePriceId: price_yyy
      annualDiscount: 25
      isPremium: true
      features:
        - "Everything in Standard"
        - "Featured placement"
        - "API access"
```

### 第 3 步：设置 Webhooks

每个提供商都有一个专用的 Webhook 端点：

|供应商|网络钩子 URL |
|------------|--------------------------------|
|条纹| 0 |
|柠檬挤压 | 1 |
|极地 | 2 |
|固体门| 3 |

在每个提供商的仪表板中配置这些 URL，指向您部署的域。

## PaymentProviderFactory

工厂根据类型字符串创建提供程序实例：

```typescript
// lib/payment/lib/payment-provider-factory.ts
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

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

## PaymentService 和 ServiceManager

### 支付服务

0 包装活动提供者实例并公开统一的 API：

```typescript
// lib/payment/lib/payment-service.ts
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd = true
  ): Promise<SubscriptionInfo> {
    return this.provider.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
  }

  getClientConfig(): ClientConfig {
    return this.provider.getClientConfig();
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }
}
```

### PaymentServiceManager（单例）

管理器在运行时处理提供者切换并将用户的选择保留在0中：

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;
  private readonly STORAGE_KEY = 'everworks_template.payment_provider.selected';

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }

  async switchProvider(newProvider: SupportedProvider): Promise<void> {
    this.setStoredProvider(newProvider);
    this.currentService = new PaymentService({
      provider: newProvider,
      config: this.providerConfigs[newProvider],
    });
  }

  getAvailableProviders(): SupportedProvider[] {
    return Object.keys(this.providerConfigs) as SupportedProvider[];
  }
}
```

## 反应集成

### PaymentProvider 上下文

用 0 包裹您的申请表（或付款相关页面）：

```tsx
// Example: wrapping a layout
import { PaymentProvider } from '@/lib/payment';
import { createProviderConfigs } from '@/lib/payment/config/provider-configs';

const configs = createProviderConfigs(
  { apiKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, webhookSecret: '' },
  undefined,  // solidgate
  undefined,  // lemonsqueezy
  undefined   // polar
);

export default function PricingLayout({ children }) {
  return (
    <PaymentProvider providerConfigs={configs} defaultProvider="stripe">
      {children}
    </PaymentProvider>
  );
}
```

### usePayment Hook

组件通过0钩子访问支付服务：

```typescript
// lib/payment/hooks/use-payment.tsx
export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}

// Returns:
// {
//   service: PaymentService | null;
//   switchProvider: (provider: SupportedProvider) => Promise<void>;
//   currentProvider: SupportedProvider;
//   availableProviders: SupportedProvider[];
// }
```

**使用示例：**

```tsx
function CheckoutButton({ priceId }: { priceId: string }) {
  const { service, currentProvider } = usePayment();

  const handleCheckout = async () => {
    const intent = await service?.createPaymentIntent({
      amount: 2900,
      currency: 'usd',
      metadata: { priceId },
    });
    // Redirect to checkout or show payment form
  };

  return <button onClick={handleCheckout}>Pay with {currentProvider}</button>;
}
```

## 特征门控

0 组件根据用户的订阅计划限制 UI 元素：

```tsx
// lib/payment/guards/feature.guard.tsx
export type PlanType = "TRIAL" | "FREE" | "STANDARD" | "PREMIUM" | "EXPIRED" | "CANCELLED";

const PLAN_LEVEL: Record<PlanType, number> = {
  CANCELLED: 0,
  EXPIRED: 1,
  TRIAL: 2,
  FREE: 3,
  STANDARD: 4,
  PREMIUM: 5,
};
```

**用法：**

```tsx
import FeatureGuard from '@/lib/payment/guards/feature.guard';

<FeatureGuard
  user={currentUser}
  requiredPlan="STANDARD"
  fallback={<UpgradePrompt />}
  onAccessDenied={(userPlan, required, reason) => {
    console.log(`Access denied: ${reason}`);
  }}
>
  <PremiumFeature />
</FeatureGuard>
```

### 宽限期支持

过期的计划将获得 7 天的宽限期，并且访问权限会被降级：

```typescript
export const GRACE_PERIOD_CONFIG = {
  EXPIRED_GRACE_DAYS: 7,
  TRIAL_DURATION_DAYS: 14,
  EXPIRED_ACCESS_LEVEL: "FREE" as PlanType,
};

export const isInGracePeriod = (user: User): boolean => {
  if (!user.planExpiresAt) return false;
  const graceEnd = new Date(user.planExpiresAt);
  graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_CONFIG.EXPIRED_GRACE_DAYS);
  return new Date() <= graceEnd && user.plan === "EXPIRED";
};
```

## Webhook 事件类型

所有 Webhook 事件都被标准化为一个公共枚举：

```typescript
// lib/payment/types/payment-types.ts
export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
  REFUND_CREATED = 'refund_created',
  // ... and more
}
```

## 支付流程

该模板支持两种内容提交付款流程：

```typescript
// lib/payment/types/payment.ts
export enum PaymentFlow {
  PAY_AT_START = "pay_at_start",
  PAY_AT_END = "pay_at_end",
}

export enum SubmissionStatus {
  DRAFT = "draft",
  PENDING_PAYMENT = "pending_payment",
  PAID = "paid",
  PUBLISHED = "published",
  REJECTED = "rejected",
}
```

- **开始付款**：用户在提交内容被审核之前付款。
- **结束付费**：用户免费提交，审核通过后才付费。

## API Route Reference

### Stripe Routes

|路线 |方法|描述 |
|--------|--------|-------------|
| 0 |发布 |创建结账会话 |
| 1 | GET/POST | Manage subscriptions |
| 2 |发布 |创建计费门户会话 |
| 3 |发布 | Cancel a subscription |
| 4 |发布 |创建付款意向 |
| 5 |获取 |列出已保存的付款方式 |
| 6 |发布 | Add a payment method |
| 7 |发布 |删除付款方式 |
| 8 |发布 | Create a setup intent |
| 9 |发布 |处理 Stripe webhook |

### LemonSqueezy 路线

|路线 |方法|描述 |
|--------|--------|-------------|
| 10 |发布 |创建结帐会话 |
| 11 |发布 |取消订阅 |
| 12 |发布 |重新激活订阅 |
| 13 |发布 |更改订阅计划 |
| 14 |获取 |列出用户订阅 |
| 15 |发布 |处理网络钩子 |

### Polar Routes

|路线 |方法|描述 |
|--------|--------|-------------|
| 16 |发布 |创建结帐会话 |
| 17 |发布 | Create customer portal |
| 18 |发布 |取消订阅 |
| 19 |发布 |重新激活 |
| 20 |发布 |处理网络钩子 |

## 实用函数

21 文件包含有用的格式化助手：

```typescript
// Format cents to currency string
formatCentsToCurrency(2900, 'USD', 'en-US');
// => "$29.00"

// Convert cents to decimal
convertCentsToDecimal(2900);
// => 29.00

// Convert timestamp to Date
convertNumberToDate(1640995200);
// => Date: 2022-01-01T00:00:00.000Z
```

## 后续步骤

- [Stripe Configuration](./stripe) -- 完整的 Stripe 设置
- [LemonSqueezy 配置](./lemonsqueezy) -- LemonSqueezy 设置
- [极性配置](./极性) -- 极性设置
- [多币种集成](./multi-currency) -- 货币支持
- [支付架构](./ payment-architecture) -- 深入探讨架构
- [Webhooks](./webhooks) -- Webhook 处理细节
- [配置指南](./configuration) -- 所有环境变量和选项
