---
id: admin-roles-page-object
title: E2E Admin Roles Page Object (apps/web-e2e/page-objects/admin/roles.page.ts)
sidebar_label: E2E Admin Roles Page Object
sidebar_position: 412
---

# E2E Admin Roles Page Object — `apps/web-e2e/page-objects/admin/roles.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin roles-management** driver paired with
[`apps/web-e2e/page-objects/admin/roles.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/roles.page.ts).
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
`settings.page.ts`, `sponsorships.page.ts`,
`surveys.page.ts`, `tags.page.ts`).

This page is the **thirteenth per-source-file reference**
the docs tree publishes for any file under
`apps/web-e2e/page-objects/admin/` and the **first**
admin-tree driver in the rollout that documents:

- A **`<select>`-anchored dual-filter surface** for
  status and role-type — distinct from every prior
  admin-tree driver in the rollout, which pin status
  filters via either `getByRole('tab')` (items, clients,
  comments, companies, collections) or
  `getByRole('button')` (reports). The roles page
  emits each filter as a native HTML `<select>`
  element, and the driver locates them positionally:
  `selectStatusFilter(status)` resolves to the first
  `<select>` on the page via
  `page.locator('select').first()`, and
  `selectTypeFilter(type)` resolves to the second via
  `page.locator('select').nth(1)`. Both helpers
  lower-case the input before passing it to
  `selectOption(...)`. The positional-`<select>`
  posture is fragile against the page-source-stable
  ordering of the two `<select>` elements; a
  contributor who reorders the filters or inserts a
  third `<select>` between them will break both
  helpers. The trade-off the driver explicitly
  accepts: the roles page does not emit a
  `data-testid` / `name` / `id` attribute on either
  `<select>`, so positional resolution is the
  smallest hook that works against the production
  source today.
- A **modal-overlay-getter triplet** — `roleFormModal`,
  `deleteRoleDialog`, `permissionsModal` — pinned to
  the **`.fixed.inset-0.z-50` Tailwind-utility-stack
  selector** rather than the `[role="dialog"]` /
  `[aria-modal="true"]` accessibility-tree-canonical
  selectors every prior admin-tree driver uses. The
  roles page emits each modal as a `<div>` with the
  `fixed inset-0 z-50` Tailwind utility class
  composition, NOT a `[role="dialog"]` /
  `[aria-modal="true"]` ARIA-tree-canonical surface.
  The `.fixed.inset-0.z-50` selector is the
  production-source-stable hook today, but a
  regression that switches the role modal to a
  HeroUI Modal component (which would emit
  `[role="dialog"]` / `[aria-modal="true"]` instead
  of the bare Tailwind-utility-stack) would silently
  break all three getters at once. The trade-off the
  driver explicitly accepts: pin to the current
  Tailwind-utility-stack today, document the
  expected migration path, and update all three
  getters in lockstep when the page source migrates
  to a HeroUI Modal.
- A **`.filter({ hasText: ... })` chained Locator
  posture** for the two specialised modal getters
  (`deleteRoleDialog` filters the `.fixed.inset-0.z-50`
  base by case-insensitive `/delete/i` substring,
  `permissionsModal` filters the same base by
  case-insensitive `/permission/i` substring) — the
  **first** admin-tree driver in the rollout to use
  the `Locator.filter({ hasText })` chained Locator
  posture for modal disambiguation. Distinct from
  the items driver's `rejectModal` posture (which
  pins to the bare `[role="dialog"][aria-modal="true"]`
  selector) and from the reports driver's
  `reviewDialog` posture (which pins to the bare
  `[role="dialog"]` selector). The text-substring
  filter posture lets multiple modals coexist on the
  same page (e.g. the role form modal AND the
  delete-confirmation modal both rendered at once
  during a delete-after-edit flow) without
  ambiguity, but trades off against a future i18n
  rollout that might localise the "Delete" /
  "Permissions" text — at which point the filter
  text would need to migrate to an i18n-key /
  `data-testid` anchor.
- A **`searchRoles(term)` flow helper that does NOT
  trigger search submission** — the helper just
  fills the input and returns; the consuming spec at
  [`apps/web-e2e/tests/admin/roles.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/roles.spec.ts)
  uses `await rolesPage.searchRoles('admin'); await
  adminPage.waitForTimeout(500);` to give the
  debounced live-search 500ms to fire after the
  fill. Distinct from prior admin-tree driver search
  helpers which most often submit via Enter keypress
  or rely on a debounce that fires inside Playwright's
  auto-wait. The fire-and-forget posture is
  load-bearing for the roles page because the
  search input is wired to a debounced live-search
  hook (NOT a submit-on-Enter form), and the
  consuming spec must wait the debounce window
  explicitly.
- A **bare `getByRole('heading').first()` heading
  resolver** without an accessible-name regex — the
  roles page emits multiple `<h1>` / `<h2>` /
  `<h3>` elements on first paint, so the
  positional-first heading posture is the canonical
  resolver. This is the same posture the
  reports / clients / collections / dashboard
  drivers use; the roles driver inherits it
  unchanged for cross-driver consistency.
- A **bare `page.getByRole('button', { name: /add role/i }).first()`
  add-button resolver** — distinct from the
  collections driver's
  `getByRole('button', { name: /add|new collection|create/i })`
  posture (which uses an alternation regex to
  tolerate the page's three rendered button labels).
  The roles page emits exactly one "Add Role"
  button on first paint, so the bare `/add role/i`
  regex is sufficient. A regression that switches
  the button label to "New Role" / "Create Role" /
  "+ Add" would silently break the helper — the
  trade-off the driver explicitly accepts: pin to
  the current label today, document the expected
  migration path.
- A **`<input type="text">` first-element search
  resolver** (`page.locator('input[type="text"]').first()`)
  — the roles page emits the search input as a
  bare `<input type="text">` element, NOT a
  `<input type="search">` (which would resolve via
  `getByRole('searchbox')`). The first-element
  positional resolver is the canonical hook today;
  a contributor who inserts a non-search
  `<input type="text">` before the search input
  (e.g. a hidden form field) would silently break
  the helper. The trade-off the driver explicitly
  accepts: pin to the current page-source-stable
  ordering today, document the expected migration
  path to a `[role="searchbox"]` / `data-testid`
  anchor.

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's admin roles-management
driver boundary** at `/admin/roles` — the smallest
possible page object that lets a spec drive the admin
roles page end-to-end (navigate to `/admin/roles`,
locate the page heading via the inherited-default
`getByRole('heading').first()` posture, locate the
"Add Role" button via the case-insensitive
`/add role/i` accessible-name regex, locate the search
input as the first `<input type="text">` on the page,
fill the search input via the `searchRoles(term)`
helper, select a status filter via the first
`<select>` element, select a role-type filter via the
second `<select>` element, locate the role-form modal
overlay via the `.fixed.inset-0.z-50` Tailwind-utility-stack
selector, locate the delete-role dialog by
filtering the same base by case-insensitive
`/delete/i` substring, and locate the permissions
modal by filtering the same base by case-insensitive
`/permission/i` substring).

## What this page object enables

The driver currently surfaces eight Locator-typed
getters / properties and three flow helpers:

| Member | Type | Purpose |
| --- | --- | --- |
| `heading` | `Locator` | Inherited-default `getByRole('heading').first()` resolver — the canonical page-heading anchor every admin-tree driver uses. |
| `addRoleButton` | `Locator` | `getByRole('button', { name: /add role/i }).first()` — the "Add Role" trigger that opens the role-form modal. |
| `searchInput` | `Locator` | `page.locator('input[type="text"]').first()` — the live-search input wired to a debounced search hook. |
| `roleFormModal` | `Locator` (getter) | `page.locator('.fixed.inset-0.z-50').first()` — the role-form modal overlay (used for both create and edit flows). |
| `deleteRoleDialog` | `Locator` (getter) | `page.locator('.fixed.inset-0.z-50').filter({ hasText: /delete/i })` — the delete-role confirmation dialog. |
| `permissionsModal` | `Locator` (getter) | `page.locator('.fixed.inset-0.z-50').filter({ hasText: /permission/i })` — the role-permissions edit modal. |
| `navigate()` | `() => Promise<void>` | Inherited `goto('/admin/roles')` — the canonical navigation entry point for the consuming spec. |
| `searchRoles(term)` | `(term: string) => Promise<void>` | Fire-and-forget live-search fill — fills the search input but does NOT submit; consumer must wait the debounce window. |
| `selectStatusFilter(status)` | `(status: string) => Promise<void>` | Lower-cases the input and calls `selectOption(...)` on the first `<select>` (positional resolution). |
| `selectTypeFilter(type)` | `(type: string) => Promise<void>` | Lower-cases the input and calls `selectOption(...)` on the second `<select>` (positional resolution). |

## Cross-references

- Inheritance root: [`base-page-object.md`](base-page-object.md)
- Sibling admin-tree page objects:
  [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
  [`admin-clients-page-object.md`](admin-clients-page-object.md),
  [`admin-collections-page-object.md`](admin-collections-page-object.md),
  [`admin-comments-page-object.md`](admin-comments-page-object.md),
  [`admin-companies-page-object.md`](admin-companies-page-object.md),
  [`admin-dashboard-page-object.md`](admin-dashboard-page-object.md),
  [`admin-data-export-page-object.md`](admin-data-export-page-object.md),
  [`admin-featured-items-page-object.md`](admin-featured-items-page-object.md),
  [`admin-item-form-page-object.md`](admin-item-form-page-object.md),
  [`admin-items-page-object.md`](admin-items-page-object.md),
  [`admin-notifications-page-object.md`](admin-notifications-page-object.md),
  [`admin-reports-page-object.md`](admin-reports-page-object.md).
- Consuming spec:
  [`apps/web-e2e/tests/admin/roles.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/roles.spec.ts)
  (four flows over the admin roles management surface
  — admin can access roles management page, roles
  page displays stats cards, admin can search roles,
  admin can open add role form modal).
- Co-tenant smoke spec:
  [`apps/web-e2e/tests/api/admin-roles-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-stats-query.spec.ts)
  pinning the route-side two-step gate behind the
  driver (`session?.user` → 401 'Unauthorized', then
  `session.user.isAdmin` → 403 'Forbidden') for
  `/api/admin/roles/stats`. Distinct from the
  reports route's single-step `!session?.user?.isAdmin`
  → 403 'Forbidden' gate and from the clients /
  comments / companies / users routes' single-step
  `!session?.user?.isAdmin` → 401 'Unauthorized' gate.

## Expected change protocol

When the source file changes (a new Locator getter, a
new flow helper, a `data-testid` migration of the
positional-`<select>` postures, a HeroUI-Modal
migration of the `.fixed.inset-0.z-50` posture, or any
refactor that affects the public method surface of the
class):

1. Update this page in the **same PR** that touches
   the source file.
2. Add a one-line entry to [`docs/log.md`](../log.md)
   under the current date.
3. Cross-check the consuming spec at
   `apps/web-e2e/tests/admin/roles.spec.ts` for the
   four-flow envelope (admin can access roles, roles
   page displays stats cards, admin can search
   roles, admin can open add role form modal) — the
   spec must continue to pass against the updated
   driver.
4. Cross-check `e2e-tsconfig.md` for the `include`
   glob — the page-object source file must remain
   inside the e2e tsconfig's `include` glob.
5. Cross-check `playwright-config.md` for the
   `baseURL` and `adminPage` fixture binding — the
   driver consumes the `adminPage` fixture defined
   in `apps/web-e2e/fixtures/index.ts`.
6. Cross-check `fixtures-index.md` for a future
   fixture-bound roles driver — the driver could
   eventually be fixture-bound (so the spec doesn't
   need to instantiate it manually).
7. Run dual `pnpm tsc --noEmit` (one in
   `apps/web-e2e/`, one in `apps/web/` — the page-
   object source file lives in `apps/web-e2e/` but
   imports types from `@playwright/test` only).
8. Run a smoke-subset Playwright run targeting the
   roles spec subset:
   `pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Roles"`.
9. Add a [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
   cross-link if the change introduces a new shared
   concept that affects test authoring (e.g. a new
   modal-getter pattern, a new
   positional-`<select>` resolution helper, a new
   debounce-window flow helper).
10. Run a reviewer pass.
