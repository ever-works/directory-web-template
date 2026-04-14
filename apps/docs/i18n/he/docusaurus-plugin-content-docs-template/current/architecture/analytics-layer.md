---
id: analytics-layer
title: "שכבת אינטגרציה של Analytics"
sidebar_label: "שכבת אנליטיקס"
sidebar_position: 28
---

# שכבת אינטגרציה של Analytics

מודול האנליטיקה (`lib/analytics/index.ts`) מספק שכבת ניתוח מאוחדת המופשטת מעקב אחר אירועי PostHog, ניטור שגיאות Sentry והערכת דגלים מאחורי מחלקה אחת של `Analytics`. המודול משתמש בתבנית הסינגלטון כדי להבטיח מופע אתחול יחיד באפליקציה.

## סקירה כללית של אדריכלות

שכבת הניתוח עוטפת שני ספקים:

- **PostHog** -- מעקב אחר אירועים, צפיות בדף, זיהוי משתמש, דגלים של תכונה, הקלטת הפעלה ומעקב חריגים
- **Sentry** -- ניטור שגיאות ומעקב חריגים

שני הספקים הם אופציונליים ונשלטים באמצעות קבועי תצורת סביבה. המודול מתדרדר בחן כאשר הספקים מושבתים.

## כיתת אנליטיקס

### סינגלטון גישה

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

הייצוא `analytics` הוא סינגלטון שעבר אתחול מראש. המחלקה עצמה מיוצאת גם לשימוש בסוג:

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### אתחול

יש לקרוא לשיטת `init()` פעם אחת בצד הלקוח לפני כל קריאות מעקב:

```ts
analytics.init();
```

#### מה קורה במהלך Init

1. **שומר SSR** -- דילוג על אתחול אם `window` אינו מוגדר
2. **הגדרת PostHog** -- אם מופעלת, מאתחל את PostHog עם תצורה מרכזית
3. **הקלטת הפעלה** - מאפשר באופן מותנה הקלטת הפעלה עם מיסוך קלט
4. **דגימה** -- חל קצב דגימת אירועים (משתמשי ביטול הסכמה באופן אקראי בהתבסס על `POSTHOG_SAMPLE_RATE`)
5. **מעקב חריגים** -- מגדיר מטפלי שגיאות גלובליים של PostHog אם מוגדרים
6. **שילוב Sentry** -- קישור PostHog ו- Sentry כאשר שניהם מופעלים

#### תצורת PostHog

שיטת init בונה את תצורת PostHog מקבועים מרכזיים:

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

כאשר הקלטת הפעלה מופעלת, תצורה נוספת מתמזגת:

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

## ספקי מעקב חריגים

המודול תומך במעקב חריגים גמיש עם ארבעה מצבי ספק:

|ספק|התנהגות|
|----------|----------|
|`'posthog'`|חריגים נשלחים ל-PostHog בלבד|
|`'sentry'`|חריגים שנשלחו ל- Sentry בלבד|
|`'both'`|חריגים שנשלחו גם ל-PostHog וגם ל-Sentry|
|`'none'`|מעקב חריגים מושבת|

הספק נקבע אוטומטית בזמן הבנייה בהתבסס על התצורה `EXCEPTION_TRACKING_PROVIDER` והזמינות של כל ספק:

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

## הפניה ל-API

### זיהוי משתמש

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

השיטה `identify` מגדירה את המשתמש ב-PostHog וגם ב-Sentry בו-זמנית. השיטה `reset` מנקה זהות בשניהם.

### מעקב אחר אירועים

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

### תכונה דגלים

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

השיטה `isFeatureEnabled` מחזירה את `defaultValue` כאשר PostHog אינו מאותחל או שהדגל לא נמצא.

### מעקב חריגים

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

שיטת `captureException` מנותבת לספקים המוגדרים:

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

### מאפייני משתמש וסופר

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

## הגדרת מעקב חריגים של PostHog

כאשר מעקב חריגים PostHog מופעל, המודול מתקין מטפלי שגיאות גלובליים:

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

זה לוכד הן שגיאות סינכרוניות (`window.onerror`) והן דחיות הבטחות ללא טיפול.

## אינטגרציה של Sentry-PostHog

כאשר שני הספקים מוגדרים עם מצב `'both'`, המודול מקשר אותם יחד על ידי הוספת מעבד אירועי Sentry המעביר שגיאות ל-PostHog:

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

זה נותן לך שגיאות Sentry ב-PostHog עבור מתאם עם הפעלות משתמש.

## שומרי בטיחות

כל שיטה ציבורית כוללת שלוש בדיקות בטיחות:

1. **בדיקת אתחול** -- `if (!this.initialized)` מונעת שיחות לפני `init()`
2. **בדיקת ספק** -- `if (!POSTHOG_ENABLED)` מדלג כאשר הספק מושבת
3. **שומר SSR** -- `if (typeof window === 'undefined')` מונע שיחות בצד השרת

השומרים הללו מבטיחים שמודול האנליטיקה לעולם לא יזרוק לשום סביבה.

## קבועי תצורה

המודול קורא מקבועים מרכזיים המוגדרים ב-`lib/constants.ts`:

|קבוע|מטרה|
|----------|---------|
|`POSTHOG_KEY`|מפתח API של פרויקט PostHog|
|`POSTHOG_HOST`|כתובת האתר המארח של PostHog API|
|`POSTHOG_ENABLED`|החלפת מאסטר עבור PostHog|
|`POSTHOG_DEBUG`|אפשר רישום באגים|
|`POSTHOG_SESSION_RECORDING_ENABLED`|אפשר הקלטת הפעלה|
|`POSTHOG_AUTO_CAPTURE`|לכידה אוטומטית של תצוגות עמוד|
|`POSTHOG_SAMPLE_RATE`|קצב דגימת אירועים (0-1)|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|קצב דגימת הקלטה|
|`SENTRY_ENABLED`|החלפת מאסטר עבור Sentry|
|`EXCEPTION_TRACKING_PROVIDER`|איזה ספק מטפל בחריגים|
|`POSTHOG_EXCEPTION_TRACKING`|אפשר לכידת חריגים של PostHog|
|`SENTRY_EXCEPTION_TRACKING`|אפשר לכידת חריגים של Sentry|

## קבצי מקור

|קובץ|מטרה|
|------|---------|
|`lib/analytics/index.ts`|מחלקת יחיד של Analytics והפשטה של ספקים|
|`lib/constants.ts`|קבועי תצורה עבור כל ספקי הניתוח|
