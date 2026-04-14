---
id: analytics-types
title: Analytics-Typdefinitionen
sidebar_label: Analytics-Typen
sidebar_position: 16
---

# Analytics-Typdefinitionen

**Quelle:** `lib/config/schemas/analytics.schema.ts`, `lib/constants/analytics.ts`, `lib/db/schema.ts`

Analysetypen konfigurieren Tracking-Anbieter und definieren die Datenstrukturen für Engagement-Metriken, Seitenaufrufe und Dashboard-Statistiken.

## Anbieterkonfigurationstypen

### `AnalyticsConfig`

Analysekonfiguration der obersten Ebene, abgeleitet aus dem Zod-Schema.

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

### PostHog-Konfiguration

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

|Feld|Standard|Beschreibung|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|PostHog-Aufnahmeendpunkt|
|`sessionRecordingEnabled`|`true`|Erfassen Sie Sitzungswiederholungen|
|`autoCapture`|`false`|Klicks, Seitenaufrufe usw. automatisch verfolgen.|
|`exceptionTracking`|`true`|Leiten Sie JS-Ausnahmen an PostHog weiter|

### Sentry-Konfiguration

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

### Recaptcha-Konfiguration

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### Vercel Analytics-Konfiguration

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## Viewer-Tracking-Konstanten

Definiert in `lib/constants/analytics.ts`:

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

Diese Konstanten treiben das anonyme Aufrufzählsystem voran. Jeder Besucher erhält ein dauerhaftes Cookie, das zur Deduplizierung der täglichen Aufrufzahlen verwendet wird, ohne dass eine Authentifizierung erforderlich ist.

## Datenbankschema: Engagement

Die Tabelle `engagement` in `lib/db/schema.ts` verfolgt Analysen auf Elementebene:

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

## Datenbankschema: Aktivitätsprotokolle

Die Tabelle `activityLogs` zeichnet Benutzer- und Administratoraktionen auf:

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

## Auswahl des Ausnahmeverfolgungsanbieters

Das Feld `exceptionTrackingProvider` bestimmt, welcher Dienst nicht behandelte Ausnahmen erhält:

|Wert|Verhalten|
|-------|-----------|
|`posthog`|An PostHog gesendete Ausnahmen (Standard)|
|`sentry`|An Sentry gesendete Ausnahmen|
|`none`|Keine Ausnahmeweiterleitung|

## Anwendungsbeispiel

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

## Verwandte Typen

- [Konfigurationstypen](./config-types.md) – `AppConfigSchema` enthält `AnalyticsConfig`
- [Konfiguration/Analyse](../configuration/analytics-config.md) – Umgebungsvariablenreferenz
