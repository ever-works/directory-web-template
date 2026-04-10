---
id: cron-jobs
title: تكوين مهام Cron
sidebar_label: مهام Cron
sidebar_position: 8
---

# تكوين مهام Cron

يدعم قالب Ever Works ثلاث آليات لجدولة المهام الخلفية، يتم اختيارها تلقائياً بناءً على بيئة التشغيل.

## كيفية العمل

### أولوية الآليات

```typescript
// Priority order (highest to lowest):
// 1. Trigger.dev  — when TRIGGER_SECRET_KEY is set
// 2. Vercel Crons — when VERCEL=1 (auto-set by Vercel platform)
// 3. Local setInterval — fallback for development
```

### الاكتشاف التلقائي للبيئة

يكتشف النظام الآلية الصحيحة تلقائياً:

- **Trigger.dev**: عند تعيين `TRIGGER_SECRET_KEY`
- **Vercel Crons**: عند تعيين `VERCEL=1` (يُعيَّن تلقائياً بواسطة Vercel)
- **Local setInterval**: في جميع الحالات الأخرى (التطوير المحلي)

## المهام المسجلة

هناك ثلاث مهام cron مسجلة في النظام:

| المهمة | النقطة النهائية | الجدول الزمني | الغرض |
|--------|----------------|---------------|-------|
| مزامنة المستودع | `/api/cron/sync` | `*/5 * * * *` | مزامنة المحتوى كل 5 دقائق |
| تذكيرات الاشتراك | `/api/cron/subscription-reminders` | `0 9 * * *` | إرسال رسائل التذكير يومياً الساعة 9:00 |
| انتهاء صلاحية الاشتراك | `/api/cron/subscription-expiration` | `0 0 * * *` | معالجة الاشتراكات المنتهية صلاحيتها عند منتصف الليل |

## تكوين Vercel Crons

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"
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

### متغير البيئة CRON_SECRET

لأسباب أمنية، يوقّع Vercel كل استدعاء cron باستخدام رأس `Authorization`. يُستخدم نفس المفتاح السري على كلا الطرفين:

```bash
# In Vercel project settings (Environment Variables)
CRON_SECRET=your-secret-here  # openssl rand -base64 32
```

تتحقق كل نقطة نهائية API من المفتاح السري:

```typescript
// app/api/cron/sync/route.ts
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

## التحقق

### الخطوة 1: لوحة تحكم Vercel

```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

تأكد من ظهور 3 مهام cron بالجداول الزمنية الصحيحة.

### الخطوة 2: سجلات الاستدعاء

```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```

### الخطوة 3: سجلات التطبيق

عند بدء تشغيل التطبيق:
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

عند كل مزامنة:
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

### الخطوة 4: الاختبار اليدوي

```bash
curl -X GET https://yourdomain.com/api/cron/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

الاستجابة المتوقعة:
```json
{
  "success": true,
  "message": "Sync completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "duration": 1234
}
```

## استكشاف الأخطاء وإصلاحها

### المهام لا تعمل

1. تأكد من أن `vercel.json` يسرد جميع مهام cron الثلاث
2. تأكد من تعيين `CRON_SECRET` في متغيرات بيئة Vercel
3. تأكد من عدم تعيين متغيرات Trigger.dev (وإلا ستأخذ الأولوية)

### خطأ 401 غير مصرح به

```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

### التنفيذ يحدث بكثرة زائدة

تحقق من عدم وجود إدخالات مكررة في `vercel.json` — يجب أن يظهر كل مسار مرة واحدة فقط.

## دليل الترحيل

### محلي ← Vercel Crons

1. أضف إدخالات cron إلى `vercel.json`
2. أنشئ `CRON_SECRET` وعيّنه
3. أعد النشر إلى Vercel

### Vercel → Trigger.dev

```bash
# Install Trigger.dev
pnpm add @trigger.dev/sdk

# Set the environment variable
TRIGGER_SECRET_KEY=your-trigger-secret

# Deploy your trigger jobs
npx trigger.dev@latest deploy
```

### Trigger.dev → Vercel Crons

```bash
# Remove Trigger.dev environment variables
vercel env rm TRIGGER_SECRET_KEY
vercel env rm TRIGGER_API_KEY

# Redeploy
vercel --prod
```
