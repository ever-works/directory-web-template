---
id: overview
title: Integrations Overview
sidebar_label: Overview
sidebar_position: 1
---

# Integrations Overview

The Ever Works template ships with a comprehensive set of third-party integrations. Each integration is optional and can be enabled or disabled through environment variables. This page provides a high-level map of all available integrations, their configuration, and how to toggle them.

## Integration Categories

### Payment Providers (4)

The template supports four payment providers, configured via `NEXT_PUBLIC_*_PAYMENT_FORM_ENABLED` environment variables. Only one provider should be active at a time for checkout, though the system supports multi-provider configurations.

| Provider | Config Schema | Key Env Vars |
|----------|--------------|--------------|
| **Stripe** | `lib/config/billing/stripe.config.ts` | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **LemonSqueezy** | `lib/config/billing/lemonsqueezy.config.ts` | `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET` |
| **Polar** | `lib/config/billing/polar.config.ts` | `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_ORGANIZATION_ID` |
| **Solidgate** | `lib/config/billing/solidgate.config.ts` | `SOLIDGATE_API_KEY`, `SOLIDGATE_SECRET_KEY`, `SOLIDGATE_WEBHOOK_SECRET` |

Enable a payment form:

```bash
NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED=true
# or
NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED=true
# or
NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED=true
```

Stripe also supports dynamic pricing and multi-currency configurations. See the `.env.example` file for the full list of currency-specific price ID variables.

### Authentication Providers (5)

OAuth providers are configured through client ID and secret pairs. The auth configuration schema is defined in `lib/config/schemas/auth.schema.ts`.

| Provider | Client ID Env Var | Client Secret Env Var |
|----------|------------------|----------------------|
| **Google** | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| **GitHub** | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| **Microsoft** | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| **Facebook** | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| **X (Twitter)** | `X_CLIENT_ID` | `X_CLIENT_SECRET` |

Additional auth variables:

```bash
AUTH_SECRET=                          # NextAuth secret (required)
COOKIE_SECRET=                        # Cookie encryption
JWT_ACCESS_TOKEN_EXPIRES_IN=15m       # Access token TTL
JWT_REFRESH_TOKEN_EXPIRES_IN=7d       # Refresh token TTL
```

Each provider auto-enables when both its client ID and secret are set. The auth features configuration is managed by `lib/config/auth-features.ts`.

### CRM (1)

| Integration | Key Env Vars |
|------------|--------------|
| **Twenty CRM** | `TWENTY_CRM_BASE_URL`, `TWENTY_CRM_API_KEY`, `TWENTY_CRM_ENABLED`, `TWENTY_CRM_SYNC_MODE` |

Sync modes: `disabled`, `platform`, `direct_crm`. See the [Twenty CRM Integration](./twenty-crm.md) page for full details on the five-service architecture.

### Analytics & Monitoring (3)

| Service | Config Schema | Key Env Vars |
|---------|--------------|--------------|
| **PostHog** | `lib/config/schemas/analytics.schema.ts` | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_PERSONAL_API_KEY` |
| **Sentry** | `lib/config/schemas/analytics.schema.ts` | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` |
| **Vercel Analytics** | `lib/config/schemas/analytics.schema.ts` | `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED`, `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` |

PostHog supports session recording, auto-capture, and server-side analytics via the personal API key. The exception tracking provider can be configured with `EXCEPTION_TRACKING_PROVIDER` (values: `posthog` or `sentry`).

### Email Providers (2)

| Provider | Key Env Vars |
|----------|-------------|
| **Resend** | `RESEND_API_KEY` |
| **Novu** | `NOVU_API_KEY` |

Additionally, SMTP is supported as a transport layer:

```bash
EMAIL_PROVIDER=resend              # resend | novu
EMAIL_FROM=info@yourdomain.com
EMAIL_SUPPORT=support@yourdomain.com
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
```

### Maps & Location (2)

| Provider | Key Env Vars |
|----------|-------------|
| **Mapbox** | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` |
| **Google Maps** | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` |

Both map providers use browser-exposed `NEXT_PUBLIC_*` keys. Always use domain-restricted API keys for security.

### Background Jobs (1)

| Service | Key Env Vars |
|---------|-------------|
| **Trigger.dev** | `TRIGGER_DEV_API_KEY`, `TRIGGER_DEV_API_URL`, `TRIGGER_DEV_ENVIRONMENT` |

When Trigger.dev is not configured, the template falls back to local scheduling for development. A `CRON_SECRET` environment variable authenticates external cron service requests to `/api/cron/sync`.

## Enable/Disable Patterns

All integrations follow a consistent enablement pattern:

### Auto-detection

Most integrations auto-enable when their required credentials are set. The Zod schemas in `lib/config/schemas/` include `.transform()` steps that detect credentials:

```typescript
// Example from integrations.schema.ts
.transform((data) => ({
  ...data,
  enabled: data.enabled ?? Boolean(data.baseUrl && data.apiKey),
}));
```

### Explicit Toggle

Some integrations support an explicit enabled flag that takes precedence over auto-detection:

```bash
TWENTY_CRM_ENABLED=false    # Explicitly disable even if credentials are set
TRIGGER_DEV_ENABLED=false   # Same pattern
```

### Feature Flags

Database-dependent features (ratings, comments, favorites, featured items, surveys) are controlled by the feature flags system in `lib/config/feature-flags.ts`. These features automatically enable when `DATABASE_URL` is configured.

## Configuration Validation

All integrations are validated at application startup through the centralized `ConfigService` singleton in `lib/config/config-service.ts`. The configuration is organized into six sections:

| Section | Schema File | Access Pattern |
|---------|------------|----------------|
| `core` | `schemas/core.schema.ts` | `configService.core` |
| `auth` | `schemas/auth.schema.ts` | `configService.auth` |
| `email` | `schemas/email.schema.ts` | `configService.email` |
| `payment` | `schemas/payment.schema.ts` | `configService.payment` |
| `analytics` | `schemas/analytics.schema.ts` | `configService.analytics` |
| `integrations` | `schemas/integrations.schema.ts` | `configService.integrations` |

Missing optional credentials produce warnings (not errors), allowing the application to start with partial integration support.

## Related Files

- `lib/config/config-service.ts` -- Centralized ConfigService singleton
- `lib/config/schemas/*.schema.ts` -- Zod validation schemas for each section
- `lib/config/feature-flags.ts` -- Feature flag system
- `lib/config/billing/*.config.ts` -- Payment provider configurations
- `.env.example` -- Complete reference of all environment variables
