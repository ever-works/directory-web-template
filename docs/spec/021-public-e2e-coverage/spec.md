---
id: spec-021-public-e2e-coverage
title: 'Spec 021 — Deepened Public-Surface E2E Coverage'
sidebar_label: '021 Public E2E'
---

# Feature spec — `021-public-e2e-coverage`

> **Status:** Shipped in increments (PRs #789, #792, #795, #798, #801).
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code — retro),
> IX (Test Coverage Bar), X (Continual Improvement).
>
> **Depends on:**
> [Spec 010 — E2E Test Coverage](../010-e2e-test-coverage/spec.md),
> [Spec 020 — Server-Side Listings](../020-server-side-listings/spec.md).

## 1. Summary

[Spec 010](../010-e2e-test-coverage/spec.md) established the
end-to-end testing framework. The bulk of the public-surface tests at
the start of this work were single-widget visibility checks — "the
search input is visible", "the menu opens" — which let the
paging regressions in [Spec 020](../020-server-side-listings/spec.md)
ship without any spec catching them.

Spec 021 closes the gap by:

1. Deepening every thin public spec from "widget renders" to
   "widget + behaviour + URL state".
2. Adding flow specs that combine multiple widgets (search → sort →
   paginate → click).
3. Pinning the JSON-listing API contract for the server-paginated
   infinite-scroll mode.
4. Capturing user-facing UX contracts (modifier-key category select,
   "All Tags" badge count, locale redirect loop guard).

The bar is: **a regression that breaks user-visible behaviour on
`/`, `/discover/<n>`, `/tags/<slug>`, `/categories/<slug>`, or
`/items/<slug>` should fail CI before it can reach
`demo.ever.works`.**

## 2. Motivation

- The paging regression (2026-05-10) bounced through `develop` →
  `stage` → `main` because every existing public spec just checked
  visibility. Nothing exercised "click sort → page 2 should still
  honour the sort".
- The silent category-selection state bug (`isActive` strict-equality
  mismatch with the URL-slugified state) was only discovered by
  writing a test against the actual UX contract — it had been
  shipping broken on production for an unknown amount of time.
- Article IX of the constitution requires every shipped feature to
  have an e2e test; we were nominally passing the rule via "we have
  a test file with the right name" but failing the spirit.

## 3. Scope

### 3.1 New specs added

| Spec file                                       | Tests | What it pins                                                              |
| ----------------------------------------------- | -----:| ------------------------------------------------------------------------- |
| `listing-pagination-spec020.spec.ts`            | 7     | Page disjointness, "All Tags" count > 12 sentinel, JSON API shape.        |
| `listing-flow-comprehensive.spec.ts`            | 6     | search → sort → paginate → click flow; back-from-detail.                  |
| `listing-api-filters.spec.ts`                   | 12    | `/api/items/listing` envelope, cache, sort, CSV parsing, page disjointness, locale, SSR/API agreement. |
| `listing-url-state.spec.ts`                     | 7     | URL state persists across refresh; locale prefix; combined `?q=&sort=&page=`. |
| `listing-infinite-scroll.spec.ts`               | 5     | localStorage toggle → infinite mode; scroll triggers fetch; items append. |
| `tag-and-category-detail-pages.spec.ts`         | 8     | `/tags/<slug>` / `/categories/<slug>` SSR routes; unknown slug ≠ 5xx; traversal safety. |
| `active-filters-and-clear.spec.ts`              | 5     | Chip surfaces for `?tags=` / `?categories=`; Clear All present + functional. |
| `settings-modal.spec.ts`                        | 5     | Cog opens modal; pagination toggle exposed; Escape closes; infinite preference persists. |
| `header-and-hero.spec.ts`                       | 10    | Header / footer / hero landmarks; brand-logo navigation; orphan-link a11y sentinel; 404 fallback. |
| `categories-modifier-select.spec.ts`            | 4     | Plain click switches selection; Ctrl+click adds; Shift+click clears the only-selected. |
| `public-feeds.spec.ts`                          | 7     | `atom.xml` / `favicon` / `robots.txt` / `sitemap.xml` / `opengraph-image` / `/llms.txt` cross-link; CORS invariance. |
| `sort-url-sync.spec.ts`                         | 6     | Direct `?sort=` URL, refresh, page+sort combo, SSR/API agreement, dropdown click writes `?sort=`, clearing removes param. |
| `locale-redirect-loop-guard.spec.ts`            | 5     | Card click ≤ 2 navigations; `NEXT_LOCALE` cookie pairing redirects at most once.        |

### 3.2 Augmented existing specs

| Spec                          | Before → after            | Notable additions                                                                 |
| ----------------------------- | -------------------------:| --------------------------------------------------------------------------------- |
| `search.spec.ts`              | 3 → 5 tests               | SSR `?q=` URL filter, JSON-API narrowing, dropped brittle controlled-input check. |
| `sort-menu.spec.ts`           | 3 → 6 tests               | Server-side sort verification via JSON API; SSR `?sort=` URL preservation.       |
| `tags.spec.ts`                | 3 → 9 tests               | Split nav-mode (`/tags`) vs filter-mode (home strip); "All Tags" sentinel.        |
| `categories.spec.ts`          | 3 → 7 tests               | Split nav-mode vs filter-mode; `?categories=` URL + API filter assertions.       |
| `discover.spec.ts`            | 3 → 6 tests               | Page-2 disjointness; filter-aware pagination; OOB-page safety.                    |
| `view-toggle.spec.ts`         | 4 → 6 tests               | `localStorage` persistence across reload; layout-swap mutual exclusion.           |
| `item-detail.spec.ts`         | 2 → 6 tests               | Slug round-trip from listing; canonical / og:url / og:title meta; back navigation. |
| `comparisons.spec.ts`         | 2 → 6 tests               | Cards render; click navigates; header-nav discoverability; 404 fallback.          |

### 3.3 Test-infrastructure improvements

- Page object `view-toggle.page.ts`: multi-marker active-state
  detection (`aria-pressed` | `bg-theme-primary` | `scale-105`) +
  cursor-away after click to avoid hover-class masking.
- Page object `sort-menu.page.ts`: filter trigger by visible sort
  label so it does not pick up the header "More" dropdown (which
  shares `aria-haspopup="menu"`).
- `listing-infinite-scroll.spec.ts` `afterEach` clears
  `localStorage['paginationType']` so it does not bleed into adjacent
  specs.
- `locale-redirect-loop-guard.spec.ts` `afterEach` clears all
  cookies so seeded `NEXT_LOCALE` does not affect the comparisons
  / categories tests that run next.
- `active-filters-and-clear.spec.ts` `beforeEach` wipes cookies +
  localStorage as a belt-and-braces measure.

## 4. Out of scope

- Authenticated flows — covered by `apps/web-e2e/tests/client` and
  `…/admin`.
- Visual regression — separate spec (deferred).
- Cross-browser parity — Playwright config runs Chromium + Firefox +
  WebKit on CI; we don't currently shard by browser per assertion.

## 5. Acceptance criteria

- [x] Every public route (`/`, `/discover/<n>`, `/tags`, `/tags/<slug>`,
  `/categories`, `/categories/<slug>`, `/items/<slug>`, `/comparisons`,
  `/about`, `/pricing`, `/help`, `/docs`, `/legal/*`) has at least one
  spec asserting non-5xx + visible body + the route's main affordance.
- [x] Every filter dimension (`tags`, `categories`, `q`, `sort`, page)
  has a spec asserting URL round-trip + SSR/API agreement.
- [x] Every regression caught by user feedback in the 2026-05 window
  has a corresponding spec that would have failed before the fix.
- [x] All new + augmented specs pass against `demo.ever.works`
  end-to-end (~115 tests across ~24 files; 64 in the deep-coverage
  flow run, full passing sequentially).

## 6. Conventions established

1. **Skip-gracefully when data is absent.** Use `test.skip(condition,
   reason)` rather than failing when the deployment doesn't have the
   feature enabled (e.g. infinite scroll mode disabled, empty
   catalogue). Keeps the suite green on demo + minimal forks.
2. **Direct-URL tests are the source of truth for behaviour.** Widget
   interactions are tested separately and may soft-fail (debounce
   races, controlled-input blanks during URL sync). The contract is
   "the URL works on direct hit" — that's what we lock down hardest.
3. **Page objects are stable.** When the underlying component changes,
   update the page object once (e.g. `ViewToggle.isActive` checks
   three markers) rather than every spec.
4. **Cleanup between specs.** Any spec that seeds `localStorage` or
   cookies MUST clean up in `afterEach`. The shared Playwright context
   does not auto-reset.
5. **Resource-shape tests against the JSON peer first.** When the API
   route is the source of truth, assert against it before drilling
   into the SSR rendering. Faster, more reliable, easier to diagnose.

## 7. Future work (separate specs)

- Visual regression specs against fixed-locale screenshots.
- Accessibility coverage with `@axe-core/playwright` integration.
- Performance budgets enforced in CI (`Lighthouse CI` over the same
  set of public routes).
- Authenticated-user flow coverage (vote / favourite / comment /
  submit) — currently smoke-only in `tests/client`.
