---
id: performance-optimization
title: "Performance Optimization"
sidebar_label: "Performance Optimization"
sidebar_position: 19
---

# Performance Optimization

The template includes multiple performance optimization strategies at the build, runtime, and network layers. This guide documents the patterns used and how to apply them when extending the application.

## Build Optimizations

### Package Import Optimization

The `next.config.ts` file uses the `optimizePackageImports` experimental feature to tree-shake large component libraries:

```typescript
experimental: {
  optimizePackageImports: ["@heroui/react", "lucide-react"],
},
```

This ensures that only the specific components and icons imported from these libraries are included in the client bundle, rather than the entire package.

### Standalone Output

The build is configured with `output: "standalone"`, which creates a self-contained production build that includes only the necessary `node_modules` files. This significantly reduces the deployment artifact size and is required for container-based deployments.

```typescript
output: "standalone",
serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
```

Server-only packages like `postgres`, `bcryptjs`, and `drizzle-orm` are externalized to avoid bundling them into client-side code.

### Webpack Optimizations

The webpack configuration includes several performance-focused settings:

- **Suppressed warnings**: Known benign warnings from packages like `@supabase`, `bcryptjs`, `postgres`, and `stripe` are silenced to keep build logs clean.
- **CI infrastructure logging**: In CI/Vercel environments, webpack logging is restricted to errors only, reducing build output noise.
- **Development watch exclusions**: The `.content/` directory (containing 220+ markdown files) is excluded from webpack file watching to prevent unnecessary rebuilds during development.

```typescript
if (dev) {
  config.watchOptions = {
    ...config.watchOptions,
    ignored: ['**/node_modules/**', '**/.git/**', '**/.content/**']
  };
}
```

## Image Optimization

### Next.js Image Configuration

The image pipeline is configured for both performance and security:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

- **Dynamic remote patterns**: The `generateImageRemotePatterns()` function generates allowed image domains from configuration, ensuring only trusted sources are optimized.
- **SVG support**: SVGs are allowed but sandboxed with a strict Content Security Policy to prevent XSS attacks through SVG files.
- **Optimization enabled**: The `unoptimized: false` setting ensures all images go through Next.js image optimization (WebP/AVIF conversion, resizing, quality adjustment).

### Best Practices for Images

1. Always use the `next/image` component instead of raw `<img>` tags.
2. Provide explicit `width` and `height` props to prevent layout shifts.
3. Use the `priority` prop for above-the-fold images (hero images, logos).
4. Use `loading="lazy"` (the default) for below-the-fold images.

## Caching Strategy

### Server-Side Cache Configuration

The `lib/cache-config.ts` file defines centralized cache settings:

```typescript
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,
  CONFIG: 600,
  PAGES: 600,
};
```

Content is cached for 10 minutes using Next.js `unstable_cache` with tag-based revalidation. This reduces filesystem reads for Git-based content.

### Cache Tags

Cache tags enable granular invalidation. When a category is updated, only `categories` cache is invalidated rather than all content:

```typescript
export const CACHE_TAGS = {
  CONTENT: 'content',
  ITEMS: 'items',
  ITEM: (slug: string) => `item:${slug}`,
  CATEGORIES: 'categories',
  CATEGORIES_LOCALE: (locale: string) => `categories:${locale}`,
  // ...
};
```

### Safe Cache Invalidation

The `safeRevalidateTag()` function in `lib/cache-invalidation.ts` handles edge cases where cache invalidation is called during React's render phase:

```typescript
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      console.warn(`Skipping cache invalidation during render phase`);
    } else {
      throw error;
    }
  }
}
```

### React Query Client Caching

The React Query client is configured with performance-focused defaults:

- **5-minute stale time**: Data is considered fresh for 5 minutes, preventing unnecessary refetches.
- **10-minute garbage collection**: Unused cache entries are kept for 10 minutes before cleanup.
- **Window focus refetch disabled**: Prevents API calls every time the user tabs back to the application.
- **Mount refetch disabled**: Does not refetch data on component mount if it is still fresh.
- **Reconnect refetch enabled**: Automatically refetches stale data when network connectivity is restored.

## Security Headers

The `next.config.ts` sets security headers that also improve performance:

```typescript
headers: [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload" },
  // ...
]
```

- **DNS Prefetch Control**: Enables DNS prefetching for external resources, reducing DNS lookup time.
- **HSTS**: Forces HTTPS connections, eliminating HTTP-to-HTTPS redirect latency after the first visit.
- **X-Content-Type-Options**: Prevents MIME type sniffing, reducing processing overhead.

## URL Rewrites

The configuration includes rewrites that direct users to the correct paginated routes:

```typescript
async rewrites() {
  return [
    { source: "/:path", destination: "/:path/discover/1" },
    { source: "/:path/discover", destination: "/:path/discover/1" },
  ];
},
```

This avoids unnecessary redirects by rewriting at the server level, saving a round trip.

## Component-Level Optimizations

### Skeleton Loading

The template uses skeleton loading states extensively (e.g., `admin-dashboard-skeleton.tsx`, `admin-loading-skeleton.tsx`, `item-skeleton.tsx`). Skeletons provide instant visual feedback while data loads, improving perceived performance.

### Debounced Inputs

Search inputs use debouncing to prevent API calls on every keystroke:

```typescript
const debouncedValue = useDebounceValue(searchValue, 300);
```

The default 300ms delay balances responsiveness with API efficiency.

### Memoization

The `LayoutThemeContext` uses `useMemo` for the context value object and `useCallback` for setter functions to prevent unnecessary re-renders of the entire component tree:

```typescript
const contextValue = useMemo(() => ({
  layoutKey: layoutManager.layoutKey,
  setLayoutKey: layoutManager.setLayoutKey,
  // ...
}), [/* dependency list */]);
```

### Selective React Query Notifications

The billing-optimized query client uses `notifyOnChangeProps` to limit which property changes trigger re-renders:

```typescript
notifyOnChangeProps: ['data', 'error', 'isLoading', 'isFetching'],
```

## Static Generation

The `staticPageGenerationTimeout` is set to 180 seconds to accommodate large content sets:

```typescript
staticPageGenerationTimeout: 180,
```

Disable features that add overhead to static pages:
- `generateEtags: false` -- ETags add header computation overhead
- `poweredByHeader: false` -- Removes the `X-Powered-By` header

## Monitoring

### Sentry Integration

The template includes Sentry for error tracking and performance monitoring via `@sentry/nextjs`. The Sentry configuration is applied as a webpack plugin:

```typescript
const finalConfig = withSentryConfig(configWithIntl, sentryWebpackPluginOptions);
```

Both server-side (`instrumentation.ts`) and client-side (`instrumentation-client.ts`) instrumentation files are provided for full-stack performance tracing.

## Performance Checklist

When adding new features, consider the following:

- [ ] Use `next/image` for all images with explicit dimensions
- [ ] Add skeleton loading states for data-dependent components
- [ ] Debounce search and filter inputs (300ms minimum)
- [ ] Use React Query for server state instead of `useState` + `useEffect`
- [ ] Add appropriate cache tags for new content types
- [ ] Memoize expensive computations and context values
- [ ] Lazy load components that are not immediately visible
- [ ] Keep API route handlers thin by delegating to services
- [ ] Externalize server-only packages in `next.config.ts`
- [ ] Test bundle size impact of new dependencies

## Related Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Build configuration, image optimization, headers |
| `lib/cache-config.ts` | Cache TTL and tag definitions |
| `lib/cache-invalidation.ts` | Safe cache invalidation utilities |
| `lib/query-client.ts` | React Query client configuration |
| `sentry.config.ts` | Sentry performance monitoring setup |
| `instrumentation.ts` | Server-side instrumentation |
| `instrumentation-client.ts` | Client-side instrumentation |
