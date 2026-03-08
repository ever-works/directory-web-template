---
id: deployment-checklist
title: "Deployment Checklist"
sidebar_label: "Deployment Checklist"
sidebar_position: 77
---

# Deployment Checklist

This checklist covers every step needed to take an Ever Works template site from development to production on Vercel. Work through each section sequentially -- items are ordered by dependency.

## Prerequisites

- A Vercel account with a linked Git repository
- A PostgreSQL database (Vercel Postgres, Neon, Supabase, or similar)
- Domain name configured (optional but recommended)

---

## 1. Environment Variables

Set all required environment variables in your Vercel project settings (Settings > Environment Variables).

### Core (Required)

- [ ] `NODE_ENV` -- set to `production`
- [ ] `AUTH_SECRET` -- generate with `openssl rand -base64 32`
- [ ] `COOKIE_SECRET` -- generate with `openssl rand -base64 32`
- [ ] `COOKIE_DOMAIN` -- your production domain (e.g., `example.com`)
- [ ] `COOKIE_SECURE` -- set to `true` for HTTPS
- [ ] `DATABASE_URL` -- PostgreSQL connection string
- [ ] `APP_URL` / `SITE_URL` -- full production URL (e.g., `https://example.com`)

### Content Repository

- [ ] `DATA_REPOSITORY` -- Git URL for the content CMS repository
- [ ] `GITHUB_TOKEN` -- Personal access token for private repositories (if applicable)

### Authentication Providers (configure at least one)

- [ ] `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` -- Google OAuth
- [ ] `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET` -- GitHub OAuth
- [ ] `AUTH_LINKEDIN_ID` + `AUTH_LINKEDIN_SECRET` -- LinkedIn OAuth

### Payment Provider (choose one)

- [ ] **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] **LemonSqueezy**: `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_STORE_ID`
- [ ] **Polar**: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_ORGANIZATION_ID`

### Email Provider (choose one)

- [ ] **Resend**: `RESEND_API_KEY`
- [ ] **Novu**: `NOVU_API_KEY`
- [ ] `EMAIL_FROM` -- sender address (e.g., `noreply@example.com`)
- [ ] `EMAIL_SUPPORT` -- support email address

### Analytics & Monitoring

- [ ] `NEXT_PUBLIC_POSTHOG_KEY` -- PostHog project API key
- [ ] `NEXT_PUBLIC_POSTHOG_HOST` -- PostHog instance URL
- [ ] `NEXT_PUBLIC_SENTRY_DSN` -- Sentry DSN
- [ ] `SENTRY_ORG` + `SENTRY_PROJECT` -- Sentry organization and project names
- [ ] `SENTRY_AUTH_TOKEN` -- Sentry auth token for source map uploads

### Security

- [ ] `CRON_SECRET` -- secret for authenticating cron job endpoints
- [ ] `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY` -- reCAPTCHA (if enabled)

---

## 2. Database Setup

- [ ] Create a PostgreSQL database (Vercel Postgres, Neon, Supabase, etc.)
- [ ] Set `DATABASE_URL` in Vercel environment variables
- [ ] Verify the connection string includes `?sslmode=require` for remote databases
- [ ] Migrations run automatically during build (via `scripts/build-migrate.ts`)
- [ ] As a fallback, `instrumentation.ts` runs migrations on server startup
- [ ] After first deployment, verify tables were created using Drizzle Studio or a SQL client

### Database Connection Pooling

- [ ] For Neon: use the pooled connection string (port 5432) for the app and direct string for migrations
- [ ] For Supabase: use the connection pooler URL for serverless
- [ ] Set `DB_POOL_SIZE` if needed (default: 20 in production, 10 in development)

---

## 3. Build Configuration

- [ ] Verify `vercel.json` contains the correct cron schedules
- [ ] Verify `next.config.ts` has `output: "standalone"` enabled
- [ ] Run `pnpm build` locally to catch build errors before deploying
- [ ] Run `pnpm lint` to check for linting issues
- [ ] Run `pnpm tsc --noEmit` to verify TypeScript types

---

## 4. Authentication Setup

- [ ] Configure OAuth callback URLs in each provider's dashboard:
  - Google: `https://your-domain.com/api/auth/callback/google`
  - GitHub: `https://your-domain.com/api/auth/callback/github`
  - LinkedIn: `https://your-domain.com/api/auth/callback/linkedin`
- [ ] Test login flow on the preview deployment before going live
- [ ] Verify `AUTH_SECRET` is set (NextAuth will fail without it)

---

## 5. Payment Provider Setup

### Stripe

- [ ] Switch from test keys to live keys
- [ ] Configure the webhook endpoint: `https://your-domain.com/api/stripe/webhook`
- [ ] Select the events to listen for: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
- [ ] Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### LemonSqueezy

- [ ] Configure the webhook URL: `https://your-domain.com/api/lemonsqueezy/webhook`
- [ ] Set the webhook signing secret in `LEMONSQUEEZY_WEBHOOK_SECRET`

### Polar

- [ ] Configure the webhook URL: `https://your-domain.com/api/polar/webhook`
- [ ] Set the webhook signing secret in `POLAR_WEBHOOK_SECRET`

---

## 6. Cron Jobs

- [ ] Verify `vercel.json` contains all needed cron entries:

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

- [ ] Set `CRON_SECRET` in Vercel environment variables
- [ ] After deployment, verify cron jobs appear in the Vercel dashboard under "Cron Jobs"

---

## 7. Domain & DNS

- [ ] Add your custom domain in Vercel project settings
- [ ] Configure DNS records (CNAME or A record as directed by Vercel)
- [ ] Enable automatic HTTPS (Vercel handles SSL certificates automatically)
- [ ] Update `APP_URL`, `SITE_URL`, and `COOKIE_DOMAIN` to match the production domain
- [ ] Update OAuth callback URLs to use the production domain

---

## 8. Image Optimization

- [ ] Verify `next.config.ts` has remote image patterns configured for all domains your content uses
- [ ] The template auto-generates patterns via `generateImageRemotePatterns()`
- [ ] Add any additional domains to `IMAGE_REMOTE_PATTERNS` in environment variables if needed

---

## 9. Content Sync

- [ ] Verify `DATA_REPOSITORY` points to the correct content repository
- [ ] Run an initial content sync: trigger `/api/cron/sync` or deploy and wait for the cron job
- [ ] Check that content appears correctly on the site after sync

---

## 10. Monitoring & Alerts

- [ ] Verify Sentry is capturing errors (check the Sentry dashboard after deployment)
- [ ] Verify PostHog is tracking events (check the PostHog dashboard)
- [ ] Set up Sentry alerts for:
  - Error rate spikes
  - Performance degradation
  - New unhandled exceptions
- [ ] Monitor the Vercel deployment logs for the first few hours

---

## 11. Security Hardening

- [ ] Verify `poweredByHeader: false` is set in `next.config.ts` (already configured)
- [ ] Verify `generateEtags: false` is set (already configured)
- [ ] Ensure all secrets are in Vercel environment variables, not committed to Git
- [ ] Review `.gitignore` to confirm `.env.local` and other secret files are excluded
- [ ] Enable Vercel deployment protection for preview branches if working with a team
- [ ] Verify reCAPTCHA is enabled on public forms (if applicable)

---

## 12. Performance Verification

- [ ] Run Lighthouse on the production URL (target: 90+ on all categories)
- [ ] Verify images are being optimized (check network tab for `/_next/image` requests)
- [ ] Verify static assets have long cache headers
- [ ] Test page load time from multiple regions
- [ ] Check that the `standalone` output mode is working (smaller deployment size)

---

## 13. Post-Deployment Smoke Test

Run through these critical flows manually:

- [ ] Homepage loads correctly with content
- [ ] User can sign up and sign in
- [ ] Admin can access the admin dashboard
- [ ] Items can be browsed, searched, and filtered
- [ ] Payment flow completes (use test mode if not yet live)
- [ ] Emails are delivered (test with a real email address)
- [ ] Mobile layout renders correctly
- [ ] Dark mode works
- [ ] Internationalization works (switch languages)

---

## Quick Reference: Deploy Commands

```bash
# Full pre-deployment check
pnpm lint && pnpm tsc --noEmit && pnpm build

# Database operations
pnpm db:generate    # Generate migration after schema changes
pnpm db:migrate     # Apply migrations
pnpm db:seed        # Seed initial data
pnpm db:studio      # Open Drizzle Studio for inspection

# Content sync
pnpm run clone      # Clone content repository
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Build fails on Vercel but works locally | Check that all `NEXT_PUBLIC_*` variables are set in Vercel (client-side variables need this prefix) |
| Database connection timeout | Verify `DATABASE_URL` includes `?sslmode=require` and uses a pooled connection for serverless |
| OAuth login fails | Update callback URLs to match the production domain exactly |
| Cron jobs not running | Verify `CRON_SECRET` is set and `vercel.json` is in the repository root |
| Emails not sending | Verify the email provider API key and `EMAIL_FROM` are configured |
| Images not loading | Add the image domains to the remote patterns in `next.config.ts` |

---

## Related Pages

- [Getting Started](/template/getting-started) -- initial project setup
- [Configuration](/template/configuration) -- full environment variable reference
- [Performance Optimization](/template/guides/performance-optimization) -- post-deployment optimization
- [Database Health Check](/template/guides/database-health-check) -- monitoring database health
- [How to Add a Cron Job](/template/guides/how-to-add-a-cron-job) -- configuring scheduled tasks
