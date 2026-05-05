---
id: surveys-id-method-spec
title: E2E Surveys [surveyId] Method Spec (apps/web-e2e/tests/api/surveys-id-method.spec.ts)
sidebar_label: E2E Surveys [surveyId] Method Spec
sidebar_position: 593
---

# E2E Surveys [surveyId] Method Spec — `apps/web-e2e/tests/api/surveys-id-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**per-survey detail GET / PUT / DELETE dynamic-segment
/ body / header smoke spec** paired with
[`apps/web-e2e/tests/api/surveys-id-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys-id-method.spec.ts).

This is the **first per-source-file triple-method
smoke** the docs tree publishes that pins a **MIXED-
auth gate contract** — GET is publicly accessible for
**published** surveys but admin-gated for unpublished
surveys (with a UNIQUE **404-mask**: non-admin callers
see `404 'Survey not found'` INSTEAD of `403
'Forbidden'`); PUT and DELETE are admin-only.

## What's distinct from EVERY prior triple-method smoke

- **MIXED-auth gate** — the FIRST per-source-file
  triple-method smoke pinning a public-GET + admin-
  PUT + admin-DELETE pattern (vs admin-collections-
  [id] which is admin-gated on ALL three methods).
- **404-mask on GET for non-published surveys** —
  non-admin callers see `404 'Survey not found'` for
  both not-found-at-all AND not-published-and-not-
  admin (UNIQUE: the FIRST per-source-file GET smoke
  pinning a 404-mask security pattern that hides the
  existence of unpublished resources from non-
  admins).
- **ID-or-slug fallback lookup** — the handler tries
  `surveyService.getOne(surveyId)` first then falls
  back to `surveyService.getBySlug(surveyId)` (UNIQUE:
  the FIRST per-source-file dynamic-segment GET smoke
  pinning a dual-lookup-by-id-or-slug contract).
- **`error.message === 'Survey not found'` catch-
  branch dispatch** on PUT and DELETE — the catch
  dispatches on the thrown `Error.message` string
  and re-emits `404 'Survey not found'` (UNIQUE: the
  FIRST per-source-file PUT/DELETE smoke pinning an
  `Error.message` equality-match catch-dispatcher).
- **TWO-key `{ success: false, error: 'Unauthorized'
  }` 401 envelope on PUT and DELETE** (vs the bare
  ONE-key envelope of other admin routes).
- **`data: null` in DELETE success payload** — the
  DELETE 200 response includes `data: null` (UNUSUAL:
  most DELETE handlers omit `data` or return `data: {
  ... }` with details).

## Why this spec is the first mixed-auth triple-method smoke

The route under test
([`apps/web/app/api/surveys/[surveyId]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/surveys/[surveyId]/route.ts))
exports `GET`, `PUT`, AND `DELETE`. The handlers
combine:

1. **GET handler** — `surveyService.getOne(surveyId)`
   → fallback to `surveyService.getBySlug(surveyId)`;
   404 if both null; `auth()` gate AFTER the lookup
   — only for non-published surveys; 404-mask if
   `!session?.user?.isAdmin` and survey is not
   published; success payload `{ success: true,
   data: <survey> }`.
2. **PUT handler** — `auth()` session lookup
   (`!session?.user?.isAdmin` → 401 TWO-key); JSON
   body parse; ID-or-slug fallback lookup; 404 if
   both null; `surveyService.update(survey.id, body)`;
   success payload `{ success: true, data:
   <updatedSurvey>, message: 'Survey updated
   successfully' }`; outer catch with `Error.message
   === 'Survey not found'` → re-emit 404 else
   `safeErrorResponse(error, 'Failed to update
   survey')`.
3. **DELETE handler** — `auth()` session lookup
   (`!session?.user?.isAdmin` → 401 TWO-key); ID-or-
   slug fallback lookup; 404 if both null;
   `surveyService.delete(survey.id)`; success payload
   `{ success: true, data: null, message: 'Survey
   deleted successfully' }`; same catch-dispatcher
   as PUT.
4. **Method-resolution surface** — the route exports
   `GET`, `PUT`, AND `DELETE`. `POST` / `PATCH` must
   round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **four bulk-loop walks** (~6 headers ×
3 methods + ~9 PUT bodies) and **eleven hand-written
scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walks (GET / PUT / DELETE)                                                        | ~6 headers per method.                                                                                                                 |
| PUT body bulk-loop walk                                                                            | ~9 bodies covering valid updates, status changes, surveyJson update, bypass attempts.                                                  |
| `test('GET … with non-existent ID returns 404 with the canonical TWO-key envelope', …)`            | Pins the canonical 404 envelope for non-existent surveys.                                                                              |
| `test('PUT … returns 401 with the canonical TWO-key Unauthorized envelope', …)`                    | Pins the canonical 401 envelope.                                                                                                       |
| `test('DELETE … returns 401 with the canonical TWO-key Unauthorized envelope', …)`                 | Pins the canonical 401 envelope.                                                                                                       |
| `test('PUT and DELETE … have IDENTICAL 401 envelopes', …)`                                         | Pins byte-identical 401 envelopes across PUT and DELETE.                                                                               |
| `test('PUT … 401 envelope shape has exactly success and error keys', …)`                           | Strict envelope-shape assertion.                                                                                                       |
| `test('PUT … does NOT echo any of the post-auth messages on the unauth branch', …)`                | Pins the gate-before-post-auth order across five candidate messages.                                                                   |
| `test('PUT … surveyService.update is NOT entered on the unauth branch', …)`                        | CRITICAL — pins that `surveyService.update` NEVER runs on unauth (no XSS-marker leak).                                                  |
| `test('DELETE … surveyService.delete is NOT entered on the unauth branch', …)`                     | CRITICAL — pins that `surveyService.delete` NEVER runs on unauth.                                                                       |
| `test('PUT … cross-method probe (POST / PATCH) does NOT 5xx', …)`                                  | Method-resolution walk. GET / PUT / DELETE are exported.                                                                               |
| `test('PUT … does NOT branch on side-channel cookies / headers', …)`                               | Side-channel walk on PUT.                                                                                                              |
| `test('DELETE … does NOT branch on side-channel cookies / headers', …)`                            | Side-channel walk on DELETE.                                                                                                           |
| `test('PUT … catch-branch dispatcher 'Survey not found' is NOT echoed on the unauth branch', …)`   | Pins the gate-before-catch-dispatcher order on PUT.                                                                                    |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation must round-trip to a `< 500`
   status across all three methods.
2. **Canonical 404 envelope** `{ success: false,
   error: 'Survey not found' }` for non-existent
   surveys on GET.
3. **Canonical 401 envelope** `{ success: false,
   error: 'Unauthorized' }` on PUT and DELETE.
4. **Cross-method 401 envelope equality** — PUT and
   DELETE return BYTE-IDENTICAL 401 envelopes.
5. **Strict envelope-shape preservation**.
6. **Gate-before-post-auth invariant** — none of the
   five candidate messages must appear on unauth.
7. **Gate-before-surveyService-update invariant**
   (CRITICAL).
8. **Gate-before-surveyService-delete invariant**
   (CRITICAL).
9. **Cross-method invariance** — POST / PATCH return
   `< 500`.
10. **Side-channel isolation** on PUT and DELETE.
11. **Gate-before-catch-dispatcher invariant** —
    pins that `'Survey not found'` is NOT echoed on
    the PUT unauth branch (the catch-dispatcher
    upstream of the auth gate is unreachable).

## See also

- The companion surveys list / collection-level
  POST sibling
  [`surveys.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys.spec.ts)
  covers the parent route.
- The companion surveys-exists query sibling
  [`surveys-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys-exists-query.spec.ts)
  pins the slug-existence-check contract.
- The triple-method admin sibling
  [`admin-collections-id-method-spec.md`](admin-collections-id-method-spec.md)
  uses ALL-admin-gated GET / PUT / DELETE (vs this
  surveys spec's mixed-auth pattern).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
