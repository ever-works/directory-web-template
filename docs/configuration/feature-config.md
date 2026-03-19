---
id: feature-config
title: "Feature Configuration"
sidebar_label: "Feature Config"
sidebar_position: 3
---

# Feature Configuration

The template uses a feature flag system to gracefully enable or disable functionality based on system configuration. This allows the application to work without a database (serving static content only) while progressively enabling features as infrastructure becomes available.

## Feature Flags Module

The feature flags are defined in `lib/config/feature-flags.ts`.

### FeatureFlags Interface

```ts
interface FeatureFlags {
  /** User ratings and reviews functionality */
  ratings: boolean;
  /** User comments on items */
  comments: boolean;
  /** User favorite items collection */
  favorites: boolean;
  /** Admin-managed featured items display */
  featuredItems: boolean;
  /** User surveys and feedback collection */
  surveys: boolean;
}
```

### How Flags Are Determined

All current features depend on database availability. A feature is enabled when `DATABASE_URL` is configured:

```ts
export function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

This design allows the template to serve content from the Git-based CMS without any database, while database-dependent interactive features (ratings, comments, favorites) are disabled automatically.

### Utility Functions

The module provides several helper functions:

```ts
// Check a single feature
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Render comments component
}

// Get all enabled features
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']

// Get all disabled features (useful for debugging)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// Check if everything is ready
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('Full platform is operational');
}
```

### Full API Reference

| Function | Returns | Description |
|----------|---------|-------------|
| `getFeatureFlags()` | `FeatureFlags` | All flags as a boolean object |
| `isFeatureEnabled(name)` | `boolean` | Check a single feature by name |
| `getEnabledFeatures()` | `string[]` | Array of enabled feature names |
| `getDisabledFeatures()` | `string[]` | Array of disabled feature names |
| `areAllFeaturesEnabled()` | `boolean` | True if every feature is enabled |

## Feature-Dependent Rendering

### In Server Components

```tsx
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export default function ItemDetailPage({ item }) {
  const showComments = isFeatureEnabled('comments');
  const showRatings = isFeatureEnabled('ratings');

  return (
    <div>
      <ItemDetail item={item} />
      {showRatings && <RatingSection itemId={item.id} />}
      {showComments && <CommentsSection itemId={item.id} />}
    </div>
  );
}
```

### In API Routes

```ts
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // Handle comment creation...
}
```

## Site Configuration (siteConfig)

Beyond feature flags, the template provides a `siteConfig` object in `lib/config.ts` for branding and metadata customization. Every value can be overridden via environment variables:

```ts
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://demo.ever.works',
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || '...',
  keywords: process.env.NEXT_PUBLIC_SITE_KEYWORDS?.split(',').map(k => k.trim()) || [...],
  ogImage: {
    gradientStart: process.env.NEXT_PUBLIC_OG_GRADIENT_START || '#667eea',
    gradientEnd: process.env.NEXT_PUBLIC_OG_GRADIENT_END || '#764ba2'
  },
  social: {
    github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || '...',
    x: process.env.NEXT_PUBLIC_SOCIAL_X || '...',
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || '...',
    // ...
  },
  attribution: {
    url: process.env.NEXT_PUBLIC_ATTRIBUTION_URL || 'https://ever.works',
    name: process.env.NEXT_PUBLIC_ATTRIBUTION_NAME || 'Ever Works'
  }
} as const;
```

### Customization via Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | Site name in metadata and OG images |
| `NEXT_PUBLIC_SITE_TAGLINE` | Template default | Homepage tagline |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | Full site URL (no trailing slash) |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | Logo path relative to `/public` |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | Schema.org Organization name |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Template default | SEO meta description |
| `NEXT_PUBLIC_SITE_KEYWORDS` | Template defaults | Comma-separated SEO keywords |
| `NEXT_PUBLIC_OG_GRADIENT_START` | `'#667eea'` | OG image gradient start color |
| `NEXT_PUBLIC_OG_GRADIENT_END` | `'#764ba2'` | OG image gradient end color |
| `NEXT_PUBLIC_SOCIAL_GITHUB` | Ever Works URL | GitHub profile link |
| `NEXT_PUBLIC_SOCIAL_X` | Ever Works URL | X (Twitter) profile link |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | "Built with" footer link |

### Validation

The `validateSiteConfig()` function checks for missing production-critical variables:

```ts
import { validateSiteConfig } from '@/lib/config';

// Returns true if all required vars are set, false with warnings otherwise
const isValid = validateSiteConfig();
```

Warnings are logged for missing `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_SITE_NAME`.

## ConfigManager (YAML Configuration)

The `ConfigManager` class at `lib/config-manager.ts` manages the `config.yml` file from the Git-based CMS repository. It handles reading, writing, and committing configuration changes.

### Reading Configuration

```ts
import { configManager } from '@/lib/config-manager';

// Get entire config
const config = configManager.getConfig();

// Get a specific key
const pagination = configManager.getPaginationConfig();
// Returns: { type: 'standard' | 'infinite', itemsPerPage: 12 }

// Get nested value
const value = configManager.getNestedValue('pagination.type');
```

### Writing Configuration

All writes are automatically committed and pushed to the Git repository:

```ts
// Update pagination
await configManager.updatePagination('infinite', 24);

// Update any top-level key
await configManager.updateKey('pagination', { type: 'standard', itemsPerPage: 20 });

// Update nested key
await configManager.updateNestedKey('headerSettings.sticky', true);
```

### Git Integration

The ConfigManager automatically:
1. Writes the YAML file to the content directory
2. Queues a Git commit with a descriptive message
3. Pushes to the configured GitHub repository
4. Serializes Git operations to prevent concurrent write conflicts

Commit messages are context-aware:

```ts
// For pagination changes:
"Update pagination configuration (type: infinite, itemsPerPage: 24) - 2024-01-20T..."

// For header navigation:
"Update custom header navigation (5 items) - 2024-01-20T..."

// For generic keys:
"Update config.yml: myKey - 2024-01-20T..."
```

### Security

The ConfigManager includes prototype pollution protection:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

Attempts to update `__proto__`, `constructor`, or `prototype` keys are silently rejected.

## Related Files

| Path | Description |
|------|-------------|
| `lib/config/feature-flags.ts` | Feature flag definitions and utility functions |
| `lib/config.ts` | Client-safe siteConfig and type re-exports |
| `lib/config-manager.ts` | YAML config reader/writer with Git integration |
| `lib/config/index.ts` | Barrel export for the config module |
| `lib/config/config-service.ts` | Server-side ConfigService singleton |
| `lib/config/types.ts` | TypeScript type definitions for config |
| `.env.example` | Full list of environment variable options |
