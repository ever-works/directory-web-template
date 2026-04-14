---
id: analytics-types
title: Definicje typów analiz
sidebar_label: Typy analityczne
sidebar_position: 16
---

# Definicje typów analiz

**Źródło:** `lib/config/schemas/analytics.schema.ts`, `lib/constants/analytics.ts`, `lib/db/schema.ts`

Typy analityczne konfigurują dostawców śledzenia i definiują struktury danych dla wskaźników zaangażowania, odsłon stron i statystyk pulpitu nawigacyjnego.

## Typy konfiguracji dostawcy

### `AnalyticsConfig`

Konfiguracja analityczna najwyższego poziomu, wywnioskowana ze schematu Zoda.

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

### Konfiguracja PostHoga

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

|Pole|Domyślne|Opis|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|Punkt końcowy pozyskiwania PostHog|
|`sessionRecordingEnabled`|`true`|Przechwytuj powtórki sesji|
|`autoCapture`|`false`|Automatyczne śledzenie kliknięć, odsłon stron itp.|
|`exceptionTracking`|`true`|Przekaż wyjątki JS do PostHog|

### Konfiguracja wartownika

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

### Konfiguracja Recaptchy

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### Konfiguracja Vercel Analytics

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## Stałe śledzenia widzów

Zdefiniowane w `lib/constants/analytics.ts`:

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

Te stałe zasilają anonimowy system zliczania wyświetleń. Każdy odwiedzający otrzymuje trwały plik cookie używany do deduplikacji dziennej liczby wyświetleń bez konieczności uwierzytelniania.

## Schemat bazy danych: zaangażowanie

Tabela `engagement` w `lib/db/schema.ts` śledzi statystyki na poziomie pozycji:

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

## Schemat bazy danych: dzienniki aktywności

Tabela `activityLogs` rejestruje działania użytkowników i administratorów:

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

## Wybór dostawcy śledzenia wyjątków

Pole `exceptionTrackingProvider` określa, która usługa otrzyma nieobsługiwane wyjątki:

|Wartość|Zachowanie|
|-------|-----------|
|`posthog`|Wyjątki wysyłane do PostHog (domyślnie)|
|`sentry`|Wyjątki wysłane do Sentry|
|`none`|Brak przekazywania wyjątków|

## Przykład użycia

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

## Powiązane typy

- [Typy konfiguracji](./config-types.md) -- `AppConfigSchema` zawierający `AnalyticsConfig`
- [Konfiguracja / Analityka](../configuration/analytics-config.md) -- odwołanie do zmiennej środowiskowej
