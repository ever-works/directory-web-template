---
id: analytics-types
title: تعريفات نوع التحليلات
sidebar_label: أنواع التحليلات
sidebar_position: 16
---

# تعريفات نوع التحليلات

**المصدر:** `lib/config/schemas/analytics.schema.ts`، `lib/constants/analytics.ts`، `lib/db/schema.ts`

تقوم أنواع التحليلات بتكوين موفري التتبع وتحديد هياكل البيانات لمقاييس المشاركة ومرات مشاهدة الصفحة وإحصائيات لوحة المعلومات.

## أنواع تكوين الموفر

### `AnalyticsConfig`

تكوين التحليلات ذات المستوى الأعلى، المستنتج من مخطط Zod.

```typescript
interface AnalyticsConfig {
  exceptionTrackingProvider: 'posthog' | 'sentry' | 'none';
  analyze: boolean;
  posthog: PostHogConfig;
  sentry: SentryConfig;
  recaptcha: RecaptchaConfig;
  vercel: VercelAnalyticsConfig;
}
```

### تكوين PostHog

```typescript
interface PostHogConfig {
  enabled: boolean;                   // Auto-detected from key presence
  key?: string;                        // NEXT_PUBLIC_POSTHOG_KEY
  host: string;                        // Default: 'https://us.i.posthog.com'
  debug: boolean;
  sessionRecordingEnabled: boolean;    // Default: true
  autoCapture: boolean;                // Default: false
  exceptionTracking: boolean;          // Default: true
  personalApiKey?: string;             // Server-side API key for admin
  projectId?: string;                  // PostHog project identifier
}
```

|الميدان|الافتراضي|الوصف|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|نقطة نهاية ابتلاع PostHog|
|`sessionRecordingEnabled`|`true`|التقاط إعادات الجلسة|
|`autoCapture`|`false`|التتبع التلقائي للنقرات ومشاهدات الصفحة وما إلى ذلك.|
|`exceptionTracking`|`true`|إعادة توجيه استثناءات JS إلى PostHog|

### تكوين الحراسة

```typescript
interface SentryConfig {
  enabled: boolean;           // Auto-detected from DSN presence
  dsn?: string;
  org?: string;
  project?: string;
  authToken?: string;
  enableDev: boolean;         // Default: false
  debug: boolean;             // Default: false
  exceptionTracking: boolean; // Default: true
}
```

### تكوين Recaptcha

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### تكوين تحليلات Vercel

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## ثوابت تتبع المشاهد

محدد في `lib/constants/analytics.ts`:

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

تعمل هذه الثوابت على تشغيل نظام عد المشاهدات المجهول. يتلقى كل زائر ملف تعريف ارتباط دائم يستخدم لإلغاء تكرار عدد مرات المشاهدة اليومية دون الحاجة إلى المصادقة.

## مخطط قاعدة البيانات: المشاركة

يتتبع الجدول `engagement` في `lib/db/schema.ts` التحليلات على مستوى العنصر:

```typescript
// Key columns from the engagement table
{
  id: serial,
  itemId: text,             // Item slug or ID
  viewCount: integer,       // Total page views
  uniqueViewCount: integer, // Unique daily viewers
  clickCount: integer,      // Outbound link clicks
  shareCount: integer,      // Social share actions
  lastViewedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

## مخطط قاعدة البيانات: سجلات النشاط

يسجل الجدول `activityLogs` إجراءات المستخدم والمسؤول:

```typescript
{
  id: serial,
  userId: text,        // FK -> users.id (admin actions)
  clientId: text,      // FK -> clientProfiles.id (client actions)
  action: text,        // Action identifier string
  timestamp: timestamp,
  ipAddress: varchar(45),
}
```

## اختيار موفر تتبع الاستثناء

يحدد الحقل `exceptionTrackingProvider` الخدمة التي تتلقى الاستثناءات غير المعالجة:

|القيمة|السلوك|
|-------|-----------|
|`posthog`|الاستثناءات المرسلة إلى PostHog (افتراضي)|
|`sentry`|تم إرسال الاستثناءات إلى Sentry|
|`none`|لا يوجد استثناء الشحن|

## مثال الاستخدام

```typescript
import { analyticsConfig } from '@/lib/config/config-service';

// Check if PostHog is configured
if (analyticsConfig.posthog.enabled) {
  // Initialise PostHog client
}

// Check exception tracking provider
if (analyticsConfig.exceptionTrackingProvider === 'sentry') {
  // Initialise Sentry
}
```

## الأنواع ذات الصلة

- [أنواع التكوين](./config-types.md) -- `AppConfigSchema` تحتوي على `AnalyticsConfig`
- [التكوين / التحليلات](../configuration/analytics-config.md) - مرجع متغير البيئة
