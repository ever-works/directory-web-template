---
id: client-items-import-sample-query-spec
title: E2E Client Items Import Sample Query Spec (apps/web-e2e/tests/api/client-items-import-sample-query.spec.ts)
sidebar_label: E2E Client Items Import Sample Query Spec
sidebar_position: 614
---

# E2E Client Items Import Sample Query Spec — `apps/web-e2e/tests/api/client-items-import-sample-query.spec.ts`

Per-source-file reference for the Playwright e2e
suite's **client-scoped sample-template GET / query-
param / header smoke spec** paired with
[`apps/web-e2e/tests/api/client-items-import-sample-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-import-sample-query.spec.ts).

This is the **first per-source-file GET smoke** the
docs tree publishes that pins a
**`requireClientAuth()`-gated binary-stream sample-
template handler** that delegates to
`ItemExportService.generateSampleCSV()` /
`generateSampleXLSX()`. UNIQUE: every prior per-
source-file `client-items*` GET smoke
(`client-items-method`, `client-items-id-method`,
`client-items-stats-query`) returns a JSON envelope;
this is the FIRST `requireClientAuth()`-gated GET
smoke that returns a **binary stream** with a
`Content-Disposition: attachment; filename="..."`
header on the happy path.

It also pins:

- the **`exportQuerySchema.parse(...)` Zod-enum query
  parse** AFTER the gate (matches the admin sibling
  `admin/items/export/sample` schema BUT with the
  longer-message client-auth envelope on the unauth
  branch);
- the **`safeErrorResponse(error, 'Failed to generate
  sample template')` outer-catch helper** (BYTE-
  IDENTICALLY matches the admin sibling 500-message);
- the **`new ItemExportService()` direct-
  instantiation pattern** with the per-format
  `generateSampleCSV()` / `generateSampleXLSX()`
  service entry points;
- the **binary-stream success contract** with a
  `Content-Disposition: attachment; filename="..."`
  header (UNIQUE: every prior `client-items*` GET
  smoke pins a JSON envelope);
- **`'Unauthorized. Please sign in to continue.'`**
  longer-message TWO-key 401 envelope (matches the
  prior `client-items*` siblings).

## What's distinct from EVERY prior per-source-file GET smoke

- **`requireClientAuth()` + `exportQuerySchema`
  pair** — UNIQUE: the FIRST per-source-file GET
  smoke that gates a Zod
  `exportQuerySchema.parse(...)` query parse with
  the `requireClientAuth` discriminated-union helper.
  The sibling `client-items-method` /
  `client-items-id-method` /
  `client-items-stats-query` parse no query schema;
  the admin sibling
  `admin-items-export-sample-query` uses the SAME
  `exportQuerySchema` but gates with bare `auth()` +
  `session.user.isAdmin` instead of
  `requireClientAuth()`.
- **Binary-stream success contract** — UNIQUE: the
  FIRST `requireClientAuth()`-gated GET smoke pinning
  a `NextResponse(new Uint8Array(…), { headers: {
  'Content-Type': …, 'Content-Disposition':
  'attachment; filename="…"' } })` binary-stream
  success contract. Distinct from the JSON-envelope
  shape every prior `client-items*` GET smoke pins.
  The unauth branch is invariant to this distinction
  (still a 401 JSON envelope), but the post-auth
  contract is fundamentally different.
- **`safeErrorResponse(error, 'Failed to generate
  sample template')` outer-catch** — UNIQUE: the
  FIRST `requireClientAuth()`-gated GET smoke pinning
  a `safeErrorResponse` cross-utility helper (NOT
  `serverErrorResponse` like the
  `client-items-stats-query` sibling). The catch
  message BYTE-IDENTICALLY matches the admin sibling
  `admin/items/export/sample` route's catch message
  (both use `'Failed to generate sample template'`)
  — distinct from the client sibling
  `client-items-import-method`'s `'Failed to execute
  import'` and `client-items-import-validate-method`'s
  `'Failed to validate import file'`.
- **`ItemExportService` direct service-class
  posture** — UNIQUE: the FIRST
  `requireClientAuth()`-gated GET smoke pinning a
  `new ItemExportService()` direct-instantiation
  pattern (NOT a repository factory). Distinct from
  the `getClientItemRepository()` factory pattern of
  the `client-items-stats-query` sibling and the
  `ItemImportService` instantiation of the
  `client-items-import-method` /
  `client-items-import-validate-method` siblings.
- **`'Unauthorized. Please sign in to continue.'`**
  longer-message TWO-key 401 envelope (matches
  [`client-items-method-spec.md`](client-items-method-spec.md),
  [`client-items-id-method-spec.md`](client-items-id-method-spec.md),
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md),
  [`client-items-import-method-spec.md`](client-items-import-method-spec.md),
  and
  [`client-items-import-validate-method-spec.md`](client-items-import-validate-method-spec.md);
  distinct from the admin sibling's `'Unauthorized.
  Admin access required.'`).
- **`format=` Zod-enum case-sensitivity** — Zod
  enums match exactly, so `format=CSV` /
  `format=XLSX` round-trip to 4xx on the auth branch
  via the `safeErrorResponse(...)` catch. The unauth
  branch is invariant to this distinction (still
  401).
- **`format=` enum default** — the schema has a
  `.default('csv')`, so omitting `format` yields CSV
  on the auth branch. The unauth branch is invariant
  to this distinction (still 401).

## Why this spec is the first binary-stream GET smoke under `requireClientAuth()`

The route under test
([`apps/web/app/api/client/items/import/sample/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/import/sample/route.ts))
exports ONLY `GET`. The handler combines:

1. **GET handler** — outer try/catch around:
   `requireClientAuth()` → discriminated-union
   check; `searchParams` extraction;
   `exportQuerySchema.parse(Object.fromEntries(searchParams))`
   Zod-validated `format` enum (`'csv' | 'xlsx'`
   with a `'csv'` default); `new ItemExportService()`
   instantiation; per-format dispatch
   (`generateSampleXLSX()` for `'xlsx'` else
   `generateSampleCSV()`); success returns a
   `NextResponse(<bytes / string>, { headers: {
   'Content-Type': ..., 'Content-Disposition':
   'attachment; filename="..."' } })`; outer catch →
   `safeErrorResponse(error, 'Failed to generate
   sample template')`.
2. **Method-resolution surface** — the route exports
   ONLY `GET`. `POST` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~50 query
permutations + ~11 headers all asserting `< 500`)
and a battery of **hand-written invariant scenarios**.

| Block                                                                                                       | Purpose                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Query-param bulk-loop walk                                                                                  | ~50 query permutations covering the `format=` enum members, empty / unknown / case-variant values, impersonation / token / bypass / disposition / filename / locale / tenant / fields / cache keys, repeated keys, and bogus combinations. |
| Header bulk-loop walk                                                                                       | ~11 headers asserting `< 500` (Accept variants + side-channel cookies / Authorization / X-User-Id / X-Forwarded-For / X-Real-IP). |
| `test('GET … returns a 401 with the longer-message TWO-key envelope on the unauth branch', …)`             | Pins the canonical longer envelope.                                                                                          |
| `test('GET … 401 envelope shape has exactly success and error keys', …)`                                    | Strict TWO-key envelope-shape assertion (no `data` / `format` / `filename` leak).                                            |
| `test('GET … does NOT echo the catch-branch 500 message on the unauth branch', …)`                          | Pins that `safeErrorResponse(error, 'Failed to generate sample template')` never fires on unauth.                            |
| `test('GET … does NOT leak Content-Disposition attachment header on the unauth branch', …)`                 | CRITICAL — pins that the binary-stream attachment header NEVER appears on the unauth branch.                                 |
| `test('GET … does NOT leak a binary content-type on the unauth branch', …)`                                 | CRITICAL — pins that the unauth branch emits an `application/json` content-type, NOT `text/csv` or `spreadsheetml`.          |
| `test('GET … has a stable status across query permutations on the unauth branch', …)`                      | Pins the gate-before-Zod-parse ordering across known + unknown query keys.                                                   |
| `test('GET …?format=… does NOT bypass the requireClientAuth gate', …)`                                      | Pins that the `format` Zod enum is parsed AFTER the gate.                                                                    |
| `test('GET …?userId=… does NOT bypass the requireClientAuth gate', …)`                                      | Pins that no impersonation key shortcuts the gate.                                                                           |
| `test('GET …?token=… does NOT bypass the requireClientAuth gate', …)`                                       | Pins that no magic-token key shortcuts the gate.                                                                             |
| `test('GET …?filename=… does NOT introduce a path-traversal bypass', …)`                                    | Pins that path-traversal / null-byte injection in a future filename-override key cannot bypass the gate.                     |
| `test('GET … does NOT branch on Accept header', …)`                                                         | Pins that no Accept-header-driven content negotiation shortcuts the gate.                                                    |
| `test('GET … does NOT branch on side-channel cookies / headers', …)`                                        | Side-channel walk (Cookie / Authorization / X-User-Id / X-Forwarded-For / X-Real-IP).                                        |
| `test('GET … repeated query keys do NOT bypass the gate', …)`                                               | Pins `searchParams.get(name)`'s first-value semantics.                                                                       |
| `test('GET … cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx', …)`                            | Method-resolution walk. GET is the ONLY exported method.                                                                     |
| `test('GET … cross-permutation status invariance — every permutation produces an IDENTICAL unauth envelope', …)` | Pins that every parameter combination collapses to a byte-identical 401 envelope.                                            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every query
   permutation / header must round-trip to a `< 500`
   status.
2. **Canonical longer TWO-key envelope** `{ success:
   false, error: 'Unauthorized. Please sign in to
   continue.' }` on GET.
3. **Strict TWO-key envelope-shape preservation** —
   exactly `['error', 'success']` keys; no `data` /
   `format` / `filename` leak.
4. **Gate-before-catch invariant** — the 500-catch
   message (`'Failed to generate sample template'`)
   never fires on unauth.
5. **Gate-before-binary-stream-header invariant**
   (CRITICAL) — the `Content-Disposition: attachment;
   …` header NEVER appears on the unauth branch.
6. **Gate-before-binary-stream-content-type
   invariant** (CRITICAL) — the unauth branch emits
   `application/json`, NOT `text/csv` or the XLSX
   spreadsheetml MIME type.
7. **Gate-before-Zod-parse invariant** — every
   `format=` value (valid / empty / invalid / case-
   variant) round-trips to the no-arg baseline
   status.
8. **Impersonation / token / bypass /
   filename-traversal invariance** — every
   dangerous-passthrough query key collapses to the
   no-arg baseline status.
9. **Accept-header invariance** — the route does not
   negotiate content-types; every Accept header
   round-trips to the no-arg baseline status.
10. **Side-channel isolation** on GET (Cookie /
    Authorization / X-User-Id / X-Forwarded-For /
    X-Real-IP).
11. **Repeated-key invariance** —
    `searchParams.get(name)` returns the first value
    of any repeated key, so repetition is irrelevant.
12. **Cross-method invariance** — POST / PUT / PATCH
    / DELETE return `< 500`.
13. **Cross-permutation status invariance** — every
    parameter combination collapses to a byte-
    identical 401 envelope.

## See also

- The companion client-items-import sibling
  [`client-items-import-method-spec.md`](client-items-import-method-spec.md)
  pins the `requireClientAuth()` helper on the
  COMMIT-mode batch-import POST surface (JSON body,
  `executeImport` service call); this spec extends
  the family into the SAMPLE-TEMPLATE GET surface
  (binary stream, `generateSampleCSV` / `Xlsx`
  service calls).
- The companion client-items-import-validate sibling
  [`client-items-import-validate-method-spec.md`](client-items-import-validate-method-spec.md)
  pins the `requireClientAuth()` helper on the DRY-
  RUN VALIDATE-mode multipart POST surface
  (`validateRows` service call); this spec is the
  GET sibling that emits the sample template the
  user fills before calling the validate / import
  POST endpoints.
- The companion client-items collection sibling
  [`client-items-method-spec.md`](client-items-method-spec.md)
  pins the `requireClientAuth` helper on the
  COLLECTION-level GET + POST surface.
- The companion client-items per-id sibling
  [`client-items-id-method-spec.md`](client-items-id-method-spec.md)
  pins the `requireClientAuth` helper on the PER-ID
  GET + PUT + DELETE surface.
- The companion client-items-stats sibling
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md)
  uses the same `requireClientAuth()` helper on a
  single GET surface for the stats endpoint
  (`serverErrorResponse` catch — distinct from this
  spec's `safeErrorResponse` catch).
- The companion client-protected sibling
  [`client-protected.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-protected.spec.ts)
  covers the broader client-protected route
  surface.
- The admin-tree counterpart at
  [`apps/web/app/api/admin/items/export/sample/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/export/sample/route.ts)
  is the admin-gated equivalent (covered separately
  by the
  [`admin-items-export-sample-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-export-sample-query.spec.ts)
  sibling — uses bare `auth()` + `isAdmin` instead
  of `requireClientAuth()`, and the SAME
  `exportQuerySchema` Zod parse + the SAME
  `'Failed to generate sample template'` catch
  message + the SAME `ItemExportService.generateSample*`
  service calls).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
