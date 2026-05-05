---
id: surveys-id-responses-method-spec
title: E2E Surveys [surveyId] Responses Method Spec (apps/web-e2e/tests/api/surveys-id-responses-method.spec.ts)
sidebar_label: E2E Surveys [surveyId] Responses Method Spec
sidebar_position: 612
---

# E2E Surveys [surveyId] Responses Method Spec — `apps/web-e2e/tests/api/surveys-id-responses-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**per-survey-responses GET / POST dynamic-segment /
body / header smoke spec** paired with
[`apps/web-e2e/tests/api/surveys-id-responses-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys-id-responses-method.spec.ts).

This is the **first per-source-file dual-method
smoke** the docs tree publishes that pins a
**SPLIT-auth gate contract** on a single per-source-
file route — `GET` is admin-gated (returns
`401 'Unauthorized'` for non-admin callers) while
`POST` is **PUBLIC** (any caller may submit a
response, with optional session capture for the
`userId` field). Distinct from the sibling
[`surveys/[surveyId]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/surveys/[surveyId]/route.ts)
which pins a MIXED-auth gate (public-GET +
admin-PUT + admin-DELETE).

## What's distinct from EVERY prior dual-method smoke

- **SPLIT-auth gate** — UNIQUE: the FIRST per-source-
  file dual-method smoke pinning an admin-GET +
  public-POST contract on the SAME dynamic-segment
  route. Most dual-method siblings either gate both
  methods (admin / auth) or leave both public.
- **POST is public + 404-survey-existence guard** —
  the POST handler does NOT call `auth()` for the
  gate; it calls `surveyService.getOne(surveyId)`
  after body validation and returns 404
  `'Survey not found'` if the survey does not exist.
  UNIQUE: the FIRST per-source-file POST smoke
  pinning a 404-existence guard BEFORE submission
  rather than as a 401 gate.
- **`body.data` JSON-object guard** — POST requires
  `body.data` to be a non-null object; 400
  `'Invalid request body: "data" is required'`
  otherwise. UNIQUE: a manual `typeof body.data ===
  'object' && body.data != null` guard, NOT a Zod
  `safeParse`.
- **IP / user-agent header capture** — POST captures
  `x-forwarded-for` (first comma-segment), falls
  back to `x-real-ip`, then to `'unknown'`; captures
  `user-agent` with `'unknown'` fallback. UNIQUE:
  the FIRST per-source-file POST smoke pinning an IP
  / user-agent header-capture contract.
- **`itemId` sourced from the SURVEY** — the POST
  handler sets `responseData.itemId = survey.itemId`
  (NOT `body.itemId`). UNIQUE: the handler IGNORES
  any caller-provided `itemId` and sources it from
  the survey row.
- **201 Created on success POST** — UNIQUE: the
  FIRST per-source-file POST smoke pinning a `201`
  (NOT `200`) success status.
- **`{ success: true, data: <responses> }` GET
  payload + paginated filter shape** — GET accepts
  `itemId` / `userId` / `startDate` / `endDate` /
  `page` / `limit` query parameters with a strict
  `/^\d+$/` regex on `page` / `limit` (anything
  else falls back to `undefined`).
- **Distinct catch-helper messages** —
  `safeErrorResponse(error, 'Failed to fetch
  responses')` outer-catch on GET vs
  `safeErrorResponse(error, 'Failed to submit
  response')` outer-catch on POST.

## Why this spec is the first SPLIT-auth dual-method smoke

The route under test
([`apps/web/app/api/surveys/[surveyId]/responses/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/surveys/[surveyId]/responses/route.ts))
exports `GET` AND `POST`. The handlers combine:

1. **GET handler** — outer try/catch around:
   `auth()` session lookup
   (`!session?.user?.isAdmin` → 401 TWO-key
   `{ success: false, error: 'Unauthorized' }`);
   query-param parsing with a `/^\d+$/` regex on
   `page` / `limit`; `surveyService.getResponses
   (surveyId, filters)` load-bearing service call;
   success returns `{ success: true, data:
   <responses> }`; outer catch
   `safeErrorResponse(error, 'Failed to fetch
   responses')`.
2. **POST handler** — outer try/catch around:
   JSON body parse; manual `typeof body.data ===
   'object' && body.data != null` guard → 400
   `'Invalid request body: "data" is required'`
   on miss; `surveyService.getOne(surveyId)`
   existence guard → 404
   `'Survey not found'` if survey missing;
   OPTIONAL `auth()` session capture for the
   `userId` field (NOT a gate — public callers
   submit anonymously); IP / user-agent header
   capture (`x-forwarded-for` → `x-real-ip` →
   `'unknown'`; `user-agent` → `'unknown'`);
   `surveyService.submitResponse(responseData)`
   load-bearing service call; success returns
   `{ success: true, data: <response>, message:
   'Response submitted successfully' }` with status
   201; outer catch
   `safeErrorResponse(error, 'Failed to submit
   response')`.
3. **Method-resolution surface** — the route
   exports `GET` AND `POST`. `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **three bulk-loop walks** (~9 headers
× 2 methods + ~7 query-string permutations + ~10
POST bodies all asserting `< 500`) and a battery of
**hand-written invariant scenarios**.

| Block                                                                                                | Purpose                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk (GET)                                                                          | ~9 headers (incl. IP / user-agent probes) asserting `< 500`.                                             |
| Header bulk-loop walk (POST)                                                                         | ~9 headers asserting `< 500`.                                                                            |
| GET query-string bulk-loop walk                                                                      | ~7 query permutations (page / limit / itemId / userId / date-range / non-numeric).                       |
| POST body bulk-loop walk                                                                             | ~10 body permutations (no body / empty / null / non-object / valid / bypass attempts).                   |
| `test('GET … 401 envelope', …)`                                                                      | Pins the canonical TWO-key 401 envelope on GET.                                                          |
| `test('GET … 401 envelope shape', …)`                                                                | Strict TWO-key envelope-shape assertion (no `data` / `message` leak).                                    |
| `test('GET … does NOT echo any of the post-auth messages', …)`                                       | Pins the gate-before-post-auth ordering.                                                                 |
| `test('GET … surveyService.getResponses is NOT entered on the unauth branch', …)`                    | CRITICAL — pins XSS markers in the query-string are NEVER echoed AND service NEVER executes.             |
| `test('GET … does NOT branch on side-channel cookies / headers', …)`                                 | Side-channel walk on GET.                                                                                |
| `test('POST … on a non-existent survey returns 404 Survey not found', …)`                            | Pins the public-POST + 404-existence-guard contract.                                                     |
| `test('POST … with missing data returns 400', …)`                                                    | Pins the `body.data` JSON-object guard.                                                                  |
| `test('POST … 400 fires BEFORE the 404-existence guard', …)`                                         | Pins the validation-before-existence ordering.                                                           |
| `test('POST … non-object data values return 400', …)`                                                | Pins the `typeof === 'object' && != null` shape across string / number / boolean.                        |
| `test('POST … surveyService.submitResponse is NOT entered on the unauth-survey branch', …)`         | CRITICAL — pins XSS markers in the body are NEVER echoed AND service NEVER executes.                     |
| `test('POST … 404 envelope shape', …)`                                                               | Strict TWO-key envelope-shape assertion.                                                                 |
| `test('POST … 400 envelope shape', …)`                                                               | Strict TWO-key envelope-shape assertion.                                                                 |
| `test('POST … does NOT branch on side-channel cookies / headers', …)`                                | Side-channel walk on POST.                                                                               |
| `test('POST … ignores caller-supplied IP / user-agent for the 404 envelope', …)`                     | Pins that header-capture only fires on the success path.                                                 |
| `test('Cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                                  | Method-resolution walk.                                                                                  |
| `test('GET and POST … have DISTINCT 401-vs-404 envelopes', …)`                                       | Pins the SPLIT-auth contract — GET 401 / POST 404 are distinct envelopes.                                |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body / query-string permutation must round-trip
   to a `< 500` status.
2. **Canonical TWO-key 401 envelope on GET**
   `{ success: false, error: 'Unauthorized' }`.
3. **Canonical TWO-key 404 envelope on POST**
   `{ success: false, error: 'Survey not found' }`.
4. **Canonical TWO-key 400 envelope on POST**
   `{ success: false, error: 'Invalid request body:
   "data" is required' }`.
5. **Strict TWO-key envelope-shape preservation**
   on every error envelope.
6. **Gate-before-post-auth invariant** on GET —
   none of the post-auth messages leak on unauth.
7. **Validation-before-existence invariant** on
   POST — `body.data` validation fires BEFORE the
   `surveyService.getOne` existence guard.
8. **Gate-before-service-delegation invariant**
   (CRITICAL) on GET — XSS markers in the query-
   string are NEVER echoed AND
   `surveyService.getResponses` NEVER executes on
   unauth.
9. **Survey-existence-before-service-delegation
   invariant** (CRITICAL) on POST — XSS markers in
   the body are NEVER echoed AND
   `surveyService.submitResponse` NEVER executes on
   a non-existent survey.
10. **Cross-method invariance** — PUT / PATCH /
    DELETE return `< 500`.
11. **Side-channel isolation** on both GET and
    POST.
12. **IP / user-agent header isolation on the 404
    branch** — header-capture only fires on the
    success path; the 404 envelope is invariant to
    fabricated `X-Forwarded-For` / `X-Real-IP` /
    `User-Agent` headers.
13. **SPLIT-auth distinct-envelope contract** —
    GET 401 and POST 404 envelopes are NOT byte-
    identical.

## See also

- The companion survey detail sibling
  [`surveys-id-method-spec.md`](surveys-id-method-spec.md)
  pins a MIXED-auth gate on the parent route
  (public-GET + admin-PUT + admin-DELETE for
  `apps/web/app/api/surveys/[surveyId]/route.ts`).
- The companion per-response sibling
  [`surveys-responses-id-query-spec.md`](surveys-responses-id-query-spec.md)
  pins the admin-gated `GET` on
  `apps/web/app/api/surveys/responses/[responseId]/route.ts`.
- The companion survey collection sibling
  [`apps/web/app/api/surveys/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/surveys/route.ts)
  is covered by
  [`surveys.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys.spec.ts).
- The companion survey-existence sibling
  [`surveys-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys-exists-query.spec.ts)
  is the existence-check helper for the
  `apps/web/app/api/surveys/exists/route.ts`
  endpoint.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
