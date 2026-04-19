---
id: config-types
title: Konfigurationstypdefinitionen
sidebar_label: Konfigurationstypen
sidebar_position: 17
---

# Konfigurationstypdefinitionen

**Quelle:** `lib/config/types.ts`, `lib/config/feature-flags.ts`, `lib/config/schemas/*.ts`

Das Konfigurationssystem verwendet Zod-Schemas, um Umgebungsvariablen beim Start zu validieren. Jeder Konfigurationsabschnitt verfügt über ein eigenes Schema, das ein typisiertes Konfigurationsobjekt erzeugt.

## Kerntypen

### `AppConfigSchema`

Die kombinierte Anwendungskonfiguration, bestehend aus allen Abschnittstypen.

```typescript
interface AppConfigSchema {
  core: CoreConfig;
  auth: AuthConfig;
  email: EmailConfig;
  payment: PaymentConfig;
  analytics: AnalyticsConfig;
  integrations: IntegrationsConfig;
}
```

### `ConfigSection`

Vereinigung gültiger Konfigurationsabschnittsnamen.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

Hilfstyp zum Extrahieren eines bestimmten Abschnittstyps.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

Knotenumgebungstyp.

```typescript
type Environment = 'development' | 'production' | 'test';
```

## Abschnittstypen

### `CoreConfig`

Grundlegende Anwendungseinstellungen.

```typescript
interface CoreConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL?: string;
  APP_URL: string;           // Default: 'http://localhost:3000'
  SITE_URL?: string;
  API_BASE_URL?: string;
  SITE_NAME: string;         // Default: 'Ever Works'
  BRAND_NAME: string;        // Default: 'Ever Works'
  SITE_TAGLINE?: string;
  SITE_DESCRIPTION?: string;
  SITE_KEYWORDS: string[];
  SITE_LOGO: string;         // Default: '/logo-ever-works.svg'
  DEMO_MODE: boolean;
  DISABLE_AUTO_SYNC: boolean;
  ogTheme: { gradientStart: string; gradientEnd: string };
  socialLinks: {
    github?: string; x?: string; linkedin?: string;
    facebook?: string; blog?: string; email?: string;
  };
  attribution: { url?: string; name?: string };
  content: {
    dataRepository?: string; ghToken?: string;
    githubToken?: string; githubBranch: string;
  };
}
```

### `PaymentConfig`

Zahlungsanbieter und Preiseinstellungen. Informationen zu Typen auf Transaktionsebene finden Sie unter [Zahlungsarten](./ payment-types.md).

```typescript
interface PaymentConfig {
  pricing: { free: number; standard: number; premium: number };
  trial: {
    standardTrialAmountId?: string;
    premiumTrialAmountId?: string;
    authorized: boolean;
  };
  stripe: { enabled: boolean; secretKey?: string; publishableKey?: string; webhookSecret?: string; /* ... */ };
  lemonSqueezy: { enabled: boolean; apiKey?: string; storeId?: string; testMode: boolean; /* ... */ };
  polar: { enabled: boolean; accessToken?: string; organizationId?: string; sandbox: boolean; /* ... */ };
}
```

### `IntegrationsConfig`

Integrationseinstellungen von Drittanbietern.

```typescript
interface IntegrationsConfig {
  triggerDev: {
    enabled: boolean;
    apiKey?: string;
    apiUrl?: string;
    environment: 'development' | 'staging' | 'production';
  };
  twentyCrm: {
    enabled: boolean;
    baseUrl?: string;
    apiKey?: string;
    syncMode: 'disabled' | 'platform' | 'direct_crm';
  };
  cron: { secret?: string };
}
```

## Validierungstypen

### `ConfigValidationResult`

Wird vom Konfigurationsvalidierungssystem zurückgegeben.

```typescript
interface ConfigValidationResult {
  success: boolean;
  config: AppConfigSchema | null;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}
```

### `ConfigValidationError`

```typescript
interface ConfigValidationError {
  path: string;      // Dot-notation path (e.g., 'payment.stripe.secretKey')
  message: string;   // Human-readable error
  code: string;      // Zod error code
}
```

### `ConfigValidationWarning`

```typescript
interface ConfigValidationWarning {
  path: string;
  message: string;
}
```

## Feature-Flags

### `FeatureFlags`

Boolesche Flags für datenbankabhängige Funktionen.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

Alle Flags sind `true`, wenn `DATABASE_URL` konfiguriert ist, andernfalls `false`.

|Funktion|Beschreibung|
|----------|-------------|
|`getFeatureFlags()`|Gibt das vollständige `FeatureFlags`-Objekt zurück|
|`isFeatureEnabled(name)`|Überprüft ein einzelnes Feature|
|`getDisabledFeatures()`|Listet die Namen deaktivierter Funktionen auf|
|`getEnabledFeatures()`|Listet aktivierte Funktionsnamen auf|
|`areAllFeaturesEnabled()`|Gibt `true` zurück, wenn alle Funktionen aktiviert sind|

## Umwelthelfer

|Funktion|Rückkehr|Beschreibung|
|----------|--------|-------------|
|`isDevelopment()`|`boolean`|`NODE_ENV === 'development'`|
|`isProduction()`|`boolean`|`NODE_ENV === 'production'`|
|`isTest()`|`boolean`|`NODE_ENV === 'test'`|
|`getEnvironment()`|`Environment`|Gibt die aktuelle Umgebung zurück|

## Anwendungsbeispiel

```typescript
import { coreConfig, paymentConfig } from '@/lib/config/config-service';
import { isFeatureEnabled } from '@/lib/config/feature-flags';

// Access typed config
console.log(coreConfig.SITE_NAME);

// Check payment provider
if (paymentConfig.stripe.enabled) {
  // Stripe is configured
}

// Check feature flag
if (isFeatureEnabled('comments')) {
  // Show comments section
}
```

## Verwandte Typen

- [Analytics-Typen](./analytics-types.md) – `AnalyticsConfig` Details
- [Auth-Typen](./auth-types.md) – `AuthConfig` Details
- [Konfiguration/Umgebung](../configuration/environment-reference.md) – vollständige Umgebungsvariablenreferenz
