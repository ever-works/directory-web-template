---
id: provider-config
title: "Provider Configuration"
sidebar_label: "Provider Config"
sidebar_position: 4
---

# Provider Configuration

The template uses a centralized `ConfigService` singleton to manage all external service providers. Each provider is configured through Zod-validated schemas with automatic feature detection -- providers are enabled when their required credentials are present.

## ConfigService Architecture

The `ConfigService` at `lib/config/config-service.ts` is a server-only singleton that validates all environment variables at startup:

```ts
import { configService } from '@/lib/config';

// Access configuration sections
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

The service is organized into six sections, each with its own Zod schema:

| Section | Accessor | Schema File |
|---------|----------|-------------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### Tree-Shakeable Imports

Individual sections can be imported directly for better tree-shaking:

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### Validation at Startup

All configuration is validated with Zod on first import. Invalid values trigger `.catch()` fallbacks where possible, while truly unrecoverable errors throw at startup:

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## Authentication Providers

Defined in `lib/config/schemas/auth.schema.ts`. OAuth providers auto-detect enablement:

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### Supported OAuth Providers

| Provider | Client ID Variable | Client Secret Variable |
|----------|--------------------|------------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

### Supabase Auth Backend

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

### Additional Auth Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_SECRET` | -- | Required for session signing |
| `COOKIE_SECRET` | -- | Cookie encryption secret |
| `COOKIE_DOMAIN` | `'localhost'` | Cookie domain |
| `COOKIE_SECURE` | `false` | HTTPS-only cookies |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | Access token TTL |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | Refresh token TTL |

## Payment Providers

Defined in `lib/config/schemas/payment.schema.ts`. Each provider is auto-enabled when its required credentials are set.

### Stripe

Auto-enabled when `secretKey` and `publishableKey` are present:

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Server-side secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side publishable key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | Price ID for free plan |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | Price ID for standard plan |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | Price ID for premium plan |

### LemonSqueezy

Auto-enabled when `apiKey` and `storeId` are present:

| Variable | Description |
|----------|-------------|
| `LEMONSQUEEZY_API_KEY` | API key |
| `LEMONSQUEEZY_STORE_ID` | Store identifier |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook secret |
| `LEMONSQUEEZY_WEBHOOK_URL` | Webhook endpoint URL |
| `LEMONSQUEEZY_TEST_MODE` | Enable test mode (`'true'`/`'false'`) |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | Variant ID for free plan |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | Variant ID for standard plan |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | Variant ID for premium plan |

### Polar

Auto-enabled when `accessToken` and `organizationId` are present:

| Variable | Default | Description |
|----------|---------|-------------|
| `POLAR_ACCESS_TOKEN` | -- | API access token |
| `POLAR_ORGANIZATION_ID` | -- | Organization ID |
| `POLAR_WEBHOOK_SECRET` | -- | Webhook secret |
| `POLAR_SANDBOX` | `true` | Sandbox mode (set `'false'` for production) |
| `POLAR_API_URL` | -- | Custom API URL |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | Plan ID for free tier |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | Plan ID for standard tier |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | Plan ID for premium tier |

### Product Pricing Display

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | Display price for free plan |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | Display price for standard plan |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | Display price for premium plan |

## Email Providers

Defined in `lib/config/schemas/email.schema.ts`.

### SMTP

Auto-enabled when `host`, `user`, and `password` are all present:

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | -- | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | -- | SMTP authentication username |
| `SMTP_PASSWORD` | -- | SMTP authentication password |

### Resend

Auto-enabled when `apiKey` is present:

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key |

### Novu

Auto-enabled when `apiKey` is present:

| Variable | Description |
|----------|-------------|
| `NOVU_API_KEY` | Novu API key |

### Email Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPANY_NAME` | `'Ever Works'` | Company name in email templates |
| `EMAIL_PROVIDER` | `'resend'` | Active email provider (`'resend'`, `'novu'`) |
| `EMAIL_FROM` | -- | Sender email address |
| `EMAIL_SUPPORT` | -- | Support email address |

## Analytics Providers

Defined in `lib/config/schemas/analytics.schema.ts`.

### PostHog

Auto-enabled when `key` is present:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | PostHog host URL |
| `POSTHOG_DEBUG` | `false` | Enable debug mode |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | Enable session recording |
| `POSTHOG_AUTO_CAPTURE` | `false` | Auto-capture events |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | Track exceptions |
| `POSTHOG_PERSONAL_API_KEY` | -- | Personal API key (admin dashboard) |
| `POSTHOG_PROJECT_ID` | -- | Project ID (admin dashboard) |

### Sentry

Auto-enabled when `dsn` is present:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | Sentry DSN |
| `SENTRY_ORG` | -- | Sentry organization slug |
| `SENTRY_PROJECT` | -- | Sentry project name |
| `SENTRY_AUTH_TOKEN` | -- | Auth token for source maps |
| `SENTRY_ENABLE_DEV` | `false` | Enable in development |
| `SENTRY_DEBUG` | `false` | Debug mode |

### reCAPTCHA

Auto-enabled when both `siteKey` and `secretKey` are present:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Client-side site key |
| `RECAPTCHA_SECRET_KEY` | Server-side secret key |

### Vercel Analytics

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | Enable Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | Sampling rate (0--1) |

### Exception Tracking Provider

| Variable | Default | Description |
|----------|---------|-------------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'`, `'sentry'`, or `'none'` |

## Checking Provider Status

```ts
import { configService } from '@/lib/config';

// Check if Stripe is configured
if (configService.payment.stripe.enabled) {
  // Stripe is ready to use
}

// Check if any email provider is available
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// List enabled OAuth providers
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## Related Files

| Path | Description |
|------|-------------|
| `lib/config/config-service.ts` | ConfigService singleton |
| `lib/config/schemas/auth.schema.ts` | Auth provider schemas |
| `lib/config/schemas/payment.schema.ts` | Payment provider schemas |
| `lib/config/schemas/email.schema.ts` | Email provider schemas |
| `lib/config/schemas/analytics.schema.ts` | Analytics provider schemas |
| `lib/config/schemas/integrations.schema.ts` | Integration provider schemas |
| `lib/config/schemas/core.schema.ts` | Core configuration schema |
| `lib/config/types.ts` | TypeScript type definitions |
| `lib/config/index.ts` | Barrel export |
| `.env.example` | Full environment variable reference |
