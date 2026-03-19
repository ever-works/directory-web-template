---
id: environment-reference
title: Environment Variables Complete Reference
sidebar_label: Environment Reference
sidebar_position: 1
---

# Environment Variables Complete Reference

This page provides a comprehensive reference of all environment variables used by the Ever Works template. Variables are organized by category with their types, default values, and whether they are required.

Copy `.env.example` to `.env.local` and fill in the values for your deployment.

## Content & Data Repository

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `DATA_REPOSITORY` | string (URL) | **Yes** | -- | Git repository URL for content data |
| `GH_TOKEN` | string | No | -- | GitHub personal access token (for private repos) |
| `GITHUB_TOKEN` | string | No | -- | Alternative GitHub token variable |
| `GITHUB_BRANCH` | string | No | `master` | Git branch to clone content from |

## Database

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `DATABASE_URL` | string | Recommended | -- | Database connection string (SQLite or Postgres) |

When `DATABASE_URL` is not set, database-dependent features (ratings, comments, favorites, surveys, featured items) are automatically disabled via the feature flags system.

## Authentication

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `AUTH_SECRET` | string | **Yes** | -- | NextAuth secret (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **Yes** | -- | Cookie encryption secret |
| `COOKIE_DOMAIN` | string | No | -- | Cookie domain (e.g., `localhost`) |
| `COOKIE_SECURE` | boolean | No | `true` | Secure cookie flag |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | No | `15m` | Access token TTL |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | No | `7d` | Refresh token TTL |

### OAuth Providers

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `GOOGLE_CLIENT_ID` | string | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | string | No | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | string | No | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | string | No | GitHub OAuth client secret |
| `MICROSOFT_CLIENT_ID` | string | No | Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | string | No | Microsoft OAuth client secret |
| `FB_CLIENT_ID` | string | No | Facebook OAuth client ID |
| `FB_CLIENT_SECRET` | string | No | Facebook OAuth client secret |
| `X_CLIENT_ID` | string | No | X (Twitter) OAuth client ID |
| `X_CLIENT_SECRET` | string | No | X (Twitter) OAuth client secret |
| `LINKEDIN_CLIENT_ID` | string | No | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | string | No | LinkedIn OAuth client secret |

OAuth providers auto-enable when both client ID and secret are set.

## Site & Branding (Client-Safe)

All `NEXT_PUBLIC_*` variables are exposed to the browser.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | Directory app URL |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | Company public website URL |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | API base URL |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | Site name for metadata |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | Site tagline |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | Brand name for schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (see .env.example) | SEO description (under 160 chars) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | Comma-separated SEO keywords |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | Logo path (relative to /public) |

### OG Image Theming

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | OG image gradient start color |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | OG image gradient end color |

### Social Media Links

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | GitHub link |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | X (Twitter) link |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (see .env.example) | LinkedIn link |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (see .env.example) | Facebook link |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | Blog link |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | Contact email |

### Attribution

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | "Built with" link URL |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | "Built with" link text |

## Payment Providers

### Stripe

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `STRIPE_SECRET_KEY` | string | No | Stripe secret key (server-only) |
| `STRIPE_PUBLISHABLE_KEY` | string | No | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | string | No | Webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | No | Client-safe publishable key |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | No | Load prices from Stripe API |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | No | Enable Stripe checkout |

#### Stripe Multi-Currency Price IDs

For Standard and Premium plans, the template supports currency-specific price IDs:

```
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=
...
```

The same pattern applies for Premium plan variables and setup fee IDs.

### LemonSqueezy

| Variable | Type | Description |
|----------|------|-------------|
| `LEMONSQUEEZY_API_KEY` | string | API key |
| `LEMONSQUEEZY_STORE_ID` | string | Store identifier |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | Webhook secret |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | Webhook endpoint URL |
| `LEMONSQUEEZY_TEST_MODE` | boolean | Enable test mode |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | Free plan variant |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | Standard plan variant |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | Premium plan variant |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | Enable checkout |

### Polar

| Variable | Type | Description |
|----------|------|-------------|
| `POLAR_ACCESS_TOKEN` | string | Access token |
| `POLAR_WEBHOOK_SECRET` | string | Webhook secret |
| `POLAR_ORGANIZATION_ID` | string | Organization ID |
| `POLAR_SANDBOX` | boolean | Sandbox mode (default: `true`) |
| `POLAR_API_URL` | string (URL) | Custom API URL |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | Free plan ID |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | Standard plan ID |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | Premium plan ID |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | Enable checkout |

### Solidgate

| Variable | Type | Description |
|----------|------|-------------|
| `SOLIDGATE_API_KEY` | string | API key |
| `SOLIDGATE_SECRET_KEY` | string | Secret key |
| `SOLIDGATE_WEBHOOK_SECRET` | string | Webhook secret |
| `SOLIDGATE_MERCHANT_ID` | string | Merchant ID |
| `SOLIDGATE_API_BASE_URL` | string (URL) | API base URL |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | Client-safe key |

### Product Pricing

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | Free tier price |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | Standard tier price |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | Premium tier price |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | Premium trial amount ID |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | Standard trial amount ID |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | Enable trial amounts |

## Analytics & Monitoring

### PostHog

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | PostHog host |
| `POSTHOG_DEBUG` | boolean | `false` | Enable debug logging |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | Session recording |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | Auto-capture events |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | Server-side API key |
| `POSTHOG_PROJECT_ID` | string | -- | Project ID for analytics |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | Exception tracking |

### Sentry

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | Sentry DSN |
| `SENTRY_ORG` | string | `ever-co` | Sentry organization |
| `SENTRY_PROJECT` | string | `ever-works` | Sentry project name |
| `SENTRY_AUTH_TOKEN` | string | -- | Sentry auth token |
| `SENTRY_ENABLE_DEV` | boolean | `false` | Enable in development |
| `SENTRY_DEBUG` | boolean | `false` | Debug mode |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | Exception tracking |

### Other Analytics

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | Exception provider (`posthog` or `sentry`) |
| `ANALYZE` | boolean | `true` | Enable bundle analysis |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | reCAPTCHA site key |
| `RECAPTCHA_SECRET_KEY` | string | -- | reCAPTCHA secret key |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | Speed Insights sample rate |

## Email

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EMAIL_PROVIDER` | string | `resend` | Email provider (`resend` or `novu`) |
| `EMAIL_FROM` | string | `info@ever.works` | From address for notifications |
| `EMAIL_SUPPORT` | string | `support@ever.works` | Support email address |
| `COMPANY_NAME` | string | `Ever Works` | Company name for email templates |
| `RESEND_API_KEY` | string | -- | Resend API key |
| `NOVU_API_KEY` | string | -- | Novu API key |
| `SMTP_HOST` | string | -- | SMTP server hostname |
| `SMTP_PORT` | number | `587` | SMTP port |
| `SMTP_USER` | string | -- | SMTP username |
| `SMTP_PASSWORD` | string | -- | SMTP password |

## Integrations

### Twenty CRM

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | Twenty CRM instance URL |
| `TWENTY_CRM_API_KEY` | string | -- | API key for authentication |
| `TWENTY_CRM_ENABLED` | boolean | `false` | Explicit enable/disable |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | Sync mode (`disabled`, `platform`, `direct_crm`) |

### Trigger.dev (Background Jobs)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | Enable Trigger.dev |
| `TRIGGER_DEV_API_KEY` | string | -- | API key |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | Custom API URL |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | Environment (`development`, `staging`, `production`) |

### Cron Jobs

| Variable | Type | Description |
|----------|------|-------------|
| `CRON_SECRET` | string | Authentication secret for cron endpoints |

### Maps & Location

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | Mapbox public token (`pk.*`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | Google Maps browser-restricted key |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | Google Maps map ID |

### Ever Works Platform API

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | Platform API URL |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | Platform API authentication token |

## Vercel & Deployment

| Variable | Type | Description |
|----------|------|-------------|
| `VERCEL_TOKEN` | string | Vercel personal access token |
| `VERCEL_PROJECT_ID` | string | Vercel project ID |
| `VERCEL_TEAM_SCOPE` | string | Vercel team ID |
| `VERCEL_PLAN` | string | Plan type (`pro` for 5-min cron) |
| `VERCEL_DEPLOYMENT_ID` | string | Current deployment ID |
| `CRON_FREQUENCY` | string | Force cron frequency (e.g., `5min`) |

## Demo & Seeding

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_DEMO` | boolean | `true` | Enable demo mode with sample data |
| `SEED_ADMIN_EMAIL` | string | `admin@changeme.com` | Admin user email for seeding |
| `SEED_ADMIN_PASSWORD` | string | `changeme_password` | Admin user password for seeding |
| `SEED_FAKE_USER_COUNT` | number | `10` | Number of fake users to generate |
| `NODE_ENV` | string | `development` | Node environment |

## Related Files

- `.env.example` -- Template file with all variables and inline documentation
- `lib/config/schemas/*.schema.ts` -- Zod validation schemas for each category
- `lib/config/config-service.ts` -- Centralized validation and access
- `lib/config/client.ts` -- Client-safe configuration module
