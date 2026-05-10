---
id: spec-019-cdn-cacheable-i18n
title: 'Spec 019 — CDN-Cacheable Public Surface with Pluggable Locale Detection'
sidebar_label: '019 CDN Cache & i18n'
---

# Feature spec — `019-cdn-cacheable-i18n`

> **Status:** Proposed.
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code), IV
> (Documentation First-Class), V (Performance Budget), VIII (No
> Removal Without Migration), IX (Test Coverage Bar).
>
> **Depends on:**
> [Spec 005 — Internationalisation](../005-internationalisation/spec.md),
> [Spec 018 — Performance Budget](../018-performance-budget/spec.md).

## 1. Summary

The public listing surface (`/` → `/<locale>/discover/<page>` and the
per-item, per-category, per-tag detail pages) is **served dynamically
on every request** in production today. Article V of the
[constitution](../../../.specify/memory/constitution.md) targets
LCP ≤ 2.5 s; a representative production deployment
(`demo.ever.works`, 2026-05-10) measured ~750 ms TTFB on every load
with `Cache-Control: private, no-cache, no-store, must-revalidate`
and `X-Vercel-Cache: MISS` despite the underlying route declaring
`export const revalidate = 600` and pre-building the first 10 pages
per locale.

Two root causes:

1. **`next-intl` middleware locale auto-detection mutates the
   response.** With `localeDetection: true` the middleware sets a
   `NEXT_LOCALE` cookie and `Vary` headers on the response so the
   chosen locale follows the visitor's `Accept-Language`. Vercel's
   edge cache cannot serve a `Set-Cookie` response from cache, so the
   pre-rendered HTML is bypassed for every request.
2. **`fetchItems` silently drops items on IO errors.** The content
   loader walks ~1000 YAML files per locale; any item whose read
   throws (`EMFILE`, `ENOMEM`, transient FS error) is filtered out
   rather than surfaced. This produces the "few items rendered"
   symptom users have reported intermittently — a half-empty listing
   that looks legit and is therefore impossible to alert on.

This spec adds a **userland locale-detection strategy** that keeps
the public response cacheable by default, while still giving template
users (forks) the choice between three patterns. It also tightens
content-loader error semantics so partial listings can no longer ship
to users without an alert.

## 2. Motivation

- Article V's performance budget is unenforceable on a route that
  never hits the edge cache. Spec 018 measures bundle size; this spec
  closes the much larger gap on **server response time**.
- Template forks (every Awesome-* directory site) inherit this
  behaviour. A fix here cascades to every downstream deployment
  without further work.
- The current locale auto-redirect is the wrong default for a
  *template*. Different forks have different priorities: a
  marketing-style demo wants a clean URL bar (`as-needed` URLs +
  client-side banner), a strictly multi-tenant SaaS wants
  `localePrefix: always`, a legacy migration wants the original
  `Accept-Language` redirect. The template should support all three
  via configuration, not lock forks into one trade-off.
- The "few items rendered" bug has been observed but not actionable
  because the symptom is silent. Failing loud on IO errors converts
  it into a 5xx with a stack trace, which Vercel/Sentry already alert
  on.

Primary users:

- **End visitors** of the public listing pages — faster perceived
  load.
- **Template fork maintainers** choosing a locale-detection strategy
  that fits their UX.
- **Operators** debugging "the listing is missing items" reports —
  the fix turns a silent symptom into a loud, alertable one.

## 3. Goals

- G-1: The bare `/` response (default locale, no cookies) is
  CDN-cacheable on Vercel — `X-Vercel-Cache: HIT` after warm-up,
  TTFB ≤ 100 ms.
- G-2: Every other public listing route (`/<locale>/discover/<page>`,
  `/<locale>/items/<slug>`, etc.) returns
  `Cache-Control: public, s-maxage=...` so the edge can cache it.
- G-3: A new YAML setting `settings.i18n.locale_detection` controls
  the runtime detection strategy. Default `client-banner`. Accepts
  `none` to disable. Documented in
  `docs/performance/locale-detection.md`.
- G-4: A new env var `LOCALE_URL_STYLE` controls URL prefix style
  (build-time). Default `as-needed`. `always` for Pattern B.
- G-5: A new env var `LOCALE_DETECTION_MODE` opts into server-side
  detection (Pattern C). Default unset.
- G-6: `fetchItems` **throws** when any item fails to load due to an
  IO error, instead of silently filtering it out. Missing-data items
  (no YAML present at all) continue to be filtered as before.
- G-7: Playwright e2e coverage:
  - one spec asserts the home page renders the full item count
    (i.e., does not silently drop items);
  - one spec asserts the locale-suggestion banner appears for a
    visitor whose `navigator.language` differs from the current
    locale and disappears after dismissal;
  - one **deploy-only** spec (env-gated) asserts
    `X-Vercel-Cache: HIT` on the second hit of `/`.
- G-8: Documentation:
  - `docs/performance/cdn-cacheability.md` — operator-facing rule
    set ("if your response sets a cookie or varies on a header, it
    will not be cached at the edge").
  - `docs/performance/locale-detection.md` — pattern matrix and
    config reference.
  - `docs/performance/content-loading.md` — the loud-failure
    contract for `fetchItems`.
  - `docs/log.md` and `docs/index.md` updated.

## 4. Non-Goals

- We do not change the data layer's caching architecture
  (`unstable_cache`, in-memory `fetchItemsCache`, `directoryCache`).
  Those landed in PRs #747 / #753 and are independent.
- We do not implement an admin UI toggle for the locale detection
  strategy. v1 reads it from `settings.i18n.locale_detection` in
  YAML; the existing settings UI may surface it in a follow-up.
- We do not migrate existing fork URLs from `as-needed` to `always`.
  That is a per-fork operator decision; we only add the env var that
  enables it.
- We do not localize the banner copy in v1. Native locale names are
  shown ("Switch to Français?"), but the surrounding sentence is
  English. A follow-up may add per-locale copy via
  `messages/<locale>.json`.

## 5. User Stories

```text
As a first-time visitor to demo.ever.works (browser language: French),
I want the home page to load instantly (CDN HIT) in English with a
small dismissible banner offering to switch to Français, so I can
read the page now and switch later if I want.

As a returning visitor who picked Français on a previous visit, I
want the home page to redirect me to /fr/ before paint with no flash
of English, so the experience feels consistent across visits.

As a template-fork operator running a SaaS where /en, /fr, /de URLs
are required for SEO, I want a single env var
(`LOCALE_URL_STYLE=always`) that makes every locale prefixed and
removes the banner, so my URL structure is what I want without
maintaining a fork patch.

As a template-fork operator who wants the legacy
Accept-Language-redirect behaviour back, I want a single env var
(`LOCALE_DETECTION_MODE=server-redirect`) that opts into it, so I
can keep my current UX while accepting the cache cost.

As an oncall engineer paged on "demo.ever.works listing only shows 3
items", I want the underlying IO failure to surface as a 5xx with a
stack trace in Sentry rather than as silently-dropped items, so I
can fix the root cause instead of guessing.
```

## 6. Acceptance Criteria

- [ ] AC-1: `apps/web/i18n/routing.ts` sets
      `localeDetection: false` and reads `localePrefix` from
      `process.env.LOCALE_URL_STYLE` (default `as-needed`).
- [ ] AC-2: `apps/web/lib/utils/settings.ts` exports
      `getLocaleDetection(): 'client-banner' | 'none'`, defaulting
      to `client-banner`.
- [ ] AC-3: `LocaleSuggestionBanner` client component exists at
      `apps/web/components/i18n/locale-suggestion-banner.tsx`,
      mounted by `app/[locale]/layout.tsx` only when
      `getLocaleDetection() === 'client-banner'`. The banner
      compares `navigator.language` to the current locale, suggests
      a switch, and persists choice / dismissal in cookies.
- [ ] AC-4: `LocaleCookieRedirect` server component exists at
      `apps/web/components/i18n/locale-cookie-redirect.tsx` and
      injects an inline `<head>` script that redirects returning
      visitors before paint based on `NEXT_LOCALE` cookie.
- [ ] AC-5: `apps/web/lib/content.ts` `fetchItems` collects IO
      errors into a separate counter and **throws** when any IO
      error occurred during the listing walk, with a message naming
      up to three failing item slugs. Missing-data items (no YAML
      present) still go through the existing repair path.
- [ ] AC-6: `apps/web/proxy.ts` (middleware) no longer logs
      `[Client Guard Debug]` on every `/client/*` request.
- [ ] AC-7: `apps/web/next.config.ts` gates `output: 'standalone'`
      on `process.env.STANDALONE_BUILD === 'true'`.
- [ ] AC-8: Playwright e2e in `apps/web-e2e/tests/public/` —
      `home-perf.spec.ts` asserts the home page renders an item
      count consistent with `total` from `getCachedItems` (no silent
      drops).
- [ ] AC-9: Playwright e2e in `apps/web-e2e/tests/i18n/` —
      `locale-detection-banner.spec.ts` asserts the banner appears
      for a non-default `navigator.language` and disappears after
      dismissal.
- [ ] AC-10: Documentation files exist:
      `docs/performance/cdn-cacheability.md`,
      `docs/performance/locale-detection.md`,
      `docs/performance/content-loading.md`. `docs/log.md` has a
      new entry. `docs/index.md` links the new pages.

## 7. Out-of-Scope Considerations

- Changing the `unstable_cache` policy on `getCachedItems` /
  `getCachedConfig`. The deliberate refactor in PR #753 stands;
  see the comment block in `lib/content.ts` for rationale.
- Per-locale CDN cache via `Vary: accept-language` with bounded
  buckets. Could land later as a Pattern D under
  `docs/performance/locale-detection.md`; out of scope for v1
  because cache hit ratio is 1/N and most forks don't need it.
- Real-user monitoring (RUM) of CDN cache hit rate. Spec 018
  mentions this as a future extension; tracked there.

## 8. UX Notes

- **First-time visitor, browser locale = current locale.** No
  banner. No flash. Page renders from edge cache.
- **First-time visitor, browser locale ≠ current locale.** Banner
  appears ~100 ms after hydration at the bottom of the viewport
  (`fixed`, semi-transparent backdrop). Two CTAs: `Switch to
  <NativeName>` (primary) and `×` (dismiss).
- **Returning visitor with `NEXT_LOCALE` cookie.** Inline `<head>`
  script redirects to the preferred locale before React hydrates,
  so there is no flash of default-locale content.
- **Visitor who dismissed previously.** No banner ever (cookie
  `locale_suggestion_dismissed=1`).
- **Visitor on Pattern C deployment.** No banner — middleware
  already 307'd them on the way in.

## 9. Data & API Surface

- New YAML field: `settings.i18n.locale_detection`
  (`client-banner` | `none`, default `client-banner`).
- New env vars (consumed by the build / runtime):
  - `LOCALE_URL_STYLE` (`as-needed` | `always`, default
    `as-needed`).
  - `LOCALE_DETECTION_MODE` (`server-redirect` | unset, default
    unset).
  - `STANDALONE_BUILD` (`true` to enable Next.js standalone output;
    Vercel deployments leave this unset).

No new database tables or API routes.

## 10. Plugin / Adapter Impact

- Plugins that mount UI in the public layout via slots inherit the
  new `LocaleSuggestionBanner` automatically — it sits inside
  `<Providers>` next to the existing `SettingsModal`.
- Plugins that perform their own server-side locale detection should
  treat `localeDetection: false` as the new contract and fall back
  to the `LocaleCookieRedirect` script for returning visitors.

## 11. Risks & Open Questions

- **Risk:** removing server-side `localeDetection` regresses
  first-time non-English visitor UX (~100 ms flash before banner).
  Mitigation: documented; operators who can't accept the flash can
  opt into Pattern C via `LOCALE_DETECTION_MODE=server-redirect`.
- **Risk:** the loud-failure change in `fetchItems` could turn
  intermittent `EMFILE` into a stream of 5xx during fd-pressure
  events. Mitigation: this is the *intended* behaviour; PR #747
  already throttles fd usage, so the failure rate should be very low.
  If it isn't, that's a real signal worth alerting on.
- **Open question Q-019a:** Should the YAML setting accept a
  third value `server-redirect` that requires
  `LOCALE_DETECTION_MODE` env var to be consistent? **Default
  chosen:** no, keep YAML to client-side concerns and env var to
  server-side concerns. Recorded in
  [`docs/questions.md`](../../questions.md).
- **Open question Q-019b:** Should the banner be localized to the
  visitor's current page locale (e.g., banner copy in French when
  on /fr)? **Default chosen:** no for v1 — the banner is by
  definition shown when the page locale doesn't match the
  visitor's preference, so English copy is acceptable. Follow-up
  spec can localize it. Recorded in `docs/questions.md`.

## 12. Acceptance Test Plan

- **Local manual recipe:**
  1. `pnpm install`, `pnpm --filter @ever-works/web build` from monorepo root.
  2. `pnpm --filter @ever-works/web start` (or `pnpm dev`).
  3. `curl -sI http://localhost:3000/` — assert no
     `Set-Cookie: NEXT_LOCALE=...`. Confirm
     `Cache-Control` allows caching.
  4. Open `http://localhost:3000/` with
     `Accept-Language: fr-FR,fr;q=0.9` — banner appears, English
     content shown. Click switch → URL becomes `/fr/`,
     `NEXT_LOCALE=fr` cookie set.
  5. Reload `/` — inline script redirects to `/fr/` before paint.
- **Production smoke (run after merge to develop and again after
  merge to main):**
  1. `curl -s -o /dev/null -w "%{http_code} %{time_starttransfer}s
     X-Vercel-Cache:%header{x-vercel-cache}\n"
     https://demo.ever.works/`
  2. Run twice. Second run must show `X-Vercel-Cache: HIT` and
     TTFB ≤ 100 ms.

## 13. References

- Constitution Article V — [Performance Budget](../../../.specify/memory/constitution.md#article-v--performance-budget).
- Spec 005 — [Internationalisation](../005-internationalisation/spec.md).
- Spec 018 — [Performance Budget Enforcement](../018-performance-budget/spec.md).
- next-intl docs — [Middleware locale detection](https://next-intl.dev/docs/routing/middleware#locale-detection).
- Vercel docs — [Edge caching headers](https://vercel.com/docs/edge-network/headers).
