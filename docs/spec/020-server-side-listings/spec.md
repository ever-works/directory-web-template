---
id: spec-020-server-side-listings
title: 'Spec 020 — Server-Side Listing Slice + URL-Driven Filter / Sort / Pagination'
sidebar_label: '020 Server Listings'
---

# Feature spec — `020-server-side-listings`

> **Status:** Shipped (in increments via PRs #777, #780, #783, #786, #792, #798).
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code — retro), IV
> (Documentation First-Class), V (Performance Budget), IX (Test
> Coverage Bar).
>
> **Depends on:**
> [Spec 005 — Internationalisation](../005-internationalisation/spec.md),
> [Spec 018 — Performance Budget](../018-performance-budget/spec.md),
> [Spec 019 — CDN-Cacheable i18n](../019-cdn-cacheable-i18n/spec.md).
>
> **Companion docs:**
> [`docs/performance/server-side-listings.md`](../../performance/cdn-cacheability.md)
> (root cause + measurement notes).

## 1. Summary

Before this spec, the `/` → `/<locale>/discover/<page>` listing
shipped **the entire catalogue** (~992 items on `demo.ever.works`) as
serialized RSC payload to the browser, then did **filter + sort +
paginate client-side**. Symptoms in production:

- `_next/data/...` initial RSC payload was ~3.7 MB. LCP on
  `demo.ever.works` measured > 5 s on a cold 4G connection.
- Filter / sort / pagination operated on the full in-memory array; the
  URL did not reflect the active filter state, so users could not
  bookmark or share a filtered view.
- Once Spec 019 disqualified the `Set-Cookie`-tainted middleware
  response from the CDN, this 3.7 MB body hit the origin on every
  request — TTFB ballooned and Vercel function CPU peaked.

Spec 020 inverts the model:

1. **Server-side slice.** The SSR route filters, sorts, and slices the
   catalogue down to a single page (`PER_PAGE = 12`) before
   serialising. The browser receives ~50 KB of HTML instead of 3.7 MB.
2. **URL is the source of truth.** Every filter dimension — `?q=`,
   `?tags=`, `?categories=`, `?sort=`, `?page=` (as path segment) —
   round-trips through the URL via `useFilterURLSync` (writes) and
   `FilterURLParser` (reads). Bookmarkable, shareable, deep-linkable.
3. **JSON peer route.** The new `GET /api/items/listing` mirrors the
   SSR slice so the new server-paginated infinite-scroll mode can
   fetch successive pages without re-rendering the whole document.
4. **Modifier-key category select.** Plain click = single-select
   (replace selection); Ctrl / Cmd / Shift + click = multi-select.

## 2. Motivation

- **Article V (Performance Budget).** Sub-2.5 s LCP requires a body
  small enough that the CDN can serve it from edge cache. 3.7 MB of
  serialised items also violates the JS bundle budget the spec
  derives.
- **User-visible UX.** Users repeatedly reported "I can't share my
  filtered view" and "page 2 link doesn't show up". Both are
  consequences of state living only in the React tree.
- **Cache-aware infinite scroll.** With Spec 019 making the response
  cacheable, the next bottleneck is the body size on a cache miss.
  Server-side slicing keeps misses cheap.

## 3. Scope

### 3.1 In scope

- SSR filter / sort / slice in `apps/web/app/[locale]/(listing)/discover/[page]/page.tsx`.
- Shared `lib/listing-server.ts` exposing `sortItems(items, sort)`
  and `parseCsv(value)` so the SSR route and the JSON peer agree on
  output for the same query.
- `GET /api/items/listing` returning `{ items, total, page, perPage }`.
- `useFilterURLSync` writes `?tags=`, `?categories=`, `?q=`, `?sort=`,
  and location params via debounced `router.replace`.
- `FilterURLParser` reads the same params on mount + on URL change
  and pushes them into `FilterContext`.
- URL-driven pagination via `usePaginationLogic.serverPagination` mode
  (`router.push(`${basePath}/${page}`)`).
- Server-paginated infinite scroll via `useServerInfiniteLoading`
  fetching pages from `/api/items/listing`.
- Tag-strip hard cap (`TAG_STRIP_HARD_CAP = 30`) to prevent the
  855-tag DOM bloat we observed pre-cap.
- `slugify`-aware category-selection state so URL ⇄ context
  comparisons survive mixed-case category IDs (e.g. "Practices").
- Modifier-key category select (Gmail-labels UX): plain click =
  single-select, Ctrl / Cmd / Shift = multi-select.

### 3.2 Out of scope (this spec)

- Locale detection / banner — see Spec 019.
- Search input rendering / UX — only the URL round-trip.
- Background indexing (e.g. typesense) — sort/filter still iterate
  in-process; acceptable at ~1k items, revisit at 10k.
- Sponsored / featured item ranking — orthogonal to this filter
  pipeline.

## 4. Implementation summary (post-facto)

| PR    | Surface                                                        | What it shipped                                                                                              |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| #777  | `discover/[page]/page.tsx`, `useFilterURLSync`                 | Server-side filter / sort / slice; URL writes for `?tags=`, `?categories=`, `?q=`.                            |
| #780  | `filters/components/tags/tags-section.tsx`                     | `TAG_STRIP_HARD_CAP = 30` (env-overridable via `NEXT_PUBLIC_TAG_STRIP_CAP`).                                  |
| #783  | `usePaginationLogic`, `useServerInfiniteLoading`, `/api/items/listing` | URL-driven numbered pagination; infinite scroll fetches successive pages from the JSON peer; modifier-key category select. |
| #786  | `shared-card/index.tsx`                                        | Header "Showing X of Y" reads `props.total` (catalogue) and `items.length` (page slice) correctly.            |
| #792  | `categories-list.tsx`, `categories-section.tsx`, `active-filters.tsx` | `slugify`-aware category-selection compare so the URL round-trip ("Practices" → "practices") doesn't break `isActive` or chip lookup. |
| #798  | `useFilterURLSync`, `useFilterState`, `FilterURLParser`        | `?sort=` URL sync (was a bare `useState` no-op); locale-aware card click handlers; `LocaleCookieRedirect` `sessionStorage` loop guard. |

## 5. Trade-offs and rejected options

- **Rejected: keep client-side pagination, just compress the RSC
  payload.** Brotli wouldn't help — the bottleneck was deserialisation
  + render of 992 React component trees, not transfer bytes.
- **Rejected: subdomain-per-locale.** Disjoint from this spec's
  filter / sort concern; would also have to re-solve Spec 019.
- **Rejected: client-only sort dropdown that doesn't update URL.**
  Considered for "default popularity is so common nobody bookmarks
  it" — but the user explicitly asked for bookmarkable filtered URLs
  and the implementation cost is trivial once we wire `setSortBy`
  through `syncFilterURL`.
- **Accepted with caveat: tag-strip hard cap of 30.** Some forks may
  want all tags in the DOM for SEO. Cap is env-overridable via
  `NEXT_PUBLIC_TAG_STRIP_CAP`, and the "+N more" popover (client-only,
  portal-rendered) still surfaces every tag once expanded.

## 6. Acceptance criteria

- [x] `/discover/<n>` returns ≤ 100 KB HTML body for a 1k-item
  catalogue.
- [x] Active filter state survives a refresh and is shareable via URL.
- [x] Page 2 of `/discover` shows items disjoint from page 1.
- [x] `GET /api/items/listing?page=N&sort=…&tags=…&categories=…&q=…`
  returns the same slice as the SSR route for the same query.
- [x] Sort changes mutate the URL (`?sort=name-asc` etc.) and are
  honoured on direct GET.
- [x] Plain click on a filter-mode category replaces the selection;
  Ctrl/Cmd/Shift+click adds.
- [x] Visual `aria-pressed` state of category buttons stays in sync
  with the URL through mixed-case IDs.

## 7. Test plan

End-to-end specs landed in `apps/web-e2e/tests/public/`:

- `listing-pagination-spec020.spec.ts` — page-2 disjointness, "All
  Tags" count regression sentinel, JSON API shape.
- `listing-api-filters.spec.ts` — 12 tests on the JSON peer: envelope
  shape, cache headers, invalid input safety, sort behaviour, CSV
  parsing (tags/categories OR semantics), page disjointness,
  non-GET methods, locale forwarding, SSR/API agreement.
- `listing-url-state.spec.ts` — search / sort / page / locale prefix
  all survive reload; combined `?q=&sort=&page=` round-trip.
- `listing-flow-comprehensive.spec.ts` — combined search → sort →
  paginate → click flow.
- `listing-infinite-scroll.spec.ts` — toggle to infinite via
  `localStorage`, scroll triggers `/api/items/listing?page=2` fetch,
  items append, URL doesn't advance.
- `categories-modifier-select.spec.ts` — plain click vs Ctrl/Shift
  multi-select UX contract.
- `sort-url-sync.spec.ts` — direct URL, refresh, page-2 + sort combo,
  SSR/API agreement, dropdown click writes `?sort=`, clearing back to
  default removes the param.
- `locale-redirect-loop-guard.spec.ts` — tag/category card click
  ≤ 2 navigations; `NEXT_LOCALE` cookie pairing redirects at most
  once.

Validated end-to-end against `demo.ever.works` after the final
cascade — see [`log.md`](../../log.md) entries for 2026-05-10 and
2026-05-11.
