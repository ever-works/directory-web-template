---
id: client-items-import-validate-method-spec
title: E2E Client Items Import Validate Method Spec (apps/web-e2e/tests/api/client-items-import-validate-method.spec.ts)
sidebar_label: E2E Client Items Import Validate Method Spec
sidebar_position: 611
---

# E2E Client Items Import Validate Method Spec — `apps/web-e2e/tests/api/client-items-import-validate-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**client-scoped item-import-validate (dry-run) POST
multipart / body / header smoke spec** paired with
[`apps/web-e2e/tests/api/client-items-import-validate-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-import-validate-method.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a
**`requireClientAuth()`-gated multipart/form-data
validate-only handler** that delegates to
`ItemImportService.validateRows` (a dry-run service
entry point — distinct from the sibling
`client/items/import` route which calls
`executeImport`). UNIQUE: every prior per-source-file
`client-items*` smoke (`client-items-method`,
`client-items-id-method`, `client-items-stats-query`,
`client-items-import-method`) parses JSON via
`await request.json()`; this is the FIRST that pins a
`requireClientAuth()`-gated handler that parses
`multipart/form-data` via `await request.formData()`.

It also pins:

- the **5-step file/mapping validation chain** AFTER
  the gate (matches the admin sibling
  `admin/items/import/validate` chain BUT with the
  longer-message client-auth envelope on the unauth
  branch);
- the **`safeErrorResponse(error, 'Failed to validate
  import file')` outer-catch helper** (matches the
  admin sibling 500-message);
- the **`{ success: true, headers, suggestedMapping,
  validationResults, summary }` success payload** with
  the service-derived validation result aggregate;
- **hard-coded `duplicateStrategy: 'skip'` +
  `defaultStatus: 'pending'`** validation options
  (UNIQUE: client requests CANNOT override either via
  the form data — distinct from the admin sibling
  which DOES accept these as form fields);
- **`'Unauthorized. Please sign in to continue.'`**
  longer-message TWO-key 401 envelope (matches the
  prior `client-items*` siblings).

## What's distinct from EVERY prior per-source-file POST smoke

- **`requireClientAuth()` + multipart/form-data pair**
  — UNIQUE: the FIRST per-source-file POST smoke that
  gates a `multipart/form-data` body parse with the
  `requireClientAuth` discriminated-union helper. The
  sibling `client-items-import-method` parses JSON;
  the sibling `admin-items-import-validate-body`
  parses multipart but uses `auth()` + `isAdmin`
  instead of `requireClientAuth()`.
- **5-step file/mapping validation chain** AFTER the
  gate AND AFTER the formData parse. The five 400
  envelopes are:
    - (a) `'No file provided.'` on `!file`,
    - (b) `'Invalid file type. Only CSV and XLSX
      files are supported.'` on a filename that does
      NOT end in `.csv` / `.xlsx` / `.xls`,
    - (c) `'File too large. Maximum size is 10 MB.'`
      on `file.size > 10 * 1024 * 1024`,
    - (d) `'Invalid column mapping JSON.'` on a non-
      empty `mapping` form field that fails
      `JSON.parse(...)`,
    - (e) `'File contains no data rows.'` on a parsed
      file with `rows.length === 0`.
  The unauth branch must NEVER reach ANY of the five
  steps — the response body must NOT contain ANY of
  the five 400 messages.
- **`validateRows`-not-`executeImport` service call**
  — the load-bearing call is
  `importService.validateRows(parsed.rows, { ...,
  duplicateStrategy: 'skip', defaultStatus: 'pending'
  })`. UNIQUE: the FIRST `requireClientAuth()`-gated
  POST smoke pinning a `validateRows` (dry-run)
  service entry point — prior siblings pin
  `executeImport` (commit-mode) or
  `findByUserPaginated` / `createAsClient` /
  `findByIdForUser` etc. (DB-helper layer).
- **`{ success: true, headers, suggestedMapping,
  validationResults, summary }` success payload** —
  UNIQUE: the FIRST `requireClientAuth()`-gated POST
  smoke pinning a FOUR-key success payload (vs the
  `result`-keyed two-key payload of the
  `client-items-import-method` sibling, vs the
  `item`-keyed two-key payload of the collection
  POST sibling).
- **`safeErrorResponse(error, 'Failed to validate
  import file')` outer-catch** — UNIQUE: shares the
  `safeErrorResponse` cross-utility helper with the
  sibling `client-items-import-method` (which has
  `'Failed to execute import'`) and the admin sibling
  `admin/items/import/validate` (which ALSO has
  `'Failed to validate import file'`). The FIRST
  per-source-file `requireClientAuth()`-gated POST
  smoke pinning a multipart-form-data validate-mode
  catch message that BYTE-IDENTICALLY matches the
  admin sibling.
- **Hard-coded validation options** — the handler
  hard-codes `duplicateStrategy: 'skip'` and
  `defaultStatus: 'pending'` when calling
  `validateRows`. Client requests CANNOT override
  either via the form data — UNIQUE: the FIRST
  `requireClientAuth()`-gated POST smoke pinning a
  hard-coded validation-options contract distinct
  from the admin sibling which DOES accept
  `duplicateStrategy` + `defaultStatus` as form
  fields.
- **`'Unauthorized. Please sign in to continue.'`**
  longer-message TWO-key 401 envelope (matches
  [`client-items-method-spec.md`](client-items-method-spec.md),
  [`client-items-id-method-spec.md`](client-items-id-method-spec.md),
  [`client-items-stats-query-spec.md`](client-items-stats-query-spec.md),
  and
  [`client-items-import-method-spec.md`](client-items-import-method-spec.md);
  distinct from the admin sibling's
  `'Unauthorized. Admin access required.'`).

## Why this spec is the first multipart validate-only POST smoke under `requireClientAuth()`

The route under test
([`apps/web/app/api/client/items/import/validate/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/import/validate/route.ts))
exports ONLY `POST`. The handler combines:

1. **POST handler** — outer try/catch around:
   `requireClientAuth()` → discriminated-union check;
   `await request.formData()` body parse;
   `formData.get('file')` `!file` guard → 400
   `'No file provided.'`; filename whitelist (`.csv`
   / `.xlsx` / `.xls`) → 400 `'Invalid file type.
   ...'`; `file.size > 10 * 1024 * 1024` → 400
   `'File too large. ...'`; `formData.get('mapping')`
   non-null + `JSON.parse` failure → 400
   `'Invalid column mapping JSON.'`; `parseCSV(...)`
   / `parseXLSX(...)` then `parsed.rows.length === 0`
   → 400 `'File contains no data rows.'`;
   `validateRows(parsed.rows, { columnMapping:
   effectiveMapping, duplicateStrategy: 'skip',
   defaultStatus: 'pending' })` load-bearing service
   call; success returns
   `{ success: true, headers, suggestedMapping,
   validationResults, summary }`; outer catch →
   `safeErrorResponse(error, 'Failed to validate
   import file')`.
2. **Method-resolution surface** — the route exports
   ONLY `POST`. `GET` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers +
~12 multipart bodies) and a battery of **hand-written
invariant scenarios**.

| Block                                                                                                    | Purpose                                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk (POST)                                                                             | ~9 headers asserting `< 500`.                                                                                                    |
| POST multipart bulk-loop walk                                                                            | ~12 multipart payloads covering empty / mapping-only / file-extension / mapping-JSON / no-data-rows / valid / bypass attempts.   |
| `test('POST … returns 401 with the longer-message TWO-key envelope', …)`                                 | Pins the canonical longer envelope on POST.                                                                                      |
| `test('POST … 401 envelope shape has exactly success and error keys', …)`                                | Strict TWO-key envelope-shape assertion (no `headers` / `suggestedMapping` / `validationResults` / `summary` leak).              |
| `test('POST … does NOT echo any of the five file/mapping 400 messages on the unauth branch', …)`         | Pins the gate-before-validation-chain ordering across the five 400-branch messages.                                              |
| `test('POST … does NOT echo the catch-branch 500 message on the unauth branch', …)`                      | Pins that `safeErrorResponse(error, 'Failed to validate import file')` never fires on unauth.                                    |
| `test('POST … validateRows is NOT entered on the unauth branch', …)`                                     | CRITICAL — pins that XSS markers in the multipart body are NEVER echoed back AND that the load-bearing service NEVER executes.   |
| `test('POST … success-branch keys do NOT leak on the unauth branch', …)`                                 | Pins that none of the four success-branch JSON keys leak as JSON keys in the unauth body.                                        |
| `test('POST … is invariant to malformed multipart bodies on the unauth branch', …)`                      | Pins that fabricated multipart payloads do NOT 5xx — every malformed body still rounds-trips to a `< 500` status.                |
| `test('POST … is invariant to file-extension shapes on the unauth branch', …)`                           | Pins that every extension (whitelisted + non-whitelisted) round-trips to the no-body baseline status.                            |
| `test('POST … cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                         | Method-resolution walk. POST is the ONLY exported method.                                                                        |
| `test('POST … does NOT branch on side-channel cookies / headers', …)`                                    | Side-channel walk on POST (Cookie / Authorization / X-User-Id).                                                                  |
| `test('POST … cross-permutation status invariance — every body produces an IDENTICAL unauth envelope', …) ` | Pins that every multipart permutation collapses to a byte-identical 401 envelope.                                                |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation must round-trip to a `< 500`
   status.
2. **Canonical longer TWO-key envelope** `{ success:
   false, error: 'Unauthorized. Please sign in to
   continue.' }` on POST.
3. **Strict TWO-key envelope-shape preservation** —
   exactly `['error', 'success']` keys; no `headers`
   / `suggestedMapping` / `validationResults` /
   `summary` leak.
4. **Gate-before-validation-chain invariant** — none
   of the five 400-branch messages (`'No file
   provided.'`, `'Invalid file type. ...'`, `'File
   too large. ...'`, `'Invalid column mapping
   JSON.'`, `'File contains no data rows.'`) leak on
   unauth.
5. **Gate-before-catch invariant** — the 500-catch
   message (`'Failed to validate import file'`) never
   fires on unauth.
6. **Gate-before-service-delegation invariant**
   (CRITICAL) — XSS markers placed in the multipart
   body are NEVER echoed back AND the load-bearing
   `ItemImportService.validateRows` service entry
   point NEVER executes on unauth.
7. **Success-branch-key non-disclosure** — none of
   the four success-branch JSON keys (`headers`,
   `suggestedMapping`, `validationResults`,
   `summary`) leak as JSON keys in the unauth body.
8. **Malformed-multipart invariance** — fabricated
   multipart payloads do NOT 5xx.
9. **File-extension invariance** — every extension
   shape round-trips to the no-body baseline status.
10. **Cross-method invariance** — GET / PUT / PATCH /
    DELETE return `< 500`.
11. **Side-channel isolation** on POST (Cookie /
    Authorization / X-User-Id).
12. **Cross-permutation status invariance** — every
    multipart permutation (empty, valid CSV, valid
    CSV + mapping, mapping-only, file-extension fail,
    mapping-JSON fail, hard-coded-options bypass)
    collapses to a byte-identical 401 envelope.

## See also

- The companion client-items-import sibling
  [`client-items-import-method-spec.md`](client-items-import-method-spec.md)
  pins the `requireClientAuth()` helper on the
  COMMIT-mode batch-import POST surface (JSON body,
  `executeImport` service call); this spec extends it
  into the DRY-RUN VALIDATE-mode batch-import POST
  surface (multipart body, `validateRows` service
  call).
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
  single GET surface for the stats endpoint.
- The companion client-protected sibling
  [`client-protected.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-protected.spec.ts)
  covers the broader client-protected route surface.
- The admin-tree validate counterpart at
  [`apps/web/app/api/admin/items/import/validate/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/import/validate/route.ts)
  is the admin-gated equivalent (covered separately
  by the
  [`admin-items-import-validate-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-items-import-validate-body.spec.ts)
  sibling — uses `auth()` + `isAdmin` instead of
  `requireClientAuth()`, and DOES accept
  `duplicateStrategy` + `defaultStatus` as form
  fields; the client variant does NOT).
- The companion client-items-import-sample sibling
  ([`apps/web/app/api/client/items/import/sample/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/import/sample/route.ts))
  emits a sample CSV (covered separately).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
