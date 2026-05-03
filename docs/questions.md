---
id: questions
title: Open Questions & Chosen Defaults
sidebar_label: Open Questions
sidebar_position: 98
---

# Open Questions & Chosen Defaults

This page collects **open questions** raised by docs, specs, plans, or
agent runs that need maintainer review. Per Article IV of the
[constitution](../.specify/memory/constitution.md), agents must not
block on unresolved questions — they should pick a sensible default,
record it here, and keep moving. Maintainers come back later to
confirm, override, or refine.

> **Format.**
> Each question is a level-3 heading with a stable anchor id of the
> form `q-NNN-short-slug`, e.g. `### Q-002a SDK package name`.
> The body has these sections:
>
> - **Context** — what gave rise to the question.
> - **Options** — bullet list of candidate answers.
> - **Default** — which option the agent picked, in **bold**.
> - **Owner** — who should review. Default: maintainers.
> - **Status** — `open`, `confirmed`, `rejected`, `superseded`.

---

## Spec 002 — Plugin Architecture

### Q-002a SDK package name

- **Context.** We need a name for the canonical plugin SDK package that
  every plugin will depend on.
- **Options.**
  - `@ever-works/plugin-sdk` — explicit; follows ecosystem
    conventions (`@stripe/stripe-sdk`, `@aws-sdk/client-*`).
  - `@ever-works/plugins` — shorter; matches the runtime package
    `@ever-works/plugin-runtime` and the `packages/plugin-*` naming.
  - `@ever-works/plugin-api` — describes the surface; less common
    convention.
- **Default.** **`@ever-works/plugin-sdk`**.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-002b Plugin-to-plugin extensions in v1

- **Context.** Should a plugin be able to expose its own slots and
  capability interfaces to other plugins, or is that v2 only?
- **Options.**
  - **Yes, minimal.** Allow re-exporting from
    `@ever-works/plugin-sdk` so a plugin can add new capabilities,
    but keep the API tiny.
  - No. Plugins consume only the SDK-defined surface in v1.
- **Default.** **Yes, minimal.**
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-002c Per-plugin config storage

- **Context.** Where do per-plugin configs live? Some adopters want
  source-of-truth in env vars; others want admin-editable configs.
- **Options.**
  - DB row + override via env vars (env wins).
  - Env vars only (admins must redeploy to change anything).
  - DB only (env vars ignored if a row exists).
- **Default.** **DB row + override via env vars.**
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 003 — Auth providers

### Q-003a Add Passkey / WebAuthn?

- **Context.** Passkeys are increasingly expected.
- **Options.**
  - Add as a built-in Auth.js provider in v1.
  - Defer to a separate spec when the Auth.js Passkey support is
    GA-stable.
- **Default.** **Defer.**
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 004 — Payment providers

### Q-004a Allow multiple active providers per checkout?

- **Context.** Some adopters want to A/B test providers or run them in
  parallel (e.g. Stripe for cards, LemonSqueezy for VAT-handled
  countries).
- **Options.**
  - **Single active provider per session.** Simpler.
  - Routing rules per country / SKU.
- **Default.** **Single active provider per session** in v1; routing
  rules in a future spec.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 005 — Internationalisation

### Q-005a Automated translation pipeline (DeepL / OpenAI)

- **Context.** Translating docs and UI strings is currently manual
  with PR-based review.
- **Options.**
  - Add a CI step that proposes machine translations on every English
    update, with human review before merge.
  - Stay manual, but maintain a translation status dashboard.
- **Default.** **Stay manual** in v1; revisit once
  `docs/internationalization/coverage.md` exists and shows real
  drift.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 006 — Git-based CMS

### Q-006a Hygraph adapter as built-in plugin?

- **Context.** Several adopters use Hygraph; an adapter could ship in
  the box.
- **Options.**
  - Ship a Hygraph plugin under `packages/plugin-content-hygraph/`
    once SDK 002 stabilises.
  - Leave as third-party.
- **Default.** **Wait until plugin SDK is stable**, then ship.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 007 — Theming

### Q-007a Logo upload from admin?

- **Context.** Admins currently set the logo via env / static assets.
- **Options.**
  - Add an admin upload form using whatever object-store integration
    is configured (S3 / Supabase Storage).
  - Defer, keep static assets.
- **Default.** **Future plugin.**
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 008 — Analytics

### Q-008a Consent banner integration

- **Context.** GDPR / CCPA compliance often requires a consent banner
  before loading analytics scripts.
- **Options.**
  - Ship a built-in cookie banner with provider gating.
  - Ship as a future plugin (`packages/plugin-consent-…/`).
- **Default.** **Future plugin.**
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 010 — E2E test coverage

### Q-010a Worker count in CI

- **Context.** Playwright runs with `workers: 2` in CI today; suite
  growth may push run-time too high.
- **Options.**
  - Keep `workers: 2`, add sharding when needed.
  - Bump to `workers: 4` and accept higher CI cost.
- **Default.** **Keep `workers: 2`** until measured wall time exceeds
  20 minutes.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-010b Should `/api/admin/roles` and `/api/admin/roles/active` carry an explicit `auth()` gate?

- **Context.** Surfaced while writing
  [`apps/web-e2e/tests/api/admin-roles-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-query.spec.ts)
  (per-source-file reference:
  [`docs/plugins/admin-roles-query-spec.md`](plugins/admin-roles-query-spec.md)).
  Every other admin-tree GET route covered by a sibling
  smoke spec calls `auth()` and short-circuits with 401
  / 403 before any repository call. The
  `apps/web/app/api/admin/roles/route.ts` GET handler
  does **not** call `auth()` and does **not** check
  `session?.user?.isAdmin` before delegating to
  `roleRepository.findAllPaginated(...)`. The same
  absence holds for the sibling
  `apps/web/app/api/admin/roles/active/route.ts` GET
  handler, which delegates to
  `roleRepository.findActive()` with no auth check at
  all. Roles include their `permissions[]` array (which
  enumerates the security boundary of the admin tree),
  so leaking this list to anonymous callers narrows the
  surface a future attacker has to enumerate. A regression
  here is "open" rather than "broken" — the existing
  `admin-protected-extra.spec.ts` smoke asserts only the
  loose `< 500` envelope, which passes both for a 200
  response (current behaviour) AND for a 401 (post-fix
  behaviour).
- **Options.**
  - **Add the same two-step gate as the sibling
    `/api/admin/roles/stats` route** —
    `if (!session?.user) return 401` followed by
    `if (!session.user.isAdmin) return 403`. The
    matching `admin-roles-query.spec.ts` smoke spec
    is invariant to this fix and stays green.
  - Add a single-step gate that returns 401 for both
    branches (matches the
    `/api/admin/clients` / `/api/admin/comments` /
    `/api/admin/companies` / `/api/admin/users` shape).
  - Add the longer-message
    `'Unauthorized. Admin access required.'` envelope
    (matches the
    `/api/admin/sponsor-ads` /
    `/api/admin/twenty-crm/config` shape).
  - Leave the route open and document the
    intentionally-public posture in a follow-up
    `apps/web/app/api/admin/roles/route.ts` JSDoc
    block.
- **Default.** **Add the two-step gate matching
  `/api/admin/roles/stats`** — uniform with the closest
  sibling route and minimal risk of widening or
  narrowing the existing client-side error-handling
  contract.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 012 — Newsletter

### Q-012a Persist subscribers in our DB?

- **Context.** Some providers (Resend, Mailchimp) own the subscriber
  list; others (e.g. Loops) require us to mirror.
- **Options.**
  - Mirror via DB row for audit and offline reads.
  - Provider as source of truth, no DB row.
- **Default.** **Mirror in DB for audit.**
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 013 — Notifications

### Q-013a Notifications source of truth

- **Context.** Novu owns the notification list, but UI offline reads
  benefit from a local mirror.
- **Options.**
  - Mirror in DB.
  - Provider as source of truth.
- **Default.** **Mirror in DB**.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 014 — Docs translation

### Q-014a Translation hosting

- **Context.** Translations currently live in repo; some teams prefer
  Crowdin / Lokalise.
- **Options.**
  - Keep in repo with PR review.
  - Move to Crowdin and sync via CI.
- **Default.** **Keep in repo.**
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 017 — Map view

### Q-017a Hero on `/map` route?

- **Context.** The dedicated `/map` route shares the same composition
  as the listing's map view-toggle, but the visitor's intent at `/map`
  is "show me the map", not "explore the homepage". Reusing the
  `(listing)` route group would inherit the homepage hero.
- **Options.**
  - Render `/map` full-bleed without a hero (current implementation).
  - Reuse the `(listing)` route group and ship the hero too.
- **Default.** **Full-bleed, no hero.** Visitors clicking the header
  Map link want to see the map immediately; the hero would push the
  map below the fold.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 018 — Performance Budget

### Q-018a Run Lighthouse on every PR or only labelled ones?

- **Context.** Lighthouse CI on every PR adds CI minutes and slows
  down feedback loops. Running it only on PRs labelled `perf-check`
  contains cost but means contributors must opt in.
- **Options.**
  - **Labelled-only (`perf-check`).** Maintainers opt in for
    perf-sensitive PRs. Nightly run on `develop` catches drift.
  - Every PR. Heavier CI bill; faster regression detection.
  - Periodic only (nightly + manual). Relies on bisecting when a
    regression is reported.
- **Default.** **Labelled-only (`perf-check`)** plus the nightly
  `develop` run. Re-evaluate once we have CI minute usage data.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-018b Where does the perf budget file live?

- **Context.** A budget file shared across `apps/**` works at the
  monorepo root; an app-specific file under `apps/web/` keeps the
  blast radius small but assumes a single app.
- **Options.**
  - `performance/budgets.json` at the monorepo root.
  - `apps/web/performance/budgets.json`.
- **Default.** **Monorepo root (`performance/budgets.json`)** —
  future apps under `apps/**` reuse the same script and config.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 015 — Spec Kit adoption

### Q-015a Automate spec coverage report

- **Context.** Each package / feature should have a spec; a script
  could enforce that.
- **Options.**
  - Author `apps/web/scripts/lint-specs.ts` that fails CI when a
    package lacks a spec.
  - Manual review.
- **Default.** **Manual for now**, automate later.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## How to add a question

1. Pick the next available `Q-NNN…` id under the relevant spec.
2. Use the format above.
3. Always include a **Default**; never block on a question.
4. Append a line to [`log.md`](log.md):
   `YYYY-MM-DD questions: added Q-NNN — short summary`.
