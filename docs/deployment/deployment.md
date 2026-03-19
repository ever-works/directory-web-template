---
id: deployment-introduction
title: Deployment Introduction
sidebar_label: Deployment Introduction
sidebar_position: 1
---

# Deployment Introduction

This guide provides a comprehensive overview of deploying the Ever Works Template to production environments. The template is built on Next.js 16 with a standalone output mode, making it compatible with a wide range of hosting platforms and containerized deployments.

## Architecture Overview

The Ever Works Template produces a **standalone Next.js build** that bundles all dependencies into a single deployable unit. This is configured in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react"],
  },
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  staticPageGenerationTimeout: 180,
};
```

The `output: "standalone"` setting creates a self-contained deployment artifact that includes only the necessary `node_modules` files, reducing the deployment size significantly.

## Supported Platforms

### Recommended: Vercel

Vercel is the recommended deployment platform for the template. It offers:

- Zero-configuration deployment for Next.js applications
- Automatic SSL certificate provisioning
- Built-in cron job scheduling via `vercel.json`
- Serverless function support for API routes
- Preview deployments for pull requests

The template includes a `vercel.json` configuration with predefined cron schedules:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Self-Hosted: Docker

The standalone output supports Docker containerization. A typical deployment uses the Node.js runtime to serve the built application. The key requirement is ensuring that the `standalone` output directory and the `public` and `.next/static` folders are copied into the container image.

### Other Cloud Platforms

The template can be deployed to any platform that supports Node.js applications:

- **Railway** -- Simple full-stack deployment with built-in PostgreSQL
- **DigitalOcean App Platform** -- Managed container deployments
- **AWS (EC2, ECS, or App Runner)** -- Scalable cloud infrastructure
- **Google Cloud Run** -- Serverless container platform
- **Azure App Service** -- Managed Node.js hosting

## Prerequisites

### System Requirements

- **Node.js**: version 20.19.0 or higher (defined in `package.json` engines field)
- **Package Manager**: pnpm (the project uses `pnpm-lock.yaml`)
- **Database**: PostgreSQL (required for production features like auth, subscriptions, analytics)
- **Memory**: At least 8 GB RAM recommended for the build process

The build script allocates extra memory explicitly:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### Required Environment Variables

Before deployment, ensure these critical variables are configured. The `scripts/check-env.js` script validates them automatically:

```bash
# Core (critical -- application will not function without these)
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
AUTH_SECRET=<generated-secret>         # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Cookie Configuration
COOKIE_SECRET=<generated-secret>       # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

The environment check script categorizes variables by integration:

```
Core:            NODE_ENV, PORT, APP_*, BASE_URL
Database:        DATABASE_URL, DB_*, POSTGRES_*
Auth:            AUTH_*, GOOGLE_*, GITHUB_*, FB_*, TWITTER_*
Supabase:        SUPABASE_*, NEXT_PUBLIC_SUPABASE_*
Content:         DATA_REPOSITORY, GH_TOKEN
Email:           RESEND_API_KEY, EMAIL_*
Payment:         STRIPE_*, PAYPAL_*
Analytics:       POSTHOG_*, SENTRY_*
Background Jobs: TRIGGER_DEV_*
```

### Optional Integrations

These environment variables enable optional features:

```bash
# OAuth Providers (each requires both CLIENT_ID and CLIENT_SECRET)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=...
```

## Quick Deploy Guide

### Step 1: Prepare the Build

Run the full build process locally to verify everything compiles:

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

The `build` script executes several steps in sequence:

1. **Environment check** (`scripts/check-env.js`) -- validates required variables
2. **OpenAPI generation** (`scripts/generate-openapi.ts`) -- generates API documentation
3. **Database migrations** (`scripts/build-migrate.ts`) -- applies pending schema changes
4. **Next.js build** (`next build`) -- compiles the application

### Step 2: Build-Time Database Migration

The `scripts/build-migrate.ts` script runs automatically during the build. It handles different environments:

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

Key behaviors:

- **Production builds**: Migration failures cause the build to fail (preventing broken deployments)
- **Preview deployments**: Connection errors are tolerated (the database may not be provisioned)
- **CI builds** (non-Vercel): Migrations are skipped entirely

### Step 3: Runtime Initialization

When the application starts, the `instrumentation.ts` file triggers database initialization:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Auto-initialize database (migrate and seed if needed)
  try {
    await initializeDatabase();
  } catch (error) {
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In development/preview, allow app to start for debugging
  }
}
```

The initialization sequence:

1. Run any pending migrations (Drizzle handles idempotency)
2. Check if the database is seeded
3. If not seeded, acquire a PostgreSQL advisory lock and run the seed script
4. Release the lock after seeding completes

### Step 4: Deploy to Vercel

For Vercel deployments, connect your repository and configure:

1. Set the **Framework Preset** to Next.js
2. Set the **Build Command** to `pnpm build`
3. Set the **Install Command** to `pnpm install`
4. Add all required environment variables in the Vercel dashboard
5. Deploy

### Step 5: Verify the Deployment

After deployment, verify:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## Security Headers

The template configures security headers automatically in `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' ...",
        },
      ],
    },
  ];
}
```

## Connection Pool Configuration

The database connection pool is configurable via the `DB_POOL_SIZE` environment variable:

```typescript
const getPoolSize = (): number => {
  const envPoolSize = process.env.DB_POOL_SIZE;
  if (envPoolSize) {
    const parsed = parseInt(envPoolSize, 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50));
  }
  return getNodeEnv() === 'production' ? 20 : 10;
};
```

- **Production default**: 20 connections
- **Development default**: 10 connections
- **Configurable range**: 1 to 50 connections
- **Idle timeout**: 20 seconds
- **Connect timeout**: 30 seconds

## Next Steps

- [SSL and Custom Domains](./ssl-domains.md) -- Configure custom domains and SSL certificates
- [Database Management](./database-management.md) -- Production database operations
- [Backup and Recovery](./backup-recovery.md) -- Database backup strategies
- [Monitoring](./monitoring.md) -- Set up error tracking and performance monitoring
