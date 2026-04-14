---
id: analytics-types
title: הגדרות סוג אנליטיקה
sidebar_label: סוגי אנליטיקס
sidebar_position: 16
---

# הגדרות סוג אנליטיקה

**מקור:** `lib/config/schemas/analytics.schema.ts`, `lib/constants/analytics.ts`, `lib/db/schema.ts`

סוגי אנליטיקס מגדירים ספקי מעקב ומגדירים את מבני הנתונים עבור מדדי מעורבות, צפיות בעמודים וסטטיסטיקות לוח מחוונים.

## סוגי תצורת ספקים

### `AnalyticsConfig`

תצורת אנליטיקה ברמה העליונה, המסיקה מסכימת Zod.

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

### תצורת PostHog

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

|שדה|ברירת מחדל|תיאור|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|נקודת קצה בליעה של PostHog|
|`sessionRecordingEnabled`|`true`|לכידת שידורים חוזרים של הפעלה|
|`autoCapture`|`false`|מעקב אוטומטי אחר קליקים, צפיות בדף וכו'.|
|`exceptionTracking`|`true`|העבר חריגים של JS ל-PostHog|

### תצורת זקיף

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

### תצורת Recaptcha

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### תצורת Vercel Analytics

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## קבועי מעקב אחר צופים

מוגדר ב-`lib/constants/analytics.ts`:

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

קבועים אלה מחזקים את מערכת ספירת הצפיות האנונימית. כל מבקר מקבל קובץ Cookie מתמשך המשמש לביטול כפילות של ספירות צפיות יומיות ללא צורך באימות.

## סכמת מסד נתונים: מעורבות

הטבלה `engagement` ב-`lib/db/schema.ts` עוקבת אחר ניתוח ברמת הפריט:

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

## סכמת מסד נתונים: יומני פעילות

הטבלה `activityLogs` מתעדת פעולות משתמש ומנהל:

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

## בחירת ספק מעקב חריג

השדה `exceptionTrackingProvider` קובע איזה שירות מקבל חריגים לא מטופלים:

|ערך|התנהגות|
|-------|-----------|
|`posthog`|חריגים שנשלחו ל-PostHog (ברירת מחדל)|
|`sentry`|חריגים שנשלחו ל- Sentry|
|`none`|אין העברת חריגה|

## דוגמה לשימוש

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

## סוגים קשורים

- [Config Types](./config-types.md) -- `AppConfigSchema` המכיל `AnalyticsConfig`
- [Configuration / Analytics](../configuration/analytics-config.md) -- התייחסות למשתנה סביבה
