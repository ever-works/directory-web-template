---
id: analytics-layer
title: "طبقة التكامل التحليلي"
sidebar_label: "طبقة التحليلات"
sidebar_position: 28
---

# طبقة التكامل التحليلي

توفر وحدة التحليلات (`lib/analytics/index.ts`) طبقة تحليلات موحدة تلخص تتبع أحداث PostHog ومراقبة أخطاء Sentry وتقييم علامة الميزة خلف فئة `Analytics` واحدة. تستخدم الوحدة النمط الفردي لضمان وجود مثيل واحد تمت تهيئته عبر التطبيق.

## نظرة عامة على الهندسة المعمارية

تغطي طبقة التحليلات موفرين:

- **PostHog** - تتبع الأحداث، ومشاهدات الصفحة، وتحديد المستخدم، وعلامات الميزات، وتسجيل الجلسة، وتتبع الاستثناءات
- ** Sentry ** - مراقبة الأخطاء وتتبع الاستثناءات

كلا الموفرين اختياريان ويتم التحكم فيهما عبر ثوابت تكوين البيئة. تتحلل الوحدة بأمان عند تعطيل الموفرين.

## فئة التحليلات

### وصول سينجلتون

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

التصدير `analytics` عبارة عن نغمة مفردة تمت تهيئتها مسبقًا. يتم أيضًا تصدير الفئة نفسها لاستخدام النوع:

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### التهيئة

يجب استدعاء الأسلوب `init()` مرة واحدة من جانب العميل قبل إجراء أي مكالمات تتبع:

```ts
analytics.init();
```

#### ماذا يحدث أثناء Init

1. **حارس SSR** -- يتخطى التهيئة إذا كان `window` غير محدد
2. **إعداد PostHog** -- إذا تم تمكينه، فسيتم تهيئة PostHog بتكوين مركزي
3. **تسجيل الجلسة** - يتيح تسجيل الجلسة بشكل مشروط مع إخفاء الإدخال
4. ** أخذ العينات ** -- يطبق معدل أخذ عينات الحدث (المستخدمون الذين يقومون بإلغاء الاشتراك بشكل عشوائي بناءً على `POSTHOG_SAMPLE_RATE`)
5. **تتبع الاستثناءات** - يقوم بإعداد معالجات الأخطاء العامة لـ PostHog إذا تم تكوينها
6. **تكامل Sentry** - يربط PostHog وSentry عند تمكين كليهما

#### تكوين PostHog

يبني الأسلوب init تكوين PostHog من الثوابت المركزية:

```ts
const baseConfig: Partial<PostHogConfig> = {
  api_host: posthogHost,
  debug: POSTHOG_DEBUG.value === 'true',
  persistence: 'localStorage',
  capture_pageview: POSTHOG_AUTO_CAPTURE.value === 'true',
  capture_pageleave: true,
  enable_recording_console_log: POSTHOG_DEBUG.value === 'true',
  mask_all_element_attributes: false,
  mask_all_text: false,
  loaded: (posthog) => {
    if (POSTHOG_SAMPLE_RATE < 1) {
      if (Math.random() > POSTHOG_SAMPLE_RATE) {
        posthog.opt_out_capturing();
      }
    }
  },
};
```

عند تمكين تسجيل الجلسة، يتم دمج التكوين الإضافي:

```ts
const config = POSTHOG_SESSION_RECORDING_ENABLED.value === 'true'
  ? {
      ...baseConfig,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-mask]',
        sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
      },
    }
  : baseConfig;
```

## موفري تتبع الاستثناءات

تدعم الوحدة تتبع الاستثناءات المرن من خلال أربعة أوضاع للموفر:

|مزود|السلوك|
|----------|----------|
|`'posthog'`|تم إرسال الاستثناءات إلى PostHog فقط|
|`'sentry'`|الاستثناءات المرسلة إلى Sentry فقط|
|`'both'`|تم إرسال الاستثناءات إلى كل من PostHog وSentry|
|`'none'`|تم تعطيل تتبع الاستثناء|

يتم تحديد الموفر تلقائيًا في وقت الإنشاء استنادًا إلى تكوين `EXCEPTION_TRACKING_PROVIDER` ومدى توفر كل موفر:

```ts
private determineExceptionTrackingProvider(): ExceptionTrackingProvider {
  const provider = EXCEPTION_TRACKING_PROVIDER.value;

  // Validate availability and fall back gracefully
  if (provider === 'sentry' && !SENTRY_ENABLED) {
    return POSTHOG_ENABLED ? 'posthog' : 'none';
  }

  if (provider === 'posthog' && !POSTHOG_ENABLED) {
    return SENTRY_ENABLED ? 'sentry' : 'none';
  }

  // For 'both', check what's actually available
  if (provider === 'both') {
    const sentryAvailable = SENTRY_ENABLED;
    const posthogAvailable = POSTHOG_ENABLED;
    if (!sentryAvailable && !posthogAvailable) return 'none';
    if (!sentryAvailable) return 'posthog';
    if (!posthogAvailable) return 'sentry';
  }

  return provider;
}
```

## مرجع واجهة برمجة التطبيقات

### تحديد هوية المستخدم

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

تقوم الطريقة `identify` بتعيين المستخدم في كل من PostHog وSentry في وقت واحد. تقوم الطريقة `reset` بمسح الهوية في كليهما.

### تتبع الأحداث

```ts
// Track a custom event
analytics.track('checkout_started', {
  plan: 'pro',
  source: 'pricing_page',
});

// Track a page view
analytics.trackPageView('/pricing', {
  referrer: document.referrer,
});
```

### أعلام مميزة

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

تقوم الطريقة `isFeatureEnabled` بإرجاع `defaultValue` عند عدم تهيئة PostHog أو عدم العثور على العلامة.

### تتبع الاستثناء

```ts
// Capture an exception
analytics.captureException(new Error('Something went wrong'), {
  component: 'PaymentForm',
  action: 'submit',
});

// Capture from a string
analytics.captureException('Unexpected response format', {
  endpoint: '/api/data',
});
```

يقوم الأسلوب `captureException` بتوجيه الموفر (الموفرين) الذي تم تكوينه:

```ts
captureException(error: Error | string, context?: Record<string, any>) {
  const errorObject =
    typeof error === 'string' ? new Error(error) : error;

  // Send to PostHog
  if (POSTHOG_ENABLED && (provider === 'posthog' || provider === 'both')) {
    this.track('$exception', {
      $exception_message: errorObject.message,
      $exception_type: errorObject.name,
      $exception_stack_trace_raw: errorObject.stack,
      $exception_handled: true,
      ...context,
    });
  }

  // Send to Sentry
  if (SENTRY_ENABLED && (provider === 'sentry' || provider === 'both')) {
    Sentry.captureException(errorObject, {
      extra: context,
    });
  }
}
```

### المستخدم والخصائص الفائقة

```ts
// Set persistent user properties
analytics.setUserProperties({
  plan: 'pro',
  company: 'Acme Inc',
});

// Set super properties (sent with every event)
analytics.setSuperProperties({
  app_version: '1.0.0',
  environment: 'production',
});
```

## إعداد تتبع استثناء PostHog

عند تمكين تتبع استثناء PostHog، تقوم الوحدة بتثبيت معالجات الأخطاء العامة:

```ts
private setupPostHogExceptionTracking() {
  // Override window.onerror
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    this.captureException(error || new Error(String(message)), {
      source,
      lineno,
      colno,
      type: 'window.onerror',
    });
    // Chain to original handler
    if (typeof originalOnError === 'function') {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    this.captureException(
      new Error(event.reason?.message || String(event.reason)),
      { type: 'unhandledrejection' }
    );
  });
}
```

يلتقط هذا كلاً من الأخطاء المتزامنة (`window.onerror`) ورفض الوعد غير المعالج.

## التكامل بين الحراسة و PostHog

عندما يتم تكوين كلا الموفرين باستخدام الوضع `'both'`، تقوم الوحدة بربطهما معًا عن طريق إضافة معالج حدث Sentry الذي يعيد توجيه الأخطاء إلى PostHog:

```ts
Sentry.addIntegration({
  name: 'PostHog',
  setupOnce() {
    Sentry.addEventProcessor((event) => {
      if (event.user) {
        posthog.capture('sentry_error', {
          error: event.message,
          error_id: event.event_id,
          error_type: event.type,
          error_context: event.contexts,
          error_tags: event.tags,
        });
      }
      return event;
    });
  },
});
```

يمنحك هذا أخطاء Sentry في PostHog للارتباط بجلسات المستخدم.

## حراس السلامة

تتضمن كل طريقة عامة ثلاثة فحوصات للسلامة:

1. **التحقق من التهيئة** -- `if (!this.initialized)` يمنع المكالمات قبل `init()`
2. **التحقق من الموفر** - يتم تخطي `if (!POSTHOG_ENABLED)` عند تعطيل الموفر
3. **حارس SSR** -- `if (typeof window === 'undefined')` يمنع المكالمات من جانب الخادم

يضمن هؤلاء الحراس عدم ظهور وحدة التحليلات في أي بيئة.

## ثوابت التكوين

تقرأ الوحدة من الثوابت المركزية المحددة في `lib/constants.ts`:

|ثابت|الغرض|
|----------|---------|
|`POSTHOG_KEY`|مفتاح API لمشروع PostHog|
|`POSTHOG_HOST`|عنوان URL لمضيف PostHog API|
|`POSTHOG_ENABLED`|تبديل رئيسي لـ PostHog|
|`POSTHOG_DEBUG`|تمكين تسجيل التصحيح|
|`POSTHOG_SESSION_RECORDING_ENABLED`|تمكين تسجيل الجلسة|
|`POSTHOG_AUTO_CAPTURE`|التقاط تلقائي لمشاهدات الصفحة|
|`POSTHOG_SAMPLE_RATE`|معدل أخذ عينات الحدث (0-1)|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|تسجيل معدل أخذ العينات|
|`SENTRY_ENABLED`|تبديل رئيسي لـ Sentry|
|`EXCEPTION_TRACKING_PROVIDER`|الموفر الذي يتعامل مع الاستثناءات|
|`POSTHOG_EXCEPTION_TRACKING`|تمكين التقاط استثناء PostHog|
|`SENTRY_EXCEPTION_TRACKING`|تمكين التقاط استثناء الحراسة|

## ملفات المصدر

|ملف|الغرض|
|------|---------|
|`lib/analytics/index.ts`|فئة التحليلات المفردة وتجريد الموفر|
|`lib/constants.ts`|ثوابت التكوين لجميع موفري التحليلات|
