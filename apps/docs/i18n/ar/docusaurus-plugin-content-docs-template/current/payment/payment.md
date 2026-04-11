---
id: payment-overview
title: نظرة عامة على تكامل الدفع
sidebar_label: دليل التكامل
sidebar_position: 1.5
---

# نظرة عامة على تكامل الدفع

يقدم هذا الدليل شرحًا عمليًا لنظام الدفع Ever Works. وهو يغطي طبقة تجريد الموفر، وكيفية تكوين كل موفر، ودورة حياة الخروج والاشتراك، وبوابة الميزات، والتعامل مع خطاف الويب.

## نظرة سريعة على بنية الموفر

نظام الدفع مبني على **تجريد لا يراعي المزود**. ينفذ كل مزود دفع نفس الشيء، ويتيح لك نمط المصنع تبديل مقدمي الخدمة دون تغيير رمز التطبيق.

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

### مقدمي الخدمة المدعومين

| مقدم | مدفوعات لمرة واحدة | الاشتراكات | محاكمات | خطافات الويب | تاجر السجل |
|-------------|:-:|:-:|:-:|:-:|:-:|
| شريط | نعم | نعم | نعم | نعم | لا |
| ليمونسكويزي | نعم | نعم | نعم | نعم | نعم |
| القطبية | نعم | نعم | نعم | نعم | لا |
| سوليدجيت | نعم | نعم | لا | نعم | لا |

## الواجهات الأساسية

### واجهة مزود الدفع

يقوم كل مزود بتنفيذ هذه الواجهة، المحددة في `lib/payment/types/payment-types.ts` :

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

### أنواع البيانات الرئيسية

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

## الإعداد السريع

### الخطوة 1: تعيين متغيرات البيئة

يتطلب كل مزود مفاتيح API وأسرار خطاف الويب. أضفهم إلى 0:

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

### الخطوة الثانية: تكوين خطط التسعير

يتم تحديد خطط التسعير في `.content/config.yml` :

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

### الخطوة 3: إعداد خطافات الويب

لدى كل مزود نقطة نهاية خطاف ويب مخصصة:

| مقدم | عنوان URL للويب هوك |
|-------------|-----------------------------|
| شريط | `/api/stripe/webhook` |
| ليمونسكويزي | `/api/lemonsqueezy/webhook` |
| القطبية | `/api/polar/webhook` |
| سوليدجيت | `/api/solidgate/webhook` |

قم بتكوين عناوين URL هذه في لوحة معلومات كل موفر، مع الإشارة إلى المجال الذي تم نشره.

## The PaymentProviderFactory

يقوم المصنع بإنشاء مثيلات الموفر بناءً على سلسلة نوع:

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

## خدمة الدفع ومدير الخدمة

### خدمة الدفع

يلتف `PaymentService` مثيل الموفر النشط ويكشف عن واجهة برمجة تطبيقات موحدة:

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

### مدير خدمة الدفع (مفرد)

يتعامل المدير مع تبديل الموفر في وقت التشغيل ويستمر في اختيار المستخدم في 0:

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

## التكامل التفاعلي

### سياق مزود الدفع

قم بلف طلبك (أو الصفحات المتعلقة بالدفع) بالعلامة `PaymentProvider` :

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

### استخدم خطاف الدفع

تصل المكونات إلى خدمة الدفع من خلال الخطاف `usePayment` :

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

**مثال الاستخدام:**

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

## ميزة البوابات

يقيد المكون `FeatureGuard` عناصر واجهة المستخدم بناءً على خطة اشتراك المستخدم:

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

** الاستخدام: **

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

### دعم فترة السماح

تحصل الخطط منتهية الصلاحية على فترة سماح مدتها 7 أيام مع إمكانية وصول متدنية:

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

## أنواع أحداث Webhook

يتم تطبيع جميع أحداث webhook في تعداد مشترك:

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

## تدفقات الدفع

يدعم القالب مسارين للدفع لعمليات إرسال المحتوى:

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

- **الدفع عند البداية**: يدفع المستخدم قبل مراجعة التقديم.
- **الدفع عند النهاية**: يرسل المستخدم مجانًا، ولا يدفع إلا بعد الموافقة.

## مرجع طريق API

### طرق الشريط

| الطريق | الطريقة | الوصف |
|-------|--------|-------------|
| `/api/stripe/checkout` | مشاركة | إنشاء جلسة الخروج |
| `/api/stripe/subscription` | الحصول على/النشر | إدارة الاشتراكات |
| `/api/stripe/subscription/portal` | مشاركة | إنشاء جلسة بوابة الفوترة |
| `/api/stripe/subscription/[id]/cancel` | مشاركة | إلغاء الاشتراك |
| 4ـ | مشاركة | إنشاء نية الدفع |
| 5 ــ | احصل على | قائمة طرق الدفع المحفوظة |
| 6ـ | مشاركة | أضف طريقة دفع |
| `/api/stripe/payment-methods/delete` | مشاركة | إزالة طريقة الدفع |
| 8ـ | مشاركة | إنشاء نية الإعداد |
| `/api/stripe/webhook` | مشاركة | التعامل مع خطافات الويب الشريطية |

### طرق LemonSqueezy

| الطريق | الطريقة | الوصف |
|-------|--------|-------------|
| `/api/lemonsqueezy/checkout` | مشاركة | إنشاء جلسة الخروج |
| `/api/lemonsqueezy/cancel` | مشاركة | إلغاء الاشتراك |
| ‹‹١٢› | مشاركة | إعادة تنشيط الاشتراك |
| 13 ــ | مشاركة | تغيير خطة الاشتراك |
| 14 ــ | احصل على | قائمة اشتراكات المستخدم |
| `/api/lemonsqueezy/webhook` | مشاركة | التعامل مع خطافات الويب |

### الطرق القطبية

| الطريق | الطريقة | الوصف |
|-------|--------|-------------|
| 16 ــ | مشاركة | إنشاء جلسة الخروج |
| `/api/polar/subscription/portal` | مشاركة | إنشاء بوابة العملاء |
| 18 ــ | مشاركة | إلغاء الاشتراك |
| 19 ــ | مشاركة | إعادة التنشيط |
| 20 ــ | مشاركة | التعامل مع خطافات الويب |

## وظائف المرافق

يتضمن الملف 21 مساعدات تنسيق مفيدة:

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

## الخطوات التالية

- [تكوين الشريط](./stripe) - إكمال إعداد الشريط
- [تكوين LemonSqueezy](./lemonsqueezy) - إعداد LemonSqueezy
- [التكوين القطبي](./polar)--الإعداد القطبي
- [تكامل العملات المتعددة](./multi-currency) -- دعم العملات
- [بنية الدفع](./Payment-architecture) -- الغوص العميق في الهندسة المعمارية
- [Webhooks](./webhooks) - تفاصيل التعامل مع Webhooks
- [دليل التكوين](./configuration)--جميع متغيرات وخيارات البيئة
