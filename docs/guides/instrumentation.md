---
id: instrumentation
title: Application Instrumentation
sidebar_label: Instrumentation
sidebar_position: 25
---

# Application Instrumentation

This page documents the instrumentation layer in the template, covering server-side and client-side initialization, Sentry integration, database auto-migration, and error capture hooks. The relevant files are `instrumentation.ts` and `instrumentation-client.ts` at the project root.

## Overview

Next.js instrumentation files run once when the application starts. The template uses this mechanism for two critical purposes:

1. **Error tracking initialization** -- Setting up Sentry on both server and client
2. **Database initialization** -- Running automatic migrations and seeding at startup

## Server-Side Instrumentation

The file `instrumentation.ts` handles server-side initialization:

```ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_DEBUG } from "@/lib/constants";
import { initializeDatabase } from "@/lib/db/initialize";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Only initialize Sentry if DSN is configured
  if (SENTRY_DSN.value) {
    Sentry.init({
      dsn: SENTRY_DSN.value,
      tracesSampleRate:
        process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: SENTRY_DEBUG.value === "true",
    });
  }

  // Auto-initialize database
  try {
    console.log(
      "[Instrumentation] Running database initialization..."
    );
    await initializeDatabase();
    console.log(
      "[Instrumentation] Database initialization completed"
    );
  } catch (error) {
    const isProduction =
      process.env.NODE_ENV === "production" ||
      process.env.VERCEL_ENV === "production";

    console.error(
      "[Instrumentation] Database initialization failed:",
      error
    );

    // Report to Sentry if configured
    if (error instanceof Error && SENTRY_DSN.value) {
      Sentry.captureException(error, {
        tags: {
          component: "instrumentation",
          phase: "database_init",
          environment:
            process.env.VERCEL_ENV ||
            process.env.NODE_ENV ||
            "unknown",
        },
      });
    }

    // In production, re-throw to signal critical failure
    if (isProduction) {
      throw error;
    }

    // In development, allow app to start for debugging
    console.warn(
      "[Instrumentation] Non-production: Allowing app to start despite DB init failure"
    );
  }
}

// Capture errors from React Server Components
export const onRequestError = Sentry.captureRequestError;
```

### Runtime Guard

The function starts with a runtime check:

```ts
if (process.env.NEXT_RUNTIME !== "nodejs") return;
```

This ensures server-side initialization only runs in the Node.js runtime, not in the Edge runtime. The Edge runtime has its own initialization path through the client instrumentation file.

### Sentry Server Init

Sentry initialization is conditional on the `SENTRY_DSN` constant having a value:

- **DSN present:** Sentry is initialized with trace sampling and debug settings
- **DSN absent:** Sentry is completely skipped, producing zero overhead

Trace sample rates are environment-aware:

| Environment | Sample Rate |
|-------------|-------------|
| Production | 10% (`0.1`) |
| Development | 100% (`1.0`) |

### Database Auto-Initialization

After Sentry setup, the server instrumentation runs `initializeDatabase()`. This function handles:

- Running pending Drizzle migrations
- Seeding initial data if the database is empty

The error handling for database initialization follows a strict production/development split:

**In production:**
- Errors are logged with full details (message, stack trace, error name)
- Errors are reported to Sentry with contextual tags
- The error is re-thrown, causing the deployment to fail health checks
- This prevents serving traffic from a broken database state

**In development/preview:**
- Errors are logged prominently with warning messages
- The application continues to start
- Database-dependent routes will return errors, but the app remains debuggable

### React Server Component Error Capture

The exported `onRequestError` hook captures errors from React Server Components:

```ts
export const onRequestError = Sentry.captureRequestError;
```

This ensures that errors thrown during server-side rendering are automatically reported to Sentry.

## Client-Side Instrumentation

The file `instrumentation-client.ts` handles browser-side initialization:

```ts
import * as Sentry from "@sentry/nextjs";
import { Replay } from "@sentry/replay";
import {
  SENTRY_DSN,
  SENTRY_DEBUG,
  SENTRY_ENABLED,
} from "@/lib/constants";

export function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    !SENTRY_ENABLED
  )
    return;

  Sentry.init({
    dsn: SENTRY_DSN.value,
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: SENTRY_DEBUG.value === "true",

    // Session Replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      new Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
```

### Client Guard

The client instrumentation has a dual guard:

```ts
if (process.env.NEXT_RUNTIME === "nodejs" || !SENTRY_ENABLED)
  return;
```

- Skips if running in Node.js (that is handled by the server file)
- Skips if `SENTRY_ENABLED` is falsy (no DSN configured, or not in production/dev-override mode)

### Session Replay

The client SDK includes Sentry Session Replay with privacy-focused defaults:

| Setting | Value | Purpose |
|---------|-------|---------|
| `maskAllText` | `true` | Replaces all text with asterisks in recordings |
| `blockAllMedia` | `true` | Blocks images, videos, and other media in recordings |
| `replaysOnErrorSampleRate` | `1.0` | Always capture replay when an error occurs |
| `replaysSessionSampleRate` | `0.1` (prod) | Capture 10% of normal sessions in production |

### Router Transition Tracking

The `onRouterTransitionStart` export instruments Next.js client-side navigation:

```ts
export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
```

This creates performance spans for route transitions, helping you identify slow page navigations.

## SENTRY_ENABLED Logic

The `SENTRY_ENABLED` constant from `lib/constants.ts` determines whether client-side Sentry should initialize:

```ts
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" ||
    clientEnv.isProduction);
```

Sentry is enabled on the client when:
- A DSN is configured, AND
- Either the app is in production, OR `SENTRY_ENABLE_DEV` is set to `"true"`

## Lifecycle Summary

```
Application Start
  |
  +-- Server (instrumentation.ts)
  |     |-- Sentry.init() (if DSN present)
  |     |-- initializeDatabase()
  |     |     |-- Run migrations
  |     |     +-- Seed data (if needed)
  |     +-- Export onRequestError hook
  |
  +-- Client (instrumentation-client.ts)
        |-- Sentry.init() (if SENTRY_ENABLED)
        |     |-- Session Replay integration
        |     +-- Performance tracing
        +-- Export onRouterTransitionStart hook
```

## Troubleshooting

### Database initialization fails in production

Check Vercel deployment logs for `[Instrumentation]` prefixed messages. The error details include the message, stack trace, and error name. If Sentry is configured, the error will also appear in your Sentry dashboard with the `component: instrumentation` and `phase: database_init` tags.

### Sentry events not appearing

1. Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. For development, ensure `SENTRY_ENABLE_DEV=true` is set
3. Check that `SENTRY_DEBUG=true` shows initialization logs in the console
4. Verify the tunnel route `/monitoring` is not blocked by your hosting provider

## Related Resources

- [Sentry Configuration](/template/configuration/sentry-config) -- Detailed Sentry webpack plugin options
- [Drizzle Configuration](/template/configuration/drizzle-config) -- Database schema and migration setup
- [Error Handling Patterns](/template/guides/error-handler-patterns) -- Centralized error handling utilities
