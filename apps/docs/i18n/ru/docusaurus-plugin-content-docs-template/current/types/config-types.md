---
id: config-types
title: Определения типов конфигурации
sidebar_label: Типы конфигурации
sidebar_position: 17
---

# Определения типов конфигурации

**Источник:** `lib/config/types.ts`, `lib/config/feature-flags.ts`, `lib/config/schemas/*.ts`

Система конфигурации использует схемы Zod для проверки переменных среды при запуске. Каждый раздел конфигурации имеет специальную схему, которая создает типизированный объект конфигурации.

## Основные типы

### `AppConfigSchema`

Комбинированная конфигурация приложения, состоящая из всех типов разделов.

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

Объединение допустимых имен разделов конфигурации.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

Вспомогательный тип для извлечения определенного типа раздела.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

Тип среды узла.

```typescript
type Environment = 'development' | 'production' | 'test';
```

## Типы разделов

### `CoreConfig`

Основные настройки приложения.

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

Поставщик платежей и настройки ценообразования. См. [Типы платежей](./pay-types.md) для типов уровня транзакции.

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

Настройки сторонней интеграции.

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

## Типы проверки

### `ConfigValidationResult`

Возвращается системой проверки конфигурации.

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

## Флаги функций

### `FeatureFlags`

Логические флаги для функций, зависящих от базы данных.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

Все флаги `true`, если настроен `DATABASE_URL`, `false` в противном случае.

|Функция|Описание|
|----------|-------------|
|`getFeatureFlags()`|Возвращает полный объект `FeatureFlags`.|
|`isFeatureEnabled(name)`|Проверяет одну функцию|
|`getDisabledFeatures()`|Перечисляет имена отключенных функций|
|`getEnabledFeatures()`|Перечисляет имена включенных функций|
|`areAllFeaturesEnabled()`|Возвращает `true`, если все функции включены.|

## Помощники окружающей среды

|Функция|Возврат|Описание|
|----------|--------|-------------|
|`isDevelopment()`|`boolean`|`NODE_ENV === 'development'`|
|`isProduction()`|`boolean`|`NODE_ENV === 'production'`|
|`isTest()`|`boolean`|`NODE_ENV === 'test'`|
|`getEnvironment()`|`Environment`|Возвращает текущую среду|

## Пример использования

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

## Связанные типы

- [Типы аналитики](./analytics-types.md) -- `AnalyticsConfig` подробности
- [Типы аутентификации](./auth-types.md) -- `AuthConfig` подробности
- [Конфигурация/Среда](../configuration/environment-reference.md) – полная ссылка на переменную окружения
