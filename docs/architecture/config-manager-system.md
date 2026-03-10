---
id: config-manager-system
title: "Config Manager System"
sidebar_label: "Config Manager System"
sidebar_position: 41
---

# Config Manager System

## Overview

The Config Manager System provides two complementary configuration layers: the **ConfigManager** class (`lib/config-manager.ts`) for managing the YAML-based content configuration file (`config.yml`) with Git-backed persistence, and the **ConfigService** (`lib/config/`) for validating and accessing environment-variable-based application configuration with Zod schemas. Together they cover both runtime-editable settings and deployment-time environment configuration.

## Architecture

The system is divided into two distinct subsystems:

### ConfigManager (YAML-based, runtime-editable)

`lib/config-manager.ts` manages the `config.yml` file inside the `.content/` directory (cloned from the data repository). It reads and writes YAML configuration, and automatically commits and pushes changes to the Git repository using `isomorphic-git`. This is used for settings that administrators can change at runtime (pagination, navigation, header/footer).

### ConfigService (Environment-based, startup-validated)

`lib/config/` provides a Zod-validated singleton that reads all environment variables at startup and organizes them into typed sections: core, auth, email, payment, analytics, and integrations. It includes feature flags, environment detection utilities, and tree-shakeable exports.

```
config-manager.ts       --> Runtime YAML config (config.yml)
lib/config/
  index.ts              --> Barrel exports
  config-service.ts     --> Singleton ConfigService class
  types.ts              --> Type definitions
  env.ts                --> Zod-validated env variables
  feature-flags.ts      --> Database-dependent feature toggles
  schemas/              --> Zod schemas per section
  client.ts             --> Client-safe config exports
```

## API Reference

### ConfigManager (`lib/config-manager.ts`)

#### Types

```typescript
interface PaginationConfig {
  type: 'standard' | 'infinite';
  itemsPerPage: number;
}

interface AppConfig {
  pagination: PaginationConfig;
  [key: string]: any;
}
```

#### `configManager` (Singleton)

The default exported singleton instance of `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

Returns the full configuration object, merging file contents with defaults.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

Returns a top-level configuration value by key.

#### `configManager.getNestedValue(keyPath: string): any`

Returns a nested configuration value using dot-notation (e.g., `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

Updates a top-level key and persists to file + Git.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

Updates a nested key using dot-notation. Includes prototype pollution protection.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

Convenience method to update pagination settings.

#### `configManager.getPaginationConfig(): PaginationConfig`

Returns the current pagination configuration.

### ConfigService (`lib/config/config-service.ts`)

#### `configService` (Singleton)

Server-only singleton that validates all environment variables at startup.

| Property | Type | Description |
|----------|------|-------------|
| `configService.core` | `CoreConfig` | URLs, site info, database |
| `configService.auth` | `AuthConfig` | Secrets, OAuth providers |
| `configService.email` | `EmailConfig` | SMTP, Resend, Novu |
| `configService.payment` | `PaymentConfig` | Stripe, LemonSqueezy, Polar |
| `configService.analytics` | `AnalyticsConfig` | PostHog, Sentry, Recaptcha |
| `configService.integrations` | `IntegrationsConfig` | Trigger.dev, Twenty CRM |

#### Feature Flags (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

Features (ratings, comments, favorites, featuredItems, surveys) are enabled when `DATABASE_URL` is configured.

#### Environment Utilities (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## Implementation Details

**Git operation queue**: `ConfigManager` uses a serial queue with a mutex pattern to prevent concurrent Git operations. When `writeConfig()` is called, the file is saved immediately, and the Git commit/push is queued. If Git operations fail, the file save still succeeds.

**Lazy-loaded Git dependencies**: `isomorphic-git` and its HTTP module are loaded lazily via dynamic `import()` with a singleton pattern to avoid bundling issues and prevent duplicate imports.

**Prototype pollution protection**: The `updateNestedKey()` method checks for `__proto__`, `constructor`, and `prototype` keys at every level of the path to prevent prototype pollution attacks.

**Startup validation**: `ConfigService` validates all environment variables using Zod schemas during the first import. Invalid configuration causes a startup failure with descriptive error messages. Schemas use `.catch()` handlers for graceful degradation on optional fields.

**Server-only enforcement**: `config-service.ts` imports `'server-only'` to prevent accidental inclusion in client bundles. Client-safe configuration is exported separately from `lib/config/client.ts`.

## Configuration

### ConfigManager Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATA_REPOSITORY` | Yes | Git repository URL for content |
| `GH_TOKEN` | For Git push | GitHub access token |
| `GITHUB_BRANCH` | No | Branch name (default: `main`) |
| `GIT_NAME` | No | Committer name (default: `Website Bot`) |
| `GIT_EMAIL` | No | Committer email (default: `website@ever.works`) |

### ConfigService Environment Variables

See `.env.example` for the full list. Key sections include `AUTH_SECRET`, `DATABASE_URL`, `STRIPE_*`, `POSTHOG_*`, `RESEND_*`, and others validated by Zod schemas.

## Usage Examples

```typescript
// Runtime config (YAML)
import { configManager } from '@/lib/config-manager';

// Read pagination settings
const pagination = configManager.getPaginationConfig();
console.log(pagination.type); // 'standard' | 'infinite'

// Update pagination
await configManager.updatePagination('infinite', 24);

// Update a nested key
await configManager.updateNestedKey('custom_header', [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]);

// Environment config (validated)
import { configService, coreConfig, paymentConfig } from '@/lib/config';

const appUrl = coreConfig.APP_URL;
const stripeEnabled = paymentConfig.stripe.enabled;

// Feature flags
import { isFeatureEnabled } from '@/lib/config';

if (isFeatureEnabled('comments')) {
  // Render comments section
}
```

## Best Practices

- Use `configManager` for settings that need to be changed at runtime by administrators without redeployment.
- Use `configService` for deployment-time configuration that should be validated at startup.
- Import client-safe configuration from `@/lib/config/client` in client components, never from the main barrel export.
- Always handle the `Promise<boolean>` return from `updateKey` and `updateNestedKey` to detect write failures.
- Use feature flags to gracefully degrade functionality when optional dependencies (like the database) are not configured.

## Related Modules

- [Cache System](./cache-system) -- Uses `CACHE_TAGS.CONFIG` for configuration caching
- [Guards System](./guards-system-deep-dive) -- Consumes plan/feature configuration
- [Content Library](/template/architecture/content-library) -- Content path resolution used by ConfigManager
