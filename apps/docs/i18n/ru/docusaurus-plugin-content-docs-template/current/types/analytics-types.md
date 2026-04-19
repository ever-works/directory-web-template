---
id: analytics-types
title: Определения типов аналитики
sidebar_label: Типы аналитики
sidebar_position: 16
---

# Определения типов аналитики

**Источник:** `lib/config/schemas/analytics.schema.ts`, `lib/constants/analytics.ts`, `lib/db/schema.ts`

Типы аналитики настраивают поставщиков отслеживания и определяют структуры данных для показателей взаимодействия, просмотров страниц и статистики информационной панели.

## Типы конфигурации поставщика

### `AnalyticsConfig`

Конфигурация аналитики верхнего уровня, полученная из схемы Zod.

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

### Конфигурация PostHog

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

|Поле|По умолчанию|Описание|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|Конечная точка приема PostHog|
|`sessionRecordingEnabled`|`true`|Захват повторов сеансов|
|`autoCapture`|`false`|Автоматическое отслеживание кликов, просмотров страниц и т. д.|
|`exceptionTracking`|`true`|Переслать исключения JS в PostHog|

### Конфигурация караула

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

### Конфигурация рекапчи

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### Конфигурация Vercel Analytics

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## Константы отслеживания зрителей

Определено в `lib/constants/analytics.ts`:

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

Эти константы приводят в действие анонимную систему подсчета просмотров. Каждый посетитель получает постоянный файл cookie, используемый для дедупликации ежедневного количества просмотров без необходимости аутентификации.

## Схема базы данных: взаимодействие

Таблица `engagement` в `lib/db/schema.ts` отслеживает аналитику на уровне элементов:

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

## Схема базы данных: журналы активности

В таблице `activityLogs` фиксируются действия пользователя и администратора:

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

## Выбор поставщика отслеживания исключений

Поле `exceptionTrackingProvider` определяет, какая служба получает необработанные исключения:

|Значение|Поведение|
|-------|-----------|
|`posthog`|Исключения, отправляемые в PostHog (по умолчанию)|
|`sentry`|Исключения, отправленные в Sentry|
|`none`|Без пересылки исключений|

## Пример использования

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

## Связанные типы

- [Типы конфигураций](./config-types.md) -- `AppConfigSchema`, содержащие `AnalyticsConfig`
- [Конфигурация/Аналитика](../configuration/analytics-config.md) — ссылка на переменную среды
