---
id: config-types
title: تعريفات نوع التكوين
sidebar_label: أنواع التكوين
sidebar_position: 17
---

# تعريفات نوع التكوين

**المصدر:** `lib/config/types.ts`، `lib/config/feature-flags.ts`، `lib/config/schemas/*.ts`

يستخدم نظام التكوين مخططات Zod للتحقق من صحة متغيرات البيئة عند بدء التشغيل. يحتوي كل قسم تكوين على مخطط مخصص ينتج عنه كائن تكوين مكتوب.

## الأنواع الأساسية

### `AppConfigSchema`

تكوين التطبيق المدمج، الذي يتكون من جميع أنواع الأقسام.

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

توحيد أسماء أقسام التكوين الصالحة.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

نوع مساعد لاستخراج نوع قسم معين.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

نوع بيئة العقدة

```typescript
type Environment = 'development' | 'production' | 'test';
```

## أنواع الأقسام

### `CoreConfig`

إعدادات التطبيق الأساسية.

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

مزود الدفع وإعدادات التسعير. راجع [أنواع الدفع](./Payment-types.md) للتعرف على أنواع مستوى المعاملة.

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

إعدادات تكامل الطرف الثالث.

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

## أنواع التحقق من الصحة

### `ConfigValidationResult`

تم إرجاعها بواسطة نظام التحقق من صحة التكوين.

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

## أعلام مميزة

### `FeatureFlags`

علامات منطقية للميزات المعتمدة على قاعدة البيانات.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

جميع العلامات هي `true` عند تكوين `DATABASE_URL`، `false` بخلاف ذلك.

|وظيفة|الوصف|
|----------|-------------|
|`getFeatureFlags()`|إرجاع الكائن `FeatureFlags` الكامل|
|`isFeatureEnabled(name)`|يتحقق من ميزة واحدة|
|`getDisabledFeatures()`|يسرد أسماء الميزات المعطلة|
|`getEnabledFeatures()`|يسرد أسماء الميزات الممكّنة|
|`areAllFeaturesEnabled()`|يُرجع `true` إذا كانت كافة الميزات قيد التشغيل|

## مساعدو البيئة

|وظيفة|العودة|الوصف|
|----------|--------|-------------|
|`isDevelopment()`|`boolean`|`NODE_ENV === 'development'`|
|`isProduction()`|`boolean`|`NODE_ENV === 'production'`|
|`isTest()`|`boolean`|`NODE_ENV === 'test'`|
|`getEnvironment()`|`Environment`|إرجاع البيئة الحالية|

## مثال الاستخدام

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

## الأنواع ذات الصلة

- [أنواع التحليلات](./analytics-types.md) -- `AnalyticsConfig` التفاصيل
- [أنواع المصادقة](./auth-types.md) -- `AuthConfig` التفاصيل
- [التكوين / البيئة](../configuration/environment-reference.md) - مرجع env var الكامل
