---
id: client-submissions-page-object
title: E2E Client Submissions Page Object (apps/web-e2e/page-objects/client/submissions.page.ts)
sidebar_label: E2E Client Submissions Page Object
sidebar_position: 423
---

# E2E Client Submissions Page Object — `apps/web-e2e/page-objects/client/submissions.page.ts`

Per-source-file reference for the Playwright e2e suite's
**client submissions management** driver paired with
[`apps/web-e2e/page-objects/client/submissions.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/submissions.page.ts).
Sits inside the `client/` page-object subtree, alongside
the five sibling client-surface page objects
(`dashboard.page.ts` — see
[`client-dashboard-page-object.md`](client-dashboard-page-object.md),
`profile.page.ts` — see
[`client-profile-page-object.md`](client-profile-page-object.md),
`settings.page.ts` — see
[`client-settings-page-object.md`](client-settings-page-object.md),
`submit.page.ts`, `trash.page.ts`).

This page is the **fourth per-source-file reference**
the docs tree publishes for any file under
`apps/web-e2e/page-objects/client/` (after
[`client-dashboard-page-object.md`](client-dashboard-page-object.md)
which opened the rollout,
[`client-profile-page-object.md`](client-profile-page-object.md)
which extended it to the multi-route navigation
posture, and
[`client-settings-page-object.md`](client-settings-page-object.md)
which extended it to the navigation-shelf posture)
and the **first** client-tree driver in the rollout
that documents:

- A **named-row-resolved CRUD helper trio**
  (`viewSubmission(title)`, `editSubmission(title)`,
  `deleteSubmission(title)`) — the **first** client-
  tree driver to document a per-row imperative helper
  set, mirroring the admin-tree
  [`admin-tags-page-object.md`](admin-tags-page-object.md)
  driver's `editTag(name)` / `deleteTag(name)` posture
  and the
  [`admin-collections-page-object.md`](admin-collections-page-object.md)
  driver's `editCollection(name)` / `deleteCollection(name)`
  posture but adapted for the client surface (no
  `getRowByName` resolver — the helpers compose the
  row resolver inline via
  `getSubmissionByTitle(title)`).
- A **named-row resolver via two-parent-walk**
  (`getSubmissionByTitle(title)`) — the helper
  resolves a submission row by walking
  `page.locator('h3').filter({ hasText: title }).first().locator('..').locator('..')`,
  pinning to the production source's two-deep
  `<h3>` → row card grandparent shape. The
  two-parent-walk is the **deepest** parent-walk
  in the page-object suite (the admin-tree
  collections driver walks one parent; this driver
  walks two), encoding the production source's
  card-with-header-and-actions layout pattern. A
  contributor who restructures the submission card
  to a flatter or deeper hierarchy would surface
  here as an assertion failure on the consuming
  spec.
- A **`button[title*="…"]` substring-attribute-
  selector triplet** (`button[title*="iew"]` /
  `button[title*="dit"]` / `button[title*="elete"]`)
  — the row-action buttons resolve via the HTML
  `title` attribute's substring (intentionally
  dropping the leading capital so that "View" /
  "view" / "VIEW" all match). The **first** client-
  tree driver to document an HTML-attribute-
  substring selector posture (distinct from the
  admin-tree drivers' `aria-label` / `getByRole`
  postures), pinned to the production source's
  tooltip-rendering library that emits `title="View
  submission"` etc. on the row-action icon buttons.
- A **status-filter tab navigator**
  (`selectStatusFilter(status: 'all' | 'pending' | 'approved' | 'rejected')`)
  — a literal-union TypeScript parameter that drives
  status-tab clicks via
  `getByRole('button', { name: new RegExp('^${status}', 'i') }).first().click()`.
  The **first** client-tree driver to document a
  literal-union-typed filter parameter, distinct from
  the admin-tree drivers' free-string filter
  parameters. The start-anchor regex pattern
  (`^${status}`) defends against future button-text
  drift like "All submissions" / "Pending review" /
  "Approved items" / "Rejected by moderator" — only
  the canonical status word at the start of the
  button label needs to match.
- A **three-modal getter triplet** (`detailModal`,
  `editModal`, `deleteDialog`) — the **first**
  client-tree driver to document multiple `[role="dialog"]`
  re-evaluating Locator getters, scoped via
  distinct filter strategies:
  - `detailModal`: bare `.first()` on every
    `[role="dialog"]` — the simplest possible
    resolver, used for the read-only view modal that
    `viewSubmission(title)` opens.
  - `editModal`: `.filter({ has: this.page.locator('#name') })`
    — scoped via the presence of the `#name` form
    field (the canonical edit-form input id), which
    distinguishes the edit modal from any other
    `[role="dialog"]` that might be open
    simultaneously. The **first** client-tree driver
    to document a `.filter({ has: ... })` modal-
    scoping strategy.
  - `deleteDialog`: `.filter({ hasText: /delete/i })`
    — scoped via the body text matching the
    case-insensitive `/delete/i` regex, which
    distinguishes the delete-confirmation modal from
    the view / edit modals that would otherwise also
    match `[role="dialog"]`.
- A **navigation-shelf header pair** (`heading`,
  `newSubmissionLink`, `trashLink`) — the per-page
  H1 heading plus a two-link in-page navigation
  cluster (`newSubmissionLink` →
  `/submit` / submission flow,
  `trashLink` → `/client/submissions/trash`),
  symmetric with the
  [`client-settings-page-object.md`](client-settings-page-object.md)
  driver's three-link navigation-shelf cluster but
  scoped to the submissions-management surface.
- A **search-input field** (`searchInput`) pinned
  via `input[type="text"][placeholder*="earch"]`
  — the substring-on-`placeholder` selector
  drops the leading capital so that "Search" /
  "search" / "Search submissions" / "search items"
  all match. The **first** client-tree driver to
  document a `placeholder`-substring selector
  posture (the dashboard / profile / settings
  drivers do not expose any search inputs).

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's client submissions
management driver boundary** at `/client/submissions`
— the smallest possible page object that lets a spec
drive the client submissions list end-to-end (search,
filter by status, view / edit / delete a per-row
submission, navigate to the new-submission flow or
the trash bin).

The file is the **only driver** in the suite for the
`/client/submissions` route today. The
`ClientSubmissionsPage` class **does extend `BasePage`**
— see "Why `ClientSubmissionsPage` extends `BasePage`"
below — so it inherits `header` / `footer` /
`navLinks` / `goto` / `gotoLocalized` /
`waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and adds
**four** `readonly` Locator fields (`heading`,
`newSubmissionLink`, `trashLink`, `searchInput`),
**three** modal getters (`detailModal`, `editModal`,
`deleteDialog`), **one** navigation method
(`navigate()`), **one** filter navigator
(`selectStatusFilter(status)`), **one** named-row
resolver (`getSubmissionByTitle(title)`), and **three**
per-row CRUD helpers (`viewSubmission(title)`,
`editSubmission(title)`, `deleteSubmission(title)`)
on top.

## At a glance

| Field | Value |
| --- | --- |
| Source path | `apps/web-e2e/page-objects/client/submissions.page.ts` |
| Class | `ClientSubmissionsPage` (single named export) |
| Inherits from | [`BasePage`](base-page-object.md) (the page-object inheritance root) |
| Route under test | `/client/submissions` (under the localised `[locale]/client/**` route tree) |
| Auth posture | **Authenticated client** required — unauthenticated callers are redirected to `/auth/signin` by the route's middleware gate |
| Pre-bound `Locator` fields | `heading`, `newSubmissionLink`, `trashLink`, `searchInput` |
| Modal getters | `detailModal`, `editModal`, `deleteDialog` (three `[role="dialog"]` re-evaluating Locator getters) |
| Navigation methods | `navigate()` (single navigation shortcut) |
| Filter methods | `selectStatusFilter(status)` (literal-union-typed status-tab navigator) |
| Row resolver | `getSubmissionByTitle(title)` (two-parent-walk on `<h3>`) |
| Per-row CRUD helpers | `viewSubmission(title)`, `editSubmission(title)`, `deleteSubmission(title)` |
| Consuming specs | [`apps/web-e2e/tests/client/submissions.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submissions.spec.ts), [`apps/web-e2e/tests/client/submit-and-manage.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submit-and-manage.spec.ts) (uses the per-row CRUD helpers for the submit-and-manage flow) |

## Why `ClientSubmissionsPage` extends `BasePage`

The `extends BasePage` clause is load-bearing for three
reasons that mirror every other driver in the suite:

1. **Page-route navigation via inherited `goto()`**:
   the `navigate()` method delegates to
   `this.goto('/client/submissions')` which inherits
   the [`BasePage`](base-page-object.md) `goto(path: string)`
   posture (with the `waitUntil: 'domcontentloaded'`
   stabilisation). Symmetric with every other
   client-tree driver.
2. **Global `header` / `footer` / `navLinks` chrome
   surfaced through inherited composite getters**: the
   submissions management page renders the same
   `<header>` / `<footer>` chrome as the rest of the
   client area. The inherited
   [`BasePage`](base-page-object.md) `header`,
   `footer`, and `navLinks` Locators are immediately
   usable by any spec that drives this page.
3. **`waitForPageReady()` post-navigation stabiliser**:
   the inherited `waitForPageReady()` lets specs gate
   subsequent assertions on the
   `'domcontentloaded'` event, which matters for the
   submissions list because the route is a Server
   Component that hydrates async submission rows.

## Why `getSubmissionByTitle` walks two parents

The `getSubmissionByTitle(title)` resolver is:

```ts
return this.page.locator('h3').filter({ hasText: title }).first().locator('..').locator('..');
```

It anchors on the per-submission `<h3>` heading
matching the title text, then walks **two parents
up** to land on the row-card container that hosts
the action buttons. Three load-bearing reasons:

1. **The production source renders submissions as
   `<article>` / `<div>` cards**, with the title in
   an `<h3>` heading nested inside a header `<div>`
   that itself sits inside the card root. Walking
   one parent lands on the header sub-tree (which
   does NOT include the action buttons); walking
   two parents lands on the card root (which
   includes both the header and the actions row).
2. **The `.first()` strict-mode-correctness append**
   on the `<h3>` Locator before the parent-walk
   defends against future "Recent submissions" /
   "Archived submissions" sibling lists that might
   render multiple `<h3>` elements with the same
   title across different sub-sections.
3. **The two-parent-walk is brittle by design** —
   it pins the production source's card-with-
   header-and-actions layout pattern. A contributor
   who restructures the submission card to a flatter
   (one parent walk needed) or deeper (three parents
   needed) hierarchy would surface here as an
   assertion failure on the consuming spec. A future
   migration to `data-testid="submission-row"` would
   be a one-line edit here that the change checklist
   below already anticipates.

## Why the row-action buttons use `button[title*="…"]`

The row-action buttons (`button[title*="iew"]` /
`button[title*="dit"]` / `button[title*="elete"]`)
resolve via the HTML `title` attribute's substring,
intentionally dropping the leading capital so that
"View" / "view" / "VIEW" all match. Three load-
bearing reasons:

1. **Production source emits `title="View submission"`
   etc. on the row-action icon buttons**, via the
   tooltip-rendering library the production source
   uses (HeroUI / Tailwind's tooltip primitive). The
   `title` attribute is a stable hook that survives
   icon-library swaps (e.g. switching from a
   per-icon-component to a generic icon-by-name
   wrapper).
2. **The leading-capital drop** (`iew` rather than
   `View`) defends against future case-style changes
   in the production source's tooltip text. A
   contributor who switches "View submission" to
   "view submission" or "VIEW SUBMISSION" would
   pass this Locator unchanged.
3. **The substring posture** survives a future
   tooltip-text refactor like "View submission
   details" / "Edit this submission" / "Delete
   submission permanently" without needing a
   driver update.

## Why the modal getters use re-evaluating getters

The three modal getters (`detailModal`, `editModal`,
`deleteDialog`) use TypeScript `get` accessors rather
than `readonly Locator` fields. Two load-bearing
reasons:

1. **Modals are unmounted / remounted across rows**:
   a `readonly Locator` field would capture a
   reference to the `[role="dialog"]` element that
   was present at construction time (none — the
   modals are not rendered until a row action is
   clicked). The `get` accessor re-evaluates the
   Locator on every read, picking up whichever modal
   is currently mounted in the DOM.
2. **Distinct scoping strategies per modal**:
   - `detailModal` uses bare `.first()` because the
     view modal is the simplest scope.
   - `editModal` uses `.filter({ has: this.page.locator('#name') })`
     because the edit form's `#name` input is the
     canonical disambiguator that distinguishes the
     edit modal from any other modal.
   - `deleteDialog` uses `.filter({ hasText: /delete/i })`
     because the body text is the canonical
     disambiguator for the delete-confirmation
     modal.

## Spec context

- **Spec contract**: covered by
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage).
- **Consuming specs**:
  - [`apps/web-e2e/tests/client/submissions.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submissions.spec.ts)
    — three flows: submit page loads for authenticated
    client, submissions list page loads for
    authenticated client, unauthenticated user is
    redirected from submissions to `/auth/signin`.
  - [`apps/web-e2e/tests/client/submit-and-manage.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submit-and-manage.spec.ts)
    — uses the `ClientSubmissionsPage` class with
    `getSubmissionByTitle(title)` /
    `viewSubmission(title)` / `editSubmission(title)` /
    `deleteSubmission(title)` to drive the submit-
    and-manage flow end-to-end (PR #621).
- **Sibling API smoke**: the submissions list is
  populated by
  [`apps/web/app/api/client/items/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/route.ts)
  (smoked at
  [`apps/web-e2e/tests/api/client-protected.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-protected.spec.ts))
  and per-item CRUD via
  [`apps/web/app/api/client/items/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/%5Bid%5D/route.ts).

## Failure matrix

| Mistake | Surface |
| --- | --- |
| Drop `import type { Page, Locator }` for runtime imports | TypeScript bundling error under strict mode |
| Remove `extends BasePage` | Loses `goto()`, `waitForPageReady()`, `header`, `footer`, `navLinks` — every consuming spec breaks |
| Drop `readonly` on any pre-bound Locator | A spec could rebind the field at runtime, breaking the strict-mode-correctness contract |
| Re-bind `heading` to a name match without `level: 1` | Multi-match error against future per-card H2 / H3 headings |
| Re-bind row-action buttons from `[title*="…"]` to `aria-label` without source-side wiring | Assertion failure on every consuming spec |
| Convert `getSubmissionByTitle(title)` to walk one parent | Action buttons no longer reachable from the row Locator |
| Convert `getSubmissionByTitle(title)` to walk three parents | Cross-row contamination — the row Locator overshoots into a list-container parent |
| Convert any modal getter to a `readonly Locator` field | Modal references stale on row-action remount |
| Drop the literal-union TypeScript type on `selectStatusFilter` parameter | Loses compile-time validation against future "draft" / "all-time" filter additions |
| Drop the start-anchor `^` from the regex inside `selectStatusFilter` | Substring drift — "Pending Review" matches "Review" |
| File rename to `.tsx` | TypeScript include glob mismatch — see [`e2e-tsconfig.md`](e2e-tsconfig.md) |
| File move out of `apps/web-e2e/page-objects/client/` | Breaks the relative `../base.page` import |
| CRLF line endings | Prettier reformat on next commit churns the file |

## Read / write surface

| Caller | Reads | Writes |
| --- | --- | --- |
| [`apps/web-e2e/tests/client/submissions.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submissions.spec.ts) | Drives the page directly via inline locators today — does NOT instantiate `ClientSubmissionsPage` | none |
| [`apps/web-e2e/tests/client/submit-and-manage.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submit-and-manage.spec.ts) | Instantiates `new ClientSubmissionsPage(clientPage)` and consumes `getSubmissionByTitle(title)` / `viewSubmission(title)` / `editSubmission(title)` / `deleteSubmission(title)` | none |
| Production source under [`apps/web/app/[locale]/client/submissions/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app) | Renders the H1 heading, the per-row `<h3>` titles + grandparent card containers, the `button[title="View …"]` / `button[title="Edit …"]` / `button[title="Delete …"]` action buttons, the `[role="dialog"]` view / edit / delete modals (with `#name` input scoped to the edit modal and "delete" body text scoped to the delete dialog), the status-filter tab buttons, the search input, and the new-submission / trash navigation links | none |
| [`base-page-object.md`](base-page-object.md) | `extends BasePage` exposes `goto()`, `waitForPageReady()`, `header`, `footer`, `navLinks` to consuming specs | none |
| [`e2e-tsconfig.md`](e2e-tsconfig.md) | The `include: ["./**/*.ts"]` glob picks up this file under `apps/web-e2e/page-objects/client/` | none |
| [`playwright-config.md`](playwright-config.md) | The `baseURL` is what the inherited `goto()` resolves the `/client/submissions` path against | none |
| [`fixtures-index.md`](fixtures-index.md) | A future fixture-bound `clientSubmissionsPage` would surface here — currently consuming specs use the `clientPage` authenticated-page fixture from [`auth-fixture.md`](auth-fixture.md) and instantiate the page object inline | none |

## Read / write surface failure modes

| Drift source | Surfaces as |
| --- | --- |
| Submission card restructure from two-parent-walk shape | `getSubmissionByTitle(title)` row Locator misses; per-row CRUD helpers fail |
| Row-action button `title` attribute removal in production | `viewSubmission` / `editSubmission` / `deleteSubmission` clicks miss |
| Status-filter tab text drift away from "all" / "pending" / "approved" / "rejected" prefix | `selectStatusFilter(status)` button click misses |
| Edit modal `#name` input rename | `editModal` getter loses scope; multi-match if other modals open |
| Delete dialog body-text drift away from /delete/i | `deleteDialog` getter loses scope |
| Search input `placeholder` change away from /earch/ substring | `searchInput` Locator misses |
| `[locale]/client/**` middleware redirect change | `navigate()` to `/client/submissions` resolves to `/auth/signin` for unauthenticated callers — consuming spec's "redirected to signin" flow exercises this |
| `baseURL` change in [`playwright-config.md`](playwright-config.md) | Every Locator in this file resolves against the wrong host |

## `submissions.page.ts`-change checklist

In a single PR:

1. Update [`docs/plugins/client-submissions-page-object.md`](client-submissions-page-object.md)
   in the same PR that touches the source file.
2. Update [`docs/log.md`](../log.md) with a one-line
   summary.
3. Cross-check the consuming specs at
   [`apps/web-e2e/tests/client/submissions.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submissions.spec.ts)
   and
   [`apps/web-e2e/tests/client/submit-and-manage.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submit-and-manage.spec.ts)
   for the per-row CRUD helper consumers.
4. Cross-check [`base-page-object.md`](base-page-object.md)
   for the inheritance root.
5. Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for
   the `include` glob.
6. Cross-check [`playwright-config.md`](playwright-config.md)
   for the `baseURL`.
7. Cross-check [`fixtures-index.md`](fixtures-index.md)
   for a future fixture-bound `clientSubmissionsPage`.
8. Cross-check the production source under
   [`apps/web/app/[locale]/client/submissions/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app)
   for the H1, per-row `<h3>` + grandparent card,
   row-action `[title]` attributes, view / edit /
   delete modals, status-filter tabs, search input,
   and navigation links.
9. Run dual `pnpm tsc --noEmit` (e2e + workspace root).
10. Run a smoke-subset Playwright run targeting the
    client submissions subset
    (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Client: Submissions"`)
    AND the submit-and-manage subset
    (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Client Submit"`).
11. If the change introduces a new shared concept,
    cross-link
    [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage).
12. Add a [`docs/log.md`](../log.md) entry.
13. Reviewer pass.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root every page object extends.
- [`e2e-tsconfig.md`](e2e-tsconfig.md) — the
  TypeScript include glob.
- [`playwright-config.md`](playwright-config.md) —
  the `baseURL` posture.
- [`fixtures-index.md`](fixtures-index.md) — the
  fixture barrel.
- [`auth-fixture.md`](auth-fixture.md) — the
  `clientPage` fixture documentation.
- [`client-dashboard-page-object.md`](client-dashboard-page-object.md),
  [`client-profile-page-object.md`](client-profile-page-object.md),
  [`client-settings-page-object.md`](client-settings-page-object.md) —
  sibling client-tree drivers.
- [`admin-tags-page-object.md`](admin-tags-page-object.md),
  [`admin-collections-page-object.md`](admin-collections-page-object.md) —
  admin-tree drivers with the per-row CRUD helper
  posture this driver mirrors.
- [`admin-comments-page-object.md`](admin-comments-page-object.md) —
  admin-tree driver with the `[role="dialog"]`
  delete-confirmation modal posture.
