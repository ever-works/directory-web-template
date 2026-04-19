---
id: config-types
title: Définitions des types de configuration
sidebar_label: Types de configuration
sidebar_position: 17
---

# Définitions des types de configuration

**Source :** `lib/config/types.ts`, `lib/config/feature-flags.ts`, `lib/config/schemas/*.ts`

Le système de configuration utilise les schémas Zod pour valider les variables d'environnement au démarrage. Chaque section de configuration possède un schéma dédié qui produit un objet de configuration typé.

## Types de base

### `AppConfigSchema`

La configuration d'application combinée, composée de tous les types de sections.

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

Union des noms de sections de configuration valides.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

Type d'assistance pour extraire un type de section spécifique.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

Type d'environnement de nœud.

```typescript
type Environment = 'development' | 'production' | 'test';
```

## Types de sections

### `CoreConfig`

Paramètres d'application essentiels.

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

Fournisseur de paiement et paramètres de tarification. Voir [Types de paiement](./payment-types.md) pour les types de transaction.

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

Paramètres d'intégration tiers.

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

## Types de validation

### `ConfigValidationResult`

Renvoyé par le système de validation de configuration.

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

## Indicateurs de fonctionnalités

### `FeatureFlags`

Indicateurs booléens pour les fonctionnalités dépendantes de la base de données.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

Tous les indicateurs sont `true` lorsque `DATABASE_URL` est configuré, `false` sinon.

|Fonction|Descriptif|
|----------|-------------|
|`getFeatureFlags()`|Renvoie l'objet `FeatureFlags` complet|
|`isFeatureEnabled(name)`|Vérifie une seule fonctionnalité|
|`getDisabledFeatures()`|Répertorie les noms des fonctionnalités désactivées|
|`getEnabledFeatures()`|Répertorie les noms des fonctionnalités activées|
|`areAllFeaturesEnabled()`|Renvoie `true` si toutes les fonctionnalités sont activées|

## Aides à l'environnement

|Fonction|Retour|Descriptif|
|----------|--------|-------------|
|`isDevelopment()`|`boolean`|`NODE_ENV === 'development'`|
|`isProduction()`|`boolean`|`NODE_ENV === 'production'`|
|`isTest()`|`boolean`|`NODE_ENV === 'test'`|
|`getEnvironment()`|`Environment`|Renvoie l'environnement actuel|

## Exemple d'utilisation

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

## Types associés

- [Types d'analyses](./analytics-types.md) -- `AnalyticsConfig` détails
- [Types d'authentification](./auth-types.md) -- `AuthConfig` détails
- [Configuration / Environnement](../configuration/environment-reference.md) -- référence complète de la variable d'environnement
