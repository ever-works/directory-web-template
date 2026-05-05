---
id: client-items-method-spec
title: E2E Client Items Method Spec (apps/web-e2e/tests/api/client-items-method.spec.ts)
sidebar_label: E2E Client Items Method Spec
sidebar_position: 608
---

# E2E Client Items Method Spec — `apps/web-e2e/tests/api/client-items-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**client items collection-level GET + POST body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/client-items-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-method.spec.ts).

This is the **first per-source-file dual-method
smoke** the docs tree publishes that pins the
**`requireClientAuth()` helper-based auth gate** on
BOTH GET AND POST (the
[`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)
sibling pins the helper on a single GET surface;
this spec extends to the dual-method usage). It also
pins the **`badRequestResponse(message)` 400-helper**
and the **issues-joined Zod error message** contract.

## What's distinct from EVERY prior dual-method smoke

- **`requireClientAuth()` helper on BOTH methods** —
  the FIRST per-source-file dual-method smoke
  pinning the discriminated-union auth-helper return
  contract on both GET AND POST exports.
- **`badRequestResponse(message)` 400-helper** —
  UNIQUE: a NEW helper distinct from
  `safeErrorResponse` and `serverErrorResponse`. The
  FIRST per-source-file smoke pinning a dedicated
  400-builder helper.
- **Issues-joined Zod error message** —
  `validationResult.error.issues.map((issue) =>
  issue.message).join(', ')` (UNIQUE: the FIRST
  per-source-file smoke pinning a comma-joined
  Zod-issues 400 message, vs taking only the first
  issue like in the sponsor-ads-user sibling).
- **GET success payload** with FLAT keys at top
  level: `{ success, items, total, page, limit,
  totalPages, stats }` — UNIQUE: no `data` wrapper,
  no `pagination` wrapper, flat shape; the FIRST
  per-source-file GET smoke pinning a flat-
  pagination success payload.
- **POST returns 201 status** (NOT 200) with a
  review-workflow success message `'Item submitted
  successfully. It will be reviewed by our team
  before being published.'`.
- **`?deleted=true` query** branches to a different
  repo method (`findDeletedByUser` vs
  `findByUserPaginated`) — UNIQUE: the FIRST per-
  source-file GET smoke pinning a query-driven
  repo-method dispatch contract.
- **`'Unauthorized. Please sign in to continue.'`**
  longer-message TWO-key envelope (matches the
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)
  sibling).

## Why this spec is the first dual-method requireClientAuth smoke

The route under test
([`apps/web/app/api/client/items/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/route.ts))
exports `GET` AND `POST`. The handlers combine:

1. **GET handler** — `requireClientAuth()`;
   `clientItemsListQuerySchema.safeParse(query)`;
   `?deleted=true` → `findDeletedByUser`; else →
   `findByUserPaginated`; success returns flat
   payload.
2. **POST handler** — `requireClientAuth()`; JSON
   body parse;
   `clientCreateItemSchema.safeParse(body)`;
   `clientItemRepository.createAsClient(userId,
   validated)` load-bearing DB write; success
   returns 201 with `{ success, item, message }`.
3. **Method-resolution surface** — the route
   exports `GET` AND `POST`. `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **three bulk-loop walks** (~6 headers
× 2 methods + ~9 POST bodies) and **eleven hand-
written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walks (GET / POST)                                                                | ~6 headers per method.                                                                                                                 |
| POST body bulk-loop walk                                                                           | ~9 bodies covering minimal valid bodies, type-violation probes, bypass attempts.                                                       |
| `test('GET … returns 401 with the longer-message TWO-key envelope', …)`                            | Pins the canonical envelope on GET.                                                                                                    |
| `test('POST … returns 401 with the longer-message TWO-key envelope', …)`                           | Pins the canonical envelope on POST.                                                                                                   |
| `test('GET and POST … have IDENTICAL 401 envelopes', …)`                                           | Pins byte-identical 401 envelopes.                                                                                                     |
| `test('GET … 401 envelope shape has exactly success and error keys', …)`                           | Strict envelope-shape assertion.                                                                                                       |
| `test('POST … does NOT echo any of the post-auth messages on the unauth branch', …)`               | Pins the gate-before-post-auth order across four candidate messages including the review-workflow success message.                     |
| `test('POST … createAsClient is NOT entered on the unauth branch', …)`                             | CRITICAL — pins that XSS markers in the body are NEVER echoed back.                                                                    |
| `test('GET … Zod query-validation is NOT entered on the unauth branch', …)`                        | Pins the gate-before-Zod-query-validation order — invalid query values still produce 401 NOT 400.                                       |
| `test('POST … Zod body-validation is NOT entered on the unauth branch', …)`                        | Pins the gate-before-Zod-body-validation order — invalid body shapes still produce 401 NOT 400.                                         |
| `test('GET … cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                          | Method-resolution walk. GET + POST are exported.                                                                                       |
| `test('POST … does NOT branch on side-channel cookies / headers', …)`                              | Side-channel walk on POST.                                                                                                             |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation must round-trip to a `< 500`
   status across both methods.
2. **Canonical TWO-key envelope** `{ success:
   false, error: 'Unauthorized. Please sign in to
   continue.' }` on both methods.
3. **Cross-method 401 envelope equality** — GET and
   POST return BYTE-IDENTICAL 401 envelopes.
4. **Strict TWO-key envelope-shape preservation**.
5. **Gate-before-post-auth invariant**.
6. **Gate-before-DB-mutation invariant** on POST
   (CRITICAL).
7. **Gate-before-Zod-query-validation invariant**
   on GET — even invalid query values produce 401
   NOT 400.
8. **Gate-before-Zod-body-validation invariant**
   on POST — invalid body shapes still produce 401
   NOT 400.
9. **Cross-method invariance** — PUT / PATCH /
   DELETE return `< 500`.
10. **Side-channel isolation** on POST.

## See also

- The companion client items-stats sibling
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)
  uses the same `requireClientAuth()` helper on a
  single GET surface; this spec extends to the
  dual-method usage.
- The client per-id sibling
  [`apps/web/app/api/client/items/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/[id]/route.ts)
  is a per-item resource (covered separately).
- The companion client-protected sibling
  [`client-protected.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-protected.spec.ts)
  covers the broader client-protected route surface.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
