---
id: config-types
title: Definizioni del tipo di configurazione
sidebar_label: Tipi di configurazione
sidebar_position: 17
---

# Definizioni del tipo di configurazione

**Fonte:** `lib/config/types.ts`, `lib/config/feature-flags.ts`, `lib/config/schemas/*.ts`

Il sistema di configurazione utilizza gli schemi Zod per convalidare le variabili di ambiente all'avvio. Ogni sezione di configurazione ha uno schema dedicato che produce un oggetto di configurazione tipizzato.

## Tipi di nucleo

### `AppConfigSchema`

La configurazione dell'applicazione combinata, composta da tutti i tipi di sezione.

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

Unione di nomi di sezioni di configurazione validi.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

Tipo di supporto per estrarre un tipo di sezione specifico.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

Tipo di ambiente del nodo.

```typescript
type Environment = 'development' | 'production' | 'test';
```

## Tipi di sezione

### `CoreConfig`

Impostazioni essenziali dell'applicazione.

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

Fornitore di servizi di pagamento e impostazioni dei prezzi. Consulta [Tipi di pagamento](./payment-types.md) per i tipi a livello di transazione.

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

Impostazioni di integrazione di terze parti.

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

## Tipi di convalida

### `ConfigValidationResult`

Restituito dal sistema di convalida della configurazione.

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

## Flag di funzionalità

### `FeatureFlags`

Flag booleani per funzionalità dipendenti dal database.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

Tutti i flag sono `true` quando è configurato `DATABASE_URL`, `false` altrimenti.

|Funzione|Descrizione|
|----------|-------------|
|`getFeatureFlags()`|Restituisce l'oggetto completo `FeatureFlags`|
|`isFeatureEnabled(name)`|Controlla una singola funzionalità|
|`getDisabledFeatures()`|Elenca i nomi delle funzionalità disabilitate|
|`getEnabledFeatures()`|Elenca i nomi delle funzionalità abilitate|
|`areAllFeaturesEnabled()`|Restituisce `true` se tutte le funzionalità sono attive|

## Aiutanti dell'ambiente

|Funzione|Ritorno|Descrizione|
|----------|--------|-------------|
|`isDevelopment()`|`boolean`|`NODE_ENV === 'development'`|
|`isProduction()`|`boolean`|`NODE_ENV === 'production'`|
|`isTest()`|`boolean`|`NODE_ENV === 'test'`|
|`getEnvironment()`|`Environment`|Restituisce l'ambiente corrente|

## Esempio di utilizzo

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

## Tipi correlati

- [Tipi di analisi](./analytics-types.md) -- `AnalyticsConfig` dettagli
- [Tipi di autenticazione](./auth-types.md) -- `AuthConfig` dettagli
- [Configurazione/Ambiente](../configuration/environment-reference.md) -- riferimento completo alla var env
