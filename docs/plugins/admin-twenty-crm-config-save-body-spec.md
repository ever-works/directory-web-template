---
id: admin-twenty-crm-config-save-body-spec
title: E2E Admin Twenty CRM Config Save Body Spec (apps/web-e2e/tests/api/admin-twenty-crm-config-save-body.spec.ts)
sidebar_label: E2E Admin Twenty CRM Config Save Body Spec
sidebar_position: 551
---

# E2E Admin Twenty CRM Config Save Body Spec — `apps/web-e2e/tests/api/admin-twenty-crm-config-save-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin Twenty CRM config-save POST body / header smoke
spec** paired with
[`apps/web-e2e/tests/api/admin-twenty-crm-config-save-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-twenty-crm-config-save-body.spec.ts).

This is the **first admin-tree POST smoke** the docs tree
publishes that combines:
- the **compound single-`if` gate** `!session?.user?.
  isAdmin || !session.user.id` (matching `admin/sponsor-
  ads/[id]/approve` and `/reject` POST handlers but for a
  CRM-config-save endpoint),
- a **Zod-`safeParse`-like validation** via
  `validateTwentyCrmConfig(body)` that returns a custom
  `{ success, data | error }` shape and is translated to
  a `details: [{field, message}]` 400 envelope, AND
- a **`logActivity(...)` side-effect** that captures
  `request.headers.get('x-forwarded-for')` for the audit
  log.

The companion
[`admin-twenty-crm-config-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-twenty-crm-config-query.spec.ts)
covers the GET surface of the same route.

## Why this spec is the audit-logged CRM-config-save POST smoke

The route under test
([`apps/web/app/api/admin/twenty-crm/config/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/twenty-crm/config/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **Compound single-`if` gate** —
   `!session?.user?.isAdmin || !session.user.id` →
   401 `{ success: false, error: 'Unauthorized.
   Admin access required.' }`.
2. **Canonical longer 401 message** + **`success:
   false` envelope key**.
3. **JSON body parse via `await request.json()`**
   AFTER the gate.
4. **Custom Zod-like validation chain** —
   `validateTwentyCrmConfig(body)` returns
   `{ success: bool, data | error }`. On
   `!validation.success`, returns 400 `{ success:
   false, error: 'Validation failed', details:
   [{field, message}] }`. The first POST smoke that
   uses a custom Zod-like validator function (NOT
   the standard `safeParse(...)` / `parse(...)`
   API).
5. **`configRepository.saveConfig(validation.data,
   session.user.id)`** — the load-bearing CRM-
   config-save call.
6. **`logActivity(...)` side effect** AFTER the
   saveConfig call. Captures
   `request.headers.get('x-forwarded-for')` for
   audit logging — the first POST smoke that reads
   a request header for an audit side-effect.
7. **Success payload** — `{ success: true,
   message: 'Configuration saved successfully',
   data: <savedConfig> }` with status 200.
8. **Outer catch** — `console.error` + 500
   `{ success: false, error: 'Failed to save
   configuration' }`.
9. **Method-resolution surface** — the route
   exports `GET` and `POST`. `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~14 headers + ~11
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_TWENTY_CRM_CONFIG_SAVE_HEADERS) test(…)`                   | Bulk-loop walk of every plausible header shape (~14 headers, including `X-Forwarded-For` which would be captured by the audit log on the auth branch).             |
| `for (const { data, label } of ADMIN_TWENTY_CRM_CONFIG_SAVE_BODIES) test(…)`                       | Bulk-loop walk of every plausible body shape (~11 bodies covering invalid-URI / missing-fields / valid bodies / bypass shapes).                                      |
| `test('… returns 401 with the canonical longer Unauthorized envelope', …)`                         | Pins the canonical longer 401 envelope.                                                                                                                              |
| `test('… envelope shape has exactly success and error keys', …)`                                   | Strict envelope-shape assertion.                                                                                                                                    |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `data`, `details`, `message` must NOT appear.                                                                                          |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across three candidate static messages.                                                                                         |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… validation chain is NOT entered on the unauth branch', …)`                                | Pins the gate-before-validation order.                                                                                                                              |
| `test('… configRepository.saveConfig + logActivity are NOT entered on the unauth branch', …)`      | Pins the gate-before-saveConfig-and-logActivity order: the unauth response must NEVER echo `'Configuration saved successfully'` or a `data` key.                     |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~25 total) must round-trip to a
   `< 500` status.
2. **Canonical longer 401 envelope** on the unauth
   branch.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure** — `data`,
   `details`, `message` keys must NOT appear in any
   unauth response.
5. **Gate-before-post-auth invariant**.
6. **Status invariance across header / body
   permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance**.
9. **Gate-before-body-parse invariant**.
10. **Gate-before-validation invariant**.
11. **Gate-before-saveConfig-and-logActivity
    invariant**.

## See also

- The companion query-surface spec
  [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md)
  covers the GET surface of the same route.
- The sibling `admin/twenty-crm/test-connection` POST
  body smoke spec
  [`admin-twenty-crm-test-connection-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-twenty-crm-test-connection-body.spec.ts).
- The other compound-single-`if` POST smokes
  [`admin-sponsor-ads-id-approve-method-spec.md`](admin-sponsor-ads-id-approve-method-spec.md)
  and
  [`admin-sponsor-ads-id-reject-method-spec.md`](admin-sponsor-ads-id-reject-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the Twenty CRM config route
  sits inside.
