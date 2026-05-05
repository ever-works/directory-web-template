---
id: item-views-record-body-spec
title: E2E Item Views Record Body Spec (apps/web-e2e/tests/api/item-views-record-body.spec.ts)
sidebar_label: E2E Item Views Record Body Spec
sidebar_position: 555
---

# E2E Item Views Record Body Spec — `apps/web-e2e/tests/api/item-views-record-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public per-item view-tracking POST body / header smoke
spec** paired with
[`apps/web-e2e/tests/api/item-views-record-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-views-record-body.spec.ts).

This is the **first non-admin POST smoke** the docs tree
publishes that pins a **bot-detection
graceful-degradation branch** AS the load-bearing test
invariant. The route under test imports `isBot()` from
[`apps/web/lib/utils/bot-detection.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib/utils/bot-detection.ts),
whose `BOT_PATTERNS` regex array contains `/bot/i`,
`/crawl/i`, `/spider/i`, `/playwright/i`,
`/puppeteer/i`, `/headless/i`, `/curl/i`,
`/python-requests/i`, `/axios/i`, `/node-fetch/i` AND
treats an empty UA as a bot. The smoke spec
**explicitly sets** a known-bot User-Agent
(`Googlebot/2.1`) on the deterministic-assertion tests
so the bot gate fires regardless of the Playwright
runtime's default UA, BEFORE the route ever calls
`itemRepository.findBySlug(...)`, the `auth()` owner
check, the `cookies()` viewer-id read, OR the
`recordItemView(...)` write — making the canonical
envelope `{ success: true, counted: false, reason:
'bot' }` (status 200) the load-bearing invariant for
the spec.

It is also the **first POST smoke** the docs tree
publishes that pins a **synthetic-User-Agent override
branch** — the same endpoint, called with a non-bot
UA against an intentionally non-existent slug,
progresses past the bot gate, reaches
`itemRepository.findBySlug(slug)`, and lands on the
`if (!item) return 404 { success: false, error:
'Item not found' }` branch. The two branches together
surface the gate-before-find order as a load-bearing
invariant: a regression that re-orders the
`findBySlug(...)` call before the bot gate would
surface here as a `data`-key disclosure on the bot
branch OR as a status-code change.

## Why this spec is the bot-detection-graceful-degradation POST smoke

The route under test
([`apps/web/app/api/items/[slug]/views/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/%5Bslug%5D/views/route.ts))
exports only `POST`. The handler combines:

1. **Database availability gate** — `if
   (!process.env.DATABASE_URL) return 503 { error:
   'Database not configured', code:
   'DATABASE_UNAVAILABLE', message: '<long
   message>' }`. In the e2e environment
   `DATABASE_URL` IS set, so this branch must NOT
   fire — the matrix asserts a `< 500` status AND
   specifically asserts `response.status() !== 503`
   for the no-arg POST.
2. **Bot-detection gate** — `if (isBot(userAgent))
   return 200 { success: true, counted: false,
   reason: 'bot' }`. The `BOT_PATTERNS` array
   includes `/bot/i`, `/crawl/i`, `/spider/i`,
   `/playwright/i`, `/puppeteer/i`, `/headless/i`,
   `/curl/i` etc, AND treats an empty UA as a bot.
   The deterministic-assertion tests below set a
   known-bot UA (`Googlebot/2.1`) explicitly to pin
   this branch.
3. **Item existence check** — `const item = await
   itemRepository.findBySlug(slug); if (!item)
   return 404 { success: false, error: 'Item not
   found' }`. Reachable ONLY when the UA is
   overridden to a non-bot string.
4. **Owner exclusion gate** — `const session = await
   auth(); if (session?.user?.id && item.submitted_by
   === session.user.id) return 200 { success: true,
   counted: false, reason: 'owner' }`. Reachable
   ONLY for an authenticated session whose `user.id`
   matches the item's `submitted_by`. The matrix
   below is anonymous, so this branch must NEVER
   fire.
5. **Viewer-cookie read / write** — reads the
   `ever_viewer_id` cookie via `cookies()`,
   generates a `crypto.randomUUID()` if absent, sets
   the cookie with `httpOnly: true`, `sameSite:
   'lax'`, `path: '/'`, and `maxAge:
   VIEWER_COOKIE_MAX_AGE` (365 days) on the
   first-write branch.
6. **View recording** — `recordItemView({ itemId:
   slug, viewerId, viewedDateUtc })` returns
   `counted: boolean`. Response: `{ success: true,
   counted }`.
7. **Outer catch** — `console.error` (dev-only) +
   500 `{ success: false, error: 'Failed to record
   view' }`. Out of scope for the bot branch (gate
   fires BEFORE the try block's risky calls).
8. **Method-resolution surface** — the route exports
   ONLY `POST`. `GET` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status (typically
   405 Method Not Allowed).

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~18 headers + ~13
bodies) and **fourteen hand-written scenarios**.

| Block                                                                                                                | Purpose                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `for (const { headers, label } of ITEM_VIEWS_RECORD_HEADERS) test(…)`                                                | Bulk-loop walk of every plausible header shape (~18 headers) including UA-override probes for the known-bot, non-bot, and empty-UA branches.                                                          |
| `for (const { data, label } of ITEM_VIEWS_RECORD_BODIES) test(…)`                                                    | Bulk-loop walk of every plausible body shape (~13 bodies covering bypass attempts targeting the bot gate, fabricated viewerId / itemId / submitted_by fields, and large padded body).                  |
| `test('… returns 200 with the bot-branch envelope under a known-bot User-Agent', …)`                                 | Pins the canonical envelope `{ success: true, counted: false, reason: 'bot' }` under explicit `Googlebot/2.1` UA.                                                                                      |
| `test('… envelope shape on the bot branch has exactly success / counted / reason keys', …)`                          | Strict envelope-shape assertion.                                                                                                                                                                       |
| `test('… does NOT echo the post-bot-gate keys on the bot branch', …)`                                                | Negative-property assertion: `error`, `data`, `code` must NOT appear; `success` must be `true`.                                                                                                        |
| `test('… does NOT echo any of the post-bot-gate messages on the bot branch', …)`                                     | Pins the gate-before-post-bot order across three candidate static messages.                                                                                                                            |
| `test('… has a stable status across header / body permutations on the bot branch', …)`                               | Seven body / header permutations vs the no-body baseline.                                                                                                                                              |
| `test('… does NOT branch on side-channel cookies / headers on the bot branch', …)`                                   | Side-channel walk.                                                                                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                                          | Method-resolution walk.                                                                                                                                                                                |
| `test('… is invariant to malformed JSON bodies on the bot branch', …)`                                               | Pins the gate-before-body-read order — the route never calls `request.json()`, so malformed JSON bodies still land on the same 200 envelope.                                                          |
| `test('… item-not-found 404 branch is NOT entered on the bot branch', …)`                                            | Pins the gate-before-find order: the unauth bot response must NEVER echo a 404 status OR an `'Item not found'` message.                                                                                |
| `test('… database-unavailable 503 branch is NOT entered when DATABASE_URL is configured', …)`                        | Pins the post-DATABASE_URL-configuration invariant: NEVER 503, NEVER `'DATABASE_UNAVAILABLE'` code, NEVER `'Database not configured'` message.                                                         |
| `test('… with a non-bot User-Agent override progresses past the bot gate to the item-not-found 404 branch', …)`      | Pins the gate-before-find order from the non-bot side: non-bot UA + non-existent slug → 404 `{ success: false, error: 'Item not found' }`.                                                            |
| `test('… with a non-bot User-Agent override does NOT echo the bot-branch envelope', …)`                              | Pins the gate-before-find order from the non-bot side: NO `reason: 'bot'` echo, NO `counted: false` echo, MUST have `success: false`.                                                                  |
| `test('… owner-exclusion branch is NOT entered on an anonymous request', …)`                                         | Pins the auth-required-for-owner-branch order: anonymous requests can NEVER receive `reason: 'owner'`, regardless of UA OR `submitted_by` body field bypass attempts.                                  |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~31 total) must round-trip to a
   `< 500` status.
2. **Canonical bot envelope** `{ success: true,
   counted: false, reason: 'bot' }` under explicit
   known-bot User-Agent.
3. **Strict envelope-shape preservation** on the bot
   branch.
4. **Post-bot-gate-key non-disclosure** — `error`,
   `data`, `code` keys must NOT appear in any bot
   response.
5. **Gate-before-post-bot invariant** across three
   candidate static messages.
6. **Status invariance across body permutations** on
   the bot branch.
7. **Side-channel isolation** on the bot branch.
8. **Cross-method invariance**.
9. **Gate-before-body-read invariant** — the bot
   gate fires BEFORE `request.json()` would (the
   route never reads the body).
10. **Gate-before-find invariant** pinning that
    `itemRepository.findBySlug(...)` is NOT called
    on the bot branch.
11. **Database-availability invariant** pinning that
    the 503 branch never fires when `DATABASE_URL`
    is configured.
12. **Synthetic-UA non-bot override branch** —
    progresses past the bot gate and lands on the
    404 `{ success: false, error: 'Item not found' }`
    envelope.
13. **Bot-branch non-disclosure on the non-bot
    branch** — the `reason: 'bot'` echo must NEVER
    appear under a non-bot UA.
14. **Owner-exclusion-not-entered invariant** for
    anonymous requests — `reason: 'owner'` must
    NEVER appear regardless of UA OR body-field
    bypass attempts.

## See also

- [`extract-body-spec.md`](extract-body-spec.md) — the
  first non-admin-tree per-source-file body-surface
  reference (URL-extraction proxy with feature-disabled
  graceful-degradation branch). This views-record spec
  is the SECOND non-admin-tree body-surface reference
  and the FIRST that pins a bot-detection
  graceful-degradation branch.
- [`item-vote-count-query-spec.md`](item-vote-count-query-spec.md) —
  if it exists, the GET-sibling for the same
  `apps/web/app/api/items/[slug]/...` namespace.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
- [Spec 008 — Analytics Providers](../spec/008-analytics-providers/spec.md)
  is the analytics-providers spec the views route sits
  inside (the item detail page POSTs to this endpoint
  on every render to record a unique daily view, with
  bot-detection and owner-exclusion gates protecting
  the count from inflation).
