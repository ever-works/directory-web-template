---
id: performance-checklist
title: "Performance Checklist"
sidebar_label: "Performance Checklist"
sidebar_position: 79
---

# Performance Checklist

This checklist covers performance optimization strategies built into the template and steps you can take to ensure your site loads fast and stays responsive. Use it as a pre-launch review and ongoing optimization reference.

## Prerequisites

- Production build available (`pnpm build`)
- Lighthouse audit tool (built into Chrome DevTools)
- Understanding of Next.js rendering modes (SSR, SSG, ISR)

---

## Build & Bundle Optimization

### Bundle Size

- [ ] Verify `output: "standalone"` is set in `next.config.ts` (reduces deployment size)
- [ ] Use `experimental.optimizePackageImports` for large libraries (already configured for `@heroui/react` and `lucide-react`)
- [ ] Import icons individually, not the entire icon library:

```typescript
// Good: tree-shakeable
import { Search } from "lucide-react";

// Bad: imports entire library
import * as Icons from "lucide-react";
```

- [ ] Run `ANALYZE=true pnpm build` to identify large chunks and optimize accordingly
- [ ] Use dynamic imports for heavy components that are not needed on initial load:

```typescript
import dynamic from "next/dynamic";

const HeavyChart = dynamic(
  () => import("@/components/admin/admin-charts"),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);
```

### Code Splitting

- [ ] Large admin-only components are dynamically imported (not in the client bundle)
- [ ] Use `React.lazy` or `next/dynamic` for components only shown after user interaction
- [ ] Move server-only code to `lib/` (not imported in client components)

---

## Image Optimization

- [ ] All images use the Next.js `<Image>` component (automatic optimization, lazy loading, and responsive sizing)
- [ ] Remote image patterns are configured in `next.config.ts` via `generateImageRemotePatterns()`
- [ ] Set explicit `width` and `height` on images to prevent layout shift (CLS)
- [ ] Use `priority` on above-the-fold hero images:

```tsx
<Image src={heroImage} alt="..." width={1200} height={600} priority />
```

- [ ] SVG images are allowed via `dangerouslyAllowSVG: true` with content security policy set
- [ ] Consider using `placeholder="blur"` with `blurDataURL` for large images

---

## Caching Strategy

### React Query (Client-Side)

- [ ] API responses are cached with appropriate `staleTime` and `gcTime` in React Query hooks
- [ ] Use `staleTime: 5 * 60 * 1000` (5 minutes) for data that does not change frequently
- [ ] Invalidate cache explicitly when the user performs a mutation

### HTTP Cache Headers

- [ ] API endpoints that serve public data include proper cache headers:

```typescript
return NextResponse.json(data, {
  headers: {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  },
});
```

- [ ] Cron endpoints set `Cache-Control: no-cache, no-store, must-revalidate`
- [ ] Webhook endpoints set `Cache-Control: no-cache`
- [ ] Static assets (CSS, JS) are cached by Vercel's CDN with long TTLs automatically

### In-Memory Cache

- [ ] The template uses `cache-config.ts` and `cache-invalidation.ts` for server-side caching
- [ ] Content sync triggers cache invalidation to prevent stale data

---

## Database Performance

### Connection Pooling

- [ ] `DB_POOL_SIZE` is set appropriately (default: 20 in production, 10 in development)
- [ ] Pool size does not exceed the database server's maximum connections
- [ ] Connection timeout is set to 30 seconds (`connect_timeout: 30` in `drizzle.ts`)
- [ ] Idle timeout is set to 20 seconds to release unused connections

### Query Optimization

- [ ] All foreign keys have corresponding indexes:

```typescript
(table) => ({
  userIndex: index("bookmarks_user_idx").on(table.userId),
})
```

- [ ] Pagination queries use `LIMIT` and `OFFSET` (not fetching all records)
- [ ] Aggregation queries use `sql<number>` with `count(*)` instead of fetching all rows and counting in JavaScript
- [ ] Avoid N+1 queries -- use JOINs or batch queries instead of looping:

```typescript
// Good: single query with JOIN
const results = await db
  .select()
  .from(items)
  .innerJoin(companies, eq(items.companyId, companies.id));

// Bad: N+1 queries
for (const item of items) {
  const company = await getCompanyById(item.companyId);
}
```

- [ ] Use `.limit(1)` for queries that should return a single row

### Migration Performance

- [ ] Large data migrations are batched (not processing millions of rows in a single transaction)
- [ ] Indexes are created concurrently for large tables: `CREATE INDEX CONCURRENTLY`

---

## Rendering Performance

### Server Components (Default)

- [ ] Most pages use Server Components by default (no `"use client"` directive)
- [ ] Only add `"use client"` when the component needs interactivity (click handlers, state, effects)
- [ ] Data fetching happens in Server Components, not in client-side useEffect

### Client Components

- [ ] Client components are leaf nodes in the component tree (not wrapping server components)
- [ ] Use `React.memo` for expensive components that receive stable props
- [ ] Avoid large client-side state that triggers frequent re-renders
- [ ] Use `useMemo` and `useCallback` for expensive computations and event handlers

### Streaming & Suspense

- [ ] Long data-fetching pages use `<Suspense>` with loading skeletons
- [ ] The admin dashboard uses skeleton components during data loading:

```tsx
if (isLoading) {
  return <AdminDashboardSkeleton />;
}
```

---

## Font & CSS Optimization

- [ ] Fonts are loaded via `next/font` (automatic optimization and self-hosting):

```typescript
// app/fonts.ts
import { Inter } from "next/font/google";
export const inter = Inter({ subsets: ["latin"] });
```

- [ ] Tailwind CSS is tree-shaken in production (only used classes are included)
- [ ] CSS is not duplicated across page boundaries

---

## Third-Party Script Management

- [ ] PostHog and Sentry are loaded conditionally (only when API keys are configured)
- [ ] PostHog sampling rate is set to reduce event volume if needed:

```bash
NEXT_PUBLIC_POSTHOG_SAMPLE_RATE=0.5  # Track 50% of sessions
```

- [ ] Session recording sample rate is configured separately for PostHog
- [ ] Third-party scripts do not block the critical rendering path

---

## Monitoring & Measurement

### Lighthouse Targets

Run Lighthouse audits and aim for these scores:

| Category | Target |
|----------|--------|
| Performance | 90+ |
| Accessibility | 95+ |
| Best Practices | 90+ |
| SEO | 95+ |

### Core Web Vitals

- [ ] **LCP** (Largest Contentful Paint): under 2.5 seconds
- [ ] **FID/INP** (Interaction to Next Paint): under 200 milliseconds
- [ ] **CLS** (Cumulative Layout Shift): under 0.1
- [ ] Monitor these metrics in PostHog or Vercel Analytics

### Sentry Performance Monitoring

- [ ] Sentry traces sample rate is set appropriately:
  - Development: `1.0` (trace everything)
  - Production: `0.1` (10% of transactions)
- [ ] Review slow transactions in the Sentry Performance dashboard

---

## Vercel-Specific Optimizations

- [ ] Verify the deployment is using Edge Network (automatic for Vercel deployments)
- [ ] Serverless function regions are configured close to your users and database
- [ ] Use `revalidate` for ISR pages to balance freshness and performance:

```typescript
export const revalidate = 3600; // Revalidate every hour
```

- [ ] Check Vercel's Speed Insights for real-user performance data
- [ ] Verify that static pages are being pre-rendered at build time (check build output)

---

## Webpack Configuration

The template's `next.config.ts` includes performance-oriented webpack settings:

- [ ] `.content/` directory is excluded from file watching in development (prevents rebuilds from 220+ markdown files)
- [ ] Verbose logging is suppressed in CI/Vercel builds
- [ ] Warnings from optional dependencies (Supabase, bcryptjs, postgres, stripe) are suppressed

---

## Quick Performance Audit

Run this sequence before deploying:

```bash
# 1. Build and check bundle size
pnpm build

# 2. Start production server locally
pnpm start

# 3. Run Lighthouse (Chrome DevTools > Lighthouse tab)
# Target: 90+ Performance, 95+ Accessibility

# 4. Check Core Web Vitals in Chrome DevTools > Performance tab

# 5. Verify no console errors or warnings in production mode
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Importing `posthog-js` in a server component | Analytics is client-only; guard with `typeof window !== "undefined"` |
| Fetching all records when only counts are needed | Use `sql<number>\`count(*)\`` instead of `.select()` followed by `.length` |
| Not setting image dimensions | Always provide `width` and `height` to prevent CLS |
| Over-fetching in API routes | Select only the columns you need; use pagination |
| Large JSON payloads in API responses | Limit response size; use pagination; omit unnecessary fields |
| Client-side fetching of static data | Fetch in Server Components and pass as props to client components |

---

## Related Pages

- [Performance Optimization](/guides/performance-optimization) -- deep dive into caching and rendering strategies
- [Caching Strategy](/guides/caching-strategy) -- multi-layer caching architecture
- [Deployment Checklist](/guides/deployment-checklist) -- pre-launch verification
- [Debugging Guide](/guides/debugging-guide) -- identifying performance bottlenecks
- [How to Add Analytics Events](/guides/how-to-add-analytics-events) -- tracking performance metrics
