---
id: auth-config-reference
title: Auth.js Configuration Reference
sidebar_label: Auth Config Reference
sidebar_position: 11
---

# Auth.js Configuration Reference

This page documents the NextAuth (Auth.js) configuration defined in `auth.config.ts`. This file sets up authentication providers, session strategy, and error handling for the template.

## Overview

The template supports multiple authentication strategies through a unified configuration:

- **NextAuth (Auth.js)** -- OAuth and credentials-based authentication
- **Supabase Auth** -- Supabase-native authentication
- **Both** -- Dual-provider mode for maximum flexibility

The `auth.config.ts` file specifically configures the NextAuth side of this system.

## Configuration File

The root `auth.config.ts` exports a `NextAuthConfig` object:

```ts
import { NextAuthConfig } from "next-auth";
import { createNextAuthProviders } from "./lib/auth/providers";
import {
  configureOAuthProviders,
  logError,
} from "./lib/auth/error-handler";
import {
  ErrorType,
  createAppError,
} from "./lib/utils/error-handler";
import { authConfig } from "@/lib/config/config-service";

const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === "google")
        ? {
            enabled: true,
            clientId: authConfig.google.clientId || "",
            clientSecret: authConfig.google.clientSecret || "",
            options: {
              allowDangerousEmailAccountLinking: false,
            },
          }
        : { enabled: false },
      github: oauthProviders.find((p) => p.id === "github")
        ? {
            enabled: true,
            clientId: authConfig.github.clientId || "",
            clientSecret: authConfig.github.clientSecret || "",
          }
        : { enabled: false },
      facebook: oauthProviders.find((p) => p.id === "facebook")
        ? {
            enabled: true,
            clientId: authConfig.facebook.clientId || "",
            clientSecret: authConfig.facebook.clientSecret || "",
          }
        : { enabled: false },
      twitter: oauthProviders.find((p) => p.id === "twitter")
        ? {
            enabled: true,
            clientId: authConfig.twitter.clientId || "",
            clientSecret: authConfig.twitter.clientSecret || "",
          }
        : { enabled: false },
      credentials: {
        enabled: true,
      },
    });
  } catch (error) {
    // Fallback to credentials only on OAuth failure
    const appError = createAppError(
      "Failed to configure OAuth providers. Falling back to credentials only.",
      ErrorType.CONFIG,
      "OAUTH_CONFIG_FAILED",
      error
    );
    logError(appError, "Auth Config");

    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      github: { enabled: false },
      facebook: { enabled: false },
      twitter: { enabled: false },
    });
  }
};

export default {
  trustHost: true,
  providers: configureProviders(),
} satisfies NextAuthConfig;
```

## Key Properties

### `trustHost`

Set to `true` to trust the host header when running behind a reverse proxy (such as Vercel). This is required for proper redirect URL generation in production environments.

### `providers`

The providers array is built dynamically based on which OAuth providers have valid credentials configured. The `configureProviders()` function:

1. Calls `configureOAuthProviders()` to validate environment variables
2. Maps each enabled provider to its NextAuth provider configuration
3. Always includes the credentials provider as a fallback

## Supported Providers

| Provider | Environment Variables Required | Notes |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Email account linking disabled by default |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Standard OAuth flow |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | Standard OAuth flow |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | OAuth 2.0 flow |
| Credentials | None (always enabled) | Email/password authentication |

## Provider Architecture

The provider creation pipeline involves several files working together.

### Provider Factory (`lib/auth/providers.ts`)

The `createNextAuthProviders` function maps configuration objects to actual NextAuth provider instances:

```ts
export function createNextAuthProviders(
  config: OAuthProvidersConfig = defaultOAuthProvidersConfig
) {
  const providers = [];

  if (
    config.google?.enabled &&
    config.google.clientId &&
    config.google.clientSecret
  ) {
    providers.push(
      GoogleProvider({
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
        ...config.google.options,
      })
    );
  }

  // Similar blocks for GitHub, Facebook, Twitter...

  if (config.credentials?.enabled) {
    providers.push(credentialsProvider);
  }

  return providers;
}
```

### Auth Error Handler (`lib/auth/error-handler.ts`)

The auth error handler validates environment variables and provides human-readable error messages:

```ts
export function validateAuthConfig() {
  const baseNextAuthVars = ["AUTH_SECRET", "NEXT_PUBLIC_APP_URL"];

  const providerEnvVars = {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    facebook: ["FB_CLIENT_ID", "FB_CLIENT_SECRET"],
    microsoft: [
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
    ],
    supabase: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
  };

  // Check which providers have all required variables
  const enabledProviders: Record<string, boolean> = {};

  Object.entries(providerEnvVars).forEach(([provider, vars]) => {
    const hasAllVars = vars.every(
      (varName) => !!process.env[varName]?.trim()
    );
    enabledProviders[provider] = hasAllVars;
  });

  return enabledProviders;
}
```

## Graceful Degradation

A key design principle is graceful degradation. If OAuth configuration fails at startup:

1. The error is captured as a structured `AppError` with type `CONFIG` and code `OAUTH_CONFIG_FAILED`
2. The error is logged with the `"Auth Config"` context
3. The system falls back to credentials-only authentication
4. The application continues to start normally

This means a misconfigured Google OAuth secret will not prevent the entire application from running -- users can still sign in with email and password.

## Partially Configured Providers

When a provider has some but not all required environment variables, a warning is logged:

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

This helps identify configuration issues without crashing the application.

## Required Environment Variables

At minimum, configure these for NextAuth to function:

```env
# Required for all NextAuth configurations
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Add provider credentials to enable OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Generate `AUTH_SECRET` using:

```bash
openssl rand -base64 32
```

## Related Resources

- [Provider Configuration](/docs/template/configuration/provider-config) -- Choosing between NextAuth, Supabase, or both
- [Environment Reference](/docs/template/configuration/environment-reference) -- Full environment variable listing
- [Error Handling Patterns](/docs/template/guides/error-handler-patterns) -- How auth errors are structured
