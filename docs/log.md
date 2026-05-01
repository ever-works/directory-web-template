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

## 2026-05-01

- `docs/plugins` Added `capabilities.md` — the missing **per-capability
  reference** that pairs with [`packages/plugin-sdk/src/providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts).
  One section per canonical capability (`auth`, `payment`, `analytics`,
  `search`, `content-source`, `maps`, `newsletter`, `notifications`,
  `ai`, `ui-slot`) with the full TypeScript interface, the lookup
  style (single-provider via `registry.get` vs fan-out via
  `registry.list`), the rules the runtime applies when two enabled
  plugins declare the same capability, and a five-step "how to add a
  new capability" checklist that mirrors Spec 002. Plugin authors
  previously had to read the SDK source to discover that
  `analytics` / `newsletter` / `notifications` are fan-out and that
  `auth` / `payment` / `search` / `content-source` / `maps` / `ai`
  are single-lookup; that information now lives in one place. Cross-links
  added in the architecture page (`Capabilities` table now points at
  this reference as the source of truth), `authoring-a-plugin.md`
  *See also*, `lifecycle.md` *See also*, `testing-a-plugin.md`
  *See also*, `packages.md` *See also*, and `docs/index.md`.
  Spec 002 `T-010` task list grew from "four pages" to "five pages"
  and adds an explicit "doc and SDK cannot drift" verification
  bullet for the new reference.
- `apps/web-e2e` Added `public/per-survey-public.spec.ts` (1 — `GET
  /surveys/[slug]` with an unknown slug; exercises the
  `notFound()` / disabled-feature branch with the same non-5xx
  contract as the rest of the smoke layer. Closes the last
  public-survey page surface that was implicit rather than explicit;
  the listing page is already covered by `public/surveys.spec.ts`,
  the dashboard owner flow by `public/dashboard-surveys-protected.spec.ts`,
  the admin per-slug pages by `public/admin-by-id-pages-protected.spec.ts`,
  and the REST surface by `api/surveys.spec.ts`). `E2E-TESTS.md`
  updated with the new entry and the continual-improvement headline
  total annotation (now ~278 tests across 44 spec files).
- `docs/plugins` Added `testing-a-plugin.md` (~6 KB) — author-facing
  guide that pairs with the existing `authoring-a-plugin.md`. It
  documents the four-layer test pyramid for plugins
  (manifest/Zod schema, registry round-trip via
  `createTestRegistry`, slot rendering through `<SlotHost />`, and
  Playwright smoke specs), an explicit *what not to do* list (don't
  mock `PluginRegistry`, don't reach into `apps/web/**`, don't
  assert on translatable copy), and an "override" recipe for
  schemas with non-default required fields. Each example imports
  from the published runtime exports
  (`@ever-works/plugin-runtime/testing`,
  `@ever-works/plugin-runtime/SlotHost`,
  `@ever-works/plugin-runtime`), so the doc and
  [`packages/plugin-runtime/src/testing.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/testing.ts)
  / [`SlotHost.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/SlotHost.tsx)
  cannot drift. Cross-links added in `authoring-a-plugin.md`
  (replaces the inline "Add a Playwright spec" snippet with a
  pointer to the dedicated guide and the original Playwright
  example), `packages.md` *See also* section, and `lifecycle.md`
  *See also* section. `docs/index.md` now lists three plugin
  guides under the spec-driven pointers — `Authoring a Plugin`,
  the previously-unlinked `Plugin Lifecycle`, and the new
  `Testing a Plugin`. Spec 002 `tasks.md` `T-010` task list grew
  from "three new pages" to the four canonical
  `docs/plugins/**` pages and now includes
  `docs/plugins/packages.md` + `docs/plugins/testing-a-plugin.md`,
  with an explicit "doc and runtime cannot drift" verification
  bullet.
- `docs/architecture` `plugin-system.md` status block updated from
  *proposed* to *in-progress* (Phase A scaffolding shipped in commit
  `8b68d29a`); the "two packages" section now reads "three packages"
  to include the existing `@ever-works/plugin-demo` reference plugin
  (with a note that it is not part of the runtime contract). The
  Slots table was extended from 9 rows to the full 15 canonical slot
  ids (`home.after-listing`, `item.detail.actions`,
  `admin.layout.header.right`, `admin.items.row.actions`,
  `admin.items.toolbar`, `client.settings.section`) and now points
  readers at [`packages/plugin-sdk/src/slots.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts)
  as the authoritative source so the doc and the SDK can never drift
  again.
- `apps/web-e2e` Added `api/item-company-write.spec.ts` (2 — `POST`
  and `DELETE` `/api/items/[slug]/company` for a non-existent slug;
  the matching `GET` is already covered in
  `payment-protected.spec.ts` line 37, but the **write** surfaces of
  the per-item admin company-assignment route were not explicitly
  smoke-tested. Same no-5xx contract as the rest of the smoke layer
  — anonymous callers must receive a 4xx, never a 5xx).
  `E2E-TESTS.md` updated with the new entry.
- `spec-018` Added `018-performance-budget` (proposed): full
  spec/plan/tasks trio that converts Article V of the constitution
  into a measurable, CI-enforced contract — per-route gzip first-load
  JS budget, a `pnpm perf:bundle` script, a Lighthouse CI workflow,
  and a maintainer-facing dashboard page. Two PRs are scoped: PR 1
  (bundle gate + docs) and PR 2 (Lighthouse CI). Two open questions
  recorded in `docs/questions.md` (Q-018a Lighthouse trigger
  surface; Q-018b budget file location). No code yet — this entry
  only adds the docs/spec scaffolding so future work stops "Article
  V is aspirational" being a true statement.
- `spec-017` Status flipped from *in-progress* to **shipped** in
  the spec index and in [`spec.md`](spec/017-map-view/spec.md). All
  T-001..T-009 tasks landed in commit `fe808cc3` (`feat: more on
  maps`) on the `develop` branch — sidebar + dedicated `/map`
  route + header nav link + e2e coverage are live. Follow-up
  enhancements (sidebar virtualisation, mini-map embed on
  item-detail) tracked as separate iterations.
- `questions` Added `Q-018a` (Lighthouse trigger surface) and
  `Q-018b` (perf budget file location) under the new Spec 018
  section.
- `spec-017` Added `017-map-view` (proposed → implemented in this PR):
  spec/plan/tasks for the listing map view + dedicated `/map` route +
  header `Map` nav link gated on `settings.header.map_enabled`. Adds
  `MapSidebar`, extends `LayoutMap` with marker↔card sync and
  auto-fit bounds, adds `apps/web-e2e/tests/public/map.spec.ts` and
  `docs/features/map-view.md`. No new dependencies.
- `index` Added a Maps & Location bullet to `docs/index.md` Key
  Features that links to the new feature page.
- `docs/features` `maps-location.md` and `guides/map-integration-guide.md`
  now cross-link to the Map View feature page and Spec 017.
- `README` Root `README.md` Tech Stack now mentions Mapbox GL JS /
  Google Maps and a new "Maps & Location" section documents the
  Map view config, env vars, and YAML location example.
- `apps/web-e2e` Added two more smoke spec files closing the last
  notable per-slug surfaces that were not yet explicitly covered:
  `public/per-slug-public.spec.ts` (3 — `/comparisons/[slug]`,
  `/categories/[category]`, `/tags/[tag]` per-slug detail pages with
  an intentionally unknown slug; exercises each page's `notFound()`
  / disabled-feature branch with the same non-5xx contract used
  elsewhere in the smoke layer; complements the legacy `(listing)`
  versions in `public/legacy-routing.spec.ts`) and
  `api/item-comment-rating-by-id.spec.ts` (2 — `GET` and `PATCH` of
  `/api/items/[slug]/comments/rating/[commentId]` for a non-existent
  comment id; closes the last `/api/items/[slug]/**` per-comment
  route that was not explicitly smoke-tested — sibling routes
  `/api/items/[slug]/comments/rating` and `.../comments/[commentId]`
  are already covered by `api/item-public.spec.ts` and
  `api/items-engagement-and-favorites.spec.ts`). Same no-5xx contract
  as the rest of the smoke layer. `E2E-TESTS.md` updated with both
  entries and the continual-improvement headline total annotation
  (now ~277 tests across 43 spec files).

## 2026-04-30

- `apps/web-e2e` Added `api/item-votes-public.spec.ts` (2 — public
  `GET /api/items/[slug]/votes` non-existent-slug contract: no-5xx
  status plus a non-error JSON envelope when the body parses). This
  closes the last public per-item GET surface that was implicit
  rather than explicit (the `/votes/count` route is its sibling and
  was already covered by `api/item-public.spec.ts`; the auth-gated
  `/votes` POST/DELETE and `/votes/status` GET sit in
  `items-engagement-and-favorites.spec.ts` and
  `payment-protected.spec.ts` respectively). Same no-5xx contract as
  the rest of the smoke layer. `E2E-TESTS.md` updated with the new
  entry and the continual-improvement headline total annotation.
- `spec-001` Added retroactive `plan.md` and `tasks.md` so the
  monorepo-conversion spec now carries the full Spec Kit
  spec → plan → tasks trio. Both files state up front that they are
  retroactive and defer to the originals under
  `docs/plans/2026-03-08-monorepo-conversion*` for historical
  sequencing per Article VIII of the constitution. The spec index
  (`docs/spec/README.md`) gained inline `(plan, tasks)` links on the
  001 row and a clarifying line in *Conventions* explaining when a
  retroactive trio is reconstructed for parity.
- `apps/web-e2e` Added three more smoke spec files closing the
  remaining admin-by-id and client / page-by-id gaps not covered by
  the earlier collection-level specs:
  `api/admin-by-id.spec.ts` (47 — admin per-`[id]` REST routes
  across categories, clients, collections (+ items helper), comments,
  companies, featured-items, items (+ history / review / full
  import), notifications read receipt, reports, roles (+ permissions
  sub-route), sponsor-ads (+ approve / cancel / reject), tags, users
  + settings POST), `api/items-engagement-and-favorites.spec.ts`
  (11 — public `/api/items/engagement` 4 cases including
  missing-slugs, empty-slugs, unknown-slugs, and >200-slugs guard +
  auth-gated comment-by-id PUT / DELETE, vote toggle / clear, and
  favorites GET / POST + `/favorites/[itemSlug]` DELETE),
  `public/admin-by-id-pages-protected.spec.ts` (18 — admin per-id
  page routes `/admin/clients/[id]`, `/admin/surveys/[slug]/{edit,
  preview,responses}`, `/admin/auth/signin`, plus `/client/**`
  authenticated owner pages: dashboard, profile/[username],
  settings (basic-info / billing / location / portfolio /
  theme-colors / submissions/trash), security, sponsorships,
  submissions, submissions/trash). Same no-5xx contract as the rest
  of the smoke layer. `E2E-TESTS.md` updated with all three entries
  and the continual-improvement headline total annotation.
- `apps/web-e2e` Added five more page-route smoke specs closing the
  remaining gaps in the public + protected page surface:
  `public/pricing-success.spec.ts` (2 — `/pricing/success` with and
  without checkout query params), `public/listing-paginated.spec.ts`
  (6 — `/discover/[page]` with a high page number,
  `/collections/paging[/page]`, `/tags/paging[/page]`),
  `public/legacy-routing.spec.ts` (5 — legacy nested catch-alls
  `/categories/category/[...categorie]`, `/tags/tag/[...tags]`, and
  the `(listing)` group's `/tags/[...tag]`),
  `public/item-survey-public.spec.ts` (2 — public per-item survey
  response page `/items/[slug]/surveys/[surveySlug]` for unknown
  slugs), `public/dashboard-surveys-protected.spec.ts` (3 — owner
  flow `/dashboard/items/[itemId]/surveys[/preview|/responses]`
  redirect-or-404 contract). Same no-5xx contract as the rest of the
  smoke layer. `E2E-TESTS.md` updated with all five entries and the
  continual-improvement headline total annotation.
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
