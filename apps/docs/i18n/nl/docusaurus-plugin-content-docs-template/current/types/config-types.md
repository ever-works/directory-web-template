---
id: config-types
title: Definities van configuratietypes
sidebar_label: Configuratietypen
sidebar_position: 17
---

# Definities van configuratietypes

**Bron:** `lib/config/types.ts`, `lib/config/feature-flags.ts`, `lib/config/schemas/*.ts`

Het configuratiesysteem gebruikt Zod-schema's om omgevingsvariabelen bij het opstarten te valideren. Elke configuratiesectie heeft een speciaal schema dat een getypt configuratieobject produceert.

## Kerntypen

### `AppConfigSchema`

De gecombineerde applicatieconfiguratie, samengesteld uit alle sectietypen.

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

Unie van geldige namen van configuratiesecties.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

Helpertype om een specifiek sectietype te extraheren.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

Knooppuntomgevingstype.

```typescript
type Environment = 'development' | 'production' | 'test';
```

## Sectietypen

### `CoreConfig`

Essentiële applicatie-instellingen.

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

Betalingsprovider en prijsinstellingen. Zie [Betalingstypen](./betalingstypes.md) voor typen op transactieniveau.

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

Integratie-instellingen van derden.

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

## Validatietypen

### `ConfigValidationResult`

Geretourneerd door het configuratievalidatiesysteem.

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

## Functievlaggen

### `FeatureFlags`

Booleaanse vlaggen voor database-afhankelijke functies.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

Alle vlaggen zijn `true` als `DATABASE_URL` is geconfigureerd, anders `false`.

|Functie|Beschrijving|
|----------|-------------|
|`getFeatureFlags()`|Retourneert het volledige `FeatureFlags`-object|
|`isFeatureEnabled(name)`|Controleert een enkele functie|
|`getDisabledFeatures()`|Geeft namen van uitgeschakelde functies weer|
|`getEnabledFeatures()`|Geeft ingeschakelde functienamen weer|
|`areAllFeaturesEnabled()`|Retourneert `true` als alle functies zijn ingeschakeld|

## Milieuhelpers

|Functie|Keer terug|Beschrijving|
|----------|--------|-------------|
|`isDevelopment()`|`boolean`|`NODE_ENV === 'development'`|
|`isProduction()`|`boolean`|`NODE_ENV === 'production'`|
|`isTest()`|`boolean`|`NODE_ENV === 'test'`|
|`getEnvironment()`|`Environment`|Retourneert de huidige omgeving|

## Gebruiksvoorbeeld

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

## Gerelateerde typen

- [Analytics-typen](./analytics-types.md) -- `AnalyticsConfig` details
- [Auth-types](./auth-types.md) -- `AuthConfig` details
- [Configuratie / Omgeving](../configuration/environment-reference.md) -- volledige omgevingsvarreferentie
