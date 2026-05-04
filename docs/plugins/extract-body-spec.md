---
id: extract-body-spec
title: E2E Extract Body Spec (apps/web-e2e/tests/api/extract-body.spec.ts)
sidebar_label: E2E Extract Body Spec
sidebar_position: 554
---

# E2E Extract Body Spec — `apps/web-e2e/tests/api/extract-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**URL-extraction proxy POST body / header smoke spec**
paired with
[`apps/web-e2e/tests/api/extract-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/extract-body.spec.ts).

This is the **first non-admin-tree per-source-file
reference** the docs tree publishes — every prior
per-source-file e2e reference under `tests/api/`
covers an `apps/web/app/api/admin/**` route. This
spec covers the extraction-proxy at
`apps/web/app/api/extract/route.ts` — a non-admin
proxy that forwards to the Ever Works Platform API.

This is the **first non-admin-gated POST smoke** the
docs tree publishes that pins a **"feature disabled"
graceful-degradation branch**: when
`process.env.PLATFORM_API_URL` is missing, the
handler returns a **200** (NOT 401, NOT 503) with
the envelope `{ success: false, featureDisabled:
true, message: 'URL extraction feature is not
available. This feature requires PLATFORM_API_URL
to be configured.' }`. No prior smoke spec covers a
`featureDisabled: true` envelope shape.

It is also the **first POST smoke** the docs tree
publishes that uses **Zod `safeParse` + `result.
error.issues[0].message`** (NOT `flatten()` like the
admin-tree POST smokes such as `admin/items/import`)
to surface the FIRST validation issue as the 400
envelope's `error` field.

## Why this spec is the feature-disabled-graceful-degradation POST smoke

The route under test
([`apps/web/app/api/extract/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/extract/route.ts))
exports only `POST`. The handler combines:

1. **Feature-disabled gate** — `if
   (!platformApiUrl)` → 200 `{ success: false,
   featureDisabled: true, message: '<long
   message>' }`. NOTE: status 200, NOT a 4xx /
   5xx — the smoke spec pins this surprising status
   invariant.
2. **JSON body parse via `await request.json()`**
   AFTER the feature-disabled gate.
3. **Zod `safeParse` with single-issue surfacing**
   — `extractSchema.safeParse(body)` with
   `result.error.issues[0].message` → 400
   `{ success: false, error: '<first issue>' }`.
   Schema requires `url: z.string().url()` and
   optional `existingCategories: z.array
   (z.string())`.
4. **External fetch proxy** — builds extraction
   endpoint URL by trimming trailing slashes and
   POSTs to the Platform API with optional
   `Authorization: Bearer
   <PLATFORM_API_SECRET_TOKEN>` header.
5. **Upstream-error pass-through** — `if
   (!response.ok)`: tries to parse upstream error
   JSON for `errorData.message`, falls back to
   `response.statusText`, then returns
   `{ success: false, error: <message> }` with
   the upstream status.
6. **Success pass-through** — on 2xx upstream,
   returns the upstream payload verbatim.
7. **Outer catch** — `console.error` + 500
   `{ success: false, error: 'Internal server
   error during extraction' }`.
8. **Method-resolution surface** — the route
   exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

In the e2e test environment `PLATFORM_API_URL` is
NOT configured, so EVERY POST request lands on the
feature-disabled branch and gets a 200 response
regardless of body shape. This makes the spec a
pinning of the feature-disabled envelope as the
load-bearing invariant — a regression that wired up
`PLATFORM_API_URL` for tests OR removed the
feature-disabled gate would surface here as a
status-code change OR a `featureDisabled` key
disappearance.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~12 headers + ~15
bodies) and **eleven hand-written scenarios**.

| Block                                                                                     | Purpose                                                                                                                               |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of EXTRACT_HEADERS) test(…)`                               | Bulk-loop walk of every plausible header shape (~12 headers).                                                                         |
| `for (const { data, label } of EXTRACT_BODIES) test(…)`                                   | Bulk-loop walk of every plausible body shape (~15 bodies covering valid URLs, invalid URLs, type-violation probes).                   |
| `test('… returns 200 with the feature-disabled envelope', …)`                             | Pins the surprising 200 status with the `{ success: false, featureDisabled: true, message }` envelope.                                |
| `test('… envelope shape has exactly success / featureDisabled / message keys', …)`        | Strict envelope-shape assertion.                                                                                                      |
| `test('… does NOT echo the validation-error or upstream-error fields', …)`                | Negative-property assertion: `error` key must NOT appear on the feature-disabled branch.                                              |
| `test('… does NOT echo any of the post-feature-disabled messages', …)`                    | Pins the feature-disabled-before-validation order across three candidate messages.                                                    |
| `test('… has a stable status across header / body permutations', …)`                      | Six body permutations vs the no-body baseline.                                                                                        |
| `test('… does NOT branch on side-channel cookies / headers', …)`                          | Side-channel walk.                                                                                                                    |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`               | Method-resolution walk. Note: this route exports ONLY POST, so all four other methods are probed.                                     |
| `test('… is invariant to malformed JSON bodies on the feature-disabled branch', …)`       | Pins the feature-disabled-before-body-parse order.                                                                                    |
| `test('… Zod validation chain is NOT entered on the feature-disabled branch', …)`         | Pins the feature-disabled-before-validation order: the unauth response must NEVER echo `'Invalid URL format'`.                        |
| `test('… external fetch proxy is NOT entered on the feature-disabled branch', …)`         | Pins the feature-disabled-before-fetch order: the response must always include `featureDisabled: true` in the test environment.       |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~27 total) must round-trip to a
   `< 500` status.
2. **Feature-disabled envelope** `{ success: false,
   featureDisabled: true, message: '...' }` with
   status **200** on the gated branch.
3. **Strict envelope-shape preservation**.
4. **No `error` key on the feature-disabled branch**.
5. **Feature-disabled-before-post-feature-disabled
   invariant**.
6. **Status invariance across body permutations**.
7. **Side-channel isolation**.
8. **Cross-method invariance** — POST is the only
   exported method; the four other HTTP verbs must
   round-trip to `< 500`.
9. **Feature-disabled-before-body-parse invariant**.
10. **Feature-disabled-before-Zod-validation
    invariant**.
11. **Feature-disabled-before-external-fetch
    invariant**.

## See also

- The other Zod-based POST smokes in the admin tree
  use `flatten()` instead of
  `result.error.issues[0].message`:
  [`admin-items-import-validate-body-spec.md`](admin-items-import-validate-body-spec.md),
  [`admin-twenty-crm-config-save-body-spec.md`](admin-twenty-crm-config-save-body-spec.md).
- Other extraction / Platform-API touchpoints
  (none currently documented as per-source-file
  references).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
