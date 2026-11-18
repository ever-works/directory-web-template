---
id: spec-061-plan
title: Spec 061 — Plan
sidebar_label: 061 Plan
---

# Plan — `061-shared-item-parse-cache`

See [spec.md](./spec.md) for what and why, and [tasks.md](./tasks.md).

## Routes

| Public URL | Served by | Mode |
|---|---|---|
| `/`, `/<locale>`, `/discover`, `/discover/<n>` (no `q` / `sort` / `tags` / `categories`) | `app/[locale]/(listing)/discover/[page]/cached/page.tsx` | ISR |
| the same with any of those parameters | `app/[locale]/(listing)/discover/[page]/page.tsx` | per request (unchanged) |
| `/categories/<c>`, `?page=<n>` (no `q` / `sort` / `tags`) | `app/[locale]/cached-category/[category]/[page]/page.tsx` | ISR |
| the same with any of those parameters | `app/[locale]/categories/[category]/page.tsx` | per request (unchanged) |
| `/items/<slug>` | `app/[locale]/items/[slug]/page.tsx` | ISR (`generateStaticParams` → `[]`) |
| `/tags/<tag>` | `app/[locale]/tags/[tag]/page.tsx` | ISR (`generateStaticParams` → `[]`) |
| `/<locale>/discover/<n>/cached`, `/<locale>/cached-category/...` requested directly | `proxy.ts` | 404 |

The twins re-use the dynamic routes' components and metadata with empty
`searchParams` (and `page` for categories). The rewrites are `missing`-conditioned
entries in `next.config.ts` `rewrites()`, placed before the generic
`/:path → /:path/discover/1` rule, and match only page numbers 1-999999 without a leading
zero (others keep the dynamic routes' coercion). A rewrite that does not match leaves the request
on the dynamic route, so a mistake costs speed, not correctness. `cached-category`
sits outside `categories/` so that a category named `category` cannot resolve to
`categories/category/[...categorie]`.

## Removing request-scoped reads from the shared tree

1. `app/layout.tsx` becomes a pass-through; `components/layout/document-shell.tsx`
   renders `<html lang dir>`, fonts and theme providers. `[locale]/layout.tsx` renders it
   with its locale; `app/not-found.tsx` and `app/unauthorized/page.tsx` (outside
   `[locale]`) render it themselves with the default locale (their client content moved
   to `components/errors/`). `app/[locale]/not-found.tsx` renders the same content inside
   the locale layout, so localized 404s keep their `lang` and `dir` (and links keep the
   locale).
2. Public pages call `setRequestLocale(locale)`.
3. `AiChatMount`: no `auth()`; the test-override cookie is read only where overrides are
   allowed (never in production). `ChatLauncher` resolves auth with `useCurrentUser()`.
4. `NavigationProvider`: `useSearchParams()` moves into `SearchParamsReporter` behind
   `<Suspense fallback={null}>`; the query is shared through context
   (`useCurrentSearch()`), which `SharedCard` uses.
5. Item page comments: `getTenantIdForSharedRender()` (pure pick in
   `lib/auth/shared-render-tenant.ts`: one active tenant row, which must be `TENANT_ID`
   when that is set) + `getCommentsByItemId(slug, { tenantId })`, started in parallel
   with the item read.
6. Per-visitor segments get a `layout.tsx` (or an extra export) with
   `dynamic = 'force-dynamic'`; so do the index grid pages (Q-061b).

## Content caches

- `lib/item-file-cache.ts`: `ItemFileCache` (snapshot + per-file parse cache keyed by
  mtime/size, translation overlays per locale, single-flight, generation guard).
- `lib/content.ts`: process-wide state on `globalThis`
  (`Symbol.for('ever-works.content-cache-state.v1')`); bounded listing LRU; collection
  YAML cache; parse/IO error split (`throwIoErrors`); repair throttle.
- `lib/config-manager.ts`: parsed config cached by config files' mtime/size, dropped after
  its own writes, which also revalidate the content tag. `getCachedConfig` is keyed by the
  content revision (10-minute TTL).
- `lib/content-revision.ts`: HEAD reader shared by `getContentRevision()` and the sync.
- `lib/query-client.ts`: server-only `timeoutManager` provider that drops TanStack Query
  timers of 60 s or more; server `gcTime: Infinity` (R14).
- `lib/services/sync-service.ts` + `lib/cache-invalidation.ts`: invalidate on HEAD change
  (or hourly); in-memory caches always, cache tags retried while the timer's context cannot
  revalidate them; warm the default locale afterwards; location index rebuilt per commit,
  failed rebuilds retried. Listing walks started before a clear do not store results.

## Page cache

- `apps/web/cache-handler.cjs` (`cacheHandler` in `next.config.ts`): Next's
  `FileSystemCache` with `flushToDisk` off unless `NEXT_ISR_FLUSH_TO_DISK=true`, and Next's
  2 MB limit for data-cache entries (Next drops it for custom handlers). Pages live in
  Next's memory LRU (`cacheMaxMemorySize`). JavaScript, because Next imports it at run
  time outside the bundler.
- `experimental.isrFlushToDisk` is left at its default: `false` would also disable the
  image optimizer's disk cache.

## Configuration

| Variable | Default | Read at |
|---|---|---|
| `NEXT_CACHE_MAX_MEMORY_MB` | 64 | build (`next.config.ts`) |
| `NEXT_ISR_FLUSH_TO_DISK` | off | server start (`cache-handler.cjs`) |
| `CONTENT_LISTING_CACHE_MAX_ENTRIES` | 16 | runtime |

## Verification

Local `next build` + `next start` against `awesome-mcp-servers-data`: route table, response
status, `x-nextjs-cache` / `Cache-Control` / `Set-Cookie` headers and HTML content for item,
home, discover, category (plain, `?page=2`, `?q=`), tag and static pages in `en` and `de`;
the before/after benchmark in [spec.md](./spec.md); unit and source-guard specs.

## Constitution Check

- [x] **I — Plugin-First** — not applicable: the document shell, routing, the page cache and
  the content loader are core infrastructure every page renders through; no plugin surface
  changes.
- [x] **II — TypeScript Everywhere** — all new source is TypeScript except
  `apps/web/cache-handler.cjs`: Next imports the cache handler at run time, outside the
  bundler, so it must be JavaScript (`// @ts-check`, covered by a unit spec). The exception
  is recorded in [`docs/architecture/cache-system.md`](../../architecture/cache-system.md).
- [x] **III — Spec Before Code** — spec, plan and tasks in this folder.
- [x] **IV — Documentation First-Class** — spec folder, index row, `docs/log.md`,
  `docs/performance/{content-loading,cdn-cacheability}.md`, Q-061a–f.
- [x] **V — Performance Budget** — the purpose of the change; measured in spec §5.
- [x] **VI — Latest Stable Frameworks** — no framework changes (Next.js 16.3.8).
- [x] **VII — Reuse Before Build** — Next's ISR, incremental cache and handler; no new
  dependency.
- [x] **VIII — No Removal Without Migration** — public URLs and per-visitor pages behave as
  before; the twin routes are internal; the error components moved, not removed.
- [x] **IX — Test Coverage Bar** — unit and source-guard specs in `test:unit`; the e2e
  suite was not run (T-014).
- [x] **X — Modular Packages** — no package changes.
