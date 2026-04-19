---
id: config-types
title: Definiciones de tipos de configuración
sidebar_label: Tipos de configuración
sidebar_position: 17
---

# Definiciones de tipos de configuración

**Fuente:** `lib/config/types.ts`, `lib/config/feature-flags.ts`, `lib/config/schemas/*.ts`

El sistema de configuración utiliza esquemas Zod para validar las variables de entorno al inicio. Cada sección de configuración tiene un esquema dedicado que produce un objeto de configuración escrito.

## Tipos de núcleos

### `AppConfigSchema`

La configuración de la aplicación combinada, compuesta por todos los tipos de secciones.

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

Unión de nombres de secciones de configuración válidos.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

Tipo de ayuda para extraer un tipo de sección específico.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

Tipo de entorno de nodo.

```typescript
type Environment = 'development' | 'production' | 'test';
```

## Tipos de sección

### `CoreConfig`

Configuraciones esenciales de la aplicación.

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

Proveedor de pagos y configuración de precios. Consulte [Tipos de pago](./paid-types.md) para conocer los tipos a nivel de transacción.

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

Configuraciones de integración de terceros.

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

## Tipos de validación

### `ConfigValidationResult`

Devuelto por el sistema de validación de configuración.

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

## Banderas de características

### `FeatureFlags`

Indicadores booleanos para funciones dependientes de la base de datos.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

Todos los indicadores son `true` cuando `DATABASE_URL` está configurado, `false` en caso contrario.

|Función|Descripción|
|----------|-------------|
|`getFeatureFlags()`|Devuelve el objeto `FeatureFlags` completo|
|`isFeatureEnabled(name)`|Comprueba una sola característica|
|`getDisabledFeatures()`|Muestra nombres de funciones deshabilitadas|
|`getEnabledFeatures()`|Enumera los nombres de funciones habilitadas|
|`areAllFeaturesEnabled()`|Devuelve `true` si todas las funciones están activadas|

## Ayudantes del medio ambiente

|Función|Regresar|Descripción|
|----------|--------|-------------|
|`isDevelopment()`|`boolean`|`NODE_ENV === 'development'`|
|`isProduction()`|`boolean`|`NODE_ENV === 'production'`|
|`isTest()`|`boolean`|`NODE_ENV === 'test'`|
|`getEnvironment()`|`Environment`|Devuelve el entorno actual|

## Ejemplo de uso

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

## Tipos relacionados

- [Tipos de análisis](./analytics-types.md) -- `AnalyticsConfig` detalles
- [Tipos de autenticación](./auth-types.md) -- `AuthConfig` detalles
- [Configuración/Entorno](../configuration/environment-reference.md) -- referencia completa de var de entorno
