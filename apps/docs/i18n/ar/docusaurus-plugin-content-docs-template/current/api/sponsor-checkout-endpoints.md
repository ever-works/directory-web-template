---
id: sponsor-checkout-endpoints
title: "إعلانات الجهة الراعية ومرجع واجهة برمجة تطبيقات Checkout"
sidebar_label: "إعلانات الراعي والخروج"
sidebar_position: 59
---

# إعلانات الجهة الراعية ومرجع واجهة برمجة تطبيقات Checkout

## نظرة عامة

تدير نقاط نهاية الإعلانات المدعومة دورة الحياة الكاملة لمواضع الإعلانات المدعومة على عناصر الدليل. يتضمن ذلك تصفح الإعلانات النشطة، وإرسال طلبات الجهات الراعية الجديدة، وإدارة الإعلانات المملوكة للمستخدمين، ومعالجة المدفوعات من خلال مقدمي خدمات متعددين (Stripe، وLemonSqueezy، وPolar)، والتعامل مع عمليات الإلغاء والتجديد. يدعم تدفق الخروج فترات الفواتير الأسبوعية والشهرية.

## نقاط النهاية

### احصل على /api/sponsor-ads

إرجاع قائمة بإعلانات الجهات الراعية النشطة حاليًا مع بيانات العناصر المرتبطة بها للعرض العام.

**طلب**

|المعلمة|اكتب|في|الوصف|
| --------- | ------- | ----- | ------------------------------------------------ |
|الحد|عدد صحيح|الاستعلام|الحد الأقصى لعرض إعلانات الجهة الراعية (الافتراضي: 10، الحد الأقصى: 50)|

** الرد **

```typescript
{
  success: true;
  data: Array<{
    sponsor: {
      id: string;
      itemSlug: string;
      status: string;
      interval: string;
    };
    item: {
      name: string;
      slug: string;
      description: string;
      icon_url: string;
      category: string;
    } | null;
  }>;
}
```

**مثال**

```typescript
const response = await fetch("/api/sponsor-ads?limit=5");
const { data: sponsoredItems } = await response.json();
```

### احصل على /api/sponsor-ads/user

إرجاع قائمة مقسمة إلى صفحات بإعلانات الجهات الراعية المقدمة من المستخدم المصادق عليه.

**طلب**

|المعلمة|اكتب|في|الوصف|
| --------- | ------- | ----- | --------------------------------------------------------------------------------------- |
|الصفحة|عدد صحيح|الاستعلام|رقم الصفحة (الافتراضي: 1)|
|الحد|عدد صحيح|الاستعلام|العناصر لكل صفحة (الافتراضي: 10)|
|الحالة|سلسلة|الاستعلام|عامل التصفية: `"pending"`، `"approved"`، `"rejected"`، `"active"`، `"expired"`، `"cancelled"`|
|الفاصل الزمني|سلسلة|الاستعلام|عامل التصفية: `"weekly"`، `"monthly"`|
|بحث|سلسلة|الاستعلام|مصطلح البحث|

** الرد **

```typescript
{
  success: true;
  data: Array<SponsorAd>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

**مثال**

```typescript
const response = await fetch("/api/sponsor-ads/user?status=active&page=1");
const { data, pagination } = await response.json();
```

### POST /api/sponsor-ads/user

إنشاء إرسال إعلان راعي جديد للمستخدم المصادق عليه. يبدأ الإرسال في حالة معلقة في انتظار موافقة المسؤول.

**طلب**

```typescript
{
  itemSlug: string;          // Slug of the item to sponsor (required)
  itemName: string;          // Name of the item (required)
  itemIconUrl?: string;      // Icon URL
  itemCategory?: string;     // Category of the item
  itemDescription?: string;  // Description (max 500 chars)
  interval: "weekly" | "monthly"; // Billing interval (required)
}
```

** الرد **

```typescript
{
  success: true;
  data: SponsorAd;
  message: "Sponsor ad submission created successfully. Pending admin approval.";
}
```

**مثال**

```typescript
const response = await fetch("/api/sponsor-ads/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    itemSlug: "my-awesome-tool",
    itemName: "My Awesome Tool",
    interval: "monthly",
  }),
});
```

### احصل على /api/sponsor-ads/user/stats

إرجاع إحصائيات للإعلانات الراعية للمستخدم الذي تمت مصادقته، بما في ذلك الأعداد حسب الحالة، وتوزيع الفاصل الزمني، ومقاييس الإيرادات.

**طلب**

لا توجد معلمات مطلوبة. المصادقة عبر ملف تعريف الارتباط للجلسة.

** الرد **

```typescript
{
  success: true;
  stats: {
    overview: {
      total: number;
      pendingPayment: number;
      pending: number;
      active: number;
      rejected: number;
      expired: number;
      cancelled: number;
    }
    byInterval: {
      weekly: number;
      monthly: number;
    }
    revenue: {
      totalRevenue: number; // In minor currency units (cents)
      weeklyRevenue: number;
      monthlyRevenue: number;
    }
  }
}
```

**مثال**

```typescript
const response = await fetch("/api/sponsor-ads/user/stats");
const { stats } = await response.json();
console.log(
  `Active ads: ${stats.overview.active}, Total revenue: ${stats.revenue.totalRevenue}`,
);
```

### احصل على `/api/sponsor-ads/user/{id}`

إرجاع إعلان راعي واحد مملوك للمستخدم المصادق عليه.

**طلب**

|المعلمة|اكتب|في|الوصف|
| --------- | ------ | ---- | ------------------------ |
|معرف|سلسلة|المسار|معرف إعلان الراعي (مطلوب)|

** الرد **

```typescript
{
  success: true;
  data: SponsorAd;
}
```

### POST /api/sponsor-ads/checkout

إنشاء جلسة الخروج لإعلان الراعي المعتمد. يجب أن يكون الإعلان الراعي في حالة `pending_payment` وأن يكون مملوكًا للمستخدم المصادق عليه.

**طلب**

```typescript
{
  sponsorAdId: string;      // ID of the approved sponsor ad (required)
  successUrl?: string;      // Redirect URL after successful payment
  cancelUrl?: string;       // Redirect URL after cancelled payment
}
```

** الرد **

```typescript
{
  success: true;
  data: {
    checkoutId: string; // Provider checkout session ID
    checkoutUrl: string; // URL to redirect user to for payment
    provider: string; // "stripe", "lemonsqueezy", or "polar"
  }
  message: "Checkout session created successfully";
}
```

**مثال**

```typescript
const response = await fetch("/api/sponsor-ads/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sponsorAdId: "ad-123",
    successUrl: "https://myapp.com/sponsor/success?sponsorAdId=ad-123",
    cancelUrl: "https://myapp.com/sponsor?cancelled=true",
  }),
});

const { data } = await response.json();
window.location.href = data.checkoutUrl; // Redirect to payment
```

### نشر `/api/sponsor-ads/user/{id}/cancel`

يلغي إعلانًا راعيًا مملوكًا للمستخدم المصادق عليه. لا يمكن إلغاء الإعلانات إلا بحالة `pending_payment` أو `pending` أو `active`.

**طلب**

```typescript
{
  cancelReason?: string;   // Optional reason for cancellation (max 500 chars)
}
```

** الرد **

```typescript
{
  success: true;
  data: SponsorAd; // The cancelled sponsor ad
  message: "Sponsor ad cancelled successfully";
}
```

**مثال**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/cancel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cancelReason: "No longer needed" }),
});
```

### نشر `/api/sponsor-ads/user/{id}/renew`

إنشاء جلسة الخروج لتجديد إعلان الراعي النشط أو منتهي الصلاحية. يمكن تجديد الإعلانات ذات الحالة `active` أو `expired` فقط.

**طلب**

```typescript
{
  successUrl?: string;     // Redirect URL after successful payment
  cancelUrl?: string;      // Redirect URL after cancelled payment
}
```

** الرد **

```typescript
{
  success: true;
  data: {
    checkoutId: string;
    checkoutUrl: string;
    provider: string;
  }
  message: "Renewal checkout session created successfully";
}
```

**مثال**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/renew", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    successUrl:
      "https://myapp.com/sponsor/success?sponsorAdId=ad-123&renewal=true",
  }),
});
const { data } = await response.json();
window.location.href = data.checkoutUrl;
```

## المصادقة

|نقطة النهاية|المصادقة مطلوبة|
| ---------------------------------------- | ------------------------------------- |
|احصل على /api/sponsor-ads|عام|
|احصل على /api/sponsor-ads/user|الجلسة مطلوبة|
|POST /api/sponsor-ads/user|الجلسة مطلوبة|
|احصل على /api/sponsor-ads/user/stats|الجلسة مطلوبة|
|`GET /api/sponsor-ads/user/{id}`|الجلسة مطلوبة (تم التحقق من الملكية)|
|POST /api/sponsor-ads/checkout|الجلسة مطلوبة (تم التحقق من الملكية)|
|`POST /api/sponsor-ads/user/{id}/cancel`|الجلسة مطلوبة (تم التحقق من الملكية)|
|`POST /api/sponsor-ads/user/{id}/renew`|الجلسة مطلوبة (تم التحقق من الملكية)|

تتحقق جميع نقاط النهاية الخاصة بالمستخدم من الملكية - حيث تؤدي محاولة الوصول إلى الإعلان الراعي لمستخدم آخر إلى `404` (لـ GET) أو `403` (للإجراءات).

## ردود الأخطاء

|الحالة|الوصف|
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 400    |إدخال غير صالح، أو إرسال مكرر، أو حالة غير قابلة للإلغاء/غير قابلة للتجديد، أو تكوين سعر مفقود، أو JSON مكتوب بشكل غير صحيح|
| 401    |غير مصرح به - لا توجد جلسة مصادق عليها|
| 403    |ممنوع -- المستخدم لا يملك الإعلان الراعي|
| 404    |لم يتم العثور على إعلان الراعي|
| 500    |خطأ داخلي في الخادم - فشل مزود الدفع أو خطأ في قاعدة البيانات|

## الحد من المعدل

لا يوجد حد واضح للسعر. يتم التحقق من صحة عناوين URL لإعادة التوجيه في نقاط نهاية الخروج والتجديد في مجال التطبيق لمنع ثغرات إعادة التوجيه المفتوحة. يتم تحديد موفر الدفع النشط بواسطة متغير البيئة `NEXT_PUBLIC_PAYMENT_PROVIDER` (الإعداد الافتراضي هو Stripe).

## نقاط النهاية ذات الصلة

- [نقاط نهاية دفع المستخدم](./user-pay-endpoints) - سجل دفع المستخدم وإدارة الاشتراكات
