---
id: cron-api-endpoints
title: نقاط نهاية واجهة برمجة تطبيقات كرون
sidebar_label: واجهة برمجة تطبيقات كرون
sidebar_position: 59
---

# نقاط نهاية واجهة برمجة تطبيقات كرون

توفر Cron API نقاط نهاية المهام المجدولة التي يتم تشغيلها بواسطة Vercel Cron أو المجدولات الخارجية أو `BackgroundJobManager` الداخلي. تتطلب جميع نقاط النهاية cron المصادقة عبر `CRON_SECRET` متغير البيئة باستخدام الرمز المميز `Bearer` في الرأس `Authorization`.

** دليل المصدر: ** `template/app/api/cron/`

---

## Authentication

Cron endpoints use a shared secret for authorization:

- **Production:** The `CRON_SECRET` environment variable must be set. Requests must include `Authorization: Bearer <CRON_SECRET>`.
- **Development:** If `CRON_SECRET` is not configured, access is allowed without authentication for a frictionless local development experience.
- **Security:** All cron endpoints use `crypto.timingSafeEqual()` for constant-time comparison to prevent timing attacks.

**Unauthorized response (401):**

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing cron secret"
}
```

---

## تكوين فيرسيل كرون

يتم تعريف جدول cron في `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

|وظيفة|الجدول الزمني|الوصف|
|-----|----------|-------------|
|مزامنة المحتوى|يوميًا الساعة 3:00 صباحًا بالتوقيت العالمي المنسق|مزامنة المحتوى من نظام إدارة المحتوى المستند إلى Git|
|تذكيرات الاشتراك|يوميًا الساعة 9:00 صباحًا بالتوقيت العالمي الموحد|يرسل رسائل تذكير بالتجديد عبر البريد الإلكتروني|
|انتهاء الاشتراك|يوميًا عند منتصف الليل بالتوقيت العالمي المنسق|عمليات الاشتراكات منتهية الصلاحية|

---

## Content Sync

Triggers a content synchronization from the Git-based CMS repository.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/cron/sync` |
| **Auth** | `CRON_SECRET` (Bearer token) |
| **Source** | `cron/sync/route.ts` |

### Response

**Status 200** -- Sync completed successfully.

```json
{
  "success": true,
  "timestamp": "2024-01-20T03:00:05.123Z",
  "duration": 5123,
  "message": "Sync completed successfully"
}
```

**Status 500** -- Sync failed.

```json
{
  "success": false,
  "timestamp": "2024-01-20T03:00:10.456Z",
  "duration": 10456,
  "message": "Cron sync failed",
  "details": "Error description"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the sync succeeded |
| `timestamp` | `string` (ISO 8601) | When the sync completed |
| `duration` | `number` | Duration in milliseconds |
| `message` | `string` | Human-readable status message |
| `details` | `string` (optional) | Additional details on failure |

### Response Headers

All responses include `Cache-Control: no-cache, no-store, must-revalidate` to prevent caching of sync results.

### curl Example

```bash
curl -s http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## انتهاء الاشتراك

يبحث عن الاشتراكات منتهية الصلاحية ويعالجها عن طريق تحديث حالتها من `active` إلى `expired` وإرسال رسائل بريد إلكتروني للإشعارات.

|الملكية|القيمة|
|----------|-------|
|**الطرق**|`GET`، `POST`|
|**المسار**|`/api/cron/subscription-expiration`|
|**المصادقة**|`CRON_SECRET` (الرمز المميز لحاملها)|
|**المصدر**|`cron/subscription-expiration/route.ts`|

### الاستجابة

**الحالة 200** -- تمت المعالجة بنجاح.

```json
{
  "success": true,
  "message": "Processed 3 expired subscriptions",
  "data": {
    "processed": 3,
    "affectedUsers": [
      {
        "subscriptionId": "sub_abc123",
        "userId": "user_456",
        "planId": "standard"
      }
    ],
    "errors": [],
    "timestamp": "2024-01-20T00:00:05.123Z"
  }
}
```

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`data.processed`|`number`|عدد الاشتراكات المحدثة إلى منتهية الصلاحية|
|`data.affectedUsers`|`array`|قائمة الاشتراكات المتأثرة (بدون معلومات تحديد الهوية الشخصية)|
|`data.errors`|`string[]`|أي أخطاء غير فادحة (مثل فشل تسليم البريد الإلكتروني)|
|`data.timestamp`|`string`|معالجة الطابع الزمني|

### خطوات المعالجة

1. يجد الاشتراكات النشطة بعد تاريخ انتهائها.
2. تحديثات الحالة من `active` إلى `expired`.
3. يرسل رسائل بريد إلكتروني لإشعار انتهاء الصلاحية عبر خدمة البريد الإلكتروني.
4. إرجاع ملخص - لا يؤدي فشل البريد الإلكتروني إلى فشل المهمة بأكملها.

### مثال الضفيرة

```bash
# Via GET
curl -s http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"

# Via POST (also supported for manual triggers)
curl -s -X POST http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Subscription Reminders

Sends renewal reminder emails to users with subscriptions nearing their renewal date.

| Property | Value |
|----------|-------|
| **Methods** | `GET`, `POST` |
| **Path** | `/api/cron/subscription-reminders` |
| **Auth** | `CRON_SECRET` (Bearer token) |
| **Source** | `cron/subscription-reminders/route.ts` |

### Response

**Status 200** -- Job completed successfully.

```json
{
  "message": "Subscription reminder job completed",
  "success": true,
  "sent": 5,
  "errors": []
}
```

**Status 207** -- Job completed with partial errors (Multi-Status).

```json
{
  "error": "Job completed with errors",
  "success": false,
  "sent": 3,
  "errors": ["Failed to send reminder to user_123"]
}
```

### curl Example

```bash
curl -s http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## تهيئة وظائف الخلفية

وحدة وظائف الخلفية (`cron/jobs/background-jobs-init.ts`) ليست نقطة نهاية API ولكنها وحدة تهيئة مفردة تستخدم لتكوين وضع الجدولة عند بدء تشغيل التطبيق.

**المصدر:** `cron/jobs/background-jobs-init.ts`

### أوضاع الجدولة

|الوضع|الوصف|
|------|-------------|
|`vercel`|تتم معالجة المهام بواسطة Vercel Cron عبر `/api/cron/*` نقاط النهاية|
|`local`|جدولة داخلية (لعمليات النشر المستضافة ذاتيًا)|
|`trigger-dev`|تكامل Trigger.dev للوظائف الخلفية المُدارة|
|`disabled`|تم تعطيل مزامنة الخلفية (`DISABLE_AUTO_SYNC=true`)|

### الاستخدام

```typescript
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';

// Called once from layout.tsx -- safe to call multiple times
await ensureBackgroundJobsInitialized();
```

### الميزات الرئيسية

- يستخدم `globalThis` للحالة المفردة، مما يضمن تشغيل التهيئة مرة واحدة فقط لكل عملية.
- تخطي التهيئة أثناء الاختبارات (`NODE_ENV=test`) والإنشاءات (`NEXT_PHASE=phase-production-build`).
- تؤدي التهيئة الفاشلة إلى إعادة تعيين الحالة للسماح بإعادة المحاولة التلقائية في المكالمة التالية.

---

## TypeScript Usage

```typescript
// Trigger content sync programmatically
async function triggerSync(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/sync', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();

  if (data.success) {
    console.log(`Sync completed in ${data.duration}ms`);
  } else {
    console.error('Sync failed:', data.message, data.details);
  }
}

// Check subscription expiration
async function processExpirations(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/subscription-expiration', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();
  console.log(`Processed ${data.data.processed} expirations`);

  if (data.data.errors.length > 0) {
    console.warn('Non-fatal errors:', data.data.errors);
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Production: Yes, Dev: No | Shared secret for cron endpoint authentication |
| `DISABLE_AUTO_SYNC` | No | Set to `true` to disable automatic content sync |
