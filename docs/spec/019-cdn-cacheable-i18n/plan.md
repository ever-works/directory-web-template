---
id: plan-019-cdn-cacheable-i18n
title: 'Plan 019 — CDN-Cacheable Public Surface with Pluggable Locale Detection'
sidebar_label: '019 Plan'
---

# Implementation plan — `019-cdn-cacheable-i18n`

> Companion to [`spec.md`](./spec.md) and [`tasks.md`](./tasks.md).

## 1. Constitution Check

| Article | Check | Result |
|---|---|---|
| I (Plugin-First) | Does this leak feature logic into core? | The locale-detection strategy lives in a thin `lib/utils/settings` getter + a couple of small components. No new core APIs are introduced. The strategy itself could be repackaged as a plugin slot in a future iteration. **Pass.** |
| II (TypeScript) | All new files `.ts`/`.tsx`? | Yes. **Pass.** |
| III (Spec Before Code) | Spec, plan, tasks present? | Yes (this folder). **Pass.** |
| IV (Documentation) | Reachable from `docs/index.md`, lint-clean? | New `docs/performance/*.md` pages added; index updated; log appended. **Pass.** |
| V (Performance Budget) | Does this improve or regress the budget? | Strictly improves: home TTFB drops ~750 ms → ~30 ms warm. **Pass.** |
| VI (Latest stable) | Any framework downgrade? | None. **Pass.** |
| VII (Reuse before build) | Could this reuse an existing utility? | Native names map is extracted to `lib/i18n/locale-names.ts` for reuse by both the language switcher and the new banner. **Pass.** |
| VIII (No removal without migration) | Are we removing anything? | We change `localeDetection: true` → `false` (a default, not a removal). The Pattern C opt-in (`LOCALE_DETECTION_MODE=server-redirect`) preserves the legacy behaviour for forks that need it. **Pass with migration note in docs.** |
| IX (Test Coverage Bar) | Playwright spec for every user-visible change? | Two new specs (`home-perf.spec.ts`, `locale-detection-banner.spec.ts`). **Pass.** |
| X (Modular Packages) | Cross-package coupling? | No. All changes are local to `apps/web/`. **Pass.** |

## 2. Approach

### 2.1 Routing layer — kill the response mutation

`apps/web/i18n/routing.ts`:

```ts
const localePrefix: 'as-needed' | 'always' =
  process.env.LOCALE_URL_STYLE === 'always' ? 'always' : 'as-needed';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localeDetection: false,  // was: true
  localePrefix,
});
```

Removing `localeDetection: true` is the single change that unblocks
edge caching. `next-intl` middleware no longer writes
`Set-Cookie: NEXT_LOCALE` on responses, no longer adds `Vary:
accept-language`, and the response on `/` becomes eligible for
Vercel's edge cache.

### 2.2 Replacement detection layer — userland strategy

`apps/web/lib/utils/settings.ts` gets a new getter:

```ts
export type LocaleDetectionStrategy = 'client-banner' | 'none';

export function getLocaleDetection(): LocaleDetectionStrategy {
  const value = configManager.getNestedValue('settings.i18n.locale_detection');
  return value === 'none' ? 'none' : 'client-banner';
}
```

`app/[locale]/layout.tsx` reads this once at render time and mounts
the banner conditionally:

```tsx
const localeDetection = getLocaleDetection();
// …
{localeDetection === 'client-banner' && <LocaleSuggestionBanner />}
```

`app/layout.tsx` always renders the inline `<LocaleCookieRedirect>`
script in `<head>` so returning visitors with a `NEXT_LOCALE` cookie
get redirected before paint regardless of which strategy is active.

### 2.3 Banner component

`apps/web/components/i18n/locale-suggestion-banner.tsx` is a `'use
client'` component. It runs zero work on the server (so it doesn't
contribute to the edge-cached HTML payload) and only kicks in after
hydration:

1. Read `locale_suggestion_dismissed` and `NEXT_LOCALE` cookies. If
   either is set, render nothing.
2. Resolve `navigator.language` via
   `lib/i18n/locale-names.ts#matchBrowserLocale`. If it matches the
   current page locale, render nothing.
3. Otherwise, render a small `fixed bottom-4 left-1/2` banner with
   "Switch to {nativeName}" and a dismiss button.

Switching uses `useRouter().replace(pathname, { locale })` from
`next-intl/navigation` so the URL transition follows the project's
existing locale-aware navigation rules.

### 2.4 Returning-visitor cookie redirect

`apps/web/components/i18n/locale-cookie-redirect.tsx` is a tiny
*server* component that injects a synchronous inline script:

```js
(function(){
  var m = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
  if (!m) return;
  var c = decodeURIComponent(m[1]);
  // …compare to current path's locale segment, redirect if mismatched
})();
```

Runs before any React JS, so no flash. The script is hand-minified
to ~250 bytes so it doesn't bloat the `<head>`.

### 2.5 Content loader — fail loud

`apps/web/lib/content.ts` `fetchItems`:

- Add `const ioErrors: Array<{ slug; error }> = [];`
- Inside the `mapWithConcurrency` callback's `catch` block, push
  `{slug, error}` to `ioErrors` instead of just logging.
- After the map completes, if `ioErrors.length > 0`, throw an
  `Error` with a message naming up to three failing slugs.
- Missing-data items (no YAML at all) keep their existing repair
  path — `missingItemDataCount` remains.

This converts the silent "few items rendered" symptom into a 5xx
with a stack trace.

### 2.6 Build packaging

`apps/web/next.config.ts`:

```ts
output: process.env.STANDALONE_BUILD === 'true' ? 'standalone' : undefined,
```

Vercel deployments leave `STANDALONE_BUILD` unset and use Vercel's
native serverless packaging. The repo's `Dockerfile` sets
`STANDALONE_BUILD=true` so Docker/k8s builds keep the standalone
server bundle.

### 2.7 Middleware cleanup

`apps/web/proxy.ts`: delete the `console.log('[Client Guard Debug]', ...)`
block at lines 55-62. It was added during a debugging session and
runs on every `/client/*` request in production.

## 3. Files Changed

| File | Change |
|---|---|
| `apps/web/i18n/routing.ts` | `localeDetection: false`, env-driven `localePrefix` |
| `apps/web/lib/utils/settings.ts` | + `getLocaleDetection()` |
| `apps/web/lib/i18n/locale-names.ts` | NEW — extracted native names map + helpers |
| `apps/web/components/i18n/locale-suggestion-banner.tsx` | NEW — client banner |
| `apps/web/components/i18n/locale-cookie-redirect.tsx` | NEW — inline `<head>` script |
| `apps/web/app/layout.tsx` | mount `<LocaleCookieRedirect>` in `<head>` |
| `apps/web/app/[locale]/layout.tsx` | mount `<LocaleSuggestionBanner>` conditionally |
| `apps/web/lib/content.ts` | `fetchItems` throws on IO errors |
| `apps/web/next.config.ts` | gate `output: 'standalone'` on env var |
| `apps/web/proxy.ts` | remove `[Client Guard Debug]` console.log |
| `apps/web-e2e/tests/public/home-perf.spec.ts` | NEW — item count + cache spec |
| `apps/web-e2e/tests/i18n/locale-detection-banner.spec.ts` | NEW — banner UX spec |
| `docs/spec/019-cdn-cacheable-i18n/spec.md` | NEW |
| `docs/spec/019-cdn-cacheable-i18n/plan.md` | NEW (this file) |
| `docs/spec/019-cdn-cacheable-i18n/tasks.md` | NEW |
| `docs/performance/cdn-cacheability.md` | NEW |
| `docs/performance/locale-detection.md` | NEW |
| `docs/performance/content-loading.md` | NEW |
| `docs/log.md` | append |
| `docs/index.md` | link new docs section |

## 4. Performance Impact

Measured on `demo.ever.works` 2026-05-10:

| Surface | Before | After (target) |
|---|---|---|
| `/` TTFB (warm CDN) | ~750 ms | ≤ 50 ms |
| `/` `X-Vercel-Cache` | MISS, every time | HIT, every time after warm-up |
| `/<locale>/discover/<page>` TTFB (warm) | ~200 ms | ≤ 50 ms |
| Item count rendered on `/` | sometimes < 100 (EMFILE drops) | full count, always (or 5xx + alert) |

No JS bundle increase: the new banner component is ≤ 1 KB gzip; the
inline `<head>` script is ~250 bytes.

## 5. Open Questions Carried Forward

- Q-019a (in `docs/questions.md`): Should the YAML setting accept a
  third value `server-redirect`? **Default: no.** Server-side
  detection is opted into via env var because middleware needs to
  know at edge time, before any YAML is loaded.
- Q-019b: Should banner copy be localized to the current page's
  locale? **Default: no for v1.** Follow-up spec can address.

## 6. Rollout

1. PR → `develop`, Vercel preview deploy.
2. Verify on preview URL that `X-Vercel-Cache: HIT` lands on the
   second hit of `/`.
3. Promote `develop` → `stage` → `main` via the standard PR chain.
4. After production deploy, repeat the verification curl loop on
   `demo.ever.works`.
5. If the loud-failure change in `fetchItems` produces unexpected
   5xx volume during the first 24 h, revert that one change while
   keeping the cache fixes (the two are independent).
