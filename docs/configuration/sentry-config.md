---
id: sentry-config
title: Sentry Error Tracking Configuration
sidebar_label: Sentry Config
sidebar_position: 10
---

# Sentry Error Tracking Configuration

This page documents the Sentry integration for error tracking, performance monitoring, and session replay in the template. Configuration is split across three files: `sentry.config.ts` (webpack plugin), `instrumentation.ts` (server-side init), and `instrumentation-client.ts` (client-side init).

## Overview

The template uses the `@sentry/nextjs` SDK to capture errors and performance data on both the server and client. Sentry is entirely opt-in -- if no DSN is configured, all Sentry initialization is skipped.

## Webpack Plugin Configuration

The file `sentry.config.ts` at the project root configures the Sentry webpack plugin used during the build:

```ts
export const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || "your-org-name",
  project: process.env.SENTRY_PROJECT || "your-project-name",

  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
};
```

### Plugin Options

| Option | Default | Description |
|--------|---------|-------------|
| `silent` | `true` | Suppresses webpack plugin console output during builds |
| `org` | `SENTRY_ORG` env var | Your Sentry organization slug |
| `project` | `SENTRY_PROJECT` env var | Your Sentry project slug |
| `widenClientFileUpload` | `true` | Uploads a wider set of client-side source files for better stack traces |
| `transpileClientSDK` | `true` | Transpiles the Sentry SDK for broader browser compatibility |
| `tunnelRoute` | `"/monitoring"` | Proxies Sentry requests through your app to avoid ad blockers |
| `hideSourceMaps` | `true` | Prevents source maps from being publicly accessible in production |
| `disableLogger` | `true` | Disables the Sentry logger to reduce bundle size |

### Integration with Next.js Config

The plugin options are consumed in `next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## Environment Variables

Sentry relies on these environment variables, defined in `lib/constants.ts`:

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | No | The Sentry DSN (Data Source Name). If not set, Sentry is disabled. |
| `SENTRY_ORG` | No | Sentry organization slug for source map uploads |
| `SENTRY_PROJECT` | No | Sentry project slug for source map uploads |
| `SENTRY_AUTH_TOKEN` | No | Auth token for uploading source maps during builds |
| `SENTRY_ENABLE_DEV` | No | Set to `"true"` to enable Sentry in development mode |
| `SENTRY_DEBUG` | No | Set to `"true"` to enable Sentry SDK debug logging |

## Server-Side Initialization

Server-side Sentry is initialized in `instrumentation.ts`, which runs once when the Next.js server starts:

```ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_DEBUG } from "@/lib/constants";

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

  // Database initialization follows...
}

// Capture errors from React Server Components
export const onRequestError = Sentry.captureRequestError;
```

### Server Sample Rates

- **Production:** 10% trace sampling (`0.1`) to balance cost and visibility
- **Development:** 100% trace sampling (`1.0`) for full debugging visibility

### Error Reporting

Database initialization failures are reported to Sentry with contextual tags:

```ts
if (SENTRY_DSN.value) {
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
```

## Client-Side Initialization

Client-side Sentry is initialized in `instrumentation-client.ts`:

```ts
import * as Sentry from "@sentry/nextjs";
import { Replay } from "@sentry/replay";
import {
  SENTRY_DSN,
  SENTRY_DEBUG,
  SENTRY_ENABLED,
} from "@/lib/constants";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || !SENTRY_ENABLED)
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

// Router transition instrumentation
export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
```

### Client-Side Features

**Session Replay** is configured with privacy-focused defaults:

- `maskAllText: true` -- All text content is masked in replays
- `blockAllMedia: true` -- All media elements are blocked in replays
- Error replays are captured at 100% (`replaysOnErrorSampleRate: 1.0`)
- General session replays are captured at 10% in production

**Router Transitions** are instrumented via `onRouterTransitionStart` to track page navigation performance.

## Tunnel Route

The `tunnelRoute: "/monitoring"` option proxies Sentry event submissions through your application at the `/monitoring` endpoint. This helps bypass ad blockers and content security policies that might block direct requests to Sentry's servers.

## Sample Rate Summary

| Metric | Development | Production |
|--------|-------------|------------|
| Trace sample rate (server) | 100% | 10% |
| Trace sample rate (client) | 100% | 10% |
| Error replay rate | 100% | 100% |
| Session replay rate | 100% | 10% |

## Enabling Sentry

To enable Sentry in your deployment:

1. Create a Sentry project at [sentry.io](https://sentry.io)
2. Set the required environment variables:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. For development, also set:

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## Related Resources

- [Instrumentation Guide](/docs/template/guides/instrumentation) -- Full documentation of the instrumentation lifecycle
- [Error Handling Patterns](/docs/template/guides/error-handler-patterns) -- How errors are structured and logged
- [Environment Reference](/docs/template/configuration/environment-reference) -- All environment variables
