---
id: overview
title: نظرة عامة على مسارات واجهة برمجة التطبيقات
sidebar_label: نظرة عامة
sidebar_position: 0
---

# نظرة عامة على مسارات واجهة برمجة التطبيقات

يعرض القالب ما يقرب من 151 معالج مسار لواجهة برمجة التطبيقات (API) منظمة عبر 29 مجموعة مسارات ضمن الدليل `app/api/`. تستخدم جميع المسارات اتفاقية Next.js App Router مع `route.ts` الملفات التي تصدر معالجات أسلوب HTTP (`GET`، `POST`، `PUT`، `PATCH`، `DELETE`).

## مجموعات الطريق

|المجموعة|المسار|الوصف|تقريبا. الطرق|
|-------|------|-------------|---------------|
|**المشرف**|`/api/admin/*`|عمليات لوحة الإدارة CRUD| ~60 |
|**المصادقة**|`/api/auth/*`|معالجات NextAuth + إدارة كلمات المرور| 2 |
|**الفئات**|`/api/categories/*`|استعلامات الفئة العامة| 1 |
|**العميل**|`/api/client/*`|لوحة تحكم العميل وإدارة العناصر| ~7 |
|**المجموعات**|`/api/collections/*`|استعلامات التحصيل العام| 1 |
|** التكوين **|`/api/config/*`|تكوين علامة الميزة| 1 |
|**كرون**|`/api/cron/*`|وظائف الخلفية المجدولة| 3 |
|**المستخدم الحالي**|`/api/current-user`|معلومات المستخدم الحالية المصادق عليها| 1 |
|**استخراج**|`/api/extract`|استخراج البيانات التعريفية لعنوان URL| 1 |
|**المفضلة**|`/api/favorites/*`|العناصر المفضلة للمستخدم| 2 |
|**العناصر المميزة**|`/api/featured-items`|قوائم العناصر المميزة| 1 |
|**الرمز الجغرافي**|`/api/geocode`|عنوان الترميز الجغرافي| 1 |
|**الصحة**|`/api/health/*`|فحوصات صحة النظام| 1 |
|**داخلي**|`/api/internal/*`|العمليات الداخلية (قاعدة البيانات الأولية)| 1 |
|**العناصر**|`/api/items/*`|نقاط نهاية العنصر العام (التعليقات، الأصوات، المشاهدات)| ~12 |
|**عصر الليمون**|`/api/lemonsqueezy/*`|تكامل الدفع ليمون سكويزي| 7 |
|** الموقع **|`/api/location/*`|البحث عن الموقع والبيانات| 4 |
|**الدفع**|`/api/payment/*`|إدارة الدفع/الاشتراك العامة| 3 |
|**قطبي**|`/api/polar/*`|تكامل الدفع القطبي| 5 |
|**المرجع**|`/api/reference`|نقطة نهاية البيانات المرجعية| 1 |
|** التقارير **|`/api/reports`|تقديم التقرير العام| 1 |
|**البوابة الصلبة**|`/api/solidgate/*`|تكامل الدفع في Solidgate| 2 |
|**إعلانات الراعي**|`/api/sponsor-ads/*`|إدارة إعلانات الراعي| 7 |
|**شريط**|`/api/stripe/*`|تكامل الدفع الشريطي| ~17 |
|**الاستطلاعات**|`/api/surveys/*`|مسح CRUD والاستجابات| 4 |
|**المستخدم**|`/api/user/*`|ملف تعريف المستخدم والاشتراك| 5 |
|**التحقق من كلمة التحقق**|`/api/verify-recaptcha`|التحقق من reCAPTCHA| 1 |
|**النسخة**|`/api/version/*`|معلومات إصدار التطبيق| 2 |

## أنماط العمارة

### هيكل معالج الطريق

تتبع معالجات المسار نمط معالج رفيع متسق:

```typescript
// app/api/admin/items/route.ts
import { withAdminAuth } from '@/lib/auth/admin-guard';

export const GET = withAdminAuth(async (request: NextRequest) => {
  // 1. Parse and validate input (query params, body)
  // 2. Call service or repository
  // 3. Return JSON response
  return NextResponse.json({ success: true, data: result });
});
```

### أنماط المصادقة

تستخدم الطرق مستويات مصادقة مختلفة:

|المستوى|الطريقة|الاستخدام|
|-------|--------|-------|
|**عامة**|لا يوجد فحص المصادقة|قوائم العناصر، والفحوصات الصحية، ومعلومات الإصدار|
|**مصادقة**|`auth()` أو `getCachedSession()`|ملف تعريف المستخدم والمفضلات ونقاط نهاية العميل|
|** المشرف **|`withAdminAuth()` أو `checkAdminAuth()`|جميع الطرق `/api/admin/*`|
|** كرون **|`CRON_SECRET` التحقق من الرأس|`/api/cron/*` الطرق|

### معالجة الأخطاء

تستخدم مسارات واجهة برمجة التطبيقات (API) تنسيقًا ثابتًا للاستجابة للأخطاء:

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: 'Human-readable error message' }
```

تتبع رموز حالة HTTP اصطلاحات REST:

|الحالة|الاستخدام|
|--------|-------|
| `200` |نجاح الحصول على، وضع، التصحيح|
| `201` |مشاركة ناجحة (تم إنشاء المورد)|
| `400` |نص الطلب أو المعلمات غير صالحة|
| `401` |المصادقة مفقودة أو غير صالحة|
| `403` |تمت المصادقة عليها ولكن الأذونات غير كافية|
| `404` |لم يتم العثور على المورد|
| `409` |الصراع (مورد مكرر)|
| `500` |خطأ داخلي في الخادم|

### ترقيم الصفحات

تدعم نقاط نهاية القائمة عادةً المؤشر أو ترقيم الصفحات القائم على الإزاحة:

```
GET /api/admin/items?page=1&limit=20&sort=createdAt&order=desc
```

معلمات الاستعلام الشائعة:

|المعلمة|اكتب|الافتراضي|الوصف|
|-----------|------|---------|-------------|
|`page`|رقم| `1` |رقم الصفحة (يعتمد على 1)|
|`limit`|رقم| `20` |العناصر لكل صفحة|
|`sort`|سلسلة|`createdAt`|فرز الحقل|
|`order`|سلسلة|`desc`|فرز الاتجاه (`asc` أو `desc`)|
|`search`|سلسلة| - |استعلام البحث عن النص الكامل|

### مغلف الاستجابة

تتضمن الاستجابات المقسمة إلى صفحات البيانات الوصفية:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

## هيكل الدليل

```
app/api/
  admin/               # Admin-only endpoints (19 resource groups)
  auth/                # NextAuth + password management
  categories/          # Public category data
  client/              # Client-facing dashboard + items
  collections/         # Public collection data
  config/              # Feature configuration
  cron/                # Scheduled jobs (sync, subscriptions)
  current-user/        # Current user session info
  extract/             # URL metadata extraction
  favorites/           # Favorite item management
  featured-items/      # Featured item listings
  geocode/             # Geocoding service
  health/              # Health checks (database)
  internal/            # Internal operations
  items/               # Public item interactions
  lemonsqueezy/        # Lemon Squeezy payments
  location/            # Location data (countries, cities)
  payment/             # Generic payment management
  polar/               # Polar payments
  reference/           # Reference data
  reports/             # Content reports
  solidgate/           # Solidgate payments
  sponsor-ads/         # Sponsor advertisement management
  stripe/              # Stripe payments
  surveys/             # Survey management
  user/                # User profile endpoints
  verify-recaptcha/    # reCAPTCHA verification
  version/             # App version info
```
