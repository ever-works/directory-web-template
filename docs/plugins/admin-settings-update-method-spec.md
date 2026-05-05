---
id: admin-settings-update-method-spec
title: E2E Admin Settings Update Method Spec (apps/web-e2e/tests/api/admin-settings-update-method.spec.ts)
sidebar_label: E2E Admin Settings Update Method Spec
sidebar_position: 548
---

# E2E Admin Settings Update Method Spec — `apps/web-e2e/tests/api/admin-settings-update-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin settings-update PATCH body / header smoke spec**
paired with
[`apps/web-e2e/tests/api/admin-settings-update-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-settings-update-method.spec.ts).

This is the **first PATCH-only collection-level config-
write admin-tree smoke** the docs tree publishes. It is
also the **first** admin-tree smoke that uses
`getCachedApiSession(req)` instead of `auth()` — a
cached-session-lookup variant that is distinct from every
prior smoke.

## Why this spec is the cached-session-lookup config-write smoke

The route under test
([`apps/web/app/api/admin/settings/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/settings/route.ts))
exports `GET` and `PATCH`. The PATCH handler combines:

1. **`getCachedApiSession(req)` session lookup** —
   distinct from `auth()` which every prior admin
   smoke uses. The cached-session lookup path is a
   performance optimization but functionally
   equivalent on the unauth branch.
2. **Single-step `!session?.user?.isAdmin` gate** →
   401 `{ error: 'Unauthorized' }` (BARE envelope, NO
   `success` key, SHORT message).
3. **JSON body parse via `await req.json()`** AFTER
   the gate. NOT wrapped in a per-call try/catch.
4. **Single-field required check** — `if (!key)` →
   400 `{ error: 'Key is required' }`.
5. **`configManager.updateNestedKey('settings.${key}',
   value)`** — the load-bearing config-write. Updates
   a nested key under `settings.*` in the config.yml
   file.
6. **Update-failed branch** — if `success` is falsy,
   returns 500 `{ error: 'Failed to update setting' }`.
7. **Success payload** — `{ success: true, key,
   value }` with status 200. UNIQUE: echoes the `key`
   and `value` from the input body.
8. **Outer catch** — `console.error` + 500 `{ error:
   'Failed to update settings' }`.
9. **Method-resolution surface** — the route exports
   `GET` and `PATCH`. `POST` / `PUT` / `DELETE` must
   round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~14 headers + ~16
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_SETTINGS_UPDATE_HEADERS) test(…)`                          | Bulk-loop walk of every plausible header shape (~14 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_SETTINGS_UPDATE_BODIES) test(…)`                              | Bulk-loop walk of every plausible body shape (~16 bodies covering missing-key probes, valid bodies with numeric / string / boolean / object / array / null values, plus bypass shapes). |
| `test('… returns 401 with the bare Unauthorized envelope (NOT canonical longer)', …)`              | Pins the bare 401 envelope.                                                                                                                                          |
| `test('… unauth envelope has NO success key', …)`                                                  | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `success`, `key`, `value` must NOT appear.                                                                                              |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across three candidate static messages.                                                                                        |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (POST / PUT / DELETE) does NOT 5xx', …)`                               | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… required-key check is NOT entered on the unauth branch', …)`                              | Pins the gate-before-required-key-check order.                                                                                                                      |
| `test('… configManager update is NOT entered on the unauth branch', …)`                            | Pins the gate-before-configManager-update order: the unauth response must NEVER echo a `key` or `value` from the input.                                              |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~30 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope on the unauth branch** —
   exact match `{ error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — the
   `success`, `key`, `value` keys must NOT appear in
   any unauth response.
5. **Gate-before-post-auth invariant**.
6. **Status invariance across header / body
   permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance**.
9. **Gate-before-body-parse invariant**.
10. **Gate-before-required-key-check invariant**.
11. **Gate-before-configManager-update invariant** —
    the unauth response must NEVER echo a `key` or
    `value` from the input.

## See also

- The companion query-surface spec
  [`admin-settings-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-settings-query.spec.ts)
  covers the GET surface of the same route.
- The map-status sub-route
  [`admin-settings-map-status-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-settings-map-status-query.spec.ts).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the settings collection
  route sits inside.
