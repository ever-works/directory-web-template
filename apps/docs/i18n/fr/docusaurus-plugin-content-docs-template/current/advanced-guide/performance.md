---
id: performance
title: Optimisation des performances
sidebar_label: Performance
sidebar_position: 5
---

# Optimisation des performances

This guide covers the performance optimizations built into the Ever Works Template and techniques for maintaining fast load times as your application grows.

## Next.js Configuration

The template's `next.config.ts` includes several performance-focused settings:

### Standalone Output

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```

The `standalone` output mode creates a self-contained build that includes only the files needed to run the application. This reduces container size and startup time in production.

### Package Import Optimization

```typescript
experimental: {
  optimizePackageImports: ["@heroui/react", "lucide-react"],
},
```

This setting enables tree-shaking for barrel-file-heavy packages. Instead of importing the entire `@heroui/react` or `lucide-react` library, only the components actually used are included in the bundle.

### Webpack Watch Optimization

```typescript
if (dev) {
  config.watchOptions = {
    ...config.watchOptions,
    ignored: ['**/node_modules/**', '**/.git/**', '**/.content/**']
  };
}
```

The `.content/` directory (Git-based CMS with 220+ markdown files) is excluded from webpack's file watcher in development. This prevents unnecessary rebuilds when content files change and significantly reduces CPU usage during development.

### Suppressed Warnings

Verbose infrastructure logging is suppressed in CI and Vercel environments:

```typescript
if (process.env.CI || process.env.VERCEL) {
  config.infrastructureLogging = { level: 'error' };
}
```

## Image Optimization

### Remote Patterns

The template dynamically generates allowed remote image patterns using `generateImageRemotePatterns()`. This ensures images from configured CDNs and external sources are optimized through Next.js's built-in image pipeline.

### SVG Handling

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

SVG images are permitted but sandboxed with a strict Content Security Policy that disables script execution. This allows SVG logos and icons while preventing XSS through SVG injection.

### Best Practices for Images

| Technique | Implementation | Impact |
|---|---|---|
| Use `next/image` | Built-in component with lazy loading | Automatic WebP/AVIF, responsive sizes |
| Set explicit dimensions | `width` and `height` props | Prevents Cumulative Layout Shift (CLS) |
| Use `priority` for LCP | `<Image priority />` for hero images | Preloads Largest Contentful Paint image |
| Use `sizes` prop | `sizes="(max-width: 768px) 100vw, 50vw"` | Prevents downloading oversized images |
| Blur placeholders | `placeholder="blur"` with `blurDataURL` | Improves perceived loading speed |

## Caching Strategies

### HTTP Headers

The template sets cache-related headers in `next.config.ts`:

```typescript
headers: [
  { key: "X-DNS-Prefetch-Control", value: "on" },
]
```

DNS prefetching is enabled globally to reduce DNS lookup latency for external resources.

### Static Generation

The template uses a generous timeout for static page generation:

```typescript
staticPageGenerationTimeout: 180, // 3 minutes
```

This accommodates pages that fetch data from external APIs or the Git-based CMS during build time.

### ETag Configuration

```typescript
generateEtags: false,
```

ETags are disabled at the Next.js level because the CDN/reverse proxy (Vercel Edge Network or Cloudflare) handles cache validation more efficiently.

### Application-Level Caching

The analytics background processor pre-warms caches at regular intervals:

| Cache Type | Refresh Interval | Data |
|---|---|---|
| User growth trends | 10 minutes | Monthly user growth for 6, 12, 24 months |
| Activity trends | 5 minutes | Activity data for 7, 14, 30 day windows |
| Top items ranking | 15 minutes | Top 10, 20, 50 items |
| Recent activity | 2 minutes | Latest 10 and 20 activity entries |
| Performance metrics | 30 seconds | Query performance statistics |
| Cache cleanup | 1 hour | Expired cache entry removal |

## Lazy Loading

### Component-Level Lazy Loading

Use `next/dynamic` for heavy components that are not needed on initial render:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // disable SSR for client-only components
});
```

### Route-Level Code Splitting

Next.js App Router automatically code-splits by route. Each page in `app/[locale]/` gets its own bundle, so users only download the JavaScript needed for the current page.

### Dynamic Imports in Background Jobs

The template uses dynamic imports inside job callbacks to prevent webpack from pulling server-only modules into the client bundle:

```typescript
manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
  const { syncManager } = await import('@/lib/services/sync-service');
  await syncManager.performSync();
}, 5 * 60 * 1000);
```

## Bundle Size Optimization

### Analyzing the Bundle

Run the following to inspect bundle composition:

```bash
ANALYZE=true pnpm build
```

If `@next/bundle-analyzer` is configured, this produces an interactive treemap showing which modules contribute to bundle size.

### Common Optimization Techniques

| Technique | Example | Savings |
|---|---|---|
| Barrel file optimization | `optimizePackageImports` in config | Prevents importing entire icon/UI libraries |
| Server-only modules | `import 'server-only'` in lib files | Prevents accidental client bundling |
| Dynamic imports | `await import('@/lib/services/...')` | Defers loading until needed |
| External packages | `serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']` | Excludes from webpack bundling |

The `serverExternalPackages` config is particularly important:

```typescript
serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
```

These packages are excluded from webpack bundling and loaded natively at runtime, reducing build time and avoiding compatibility issues with native modules.

## Lighthouse Optimization Tips

### Core Web Vitals Targets

| Metric | Target | Key Factors |
|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s | Image optimization, priority loading, server response time |
| **FID** (First Input Delay) | < 100ms | Code splitting, minimal main-thread blocking |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Explicit image dimensions, font loading strategy |
| **TTFB** (Time to First Byte) | < 800ms | CDN caching, edge functions, database query optimization |

### Practical Checklist

1. **Images**: Use `next/image` with explicit `width`, `height`, and `sizes` props. Mark above-the-fold images with `priority`.
2. **Fonts**: Use `next/font` to self-host fonts with `display: swap` and preload critical font files.
3. **JavaScript**: Review `optimizePackageImports` and add any large libraries that use barrel files.
4. **CSS**: The template uses Tailwind CSS, which is already purged in production builds. Avoid importing unused CSS modules.
5. **Third-party scripts**: Defer non-critical scripts using `next/script` with `strategy="lazyOnload"`.
6. **Server Components**: Default to React Server Components (RSC) and only use `"use client"` where interactivity is required.

### Running Lighthouse

The template includes a `lighthouse-test.json` configuration. Run automated Lighthouse tests:

```bash
npx lhci autorun --config=lighthouse-test.json
```

Or use the Chrome DevTools Lighthouse panel for manual audits.

## Database Query Performance

### Connection Pooling

Use connection pooling to avoid opening a new database connection per request. See the [Scaling guide](/deployment/scaling) for configuration details.

### Query Optimization

- Use the repository pattern (`lib/repositories/`) to centralize and optimize queries.
- The analytics repository includes built-in cache layers with configurable TTL.
- Monitor slow queries via the performance metrics background job.

### Indexing Strategy

Review `lib/db/schema.ts` for existing indexes. Add indexes for:
- Columns used in `WHERE` clauses
- Foreign key columns
- Columns used in `ORDER BY` clauses
- Composite indexes for multi-column lookups

## Monitoring Performance

### Sentry Integration

The template integrates Sentry for performance monitoring in `instrumentation.ts`:

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Traces are sampled at 10% in production and 100% in development. Adjust `tracesSampleRate` based on your traffic volume and Sentry plan limits.

### Custom Performance Markers

Use the Web Performance API for custom timing:

```typescript
performance.mark('data-fetch-start');
const data = await fetchData();
performance.mark('data-fetch-end');
performance.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
```

## Summary

| Area | Built-in Optimization | Additional Steps |
|---|---|---|
| Images | Automatic WebP/AVIF, SVG sandbox | Add `priority` to LCP images, use `sizes` |
| JavaScript | Package optimization, code splitting | Add libraries to `optimizePackageImports` |
| Caching | Background cache warming, DNS prefetch | Configure CDN cache rules |
| Database | Connection pooling, repository pattern | Add indexes, monitor slow queries |
| Build | Standalone output, external packages | Enable bundle analyzer |
| Monitoring | Sentry traces, performance metrics job | Set up alerts for degraded metrics |