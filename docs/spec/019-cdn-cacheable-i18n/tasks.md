---
id: tasks-019-cdn-cacheable-i18n
title: 'Tasks 019 — CDN-Cacheable Public Surface with Pluggable Locale Detection'
sidebar_label: '019 Tasks'
---

# Tasks — `019-cdn-cacheable-i18n`

> Companion to [`spec.md`](./spec.md) and [`plan.md`](./plan.md).

Each task has a clear owner-of-verification step. Mark each done
inline as it lands.

## Routing & middleware

- [x] T-1 `apps/web/i18n/routing.ts`: set `localeDetection: false`,
      add env-driven `localePrefix`. Verify by `pnpm tsc --noEmit`.
- [x] T-2 `apps/web/proxy.ts`: delete `[Client Guard Debug]`
      `console.log` block. Verify by `pnpm lint`.

## Content loader

- [x] T-3 `apps/web/lib/content.ts`: thread `ioErrors` through the
      `fetchItems` map; throw if non-empty. Verify by `pnpm tsc
      --noEmit` and inspecting `git diff` for the new `throw`.

## Settings + i18n helpers

- [x] T-4 `apps/web/lib/utils/settings.ts`: add `LocaleDetectionStrategy`
      type and `getLocaleDetection()` function. Verify by `pnpm tsc
      --noEmit`.
- [x] T-5 `apps/web/lib/i18n/locale-names.ts`: extract
      `LOCALE_NATIVE_NAMES`, `isSupportedLocale`,
      `matchBrowserLocale`. Verify by `pnpm tsc --noEmit`.

## Banner & cookie redirect

- [x] T-6 `apps/web/components/i18n/locale-suggestion-banner.tsx`:
      add `'use client'` component with hydration effect, dismiss
      cookie, switch action via `next-intl` router. Verify by
      `pnpm lint`.
- [x] T-7 `apps/web/components/i18n/locale-cookie-redirect.tsx`:
      inline `<head>` script (server component, ~250 bytes). Verify
      by `pnpm tsc --noEmit`.

## Layout integration

- [x] T-8 `apps/web/app/layout.tsx`: mount `<LocaleCookieRedirect>`
      inside `<head>`. Verify by visual diff and `pnpm lint`.
- [x] T-9 `apps/web/app/[locale]/layout.tsx`: import
      `getLocaleDetection`, render `<LocaleSuggestionBanner>`
      conditionally. Verify by `pnpm tsc --noEmit`.

## Build packaging

- [x] T-10 `apps/web/next.config.ts`: gate `output: 'standalone'`
      on `process.env.STANDALONE_BUILD === 'true'`. Verify with
      `STANDALONE_BUILD=true pnpm build` succeeds (Docker path) and
      a vanilla `pnpm build` also succeeds (Vercel path).

## Tests

- [ ] T-11 `apps/web-e2e/tests/public/home-perf.spec.ts`:
      Playwright spec asserting full item count rendered. Verify
      with `pnpm --filter @ever-works/web-e2e exec playwright test
      tests/public/home-perf.spec.ts`.
- [ ] T-12 `apps/web-e2e/tests/i18n/locale-detection-banner.spec.ts`:
      Playwright spec for banner appearance + dismissal. Same
      verification command.

## Documentation

- [x] T-13 `docs/spec/019-cdn-cacheable-i18n/spec.md` (this folder).
- [x] T-14 `docs/spec/019-cdn-cacheable-i18n/plan.md` (this folder).
- [x] T-15 `docs/spec/019-cdn-cacheable-i18n/tasks.md` (this file).
- [ ] T-16 `docs/performance/cdn-cacheability.md`.
- [ ] T-17 `docs/performance/locale-detection.md`.
- [ ] T-18 `docs/performance/content-loading.md`.
- [ ] T-19 Append entry to `docs/log.md`.
- [ ] T-20 Link new docs from `docs/index.md`.

## Verification

- [ ] T-21 Local: `pnpm lint && pnpm tsc --noEmit && pnpm build` all
      green.
- [ ] T-22 PR opened to `develop`. Vercel preview build succeeds
      with no warnings the original build didn't already have.
- [ ] T-23 Curl preview URL twice; second call returns
      `X-Vercel-Cache: HIT` and `Cache-Control` allows caching.
