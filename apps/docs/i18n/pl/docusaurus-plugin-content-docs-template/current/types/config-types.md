---
id: config-types
title: Definicje typów konfiguracji
sidebar_label: Typy konfiguracji
sidebar_position: 17
---

# Definicje typów konfiguracji

**Źródło:** `lib/config/types.ts`, `lib/config/feature-flags.ts`, `lib/config/schemas/*.ts`

System konfiguracyjny używa schematów Zoda do sprawdzania poprawności zmiennych środowiskowych podczas uruchamiania. Każda sekcja konfiguracji ma dedykowany schemat, który tworzy obiekt konfiguracji o określonym typie.

## Typy rdzeni

### `AppConfigSchema`

Połączona konfiguracja aplikacji, złożona ze wszystkich typów sekcji.

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

Suma prawidłowych nazw sekcji konfiguracji.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

Typ pomocniczy, aby wyodrębnić określony typ sekcji.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

Typ środowiska węzła.

```typescript
type Environment = 'development' | 'production' | 'test';
```

## Typy sekcji

### `CoreConfig`

Niezbędne ustawienia aplikacji.

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

Ustawienia dostawcy płatności i cen. Zobacz [Typy płatności](./payment-types.md), aby zapoznać się z typami na poziomie transakcji.

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

Ustawienia integracji innych firm.

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

## Typy walidacji

### `ConfigValidationResult`

Zwrócony przez system sprawdzania poprawności konfiguracji.

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

## Flagi funkcyjne

### `FeatureFlags`

Flagi logiczne dla funkcji zależnych od bazy danych.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

Wszystkie flagi to `true`, gdy skonfigurowano `DATABASE_URL`, w przeciwnym razie `false`.

|Funkcja|Opis|
|----------|-------------|
|`getFeatureFlags()`|Zwraca pełny obiekt `FeatureFlags`|
|`isFeatureEnabled(name)`|Sprawdza pojedynczą funkcję|
|`getDisabledFeatures()`|Wyświetla nazwy wyłączonych funkcji|
|`getEnabledFeatures()`|Wyświetla listę nazw włączonych funkcji|
|`areAllFeaturesEnabled()`|Zwraca `true`, jeśli wszystkie funkcje są włączone|

## Pomocnicy ochrony środowiska

|Funkcja|Wróć|Opis|
|----------|--------|-------------|
|`isDevelopment()`|`boolean`|`NODE_ENV === 'development'`|
|`isProduction()`|`boolean`|`NODE_ENV === 'production'`|
|`isTest()`|`boolean`|`NODE_ENV === 'test'`|
|`getEnvironment()`|`Environment`|Zwraca bieżące środowisko|

## Przykład użycia

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

## Powiązane typy

- [Typy Analytics](./analytics-types.md) -- `AnalyticsConfig` szczegóły
- [Typy uwierzytelniania](./auth-types.md) -- `AuthConfig` szczegóły
- [Konfiguracja / Środowisko](../configuration/environment-reference.md) -- pełne odwołanie do zmiennej środowiskowej
