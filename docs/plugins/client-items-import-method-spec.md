---
id: client-items-import-method-spec
title: E2E Client Items Import Method Spec (apps/web-e2e/tests/api/client-items-import-method.spec.ts)
sidebar_label: E2E Client Items Import Method Spec
sidebar_position: 610
---

# E2E Client Items Import Method Spec — `apps/web-e2e/tests/api/client-items-import-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**client-scoped item-import POST body / header smoke
spec** paired with
[`apps/web-e2e/tests/api/client-items-import-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-import-method.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a **`requireClientAuth()`-
gated batch-import handler** that delegates to an
`ItemImportService.executeImport` service entry point.
UNIQUE: every prior per-source-file `client-items*`
smoke pins a CRUD-style handler (collection GET / POST
list, per-id GET / PUT / DELETE, stats GET) — this is
the FIRST that pins a batch-import handler that fans
out to a service layer.

It also pins the **NESTED `body.rows` array
contract**, the **`'Missing or invalid rows array.'`**
Zod-free 400 message (UNIQUE: a manual `Array.isArray`
guard, NOT a Zod `safeParse`), the
**`safeErrorResponse(error, 'Failed to execute
import')` outer-catch helper** (UNIQUE — sourced from
`@/lib/utils/api-error`, NOT
`client-auth.serverErrorResponse`), and the
**`{ success, result }` success payload** with the
service-derived result aggregate
(`{ total, created, updated, skipped, errors }`).

## What's distinct from EVERY prior per-source-file POST smoke

- **`requireClientAuth()` + service-layer
  delegation** — UNIQUE: the FIRST per-source-file
  POST smoke that gates a service-layer batch entry
  point (`new ItemImportService().executeImport(...)`)
  with the `requireClientAuth` discriminated-union
  helper.
- **Nested `body.rows` array contract** — `body.rows`
  MUST be an `Array.isArray` non-null array,
  otherwise 400 with the message
  `'Missing or invalid rows array.'`. UNIQUE: the
  FIRST per-source-file POST smoke pinning a manual
  `Array.isArray` guard (vs a Zod `safeParse`
  validator).
- **`safeErrorResponse(error, 'Failed to execute
  import')` outer-catch** — UNIQUE: this helper
  comes from `@/lib/utils/api-error` (NOT
  `client-auth.serverErrorResponse`). The FIRST per-
  source-file POST smoke pinning the
  `safeErrorResponse` cross-utility helper for a
  client-auth-gated handler.
- **`{ success, result }` success payload with
  service-derived result aggregate** — `result` has
  the shape `{ total, created, updated, skipped,
  errors }`. UNIQUE: the FIRST per-source-file POST
  smoke pinning a `result`-keyed success payload
  (vs `item`-keyed, `subscription`-keyed,
  `data`-keyed, `stats`-keyed prior siblings).
- **`'Unauthorized. Please sign in to continue.'`**
  longer-message TWO-key 401 envelope (matches
  [`client-items-method-spec.md`](client-items-method-spec.md),
  [`client-items-id-method-spec.md`](client-items-id-method-spec.md),
  and
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)).
- **Hard-coded import options** — the handler
  hard-codes `duplicateStrategy: 'skip'`,
  `defaultStatus: 'pending'`, and
  `submittedBy: userId` when calling
  `executeImport`. Client requests CANNOT override
  any of these via the request body (a
  bypass-attempt probe in the body bulk-loop walk
  pins this).

## Why this spec is the first POST batch-import smoke

The route under test
([`apps/web/app/api/client/items/import/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/import/route.ts))
exports ONLY `POST`. The handler combines:

1. **POST handler** — `requireClientAuth()` →
   discriminated-union check; JSON body parse
   (`request.json()` cast as
   `ClientImportRequestBody`); `Array.isArray` guard
   on `body.rows` → 400 `'Missing or invalid rows
   array.'`;
   `new ItemImportService().executeImport(rows, {
   duplicateStrategy: 'skip', defaultStatus:
   'pending', submittedBy: userId })`; success returns
   `{ success: true, result }`; outer catch →
   `safeErrorResponse(error, 'Failed to execute
   import')`.
2. **Method-resolution surface** — the route exports
   ONLY `POST`. `GET` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~6 headers +
~10 POST bodies) and a battery of **hand-written
invariant scenarios**.

| Block                                                                                                  | Purpose                                                                                                                          |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk (POST)                                                                           | ~6 headers asserting `< 500`.                                                                                                    |
| POST body bulk-loop walk                                                                               | ~10 bodies covering empty / valid / invalid `rows` shapes, manual-`Array.isArray`-fail probes, and bypass attempts.              |
| `test('POST … returns 401 with the longer-message TWO-key envelope', …)`                               | Pins the canonical envelope on POST.                                                                                             |
| `test('POST … 401 envelope shape has exactly success and error keys', …)`                              | Strict TWO-key envelope-shape assertion (no `result` / `total` / `created` / `updated` / `skipped` / `errors` leak).             |
| `test('POST … does NOT echo any of the post-auth messages on the unauth branch', …)`                   | Pins the gate-before-post-auth order across the 400-branch message, the 500-catch message, and the result-aggregate keys.        |
| `test('POST … executeImport is NOT entered on the unauth branch', …)`                                  | CRITICAL — pins that XSS markers in the rows array body are NEVER echoed back AND that the load-bearing service NEVER executes.  |
| `test('POST … Array.isArray rows-guard is NOT entered on the unauth branch', …)`                       | Pins the gate-before-Array.isArray-guard order — even with `rows` missing or non-array, response is 401 NOT 400.                 |
| `test('POST … cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                       | Method-resolution walk. POST is the ONLY exported method.                                                                        |
| `test('POST … does NOT branch on side-channel cookies / headers', …)`                                  | Side-channel walk on POST (Cookie / X-User-Id / Authorization).                                                                  |
| `test('POST … cross-permutation status invariance — every body produces an IDENTICAL unauth status', …)` | Pins that the auth gate is THE first thing the handler does — every body permutation collapses to a byte-identical 401 envelope. |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation must round-trip to a `< 500`
   status.
2. **Canonical TWO-key envelope** `{ success: false,
   error: 'Unauthorized. Please sign in to
   continue.' }` on POST.
3. **Strict TWO-key envelope-shape preservation** —
   exactly `['error', 'success']` keys; no
   `result` / `total` / `created` / `updated` /
   `skipped` / `errors` leak.
4. **Gate-before-post-auth invariant** — none of the
   400-branch message (`'Missing or invalid rows
   array.'`), the 500-catch message (`'Failed to
   execute import'`), or the result-aggregate keys
   (`"result"`, `"created"`, `"updated"`,
   `"skipped"`) leak on unauth.
5. **Gate-before-service-delegation invariant**
   (CRITICAL) — XSS markers placed in the rows array
   body are NEVER echoed back AND the load-bearing
   `ItemImportService.executeImport` service entry
   point NEVER executes on unauth.
6. **Gate-before-Array.isArray-guard invariant** —
   even with `rows` missing or set to a non-array
   value, response is 401 NOT 400 (the auth gate
   fires BEFORE the manual rows-shape guard).
7. **Cross-method invariance** — GET / PUT / PATCH /
   DELETE return `< 500`.
8. **Side-channel isolation** on POST (Cookie /
   X-User-Id / Authorization).
9. **Cross-permutation status invariance** — every
   body permutation (empty rows, null rows, non-array
   rows, missing rows key, valid rows, bypass-attempt
   submittedBy / defaultStatus) collapses to a byte-
   identical 401 envelope.

## See also

- The companion client-items collection sibling
  [`client-items-method-spec.md`](client-items-method-spec.md)
  pins the `requireClientAuth` helper on the
  COLLECTION-level GET + POST surface; this spec
  extends it into the BATCH-IMPORT POST surface.
- The companion client-items per-id sibling
  [`client-items-id-method-spec.md`](client-items-id-method-spec.md)
  pins the `requireClientAuth` helper on the PER-ID
  GET + PUT + DELETE surface; this spec extends it
  into the BATCH-IMPORT POST surface.
- The companion client-items-stats sibling
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)
  uses the same `requireClientAuth()` helper on a
  single GET surface for the stats endpoint.
- The companion client-protected sibling
  [`client-protected.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-protected.spec.ts)
  covers the broader client-protected route surface.
- The admin-tree import counterpart at
  [`apps/web/app/api/admin/items/import/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/import/route.ts)
  is the admin-gated equivalent (covered separately
  by the
  [`admin-items-import-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-import-body.spec.ts)
  sibling).
- The companion client-items-import-validate sibling
  ([`apps/web/app/api/client/items/import/validate/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/import/validate/route.ts))
  validates rows pre-execute (covered separately).
- The companion client-items-import-sample sibling
  ([`apps/web/app/api/client/items/import/sample/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/import/sample/route.ts))
  emits a sample CSV (covered separately).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
