---
id: admin-notifications-page-object
title: E2E Admin Notifications Page Object (apps/web-e2e/page-objects/admin/notifications.page.ts)
sidebar_label: E2E Admin Notifications Page Object
sidebar_position: 410
---

# E2E Admin Notifications Page Object — `apps/web-e2e/page-objects/admin/notifications.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin notifications dropdown** driver paired with
[`apps/web-e2e/page-objects/admin/notifications.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/notifications.page.ts).
Sits inside the `admin/` page-object subtree, alongside
the sixteen sibling admin-surface page objects
(`bulk-actions.page.ts` — see
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
`clients.page.ts` — see
[`admin-clients-page-object.md`](admin-clients-page-object.md),
`collections.page.ts` — see
[`admin-collections-page-object.md`](admin-collections-page-object.md),
`comments.page.ts` — see
[`admin-comments-page-object.md`](admin-comments-page-object.md),
`companies.page.ts` — see
[`admin-companies-page-object.md`](admin-companies-page-object.md),
`dashboard.page.ts` — see
[`admin-dashboard-page-object.md`](admin-dashboard-page-object.md),
`data-export.page.ts` — see
[`admin-data-export-page-object.md`](admin-data-export-page-object.md),
`featured-items.page.ts` — see
[`admin-featured-items-page-object.md`](admin-featured-items-page-object.md),
`item-form.page.ts` — see
[`admin-item-form-page-object.md`](admin-item-form-page-object.md),
`items.page.ts` — see
[`admin-items-page-object.md`](admin-items-page-object.md),
`reports.page.ts`, `roles.page.ts`,
`settings.page.ts`, `sponsorships.page.ts`,
`surveys.page.ts`, `tags.page.ts`).

This page is the **eleventh per-source-file reference**
the docs tree publishes for any file under
`apps/web-e2e/page-objects/admin/` and the **first**
admin-tree driver in the rollout that documents:

- A **non-`extends-BasePage` posture** — the
  `AdminNotifications` class is the **first** admin-tree
  driver that does NOT extend
  [`BasePage`](base-page-object.md). Distinct from every
  prior admin-tree driver (each of which extends
  `BasePage` and inherits `goto()`,
  `gotoLocalized()`, `waitForPageReady()`, and
  `getTitle()`). The notifications driver is a
  **header-chrome dropdown** rather than a full-page
  surface, so it does not need the navigation helpers
  the base class provides — the consuming spec
  navigates with `adminPage.goto('/admin', …)` directly
  and then constructs a `new AdminNotifications(adminPage)`
  to drive the bell-button surface.
- A **plain-class constructor binding all four core
  Locator fields directly** in the constructor body
  (the `BasePage` subclasses pass `super(page)` first
  and bind their per-page Locators afterwards). The
  notifications driver's constructor signature is
  `constructor(page: Page)` — distinct from every prior
  admin-tree driver's `constructor(page: Page)` →
  `super(page)` posture. The `this.page = page`
  assignment is the **first** explicit page-property
  assignment in any admin-tree driver to date, because
  no `BasePage` is in the inheritance chain to assign
  it implicitly.
- A **four-`readonly`-Locator-field core surface**
  (`bellButton`, `dropdown`, `refreshButton`,
  `closeButton`) plus a **five-getter dropdown-content
  surface** (`markAllReadButton`, `unreadBadge`,
  `notificationItems`, `viewAllButton`,
  `emptyState`). The core / getter split is distinct
  from every prior admin-tree driver's pure-Locator-
  field posture — the notifications driver is the
  **first** admin-tree driver that documents
  per-content getters that resolve **inside** the
  `dropdown` Locator's scope, lazily, on every access.
- A **`page.locator(…).first()`-anchored bell-button
  field** — the bellButton field uses
  `page.locator('button[aria-label*="Notifications"]').first()`
  to defend against any second matching button (e.g. a
  duplicated notification bell in a sub-shell or a
  per-section notification trigger). The `.first()`
  call is the **first** admin-tree driver field that
  documents an explicit collection-narrowing call —
  every prior admin-tree driver's per-page Locators
  resolve to a single matching element by virtue of
  the unique-id / unique-attribute selector posture.
- A **`#admin-notifications-dropdown` id-selector
  posture** for the dropdown panel — the dropdown
  field uses `page.locator('#admin-notifications-dropdown')`
  to scope every dropdown-content getter to the panel
  via `this.dropdown.getByRole(…)` /
  `this.dropdown.locator(…)`. The id-selector
  posture is distinct from every prior admin-tree
  driver's role-based or attribute-based scoping —
  the notifications driver is the **first** admin-tree
  driver that documents an `#id`-anchored panel
  scope, defending against any sibling dropdown that
  happens to share the same `[role="menu"]` /
  `[role="dialog"]` posture but different content
  ownership.
- A **two-action surface** — `open()` (clicks the
  bell button) and `close()` (clicks the close
  button). Distinct from every prior admin-tree
  driver's larger method surfaces (the next-smallest
  is the data-export driver's six methods, well above
  the notifications driver's two). The two-method
  surface reflects the dropdown's role as a chrome
  surface rather than a full-page surface — the
  consuming spec drives the bell open / closed and
  then asserts on the per-content getters directly,
  rather than chaining method calls.
- A **regex-based `getByRole('button', { name: … })`
  resolution for two of the dropdown-content getters**
  — `markAllReadButton` resolves via
  `this.dropdown.getByRole('button', { name: /mark all/i })`
  and `viewAllButton` resolves via
  `this.dropdown.getByRole('button', { name: /view all/i })`.
  The case-insensitive substring regex defends against
  the bilingual "Mark all read" / "Mark all as read"
  capitalisation drift between the English source and
  any future per-locale translation, while the
  `getByRole` posture documents the production-source
  contract that both buttons must remain
  `<button>` elements in the dropdown panel — a
  regression that switches them to `<a>` or `<div>`
  elements would surface here as a getter-resolution
  failure.
- A **`.animate-pulse`-Tailwind-utility-class-anchored
  unread-badge getter** — `unreadBadge` resolves via
  `this.bellButton.locator('.animate-pulse')` to scope
  the unread-count animation to the bell-button
  surface. The `.animate-pulse` Tailwind-utility-class
  selector is the **first** admin-tree driver getter
  that documents a Tailwind-utility-class-anchored
  resolution — every prior admin-tree driver's
  Locators resolve via `aria-label`,
  `getByRole`, `getByText`, `id`, or
  `data-testid` selectors. The Tailwind-utility-class
  posture is fragile in that any future style refactor
  that swaps the unread-pulse animation for a
  non-`animate-pulse` indicator (e.g. a plain dot
  badge, a colour-only indicator, or a Framer-Motion
  variant) will break this getter — but the
  fragility is intentional: a regression that drops
  the unread-badge surface entirely (i.e. the badge
  becomes invisible) would surface here as a
  getter-resolution failure.
- A **`[role="button"]`-anchored
  `notificationItems` getter** — the per-row
  notification surface resolves via
  `this.dropdown.locator('[role="button"]')` to
  enumerate every clickable notification item in the
  dropdown panel. The `[role="button"]` posture is
  the **first** admin-tree driver getter that
  documents an attribute-only role selector
  (vs. `getByRole('button')`) — the difference matters
  because the production-source notification items are
  rendered as `<div role="button">` (not `<button>`)
  for stylistic reasons, so the
  `getByRole('button')` posture would over-match the
  `markAllReadButton` and `viewAllButton` `<button>`
  elements. The attribute-only selector documents
  that contract and disambiguates the per-row count
  from the per-action button count.
- A **`.getByText(/no notifications/i)` empty-state
  getter** — the `emptyState` getter resolves via
  `this.dropdown.getByText(/no notifications/i)` to
  detect the empty-state copy. The case-insensitive
  substring regex defends against the bilingual "No
  notifications" / "no notifications yet" /
  "no_notifications" capitalisation / suffix drift
  between the English source and any future per-locale
  translation. The `getByText` posture is the
  **first** admin-tree driver getter that documents
  a text-content-anchored resolution (vs. `getByRole`
  / `getByLabel` / `getByTestId`) — the text-content
  posture is appropriate here because the empty-state
  copy is the **only** distinguishing element on the
  page when the user has no notifications.

The notifications driver is the canonical reference for
the admin-tree's **header-chrome dropdown** posture —
distinct from every prior admin-tree driver's
**full-page surface** posture. Future contributors who
add header-chrome dropdowns (e.g. a help dropdown, a
language switcher dropdown, a settings dropdown) should
mirror this driver's plain-class constructor + four-
field core + five-getter content split. Future
contributors who add full-page surfaces (e.g. a new
admin section, a new admin sub-page) should mirror the
prior admin-tree drivers' `extends BasePage` + N-field
Locator + M-method surface split.

## Surface

The driver exports a single non-default class
`AdminNotifications` from
[`apps/web-e2e/page-objects/admin/notifications.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/notifications.page.ts).
The full type signature is:

```ts
import type { Page, Locator } from '@playwright/test';

export class AdminNotifications {
	readonly page: Page;
	readonly bellButton: Locator;
	readonly dropdown: Locator;
	readonly refreshButton: Locator;
	readonly closeButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.bellButton = page.locator('button[aria-label*="Notifications"]').first();
		this.dropdown = page.locator('#admin-notifications-dropdown');
		this.refreshButton = page.locator('button[aria-label="Refresh notifications"]');
		this.closeButton = page.locator('button[aria-label="Close notifications panel"]');
	}

	async open(): Promise<void>;
	async close(): Promise<void>;

	get markAllReadButton(): Locator;
	get unreadBadge(): Locator;
	get notificationItems(): Locator;
	get viewAllButton(): Locator;
	get emptyState(): Locator;
}
```

### Constructor

`constructor(page: Page)` — the driver does **not**
extend [`BasePage`](base-page-object.md) (distinct from
every prior admin-tree driver). The constructor:

1. Stores the `page` argument directly on
   `this.page` — the **first** explicit page-property
   assignment in any admin-tree driver to date.
2. Binds `bellButton` via
   `page.locator('button[aria-label*="Notifications"]').first()`
   — `*=` substring match, case-sensitive, narrowed to
   the first matching element via `.first()`.
3. Binds `dropdown` via
   `page.locator('#admin-notifications-dropdown')` —
   exact `id` selector, scope-anchor for every
   dropdown-content getter.
4. Binds `refreshButton` via
   `page.locator('button[aria-label="Refresh notifications"]')`
   — exact `aria-label` match.
5. Binds `closeButton` via
   `page.locator('button[aria-label="Close notifications panel"]')`
   — exact `aria-label` match.

### Methods

`async open()` — opens the notifications dropdown by
clicking the bell button. No `await page.waitFor…` —
the consuming spec is responsible for asserting the
dropdown becomes visible.

`async close()` — closes the notifications dropdown by
clicking the close button. No `await page.waitFor…` —
the consuming spec is responsible for asserting the
dropdown becomes hidden.

### Getters

`get markAllReadButton()` — resolves via
`this.dropdown.getByRole('button', { name: /mark all/i })`.
Lazy: re-resolves on every access.

`get unreadBadge()` — resolves via
`this.bellButton.locator('.animate-pulse')`. Lazy:
re-resolves on every access.

`get notificationItems()` — resolves via
`this.dropdown.locator('[role="button"]')`. Lazy:
re-resolves on every access.

`get viewAllButton()` — resolves via
`this.dropdown.getByRole('button', { name: /view all/i })`.
Lazy: re-resolves on every access.

`get emptyState()` — resolves via
`this.dropdown.getByText(/no notifications/i)`. Lazy:
re-resolves on every access.

## Consumers

Pinned to the **single** consuming spec file
(distinct from every prior admin-tree driver, which
have one or more consuming spec files):

- [`apps/web-e2e/tests/admin/notifications.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/notifications.spec.ts)
  — five test cases covering the bell-button
  visibility, dropdown open / close, content-or-empty
  state, and the refresh button.

The consuming spec uses the
[`adminPage`](auth-fixture.md) fixture (an
authenticated admin browser context) to navigate to
`/admin` and then constructs a `new AdminNotifications(adminPage)`
to drive the bell-button surface. The spec relies on
the four-Locator core + five-getter content split to
write each test case as a sequence of
`await expect(notifications.<field>).toBe…(…)` and
`await notifications.<method>()` calls.

## Co-tenant — `/api/admin/notifications` server route

The notifications dropdown's data is served by the
admin-only listing route at
[`apps/web/app/api/admin/notifications/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/notifications/route.ts),
which the smoke layer covers in
[`apps/web-e2e/tests/api/admin-notifications-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-notifications-query.spec.ts).
The smoke spec pins the route's two-step gate
(`session?.user?.id` → 401, then
`session.user.isAdmin` → 403) and the route's
zero-argument `GET()` signature (no
`searchParams` reads today). A regression in the
gate-order, gate-status, or handler-signature
contract would surface in the smoke spec before the
notifications-dropdown e2e tests fail (because the
e2e tests use the authenticated admin fixture and
therefore traverse both gates).

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root every other admin-tree page object
  extends. The notifications driver is the **first**
  admin-tree driver that does NOT extend
  `BasePage`, by design — header-chrome dropdowns
  do not need the page-navigation helpers
  `BasePage` provides.
- [`auth-fixture.md`](auth-fixture.md) — the
  `adminPage` fixture the notifications spec consumes
  to drive the dropdown end-to-end.
- [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
  [`admin-clients-page-object.md`](admin-clients-page-object.md),
  [`admin-collections-page-object.md`](admin-collections-page-object.md),
  [`admin-comments-page-object.md`](admin-comments-page-object.md),
  [`admin-companies-page-object.md`](admin-companies-page-object.md),
  [`admin-dashboard-page-object.md`](admin-dashboard-page-object.md),
  [`admin-data-export-page-object.md`](admin-data-export-page-object.md),
  [`admin-featured-items-page-object.md`](admin-featured-items-page-object.md),
  [`admin-item-form-page-object.md`](admin-item-form-page-object.md),
  [`admin-items-page-object.md`](admin-items-page-object.md)
  — the ten sibling admin-tree drivers that document
  the `extends BasePage` + per-page Locator + per-page
  helper-method posture the notifications driver
  diverges from.
- [`testing.md`](testing.md) — the e2e testing
  overview and the page-object-pattern conventions
  every admin-tree driver mirrors.
- [`testing-a-plugin.md`](testing-a-plugin.md) — the
  per-plugin testing guide for plugins that ship
  page objects under `apps/web-e2e/page-objects/`.

## Related specs

- [Spec 010 — E2E Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  — the umbrella spec for the e2e suite's coverage
  bar. The notifications driver and its consuming
  spec contribute to the coverage bar for the admin
  shell's header-chrome surface.
- [Spec 013 — Notifications System](../spec/013-notifications-system/spec.md)
  — the umbrella spec for the notifications system
  the dropdown surfaces. The dropdown is the
  **admin** surface; the per-user notifications
  surface is covered by a sibling client-tree
  page object (TBD).
