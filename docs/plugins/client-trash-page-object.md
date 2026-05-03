---
id: client-trash-page-object
title: E2E Client Trash Page Object (apps/web-e2e/page-objects/client/trash.page.ts)
sidebar_label: E2E Client Trash Page Object
sidebar_position: 424
---

# E2E Client Trash Page Object — `apps/web-e2e/page-objects/client/trash.page.ts`

Per-source-file reference for the Playwright e2e suite's
**client submissions trash bin** driver paired with
[`apps/web-e2e/page-objects/client/trash.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/trash.page.ts).
Sits inside the `client/` page-object subtree, alongside
the five sibling client-surface page objects
(`dashboard.page.ts` — see
[`client-dashboard-page-object.md`](client-dashboard-page-object.md),
`profile.page.ts` — see
[`client-profile-page-object.md`](client-profile-page-object.md),
`settings.page.ts` — see
[`client-settings-page-object.md`](client-settings-page-object.md),
`submissions.page.ts` — see
[`client-submissions-page-object.md`](client-submissions-page-object.md),
`submit.page.ts` — see
[`client-submit-page-object.md`](client-submit-page-object.md)).

This page is the **sixth and final per-source-file
reference** the docs tree publishes for any file under
`apps/web-e2e/page-objects/client/` — closing the
client-tree page-object docs rollout at **6-of-6** —
and the **first** client-tree driver in the rollout
that documents:

- A **soft-deleted-row recovery surface** at
  `/client/submissions/trash` — the only client-tree
  page object the docs rollout covers that targets a
  **derived sub-route** of an existing client-tree
  page (the `/client/submissions/trash` route is a
  child of the `/client/submissions` route the
  [`client-submissions-page-object.md`](client-submissions-page-object.md)
  driver covers). Distinct from every prior client-
  tree driver (which all target a single top-level
  client route or the public `/submit` route): the
  dashboard driver targets `/client/dashboard`, the
  profile driver targets `/client/profile`, the
  settings driver targets `/client/settings`, the
  submissions driver targets `/client/submissions`,
  and the submit driver targets `/submit` — only the
  trash driver targets a **two-segment-deep child
  route** (`/client/submissions/trash`) of an existing
  client-tree route.
- A **breadcrumb back-navigation Locator**
  (`backLink`) pinned via the
  `a[href*="/client/submissions"]` substring-attribute
  selector — the **first** client-tree driver to
  document an `href*=` substring-attribute selector
  for back-link navigation. The `*=` substring posture
  defends against future production-source `href`
  drift between `/client/submissions` (the bare-
  ancestor route) and `/client/submissions?status=…`
  (a query-param-augmented variant the production
  source might add for "go back to the filtered
  view") and a future locale-prefixed `/en/client/
  submissions` shape that Next.js's middleware-based
  i18n posture sometimes emits server-side. The
  `.first()` pin defends against multi-link drift
  (e.g. a sidebar back-link plus an inline body
  back-link).
- A **filter-by-text-content row collection Locator**
  (`trashItems`) pinned via
  `page.locator('button').filter({ hasText: /restore/i })`
  — the **first** client-tree driver to document a
  text-content filter on a bare HTML element-type
  Locator. The pattern resolves to **every restore
  button** on the trash page (one per soft-deleted
  row), letting a consuming spec count restorable
  items via `await trashPage.trashItems.count()`
  and act on the first via `restoreFirst()`. Distinct
  from every prior client-tree driver's per-row
  resolver posture (the submissions driver walks
  two parents from the row's `<h3>` to anchor on
  the row card; the trash driver acts on the action
  button directly because a soft-deleted row's only
  actionable element is the restore button).
- An **empty-state-affordance Locator**
  (`emptyState`) pinned via
  `page.getByText(/trash.*empty|no.*deleted/i).first()`
  — the **first** client-tree driver to document an
  **OR-of-two-substring regex** on a `getByText`
  Locator. The OR-regex matches either the
  `Your trash is empty` / `Trash is empty` /
  `Trash bin empty` rendering OR the
  `No deleted items` / `No items deleted` rendering
  the production source might emit, and the case-
  insensitive `i` flag tolerates capitalisation drift.
  The `.*` between the two substrings allows arbitrary
  intermediate words (`trash bin empty`,
  `your trash is empty`, `trash is currently empty`).
  The `.first()` pin defends against duplicate
  empty-state messages (e.g. a hero copy plus a
  centered illustration caption).
- A **bare imperative `restoreFirst()` mutator** —
  the **first** client-tree driver to document a
  named-action helper that does NOT take a row-key
  parameter. Distinct from every prior client-tree
  driver's per-row helper posture (the submissions
  driver's `viewSubmission(title)` /
  `editSubmission(title)` / `deleteSubmission(title)`
  trio all take a `title` parameter to resolve the
  target row by name). The trash driver's
  `restoreFirst()` helper takes no parameters and
  acts on the first matching restore button in DOM
  order — reflecting the trash bin's intentionally
  minimal surface: the consuming spec only needs to
  prove that **at least one** soft-deleted item can
  be restored, not that a specific named item can
  be restored.

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's client submissions trash
bin driver boundary** at `/client/submissions/trash`.

The file is the **only driver** in the suite for
the client trash bin surface today. The
`ClientTrashPage` class **does extend `BasePage`**
— see "Why `ClientTrashPage` extends `BasePage`"
below — so it inherits `header` / `footer` /
`navLinks` / `goto` / `gotoLocalized` /
`waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and adds
four `readonly` Locator fields (`heading`, `backLink`,
`trashItems`, `emptyState`), one navigation method
(`navigate()`), and one composite mutator
(`restoreFirst()`) on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`client-trash` driver is consumed today by the
client-surface specs that touch the trash bin
recovery flow — any spec that drives a soft-deleted
submission's restore step.

A spec that drives the trash bin inline (via
`await page.goto('/client/submissions/trash')` then
`await page.locator('button').filter({ hasText: /restore/i }).first().click()`)
is a **drift** that this page object is the
canonical replacement for.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The client-tree drivers share the same `import type` discipline as the base class. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root. | Anchors the trash driver to the canonical page-object base. |
| `export class ClientTrashPage extends BasePage` | named export | Single class declaration with `extends BasePage`. Adds four per-page Locator fields, one navigation method, and one mutator on top. | The class is the canonical driver for the client trash bin surface today. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — the first heading on the page (the trash-bin H1). | The bare `getByRole('heading')` posture matches whatever heading level the production source emits today (`<h1>` / `<h2>`); the `.first()` pin defends against future per-section sub-headings (e.g. an "Older than 30 days" sub-section). |
| `readonly backLink: Locator` | field | `page.locator('a[href*="/client/submissions"]').first()` — the breadcrumb back-link pointing to the parent submissions list. | The `*=` substring-attribute selector defends against `?status=…` query-param drift and future locale-prefixed shapes. The `.first()` pin defends against multi-back-link drift (e.g. a sidebar back-link plus an inline body back-link). |
| `readonly trashItems: Locator` | field | `page.locator('button').filter({ hasText: /restore/i })` — every restore button on the trash page (one per soft-deleted row). | The text-content filter on a bare HTML element-type Locator resolves to every restore button regardless of per-row id / aria-label drift. |
| `readonly emptyState: Locator` | field | `page.getByText(/trash.*empty\|no.*deleted/i).first()` — the empty-state copy. | The OR-of-two-substring regex (separated by `.*` for intermediate words) matches `Your trash is empty` / `Trash is empty` / `Trash bin empty` OR `No deleted items` / `No items deleted`. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds all four per-page Locator fields. | Single constructor signature with the `super(page)` call. |
| `async navigate()` | method | `await this.goto('/client/submissions/trash')` — navigates to the trash bin route via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. |
| `async restoreFirst()` | method | `await this.trashItems.first().click()` — clicks the first restore button in DOM order. | The minimal-surface restore mutator. The consuming spec asserts on the post-restore state (e.g. the row count decreasing or the restored item appearing in the submissions list). |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the client submissions trash page.
 */
export class ClientTrashPage extends BasePage {
	readonly heading: Locator;
	readonly backLink: Locator;
	readonly trashItems: Locator;
	readonly emptyState: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.backLink = page.locator('a[href*="/client/submissions"]').first();
		this.trashItems = page.locator('button').filter({ hasText: /restore/i });
		this.emptyState = page.getByText(/trash.*empty|no.*deleted/i).first();
	}

	async navigate() {
		await this.goto('/client/submissions/trash');
	}

	/** Click the restore button on the first trashed item */
	async restoreFirst() {
		await this.trashItems.first().click();
	}
}
```

## Why `ClientTrashPage` extends `BasePage`

Three load-bearing reasons the trash driver
inherits from
[`base-page-object.md`](base-page-object.md):

- **Page-route navigation via the inherited `goto`
  method.** The trash driver targets a navigable
  URL (`/client/submissions/trash`) and the
  inherited `goto(path)` helper is the canonical
  base for the navigation. A future driver that
  needs locale-prefixed navigation can call
  `gotoLocalized(locale, path)` for free.
- **Global header / footer / nav-link chrome
  surfaced for free.** The client shell renders the
  same global chrome on `/client/submissions/trash`
  as on every other client-tree route, so the
  inherited `header` / `footer` / `navLinks` Locator
  fields are reusable from the trash driver without
  re-declaration.
- **Post-navigation `waitForPageReady` stabiliser.**
  Future flows that touch the trash bin's restore
  action benefit from the inherited
  `waitForPageReady()` call's network-idle wait
  against the React Query hydration storm following
  the row-data fetch (which is rendered server-
  side-via-RSC then re-hydrated client-side via the
  `useTrashedSubmissions(...)` hook).

## Why `trashItems` filters on `hasText` (and not on a per-button id / aria-label)

Three reasons the row-collection getter uses a
text-content filter on a bare `button` element-type
Locator instead of an id-selector or
`getByRole('button', { name: /restore/i })`:

- **The production source does NOT bind per-row
  restore buttons to stable ids.** Each soft-deleted
  row renders a `<button>` element without an `id`
  prop, so the rendered button has an auto-generated
  React-internal id that changes between renders. An
  id-selector would not resolve.
- **A `getByRole` posture would resolve every button
  on the page.** The trash page renders multiple
  buttons (the restore button per row, the breadcrumb
  back-link as a button-shaped anchor, possibly an
  empty-state CTA). The text-content filter narrows
  the Locator to **only the restore buttons** without
  needing an explicit `name: /restore/i` regex on the
  `getByRole` Locator (which would resolve identically
  but at a slightly higher computational cost because
  `getByRole` walks the accessibility tree).
- **The bare `button` + `hasText` posture matches
  every restore button regardless of per-row drift.**
  A future production-source change that adds a
  per-row "Permanently delete" button alongside the
  "Restore" button would not affect the
  `trashItems` Locator (the `hasText: /restore/i`
  filter excludes the "Permanently delete" button)
  but would require a new Locator field for the
  permanent-delete action.

## Why `backLink` uses `href*="/client/submissions"` (and not an exact-match `href=`)

Three reasons the back-link getter uses the
`href*=` substring-attribute selector instead of an
exact-match `href=` posture:

- **Future query-param augmentation tolerated.**
  The production source might add a
  `?status=approved` query-param-augmented variant
  for "go back to the filtered view that brought
  the user here" — the substring posture matches
  `/client/submissions?status=approved` and every
  other future query-param shape.
- **Locale-prefix tolerated.** Next.js's
  middleware-based i18n posture sometimes emits
  server-side `href`s with the locale prefix
  (`/en/client/submissions`) — the substring posture
  matches both the bare-locale and the prefixed
  shape. (The Locator's `*=` substring matches any
  position of the substring in the attribute value,
  including the suffix-after-locale-prefix shape.)
- **Hash-fragment-augmented variants tolerated.** A
  future "scroll back to the deleted row's old
  position" feature might emit
  `/client/submissions#row-id-42` — the substring
  posture matches every fragment-augmented shape.

## Why `emptyState` uses an OR-of-two-substring regex

Three reasons the empty-state Locator uses an
OR-regex (`/trash.*empty|no.*deleted/i`) instead of
a single-substring pattern:

- **The production source emits two affordance
  variants.** The empty trash bin's affordance copy
  is rendered as either `Your trash is empty` /
  `Trash is empty` / `Trash bin empty` (the "trash
  empty" variant) OR `No deleted items` /
  `No items deleted` (the "no deleted" variant)
  depending on the production-source's per-locale
  i18n configuration. The OR-regex matches either
  variant.
- **The `.*` between the two substrings allows
  arbitrary intermediate words.** A future copy
  rephrasing to `trash bin currently empty` or
  `no items have been deleted` resolves correctly
  because the `.*` is greedy.
- **Capitalisation drift is tolerated by the `i`
  flag.** A future production-source rephrasing to
  lowercase `your trash is empty` or mixed-case
  `Your Trash Is Empty` resolves correctly.

## Why `restoreFirst()` takes no parameters

Three reasons the restore-action helper does NOT
take a row-key parameter (in contrast to the
submissions driver's `viewSubmission(title)` /
`editSubmission(title)` / `deleteSubmission(title)`
helpers, which all take a `title` parameter to
resolve the target row by name):

- **The trash bin's surface is intentionally
  minimal.** The consuming spec only needs to prove
  that **at least one** soft-deleted item can be
  restored, not that a specific named item can be
  restored. A row-key parameter would over-specify
  the surface relative to the consuming spec's
  requirement.
- **Soft-deleted rows are intrinsically anonymous in
  the trash bin's posture.** A user who lands on
  `/client/submissions/trash` is intentionally
  acting on the bulk of the deleted items rather
  than searching for a specific named item — the
  named-item search happens upstream (in the
  `/client/submissions` list, which has the search
  / filter affordances the
  [`client-submissions-page-object.md`](client-submissions-page-object.md)
  driver documents). The trash bin's UX is the
  recovery affordance, not the search affordance.
- **The bare imperative is symmetric with future
  bulk-action helpers.** A future
  `restoreAll()` / `permanentlyDeleteAll()` /
  `emptyTrash()` mutator would also take no
  parameters (because the action is bulk, not
  per-row). The bare-imperative posture of
  `restoreFirst()` is the rollout-template for any
  future bulk mutator.

## What it does not contain

The trash driver intentionally omits a number of
helpers that future contributors might be tempted
to add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`,
  `getByText`) plus the bare HTML element-type
  selectors and the `href*=` substring-attribute
  selector exclusively.
- **No `restoreByTitle(title)` per-row helper.** The
  driver exposes `restoreFirst()` only because the
  consuming spec drives the bulk-recovery affordance
  rather than per-named-row recovery.
- **No `permanentlyDelete(title)` mutator.** The
  trash driver exposes the **restore** affordance
  only — the permanent-delete affordance, if it
  exists in the production source, is out of scope
  for the consuming spec today.
- **No `getRestorableCount(): Promise<number>`
  accessor.** The driver does not expose a count
  accessor; consuming specs that need a count derive
  it inline via `await trashPage.trashItems.count()`.
- **No `assertEmpty()` invariant assertion.** The
  driver does not assert on the empty-state state.
  Future specs that need an empty-state assertion
  must derive it inline via
  `await expect(trashPage.emptyState).toBeVisible()`.

These omissions keep the driver minimal — every
property and method on the class is consumed by at
least one spec today.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root.
- [`client-dashboard-page-object.md`](client-dashboard-page-object.md)
  — the **first** client-tree page-object reference.
- [`client-profile-page-object.md`](client-profile-page-object.md)
  — the **second** client-tree page-object reference.
- [`client-settings-page-object.md`](client-settings-page-object.md)
  — the **third** client-tree page-object reference.
- [`client-submissions-page-object.md`](client-submissions-page-object.md)
  — the **fourth** client-tree page-object reference.
  Documents the **parent** route
  (`/client/submissions`) of the trash bin's
  derived sub-route (`/client/submissions/trash`).
- [`client-submit-page-object.md`](client-submit-page-object.md)
  — the **fifth** client-tree page-object reference.
- [`signin-page-object.md`](signin-page-object.md) —
  the auth-tree authentication driver. Documents
  the email / password / submit-button surface that
  the consuming spec uses to log in as a client
  before navigating to `/client/submissions/trash`.

The trash driver's consuming specs reach for
`ClientTrashPage` instead of inlining
`page.goto('/client/submissions/trash')` /
`page.locator('button').filter({ hasText: /restore/i })`
calls.

With this entry the **client-tree page-object docs
rollout reaches 6-of-6 — closing the rollout**.
Subsequent rollouts will turn to the public-tree
page objects (e.g. `home.page.ts`,
`browse.page.ts`) or to per-spec docs covering the
client / admin / api / public / smoke / i18n / auth
test trees.
