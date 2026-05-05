---
id: surveys-responses-id-query-spec
title: E2E Surveys Responses [responseId] Query Spec (apps/web-e2e/tests/api/surveys-responses-id-query.spec.ts)
sidebar_label: E2E Surveys Responses [responseId] Query Spec
sidebar_position: 613
---

# E2E Surveys Responses [responseId] Query Spec — `apps/web-e2e/tests/api/surveys-responses-id-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**per-response-detail GET dynamic-segment / header
smoke spec** paired with
[`apps/web-e2e/tests/api/surveys-responses-id-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys-responses-id-query.spec.ts).

This is the **first per-source-file GET smoke** the
docs tree publishes that pins an **admin-gated
survey-response-by-id lookup** delegating to
`surveyService.getResponseById(responseId)` with a
`404 'Response not found'` non-existence guard
AFTER the auth gate.

## What's distinct from EVERY prior per-source-file GET smoke

- **`auth() + isAdmin` gate BEFORE the lookup** —
  non-admin callers see 401 `'Unauthorized'` and the
  load-bearing `surveyService.getResponseById
  (responseId)` call is NEVER entered.
- **Single-route GET-only export** — the route
  exports ONLY `GET`. POST / PUT / PATCH / DELETE
  must round-trip to `< 500`.
- **`{ success: true, data: <response> }` success
  payload + `{ success: false, error: 'Response not
  found' }` 404 envelope** — UNIQUE: this is the
  FIRST per-source-file GET smoke pinning a
  `Response not found` 404 envelope (distinct from
  the sibling `surveys/[surveyId]` route which uses
  `Survey not found`).
- **`safeErrorResponse(error, 'Failed to fetch
  response')` outer-catch** — UNIQUE: the FIRST
  per-source-file GET smoke pinning a `'Failed to
  fetch response'` 500-catch helper (vs `'Failed to
  fetch responses'` on the plural-collection
  sibling
  [`surveys-id-responses-method-spec.md`](surveys-id-responses-method-spec.md)).

## Why this spec is the first GET smoke pinning the response-by-id detail surface

The route under test
([`apps/web/app/api/surveys/responses/[responseId]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/surveys/responses/[responseId]/route.ts))
exports ONLY `GET`. The handler combines:

1. **GET handler** — outer try/catch around:
   `auth()` session lookup
   (`!session?.user?.isAdmin` → 401 TWO-key
   `{ success: false, error: 'Unauthorized' }`);
   `surveyService.getResponseById(responseId)`
   load-bearing service call; 404
   `{ success: false, error: 'Response not found' }`
   if the result is null; success returns
   `{ success: true, data: <response> }`; outer
   catch
   `safeErrorResponse(error, 'Failed to fetch
   response')`.
2. **Method-resolution surface** — the route
   exports ONLY `GET`. POST / PUT / PATCH / DELETE
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **one bulk-loop walk** (~7 headers all
asserting `< 500`) and a battery of **hand-written
invariant scenarios**.

| Block                                                                                       | Purpose                                                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Header bulk-loop walk (GET)                                                                 | ~7 headers asserting `< 500`.                                                        |
| `test('GET … 401 envelope', …)`                                                             | Pins the canonical TWO-key 401 envelope.                                             |
| `test('GET … 401 envelope shape', …)`                                                       | Strict TWO-key envelope-shape assertion (no `data` / `message` leak).                |
| `test('GET … does NOT echo any of the post-auth messages', …)`                              | Pins the gate-before-post-auth ordering.                                             |
| `test('GET … surveyService.getResponseById is NOT entered on the unauth branch', …)`        | CRITICAL — pins path-segment XSS markers are NEVER echoed AND service NEVER executes.|
| `test('GET … does NOT branch on side-channel cookies / headers', …)`                        | Side-channel walk.                                                                   |
| `test('GET … cross-permutation status invariance', …)`                                      | Pins every header permutation produces a byte-identical 401 envelope.                |
| `test('Cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx', …)`                  | Method-resolution walk.                                                              |
| `test('GET … catch-branch helper "Failed to fetch response" is NOT echoed on unauth', …)`   | Pins that the 500-catch helper does NOT fire on the unauth branch.                   |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status.
2. **Canonical TWO-key 401 envelope**
   `{ success: false, error: 'Unauthorized' }`.
3. **Strict TWO-key envelope-shape preservation**
   — exactly `['error', 'success']` keys; no
   `data` / `message` leak.
4. **Gate-before-post-auth invariant** — none of
   the post-auth messages (`'Response not found'`,
   `'Failed to fetch response'`) leak on unauth.
5. **Gate-before-service-delegation invariant**
   (CRITICAL) — XSS markers placed in the
   `responseId` path-segment are NEVER echoed
   back AND
   `surveyService.getResponseById` NEVER executes
   on unauth.
6. **Side-channel isolation** — Cookie /
   Authorization / X-User-Id / X-Admin do NOT
   shift the response status.
7. **Cross-permutation status invariance** —
   every header permutation collapses to a byte-
   identical 401 envelope.
8. **Cross-method invariance** — POST / PUT /
   PATCH / DELETE return `< 500`.
9. **Catch-helper non-leak** — the
   `safeErrorResponse(error, 'Failed to fetch
   response')` outer-catch helper does NOT fire on
   the unauth branch.

## See also

- The companion plural-collection sibling
  [`surveys-id-responses-method-spec.md`](surveys-id-responses-method-spec.md)
  pins a SPLIT-auth gate (admin-GET + public-POST)
  on the parent
  `apps/web/app/api/surveys/[surveyId]/responses/route.ts`
  route. The plural-collection sibling uses
  `'Failed to fetch responses'` (note plural) for
  its 500-catch helper; this spec pins
  `'Failed to fetch response'` (singular) for the
  per-id helper.
- The companion survey detail sibling
  [`surveys-id-method-spec.md`](surveys-id-method-spec.md)
  pins a MIXED-auth gate
  (`apps/web/app/api/surveys/[surveyId]/route.ts`).
- The companion survey collection sibling
  [`surveys.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys.spec.ts)
  covers `apps/web/app/api/surveys/route.ts`.
- The companion survey-existence sibling
  [`surveys-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys-exists-query.spec.ts)
  covers
  `apps/web/app/api/surveys/exists/route.ts`.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
