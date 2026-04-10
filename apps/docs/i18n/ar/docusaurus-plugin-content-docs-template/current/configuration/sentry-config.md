---
id: sentry-config
title: تكوين Sentry
sidebar_label: تكوين Sentry
sidebar_position: 10
---

# تكوين Sentry

توثّق هذه الصفحة تكامل Sentry لتتبع الأخطاء ومراقبة الأداء وإعادة تشغيل الجلسات في القالب. ينقسم التكوين على ثلاثة ملفات: `sentry.config.ts` (مكون webpack الإضافي)، و`instrumentation.ts` (التهيئة من جانب الخادم)، و`instrumentation-client.ts` (التهيئة من جانب العميل).

## نظرة عامة

يستخدم القالب SDK `@sentry/nextjs` لالتقاط الأخطاء وبيانات الأداء على كل من الخادم والعميل. Sentry اختياري تماماً -- إذا لم يُكوَّن أي DSN، يتم تخطي جميع تهيئات Sentry.

## تكوين مكون Webpack الإضافي

يُكوِّن الملف `sentry.config.ts` في جذر المشروع مكون webpack الإضافي لـ Sentry المستخدم أثناء البناء:

```ts
export const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || "your-org-name",
  project: process.env.SENTRY_PROJECT || "your-project-name",

  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
};
```

### خيارات المكون الإضافي

| الخيار | الافتراضي | الوصف |
|--------|---------|--------|
| `silent` | `true` | يمنع إخراج مكون webpack الإضافي في وحدة التحكم أثناء البناء |
| `org` | متغير البيئة `SENTRY_ORG` | رمز تعريف منظمتك في Sentry |
| `project` | متغير البيئة `SENTRY_PROJECT` | رمز تعريف مشروعك في Sentry |
| `widenClientFileUpload` | `true` | يرفع مجموعة أوسع من ملفات المصدر من جانب العميل لتتبع أفضل للمكدس |
| `transpileClientSDK` | `true` | يُحوِّل SDK الخاص بـ Sentry لتوافق أوسع مع المتصفحات |
| `tunnelRoute` | `"/monitoring"` | يُوكِّل طلبات Sentry عبر تطبيقك لتجنب حاجبات الإعلانات |
| `hideSourceMaps` | `true` | يمنع إمكانية الوصول العام إلى خرائط المصدر في الإنتاج |
| `disableLogger` | `true` | يعطّل مُسجِّل Sentry لتقليل حجم الحزمة |

### التكامل مع تكوين Next.js

تُستهلك خيارات المكون الإضافي في `next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## متغيرات البيئة

يعتمد Sentry على متغيرات البيئة هذه، المعرَّفة في `lib/constants.ts`:

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| المتغير | مطلوب | الوصف |
|---------|-------|--------|
| `NEXT_PUBLIC_SENTRY_DSN` | لا | DSN الخاص بـ Sentry (اسم مصدر البيانات). إذا لم يُعيَّن، يُعطَّل Sentry. |
| `SENTRY_ORG` | لا | رمز المنظمة في Sentry لرفع خرائط المصدر |
| `SENTRY_PROJECT` | لا | رمز المشروع في Sentry لرفع خرائط المصدر |
| `SENTRY_AUTH_TOKEN` | لا | رمز المصادقة لرفع خرائط المصدر أثناء البناء |
| `SENTRY_ENABLE_DEV` | لا | اضبطه على `"true"` لتفعيل Sentry في وضع التطوير |
| `SENTRY_DEBUG` | لا | اضبطه على `"true"` لتفعيل تسجيل تصحيح أخطاء SDK الخاص بـ Sentry |

## التهيئة من جانب الخادم

يتم تهيئة Sentry من جانب الخادم في `instrumentation.ts`، الذي يُشغَّل مرة واحدة عند بدء تشغيل خادم Next.js:

```ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_DEBUG } from "@/lib/constants";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Only initialize Sentry if DSN is configured
  if (SENTRY_DSN.value) {
    Sentry.init({
      dsn: SENTRY_DSN.value,
      tracesSampleRate:
        process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: SENTRY_DEBUG.value === "true",
    });
  }

  // Database initialization follows...
}

// Capture errors from React Server Components
export const onRequestError = Sentry.captureRequestError;
```

### معدلات عينة الخادم

- **الإنتاج:** أخذ عينات التتبع بنسبة 10% (`0.1`) للتوازن بين التكلفة والرؤية
- **التطوير:** أخذ عينات التتبع بنسبة 100% (`1.0`) للرؤية الكاملة لتصحيح الأخطاء

### الإبلاغ عن الأخطاء

يتم الإبلاغ عن أخطاء تهيئة قاعدة البيانات إلى Sentry مع علامات سياقية:

```ts
if (SENTRY_DSN.value) {
  Sentry.captureException(error, {
    tags: {
      component: "instrumentation",
      phase: "database_init",
      environment:
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        "unknown",
    },
  });
}
```

## التهيئة من جانب العميل

يتم تهيئة Sentry من جانب العميل في `instrumentation-client.ts`:

```ts
import * as Sentry from "@sentry/nextjs";
import { Replay } from "@sentry/replay";
import {
  SENTRY_DSN,
  SENTRY_DEBUG,
  SENTRY_ENABLED,
} from "@/lib/constants";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || !SENTRY_ENABLED)
    return;

  Sentry.init({
    dsn: SENTRY_DSN.value,
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: SENTRY_DEBUG.value === "true",

    // Session Replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      new Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Router transition instrumentation
export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
```

### ميزات جانب العميل

يُكوَّن **إعادة تشغيل الجلسة** بإعدادات افتراضية تُركز على الخصوصية:

- `maskAllText: true` -- يُخفى كل المحتوى النصي في عمليات إعادة التشغيل
- `blockAllMedia: true` -- تُحجب جميع عناصر الوسائط في عمليات إعادة التشغيل
- تُلتقط إعادة تشغيل الأخطاء بنسبة 100% (`replaysOnErrorSampleRate: 1.0`)
- تُلتقط إعادة تشغيل الجلسات العامة بنسبة 10% في الإنتاج

يتم قياس **انتقالات الموجه** عبر `onRouterTransitionStart` لتتبع أداء التنقل بين الصفحات.

## مسار النفق

يُوكِّل خيار `tunnelRoute: "/monitoring"` إرسال أحداث Sentry عبر تطبيقك على نقطة النهاية `/monitoring`. يساعد هذا على تجاوز حاجبات الإعلانات وسياسات أمان المحتوى التي قد تحجب الطلبات المباشرة إلى خوادم Sentry.

## ملخص معدلات العينة

| المقياس | التطوير | الإنتاج |
|---------|---------|---------|
| معدل عينة التتبع (الخادم) | 100% | 10% |
| معدل عينة التتبع (العميل) | 100% | 10% |
| معدل إعادة تشغيل الأخطاء | 100% | 100% |
| معدل إعادة تشغيل الجلسات | 100% | 10% |

## تفعيل Sentry

لتفعيل Sentry في نشرك:

1. أنشئ مشروعاً في Sentry على [sentry.io](https://sentry.io)
2. اضبط متغيرات البيئة المطلوبة:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. للتطوير، اضبط أيضاً:

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## الموارد المرتبطة

- [دليل القياس](/template/guides/instrumentation) -- التوثيق الكامل لدورة حياة القياس
- [أنماط معالجة الأخطاء](/template/guides/error-handler-patterns) -- كيفية هيكلة الأخطاء وتسجيلها
- [مرجع البيئة](/template/configuration/environment-reference) -- جميع متغيرات البيئة
