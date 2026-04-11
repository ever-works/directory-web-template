---
id: payment-architecture
title: 支付架构
sidebar_label: 建筑学
sidebar_position: 6
---

# 支付架构

Ever Works 模板实现了一个与提供商无关的支付系统，支持四个支付提供商：**Stripe**、**LemonSqueezy**、**Polar** 和 **Solidgate**。该架构使用带有单例提供程序实例的工厂模式，允许运行时提供程序切换。

## 源位置

```
lib/payment/lib/payment-provider-factory.ts     # Factory class
lib/payment/lib/payment-service.ts              # Service facade
lib/payment/lib/payment-service-manager.ts      # Singleton manager with provider switching
lib/payment/config/payment-provider-manager.ts  # Config validation & provider instantiation
lib/payment/types/payment-types.ts              # Shared interfaces and types
lib/payment/lib/providers/                      # Provider implementations
  stripe-provider.ts
  solidgate-provider.ts
  lemonsqueezy-provider.ts
  polar-provider.ts
```

## 系统图

```
+------------------+      +------------------------+
|  React Component | ---> |  PaymentServiceManager |
+------------------+      |  (singleton)           |
                          +------------------------+
                                    |
                          +------------------------+
                          |    PaymentService      |
                          |  (facade)              |
                          +------------------------+
                                    |
                          +------------------------+
                          | PaymentProviderFactory |
                          +------------------------+
                            /      |      |      \
                     Stripe  Solidgate  Lemon   Polar
                    Provider Provider  Squeezy Provider
                                      Provider
```

## 提供者接口

每个支付提供商都实施相同的0：

```ts
interface PaymentProviderInterface {
  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Customer management
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;

  // Subscription management
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;

  // Webhooks
  handleWebhook(
    payload: any, signature: string, rawBody?: string,
    timestamp?: string, webhookId?: string
  ): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client-side configuration
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

该接口确保切换提供者不需要对调用代码进行零更改。

## PaymentProviderFactory

工厂根据提供程序类型字符串创建提供程序实例：

```ts
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
        return new LemonSqueezyProvider(config);
      case 'polar':
        return new PolarProvider(config);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## PaymentService（外观）

0 将单个提供程序实例包装在干净的 API 后面。它将每次调用委托给底层提供者：

```ts
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider, config.config
    );
  }

  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }

  // ... all other interface methods delegated
}
```

### 计划定义

该服务还定义了付款计划常量：

```ts
enum PaymentPlanId {
  FREE = "1",
  ONE_TIME = "2",
  SUBSCRIPTION = "3",
  PREMIUM = "4",
}

interface PaymentPlan {
  id: PaymentPlanId;
  amount: number;
  isSubscription: boolean;
  features: string[];
}
```

## 支付服务管理器

管理器处理单例生命周期和运行时提供者切换。它将选定的提供者保留在 0 中：

```ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;
  private readonly STORAGE_KEY = 'everworks_template.payment_provider.selected';
  private readonly DEFAULT_PROVIDER: SupportedProvider;

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

  getPaymentService(): PaymentService {
    if (!this.currentService) {
      const provider = this.getStoredProvider();
      this.currentService = new PaymentService({
        provider,
        config: this.providerConfigs[provider],
      });
    }
    return this.currentService;
  }

  async switchProvider(newProvider: SupportedProvider): Promise<void> {
    if (this.getStoredProvider() !== newProvider) {
      this.setStoredProvider(newProvider);
      this.currentService = new PaymentService({
        provider: newProvider,
        config: this.providerConfigs[newProvider],
      });
    }
  }

  getCurrentProvider(): SupportedProvider { /* ... */ }
  getAvailableProviders(): SupportedProvider[] { /* ... */ }
}
```

### SSR 安全

当 0 不可用时，管理器通过默认配置的默认提供程序来处理服务器端渲染：

```ts
private getStoredProvider(): SupportedProvider {
  if (typeof window === 'undefined') return this.DEFAULT_PROVIDER;
  const stored = localStorage.getItem(this.STORAGE_KEY);
  return (stored as SupportedProvider) || this.DEFAULT_PROVIDER;
}
```

## PaymentProviderManager（配置层）

0 提供了另一种单例访问模式，具有每个提供者的延迟初始化和配置验证：

```ts
export class PaymentProviderManager {
  private static instances = new Map<string, any>();

  static getStripeProvider(): StripeProvider { /* ... */ }
  static getLemonsqueezyProvider(): LemonSqueezyProvider { /* ... */ }
  static getPolarProvider(): PolarProvider { /* ... */ }
  static getSolidgateProvider(): SolidgateProvider { /* ... */ }

  static reset(): void {
    this.instances.clear();
  }

  static isInitialized(providerName: string): boolean {
    return this.instances.has(providerName);
  }
}
```

### 便利功能

配置模块导出辅助函数以快速访问提供程序：

```ts
// Get or create (lazy init)
getOrCreateStripeProvider(): StripeProvider
getOrCreateLemonsqueezyProvider(): LemonSqueezyProvider
getOrCreatePolarProvider(): PolarProvider
getOrCreateSolidgateProvider(): SolidgateProvider

// Generic accessor
getOrCreateProvider(providerName: string): PaymentProviderInterface

// Reset all singletons
resetPaymentProviders(): void
```

## 配置管理器

内部0类加载并验证所有提供者的环境变量。每个提供程序的配置在首次访问时验证，而不是在启动时验证：

```ts
// Solidgate config shape
{
  apiKey: process.env.SOLIDGATE_API_KEY,
  secretKey: process.env.SOLIDGATE_SECRET_KEY,
  webhookSecret: process.env.SOLIDGATE_WEBHOOK_SECRET,
  options: {
    publishableKey: process.env.NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY,
    merchantId: process.env.SOLIDGATE_MERCHANT_ID,
    apiBaseUrl: process.env.SOLIDGATE_API_BASE_URL || 'https://api.solidgate.com/v1',
  }
}
```

每个提供者都会触发一次验证，并引发列出缺失变量的描述性错误。

## 共享类型

### 付款意图

```ts
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

```ts
interface SubscriptionInfo {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  trialEnd?: number | null;
  priceId: string;
}
```

### 客户端配置

```ts
interface ClientConfig {
  publicKey: string;
  paymentGateway: 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
  options?: Record<string, any>;
}
```

### UI组件

每个提供商都会返回一组用于呈现支付表单的 UI 组件：

```ts
interface UIComponents {
  PaymentForm: React.ComponentType<PaymentFormProps>;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

## 添加新的提供者

要添加第五个支付提供商，请按照以下步骤操作：

### 1.创建Provider类

```ts
// lib/payment/lib/providers/newprovider-provider.ts
export class NewProvider implements PaymentProviderInterface {
  constructor(config: PaymentProviderConfig) {
    // Initialize with API keys from config
  }

  // Implement all interface methods
  async createPaymentIntent(params) { /* ... */ }
  async createCustomer(params) { /* ... */ }
  // ... etc.
}
```

### 2.工厂注册

```ts
// lib/payment/lib/payment-provider-factory.ts
export type SupportedProvider =
  'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar' | 'newprovider';

static createProvider(providerType, config) {
  switch (providerType) {
    // ... existing cases
    case 'newprovider':
      return new NewProvider(config);
  }
}
```

### 3.添加配置

```ts
// lib/payment/config/payment-provider-manager.ts
// Add to ConfigManager:
private static newproviderApiKey = process.env.NEWPROVIDER_API_KEY || '';

// Add validation method
private static validateNewProviderConfig(): void { /* ... */ }

// Add to PaymentProviderManager
static getNewProvider(): NewProvider { /* ... */ }
```

### 4. 创建 Webhook 路由

```ts
// app/api/newprovider/webhook/route.ts
export async function POST(request: NextRequest) {
  // Verify signature, parse events, delegate to WebhookSubscriptionService
}
```

### 5.创建UI组件

```tsx
// lib/payment/ui/newprovider/newprovider-elements.tsx
export default function NewProviderElements(props: PaymentFormProps) {
  // Render the provider's payment form
}
```

## 实用函数

付款类型模块包括格式化助手：

```ts
// Convert cents to formatted currency string
formatCentsToCurrency(2999, 'USD', 'en-US')  // "$29.99"

// Convert between cents and decimals
convertCentsToDecimal(2999)     // 29.99
convertDecimalToCents(29.99)    // 2999

// Timestamp conversions
convertNumberToDate(1640995200)  // Date object
safeTimestampToDate(timestamp)   // Date | undefined (handles null/NaN)
```
