---
id: user-payment-endpoints
title: "مرجع واجهة برمجة تطبيقات دفع المستخدم"
sidebar_label: "مدفوعات المستخدم"
sidebar_position: 55
---

# مرجع واجهة برمجة تطبيقات دفع المستخدم

## نظرة عامة

تدير نقاط نهاية دفع المستخدم تفضيلات العملة وسجل الدفع وحالة الخطة وتفاصيل الاشتراك للمستخدمين المعتمدين. يستخدم اكتشاف العملة رؤوس CDN/proxy (Cloudflare، Vercel، CloudFront، Fastly) لتحديد عملة المستخدم تلقائيًا. يتم الحصول على بيانات الدفع والاشتراك من Stripe.

## نقاط النهاية

### الحصول على /api/user/currency

يكتشف ويعيد تفضيلات العملة الخاصة بالمستخدم بناءً على رؤوس HTTP من موفري CDN/الوكيل. يُرجع دائمًا `200 OK` مع تدهور سلس - ويعود إلى الدولار الأمريكي في حالة فشل الاكتشاف.

**طلب**

|المعلمة|اكتب|في|الوصف|
|-----------|--------|-------|-------------|
|مزود|سلسلة|الاستعلام|مزود الكشف: `"cloudflare"`، `"vercel"`، `"cloudfront"`، `"generic"`، `"auto"`، `"smart"` (الافتراضي: `"smart"`)|

** الرد **
```typescript
{
  currency: string;     // ISO 4217 code, e.g. "USD", "EUR", "GBP"
  country: string | null; // ISO 3166-1 alpha-2, e.g. "US", "FR", or null if detection failed
  detected: boolean;    // true if detected from headers, false if using fallback
}
```

**مثال**
```typescript
const response = await fetch('/api/user/currency?provider=smart');
const { currency, country, detected } = await response.json();
// { currency: "EUR", country: "FR", detected: true }
```

### وضع /api/user/currency

يقوم بتحديث عملة المستخدم المصادق عليه وتفضيلات البلد. يتطلب جلسة صالحة.

**طلب**
```typescript
{
  currency: string;       // ISO 4217 code, exactly 3 characters, required
  country?: string | null; // ISO 3166-1 alpha-2, exactly 2 characters, optional
}
```

** الرد **
```typescript
{
  currency: string;       // Updated currency code
  country: string | null; // Updated country code or null
}
```

**مثال**
```typescript
const response = await fetch('/api/user/currency', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency: 'EUR', country: 'FR' })
});
const data = await response.json();
```

### الحصول على /api/user/المدفوعات

يسترد سجل الدفع الشامل للمستخدم المصادق عليه من Stripe. إرجاع الفواتير بتفاصيل الخطة، والفواصل الزمنية للفوترة، وروابط الفواتير، مرتبة حسب التاريخ (الأحدث أولاً).

**طلب**

لا توجد معلمات مطلوبة. المصادقة عبر ملف تعريف الارتباط للجلسة.

** الرد **
```typescript
Array<{
  id: string;                // Stripe invoice ID
  date: string;              // ISO 8601 date
  amount: number;            // In major currency units (e.g. 29.99)
  currency: string;          // Uppercase currency code
  plan: string;              // Plan display name
  planId: string;            // Plan identifier
  status: "Paid" | "Pending" | "Draft" | "Unknown";
  billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  paymentProvider: "stripe";
  subscriptionId: string;    // Associated subscription ID
  description: string;       // e.g. "Premium Plan - monthly billing"
  invoiceUrl: string | null; // Hosted invoice URL
  invoicePdf: string | null; // Invoice PDF download URL
  invoiceNumber: string | null;
  period_end: string | null;   // Billing period end (ISO 8601)
  period_start: string | null; // Billing period start (ISO 8601)
}>
```

**مثال**
```typescript
const response = await fetch('/api/user/payments');
const payments = await response.json();
// payments[0] = { id: "in_123...", amount: 29.99, status: "Paid", ... }
```

### الحصول على /api/user/plan-status

إرجاع الخطة الحالية للمستخدم مع تفاصيل انتهاء الصلاحية الكاملة، بما في ذلك الخطة الفعالة (ما يمكن للمستخدم الوصول إليه بالفعل)، وفترات التحذير، وحالة الوصول إلى الميزات.

**طلب**

لا توجد معلمات مطلوبة. المصادقة عبر ملف تعريف الارتباط للجلسة.

** الرد **
```typescript
{
  success: true;
  data: {
    planId: "free" | "standard" | "premium";
    effectivePlan: "free" | "standard" | "premium"; // May differ if expired
    isExpired: boolean;
    expiresAt: string | null;          // ISO 8601 date
    daysUntilExpiration: number | null; // Negative if already expired
    isInWarningPeriod: boolean;        // true if expires within 7 days
    canAccessPlanFeatures: boolean;
    warningMessage: string | null;     // User-facing warning text
    status: string | null;             // Raw subscription status
  };
}
```

**مثال**
```typescript
const response = await fetch('/api/user/plan-status');
const { data } = await response.json();

if (data.isInWarningPeriod) {
  showWarning(data.warningMessage);
}

if (!data.canAccessPlanFeatures) {
  redirectToUpgrade();
}
```

### احصل على /api/user/subscription

يسترد معلومات الاشتراك الشاملة بما في ذلك تفاصيل الاشتراك النشط الحالي وسجل الاشتراك الكامل من Stripe.

**طلب**

لا توجد معلمات مطلوبة. المصادقة عبر ملف تعريف الارتباط للجلسة.

** الرد **
```typescript
{
  hasActiveSubscription: boolean;
  message?: string;                    // Only when no Stripe customer found
  currentSubscription?: {
    id: string;                        // Stripe subscription ID
    planId: string;                    // Stripe price ID
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
    startDate: string;                 // ISO 8601
    endDate: string;
    nextBillingDate: string;
    paymentProvider: "stripe";
    subscriptionId: string;
    amount: number;                    // Major currency units
    currency: string;                  // Uppercase
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
    currentPeriodEnd: string;
    currentPeriodStart: string;
  };
  subscriptionHistory: Array<{
    id: string;
    planId: string;
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
    startDate: string;
    endDate: string;
    cancelledAt?: string;
    cancelReason?: string;
    amount: number;
    currency: string;
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  }>;
}
```

**مثال**
```typescript
const response = await fetch('/api/user/subscription');
const { hasActiveSubscription, currentSubscription } = await response.json();

if (hasActiveSubscription && currentSubscription) {
  console.log(`Plan: ${currentSubscription.planName}, Status: ${currentSubscription.status}`);
}
```

## المصادقة

- **GET /api/user/currency**: عام (لا يتطلب مصادقة) - يكتشف العملة من الرؤوس.
- **PUT /api/user/currency**: يتطلب جلسة مصادق عليها.
- **الحصول على /api/user/المدفوعات**: يتطلب جلسة مصادق عليها.
- **الحصول على /api/user/plan-status**: يتطلب جلسة مصادق عليها.
- **الحصول على /api/user/subscription**: يتطلب جلسة مصادق عليها.

## ردود الأخطاء

|الحالة|الوصف|
|--------|-------------|
| 400 |رمز العملة غير صالح، أو تنسيق رمز البلد غير صالح، أو حمولة JSON غير صحيحة|
| 401 |غير مصرح به - لا توجد جلسة مصادق عليها|
| 500 |خطأ داخلي في الخادم - فشل Stripe API أو خطأ في قاعدة البيانات|

## الحد من المعدل

لا يوجد حد واضح للسعر. تقوم نقطة نهاية الكشف عن العملة دائمًا بإرجاع `200 OK` للتدهور السلس. يتم جلب بيانات الدفع والاشتراك مباشرة من Stripe بحد أقصى 100 سجل لكل طلب.

## نقاط النهاية ذات الصلة

- [نقاط نهاية ميزة التكوين](./config-feature-endpoints) - تحقق من توفر الميزة بناءً على الخطة
