---
id: cdn-cacheability
title: CDN Cacheability — keeping public routes fast
sidebar_label: CDN Cacheability
---

# CDN Cacheability

This page is the **operator-facing rule set** for keeping public
routes served from the Vercel edge cache (or any equivalent CDN)
instead of bouncing every request to a serverless render.

It exists because in 2026-05 a deployment of this template
(`demo.ever.works`) was measured serving **every** home-page request
with `X-Vercel-Cache: MISS` and ~750 ms TTFB despite the underlying
route declaring `revalidate = 600`. The full investigation lives in
[Spec 019](../spec/019-cdn-cacheable-i18n/spec.md).

> **TL;DR** — if your response sets a `Set-Cookie` header or includes
> a `Vary` header that varies on personalization, **the edge cache
> will not serve it**, no matter how aggressive your `revalidate`
> setting is.

## The one rule

Vercel's edge cache (and most CDNs) treat a response as
**personalized** — and therefore non-cacheable — if any of the
following are true:

1. The response has a `Set-Cookie` header.
2. The response has a `Vary` header that varies on a request header
   the edge does not key cache entries on (`Accept-Language` is the
   classic offender).
3. The response has `Cache-Control` of `private`, `no-store`, or
   `no-cache`.

If your route is **supposed** to be cacheable (a public listing, a
marketing page, an item detail), the response must NOT trigger any of
the above.

## Common ways to break cacheability

### 1. `next-intl` `localeDetection: true`

`next-intl`'s middleware locale auto-detection writes a `NEXT_LOCALE`
cookie and a `Vary` header on every response. This is the most common
cause of full-CDN-bypass on Next.js + `next-intl` projects.

**Fix:** set `localeDetection: false` in `i18n/routing.ts` and use
the userland strategy described in
[Locale Detection](./locale-detection.md). This is the default in
the template since Spec 019.

### 2. Auth middleware writing cookies on every request

Auth providers (`next-auth`, `@supabase/ssr`) refresh the session
cookie on every request. Even a cookie that doesn't change from the
client's perspective is still a `Set-Cookie` from the CDN's
perspective.

**Fix:** scope the auth middleware matcher to authenticated routes
only (`/admin`, `/client`, `/auth`). Public routes should not be
exposed to the auth refresh path. The template's `proxy.ts` is set
up this way; if you add new auth integrations, keep their writes
gated behind the same path checks.

### 3. Forgetting `revalidate` on a route segment

Without `export const revalidate = N` on the segment, App-Router
pages default to dynamic rendering (`force-dynamic` once any dynamic
API is touched).

**Fix:** declare `export const revalidate = N` on the segment
(seconds). For listings that change daily, 600 (10 min) is a good
default; for item detail pages, 3600 (1 h) is reasonable.

### 4. Setting `Cache-Control: private` from a Route Handler

Route handlers in `app/api/**/route.ts` default to dynamic. If the
handler sets explicit headers, double-check it sets a public
`Cache-Control`. Look for `private`, `no-store`, `no-cache` in
`Response` headers.

**Fix:** for public read-only data, set
`Cache-Control: public, max-age=60, s-maxage=600,
stale-while-revalidate=86400` or similar. The template's
`feed.json`, `atom.xml`, `rss.xml`, and `llms.txt` route handlers
are good examples.

### 5. Touching `cookies()` / `headers()` in a Server Component

Calling `cookies()` or `headers()` from React Server Components
(directly or indirectly through a library) opts the entire route
into dynamic rendering — even if you only read the value.

**Fix:** if you only need the value at the start of the request, use
`searchParams` instead. If you need a real cookie/header read, push
the work into a route handler or move the dependency to a client
component.

## How to verify

Before merging a change to a public route, run a quick curl loop
against your preview deployment:

```bash
DEPLOY_URL=https://your-preview.vercel.app

curl -sI "$DEPLOY_URL/" | grep -iE 'cache-control|x-vercel-cache|set-cookie|vary'
sleep 5
curl -sI "$DEPLOY_URL/" | grep -iE 'cache-control|x-vercel-cache|set-cookie|vary'
```

Second response must show `X-Vercel-Cache: HIT` (or at least `STALE`
returning while revalidating). If it stays `MISS`, walk through the
list above.

## Headers cheat-sheet

| Want | Set |
|---|---|
| Public, edge-cacheable for 1h, browser revalidates after 1m | `Cache-Control: public, max-age=60, s-maxage=3600, stale-while-revalidate=86400` |
| Per-user; never cache anywhere | `Cache-Control: private, no-store` |
| Public but cached only at edge, never in browser | `Cache-Control: s-maxage=3600, stale-while-revalidate=86400` |
| ISR with built-in `revalidate = 600` | (no `Cache-Control` needed; Next.js handles it) |

## Related

- [Locale Detection](./locale-detection.md) — pattern matrix for
  i18n that doesn't break cache.
- [Content Loading](./content-loading.md) — fail-loud contract for
  the YAML loader so partial pages never get cached.
- [Spec 018 — Performance Budget](../spec/018-performance-budget/spec.md)
  — the JS-bundle gate.
- [Spec 019 — CDN-Cacheable i18n](../spec/019-cdn-cacheable-i18n/spec.md)
  — the work that produced this page.
