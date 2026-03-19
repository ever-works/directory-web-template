---
id: config-types
title: Configuration Type Definitions
sidebar_label: Config Types
sidebar_position: 17
---

# Configuration Type Definitions

**Source:** `lib/config/types.ts`, `lib/config/feature-flags.ts`, `lib/config/schemas/*.ts`

The configuration system uses Zod schemas to validate environment variables at startup. Each config section has a dedicated schema that produces a typed configuration object.

## Core Types

### `AppConfigSchema`

The combined application configuration, composed of all section types.

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

Union of valid configuration section names.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

Helper type to extract a specific section type.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

Node environment type.

```typescript
type Environment = 'development' | 'production' | 'test';
```

## Section Types

### `CoreConfig`

Essential application settings.

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

Payment provider and pricing settings. See [Payment Types](./payment-types.md) for transaction-level types.

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

Third-party integration settings.

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

## Validation Types

### `ConfigValidationResult`

Returned by the configuration validation system.

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

## Feature Flags

### `FeatureFlags`

Boolean flags for database-dependent features.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

All flags are `true` when `DATABASE_URL` is configured, `false` otherwise.

| Function | Description |
|----------|-------------|
| `getFeatureFlags()` | Returns the full `FeatureFlags` object |
| `isFeatureEnabled(name)` | Checks a single feature |
| `getDisabledFeatures()` | Lists disabled feature names |
| `getEnabledFeatures()` | Lists enabled feature names |
| `areAllFeaturesEnabled()` | Returns `true` if all features are on |

## Environment Helpers

| Function | Return | Description |
|----------|--------|-------------|
| `isDevelopment()` | `boolean` | `NODE_ENV === 'development'` |
| `isProduction()` | `boolean` | `NODE_ENV === 'production'` |
| `isTest()` | `boolean` | `NODE_ENV === 'test'` |
| `getEnvironment()` | `Environment` | Returns the current environment |

## Usage Example

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

## Related Types

- [Analytics Types](./analytics-types.md) -- `AnalyticsConfig` details
- [Auth Types](./auth-types.md) -- `AuthConfig` details
- [Configuration / Environment](../configuration/environment-reference.md) -- full env var reference
