---
id: admin-clients-clientid-method-spec
title: E2E Admin Clients [clientId] Method Spec (apps/web-e2e/tests/api/admin-clients-clientid-method.spec.ts)
sidebar_label: E2E Admin Clients [clientId] Method Spec
sidebar_position: 525
---

# E2E Admin Clients [clientId] Method Spec — `apps/web-e2e/tests/api/admin-clients-clientid-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin single-client profile CRUD GET / PUT / DELETE
method / clientId / body / header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-clients-clientid-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-clients-clientid-method.spec.ts).

This is the **second triple-method admin-tree smoke** the
docs tree publishes (after
[`admin-items-id-method-spec.md`](admin-items-id-method-spec.md)),
but the **first** that exposes the bare
`{ error: 'Unauthorized' }` envelope (NO `success: false`
key) AND uses a non-canonical `[clientId]` dynamic-segment
param name.

## Why this spec is the bare-envelope triple-method smoke

The route under test
([`apps/web/app/api/admin/clients/[clientId]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/clients/[clientId]/route.ts))
exports `GET`, `PUT`, and `DELETE` from a single file. All
three handlers share the SAME single-step inline
`!session?.user?.isAdmin` gate, but the 401 envelope is the
**bare** `{ error: 'Unauthorized' }` (NO `success: false`
key) — distinct from every prior dynamic-segment-`[id]`
admin smoke.

| Surface                            | This route (`/api/admin/clients/{clientId}`) | Sibling route (`/api/admin/items/{id}`)                                |
| ---------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| Methods exported                   | `GET` + `PUT` + `DELETE`                     | `GET` + `PUT` + `DELETE`                                                |
| Dynamic-segment param name         | `[clientId]` (non-canonical)                 | `[id]` (canonical)                                                      |
| 401 envelope                       | `{ error: 'Unauthorized' }` (NO `success` key) | `{ success: false, error: 'Unauthorized. Admin access required.' }` (canonical longer) |
| 401 message                        | Bare `'Unauthorized'`                        | Canonical longer `'Unauthorized. Admin access required.'`                |
| Service-layer abstraction          | Direct query functions (`getClientProfileById` / `updateClientProfile` / `deleteClientProfile` from `@/lib/db/queries`) | `ItemRepository` class                                                  |
| Catch posture                      | `console.error` + bare `{ error: '<msg>' }`  | `safeErrorResponse(error, '<msg>')`                                     |
| Per-handler catch messages         | `'Failed to fetch client'` / `'Failed to update client'` / `'Failed to delete client'` | `'Failed to fetch item'` / `'Failed to update item'` / `'Failed to delete item'` |
| GET success payload                | `{ success: true, data: <client> }`          | `{ success: true, data: <item> }`                                       |
| PUT success payload                | `{ success: true, data: <client> }` (NO `message` key) | `{ success: true, data: <item>, message: 'Item updated successfully' }` (with `message`) |
| DELETE success payload             | `{ success: true, message: 'Client deleted successfully' }` (NO `data` key) | `{ success: true, message: 'Item deleted successfully' }` (NO `data` key) |
| CRM sync side-effect on PUT        | Two-step (company → person) chain            | Single-step (company-only)                                              |
| Location Index side-effect         | None                                         | On PUT (re-index) and DELETE (remove)                                   |

## How the spec walks its scenario tree

The spec emits **three method-bulk-loop walks** across
clientId shapes, **three method-bulk-loop walks** across
header shapes, **one body-bulk-loop walk** for `PUT`, and a
suite of **fifteen hand-written scenarios** — together
asserting the `< 500` invariant on every permutation, the
per-handler bare-envelope contract on the unauth branch,
the cross-method envelope-equality invariant, and the
gate-before-post-auth invariant across all five candidate
post-auth messages.

| Block                                                                                                  | Purpose                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const clientId of CLIENT_IDS) test('GET' / 'PUT' / 'DELETE' …)`                                  | Bulk-loop walk of every plausible clientId shape (~6 ids) × three methods.                                                                                          |
| `for (const { headers, label } of COMMON_HEADERS) test('GET' / 'PUT' / 'DELETE' …)`                    | Bulk-loop walk of every plausible header shape (~17 headers) × three methods.                                                                                       |
| `for (const { data, label } of PUT_BODIES) test('PUT' …)`                                              | Bulk-loop walk of every plausible PUT body shape (~17 bodies, including update-shape probes for `displayName`, `username`, `bio`, `jobTitle`, `company`, `website`, `status`, `plan`, `accountType`, plus bypass attempts). |
| `test('GET … returns 401 with the bare Unauthorized envelope (NOT the canonical longer envelope)', …)` | Pins the bare 401 envelope for `GET` and the divergence vs the canonical longer envelope.                                                                            |
| `test('PUT … returns 401 with the bare Unauthorized envelope (NOT the canonical longer envelope)', …)` | Pins the bare 401 envelope for `PUT`.                                                                                                                                |
| `test('DELETE … returns 401 with the bare Unauthorized envelope (NOT the canonical longer envelope)', …)` | Pins the bare 401 envelope for `DELETE`.                                                                                                                          |
| `test('GET / PUT / DELETE … unauth envelope has NO success key', …)`                                   | Strict envelope-shape assertion across all three methods: `Object.keys(body) === ['error']`, with `body.success` undefined.                                          |
| `test('GET / PUT / DELETE … share the SAME 401 envelope shape on the unauth branch', …)`               | Cross-method envelope-equality assertion.                                                                                                                            |
| `test('GET / PUT / DELETE … does NOT echo the success-branch keys on the unauth branch', …)`           | Negative-property assertion: `data`, `message`, `success: true` must NOT appear.                                                                                    |
| `test('GET / PUT / DELETE … does NOT echo any of the post-auth messages on the unauth branch', …)`     | Pins the gate-before-post-auth order across five candidate messages.                                                                                                |
| `test('GET / PUT / DELETE … has a stable status across distinct clientId shapes', …)`                  | Pins the gate-before-params-resolution order across all three methods.                                                                                              |
| `test('PUT … has a stable status across body permutations', …)`                                        | Seven body permutations vs the no-body baseline.                                                                                                                     |
| `test('GET / PUT / DELETE … does NOT branch on side-channel cookies / headers', …)`                    | Side-channel walk across all three methods.                                                                                                                          |
| `test('… cross-method probe (POST / PATCH) does NOT 5xx', …)`                                          | Method-resolution walk: POST / PATCH against the route round-trip to `< 500`.                                                                                        |
| `test('PUT … is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('GET / PUT / DELETE … service call is NOT entered on the unauth branch', …)`                     | Pins the gate-before-service order across all three query-function calls.                                                                                            |
| `test('GET / PUT / DELETE … unauth response does NOT echo any of the per-handler catch messages', …)`  | Pins the per-handler catch-message divergence.                                                                                                                       |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every clientId ×
   method permutation, every header × method permutation,
   and every PUT body permutation (~~6×3 + 17×3 + 17 = ~86
   total) must round-trip to a `< 500` status.
2. **Bare 401 envelope on the unauth branch** for each
   of `GET`, `PUT`, and `DELETE` — exact match
   `{ error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation** —
   `Object.keys(body) === ['error']`, with `body.success`
   undefined.
4. **Cross-method envelope equality** — all three
   handlers must emit byte-identical 401 envelopes.
5. **Success-branch-key non-disclosure** across all
   three methods — no `data`, `message`, or
   `success: true` must appear in any unauth response.
6. **Gate-before-post-auth invariant** — none of
   `'Client not found'`, `'Failed to fetch client'`,
   `'Failed to update client'`, `'Failed to delete
   client'`, `'Client deleted successfully'` must
   appear in any unauth response.
7. **Status invariance across distinct clientId shapes**
   for each of the three methods.
8. **Status invariance across PUT body permutations**.
9. **Side-channel isolation** across all three methods.
10. **Cross-method invariance** — `POST` and `PATCH`
    against the route round-trip to a `< 500` status.
11. **Gate-before-body-parse invariant** — malformed
    JSON bodies must NOT 500 with a parse error before
    the gate fires (the PUT body parse is NOT wrapped
    in a per-call try/catch, so a malformed body would
    actually 500 via the outer `console.error` catch
    on the auth branch).
12. **Gate-before-service invariant** across all three
    query-function calls.
13. **Per-handler catch-message divergence** — a
    regression that swapped any of the three would
    surface as the wrong message echoing on the auth
    branch; the unauth branch must NOT echo any of the
    three.

## See also

- [`smoke-health-spec.md`](smoke-health-spec.md) and
  [`smoke-navigation-spec.md`](smoke-navigation-spec.md)
  — sibling per-spec-file references (the **first two**
  under `tests/smoke/`).
- The full set of sibling per-spec-file references under
  `tests/api/`, including the canonical-longer-envelope
  triple-method
  [`admin-items-id-method-spec.md`](admin-items-id-method-spec.md),
  the dual-method
  [`admin-roles-id-permissions-method-spec.md`](admin-roles-id-permissions-method-spec.md),
  and the bare-envelope dynamic-segment
  [`admin-notifications-id-read-method-spec.md`](admin-notifications-id-read-method-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the single-client profile CRUD
  route sits inside.
