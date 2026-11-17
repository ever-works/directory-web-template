---
id: spec-061-shared-item-parse-cache
title: Spec 061 — Fast, cached directory pages
sidebar_label: 061 Fast cached pages
---

# Feature spec — `061-shared-item-parse-cache`

> **Status:** in-progress (shipped in code; measured on a local production build with `awesome-mcp-servers-data`, not yet on a live site)

## 1. Summary

Public directory pages (home, item, category, tag, static pages) in every locale are
rendered once and then served from the cache (ISR), and are cacheable by a CDN. Item YAML
is parsed once per file version and shared by every locale. Memory stays bounded. A content
sync swaps in new data without flushing everything at once.

## 2. Motivation

On 2026-11-14 `mcpserver.ever.works` (4,105 items, 21 locales) started failing readiness
probes and answering 503 under crawler traffic. Localized item pages took 5–12 s. Sites on
the `k8s-works` cluster (2 GiB limit) were being OOM-killed (timetrack.ever.works over 1,000
restarts); mcpserver.ever.works sat at about 3 GiB RSS. The owner's bar: directory pages
must load instantly.

Found on a local production build with that data repo:

- **Every public page rendered on every request.** The root layout read the locale with
  next-intl's `getLocale()` before `[locale]/layout.tsx` set it, so it fell back to the
  request headers. `AiChatMount` in the shared layout read `cookies()` and the session. No
  page called `setRequestLocale`. Dynamic segments had no `generateStaticParams`. The item
  page read comments for a tenant resolved from the session and headers.
- **Every locale re-parsed every item.** `fetchItems({ lang })` read and YAML-parsed all
  4,111 item files (about 3.5 s of CPU), separately for each locale and option set
  (`{ lang }`, `{ lang, sortTags }`): up to 42 walks of the same files. Each locale kept its
  own parsed copy, and Next.js loads `lib/content.ts` once per runtime (pages, route
  handlers/instrumentation), so twice.
- **Every 5-minute sync flushed everything**, even when the pull brought nothing; and its
  in-memory clear never reached the page runtime's copy of the caches.
- `config-manager` re-read and YAML-parsed `works.yml` on every settings getter, about 20
  times per page render.
- The tag page sent the whole catalogue to the browser (6.2 MB of HTML per tag page).
- A directory with no YAML made every listing walk sync the repo and clear all caches.
- The tags pages counted every tag twice (shared maps mutated by `populate()`).

## 3. Requirements

**Cached pages**

- **R1.** Item and tag pages are ISR for every slug (`generateStaticParams` returns `[]`).
- **R2.** Plain home / `/discover` / `/discover/<n>` and category / `?page=<n>` URLs are
  rewritten (`next.config.ts`, `missing` query conditions) to cached twin routes. URLs with
  `q`, `sort`, `tags` or `categories` reach the existing dynamic routes, unchanged.
- **R3.** Nothing in a cached page reads the request: the document shell
  (`<html lang dir>`, fonts, providers) moves from the root layout into `[locale]/layout.tsx`
  (`components/layout/document-shell.tsx`); public pages call `setRequestLocale`; the chat
  launcher resolves auth in the browser and the test-override cookie is read only where
  test overrides are allowed; app-wide `useSearchParams()` sits behind its own Suspense
  boundary and the listing grid reads the query from context.
- **R4.** The item page reads comments for a tenant resolved without the request
  (`TENANT_ID`, else the only active tenant); with several active tenants it prefetches
  nothing and the browser loads them through the API. Hydrated comments are refetched
  once older than the hook's `staleTime`.
- **R5.** Per-visitor segments (auth, dashboard, client, admin, favorites, submit, pricing,
  surveys, sponsor, newsletter) and the index grids that read `useSearchParams()` without a
  boundary (categories, tags, tags/collections paging, collections) are pinned to
  `force-dynamic`: rendered per request, as before.
- **R6.** The runtime page cache stays in memory, LRU-bounded by `NEXT_CACHE_MAX_MEMORY_MB`
  (default 256), and is written to disk only with `NEXT_ISR_FLUSH_TO_DISK=true`.

**Content loading**

- **R7.** An item's base YAML is parsed once and reused until its mtime or size changes,
  shared by all locales and option sets (`lib/item-file-cache.ts`); a locale shallow-copies
  it and overlays `<slug>.<lang>.yml` only when the directory listing shows one. IO errors
  are reported, never cached, and retried. Concurrent walks share one snapshot.
- **R8.** `categories.yml` / `tags.yml` / `collections.yml` and their overlays are parsed
  once per file version; callers get copies (arrays included). The directory cache stores
  copies, so counts are right for every option set.
- **R9.** Content caches live on `globalThis`, shared by every runtime in the process.
  Per-locale listing results are LRU-bounded (`CONTENT_LISTING_CACHE_MAX_ENTRIES`,
  default 16) and never older than the snapshot TTL.
- **R10.** `config-manager` reuses the parsed config while the config files' mtime/size
  are unchanged and hands out copies.
- **R11.** The tag page sends only the tag's items.

**Sync**

- **R12.** The sync invalidates content caches (and rebuilds the location index) only when
  the content checkout's HEAD (loose, packed or detached ref) moved since the last complete
  invalidation, and at least hourly; a checkout without a readable HEAD every time, as
  before. After an invalidation the default locale is re-walked in the background (stat
  only; changed files re-parsed) while cached pages keep being served (stale-while-revalidate).
- **R13.** The missing-YAML repair runs once per distinct set of YAML-less directories;
  concurrent walks wait for it.

## 4. Out of scope

- Sending only the message namespaces client components use (a page carries the whole
  `messages/<locale>.json`, ~200 KB of its ~350 KB).
- Making the category/tag/collection index grids and the paged tag routes cacheable.
- Replacing the `yaml` parser; warming the parse cache at process start.

## 5. Results

Local production build (`next build` + `next start`), same machine, same copy of
`awesome-mcp-servers-data` (4,212 items), content sync pulls off, same script
(`origin/develop` 18873252 → this change). "Warm" is the median of five repeats after the
first request; over localhost, so it includes transferring the page.

| | Before | After |
|---|---|---|
| Item page, warm (en / de) | 131 / 111 ms | 41 / 38 ms |
| Home, warm (en / de) | 142 / 155 ms | 43 / 39 ms |
| Category, warm (en / de) | 176 / 187 ms | 34 / 33 ms |
| Tag page, warm (en / de) | 870 / 1,010 ms | 50 / 55 ms |
| Tag page size | 6.2 MB | 1.0 MB |
| First German item request (new locale) | 4,012 ms | 575 ms |
| First request of other page types | 160–1,030 ms | 190–410 ms |
| 210 distinct item URLs, 21 locales, 4 concurrent | 84.7 s; p50 373 ms, p90 1.67 s, p99 18.7 s | 32.5 s; p50 545 ms, p90 0.82 s, p99 1.5 s |
| Same 210 URLs again | 15.9 s; p50 286 ms | 2.2 s; p50 38 ms |
| RSS / heap after both crawls (after GC) | 1,221 / 914 MB | 791 / 501 MB |
| `Cache-Control` on public pages | `private, no-cache, no-store` | `s-maxage=60, stale-while-revalidate=…` |

Item walk (the `fetchItems` body) on its own: first locale 2.7–3.8 s → 2.4 s; each further
locale or option set 2.7–3.8 s → 5–9 ms; after a cache clear 0.36 s once.

The very first request after process start (module loading plus the first parse of every
item file) took 4.2 s before and 4.7–8.4 s after across runs; it is dominated by module
loading on this machine.

## 6. Tests

- `apps/web/lib/__tests__/item-file-cache.spec.ts` — parse once, single-flight, mtime
  re-validation, IO errors not cached, missing/fallback YAML, removed items, translations.
- `apps/web/lib/__tests__/content-revision.spec.ts` — loose, packed, detached and unborn
  HEAD, refs outside `.git`.
- `apps/web/lib/__tests__/cacheable-public-pages.spec.ts` — source guards against the
  request-scoped reads that made pages dynamic.
- `apps/web/lib/seo/__tests__/item-rating-wiring.spec.ts` — updated for the shared-render
  tenant.
