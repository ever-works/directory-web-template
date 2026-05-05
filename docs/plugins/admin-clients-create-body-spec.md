---
id: admin-clients-create-body-spec
title: E2E Admin Clients Create Body Spec (apps/web-e2e/tests/api/admin-clients-create-body.spec.ts)
sidebar_label: E2E Admin Clients Create Body Spec
sidebar_position: 541
---

# E2E Admin Clients Create Body Spec — `apps/web-e2e/tests/api/admin-clients-create-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**admin collection-level client-create POST body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/admin-clients-create-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-clients-create-body.spec.ts).

This is the **first POST-only collection-level admin-tree
smoke** the docs tree publishes that combines the **bare
`{ error: 'Unauthorized' }` envelope** (NO `success` key
— matching the `admin/clients/[clientId]` smoke and
`admin/companies/[id]`) with a **get-or-create user side-
effect chain** that uses `crypto.randomBytes(6)` to
generate a temporary password for newly-created users
AND a **status-200 success branch** (NOT 201, distinct
from every prior collection-level POST smoke).

## Why this spec is the bare-envelope-with-get-or-create-user collection-level POST smoke

The route under test
([`apps/web/app/api/admin/clients/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/clients/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **Single-step inline `!session?.user?.isAdmin`
   gate** → 401 `{ error: 'Unauthorized' }` (BARE
   envelope, NO `success` key).
2. **JSON body parse via `await request.json()`** AFTER
   the gate. NOT wrapped in a per-call try/catch.
3. **Email-or-userId fallback** — `const email =
   raw.email ?? raw.userId`. Distinct from prior POST
   smokes that have a single named required field.
4. **Single-field required check** — `if (!email)` →
   400 `{ error: 'Email is required' }` (bare envelope,
   no `success` key).
5. **`getUserByEmail(email)` lookup** to find an
   existing user with the given email.
6. **Inner-try/catch user-create branch** — if no
   existing user found, calls
   `UserDbService.createUser({ email, password:
   tempPassword })` with a `crypto.randomBytes(6)`-
   generated temporary password (`Temp<hex>!`). On
   failure: 400 with **dynamically-interpolated**
   message `'Failed to create user: <err.message>'`.
7. **Get-or-create fallback validation** — `if (!user
   || !user.id)` → 400 `{ error: 'Failed to create or
   find user for client' }`.
8. **`createClientProfile(clientData)` call** with
   defaults `status = 'active'`, `plan = 'free'`,
   `accountType = 'individual'`.
9. **Optional CRM sync side-effect** gated by
   `process.env.TWENTY_CRM_ENABLED !== 'false'`,
   wrapped in its own try/catch. Calls
   `mapClientProfileToPerson(newClient)` and
   `syncService.upsertPerson(personPayload)`.
10. **Success payload** — `{ success: true, data:
    <client>, message: 'Client created successfully' }`
    with status **200** (NOT 201). Distinct from prior
    collection-level POST smokes which return 201.
11. **Outer catch** — 500 `{ error: 'Failed to create
    client' }` (BARE envelope, NO `success` key).
12. **Method-resolution surface** — the route exports
    `GET` and `POST`. `PUT` / `PATCH` / `DELETE` must
    round-trip to a `< 500` status.

## Cross-route POST envelope/success-key matrix (extended)

| Route                                          | 401 envelope                                                | Success-key       | Success status | Success message                            |
| ---------------------------------------------- | ----------------------------------------------------------- | ----------------- | -------------- | ------------------------------------------ |
| `POST /api/admin/clients` (this spec)          | **Bare** `{ error: 'Unauthorized' }`                          | `data`            | **200**        | `'Client created successfully'`             |
| `POST /api/admin/tags`                         | Hybrid `{ success: false, error: 'Unauthorized' }`           | `tag`             | 201            | NONE                                        |
| `POST /api/admin/categories`                   | Canonical longer                                             | `category`        | 201            | `'Category created successfully'`           |
| `POST /api/admin/collections`                  | Canonical longer                                             | `collection`      | 201            | `'Collection created successfully'`         |
| `POST /api/admin/items`                        | Canonical longer                                             | `data`            | 201            | NONE (data is the item)                     |
| `POST /api/admin/users`                        | Hybrid                                                       | `data`            | 201            | NONE (data is the user)                     |

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~17 headers + ~14
bodies) and **eleven hand-written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ADMIN_CLIENTS_CREATE_HEADERS) test(…)`                           | Bulk-loop walk of every plausible header shape (~17 headers).                                                                                                       |
| `for (const { data, label } of ADMIN_CLIENTS_CREATE_BODIES) test(…)`                               | Bulk-loop walk of every plausible body shape (~14 bodies covering missing-email probes, valid bodies with displayName / username / bio / jobTitle / company / status / plan / accountType, plus bypass shapes). |
| `test('… returns 401 with the bare Unauthorized envelope (NOT canonical longer)', …)`              | Pins the bare 401 envelope and the divergence vs the canonical longer envelope.                                                                                       |
| `test('… unauth envelope has NO success key', …)`                                                  | Strict envelope-shape assertion: `Object.keys(body) === ['error']`, with `body.success` undefined.                                                                  |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                          | Negative-property assertion: `data`, `success`, `message` keys must NOT appear.                                                                                       |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                    | Pins the gate-before-post-auth order across four static post-auth messages plus the dynamic `'Failed to create user: ...'` regex prefix.                              |
| `test('… has a stable status across header / body permutations', …)`                               | Six body permutations vs the no-body baseline.                                                                                                                      |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                   | Side-channel walk.                                                                                                                                                  |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                              | Method-resolution walk.                                                                                                                                              |
| `test('… is invariant to malformed JSON bodies on the unauth branch', …)`                          | Pins the gate-before-body-parse order.                                                                                                                              |
| `test('… required-email check is NOT entered on the unauth branch', …)`                            | Pins the gate-before-required-field-check order.                                                                                                                    |
| `test('… get-or-create user side-effect is NOT entered on the unauth branch', …)`                  | Pins the gate-before-get-or-create-user order: the unauth response must NEVER match the dynamic `'Failed to create user: ...'` regex prefix and must NEVER echo `'Failed to create or find user for client'`. |
| `test('… createClientProfile call is NOT entered on the unauth branch', …)`                        | Pins the gate-before-create-call order: the unauth response status must NOT be 200, must NOT contain a `data` key.                                                    |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~31 total) must round-trip to a
   `< 500` status.
2. **Bare 401 envelope on the unauth branch** —
   exact match `{ error: 'Unauthorized' }`.
3. **Strict envelope-shape preservation** —
   `Object.keys(body) === ['error']`, no `success`
   key.
4. **Success-branch-key non-disclosure** — `data`,
   `success`, `message` keys must NOT appear in any
   unauth response, and the unauth response status
   must NOT be 200.
5. **Gate-before-post-auth invariant** — the four
   static post-auth messages plus the dynamic
   `'Failed to create user: ...'` regex prefix must
   NOT appear in any unauth response.
6. **Status invariance across header / body
   permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance**.
9. **Gate-before-body-parse invariant**.
10. **Gate-before-required-field-check invariant**.
11. **Gate-before-get-or-create-user invariant** — the
    `getUserByEmail(...)` and
    `UserDbService.createUser(...)` calls are NOT
    entered on the unauth branch; the unauth response
    must NEVER match the dynamic `'Failed to create
    user: ...'` regex prefix.
12. **Gate-before-create-call invariant** — the
    `createClientProfile(...)` call is NOT entered on
    the unauth branch.

## See also

- The companion query-surface spec
  [`admin-clients-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-clients-query.spec.ts)
  covers the GET surface of the same route.
- The full set of sibling per-spec-file references under
  `tests/api/`, including the leaf-`[clientId]` triple-
  method
  [`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md)
  spec covering the same bare-envelope shape on
  GET / PUT / DELETE, the collection-level POST
  companions
  [`admin-items-create-body-spec.md`](admin-items-create-body-spec.md),
  [`admin-users-create-body-spec.md`](admin-users-create-body-spec.md),
  [`admin-categories-create-body-spec.md`](admin-categories-create-body-spec.md),
  and
  [`admin-tags-create-body-spec.md`](admin-tags-create-body-spec.md).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 009 — Admin Dashboard](../spec/009-admin-dashboard/spec.md)
  is the admin-tree spec the clients collection
  route sits inside.
