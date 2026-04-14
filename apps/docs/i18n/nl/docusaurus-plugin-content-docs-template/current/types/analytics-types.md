---
id: analytics-types
title: Definities van analytische typen
sidebar_label: Analytics-typen
sidebar_position: 16
---

# Definities van analytische typen

**Bron:** `lib/config/schemas/analytics.schema.ts`, `lib/constants/analytics.ts`, `lib/db/schema.ts`

Analytics-typen configureren trackingproviders en definiëren de datastructuren voor betrokkenheidsstatistieken, paginaweergaven en dashboardstatistieken.

## Configuratietypen van providers

### `AnalyticsConfig`

Analyseconfiguratie op het hoogste niveau, afgeleid van het Zod-schema.

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

### PostHog-configuratie

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

|Veld|Standaard|Beschrijving|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|Eindpunt van PostHog-opname|
|`sessionRecordingEnabled`|`true`|Leg herhalingen van sessies vast|
|`autoCapture`|`false`|Houd klikken, paginaweergaven, enz. automatisch bij.|
|`exceptionTracking`|`true`|Stuur JS-uitzonderingen door naar PostHog|

### Sentry-configuratie

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

### Recaptcha-configuratie

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### Vercel Analytics-configuratie

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## Trackingconstanten voor kijkers

Gedefinieerd in `lib/constants/analytics.ts`:

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

Deze constanten vormen de drijvende kracht achter het anonieme weergavetelsysteem. Elke bezoeker ontvangt een permanente cookie die wordt gebruikt om de dagelijkse weergaveaantallen te ontdubbelen zonder dat authenticatie vereist is.

## Databaseschema: betrokkenheid

De tabel `engagement` in `lib/db/schema.ts` houdt analyses op itemniveau bij:

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

## Databaseschema: activiteitenlogboeken

In de tabel `activityLogs` worden gebruikers- en beheerdersacties vastgelegd:

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

## Selectie van provider voor het bijhouden van uitzonderingen

Het veld `exceptionTrackingProvider` bepaalt welke service onverwerkte uitzonderingen ontvangt:

|Waarde|Gedrag|
|-------|-----------|
|`posthog`|Uitzonderingen verzonden naar PostHog (standaard)|
|`sentry`|Uitzonderingen verzonden naar Sentry|
|`none`|Geen uitzondering doorsturen|

## Gebruiksvoorbeeld

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

## Gerelateerde typen

- [Config-typen](./config-types.md) -- `AppConfigSchema` met `AnalyticsConfig`
- [Configuratie / Analytics](../configuration/analytics-config.md) -- referentie van omgevingsvariabelen
