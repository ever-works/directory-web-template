---
id: admin-navigation-update-method-spec
title: E2E Admin Navigation Update Method Spec (apps/web-e2e/tests/api/admin-navigation-update-method.spec.ts)
sidebar_label: E2E Admin Navigation Update Method Spec
sidebar_position: 552
---

# E2E Admin Navigation Update Method Spec — `apps/web-e2e/tests/api/admin-navigation-update-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin navigation-update PATCH body / header smoke
spec** paired with
[`apps/web-e2e/tests/api/admin-navigation-update-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-navigation-update-method.spec.ts).

This is the **second admin-tree smoke** the docs tree
publishes that uses `getCachedApiSession(req)` instead
of `auth()` (after `admin/settings` PATCH). It is also
the **first PATCH-only admin-tree smoke** that pins a
**per-item path-format XSS-prevention validation
loop** via `isValidNavigationPath(item.path)`.

## Why this spec is the per-item-XSS-prevention navigation-update PATCH smoke

The route under test
([`apps/web/app/api/admin/navigation/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/navigation/route.ts))
exports `GET` and `PATCH`. The PATCH handler combines:

1. **`getCachedApiSession(req)` session lookup** —
   matching `admin/settings` PATCH.
2. **Single-step `!session?.user?.isAdmin` gate** →
   401 `{ error: 'Unauthorized' }` (BARE envelope,
   NO `success` key, SHORT message).
3. **JSON body parse via `await req.json()`** AFTER
   the gate.
4. **`type` enum check** — `if (!type || (type !==
   'header' && type !== 'footer'))` → 400 `{ error:
   'Type must be "header" or "footer"' }`.
5. **`items` array check** — `if
   (!Array.isArray(items))` → 400 `{ error: 'Items
   must be an array' }`.
6. **Per-item structure validation loop** — every
   item must have non-empty `label` and `path` string
   fields → 400 `{ error: 'Each item must have non-
   empty "label" and "path" string fields' }`.
7. **Per-item path-format XSS-prevention
   validation** — `isValidNavigationPath(item.
   path)` → 400 `{ error: 'Invalid path format.
   Paths must start with "/" for internal routes
   or "http://"/"https://" for external URLs.' }`.
   The first PATCH smoke with a per-item XSS-
   prevention validation in a loop.
8. **`configManager.updateNestedKey(key, items)`**
   — the load-bearing config.yml write. `key` is
   `'custom_header'` or `'custom_footer'` based on
   `type`.
9. **Update-failed branch** — if `success` is
   falsy, returns 500 `{ error: 'Failed to update
   navigation' }`.
10. **Success payload** — `{ success: true, type,
    items }` with status 200. UNIQUE: echoes both
    `type` and `items` from the input.
11. **Outer catch** — `console.error` + 500
    `{ error: 'Failed to update navigation' }`.
12. **Method-resolution surface** — the route
    exports `GET` and `PATCH`. `POST` / `PUT` /
    `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~14 headers + ~13
bodies) and **eleven hand-written scenarios**.

| Block                                                                                         | Purpose                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of ADMIN_NAVIGATION_UPDATE_HEADERS) test(…)`                   | Bulk-loop walk of every plausible header shape (~14 headers).                                                                                                        |
| `for (const { data, label } of ADMIN_NAVIGATION_UPDATE_BODIES) test(…)`                       | Bulk-loop walk of every plausible body shape (~13 bodies covering type-enum / items-array / per-item validation / XSS-prevention / valid bodies).                    |
| `test('… returns 401 with the bare Unauthorized envelope', …)`                                | Pins the bare 401 envelope `{ error: 'Unauthorized' }`.                                                                                                              |
| `test('… envelope shape has exactly one error key', …)`                                       | Strict envelope-shape assertion.                                                                                                                                     |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                     | Negative-property assertion: `success`, `type`, `items` must NOT appear.                                                                                             |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`               | Pins the gate-before-post-auth order across five candidate static messages.                                                                                          |
| `test('… has a stable status across body permutations', …)`                                   | Six body permutations vs the no-body baseline.                                                                                                                       |
| `test('… does NOT branch on side-channel cookies / headers', …)`                              | Side-channel walk.                                                                                                                                                   |
| `test('… cross-method probe (POST / PUT / DELETE) does NOT 5xx', …)`                          | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                     | Pins the gate-before-body-parse order.                                                                                                                               |
| `test('… type-enum and items-array checks are NOT entered on the unauth branch', …)`          | Pins the gate-before-validation order.                                                                                                                               |
| `test('… per-item XSS-prevention loop is NOT entered on the unauth branch', …)`               | Pins the gate-before-XSS-prevention order: the unauth response must NEVER echo `'Invalid path format.'`.                                                             |
| `test('… configManager.updateNestedKey is NOT entered on the unauth branch', …)`              | Pins the gate-before-configManager-update order: the unauth response must NEVER echo a `type` or `items` key from the input.                                         |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~27 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope** on the unauth branch.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — `success`,
   `type`, `items` keys must NOT appear in any
   unauth response.
5. **Gate-before-post-auth invariant**.
6. **Status invariance across body permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance**.
9. **Gate-before-body-parse invariant**.
10. **Gate-before-validation invariant** for type-
    enum and items-array.
11. **Gate-before-XSS-prevention invariant** for
    per-item path validation.
12. **Gate-before-configManager-update invariant**.

## See also

- The settings-update PATCH companion
  [`admin-settings-update-method-spec.md`](admin-settings-update-method-spec.md)
  is the FIRST cached-session-lookup PATCH config-
  write admin-tree smoke; this navigation-update
  PATCH smoke is the SECOND.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the navigation-update route
  sits inside.
