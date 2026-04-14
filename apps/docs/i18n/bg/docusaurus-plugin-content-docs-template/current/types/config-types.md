---
id: config-types
title: Дефиниции на типа конфигурация
sidebar_label: Типове конфигурация
sidebar_position: 17
---

# Дефиниции на типа конфигурация

**Източник:** `lib/config/types.ts`, `lib/config/feature-flags.ts`, `lib/config/schemas/*.ts`

Конфигурационната система използва Zod схеми за валидиране на променливите на средата при стартиране. Всеки конфигурационен раздел има специална схема, която създава въведен конфигурационен обект.

## Типове ядра

### `AppConfigSchema`

Комбинираната конфигурация на приложението, съставена от всички типове секции.

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

Обединение на валидни имена на секции за конфигурация.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

Помощен тип за извличане на определен тип раздел.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

Тип среда на възел.

```typescript
type Environment = 'development' | 'production' | 'test';
```

## Видове секции

### `CoreConfig`

Основни настройки на приложението.

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

Доставчик на плащания и настройки за ценообразуване. Вижте [Видове плащане](./payment-types.md) за типове на ниво транзакция.

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

Настройки за интегриране на трети страни.

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

## Типове валидиране

### `ConfigValidationResult`

Връща се от системата за валидиране на конфигурацията.

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

## Флагове за функции

### `FeatureFlags`

Булеви флагове за функции, зависещи от база данни.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

Всички флагове са `true`, когато `DATABASE_URL` е конфигуриран, `false` в противен случай.

|функция|Описание|
|----------|-------------|
|`getFeatureFlags()`|Връща пълния обект `FeatureFlags`|
|`isFeatureEnabled(name)`|Проверява една функция|
|`getDisabledFeatures()`|Изброява имена на деактивирани функции|
|`getEnabledFeatures()`|Изброява имена на активирани функции|
|`areAllFeaturesEnabled()`|Връща `true`, ако всички функции са включени|

## Помощници за околната среда

|функция|Връщане|Описание|
|----------|--------|-------------|
|`isDevelopment()`|`boolean`|`NODE_ENV === 'development'`|
|`isProduction()`|`boolean`|`NODE_ENV === 'production'`|
|`isTest()`|`boolean`|`NODE_ENV === 'test'`|
|`getEnvironment()`|`Environment`|Връща текущата среда|

## Пример за използване

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

## Свързани типове

- [Типове анализи](./analytics-types.md) -- `AnalyticsConfig` подробности
- [Типове удостоверяване](./auth-types.md) -- подробности за `AuthConfig`
- [Конфигурация / Околна среда](../configuration/environment-reference.md) -- справка за пълна env var
