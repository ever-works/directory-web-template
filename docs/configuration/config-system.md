---
id: config-system
title: Configuration System
sidebar_label: Config System
sidebar_position: 0
---

# Configuration System

The Ever Works template uses a centralized, type-safe configuration system built on Zod validation schemas. All environment variables are validated at application startup, providing immediate feedback on missing or invalid configuration. The system supports both server-only secrets and client-safe public variables.

## Architecture

```
lib/config/
  config-service.ts        # Centralized ConfigService singleton
  client.ts                # Client-safe configuration (NEXT_PUBLIC_*)
  env.ts                   # Legacy env schema (API config)
  server-config.ts         # Deprecated server helpers (use ConfigService)
  feature-flags.ts         # Feature availability flags
  index.ts                 # Barrel export
  types.ts                 # TypeScript type definitions
  schemas/
    index.ts               # Schema barrel export
    core.schema.ts         # URLs, site info, database, content
    auth.schema.ts         # Auth secrets, OAuth providers, JWT, cookies
    email.schema.ts        # SMTP, Resend, Novu configuration
    payment.schema.ts      # Stripe, LemonSqueezy, Polar, pricing
    analytics.schema.ts    # PostHog, Sentry, Vercel Analytics, Recaptcha
    integrations.schema.ts # Trigger.dev, Twenty CRM, Cron
  billing/
    index.ts               # Billing config barrel
    stripe.config.ts       # Stripe-specific configuration
    lemonsqueezy.config.ts # LemonSqueezy configuration
    polar.config.ts        # Polar configuration
    solidgate.config.ts    # Solidgate configuration
    types.ts               # Billing types
  utils/
    env-parser.ts          # Environment variable parsing utilities
    validation-logger.ts   # Validation result formatting and logging
```

## ConfigService Singleton

The core of the configuration system is the `ConfigService` class in `lib/config/config-service.ts`. It:

1. Collects all environment variables through collector functions
2. Validates them against a combined Zod schema
3. Stores the validated config as a singleton
4. Provides typed getters for each configuration section

```typescript
import { configService } from '@/lib/config';

// Access specific sections
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### Section Exports

For tree-shaking and convenience, individual sections are also exported:

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// Direct access without ConfigService prefix
const dbUrl = coreConfig.DATABASE_URL;
```

### Server-Only Enforcement

The `ConfigService` module imports `'server-only'`, which means:

- It can only be used in Server Components, API routes, and server-side code
- Attempting to import it in a Client Component will produce a build error
- This prevents accidental exposure of secrets like API keys

## Client Configuration (`lib/config/client.ts`)

Client-safe configuration is in a separate module that only reads `NEXT_PUBLIC_*` variables:

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// Site branding
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // Social media links
siteConfig.attribution // "Built with" attribution

// Pricing
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// Environment
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

This module is safe to import in any component, including client-side code.

## Validation Schemas

Each configuration section has a dedicated Zod schema in `lib/config/schemas/`:

### Core Schema (`core.schema.ts`)

Validates: `NODE_ENV`, `APP_URL`, `SITE_URL`, `API_BASE_URL`, `DATABASE_URL`, site metadata (name, tagline, description, keywords, logo), social links, OG image theme, attribution, and content repository settings.

### Auth Schema (`auth.schema.ts`)

Validates: `AUTH_SECRET`, `COOKIE_SECRET`, JWT token expiry settings, cookie configuration, OAuth provider credentials (Google, GitHub, Microsoft, Facebook, X/Twitter, LinkedIn), Supabase config, and seed user credentials.

### Email Schema (`email.schema.ts`)

Validates: `EMAIL_PROVIDER` (resend/novu), `EMAIL_FROM`, `EMAIL_SUPPORT`, `COMPANY_NAME`, SMTP settings (host, port, user, password), Resend API key, and Novu API key.

### Payment Schema (`payment.schema.ts`)

Validates: Stripe (secret key, publishable key, webhook secret, price IDs, dynamic pricing, multi-currency), LemonSqueezy (API key, store ID, webhook, variant IDs), Polar (access token, webhook, organization, plan IDs), product pricing, trial amounts.

### Analytics Schema (`analytics.schema.ts`)

Validates: PostHog (key, host, debug, session recording, auto-capture, personal API key, project ID), Sentry (DSN, org, project, auth token, debug), Vercel Analytics, Recaptcha (site key, secret key), exception tracking provider.

### Integrations Schema (`integrations.schema.ts`)

Validates: Trigger.dev (enabled, API key, URL, environment), Twenty CRM (base URL, API key, enabled, sync mode), Cron (secret).

## Validation Behavior

The validation system uses Zod's `.catch()` for graceful degradation:

```typescript
// From integrations.schema.ts
export const twentyCrmConfigSchema = z
  .object({
    baseUrl: z.string().url().optional().catch(undefined),
    apiKey: z.string().optional(),
    enabled: z.boolean().default(false),
    syncMode: twentyCrmSyncModeSchema,
  })
  .transform((data) => ({
    ...data,
    enabled: data.enabled ?? Boolean(data.baseUrl && data.apiKey),
  }));
```

- **Optional fields** with `.catch()` recover gracefully with defaults
- **Required fields** without `.catch()` cause startup failure
- **Transform steps** compute derived values (like auto-detecting enabled state)

Validation results are logged at startup via `validation-logger.ts`, showing which integrations are active and any warnings about missing optional configuration.

## Feature Flags (`lib/config/feature-flags.ts`)

Feature flags provide a simple mechanism to enable/disable database-dependent features:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // Render comments section
}
```

All feature flags are currently tied to `DATABASE_URL` availability. When no database is configured, interactive features are disabled while the directory continues to serve static content.

## Migration from Legacy Config

The `server-config.ts` module contains deprecated helper functions. Migration paths:

| Deprecated | Replacement |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## Related Files

- `lib/config/config-service.ts` -- ConfigService singleton
- `lib/config/client.ts` -- Client-safe configuration
- `lib/config/schemas/*.schema.ts` -- Zod validation schemas
- `lib/config/feature-flags.ts` -- Feature flags
- `lib/config/types.ts` -- TypeScript type definitions
- `.env.example` -- Complete environment variable reference
