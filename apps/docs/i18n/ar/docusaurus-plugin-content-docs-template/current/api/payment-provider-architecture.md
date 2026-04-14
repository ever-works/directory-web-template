---
id: payment-provider-architecture
title: بنية مزود الدفع
sidebar_label: بنية المزود
sidebar_position: 8
---

# بنية مزود الدفع

تشرح هذه الصفحة كيفية عمل مصنع موفر الدفع وطبقة الخدمة، وكيفية مبادلة الموفرين، والواجهات المستقلة عن الموفر التي توحد جميع عمليات تكامل الدفع الأربعة.

## نظرة عامة

يطبق القالب بنية دفع محايدة للمزود باستخدام نمط الإستراتيجية. يقوم المصنع بإنشاء مثيلات الموفر، وتكشف طبقة الخدمة عن واجهة برمجة تطبيقات موحدة، ويقوم كل موفر بتنفيذ واجهة مشتركة. يسمح هذا التصميم للتطبيق بدعم Stripe وLemonSqueezy وPolar وSolidgate من خلال مجموعة واحدة من الواجهات.

## مخطط الهندسة المعمارية

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

## مقدمي الخدمات المدعومة

|مزود|معرف النوع|الميزات|
|----------|---------|----------|
|شريط|`stripe`|الخروج الكامل، والاشتراكات، وطرق الدفع، ونوايا الإعداد، والمبالغ المستردة|
|ليمونسكويزي|`lemonsqueezy`|الخروج المستضاف والاشتراكات والتسعير على أساس المتغير|
|القطبية|`polar`|الخروج والاشتراكات والمنتجات على مستوى المؤسسة|
|سوليدجيت|`solidgate`|المدفوعات المستندة إلى واجهة برمجة التطبيقات (API) وSDK المضمنة والاشتراكات والمبالغ المستردة|

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## واجهة المزود

يقوم جميع مقدمي الخدمة بتنفيذ `PaymentProviderInterface`:

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

## المصنع

`PaymentProviderFactory` ينشئ مثيلات الموفر بناءً على معرف السلسلة:

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

## طبقة الخدمة

`PaymentService` يغلف مثيل الموفر ويكشف عن واجهة برمجة التطبيقات الموحدة:

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

### مثال الاستخدام

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

## إدارة مزود Singleton

يستخدم القالب أنماطًا مفردة لمثيلات الموفر، والتي تتم إدارتها من خلال `@/lib/auth`:

```typescript
import { getOrCreateStripeProvider } from '@/lib/auth';
import { getOrCreateLemonsqueezyProvider } from '@/lib/auth';
import { getOrCreatePolarProvider } from '@/lib/auth';
import { getOrCreateSolidgateProvider } from '@/lib/auth';
```

تضمن هذه الوظائف وجود مثيل موفر واحد فقط في كل وقت تشغيل، مما يؤدي إلى تجنب إعادة تهيئة عميل واجهة برمجة التطبيقات (API) غير الضرورية.

## تعريفات نوع المفتاح

### تكوين مزود الدفع

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

### PaymentIntent

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

### معلومات الاشتراك

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

### حالة الاشتراك

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

### WebhookResult

```typescript
interface WebhookResult {
  received: boolean;
  type: string;
  id: string;
  data: any;
}
```

### WebhookEventType

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

## كيفية مبادلة مقدمي الخدمات

### الخطوة 1: تعيين متغيرات البيئة

يتطلب كل مزود مجموعته الخاصة من متغيرات البيئة. قم بتكوين المتغيرات للمزود الذي اخترته فقط.

### الخطوة 2: تحديث تهيئة الموفر

قم بتغيير وظيفة `getOrCreate*Provider` المستخدمة في معالجات المسار الخاصة بك، أو قم بتكوين `PaymentService` باستخدام سلسلة موفر مختلفة:

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

### الخطوة 3: تحديث نقاط نهاية Webhook

كل مزود لديه مسار خطاف الويب الخاص به (`/api/stripe/webhook`، `/api/lemonsqueezy/webhook`، وما إلى ذلك). تأكد من تسجيل خطاف الويب الخاص بالموفر النشط فقط.

### الخطوة 4: التعامل مع الميزات الخاصة بالموفر

بعض الميزات خاصة بالموفر:
- **أهداف الإعداد**: Stripe وSolidgate فقط (وهمي)
- **نماذج الدفع المضمنة**: Stripe وSolidgate عبر React SDK
- **التسعير على أساس المتغير**: LemonSqueezy فقط
- **المنتجات على مستوى المؤسسة**: القطبية فقط
- **واجهة برمجة تطبيقات الاسترداد المباشر**: Stripe وSolidgate فقط

## نمط قرار العملاء

يتبع جميع مقدمي الخدمة الأربعة نفس نمط حل العملاء المكون من ثلاث خطوات:

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

يتم تنفيذ هذا النمط بشكل مماثل في أسلوب `getCustomerId()` الخاص بكل موفر، مما يضمن السلوك المتسق بغض النظر عن الموفر النشط.

## تطبيع حدث Webhook

يقوم كل موفر بتعيين أنواع الأحداث الأصلية الخاصة به إلى التعداد المشترك `WebhookEventType`. يتيح ذلك لـ `WebhookSubscriptionService` التعامل مع الأحداث بشكل عام:

|العمل|شريط|ليمونسكويزي|القطبية|سوليدجيت|
|--------|--------|-------------|-------|-----------|
|تم إنشاء الفرعية|`customer.subscription.created`|`subscription_created`|`subscription.created`|`subscription.created`|
|تم إلغاء الفرعية|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|`subscription.cancelled`|
|نجاح الدفع|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|`payment.succeeded`|
|فشل الدفع|`payment_intent.payment_failed`|لا يوجد|`checkout.failed`|`payment.failed`|

## مكونات واجهة المستخدم

يكشف كل مزود عن مكونات واجهة المستخدم من خلال `getUIComponents()`:

```typescript
interface UIComponents {
  PaymentForm: (props: PaymentFormProps) => React.ReactElement | null;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

يتيح ذلك للواجهة الأمامية عرض نموذج الدفع والشعارات وأيقونات العلامة التجارية للبطاقة الصحيحة دون معرفة المزود النشط.

## هيكل الملف

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

## الصفحات ذات الصلة

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [الغوص العميق لاشتراك Stripe](./stripe-subscription-deep-dive.md)
- [التعمق في طرق الدفع الشريطية](./stripe- Payment-methods-deep-dive.md)
- [الغوص العميق في شريط Webhook](./stripe-webhook-deep-dive.md)
- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [الغوص العميق القطبي](./polar-deep-dive.md)
- [الغوص العميق في Solidgate](./solidgate-deep-dive.md)
