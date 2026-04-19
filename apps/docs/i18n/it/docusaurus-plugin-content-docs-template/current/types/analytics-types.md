---
id: analytics-types
title: Definizioni dei tipi di analisi
sidebar_label: Tipi di analisi
sidebar_position: 16
---

# Definizioni dei tipi di analisi

**Fonte:** `lib/config/schemas/analytics.schema.ts`, `lib/constants/analytics.ts`, `lib/db/schema.ts`

I tipi di analisi configurano i fornitori di monitoraggio e definiscono le strutture dei dati per le metriche di coinvolgimento, le visualizzazioni di pagina e le statistiche del dashboard.

## Tipi di configurazione del provider

### `AnalyticsConfig`

Configurazione analitica di primo livello, dedotta dallo schema Zod.

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

### Configurazione PostHog

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

|Campo|Predefinito|Descrizione|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|Endpoint di importazione PostHog|
|`sessionRecordingEnabled`|`true`|Cattura i replay della sessione|
|`autoCapture`|`false`|Monitoraggio automatico di clic, visualizzazioni di pagina, ecc.|
|`exceptionTracking`|`true`|Inoltra le eccezioni JS a PostHog|

### Configurazione della sentinella

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

### Configurazione Recaptcha

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### Configurazione di Vercel Analytics

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## Costanti di monitoraggio del visualizzatore

Definito in `lib/constants/analytics.ts`:

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

Queste costanti alimentano il sistema anonimo di conteggio delle visualizzazioni. Ogni visitatore riceve un cookie persistente utilizzato per deduplicare i conteggi delle visualizzazioni giornaliere senza richiedere l'autenticazione.

## Schema del database: coinvolgimento

La tabella `engagement` in `lib/db/schema.ts` tiene traccia dell'analisi a livello di articolo:

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

## Schema del database: registri delle attività

La tabella `activityLogs` registra le azioni dell'utente e dell'amministratore:

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

## Selezione del fornitore di monitoraggio delle eccezioni

Il campo `exceptionTrackingProvider` determina quale servizio riceve le eccezioni non gestite:

|Valore|Comportamento|
|-------|-----------|
|`posthog`|Eccezioni inviate a PostHog (impostazione predefinita)|
|`sentry`|Eccezioni inviate a Sentry|
|`none`|Nessun inoltro di eccezioni|

## Esempio di utilizzo

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

## Tipi correlati

- [Tipi di configurazione](./config-types.md) -- `AppConfigSchema` contenente `AnalyticsConfig`
- [Configurazione/Analitica](../configuration/analytics-config.md) -- riferimento alla variabile di ambiente
