---
id: client-dashboard-page-object
title: E2E Client Dashboard Page Object (apps/web-e2e/page-objects/client/dashboard.page.ts)
sidebar_label: E2E Client Dashboard Page Object
sidebar_position: 422
---

# E2E Client Dashboard Page Object — `apps/web-e2e/page-objects/client/dashboard.page.ts`

Per-source-file reference for the Playwright e2e suite's
**client dashboard** driver paired with
[`apps/web-e2e/page-objects/client/dashboard.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/dashboard.page.ts).

This page is the **first per-source-file reference** the
docs tree publishes for any file under
`apps/web-e2e/page-objects/client/` — opening the
client-tree page-object docs rollout that mirrors the
seventeen-file
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
through
[`admin-tags-page-object.md`](admin-tags-page-object.md)
admin-tree rollout, and following the rollout-completion
note on
[`admin-tags-page-object.md`](admin-tags-page-object.md)
which called out the
`apps/web-e2e/page-objects/auth/` and remaining
`apps/web-e2e/page-objects/client/` subtrees as the next
rollouts to land.

The client/ page-object subtree is paired one-to-one
with routes under `apps/web/app/[locale]/client/**`, the
authenticated **client area** of the public-facing app
(distinct from the admin area at `/admin/**` — admin
docs go through the seventeen `admin-*` references —
and distinct from the public-facing pages under `/`,
`/discover`, `/items/[slug]`, etc. that the
[`public-pages-page-object.md`](public-pages-page-object.md)
through
[`item-detail-page-object.md`](item-detail-page-object.md)
fourteen public-tree references cover).

The five sibling client page objects this rollout will
publish references for in subsequent runs are
`profile.page.ts`, `settings.page.ts`,
`submissions.page.ts`, `submit.page.ts`, and
`trash.page.ts` — six total under
`apps/web-e2e/page-objects/client/`.

## At a glance

| Field | Value |
| --- | --- |
| Source path | `apps/web-e2e/page-objects/client/dashboard.page.ts` |
| Class | `ClientDashboardPage` (single named export) |
| Inherits from | [`BasePage`](base-page-object.md) (the page-object inheritance root) |
| Route under test | `/client/dashboard` (under the localised `[locale]/client/**` route tree) |
| Auth posture | **Authenticated client** required — unauthenticated callers are redirected to `/auth/signin` by the route's middleware gate |
| Pre-bound `Locator` fields | `heading`, `statsGrid`, `welcomeText` (three fields, all `.first()` strict-mode-correctness) |
| Methods | `navigate()` only — no composite primitives today; specs drive the page directly |
| Consuming specs | [`apps/web-e2e/tests/client/dashboard.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/dashboard.spec.ts) (three flows: authenticated client can access dashboard, unauthenticated user is redirected to signin, dashboard displays stats or content area) |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class ClientDashboardPage extends BasePage {
	readonly heading: Locator;
	readonly statsGrid: Locator;
	readonly welcomeText: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading', { name: /dashboard/i }).first();
		this.statsGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4').first();
		this.welcomeText = page.getByText(/welcome back/i).first();
	}

	async navigate() {
		await this.goto('/client/dashboard');
	}
}
```

## Why the class extends `BasePage`

The `extends BasePage` clause is load-bearing for three
reasons that mirror the admin / public-tree drivers:

1. **Page-route navigation via inherited `goto()`**: the
   `navigate()` method delegates to `this.goto('/client/dashboard')`
   which inherits the
   [`BasePage`](base-page-object.md)
   `goto(path: string)` posture (with the
   `waitUntil: 'domcontentloaded'` stabilisation), keeping
   the navigation contract symmetric across every page
   object in the suite. A future contributor who
   re-implements navigation here would silently desync
   from the inherited `gotoLocalized(path, locale)` that
   handles the `[locale]/client/**` route prefixing.
2. **Global `header` / `footer` / `navLinks` chrome
   surfaced through inherited composite getters**: every
   client-area page renders the same
   `<header>` / `<footer>` chrome as the public site,
   so the inherited
   [`BasePage`](base-page-object.md) `header`,
   `footer`, and `navLinks` Locators are immediately
   usable by any spec that drives this page.
3. **`waitForPageReady()` post-navigation stabiliser**:
   the inherited `waitForPageReady()` lets specs gate
   subsequent assertions on the
   `'domcontentloaded'` event, which matters for the
   client dashboard because the route is a Server
   Component that hydrates async stats panels.

## Why `heading` uses `getByRole('heading', { name: /dashboard/i })`

The `heading` field resolves to the first `<h1>` /
`<h2>` / `<h3>` etc. element on the page whose
accessible name matches the case-insensitive regex
`/dashboard/i`. Three load-bearing reasons:

1. **Locale-tolerance via case-insensitive regex**: the
   `[locale]/client/**` tree renders the heading in the
   active locale (EN / FR / ES / DE / AR / ZH per the
   monorepo's
   [`i18n` spec](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/005-i18n)).
   The English heading is "Dashboard" but a substring
   match against `/dashboard/i` survives an
   English-string change to "My Dashboard" or
   "Welcome to your Dashboard" without masking a real
   heading-rename regression. (The locale-aware
   variant for non-English-tested specs would use the
   inherited
   [`BasePage`](base-page-object.md)
   `gotoLocalized` posture.)
2. **Role-based selector preference**: per
   [Playwright's locator-priority
   guidance](https://playwright.dev/docs/locators), an
   accessible-name-based role selector is the highest-
   stability locator. A regression that demotes the
   heading to a `<div>` or removes the `role="heading"`
   would surface here as an assertion failure.
3. **`.first()` strict-mode-correctness append**: a
   future contributor who adds a second heading
   matching `/dashboard/i` (e.g., a "Sub-dashboard"
   widget heading) would otherwise trigger Playwright's
   strict-mode multi-match error. The `.first()` append
   binds this Locator to the page's primary heading.

## Why `statsGrid` uses a Tailwind-class chain selector

The `statsGrid` field resolves to the first element
matching the literal CSS class chain
`.grid.grid-cols-1.md:grid-cols-2.lg:grid-cols-4` (the
backslash-escaped colons in the source are required to
escape the Tailwind responsive prefix's `:` from the
CSS selector grammar). Three load-bearing reasons:

1. **Tailwind class-chain as a structural anchor**: the
   client dashboard renders its top-of-page stats panels
   in a 1-column-mobile / 2-column-tablet / 4-column-
   desktop responsive grid. The full class chain is
   the most direct production-source anchor available
   today (no `data-testid` is wired up), and a
   contributor who restructures the stats panels to a
   different breakpoint pattern would surface here as
   an assertion failure.
2. **`.first()` strict-mode-correctness append**: the
   client dashboard may render multiple grids in this
   shape (a primary stats grid plus a secondary "recent
   activity" grid). The `.first()` append pins this
   field to the topmost stats grid.
3. **Failure surfaces a regression, not a flake**: the
   class chain is brittle by design — it pins the
   responsive grid contract that the dashboard's
   visual hierarchy depends on. A future migration to
   `data-testid="stats-grid"` would be a one-line edit
   here that the change checklist below already
   anticipates.

## Why `welcomeText` uses `getByText(/welcome back/i)`

The `welcomeText` field resolves to the first text node
whose content matches the case-insensitive regex
`/welcome back/i`. Two load-bearing reasons:

1. **Greeting-string change tolerance**: the dashboard
   greets the authenticated client with "Welcome back,
   {name}" today; a future contributor who switches to
   "Welcome back!" or "Welcome back, {name}!" would
   pass this Locator unchanged because the substring
   match anchors only on the canonical "welcome back"
   prefix.
2. **`.first()` strict-mode-correctness append**: a
   future "Welcome back to {feature}" widget could
   otherwise trigger a multi-match error.

## Why the only method is `navigate()`

The `navigate()` method delegates to the inherited
`goto('/client/dashboard')` posture and returns the
inherited `Promise<void>`. The driver intentionally
exposes **no composite primitives** today (no
`getStat(name)`, no `clickFirstActivity()`, no
`assertWelcomeMessage(name)`) because the consuming
spec
[`apps/web-e2e/tests/client/dashboard.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/dashboard.spec.ts)
drives the page directly via inline locators today.
This is a deliberate **smallest-possible-surface**
posture symmetric with the `discover.page.ts` driver
(see [`discover-page-object.md`](discover-page-object.md))
and the bare `signin.page.ts` driver (see
[`signin-page-object.md`](signin-page-object.md)). A
future contributor who adds composite primitives here
should follow the per-form / per-row helper-trio pattern
the admin-tree drivers document (e.g.,
[`admin-tags-page-object.md`](admin-tags-page-object.md)
documents `getTagByName(name)` /
`editTag(name)` / `deleteTag(name)`).

## Spec context

- **Spec contract**: covered by
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage).
- **Consuming spec**:
  [`apps/web-e2e/tests/client/dashboard.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/dashboard.spec.ts)
  exercises three flows on top of the
  [`auth-fixture.md`](auth-fixture.md) `clientPage`
  authenticated-page fixture — (1) authenticated client
  can access the dashboard at `/client/dashboard`, (2)
  unauthenticated user is redirected to `/auth/signin`,
  (3) dashboard displays a "dashboard" heading.
- **Sibling API smoke**: the dashboard's stats-panel
  data flows through
  [`apps/web/app/api/client/dashboard/stats/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/dashboard/stats/route.ts),
  query-smoked at
  [`apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts).

## Failure matrix

The following per-source-file mistakes would silently
desync the driver from the production source. Any
spec touching the client dashboard should hit at least
one of these on regression:

| Mistake | Surface |
| --- | --- |
| Drop `import type { Page, Locator }` for runtime imports | TypeScript bundling error under strict mode |
| Remove `extends BasePage` | Loses `goto()`, `waitForPageReady()`, `header`, `footer`, `navLinks` — every consuming spec breaks |
| Drop `readonly` on any Locator | A spec could rebind the field at runtime, breaking the strict-mode-correctness contract |
| Re-bind `heading` to an exact-name match (`'Dashboard'`) | Breaks every non-English locale spec |
| Re-bind `heading` without `.first()` | Strict-mode multi-match error if a future contributor adds a second `/dashboard/i` heading |
| Re-bind `statsGrid` to a single-class anchor (`.grid` only) | Multi-match error against any other grid on the page |
| Re-bind `statsGrid` to a `data-testid` without source-side wiring | Assertion failure on every consuming spec |
| Drop `.first()` on `welcomeText` | Strict-mode multi-match error against future "Welcome back to {feature}" widgets |
| Re-bind `navigate()` to skip the inherited `goto()` | Loses the `'domcontentloaded'` stabilisation contract; flakes downstream assertions |
| File rename to `.tsx` | TypeScript include glob mismatch — see [`e2e-tsconfig.md`](e2e-tsconfig.md) |
| File move out of `apps/web-e2e/page-objects/client/` | Breaks the relative `../base.page` import; triggers the include-glob mismatch above |
| CRLF line endings | Prettier reformat on next commit churns the file |

## Read / write surface

| Caller | Reads | Writes |
| --- | --- | --- |
| [`apps/web-e2e/tests/client/dashboard.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/dashboard.spec.ts) | Future consumer of `heading` / `statsGrid` / `welcomeText`; today drives the page via inline locators | none |
| Production source under [`apps/web/app/[locale]/client/dashboard/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app) | Renders the `<h1>Dashboard</h1>` heading, the `.grid.grid-cols-1.md:grid-cols-2.lg:grid-cols-4` stats panel chain, and the "Welcome back" greeting | none |
| [`base-page-object.md`](base-page-object.md) (the inheritance root) | `extends BasePage` exposes `goto()`, `waitForPageReady()`, `header`, `footer`, `navLinks` to consuming specs | none |
| [`e2e-tsconfig.md`](e2e-tsconfig.md) | The `include: ["./**/*.ts"]` glob picks up this file under `apps/web-e2e/page-objects/client/` | none |
| [`playwright-config.md`](playwright-config.md) | The `baseURL` (`http://localhost:3000` by default) is what the inherited `goto()` resolves the `/client/dashboard` path against | none |
| [`fixtures-index.md`](fixtures-index.md) | A future fixture-bound `clientDashboardPage` would surface here — currently consuming specs use the `clientPage` authenticated-page fixture from [`auth-fixture.md`](auth-fixture.md) and instantiate the page object inline | none |

## Read / write surface failure modes

| Drift source | Surfaces as |
| --- | --- |
| Heading rename to non-`/dashboard/i` text in production | `heading` Locator misses; consuming specs fail |
| Stats-panel-grid restructure to a different breakpoint pattern | `statsGrid` Locator misses; consuming specs fail |
| Greeting copy change away from "Welcome back" | `welcomeText` Locator misses |
| `[locale]/client/**` middleware redirect change | `navigate()` to `/client/dashboard` resolves to `/auth/signin` for unauthenticated callers — the consuming spec's "redirected to signin" flow exercises this contract |
| `baseURL` change in [`playwright-config.md`](playwright-config.md) | Every Locator in this file resolves against the wrong host |
| `[locale]/client/**` route move | The `navigate()` path needs updating in lockstep |

## `dashboard.page.ts`-change checklist

When changing this file, follow the same
spec-cross-reference checklist the admin-tree drivers
document. In a single PR:

1. Update [`docs/plugins/client-dashboard-page-object.md`](client-dashboard-page-object.md)
   in the same PR that touches the source file.
2. Update [`docs/log.md`](../log.md) with a one-line
   summary.
3. Cross-check the consuming spec at
   [`apps/web-e2e/tests/client/dashboard.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/dashboard.spec.ts)
   for the three-flow envelope (authenticated client
   access, unauthenticated redirect, dashboard heading
   visible).
4. Cross-check [`base-page-object.md`](base-page-object.md)
   for the inheritance root.
5. Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for
   the `include` glob.
6. Cross-check [`playwright-config.md`](playwright-config.md)
   for the `baseURL`.
7. Cross-check [`fixtures-index.md`](fixtures-index.md)
   for a future fixture-bound `clientDashboardPage`.
8. Cross-check the production source under
   [`apps/web/app/[locale]/client/dashboard/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app)
   for the `<h1>Dashboard</h1>` heading, the
   `.grid.grid-cols-1.md:grid-cols-2.lg:grid-cols-4`
   stats panel chain, and the "Welcome back" greeting.
9. Run dual `pnpm tsc --noEmit` (e2e + workspace root).
10. Run a smoke-subset Playwright run targeting the
    client dashboard subset
    (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Client: Dashboard"`).
11. If the change introduces a new shared concept that
    affects test authoring across the client/ subtree,
    cross-link
    [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage).
12. Add a [`docs/log.md`](../log.md) entry.
13. Reviewer pass.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root every page object extends.
- [`e2e-tsconfig.md`](e2e-tsconfig.md) — the TypeScript
  include glob that picks up this file.
- [`playwright-config.md`](playwright-config.md) — the
  `baseURL` posture this file's navigation resolves
  against.
- [`fixtures-index.md`](fixtures-index.md) — the
  fixture barrel that exposes the `clientPage`
  authenticated-page fixture consuming specs use to
  drive this page.
- [`auth-fixture.md`](auth-fixture.md) — the `clientPage`
  fixture documentation.
- [`admin-dashboard-page-object.md`](admin-dashboard-page-object.md) —
  the **admin-area** dashboard driver, sibling concept
  in the admin tree.
- [`discover-page-object.md`](discover-page-object.md) —
  another smallest-possible-surface page-object posture
  that this driver mirrors.
- [`signin-page-object.md`](signin-page-object.md) —
  the auth-tree driver consuming specs depend on for
  the authenticated `clientPage` fixture's setup
  precondition.
