---
id: sponsor-ads-endpoints
title: "نقاط نهاية API لإعلانات الجهات الراعية"
sidebar_label: "إعلانات الراعي"
sidebar_position: 16
---

# نقاط نهاية API لإعلانات الجهات الراعية

تدير Sponsor Ads API دورة الحياة الكاملة للإعلانات المدعومة: الإنشاء، وسداد الدفع، والتجديد، والإلغاء، والإحصائيات. إنه يتكامل مع مزودي الدفع المتعددين (Stripe، LemonSqueezy، Polar) لإعداد الفواتير.

**الملفات المصدرية:**
- `template/app/api/sponsor-ads/route.ts`
- `template/app/api/sponsor-ads/checkout/route.ts`
- `template/app/api/sponsor-ads/user/route.ts`
- `template/app/api/sponsor-ads/user/[id]/route.ts`
- `template/app/api/sponsor-ads/user/[id]/cancel/route.ts`
- `template/app/api/sponsor-ads/user/[id]/renew/route.ts`
- `template/app/api/sponsor-ads/user/stats/route.ts`

## ملخص نقطة النهاية

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|احصل على|`/api/sponsor-ads`|لا شيء|احصل على إعلانات الراعي النشطة (عامة)|
|بريد|`/api/sponsor-ads/checkout`|جلسة|إنشاء جلسة الخروج|
|احصل على|`/api/sponsor-ads/user`|جلسة|قائمة إعلانات الراعي للمستخدم|
|بريد|`/api/sponsor-ads/user`|جلسة|تقديم إعلان الراعي الجديد|
|احصل على|`/api/sponsor-ads/user/{id}`|جلسة|احصل على إعلان راعي واحد|
|بريد|`/api/sponsor-ads/user/{id}/cancel`|جلسة|إلغاء إعلان الراعي|
|بريد|`/api/sponsor-ads/user/{id}/renew`|جلسة|تجديد إعلان الراعي|
|احصل على|`/api/sponsor-ads/user/stats`|جلسة|احصل على إحصائيات إعلان المستخدم|

---

## GET `/api/sponsor-ads`

Returns active sponsor ads with associated item data for public display. **No authentication required.**

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Max ads to return (1-50) |

### Response: 200

```json
{
  "success": true,
  "data": [
    {
      "sponsor": {
        "id": "sp_123",
        "itemSlug": "featured-tool",
        "status": "active",
        "interval": "monthly"
      },
      "item": {
        "name": "Featured Tool",
        "slug": "featured-tool",
        "description": "A great tool",
        "icon_url": "https://example.com/icon.png",
        "category": "productivity"
      }
    }
  ]
}
```

---

## نشر `/api/sponsor-ads/checkout`

إنشاء جلسة سداد الدفع لإعلان راعي معتمد. يدعم موفري Stripe و LemonSqueezy و Polar.

### هيئة الطلب

|الميدان|اكتب|مطلوب|الوصف|
|-------|------|----------|-------------|
|`sponsorAdId`|سلسلة|** نعم **|معرف الإعلان الراعي المعتمد|
|`successUrl`|سلسلة|لا|إعادة توجيه URL بعد الدفع الناجح|
|`cancelUrl`|سلسلة|لا|إعادة توجيه عنوان URL بعد إلغاء الدفع|

### الأمان: فتح منع إعادة التوجيه

يتم التحقق من صحة عناوين URL لإعادة التوجيه وفقًا لأصل التطبيق لمنع هجمات إعادة التوجيه المفتوحة:

```ts
function validateRedirectUrl(url, allowedOrigin) {
  const urlObj = new URL(url, allowedOrigin);
  const allowedUrlObj = new URL(allowedOrigin);
  // Only allow same protocol, hostname, and port
  return urlObj.protocol === allowedUrlObj.protocol &&
    urlObj.hostname === allowedUrlObj.hostname &&
    urlObj.port === allowedUrlObj.port;
}
```

يتم استبدال عناوين URL غير الصالحة بصمت باستخدام الإعدادات الافتراضية الآمنة.

### الرد: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_live_abc123",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_abc123",
    "provider": "stripe"
  },
  "message": "Checkout session created successfully"
}
```

### ردود الأخطاء

|الحالة|الوصف|
|--------|-------------|
| 400 |معرف إعلان الجهة الراعية مفقود، أو الإعلان ليس في حالة `pending_payment`، أو تكوين السعر مفقود|
| 401 |لم تتم المصادقة عليها|
| 403 |المستخدم لا يملك هذا الإعلان الراعي|
| 404 |لم يتم العثور على إعلان الراعي|

---

## GET `/api/sponsor-ads/user`

Returns a paginated list of sponsor ads belonging to the authenticated user.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 10 | Items per page |
| `status` | string | No | -- | Filter: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| `interval` | string | No | -- | Filter by billing interval |
| `search` | string | No | -- | Text search filter |

Query parameters are validated using the `querySponsorAdsSchema` Zod schema.

### Response: 200

```json
{
  "success": true,
  "data": [
    {
      "id": "sp_123",
      "itemSlug": "my-tool",
      "status": "active",
      "interval": "monthly"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## نشر `/api/sponsor-ads/user`

إنشاء إعلان جديد للراعي. يبدأ الإعلان في حالة معلقة في انتظار موافقة المشرف.

### هيئة الطلب

|الميدان|اكتب|مطلوب|الوصف|
|-------|------|----------|-------------|
|`itemSlug`|سلسلة|** نعم **|سبيكة من هذا البند إلى الراعي|
|`itemName`|سلسلة|** نعم **|اسم العرض للعنصر|
|`itemIconUrl`|سلسلة|لا|عنوان URL للرمز|
|`itemCategory`|سلسلة|لا|فئة السلعة|
|`itemDescription`|سلسلة|لا|الوصف (الحد الأقصى 500 حرف)|
|`interval`|`"weekly"` أو `"monthly"`|** نعم **|الفاصل الزمني للاشتراك|

### الرد: 201 تم الإنشاء

```json
{
  "success": true,
  "data": {
    "id": "sp_new123",
    "status": "pending",
    "interval": "monthly"
  },
  "message": "Sponsor ad submission created successfully. Pending admin approval."
}
```

### 400- تقديم مكرر

```json
{
  "success": false,
  "error": "You already have an active sponsor ad"
}
```

---

## GET `/api/sponsor-ads/user/{id}`

Retrieves a single sponsor ad owned by the authenticated user. Returns 404 if the ad does not exist or belongs to another user (to prevent information leakage).

---

## نشر `/api/sponsor-ads/user/{id}/cancel`

يلغي إعلان الراعي. يمكن إلغاء الإعلانات ذات الحالة `pending_payment` أو `pending` أو `active` فقط.

### هيئة الطلب

|الميدان|اكتب|مطلوب|الوصف|
|-------|------|----------|-------------|
|`cancelReason`|سلسلة|لا|سبب الإلغاء (الحد الأقصى 500 حرف)|

### الرد: 200

```json
{
  "success": true,
  "data": { "id": "sp_123", "status": "cancelled" },
  "message": "Sponsor ad cancelled successfully"
}
```

### ردود الأخطاء

|الحالة|الوصف|
|--------|-------------|
| 400 |لا يمكن إلغاء الإعلان بالحالة الحالية|
| 403 |المستخدم لا يملك هذا الإعلان الراعي|
| 404 |لم يتم العثور على إعلان الراعي|

---

## POST `/api/sponsor-ads/user/{id}/renew`

Creates a checkout session to renew an active or expired sponsor ad. Only ads with status `active` or `expired` can be renewed.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `successUrl` | string | No | Redirect URL after payment |
| `cancelUrl` | string | No | Redirect URL on cancellation |

### Response: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_renewal_abc",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_renewal_abc",
    "provider": "stripe"
  },
  "message": "Renewal checkout session created successfully"
}
```

---

## احصل على `/api/sponsor-ads/user/stats`

إرجاع إحصائيات للإعلانات الراعية للمستخدم الذي تمت مصادقته، بما في ذلك تفاصيل الحالة، وتوزيع الفاصل الزمني، ومقاييس الإيرادات.

### الرد: 200

```json
{
  "success": true,
  "stats": {
    "overview": {
      "total": 15,
      "pendingPayment": 2,
      "pending": 3,
      "active": 5,
      "rejected": 1,
      "expired": 3,
      "cancelled": 1
    },
    "byInterval": {
      "weekly": 8,
      "monthly": 7
    },
    "revenue": {
      "totalRevenue": 45000,
      "weeklyRevenue": 20000,
      "monthlyRevenue": 25000
    }
  }
}
```

تكون قيم الإيرادات بـ **وحدات العملة الثانوية** (على سبيل المثال، السنتات مقابل الدولار الأمريكي).

---

## Payment Provider Configuration

The active payment provider is determined by `NEXT_PUBLIC_PAYMENT_PROVIDER` (defaults to `"stripe"`). Each provider requires its own set of price/variant ID environment variables:

| Provider | Weekly Price Env Var | Monthly Price Env Var |
|----------|---------------------|-----------------------|
| Stripe | `STRIPE_SPONSOR_WEEKLY_PRICE_ID` | `STRIPE_SPONSOR_MONTHLY_PRICE_ID` |
| LemonSqueezy | `LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID` | `LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID` |
| Polar | `POLAR_SPONSOR_WEEKLY_PRICE_ID` | `POLAR_SPONSOR_MONTHLY_PRICE_ID` |

---

## ملفات المصدر ذات الصلة

|ملف|الغرض|
|------|---------|
|`template/app/api/sponsor-ads/route.ts`|نقطة نهاية الإعلانات النشطة العامة|
|`template/app/api/sponsor-ads/checkout/route.ts`|إنشاء جلسة الخروج|
|`template/app/api/sponsor-ads/user/route.ts`|قائمة إعلانات المستخدم وإنشائها|
|`template/app/api/sponsor-ads/user/[id]/route.ts`|استرجاع إعلان واحد|
|`template/app/api/sponsor-ads/user/[id]/cancel/route.ts`|إلغاء الإعلان|
|`template/app/api/sponsor-ads/user/[id]/renew/route.ts`|تجديد الإعلان|
|`template/app/api/sponsor-ads/user/stats/route.ts`|إحصائيات المستخدم|
|`template/lib/services/sponsor-ad.service.ts`|طبقة منطق الأعمال|
|`template/lib/validations/sponsor-ad.ts`|مخططات التحقق من صحة Zod|
|`template/lib/payment/config/payment-provider-manager.ts`|مصنع مزود الدفع|
