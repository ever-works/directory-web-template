---
id: locale-detection
title: Locale Detection — three patterns, choose one
sidebar_label: Locale Detection
---

# Locale Detection

The template ships with three supported strategies for routing
visitors to a localized version of a page. They are explicit
trade-offs between **first-impression UX** and **CDN cache hit
rate**.

You can switch strategies per deployment via two knobs:

- A YAML setting in your data repo's site config:
  `settings.i18n.locale_detection`.
- An env var: `LOCALE_URL_STYLE` (build-time) and / or
  `LOCALE_DETECTION_MODE` (runtime).

The default is **Pattern A** — a static default locale + a small
client-side suggestion banner. This is what the template ships with
out of the box; it's also what GitHub, Stripe, Linear, and Vercel
itself use on their marketing surfaces.

## Why this is hard

A CDN stores **one HTML response per URL**. If your server returns
different HTML on `/` depending on the visitor's `Accept-Language`,
the CDN has only three options:

1. Cache one version and serve it to everyone — wrong content for
   some users.
2. Cache N versions keyed on the header — Vercel's edge does not
   key on arbitrary request headers; you get a MISS instead.
3. Don't cache the response at all — what `localeDetection: true`
   ends up doing.

So **server-side auto-redirect on first visit** and **edge-cached
HTML on `/`** are physically incompatible. Pick the layer that does
detection.

## Pattern matrix

| Pattern | URL style | Detection | YAML | Env vars |
|---|---|---|---|---|
| **A — Client-side banner** (default) | default locale at `/`, others at `/<locale>/` | After hydration, JS shows a "Switch to French?" banner | `settings.i18n.locale_detection: client-banner` | `LOCALE_URL_STYLE=as-needed` (default) |
| **B — Path-prefix always** | every locale at `/<locale>/`, bare `/` redirects | None server-side; users navigate via menu | `settings.i18n.locale_detection: none` | `LOCALE_URL_STYLE=always` |
| **C — Server-side redirect** | default locale at `/`, others at `/<locale>/` | Middleware reads `Accept-Language`, 307s on first visit | `settings.i18n.locale_detection: none` | `LOCALE_DETECTION_MODE=server-redirect` |

## Pattern A — Client-side banner (default)

**What the visitor sees:**

- First-time English visitor: page loads instantly from edge cache,
  no banner.
- First-time French visitor: page loads instantly in English, then
  ~100 ms later a small dismissible banner appears at the bottom:
  *"This page is also available in **Français** — Switch to
  Français [×]"*.
- Returning visitor who picked Français on a previous visit: the
  inline `<head>` script reads the `NEXT_LOCALE` cookie before paint
  and `location.replace`s to `/fr/<rest>`, so they see French
  immediately, no flash.

**How to enable:**

```yaml
# works.yml in your data repo
settings:
  i18n:
    locale_detection: client-banner   # default; can be omitted
```

No env vars required. `LOCALE_URL_STYLE` defaults to `as-needed`.

**Trade-offs:**

- ✅ `/` is fully edge-cacheable. ~30 ms TTFB on warm CDN.
- ✅ Returning visitors get their language without a flash.
- ⚠ First-time non-English visitors see ~100 ms of English content
  before the banner appears. For most sites this is a fine
  trade-off; for some marketing campaigns it isn't.

## Pattern B — Path-prefix always

**What the visitor sees:**

- Bare `/` immediately 308 redirects to `/en/` (or whatever the
  default locale is).
- Every internal link points at the locale-prefixed URL.
- No banner, no auto-detection. Users pick a language from the
  language menu in the header.

**How to enable:**

```yaml
# works.yml in your data repo
settings:
  i18n:
    locale_detection: none
```

```bash
# .env / Vercel project settings
LOCALE_URL_STYLE=always
```

**Trade-offs:**

- ✅ Cleanest cache story: every URL is independently cacheable.
- ✅ SEO-friendly: each locale has a stable, distinct URL.
- ⚠ The bare `/` redirect adds one network round-trip on every
  first hit. Vercel's edge handles the redirect quickly (~10 ms),
  but it's still a redirect.
- ⚠ All bookmarks and external links to `/foo` become 308s to
  `/en/foo`. Existing inbound links keep working.
- ⚠ This is a **breaking URL change**: bookmarks change shape.

## Pattern C — Server-side redirect (legacy `localeDetection: true`)

**What the visitor sees:**

- First-time French visitor lands on `/`, middleware reads
  `Accept-Language: fr-FR`, returns a 307 to `/fr/`.
- The response is *not* edge-cached — middleware mutated it.
- Subsequent navigation within the locale is normal.

**How to enable:**

```yaml
# works.yml in your data repo
settings:
  i18n:
    locale_detection: none
```

```bash
# .env / Vercel project settings
LOCALE_DETECTION_MODE=server-redirect
```

**Trade-offs:**

- ✅ No flash for non-English visitors — they're redirected before
  any content paints.
- ⛔ `/` is **not** edge-cacheable. Every request hits the
  serverless function. Expect ~500–1000 ms TTFB on a typical
  monorepo of this size.
- ⛔ Cache hit rate on every other public route also drops because
  the middleware writes `Set-Cookie: NEXT_LOCALE` on responses.
- This was the template's behaviour pre-Spec 019; it remains
  available for forks that prioritize first-paint locale matching
  over cache cost.

## Inline cookie redirect — applies to all patterns

Regardless of which pattern you pick, the template always renders a
~250-byte inline `<head>` script (`<LocaleCookieRedirect>`) that
reads the `NEXT_LOCALE` cookie and redirects returning visitors
client-side before paint. Set in
`apps/web/app/layout.tsx`.

This is what makes returning-visitor UX in **Pattern A** feel
seamless without sacrificing the cache. You can disable it by
removing the component import from the root layout, but it's
recommended to leave it on.

## Choosing for your fork

| If you want… | Pick |
|---|---|
| Best Lighthouse score on a public marketing-style demo | Pattern A |
| Strictly per-locale URLs for SEO; you have analytics on URL paths | Pattern B |
| Original behaviour (server-side `Accept-Language` redirect) | Pattern C |
| Internal tool, English-only audience | Pattern A with `i18n.locale_detection: none` (skips the banner) |

## Related

- [CDN Cacheability](./cdn-cacheability.md) — *why* the default
  changed.
- [Spec 005 — Internationalisation](../spec/005-internationalisation/spec.md).
- [Spec 019 — CDN-Cacheable i18n](../spec/019-cdn-cacheable-i18n/spec.md).
