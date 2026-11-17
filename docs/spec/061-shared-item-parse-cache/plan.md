---
id: spec-061-plan
title: Spec 061 — Plan
sidebar_label: 061 Plan
---

# Plan — `061-shared-item-parse-cache`

See [spec.md](./spec.md) for what and why.

## Routes

| Public URL | Served by | Mode |
|---|---|---|
| `/`, `/<locale>`, `/discover`, `/discover/<n>` (no `q` / `sort` / `tags` / `categories`) | `app/[locale]/(listing)/discover/[page]/cached/page.tsx` | ISR |
| the same with any of those parameters | `app/[locale]/(listing)/discover/[page]/page.tsx` | per request (unchanged) |
| `/categories/<c>`, `?page=<n>` (no `q` / `sort` / `tags`) | `app/[locale]/cached-category/[category]/[page]/page.tsx` | ISR |
| the same with any of those parameters | `app/[locale]/categories/[category]/page.tsx` | per request (unchanged) |
| `/items/<slug>` | `app/[locale]/items/[slug]/page.tsx` | ISR (`generateStaticParams` → `[]`) |
| `/tags/<tag>` | `app/[locale]/tags/[tag]/page.tsx` | ISR (`generateStaticParams` → `[]`) |

The twins re-use the dynamic routes' components and metadata with empty
`searchParams` (and `page` for categories). The rewrites are `missing`-conditioned
entries in `next.config.ts` `rewrites()`, placed before the generic
`/:path → /:path/discover/1` rule. A rewrite that does not match leaves the request
on the dynamic route, so a mistake costs speed, not correctness. `cached-category`
sits outside `categories/` so that a category named `category` cannot resolve to
`categories/category/[...categorie]`.

## Removing request-scoped reads from the shared tree

1. `app/layout.tsx` becomes a pass-through; `components/layout/document-shell.tsx`
   renders `<html lang dir>`, fonts and theme providers. `[locale]/layout.tsx` renders it
   with its locale; `app/not-found.tsx` and `app/unauthorized/page.tsx` (outside
   `[locale]`) render it themselves with the default locale (their client content moved
   to `components/errors/`).
2. Public pages call `setRequestLocale(locale)`.
3. `AiChatMount`: no `auth()`; the test-override cookie is read only where overrides are
   allowed (never in production). `ChatLauncher` resolves auth with `useCurrentUser()`.
4. `NavigationProvider`: `useSearchParams()` moves into `SearchParamsReporter` behind
   `<Suspense fallback={null}>`; the query is shared through context
   (`useCurrentSearch()`), which `SharedCard` uses.
5. Item page comments: `getTenantIdForSharedRender()` + `getCommentsByItemId(slug, { tenantId })`.
6. Per-visitor segments get a `layout.tsx` (or an extra export) with
   `dynamic = 'force-dynamic'`; so do the index grid pages (Q-061b).

## Content caches

- `lib/item-file-cache.ts`: `ItemFileCache` (snapshot + per-file parse cache keyed by
  mtime/size, translation overlays per locale, single-flight, generation guard).
- `lib/content.ts`: process-wide state on `globalThis`
  (`Symbol.for('ever-works.content-cache-state.v1')`); bounded listing LRU; collection
  YAML cache; parse/IO error split (`throwIoErrors`); repair throttle.
- `lib/config-manager.ts`: parsed config cached by config files' mtime/size.
- `lib/content-revision.ts`: HEAD reader shared by `getContentRevision()` and the sync.
- `lib/services/sync-service.ts` + `lib/cache-invalidation.ts`: invalidate on HEAD change
  (or hourly), report incomplete invalidations, warm the default locale afterwards.

## Configuration

| Variable | Default | Read at |
|---|---|---|
| `NEXT_CACHE_MAX_MEMORY_MB` | 256 | build (`next.config.ts`) |
| `NEXT_ISR_FLUSH_TO_DISK` | off | build |
| `CONTENT_LISTING_CACHE_MAX_ENTRIES` | 16 | runtime |

## Verification

Local `next build` + `next start` against `awesome-mcp-servers-data`: route table, response
status, `x-nextjs-cache` / `Cache-Control` / `Set-Cookie` headers and HTML content for item,
home, discover, category (plain, `?page=2`, `?q=`), tag and static pages in `en` and `de`;
the before/after benchmark in [spec.md](./spec.md); unit and source-guard specs.
