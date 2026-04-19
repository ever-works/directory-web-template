---
id: config-types
title: הגדרות סוג תצורה
sidebar_label: סוגי תצורה
sidebar_position: 17
---

# הגדרות סוג תצורה

**מקור:** `lib/config/types.ts`, `lib/config/feature-flags.ts`, `lib/config/schemas/*.ts`

מערכת התצורה משתמשת בסכימות Zod כדי לאמת משתני סביבה בעת ההפעלה. לכל סעיף תצורה יש סכימה ייעודית המייצרת אובייקט תצורה מוקלד.

## סוגי ליבה

### `AppConfigSchema`

תצורת האפליקציה המשולבת, המורכבת מכל סוגי הסעיפים.

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

איחוד שמות מקטעי תצורה חוקיים.

```typescript
type ConfigSection = 'core' | 'auth' | 'email' | 'payment' | 'analytics' | 'integrations';
```

### `ConfigSectionType<T>`

סוג עוזר כדי לחלץ סוג מקטע מסוים.

```typescript
type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

// Usage: ConfigSectionType<'payment'> resolves to PaymentConfig
```

### `Environment`

סוג סביבת הצומת.

```typescript
type Environment = 'development' | 'production' | 'test';
```

## סוגי סעיפים

### `CoreConfig`

הגדרות אפליקציה חיוניות.

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

ספק תשלומים והגדרות תמחור. ראה [סוגי תשלום](./payment-types.md) לסוגים ברמת העסקה.

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

הגדרות אינטגרציה של צד שלישי.

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

## סוגי אימות

### `ConfigValidationResult`

הוחזר על ידי מערכת אימות התצורה.

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

## תכונה דגלים

### `FeatureFlags`

דגלים בוליאניים עבור תכונות תלויות מסד נתונים.

```typescript
interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

כל הדגלים הם `true` כאשר `DATABASE_URL` מוגדר, `false` אחרת.

|פונקציה|תיאור|
|----------|-------------|
|`getFeatureFlags()`|מחזירה את האובייקט `FeatureFlags` המלא|
|`isFeatureEnabled(name)`|בודק תכונה בודדת|
|`getDisabledFeatures()`|מפרט שמות של תכונות מושבתות|
|`getEnabledFeatures()`|מפרט את שמות התכונות המופעלות|
|`areAllFeaturesEnabled()`|מחזירה `true` אם כל התכונות פועלות|

## עוזרי איכות הסביבה

|פונקציה|חזרה|תיאור|
|----------|--------|-------------|
|`isDevelopment()`|`boolean`|`NODE_ENV === 'development'`|
|`isProduction()`|`boolean`|`NODE_ENV === 'production'`|
|`isTest()`|`boolean`|`NODE_ENV === 'test'`|
|`getEnvironment()`|`Environment`|מחזיר את הסביבה הנוכחית|

## דוגמה לשימוש

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

## סוגים קשורים

- [Types Analytics](./analytics-types.md) -- `AnalyticsConfig` פרטים
- [Auth Types](./auth-types.md) -- `AuthConfig` פרטים
- [תצורה / סביבה](../configuration/environment-reference.md) -- הפניה מלאה ל-env var
