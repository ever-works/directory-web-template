---
id: log
title: Documentation & Specs Change Log
sidebar_label: Change Log
sidebar_position: 99
---

# Documentation & Specs Change Log

A running log of meaningful changes to documentation, specs, and the
project's living-document set (constitution, agent rules, plans). One
line per change, newest at the top. Every line follows the form:

```
YYYY-MM-DD area: short summary
```

Where **area** is one of:

- `docs/<section>` — a docs page.
- `spec-NNN` — a feature spec under `docs/spec/NNN-…/`.
- `constitution` — an amendment to `.specify/memory/constitution.md`.
- `agents` — `AGENTS.md` change.
- `claude` — `CLAUDE.md` change.
- `index` — `docs/index.md` change.
- `questions` — `docs/questions.md` change.

This file lives in the docs site and acts as a hand-maintained
companion to git history. Use this when reading **what changed and
why** at a higher level than per-commit diffs.

---

## 2026-04-30

- `apps/web-e2e` Added eleven more smoke specs closing the largest
  remaining coverage gaps: `api/admin-protected-extra.spec.ts` (36
  admin-only endpoints across every slice — categories `all`/`git`/
  `reorder`, clients `dashboard`/`stats`/`advanced-search`/`bulk`,
  collections, comments, companies, featured-items, geo-analytics,
  items `stats`/`bulk`/`export`/`export/sample`/`import/validate`,
  location-index, navigation, notifications `mark-all-read`,
  reports `list`/`stats`, roles `list`/`active`/`stats`, settings
  `list`/`map-status`, sponsor-ads, tags `list`/`all`, twenty-crm
  `config`/`test-connection`, users `check-email`/`check-username`/
  `stats`), `api/client-protected.spec.ts` (8 `/api/client/**`
  endpoints — dashboard `stats`, `geo-stats`, items list /
  `coordinates` / `stats`, import `sample`/`validate`/POST),
  `api/surveys.spec.ts` (8 auth-gated CRUD + per-survey responses
  + per-response detail), `api/payment-checkouts.spec.ts` (28
  auth-gated checkout / payment-method / setup-intent /
  subscription mutation routes across Stripe, LemonSqueezy, Polar,
  Solidgate + sponsor-ad lifecycle), `api/auth-change-password.spec.ts`
  (2 no-session / empty-body cases), `api/location-coordinates.spec.ts`
  (3 enabled / disabled feature-gate cases),
  `api/user-profile-location.spec.ts` (2 GET + PUT no-session
  cases), `api/reports.spec.ts` (2 no-session / empty-body cases),
  `public/newsletter-unsubscribe.spec.ts` (2 with / without token),
  `public/integration.spec.ts` (3 `/integration/{analytics,posthog,
  speed-insights}` showcase pages), and
  `public/admin-pages-protected.spec.ts` (18 `/admin/**` and
  `/dashboard/**` page routes redirect anonymous visitors without
  5xx). Same no-5xx contract as the rest of the smoke layer.
  `E2E-TESTS.md` updated with all eleven entries and the
  continual-improvement headline total annotation.
- `apps/web-e2e` Added six more API smoke spec files closing
  remaining coverage gaps in the public surface:
  `api/feature-existence.spec.ts` (`/api/categories/exists`,
  `/api/collections/exists`, `/api/surveys/exists` with
  `type=item|global`, `/api/items/export/settings`),
  `api/location.spec.ts` (`/api/location/countries`, `/cities`,
  `/search` with no-params / city / country / valid-radius /
  invalid-coords variants — covers both the location-enabled 200/400
  and location-disabled 404 contracts), `api/item-public.spec.ts`
  (public per-item GETs and POSTs against a non-existent slug —
  votes/count, comments listing, comments/rating, views POST,
  unauthenticated comments POST), `api/cron-jobs.spec.ts`
  (`/api/cron/subscription-expiration` and
  `/api/cron/subscription-reminders` with no secret and with a
  wrong secret), `api/stripe-public.spec.ts` (`/api/stripe/products`
  dynamic-pricing gate), and `api/payment-protected.spec.ts` (13
  auth-required user / Stripe / LemonSqueezy / sponsor-ads / payment
  account / per-item company / votes-status surfaces). Same
  no-5xx contract as the rest of the API smoke layer. `E2E-TESTS.md`
  updated with all six entries and the continual-improvement total
  annotation.
- `spec-002` Status moved from *proposed* to *in-progress* in the
  spec index now that Phase A (T-001/T-002/T-003 — SDK, runtime, and
  demo plugin scaffolds) has shipped. T-004..T-012 still remain.
- `apps/web-e2e` Added API smoke specs for previously-uncovered
  endpoint surfaces: `api/version.spec.ts` (GET `/api/version`, GET
  and POST on `/api/version/sync`), `api/webhooks.spec.ts` (Stripe,
  LemonSqueezy, Polar, Solidgate webhook GET / unsigned-POST
  contracts — both must be 4xx, never 5xx),
  `api/discovery.spec.ts` (public sponsor-ads, items
  popularity-scores, items export, items/[slug] 404 contract),
  `api/protected.spec.ts` (10 auth-required endpoints across tenant,
  admin, user, client, current-user surfaces — must respond 4xx, not
  5xx, when unauthenticated), and `api/method-guards.spec.ts`
  (POST-only `/api/extract`, `/api/verify-recaptcha`, `/api/geocode`,
  plus `/api/internal/db-init` dev-gate and `/api/cron/sync`
  contract). Each spec only asserts "no 5xx" so it stays valid
  across local / CI environments. `apps/web-e2e/E2E-TESTS.md`
  updated with new entries and the headline total annotation.
- `apps/web-e2e` Added smoke specs for previously-uncovered surfaces:
  `auth/new-verification.spec.ts`, `public/docs.spec.ts`,
  `public/cms-page.spec.ts` (the generic `/pages/[slug]` route),
  `client/billing.spec.ts` (dashboard billing auth + redirect), and
  `api/reference.spec.ts` (Scalar API reference UI + `openapi.json`).
  `apps/web-e2e/E2E-TESTS.md` updated to list each new spec.
- `docs/plugins` Added `packages.md` — a per-package overview of
  `@ever-works/plugin-sdk`, `@ever-works/plugin-runtime`,
  `@ever-works/plugin-demo`. Linked from `docs/index.md`.
- `spec-002` Phase A complete: scaffolded
  [`@ever-works/plugin-sdk`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk),
  [`@ever-works/plugin-runtime`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime),
  and [`@ever-works/plugin-demo`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo)
  per [Spec 002 / T-001..T-003](spec/002-plugin-architecture/tasks.md).
  All three packages typecheck cleanly. No `apps/web` wire-up yet —
  that lands in Phase B (T-004..T-006).
- `spec-006`, `spec-007`, `spec-008`, `spec-009`, `spec-011`,
  `spec-012`, `spec-013`, `spec-014`, `spec-015`, `spec-016` Added
  implementation plans + task lists, completing the Spec Kit trio
  (`spec.md` + `plan.md` + `tasks.md`) for every retroactive feature
  spec from this run. Each plan documents the existing topology and
  the migration path to the plugin architecture (Spec 002).
- `apps/web-e2e` Added smoke specs for previously-uncovered surfaces
  to close gaps in [Spec 010](spec/010-e2e-test-coverage/spec.md):
  `auth/forgot-password.spec.ts`, `auth/new-password.spec.ts`,
  `public/help.spec.ts`, `public/about.spec.ts`,
  `public/comparisons.spec.ts`, `public/sponsor.spec.ts`.
- `spec-003` Added implementation plan + tasks for auth providers,
  documenting the existing topology and the migration path to plugin
  packages once Spec 002 stabilises.
- `spec-004` Added implementation plan + tasks for payment providers
  with the same pattern (current shape + plugin-migration target).
- `spec-005` Added implementation plan + tasks for i18n covering
  message catalogue management, locale switcher, RTL, and Docusaurus
  i18n.
- `spec-016` Added retroactive spec for the typed analytics events
  layer shipped in PR #692, sitting on top of Spec 008.
- `spec-010` Added implementation plan and task list for the e2e
  test coverage spec, including engineering backlog (resilience and
  speed passes).
- `docs/plugins` Added `lifecycle.md` covering boot, validation,
  registration, setup, runtime use, enable/disable/swap, teardown,
  events, versioning, and anti-patterns.
- `claude` Added a "Read first" block to `CLAUDE.md` pointing to
  AGENTS.md, `.specify/`, `docs/spec/`, log, and questions.
- `spec-002` Added Spec Kit feature spec, plan, and tasks for the
  plugin / adapter architecture.
- `spec-001` Added retroactive spec for the monorepo conversion (the
  underlying plan documents in `docs/plans/` are kept untouched per
  Article VIII of the constitution).
- `spec-003`, `spec-004`, `spec-005`, `spec-006`, `spec-007`,
  `spec-008`, `spec-009`, `spec-010`, `spec-011`, `spec-012`,
  `spec-013`, `spec-014`, `spec-015` Added retroactive specs for the
  shipped or in-progress features (auth providers, payment providers,
  i18n, Git CMS, theming, analytics, admin dashboard, e2e test
  coverage, maps, newsletter, notifications, docs translation, Spec
  Kit adoption).
- `constitution` Created `.specify/memory/constitution.md` with ten
  durable principles (Plugin-First, TypeScript-Only, Spec-Before-Code,
  Documentation-First, Performance Budget, Latest Stable Frameworks,
  Reuse Before Build, No Removal Without Migration, Test Coverage
  Bar, Modular Packages).
- `docs/.specify` Added `.specify/README.md`, the constitution, and the
  spec / plan / tasks templates per the [GitHub Spec Kit](https://github.com/github/spec-kit)
  convention.
- `agents` Rewrote `AGENTS.md` to enumerate the cross-cutting rules
  for any AI agent operating in this monorepo (Spec-Driven
  Development, plugin-first, TypeScript-only, performance budget,
  latest frameworks, reuse, no-removal, test bar, docs-first, modular
  packages, safety, continual-improvement runs).
- `index` Linked `.specify/`, `docs/spec/`, `docs/log.md`, and
  `docs/questions.md` from `docs/index.md`.
- `questions` Created `docs/questions.md` to capture open questions
  with chosen defaults.

## 2026-04-26 (pre-Spec-Kit)

- `docs/architecture` Translation work landed for architecture pages
  (PR #681).
- `docs/api` Translation work landed for API pages (PR #680).
- `docs/advanced-guide` `docs/features` `docs/payment` Translations
  landed (PR #677).

## 2026-03-08

- Monorepo conversion design and plan landed in
  [`docs/plans/2026-03-08-monorepo-conversion.md`](plans/2026-03-08-monorepo-conversion.md)
  and
  [`docs/plans/2026-03-08-monorepo-conversion-design.md`](plans/2026-03-08-monorepo-conversion-design.md).
  These remain the definitive source for that effort and are now
  cross-linked from `docs/spec/001-monorepo-conversion/spec.md`.

---

## How to add an entry

1. Append a single line under the most recent date heading; create a
   new date heading for a new day.
2. Keep entries in a stable bullet style (`- area: summary`).
3. If the change implements or amends a spec, link the spec folder.
4. If the change has a PR, mention the PR number in parentheses.
