---
id: monitoring
title: المراقبة والتحليلات
sidebar_label: المراقبة
sidebar_position: 6
---

# المراقبة والتحليلات

يدمج قالب Ever Works عدة أدوات للمراقبة والتحليلات لإمكانية الملاحظة في الإنتاج: **Sentry** (تتبع الأخطاء)، **PostHog** (تحليلات المنتج)، و **Google Analytics** (تحليلات حركة المرور).

## Sentry – تتبع الأخطاء

### نظرة عامة

تكوين Sentry موزّع على ثلاثة ملفات:

| الملف | الغرض |
|-------|-------|
| `sentry.config.ts` | التكوين من جانب العميل (المتصفح) |
| `instrumentation.ts` | التكوين من جانب الخادم (بيئة تشغيل Node.js) |
| `next.config.ts` | إضافة Sentry Webpack لرفع Source Maps |

### متغيرات البيئة

```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
```

### الميزات المدعومة

| الميزة | الوصف |
|--------|-------|
| **تتبع الأخطاء** | التقاط تلقائي للاستثناءات غير المعالجة |
| **الأداء** | تتبع المعاملات والامتدادات |
| **Source Maps** | رفع عبر `SENTRY_AUTH_TOKEN` |
| **Session Replay** | تسجيل الجلسات لإعادة إنتاج الأخطاء |
| **مراقبة Cron** | تتبع تنفيذ المهام المجدولة |

### مثال على التكوين

```typescript
// sentry.config.ts (client)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,   // Adjust in production (e.g., 0.1)
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
```

### التحقق من Sentry

```bash
# Test error capture
curl -X POST https://yourdomain.com/api/test-error

# Check Sentry dashboard
https://sentry.io/organizations/{ORG}/issues/
```

## PostHog – تحليلات المنتج

### نظرة عامة

يتم دمج PostHog عبر وحدة مخصصة في `lib/analytics/` وعنصر المزود في `components/analytics/`.

### متغيرات البيئة

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**استضافة ذاتية لـ PostHog:**

```bash
NEXT_PUBLIC_POSTHOG_HOST=https://posthog.yourdomain.com
```

### ما يتم تتبعه

| الحدث | عند الإطلاق |
|-------|------------|
| `user_signed_up` | تسجيل مستخدم جديد |
| `user_logged_in` | تسجيل الدخول بنجاح |
| `subscription_created` | إنشاء اشتراك جديد |
| `subscription_cancelled` | إلغاء اشتراك |
| `content_synced` | اكتمال مزامنة مستودع المحتوى |
| `item_viewed` | مشاهدة عضو لعنصر في الدليل |
| `item_favorited` | إضافة عنصر إلى المفضلة |
| `comment_created` | نشر تعليق جديد |
| `payment_completed` | نجاح الدفع |

### أعلام الميزات

تحكّم في طرح الميزات عبر أعلام ميزات PostHog:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

function MyComponent() {
  const isEnabled = useFeatureFlag('new-feature');
  if (!isEnabled) return null;
  return <NewFeature />;
}
```

### حماية المعلومات الشخصية

تم تكوين PostHog لحماية المعلومات الشخصية:

```typescript
// lib/analytics/posthog.ts
posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  capture_pageview: false,  // Manual control
  capture_pageleave: true,
  mask_all_text: false,
  disable_session_recording: false,
  sanitize_properties: (properties) => {
    // Remove PII fields before sending
    delete properties['$email'];
    delete properties['$phone'];
    return properties;
  }
});
```

## Google Analytics – تحليلات حركة المرور

### متغيرات البيئة

```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### ما يتم تتبعه

يتتبع GA4 تلقائياً:

- **مشاهدات الصفحة** – جميع تغييرات المسار
- **مقاييس التفاعل** – التمرير والنقر ووقت الجلسة
- **خصائص المستخدم** – الموقع والجهاز ونوع المتصفح
- **أحداث التحويل** – تكوّن عبر الأحداث المخصصة في الكود

### تعطيل التتبع (حماية الخصوصية)

للمستخدمين الذين لم يقبلوا التتبع، احترام إعدادات الموافقة:

```typescript
// lib/analytics/google-analytics.ts
if (typeof window !== 'undefined' && window.gtag) {
  window.gtag('consent', 'update', {
    analytics_storage: userConsented ? 'granted' : 'denied',
  });
}
```

## مراقبة صحة التطبيق

### نقطة نهاية الفحص الصحي

```bash
GET /api/health
```

مثال على الاستجابة:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Vercel Analytics

فعّل تحليلات السرعة المدمجة في إعدادات مشروع Vercel:

1. انتقل إلى **المشروع** → **التحليلات**
2. فعّل **Web Analytics**
3. فعّل **Speed Insights**

### التنبيهات والإشعارات

تكوين التنبيهات في Sentry:

1. انتقل إلى **التنبيهات** → **إنشاء قاعدة التنبيه**
2. كوّن الشروط (مثل: معدل الخطأ > 10/دقيقة)
3. كوّن قنوات الإشعارات (البريد الإلكتروني، Slack، إلخ)

التكوين في PostHog:

1. انتقل إلى **الإشعارات** → **إنشاء إشعار**
2. كوّن المقياس (مثل: انخفاض حاد في المستخدمين النشطين)
3. كوّن المستلمين

## أفضل ممارسات قابلية الملاحظة

### السجلات المهيكلة

استخدم السجلات المهيكلة لتسهيل تجميع السجلات:

```typescript
// ✅ Good: structured log with context
console.log(JSON.stringify({
  level: 'info',
  message: 'Subscription created',
  userId: user.id,
  planId: plan.id,
  timestamp: new Date().toISOString(),
}));

// ❌ Avoid: unstructured log
console.log('User ' + user.id + ' subscribed to ' + plan.id);
```

### مقاييس الإنتاج الرئيسية

راقب هذه المقاييس الحيوية:

| المقياس | عتبة التنبيه | السبب |
|---------|-------------|-------|
| معدل الخطأ | > 1% | المستخدمون متأثرون مباشرة |
| P95 وقت الاستجابة | > 3 ثوانٍ | تراجع التجربة |
| P99 قاعدة البيانات | > 1 ثانية | عنق الزجاجة في الأداء |
| فشل مهمة Cron | أي فشل | مشاكل اتساق البيانات |
| استخدام الذاكرة | > 80% | خطر عدم استقرار النظام |
