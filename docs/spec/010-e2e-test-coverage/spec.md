---
id: spec-010-e2e-test-coverage
title: 'Spec 010 — End-to-End Test Coverage'
sidebar_label: '010 E2E Coverage'
---

# Feature spec — `010-e2e-test-coverage`

> **Status:** In progress.
> Coverage matrix lives at
> [`apps/web-e2e/E2E-TESTS.md`](../../apps/web-e2e/E2E-TESTS.md).

## 1. Summary

End-to-end Playwright coverage for **every user-visible feature** of the
template across public, authenticated client, admin, and API surfaces.
Authentication state is generated once in `global-setup.ts` and reused
across specs to keep the suite fast.

## 2. Motivation

- The template has no Jest/Vitest unit suite (intentionally — see
  CLAUDE.md). Playwright is the regression net.
- Forks need confidence that customisations have not broken the base
  workflows.

## 3. Goals

- One spec file per feature area under `apps/web-e2e/tests/<area>/`.
- Authenticated specs reuse storage states from `global-setup.ts`.
- Specs assert on roles / labels / `data-testid`s, not on copy that
  changes with content.
- CI runs the full suite on PR and on push to `develop` / `main`.

## 4. Non-Goals

- 100% pixel diffing (out of scope; not a perf-friendly test strategy).
- Cross-browser matrix beyond Chromium / Firefox / WebKit.
- Mobile-emulated Playwright projects (future spec).

## 5. User Stories

```text
As a maintainer, I want every PR to run the full Playwright suite so I
catch regressions before merge.

As a fork maintainer, I want to copy the e2e suite and adapt it to my
custom features without rewriting the substrate.
```

## 6. Acceptance Criteria

- [x] AC-1: `apps/web-e2e/playwright.config.ts` runs against
  Chromium / Firefox / WebKit.
- [x] AC-2: `global-setup.ts` produces admin and client auth states.
- [x] AC-3: Coverage exists for: smoke, auth (register/signin/signout),
  public surfaces (search, filters, item detail, theme toggle, language
  switcher, share button, scroll-to-top, login modal, profile dropdown,
  newsletter, pricing, surveys, votes & comments, error pages, legal,
  form validation, sort menu, view toggle, star rating, tags,
  collections, categories), client surfaces (dashboard, profile,
  settings, favourites, submissions, submit-and-manage, trash),
  admin surfaces (every section per Spec 009), API (health, items,
  comments, favorites), i18n (locale, locale-depth).
- [ ] AC-4: Coverage for **plugin registry / slot rendering** once
  [`002`](../002-plugin-architecture/spec.md) ships.
- [ ] AC-5: Coverage for **third-party analytics emission**
  (per [`008`](../008-analytics-providers/spec.md)) — verify that enabled
  providers receive expected events.
- [ ] AC-6: Coverage for **payments smoke** (per
  [`004`](../004-payment-providers/spec.md)) — checkout button presence,
  pricing fetch, redirect to provider sandbox.
- [ ] AC-7: Coverage for **maps** (per
  [`011`](../011-maps-providers/spec.md)) — map loads when an item has
  coordinates.
- [ ] AC-8: Coverage for **newsletter** (per
  [`012`](../012-newsletter-providers/spec.md)) — successful submission +
  validation errors.
- [ ] AC-9: Coverage for **notifications** (per
  [`013`](../013-notifications-system/spec.md)) — receiving a
  notification updates the bell badge.

## 7. Out-of-Scope Considerations

- Visual regression (Percy / Chromatic) — future spec.
- Synthetic monitoring against production — future spec.

## 8. UX Notes

E2E specs should mirror typical user journeys; include keyboard-only
paths where the component is keyboard-critical (modals, menus).

## 9. Data & API Surface

Playwright fixtures under `apps/web-e2e/fixtures/` and helpers under
`apps/web-e2e/helpers/` provide reusable utilities. New specs should
extend these rather than re-implementing.

## 10. Plugin / Adapter Impact

Plugins must ship their own e2e specs alongside their package, and the
runtime must register them so they run as part of the suite (mechanism
TBD; tracked under `002/tasks.md`).

## 11. Risks & Open Questions

- **Risk:** flaky tests against a real DB. Mitigation: deterministic
  fixtures, retries on CI, isolation per spec.
- **Open:** parallelise across Playwright projects vs across specs.
  Default: **`fullyParallel: true`** with 2 workers in CI.

## 12. Acceptance Test Plan

The acceptance criteria above **are** the test plan. Track gaps in
`apps/web-e2e/E2E-TESTS.md` and close them with PRs that add specs.

## 13. References

- `apps/web-e2e/E2E-TESTS.md` (current coverage map).
- Constitution Article IX.
