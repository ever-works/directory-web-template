---
id: analytics-types
title: Définitions des types d'analyse
sidebar_label: Types d'analyses
sidebar_position: 16
---

# Définitions des types d'analyse

**Source :** `lib/config/schemas/analytics.schema.ts`, `lib/constants/analytics.ts`, `lib/db/schema.ts`

Les types d'analyse configurent les fournisseurs de suivi et définissent les structures de données pour les mesures d'engagement, les pages vues et les statistiques du tableau de bord.

## Types de configuration du fournisseur

### `AnalyticsConfig`

Configuration d'analyse de haut niveau, déduite du schéma Zod.

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

### Configuration PostHog

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

|Champ|Par défaut|Descriptif|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|Point de terminaison d’ingestion PostHog|
|`sessionRecordingEnabled`|`true`|Capturer les rediffusions de sessions|
|`autoCapture`|`false`|Suivi automatique des clics, des pages vues, etc.|
|`exceptionTracking`|`true`|Transférer les exceptions JS à PostHog|

### Configuration de la sentinelle

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

### Configuration de Recaptcha

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### Configuration de Vercel Analytics

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## Constantes de suivi des spectateurs

Défini dans `lib/constants/analytics.ts` :

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

Ces constantes alimentent le système de comptage de vues anonyme. Chaque visiteur reçoit un cookie persistant utilisé pour dédupliquer le nombre de vues quotidiennes sans nécessiter d'authentification.

## Schéma de base de données : engagement

La table `engagement` dans `lib/db/schema.ts` suit les analyses au niveau des éléments :

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

## Schéma de base de données : journaux d'activité

La table `activityLogs` enregistre les actions des utilisateurs et des administrateurs :

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

## Sélection du fournisseur de suivi des exceptions

Le champ `exceptionTrackingProvider` détermine quel service reçoit les exceptions non gérées :

|Valeur|Comportement|
|-------|-----------|
|`posthog`|Exceptions envoyées à PostHog (par défaut)|
|`sentry`|Exceptions envoyées à Sentry|
|`none`|Pas de transfert d'exception|

## Exemple d'utilisation

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

## Types associés

- [Types de configuration](./config-types.md) -- `AppConfigSchema` contenant `AnalyticsConfig`
- [Configuration / Analytics](../configuration/analytics-config.md) -- référence des variables d'environnement
