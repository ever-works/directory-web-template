---
id: config-types
title: Definições de tipo de configuração
sidebar_label: Tipos de configuração
sidebar_position: 17
---

# Definições de tipo de configuração

**Fonte:** `lib/config/types.ts`, `lib/config/feature-flags.ts`, `lib/config/schemas/*.ts`

O sistema de configuração usa esquemas Zod para validar variáveis de ambiente na inicialização. Cada seção de configuração possui um esquema dedicado que produz um objeto de configuração digitado.

## Tipos principais

### `AppConfigSchema`

A configuração combinada do aplicativo, composta por todos os tipos de seção.

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

União de nomes de seções de configuração válidas.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

Tipo auxiliar para extrair um tipo de seção específico.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

Tipo de ambiente do nó.

```typescript
type Environment = 'development' | 'production' | 'test';
```

## Tipos de seção

### `CoreConfig`

Configurações essenciais do aplicativo.

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

Provedor de pagamento e configurações de preços. Consulte [Tipos de pagamento](./payment-types.md) para tipos de nível de transação.

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

Configurações de integração de terceiros.

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

## Tipos de validação

### `ConfigValidationResult`

Retornado pelo sistema de validação de configuração.

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

## Sinalizadores de recursos

### `FeatureFlags`

Sinalizadores booleanos para recursos dependentes de banco de dados.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

Todos os sinalizadores são `true` quando `DATABASE_URL` está configurado, `false` caso contrário.

|Função|Descrição|
|----------|-------------|
|`getFeatureFlags()`|Retorna o objeto `FeatureFlags` completo|
|`isFeatureEnabled(name)`|Verifica um único recurso|
|`getDisabledFeatures()`|Lista nomes de recursos desativados|
|`getEnabledFeatures()`|Lista nomes de recursos habilitados|
|`areAllFeaturesEnabled()`|Retorna `true` se todos os recursos estiverem ativados|

## Ajudantes do Meio Ambiente

|Função|Retorno|Descrição|
|----------|--------|-------------|
|`isDevelopment()`|`boolean`|`NODE_ENV === 'development'`|
|`isProduction()`|`boolean`|`NODE_ENV === 'production'`|
|`isTest()`|`boolean`|`NODE_ENV === 'test'`|
|`getEnvironment()`|`Environment`|Retorna o ambiente atual|

## Exemplo de uso

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

## Tipos Relacionados

- [Tipos de análise](./analytics-types.md) -- `AnalyticsConfig` detalhes
- [Tipos de autenticação](./auth-types.md) -- `AuthConfig` detalhes
- [Configuração/Ambiente](../configuration/environment-reference.md) - referência completa de env var
