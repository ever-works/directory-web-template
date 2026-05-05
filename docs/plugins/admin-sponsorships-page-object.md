---
id: admin-sponsorships-page-object
title: E2E Admin Sponsorships Page Object (apps/web-e2e/page-objects/admin/sponsorships.page.ts)
sidebar_label: E2E Admin Sponsorships Page Object
sidebar_position: 414
---

# E2E Admin Sponsorships Page Object — `apps/web-e2e/page-objects/admin/sponsorships.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin sponsorships-management** driver paired with
[`apps/web-e2e/page-objects/admin/sponsorships.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/sponsorships.page.ts).
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
`notifications.page.ts` — see
[`admin-notifications-page-object.md`](admin-notifications-page-object.md),
`reports.page.ts` — see
[`admin-reports-page-object.md`](admin-reports-page-object.md),
`roles.page.ts` — see
[`admin-roles-page-object.md`](admin-roles-page-object.md),
`settings.page.ts` — see
[`admin-settings-page-object.md`](admin-settings-page-object.md),
`surveys.page.ts`, `tags.page.ts`).

This page is the **fifteenth per-source-file reference**
the docs tree publishes for any file under
`apps/web-e2e/page-objects/admin/` and the **first**
admin-tree driver in the rollout that documents:

- A **dual-modal-getter posture** that uses **two
  different selector strategies** for two semantically
  distinct modals on the same page. The `rejectModal`
  getter pins to the **WAI-ARIA-canonical**
  `[role="dialog"][aria-modal="true"]` selector with
  `.first()`, while the `forceApproveModal` getter
  pins to the **less-strict**
  `[role="dialog"]` selector chained with
  `Locator.filter({ hasText: /force approve/i })`.
  The split is load-bearing: the rejection modal is
  the **first** modal on the page (positionally), so
  the `.first()` posture is the cheapest resolver,
  while the force-approve modal is content-anchored
  via the `/force approve/i` regex because there is
  no positional guarantee for it (the page may also
  mount confirmation, error, or info modals between
  the rejection and force-approve modals).
- A **fire-and-forget `searchSponsorships(term)` flow
  helper** that does NOT trigger search submission —
  symmetric with the `searchRoles(term)` posture
  documented in
  [`admin-roles-page-object.md`](admin-roles-page-object.md).
  The helper calls `searchInput.fill(term)` and ends;
  the consumer must wait the debounce window
  explicitly via `page.waitForTimeout(…)` for the
  search to fire. Distinct from the items driver's
  `searchItems(term)` helper which presses Enter
  after fill.
- A **`<input>`-id-bound modal-scoped input getter**
  (`rejectionReasonInput`) that resolves via
  `this.page.locator('#rejectionReason')` — symmetric
  with the items driver's
  `rejectionReasonInput` getter (which uses the same
  `#rejectionReason` id-selector via the modal-scoped
  `this.rejectModal.locator('#rejectionReason')`
  posture). The sponsorships driver pins to the
  page-scope (`this.page.locator(...)`) instead of
  the modal-scope to defend against a future render
  that mounts the textarea outside the modal subtree
  (e.g. as a portaled overlay).
- A **`getByRole('searchbox').first()` search input
  resolver** — symmetric with the items / clients /
  comments / companies / collections drivers' search
  posture (and distinct from the roles driver's bare
  `<input type="text">` first-element posture). The
  sponsorships page emits the search input as a
  native `<input type="search">` resolvable via
  `getByRole('searchbox')`.

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's admin sponsorships-
management driver boundary** at `/admin/sponsorships` —
the smallest possible page object that lets a spec
drive the admin sponsorships page end-to-end (navigate
to `/admin/sponsorships`, locate the page heading via
the inherited-default `getByRole('heading').first()`
posture, locate the search input via the
`getByRole('searchbox').first()` posture, fire a
search via the fire-and-forget
`searchSponsorships(term)` helper, locate the reject
modal via the WAI-ARIA-canonical
`[role="dialog"][aria-modal="true"]` first-element
posture, locate the rejection-reason textarea via the
`#rejectionReason` id-selector, and locate the force-
approve modal via the `/force approve/i` content-
anchored chain Locator).

The file is the **only driver** in the suite for the
admin sponsorships-management surface today. The
`AdminSponsorshipsPage` class **does extend `BasePage`**
— see "Why `AdminSponsorshipsPage` extends `BasePage`"
below — so it inherits `header` / `footer` /
`navLinks` / `goto` / `gotoLocalized` /
`waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and only
adds two per-page `readonly` Locator fields
(`heading`, `searchInput`), two methods (`navigate()`,
`searchSponsorships(term)`), and three getters
(`rejectModal`, `rejectionReasonInput`,
`forceApproveModal`) on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-sponsorships` driver is consumed today by
[`apps/web-e2e/tests/admin/sponsorships.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/sponsorships.spec.ts),
which covers three flows over the admin sponsorships
management surface:

- **Admin can access sponsorships management page** —
  a baseline navigation + visibility assertion against
  the per-page `heading` Locator after a `navigate()` /
  `waitForPageReady()` two-call.
- **Sponsorships page displays stats and content** —
  a content-area visibility assertion against the
  `<main>` element with a 2-second wait for either the
  sponsorship list or the empty-state to render.
- **Admin can search sponsorships** — a search-flow
  assertion that checks `searchInput.isVisible()` first
  (with a `.catch(() => false)` defensive resolution
  for environments where the search input is not
  rendered), skips the test if the search input is
  absent, otherwise calls
  `searchSponsorships('zzz-nonexistent-xyz')` and
  waits 1 second for the debounce window to elapse.

A spec that drives the admin sponsorships surface
inline (via `await page.goto('/admin/sponsorships')`
then `await page.getByRole('searchbox').fill(...)` or
`await page.locator('[role="dialog"][aria-modal="true"]').first().isVisible()`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin
sponsorships management surface must reach for
`AdminSponsorshipsPage` instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root. | Anchors the sponsorships driver to the canonical page-object base. |
| `export class AdminSponsorshipsPage extends BasePage` | named export | Single class declaration with `extends BasePage`. Adds two per-page `readonly` Locator fields, two methods, and three getters on top. | The class is the canonical driver for the admin sponsorships-management surface today. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — the **first** heading on the page, regardless of level. | Symmetric with every other admin-tree driver's heading getter. |
| `readonly searchInput: Locator` | field | `page.getByRole('searchbox').first()` — the page's search input via the WAI-ARIA `searchbox` role. | Pinning to the role is the production-source-stable hook today; the sponsorships page emits the search as a native `<input type="search">` resolvable via the `searchbox` role. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds the two per-page Locator fields. | Single constructor signature with the `super(page)` call. |
| `async navigate()` | method | `await this.goto('/admin/sponsorships')` — navigates to the admin sponsorships management route via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. |
| `async searchSponsorships(term)` | method | `await this.searchInput.fill(term)` — fills the search input but does NOT submit. | The search input fires on debounce; the consumer must `page.waitForTimeout(…)` after the call for the debounce window to elapse. |
| `get rejectModal()` | getter | `this.page.locator('[role="dialog"][aria-modal="true"]').first()` — the rejection modal, located via the WAI-ARIA-canonical posture with `.first()`. | The `.first()` pin defends against a future render that mounts a confirmation or info modal alongside the rejection modal. |
| `get rejectionReasonInput()` | getter | `this.page.locator('#rejectionReason')` — the rejection-reason textarea inside the reject modal, located via id-selector. | Pinning to the page-scope (NOT the modal-scope) defends against a future render that mounts the textarea as a portaled overlay outside the modal subtree. |
| `get forceApproveModal()` | getter | `this.page.locator('[role="dialog"]').filter({ hasText: /force approve/i })` — the force-approve modal, located via the less-strict `[role="dialog"]` selector chained with a content-anchored `hasText` filter. | The force-approve modal is NOT the first modal on the page positionally, so the `.first()` posture would resolve to the wrong modal. The content-anchored `hasText` filter pins to the modal regardless of mount order. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminSponsorshipsPage extends BasePage {
	readonly heading: Locator;
	readonly searchInput: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.searchInput = page.getByRole('searchbox').first();
	}

	async navigate() {
		await this.goto('/admin/sponsorships');
	}

	/** Search sponsorships. */
	async searchSponsorships(term: string) {
		await this.searchInput.fill(term);
	}

	/** Get the reject modal. */
	get rejectModal() {
		return this.page.locator('[role="dialog"][aria-modal="true"]').first();
	}

	/** Rejection reason textarea. */
	get rejectionReasonInput() {
		return this.page.locator('#rejectionReason');
	}

	/** Get the force approve modal (HeroUI Modal). */
	get forceApproveModal() {
		return this.page.locator('[role="dialog"]').filter({ hasText: /force approve/i });
	}
}
```

## Why `AdminSponsorshipsPage` extends `BasePage`

Three load-bearing reasons the admin-tree sponsorships
driver inherits from
[`base-page-object.md`](base-page-object.md):

- **Page-route navigation via the inherited `goto`
  method.** The sponsorships driver targets a navigable
  URL (`/admin/sponsorships`).
- **Global header / footer / nav-link chrome surfaced
  for free.** The admin shell renders the same global
  header / footer / nav-link chrome on
  `/admin/sponsorships` as on every other admin route.
- **Post-navigation `waitForPageReady` stabiliser.**
  Every sponsorships flow that touches the page
  starts with
  `await sponsorshipsPage.navigate(); await sponsorshipsPage.waitForPageReady();`
  — the consuming spec at
  [`apps/web-e2e/tests/admin/sponsorships.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/sponsorships.spec.ts)
  uses this exact two-call shape in every flow.

## Why the dual-modal-getter posture splits between `[role="dialog"][aria-modal="true"]` and `[role="dialog"] + hasText`

Three reasons the two modal getters on the same page
use two different selector strategies:

- **The reject modal is the first modal on the page
  positionally.** When a consuming spec triggers the
  rejection flow, the reject modal is the only modal
  mounted at that point — so the `.first()` posture
  on the strict
  `[role="dialog"][aria-modal="true"]` selector is
  the cheapest resolver and pins to the canonical
  WAI-ARIA modal contract.
- **The force-approve modal has no positional
  guarantee.** The force-approve flow can fire after
  the user has already opened (and closed, or left
  open) other modals (confirmations, errors, info).
  A `.first()` posture would resolve to the wrong
  modal in those cases. The content-anchored
  `Locator.filter({ hasText: /force approve/i })`
  posture pins to the force-approve modal regardless
  of mount order or sibling-modal presence.
- **The `[role="dialog"]` (without `aria-modal="true"`)
  selector is intentionally less strict.** HeroUI's
  Modal component sometimes mounts the modal with
  only `[role="dialog"]` (omitting `aria-modal="true"`)
  during the enter-animation window. Pinning to the
  less-strict selector avoids a transient mismatch
  during the modal's mount-animation lifecycle.

## Why `searchSponsorships(term)` does not trigger search submission

Three reasons the search flow helper calls
`searchInput.fill(term)` and ends without pressing
Enter or clicking a search button:

- **The sponsorships page's search input fires on
  debounce, not on Enter or button-click.** The
  production source binds an `onChange` handler to
  the search input that triggers a debounced query
  (typically 300–500ms). Pressing Enter would not
  fire the search; the search fires when the
  debounce window elapses after the last fill.
- **The consumer is responsible for the debounce
  wait.** The driver intentionally does not bake a
  `page.waitForTimeout(…)` into the helper, because
  the debounce window is not stable across
  environments (it varies with the React-Query
  cache state and the network roundtrip). The
  consuming spec at
  [`sponsorships.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/sponsorships.spec.ts)
  uses an explicit `await adminPage.waitForTimeout(1_000)`
  after `searchSponsorships(...)` to wait for the
  debounce window.
- **The fire-and-forget posture is symmetric with the
  roles driver's `searchRoles(term)` helper.** Both
  drivers expose the search input as a fire-and-
  forget mutator that the consumer wraps with an
  explicit debounce wait.

## Why `rejectionReasonInput` resolves at the page-scope (not the modal-scope)

Three reasons the rejection-reason textarea getter
resolves via `this.page.locator('#rejectionReason')`
(at the page-scope) instead of
`this.rejectModal.locator('#rejectionReason')` (at
the modal-scope):

- **Defensive against future portal-render
  refactors.** A future render that mounts the
  textarea as a portaled overlay outside the modal
  subtree (e.g. via React's `createPortal`) would
  break the modal-scoped resolver. The page-scope
  resolver pins to the textarea regardless of where
  it mounts in the DOM tree.
- **The `#rejectionReason` id-selector is unique on
  the page.** No other page in the admin shell
  emits an `#rejectionReason` element today, so the
  page-scope resolver is unambiguous.
- **Symmetric with the items driver's posture.** The
  items driver's `rejectionReasonInput` getter uses
  the modal-scope (`this.rejectModal.locator('#rejectionReason')`),
  but the items driver's modal-scope is justified
  by the items page mounting multiple
  `#rejectionReason`-bearing modals (one per row in
  the bulk-action surface). The sponsorships page
  mounts at most one rejection modal at a time, so
  the page-scope is sufficient.

## Why `forceApproveModal` uses the less-strict `[role="dialog"]` (without `aria-modal="true"`)

Three reasons the force-approve modal getter uses
the less-strict `[role="dialog"]` selector instead
of the strict `[role="dialog"][aria-modal="true"]`
posture:

- **HeroUI's Modal omits `aria-modal="true"` during
  the mount animation.** The strict selector would
  miss the modal during the enter-animation window.
  The less-strict selector resolves the modal
  immediately upon mount.
- **The `Locator.filter({ hasText })` chain
  disambiguates by content.** The force-approve
  modal is uniquely identified by the
  `/force approve/i` content match — distinct from
  any other modal that might be mounted on the
  page concurrently.
- **The split between `rejectModal` (strict) and
  `forceApproveModal` (less-strict + filter) is
  intentional.** A consumer that needs to assert
  on the modal's strict ARIA contract can compose
  inline:
  `await forceApproveModal.locator('[aria-modal="true"]').isVisible()`.

## What it does not contain

The sponsorships driver intentionally omits a number
of helpers that future contributors might be tempted
to add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`)
  plus the bare HTML `#rejectionReason` id-selector
  exclusively.
- **No `clickReject(itemName, reason)` /
  `clickForceApprove(itemName)` composite flow
  helpers.** The driver exposes the per-modal
  Locators but no per-row action helpers. Future
  specs that drive per-row flows must compose the
  per-row click + per-modal fill inline.
- **No `assertSponsorshipPresent(name)` /
  `assertSponsorshipAbsent(name)` invariant
  assertions.** The driver does not bake test-time
  assertions into the page object.
- **No status-tab / status-filter helper.** The
  sponsorships page does emit a status filter
  (HeroUI Tabs or a `<select>`), but the driver
  does not expose a `selectStatusTab(status)` /
  `selectStatusFilter(status)` helper today. Future
  specs that need to drive the status filter must
  compose the resolution inline.
- **No pagination helper
  (`clickPaginationPage(page)` / `nextPage()` /
  `prevPage()`).** The sponsorships page does emit
  pagination chrome, but the driver does not
  expose it today.
- **No per-row Locator-factory
  (`getSponsorshipByName(name)` /
  `getSponsorshipById(id)`).** Future specs that
  need per-row resolution must compose the
  resolution inline.

These omissions keep the driver minimal — every
property and method on the class is consumed by at
least one spec today.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root every page object in
  `apps/web-e2e/page-objects/admin/` extends.
- [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
  — the **first** admin-tree page-object reference.
- [`admin-clients-page-object.md`](admin-clients-page-object.md)
  — the **second** admin-tree page-object reference.
- [`admin-collections-page-object.md`](admin-collections-page-object.md)
  — the **third** admin-tree page-object reference.
- [`admin-comments-page-object.md`](admin-comments-page-object.md)
  — the **fourth** admin-tree page-object reference.
- [`admin-companies-page-object.md`](admin-companies-page-object.md)
  — the **fifth** admin-tree page-object reference.
- [`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
  — the **sixth** admin-tree page-object reference.
- [`admin-featured-items-page-object.md`](admin-featured-items-page-object.md)
  — the **seventh** admin-tree page-object reference.
- [`admin-data-export-page-object.md`](admin-data-export-page-object.md)
  — the **eighth** admin-tree page-object reference.
- [`admin-item-form-page-object.md`](admin-item-form-page-object.md)
  — the **ninth** admin-tree page-object reference.
- [`admin-items-page-object.md`](admin-items-page-object.md)
  — the **tenth** admin-tree page-object reference.
- [`admin-notifications-page-object.md`](admin-notifications-page-object.md)
  — the **eleventh** admin-tree page-object reference.
- [`admin-reports-page-object.md`](admin-reports-page-object.md)
  — the **twelfth** admin-tree page-object reference.
- [`admin-roles-page-object.md`](admin-roles-page-object.md)
  — the **thirteenth** admin-tree page-object reference.
- [`admin-settings-page-object.md`](admin-settings-page-object.md)
  — the **fourteenth** admin-tree page-object reference.

The
[`apps/web-e2e/tests/admin/sponsorships.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/sponsorships.spec.ts)
spec file is the single consumer of this driver
today; new specs that touch the admin sponsorships
management surface must reach for
`AdminSponsorshipsPage` instead of inlining
`page.goto('/admin/sponsorships')` /
`page.getByRole('searchbox').fill(...)` /
`page.locator('[role="dialog"][aria-modal="true"]').first()` /
`page.locator('#rejectionReason')` calls.
