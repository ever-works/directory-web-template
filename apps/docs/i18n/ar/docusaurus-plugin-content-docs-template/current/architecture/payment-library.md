---
id: payment-library
title: "مكتبة الدفع"
sidebar_label: "مكتبة الدفع"
sidebar_position: 17
---

# مكتبة الدفع

يطبق القالب نظام دفع متعدد الموفرين باستخدام أنماط المصنع والإستراتيجية. وهو يدعم Stripe وLemonSqueezy وSolidgate وPolar كمقدمي خدمات الدفع، مع واجهة موحدة للمدفوعات والاشتراكات وخطافات الويب واسترداد الأموال.

## نظرة عامة على الهندسة المعمارية

```mermaid
graph TD
    A[Application Code] --> B[PaymentService]
    B --> C[PaymentProviderFactory]
    C --> D{Provider Type}
    D -->|stripe| E[StripeProvider]
    D -->|lemonsqueezy| F[LemonSqueezyProvider]
    D -->|solidgate| G[SolidgateProvider]
    D -->|polar| H[PolarProvider]
    B --> I[PaymentServiceManager]
    I --> B
    E --> J[PaymentProviderInterface]
    F --> J
    G --> J
    H --> J
```

## ملفات المصدر

|ملف|الغرض|
|------|---------|
|`lib/payment/index.ts`|صادرات API العامة|
|`lib/payment/lib/payment-provider-factory.ts`|مصنع لإنشاء مثيلات الموفر|
|`lib/payment/lib/payment-service.ts`|واجهة خدمية موحدة|
|`lib/payment/lib/payment-service-manager.ts`|مدير Singleton لدورة حياة الخدمة|
|`lib/payment/types/payment-types.ts`|الواجهات الأساسية والتعدادات|
|`lib/payment/types/payment.ts`|تدفق الدفع وأنواع التقديم|
|`lib/payment/config/`|تكوين الموفر والتحقق من صحته|
|`lib/payment/lib/providers/`|تطبيقات الموفر الفردي|
|`lib/payment/hooks/`|خطافات رد الفعل لتدفقات الدفع من جانب العميل|
|`lib/payment/ui/`|مكونات نموذج الدفع|

## واجهات أساسية

### واجهة مزود الدفع

يقوم كل مزود بتنفيذ هذه الواجهة الشاملة:

```typescript
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

  // Webhooks and refunds
  handleWebhook(payload: any, signature: string, ...args: any[]): Promise<WebhookResult>;
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client configuration and UI
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

### PaymentProviderFactory

إنشاء مثيلات الموفر بناءً على التكوين:

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':       return new StripeProvider(config);
      case 'solidgate':    return new SolidgateProvider(config);
      case 'lemonsqueezy': return new LemonSqueezyProvider(config);
      case 'polar':        return new PolarProvider(config);
      default:             throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## خدمة الدفع

توفر فئة `PaymentService` واجهة موحدة لجميع عمليات الموفر:

```typescript
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(config.provider, config.config);
  }

  // All methods delegate to the underlying provider
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  // ... additional delegated methods
}
```

## أنواع البيانات

### تعدادات الدفع

```typescript
export enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}

export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

export enum PaymentFlow {
  PAY_AT_START = "pay_at_start",
  PAY_AT_END = "pay_at_end",
}
```

### أحداث الويب هوك

```typescript
export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  INVOICE_PAID = 'invoice_paid',
  REFUND_CREATED = 'refund_created',
  // ... additional event types
}
```

### هياكل البيانات الرئيسية

|اكتب|الغرض|
|------|---------|
|`PaymentIntent`|جلسة الدفع بالمعرف والمبلغ والعملة والحالة وclientSecret|
|`SubscriptionInfo`|تفاصيل الاشتراك مع الحالة ونهاية الفترة ومعلومات النسخة التجريبية|
|`CustomerResult`|تم إنشاء العميل بالمعرف والبريد الإلكتروني والاسم|
|`WebhookResult`|تمت معالجة خطاف الويب بالنوع والمعرف والبيانات|
|`ClientConfig`|تكوين آمن للواجهة الأمامية مع المفتاح العام ونوع البوابة|
|`UIComponents`|مكونات التفاعل والأصول المرئية للموفر|

## مرافق العملة

تتضمن المكتبة وظائف مساعدة لتنسيق العملة:

```typescript
// Format cents to display currency
export function formatCentsToCurrency(
  cents: number, currency: string = 'USD', locale: string = 'en-US'
): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

// Convert between cents and decimal
export function convertCentsToDecimal(cents: number): number;
export function convertDecimalToCents(decimal: number): number;

// Convert timestamps to Date objects
export function convertNumberToDate(timestamp?: number): Date | null;
export function safeTimestampToDate(timestamp: number | null | undefined): Date | undefined;
```

## أنواع تدفق الدفع

يدعم النظام تدفقين لدفع التقديم:

|التدفق|التعداد|الوصف|
|------|------|-------------|
|الدفع عند البداية|`PAY_AT_START`|الدفع مطلوب قبل مراجعة التقديم|
|الدفع في النهاية|`PAY_AT_END`|يتم تحصيل الدفع بعد موافقة المشرف|

### دورة حياة حالة التقديم

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_PAYMENT: Submit (pay at start)
    DRAFT --> PUBLISHED: Submit (free)
    PENDING_PAYMENT --> PAID: Payment confirmed
    PAID --> PUBLISHED: Admin approves
    PAID --> REJECTED: Admin rejects
    DRAFT --> PUBLISHED: Admin approves (pay at end)
    DRAFT --> REJECTED: Admin rejects (pay at end)
```

## واجهة مكونات واجهة المستخدم

يعرض كل مزود مكونات واجهة المستخدم لتكامل الواجهة الأمامية:

```typescript
export interface UIComponents {
  PaymentForm: React.ComponentType<PaymentFormProps>;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

## التكامل من جانب العميل

يوفر الخطاف `usePayment` وسياق `PaymentProvider` تكامل React:

```typescript
import { usePayment, PaymentProvider } from '@/lib/payment';

// Wrap your app with the payment provider
<PaymentProvider>
  <PaymentForm
    amount={2999}
    currency="usd"
    isSubscription={false}
    onSuccess={(paymentId) => console.log('Paid:', paymentId)}
    onError={(error) => console.error('Failed:', error)}
  />
</PaymentProvider>
```

## تكوين الموفر

```typescript
export interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

يتطلب كل مزود كحد أدنى `apiKey`. يستخدم Stripe وSolidgate أيضًا `webhookSecret` للتحقق من توقيع webhook.
