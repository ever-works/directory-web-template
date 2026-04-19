---
id: analytics-types
title: Дефиниции на типа анализ
sidebar_label: Видове анализи
sidebar_position: 16
---

# Дефиниции на типа анализ

**Източник:** `lib/config/schemas/analytics.schema.ts`, `lib/constants/analytics.ts`, `lib/db/schema.ts`

Типовете анализи конфигурират доставчиците на проследяване и дефинират структурите на данни за показатели за ангажираност, изгледи на страници и статистически данни на таблото.

## Типове конфигурация на доставчика

### `AnalyticsConfig`

Конфигурация за анализ от най-високо ниво, изведена от схемата на Zod.

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

### Конфигурация на PostHog

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

|Поле|По подразбиране|Описание|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|Крайна точка за приемане на PostHog|
|`sessionRecordingEnabled`|`true`|Заснемане на повторения на сесии|
|`autoCapture`|`false`|Автоматично проследяване на кликвания, показвания на страници и др.|
|`exceptionTracking`|`true`|Препращане на JS изключения към PostHog|

### Конфигурация на караул

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

### Конфигурация на Recaptcha

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### Конфигурация на Vercel Analytics

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## Константи за проследяване на зрителя

Дефинирано в `lib/constants/analytics.ts`:

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

Тези константи захранват системата за анонимно отчитане на гледанията. Всеки посетител получава постоянна бисквитка, използвана за дедупликация на дневния брой показвания, без да се изисква удостоверяване.

## Схема на базата данни: Ангажираност

Таблицата `engagement` в `lib/db/schema.ts` проследява анализи на ниво артикул:

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

## Схема на базата данни: Регистри на дейността

Таблицата `activityLogs` записва потребителски и администраторски действия:

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

## Избор на доставчик на проследяване на изключения

Полето `exceptionTrackingProvider` определя коя услуга получава необработени изключения:

|Стойност|Поведение|
|-------|-----------|
|`posthog`|Изключения, изпратени до PostHog (по подразбиране)|
|`sentry`|Изключенията са изпратени до Sentry|
|`none`|Препращане без изключение|

## Пример за използване

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

## Свързани типове

- [Типове конфигурации](./config-types.md) -- `AppConfigSchema` съдържащ `AnalyticsConfig`
- [Конфигурация / Анализ](../configuration/analytics-config.md) -- препратка към променливата на средата
