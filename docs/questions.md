---
id: questions
title: Open Questions & Chosen Defaults
sidebar_label: Open Questions
sidebar_position: 98
---

# Open Questions & Chosen Defaults

This page collects **open questions** raised by docs, specs, plans, or
agent runs that need maintainer review. Per Article IV of the
[constitution](https://github.com/ever-works/directory-web-template/blob/develop/.specify/memory/constitution.md), agents must not
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

## Spec 061 — Fast, cached directory pages

### Q-061a Send only the message namespaces client components use

- **Context.** Every page embeds the whole `messages/<locale>.json` for
  `NextIntlClientProvider` (~200 KB of a ~350 KB item page, in the HTML and again in
  the RSC payload). That is most of each cached page's memory and transfer.
- **Options.**
  - Keep sending everything.
  - Pass only the namespaces client components use (needs an inventory of
    `useTranslations` calls in client components, and a guard so it stays complete).
- **Default.** **Keep sending everything** in Spec 061; trimming is a follow-up.
- **Owner.** Maintainers.
- **Status.** open

### Q-061b Category / tag / collection index grids stay per request

- **Context.** `/categories`, `/tags`, `/tags/paging`, `/collections` and
  `/collections/paging` render grids that read `useSearchParams()` without a Suspense
  boundary, which a cached (static) render cannot do.
- **Options.**
  - Pin them to `force-dynamic` (as before Spec 061).
  - Move their query reading to `useCurrentSearch()` and cache them.
- **Default.** **Pin them to `force-dynamic`**; caching them is a follow-up.
- **Owner.** Maintainers.
- **Status.** open

### Q-061c Runtime page cache: memory only, 64 MB

- **Context.** With public pages cached, a 4,000-item, 21-locale directory has ~86,000
  cacheable pages, each counted as ~0.65 MB (measured ~0.9 MB of heap); Next.js writes
  them all to disk by default.
- **Options.**
  - Disk (Next.js default): unbounded growth of the pod filesystem.
  - Memory only, LRU-bounded; a CDN in front holds the long tail.
- **Default.** **Memory only, `NEXT_CACHE_MAX_MEMORY_MB=64`** (under ~90 MB of heap; sites
  on 2 GiB pods were OOM-killed); `NEXT_ISR_FLUSH_TO_DISK=true` (read at server start by
  `apps/web/cache-handler.cjs`) restores disk writes. Optimized images keep Next's disk cache.
- **Owner.** Maintainers.
- **Status.** open

### Q-061d The tag page sends the whole catalogue

- **Context.** `/tags/<tag>` passes every item to the page (6.3 MB of HTML on a 4,000-item
  directory) because its tag filter is a client-side multi-select over those items:
  deselecting the tag or adding another must show items outside the first tag.
- **Options.**
  - Keep it (cached since Spec 061: a hit is fast, a miss renders ~1 s).
  - Make the tag page URL-driven like categories (Spec 020): server-side filter and
    slice, filter changes navigate to filtered URLs.
- **Default.** **Keep it** in Spec 061.
- **Owner.** Maintainers.
- **Status.** open

### Q-061e Active-link state on the cached listing twins

- **Context.** Plain home / discover / category URLs are served by cached twin routes
  through rewrites. The server renders them with the internal path, so components that
  derive state from `usePathname()` (header active link) render for that path and differ
  from the browser until the first client navigation.
- **Options.**
  - Accept it.
  - Derive active states after mount, or from the route params instead of the pathname.
- **Default.** **Accept it** in Spec 061.
- **Owner.** Maintainers.
- **Status.** open

### Q-061f Tenant comments in shared cached item pages

- **Context.** Cached item pages embed comments (and the Product JSON-LD
  `aggregateRating`) only while the `tenant` table has exactly one row, active (and equal
  to `TENANT_ID` when that is set). After a second tenant row is inserted, pages cached
  before can serve the first tenant's public comments for up to 600 s at the origin,
  plus the CDN's `s-maxage`. The insert marks item pages stale when Next can revalidate,
  which it cannot inside a render. `TENANT_ID` is for genuinely single-tenant
  deployments: it overrides host routing for anonymous requests, so host-routed
  multi-tenant deployments must not set it, and it never makes shared HTML carry one
  tenant's comments while other tenants exist.
- **Options.**
  - Accept the bounded window (spec R4).
  - Keep tenant-scoped comments out of shared HTML always: no window, but no
    server-rendered comments or `aggregateRating` for single-tenant deployments either.
  - Queue the invalidation and run it from a request context that can revalidate.
  - Make the page cache tenant-aware (one cached copy per tenant host), so multi-tenant
    deployments get server-rendered comments too.
- **Default.** **Accept the bounded window**; multi-tenant deployments get comments from
  the API until the page cache is tenant-aware.
- **Owner.** Maintainers.
- **Status.** open

---

## Spec 060 — LemonSqueezy webhook integrity

### Q-060a Cross-pod webhook de-duplication

- **Context.** Redelivered LemonSqueezy events are de-duplicated per pod only
  (an in-memory set); subscription rows are idempotent on (provider, subscription id),
  but the order-created email can repeat if a redelivery reaches another pod.
- **Options.**
  - Keep the per-pod set.
  - Add a table of processed event keys (needs a migration).
- **Default.** **Keep the per-pod set** until a migration is acceptable.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-060b A plan subscription moved to a variant that is not a plan variant

- **Context.** The plan comes from the paid variant (spec 060 R9). If an existing plan subscription is
  switched to a variant that is not configured for any plan (a sponsor-ad variant, or one missing from the
  configuration after an env change), its update event cannot say which plan it now grants.
  `POST /api/lemonsqueezy/update-plan` accepts any variant id and does not check that the subscription
  belongs to the caller.
- **Options.**
  - Keep the stored plan and update only the status and dates.
  - Downgrade the row to `free` (a configuration mistake would then downgrade paying customers).
  - Restrict `update-plan` to configured plan variants and to the caller's own subscription.
- **Default.** **Keep the stored plan and update only status and dates**, and restrict `update-plan` and
  `update` to configured plan variants (spec 060 R12; the owner check is #1114). Only a dashboard change
  can still move a plan subscription to another variant.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-060c OAuth links made before links were bound to an address

- **Context.** The LemonSqueezy ownership check now counts an `oauth` / `oidc` link only when its
  `accounts.email` is the user's address, and `events.signIn` records the address the provider proved
  (`lib/auth/oauth-link-email.ts`). Links written before have no address. They used to count as proof, which
  let an OAuth-only user change their address to someone else's, link a second provider of their own and
  then manage that person's LemonSqueezy subscriptions (Greptile on #1153).
- **Options.**
  - Backfill empty rows from `users.email` (cannot tell an address changed before the fix from one the
    provider proved, so it would keep the gap open for those users).
  - Backfill OIDC rows from the stored `id_token`'s `email` / `email_verified` claims (covers Google, not
    GitHub, and reads a token whose signature is not checked again).
  - No backfill: an empty row proves nothing; the next sign-in through that provider records its address, and
    the user can verify the address by email meanwhile.
- **Default.** **No backfill, and forget what is there.** Migration `0045_unbind_oauth_link_emails` clears
  `accounts.email` on every OAuth / OIDC row: the only addresses on those rows were copied from `users.email`
  by `updateUser` (#1123), not proved by a provider, and could be an address the user set but never proved.
  Ever Works has no real users yet; a user hit by it gets the 403 `EMAIL_NOT_VERIFIED`, whose message names
  both ways out.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-060d Providers that do not say whether the address is verified

- **Context.** A link's address is recorded unless the profile says it is not verified (`email_verified:
  false`, or Google's older `verified_email: false`). GitHub's profile carries no such claim (Auth.js picks the
  primary email), and Microsoft Entra ID's `email` claim is not verified by Microsoft.
- **Options.** Trust every configured provider's address; keep a per-provider allowlist of providers whose
  address counts; for GitHub, read `/user/emails` and record only a verified primary address.
- **Default.** **Trust every configured provider**, as before this change. Revisit before enabling a provider
  whose email claim is user-editable (Entra ID multi-tenant apps).
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-060e What the LemonSqueezy subscription amount means

- **Context.** Subscription events carry no price, so the webhook reads `first_subscription_item.price_id` from
  the Prices API: `unit_price` (cents) and the renewal period. Prices carry no currency (it is the store's), so
  a new row is stored as `usd` until the first paid invoice writes the charged currency (#1152); the amount
  itself is right in any currency because LemonSqueezy uses cents everywhere. `unit_price` is the list price per
  period: discounts and tax are not in it, and usage-based or tiered prices store no amount.
- **Options.** List price per period (now); read the store's currency on create (one more API call per new
  subscription); take the amount from the invoices instead.
- **Default.** **List price per period, currency from the first invoice.** The invoice amounts (`amountDue`,
  `amountPaid`) already record what was charged. When the Prices API cannot be read, a monthly / yearly variant
  of `LEMONSQUEEZY_CONFIG` still sets the period and the amount stays as it was.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 009 — Admin dashboard

### Q-009a Report retries that leave no history row

- **Context.** `PUT /api/admin/reports/{id}` runs the moderation action before it saves the report. A retry
  after a failed save finishes the save without acting twice, using the `moderation_history` rows this report
  wrote as proof (`lib/services/report-moderation.ts`). Two cases leave no row: `banUser` / `suspendUser` change
  the user and then write the history row in two statements (if the second fails the retry answers 409
  `ALREADY_BANNED`), and `removeContent` writes no row for content whose owner has no client profile (the retry
  answers 409 `NOT_FOUND`).
- **Options.** Write the status change and the history row in one transaction; give `moderation_history` a
  nullable user so ownerless removals are recorded; treat any `ALREADY_*` or `NOT_FOUND` for the same
  resolution as done (would also accept a ban made by another report, or an item that is only unreadable, as
  this report's doing).
- **Default.** **Keep the 409** for both. The admin sees the message and can save the report with another
  resolution; the transaction and a nullable history user are the follow-ups.
- **Owner.** Template maintainers.
- **Status.** `open`.

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
  [`docs/plugins/admin-roles-query-spec.md`](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/admin-roles-query-spec.md)).
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

## Spec 019 — CDN-Cacheable Public Surface with Pluggable Locale Detection

### Q-019a `server-redirect` value in YAML

- **Context.** `settings.i18n.locale_detection` accepts
  `client-banner` (default) and `none`. Should it also accept
  `server-redirect`?
- **Options.**
    - **Env var only.** `LOCALE_DETECTION_MODE=server-redirect` is
      the single switch. YAML stays focused on client-side concerns.
    - YAML accepts `server-redirect` too. Operators can set it from
      the data repo without touching env vars; middleware reads YAML
      on every request.
- **Default.** **Env var only.** Middleware needs to know at edge
  time, before any YAML is loaded; an env var is the cleaner shape.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-019b Localized banner copy

- **Context.** The locale-suggestion banner currently shows English
  copy (`"This page is also available in <NativeName>"`). Should it
  be localized to the _current_ page locale?
- **Options.**
    - **Stay English.** The banner is by definition shown when the
      visitor's preferred locale doesn't match the current page; the
      visitor likely understands English well enough to read a one-line
      suggestion, and the actionable CTA ("Switch to Français?") uses
      the native name.
    - Localize via `messages/<locale>.json`. Adds 21 new keys per
      locale and keeps the banner copy in the visitor's _current_ page
      locale.
- **Default.** **Stay English in v1**, revisit when there's a
  user complaint.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 023 — AI Chat for Directory Visitors

### Q-023a Default model

- **Context.** The chat is OpenAI-compatible by design but needs a
  sensible default model so a fresh template that opts in works
  without a model-selection UI.
- **Options.**
    - **`openai/gpt-4o-mini` via OpenRouter.** Cheap, fast, broadly
      multilingual; OpenRouter is the same gateway the Ever Works
      platform uses by default.
    - `anthropic/claude-3-5-haiku` via OpenRouter. Better quality on
      long context; slightly higher cost; same gateway.
- **Default.** **`openai/gpt-4o-mini` via OpenRouter.**
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-023b Should v1 allow chat-driven mutations?

- **Context.** The chat could navigate the visitor to a submission
  form _and_ fill it in / submit it on their behalf via tool calls.
  Mutations multiply the abuse surface and prompt-injection blast
  radius.
- **Options.**
    - **Read-only + navigate.** Tools fetch data and return a route
      to the visitor; the visitor confirms by clicking.
    - Read + write. Tools can also call into existing
      submit/follow/favourite repositories with the visitor's
      session.
- **Default.** **Read-only + navigate.** Re-evaluate once the
  read-only tools have been used in anger.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-023e Test runner for `plugin-ai-chat` (and possibly the wider repo)

- **Context.** The repo has no JS test framework today —
  CLAUDE.md §4 says _"Treat `pnpm lint`, `pnpm tsc --noEmit`,
  and `pnpm build` as the main 'test suite' (there is currently
  no Jest/Vitest setup)."_ But for `plugin-ai-chat` we want
  real unit tests of the Zod schema, the tools, and the agent's
  scenario filter — typecheck alone can't catch a wrongly-named
  scenario or a missing `requiresAuth` flag.
- **Options.**
    - **Add `vitest` to `packages/plugin-ai-chat` only.** Small
      blast radius; doesn't commit the whole repo. Other packages
      that want it later opt in independently.
    - Add `vitest` to the repo root + a `vitest.workspace.ts`.
      Bigger change; would also need a separate spec since it
      affects every package, including `apps/web`.
    - Skip unit tests entirely; lean on Playwright e2e (T-013)
      for coverage.
- **Default.** **Add `vitest` to `plugin-ai-chat` only**
  (T-002b). The pure-TS schema + tool logic is exactly where
  unit tests pay back the most; Playwright is good enough for
  the rest.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-023d Slot IDs for chat surfaces

- **Context.** Plan §4's manifest stub uses
  `layout.global.overlay`, `hero.takeover`,
  `layout.sidebar.tab`. None of these exist in
  `packages/plugin-sdk/src/slots.ts` — the canonical `SLOT_IDS`
  array currently covers header / footer / item-detail /
  admin / client-dashboard slots only. The SDK file notes:
  _"Slot ids are stable; renaming a slot is a breaking change.
  New slot ids land via a small spec."_
- **Options.**
    - **Add three new SLOT_IDS** (`chat.launcher.overlay`,
      `home.hero.takeover`, `layout.sidebar.tab`) to
      `packages/plugin-sdk/src/slots.ts` as a coordinated
      sub-task of T-001, called out in this spec since it is
      materially part of the chat feature surface.
    - Skip the slot system entirely for v1: mount
      `<ChatLauncher>` directly from
      `apps/web/app/[locale]/layout.tsx` behind the
      `aiChat.enabled` config gate. Lose the
      plugin-discoverability story; gain simplicity.
- **Default.** **Add three new SLOT_IDS** — preserves the
  plugin-first principle (Article I) and keeps the
  manifest stub honest. Adding new slot IDs lands in the
  same PR series as T-001 / T-006, with the diff to
  `slots.ts` documented in the relevant task's commit.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-023c Where do scenario openers and the system prompt live?

- **Context.** Strings need to translate via the existing pipeline
  (`next-intl` + Crowdin per Spec 014) but they're conceptually
  part of the plugin package.
- **Options.**
    - **`apps/web/messages/<locale>.json` under `AI_CHAT_*`.** The
      plugin package reads them through `next-intl` at call time;
      Crowdin/translators see them like any other UI string.
    - Inline `.ts` constants under
      `packages/plugin-ai-chat/src/prompts/<locale>.ts`. Keeps the
      plugin self-contained but bypasses the translation pipeline.
- **Default.** **`apps/web/messages/<locale>.json` under
  `AI_CHAT_*`.**
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 044 — Public payment config served at runtime

### Q-044a Should `[locale]/layout.tsx` also pass the public payment config as a server prop?

- **Context.** Spec 044 serves the browser-safe payment config from
  `GET /api/payment/public-config` and a React Query hook whose
  `initialData` is the build-time env. On platform-deployed k8s builds the
  bundle has no inlined `NEXT_PUBLIC_*`, so the first client render sees an
  empty config and the UI updates once the fetch settles (one round-trip;
  `usePaymentAvailability` hides the flip by keeping its SSR default until
  then). Threading the server-computed config through
  `[locale]/layout.tsx` → `Providers` would remove that round-trip and make
  SSR + first client render identical in every deployment mode.
- **Options.**
    - **Route + hook only (current).** One tiny fetch per page load, same
      pattern as `useStripeProducts`, and it also serves modals/hooks rendered
      outside the locale tree (root `app/layout.tsx`).
    - Route + hook **and** a server prop seeded into the hook's `initialData`
      via `Providers`. Zero-request first paint; slightly more plumbing and two
      sources to keep consistent.
- **Default.** **Route + hook only.** Revisit if the post-fetch re-render is
  visible in the field.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 046 — Provider-aware pricing configuration in works.yml

### Q-046a Should `provider: manual` render a distinct pricing surface?

- **Context.** EW-131 asks `works.yml` to accept `provider: manual` —
  "show the prices, take payment elsewhere". Spec 046 accepts the value and
  suppresses the in-site checkout: `handleCheckout()` returns before any
  gateway branch and logs the reason. Which cards render is unchanged — still
  the LIVE / DEMO logic of
  [spec 044](https://github.com/ever-works/directory-web-template/blob/develop/docs/spec/044-public-payment-config/spec.md). That is safe but
  silent: a manual-checkout operator arguably wants a "Contact us" call to
  action on the paid cards rather than a button that does nothing.
- **Options.**
    - **Suppress the checkout and render the existing cards (current).** One
      guard in the pricing flow, no new strings, no new localisation work.
    - Add a manual-checkout mode: a per-plan contact URL in `works.yml` and a
      dedicated CTA on the card. Needs new i18n keys in all locales and a new
      branch in `use-pricing-section.ts`.
- **Default.** **Suppress the checkout, keep the existing cards.** The value
  is accepted and documented now; the UX affordance can land on its own ticket
  once someone actually runs manual checkout.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-046b Should a malformed `pricing:` block ever be fatal?

- **Context.** Spec 046 logs each problem and falls back to the built-in
  plans. `getConfig()` runs on every render, so throwing would take a whole
  directory offline over a typo in an optional block.
- **Options.**
    - **Warn and fall back (current).** The site stays up; the operator sees
      `[CONTENT] Invalid "pricing" section …` with one line per field.
    - Fail the build (not the request) when the data repository is cloned at
      build time, so the typo is caught before deploy.
- **Default.** **Warn and fall back.** Revisit if operators report missing
  the log line; a build-time check is additive and can land later.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 047 — Markdown mirrors reachable (private-folder routing fix)

## Spec 051 — Admin billing issues

### Q-051-1 Should a refund carry a provider-side idempotency key?

- **Context.** `refundBillingIssue()` takes an atomic claim on the issue row
  (`billing_issues.refund_claimed_at`, a single conditional UPDATE) before it
  calls `PaymentProviderInterface.refundPayment`, and deliberately does NOT hand
  the claim back when the provider call throws — a lost response and a clean
  rejection are indistinguishable, so releasing it would let a retry submit a
  second refund for a charge that may already be refunded. The claim instead
  expires after `REFUND_CLAIM_TTL_MS` (5 minutes) so a crashed request cannot
  strand the issue forever. That expiry is the one remaining theoretical window:
  a provider call still in flight when the TTL elapses could be joined by a
  second claim, and the row-level `onlyWithClaim` guard on the write can stop the
  second request from _recording_ over the first, but not from _placing_ the call.
- **Options.**
    - **Leave it (current).** The window requires a single provider HTTP request to
      still be open five minutes after it started — longer than every adapter's own
      SDK timeout and than the serverless function budget the template targets — and
      it needs a second admin to press refund inside exactly that window. The cost
      of the alternative reading (never reclaim) is an issue permanently locked by
      any crashed request.
    - **Add an idempotency key to the provider seam.** Widen
      `PaymentProviderInterface.refundPayment(paymentId, amount?)` with an optional
      idempotency key derived from the billing issue, and thread it through the
      Stripe, Polar, Solidgate and LemonSqueezy adapters plus `payment-service.ts`.
      Stripe and Polar both honour one; this closes the window completely rather
      than narrowing it.
    - Lengthen `REFUND_CLAIM_TTL_MS`. Cheapest, and strictly worse on the other
      axis: it narrows the duplicate window only by widening the stranded window.
- **Default.** **Leave it, and fix it properly in the payment-provider spec.**
  Spec 051 states it adds no new payment abstraction, and an idempotency
  parameter is a change to the shared provider interface and all four adapters —
  it belongs with the seam it changes, not inside an admin feature.

## Spec 053 — Email two-factor authentication

### Q-053a Should admin `users` rows be able to enable email 2FA as well?

- **Context.** Spec 047 stores `two_factor_enabled`, the failed-attempt
  counter and the lock timestamp on `client_profiles`, and surfaces the
  toggle on `/client/settings/security`. An **admin** signs in through the
  same credentials provider but has a `users` row with an admin role and no
  client profile, so today the 2FA branch in
  `lib/auth/credentials.ts` simply never fires for them. Admins are the
  higher-value target, so the asymmetry is worth an explicit decision rather
  than an accident of where the column happened to live.
- **Options.**
    - **Client profiles only (current).** One storage location, one settings
      surface, no schema change to `users`. Admin accounts in this template are
      few and typically operator-managed.
    - Mirror the three columns onto `users`, add an admin-side settings card,
      and branch on whichever row exists. Broader protection, but it doubles the
      storage location for the same concept and needs a second settings surface
      under `/admin`.
    - Move the columns to `users` for **everyone** and read through the account
      rather than the profile. Cleanest long-term shape, but it is a migration of
      a column that already ships on `client_profiles` and is read by three admin
      query projections and the admin advanced search.
- **Default.** **Client profiles only.** Revisit together with any future
  second factor (TOTP / WebAuthn), which would want a single `user`-level
  factor registry anyway — that is the right moment to pay the migration.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

## Spec 052 — Admin payment reports and export

### Q-052-1 Should the payment report also export PDF?

- **Context.** [EW-117](https://evertech.atlassian.net/browse/EW-117) asks for
  "tools to filter and export reports (CSV, PDF, etc.)". `apps/web` has no PDF
  generation dependency — `exceljs` and `papaparse` are the only document
  libraries in `apps/web/package.json`, and both were already there for the item
  export. Article VII (reuse before build) and `AGENTS.md` §14 ("ask the user
  first before adding new dependencies") both point away from pulling a PDF
  engine in as a side effect of this feature.
- **Options.**
    - **CSV + XLSX only (current).** No new dependency. XLSX already covers the
      "hand it to a stakeholder" case, and a spreadsheet is more useful than a PDF
      for revenue numbers because the recipient can re-sort and sum it.
    - Add a client-side PDF library (`jspdf` + `jspdf-autotable`, ~350 KB). Renders
      in the browser from the rows already loaded, so no server cost — but only the
      current page of rows, not the full filtered set.
    - Add a server-side renderer (`@react-pdf/renderer`, or headless Chromium).
      Full fidelity over the whole filtered set; a heavy dependency, and headless
      Chromium is not viable in the template's serverless targets.
- **Default.** **CSV + XLSX only.** `SUPPORTED_EXPORT_FORMATS` in
  `apps/web/lib/services/payment-report-export.service.ts` is the single place to
  extend, and `?format=pdf` already returns a 400 naming the supported formats
  rather than failing obscurely. Revisit if an operator asks for a print-ready
  statement rather than a data extract.

### Q-053b Should enabling email 2FA require a verified email address?

- **Context.** Spec 047 lets any credentials account switch on email 2FA. If
  the address on file is wrong or unreachable, the member locks themselves
  out at their next sign-in. The obvious guard — refuse to enable until
  `client_profiles.email_verified` is `true` — is unusable today because that
  column defaults to `false` and the sign-up flow never flips it, so the
  guard would refuse essentially every account on a default deployment.
- **Options.**
    - **Allow, and guard only the unrecoverable case (current).** Enabling is
      refused with `503` `EMAIL_NOT_CONFIGURED` when the deployment has no mail
      provider at all — the case where a code could _never_ arrive — and the
      operator unlock is documented in
      [Email Two-Factor Authentication](authentication/two-factor-auth.md).
    - Require `email_verified`, and make the sign-up flow actually set it.
      Correct, but it is a change to registration and to every existing row,
      which belongs in its own spec.
    - Confirm the factor at enable time: send a code and require it before the
      switch sticks. Proves deliverability without touching registration, at the
      cost of an extra route and an extra UI step.
- **Default.** **Allow, guarding only the unrecoverable case.** Revisit
  together with any work that makes email verification mandatory at sign-up;
  the enable-time confirmation is the natural follow-up if lockouts show up in
  the field.
- **Owner.** Template maintainers.
- **Status.** `open`.

---

### Q-053c How should a session-free `/api` route resolve the tenant on a host-routed multi-tenant deployment?

- **Context.** `POST /api/auth/2fa/resend` runs mid-login, so it has no
  session, and Next middleware does not run for `/api` — the
  `x-tenant-domain` header the middleware injects is therefore absent and
  `getTenantId()` falls through to `TENANT_ID` / the default tenant. On a
  deployment that routes tenants by host, a resend for a member outside that
  tenant finds no account and (correctly, per the enumeration-safe envelope)
  reports nothing. This is a property of every session-free `/api` route in
  the repo, not of this one; the primary issuing path, the sign-in server
  action, runs behind middleware and is tenant-correct.
- **Options.**
    - **Leave it (current).** The sign-in flow always works; only the "send a
      new code" convenience is affected, and only on host-routed multi-tenant
      deployments.
    - Resolve the tenant from the request's own `Host` header inside the route
      and thread it into the account / profile lookups. Needs a tenant argument
      on `getClientAccountByEmail`, `verifyClientPassword` and
      `getClientProfileByUserId`, which every other caller shares.
    - Make the resend button re-submit the sign-in server action without a
      code, so the issuing path is always the tenant-correct one, and keep the
      route for programmatic callers.
- **Default.** ~~Leave it~~ — **resolved at the resolver**, which turned out
  to be a fourth option none of the three above described: `getTenantId()`'s
  header step now falls back to the request's own `Host` when
  `x-tenant-domain` is absent. That is the same value `proxy.ts` copies into
  the header, so it trusts nothing new; it changes no signature, so the shared
  helpers keep their callers; and it fixes every session-free `/api` route at
  once, including a POST straight to `/api/auth/callback/credentials`. It can
  only ever select an **existing** `tenant` row, so an unrecognised host falls
  through to `TENANT_ID` / the default tenant exactly as before.
- **Owner.** Template maintainers.
- **Status.** `resolved` (PR #1048).

---

## How to add a question

### Q-047a Should the internal mirror segment stay reachable as a public URL?

- **Context.** The `.md` mirrors are served by route handlers that used to
  live in `_`-prefixed _private_ folders, which the App Router excludes from
  routing — so every mirror URL 404'd. Renaming the segment (`_md` → `md`,
  `_static-md` → `static-md`) is what makes them routable at all, and it also
  makes the internal paths directly requestable: measured `/items/<slug>/md`
  and `/static-md/about` → `200 text/markdown`, and `/en/items/<slug>/md` →
  `307` to the unprefixed form (`localePrefix: 'as-needed'`).
- **Options.**
    - **Leave them reachable.** The handlers already send
      `X-Robots-Tag: noindex`, they are absent from the sitemap and nothing
      links to them, so the exposure is a duplicate of content already public
      at the `.md` URL.
    - Add a `Disallow: /*/md$` + `/*/static-md/` pair to `robots.ts`, or gate
      the handlers on an internal header set by the rewrite.
- **Default.** **Leave them reachable.** `noindex` already answers the only
  concern (crawlers indexing the mirror instead of the canonical HTML), and a
  header gate would make the handlers untestable except through the rewrite.
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-047b Should the doubled origin in the item / CMS-page `text/markdown` alternates be fixed here?

- **Context.** `getLocalizedUrl()` already returns an absolute URL, so
  `` `${appUrl}${getLocalizedUrl(…)}.md` `` emits
  `http://hosthttp://host/…md`. PR #1046 fixes the four static info pages
  (`/about`, `/cookies`, `/privacy-policy`, `/terms-of-service`); the same
  doubling remains on `app/[locale]/items/[slug]/page.tsx` and
  `app/[locale]/pages/[slug]/page.tsx`.
- **Options.**
    - **Leave to the owning PR / a follow-up.** Spec 047 is about
      reachability; touching the same four-file blast radius as PR #1046 while
      it is open invites a conflict, and the two remaining pages are the same
      one-line change.
    - Fix all six in this PR.
- **Default.** **Leave to a follow-up**, tracked here. Spec 047's e2e guard
  deliberately checks alternate-href _resolution_ on `/help` and `/pricing`
  only — the two pages whose href is already origin-correct — so it neither
  duplicates nor collides with `md-alternate-link-absolute-url.spec.ts`.
- **Outcome.** Answered by [spec 048](https://github.com/ever-works/directory-web-template/blob/develop/docs/spec/048-legal-pages-frontmatter-seo/spec.md)
  (PR #1045), which fixed the doubling on `about`, `cookies`,
  `items/[slug]` and `pages/[slug]` alongside the two legal routes. Nothing
  is left for this spec to do here.
- **Owner.** Template maintainers.
- **Status.** `answered`.

---

## Spec 048 — Legal page SEO metadata from Markdown frontmatter

### Q-048a Which routes adopt `buildStaticPageMetadata()`

- **Context.** `apps/web/lib/seo/static-page-metadata.ts` resolves a static
  info page's `<title>` / `<meta name="description">` from the data
  repository's Markdown frontmatter with an i18n fallback. EW-17 scoped the
  change to `/terms-of-service` and `/privacy-policy`, but `/about` and
  `/cookies` are the same shape (dedicated route, `pages/<slug>.<locale>.md`
  body, frontmatter title in the `<h1>` and in the `.md` mirror, i18n-only
  `generateMetadata`) and have the same drift.
- **Options.**
    - **Legal routes now, `about` / `cookies` in a follow-up.** Keeps the
      ticket's diff reviewable; the helper is already generic, so the follow-up
      is a four-line change per route.
    - Migrate all four in one PR. Removes the inconsistency immediately but
      widens a small ticket into every static info page, and `/about` is
      asserted by more specs (`about.spec.ts`,
      `each-page-document-title-length.spec.ts`).
- **Default.** **Legal routes now, `about` / `cookies` in a follow-up.**
- **Owner.** Template maintainers.
- **Status.** `open`.

### Q-048b `.md` vs `.mdx` for data-repository pages

- **Context.** EW-17 asks for `terms-of-service.mdx` / `privacy-policy.mdx`.
  The template's reader (`fetchPageContent`) globs `pages/<slug>.<locale>.md`
  and the content is rendered by `next-mdx-remote`, so the files already get
  full MDX rendering under a `.md` extension; the demo data repository ships
  them as `.md`.
- **Options.**
    - **Keep `.md`.** No behaviour difference, no data-repository migration, and
      the extension every existing Work and the `pages/` docs already use.
    - Accept both extensions in `fetchPageContent` and document `.mdx` as
      preferred. Matches the ticket's wording; costs an extra stat per lookup
      and a docs/data migration for no rendering gain.
- **Default.** **Keep `.md`** — the requirement is "MDX rendering with
  frontmatter", which is satisfied.

## Spec 049 — Visitor-facing FAQ page

### Q-049a Should the FAQ render as an accordion rather than plain prose?

- **Context.** Spec 046 renders `pages/faq.<locale>.md` through the shared
  `MDX` component, exactly like `/about`, `/cookies` and the legal pages, so a
  long FAQ is a long scrolling page. Directory Kit (the reference the Jira
  ticket names) uses collapsible question rows. An accordion would shorten the
  page and make scanning easier, but it needs a client component, and the
  answers must stay in the server-rendered HTML for the `FAQPage` rich result
  and the `.md` mirror to keep working.
- **Options.**
    - **Plain prose (current).** Zero client JS, identical to every other static
      info page, and the operator controls the look through the data repo's
      Markdown. Content and structured data come from exactly one source.
    - A client accordion that hydrates over the same server-rendered headings
      and answers (`<details>`/`<summary>` would even do it without JS). Nicer
      for long FAQs; a second rendering path to keep consistent with the parser's
      heading rules, and a first client component on an otherwise static page.
- **Default.** **Plain prose.** Revisit if a Work ships an FAQ long enough that
  scanning it becomes the complaint. `<details>`-based progressive enhancement
  is the cheapest upgrade path and would not break the parser or the mirror.

---

## Spec 054 — Per-site git token

### Q-054a Data repos outside the platform's managed orgs

- **Context.** The Ever Works broker mints tokens only for data repos in its
  managed orgs (`ever-works`, `ever-works-cloud`) that it provisioned for the
  Work. A site whose data repo is in a member's own account gets no broker
  variables and keeps using `GH_TOKEN`.
- **Options.**
  - Keep `GH_TOKEN` for those sites (current).
  - Serve them from the member's own GitHub App installation, narrowed the same
    way, once the platform can prove the installation is the member's.
- **Default.** **Keep `GH_TOKEN`.** Nothing changes for those sites; the
  template already supports the broker the moment the platform sends it.
- **Owner.** Maintainers (platform side).
- **Status.** open

### Q-054b What a site does when its broker secret is rotated

- **Context.** The site secret is derived from a platform key; rotating the key
  changes every site's secret, and a site only learns its new one at its next
  deploy.
- **Options.**
  - Redeploy every site after a rotation (current, documented in the platform
    runbook).
  - Let the broker accept the previous key for a grace period.
- **Default.** **Redeploy after rotation.** Until then the broker answers 401,
  the site keeps a still-valid cached token, then falls back to `GH_TOKEN`.
- **Owner.** Maintainers (platform side).
- **Status.** open

---

## Spec 055 — Demo banner

### Q-055a The demo banner as a plugin slot

- **Context.** The constitution asks for new UI surface through a plugin slot.
  The slot runtime has no host integration yet (Spec 002 / T-004), and there is
  no slot above the header, so spec 055 renders the banner in
  `ConditionalLayout` (see its Complexity Tracking).
- **Options.**
  - Keep it in the layout, switched only by the deployment's `NEXT_PUBLIC_DEMO` (current).
  - When T-004 lands, add a `header.before` slot and move the banner to a
    `packages/plugin-demo-banner` plugin, so admins can disable or replace it.
- **Default.** **Move it with T-004.** Until then it stays in the layout; its
  only switch is the runtime demo flag.
- **Owner.** Maintainers.
- **Status.** open

### Q-055b Demo banner copy for visitors who are not signed in

- **Context.** The strip says "You are using a demo account", the line
  demo.gauzy.co uses. On demo.ever.works most visitors browse without signing in.
- **Options.**
  - Keep the same line on every Ever demo (current, as the owner asked).
  - Say "You are using a demo" for visitors without a session.
- **Default.** **Keep the same line.** The owner asked for the line demo.gauzy.co
  shows, on every demo.
- **Owner.** Owner (copy).
- **Status.** open

## How to add a question

1. Pick the next available `Q-NNN…` id under the relevant spec.
2. Use the format above.
3. Always include a **Default**; never block on a question.
4. Append a line to [`log.md`](log.md):
   `YYYY-MM-DD questions: added Q-NNN — short summary`.
