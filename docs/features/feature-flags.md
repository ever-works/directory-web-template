---
id: feature-flags
title: Feature Flags System
sidebar_label: Feature Flags
sidebar_position: 9
---

# Feature Flags System

The Ever Works template uses a feature flags system to gracefully handle missing dependencies, particularly database availability. Features that depend on the database are automatically disabled when `DATABASE_URL` is not configured, allowing the template to operate in a static-content mode.

## Configuration

Located at `lib/config/feature-flags.ts`, the feature flags module provides server-side flag resolution.

### Flag Definitions

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### Resolution Logic

All current flags depend on database availability:

```typescript
function getFeatureFlags(): FeatureFlags {
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

## Server-Side API

### getFeatureFlags

Returns all flags as an object:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

### isFeatureEnabled

Check a single flag:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

### getDisabledFeatures

Returns an array of disabled feature names, useful for debugging:

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### getEnabledFeatures

Returns an array of enabled feature names:

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### areAllFeaturesEnabled

Quick check if all features are available:

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## Client-Side Hooks

### useFeatureFlag

Check a single feature flag on the client:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### useFeatureFlags

Get all feature flags:

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### useFeatureFlagsWithSimulation

Extended hook that supports admin simulation mode for testing features:

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

This hook is used by the favorites system to conditionally enable/disable features in development.

## Integration Examples

### Conditional Component Rendering

```typescript
function ItemDetailPage({ item }) {
  const flags = getFeatureFlags();

  return (
    <div>
      <ItemDetails item={item} />
      {flags.comments && <CommentsSection itemId={item.id} />}
      {flags.ratings && <RatingWidget itemId={item.id} />}
      {flags.favorites && <FavoriteButton item={item} />}
    </div>
  );
}
```

### Hook-Level Feature Gating

Many hooks check feature flags internally. For example, `useFavorites` only fetches when the favorites feature is enabled:

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### Conditional API Routes

Feature flags can also be checked in API routes to return appropriate responses:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export async function GET() {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // ... handle request
}
```

## Adding a New Feature Flag

1. **Add the flag to the interface** in `lib/config/feature-flags.ts`:

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **Set the resolution logic** in `getFeatureFlags()`:

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **Use in components and hooks** via `isFeatureEnabled('newFeature')` or the client-side hooks.

## Design Philosophy

The feature flag system is intentionally simple:
- **No external service dependency** -- Flags are resolved from environment variables
- **No runtime overhead** -- Flags are computed once per request/render
- **Graceful degradation** -- Missing database disables DB-dependent features without errors
- **Developer-friendly** -- Clear naming, TypeScript types, and helper functions
