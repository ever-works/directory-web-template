---
id: spec-024-ew-120-platform-activity-feed-plan
title: 'Spec 024 — Plan'
sidebar_label: '024 Plan'
---

# Plan — `024-ew-120-platform-activity-feed`

> See [`spec.md`](./spec.md) for the **what** and **why**. This document
> is the **how**.

## Constitution check

| Article                                                | Pass | Note                                                                                                                   |
| ------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------- |
| I. Boring choices over clever ones                     | ✔    | Plain Next.js route handler + Drizzle + Node `crypto`. No new deps.                                                    |
| II. One way to do things                               | ✔    | Reuses the existing `db` instance from `lib/db/drizzle.ts` and the `safeErrorResponse` helper.                         |
| III. Spec before code                                  | ✔    | Spec + plan landed alongside code in the same PR.                                                                      |
| IV. Plugin-first when possible                         | n/a  | Platform sync is a single integration contract, not a swap-out provider.                                               |
| V. Performance budget                                  | ✔    | Three indexed Drizzle queries, no N+1. Page caps at 200 entries.                                                       |
| VI. i18n / a11y                                        | n/a  | Server-only JSON endpoint, no UI surface in this template.                                                             |
| VII. Plugin & integration boundaries                   | ✔    | All EW-120 code lives under `lib/services/platform-activity-feed/` and `app/api/platform/`.                            |
| VIII. No silent removals                               | ✔    | Net-new files only. No existing routes or schemas changed.                                                             |
| IX. Test coverage bar                                  | ⚠    | Template has no Jest/Vitest setup. Manual verification via curl + signed test request. Tracked in `docs/questions.md`. |
| X. Continual improvement                               | ✔    | `docs/log.md` updated; spec indexed in `docs/spec/README.md`.                                                          |

## File layout

```
apps/web/
  app/api/platform/activity-feed/
    route.ts                     # Pull-mode route handler (GET only)
  lib/services/platform-activity-feed/
    hmac.ts                      # Pull: signature verification + canonical query
    types.ts                     # Wire types shared with platform contract
    feed-builder.ts              # Pull: Drizzle queries → normalised entries
    push-client.ts               # Push: fire-and-forget emitter with 2 retries

  # Push-mode emit sites (one call per file):
  lib/auth/index.ts                                   # createUser wrapper
  app/api/admin/items/route.ts                        # POST handler
  app/api/reports/route.ts                            # POST handler
  app/api/admin/reports/[id]/route.ts                 # PUT handler

  .env.example                   # PLATFORM_WORK_ID, _SYNC_SECRET, _ADMIN_BASE_URL,
                                 # _API_URL, _API_SECRET_TOKEN
docs/spec/024-ew-120-platform-activity-feed/
  spec.md
  plan.md
```

## Implementation walk-through

### 1. `hmac.ts` — verification primitive

- `canonicaliseQuery({ since, limit, types })` — rebuilds the same
  sorted, URI-encoded `key=value` string the platform signs. We
  re-derive it from validated params, NOT `URL.search`, because
  proxies and Next.js can reorder / add params that would otherwise
  poison the signed string.
- `verifyPlatformSignature(...)` — runs the four-step check:
  bearer prefix → timestamp parse → drift ≤ 5 minutes → constant-time
  hex compare with equal-length buffer trick (mirrors the platform's
  `PlatformSecretGuard` so timing leaks aren't a side channel).

### 2. `feed-builder.ts` — DB → wire-shape

Three async queries fanned out in `Promise.all`, each fetching up to
`limit` rows from its source (over-fetch so global newest-first
selection isn't starved by a dominant source — the same fix we made
on the platform side as Codex P1):

- `users` LEFT JOIN `clientProfiles` → `user_registered` entries.
- `itemAuditLogs WHERE action IN ('created','status_changed')` →
  `item_created` / `item_status_changed`.
- `reports` LEFT JOIN `clientProfiles` (reporter) → `report_created`.

After merge, sort by `timestamp` DESC, slice to `limit`, compute
`nextCursor` from the tail. Convert relative `target.adminUrl` paths
into absolute URLs against `PLATFORM_ADMIN_BASE_URL` (or the request
origin as fallback).

### 2b. `push-client.ts` — outbound emitter

`emitActivityEvent(input)` is the single entry point. Internally:

1. Reads `PLATFORM_API_URL`, `PLATFORM_API_SECRET_TOKEN`,
   `PLATFORM_WORK_ID` from env. Any missing → silent `return` (no log
   noise — OSS users not on the platform don't get spam).
2. Generates a fresh `eventId = crypto.randomUUID()`. The platform
   side enforces uniqueness on `(workId, eventId)`, so this gives us
   idempotency for free — a successful in-flight retry is a no-op
   server-side.
3. Trims `summary` to 500 chars (matches the platform DTO cap).
4. POSTs JSON to `${PLATFORM_API_URL}/api/activity-log/ingest` with
   `Authorization: Bearer ${PLATFORM_API_SECRET_TOKEN}`. 5-second
   `AbortController` timeout.
5. **202** → done. **4xx** → permanent failure, log + drop (401 bad
   token, 404 unknown work, 409 mode-mismatch, 400 bad payload all
   fall here). **5xx / network / timeout** → retry with 200ms then
   800ms backoff. After 2 retries fail, log + drop.
6. All failures `console.warn` with `eventId`, `actionType`, and the
   HTTP status / error message — enough to grep prod logs without
   leaking the bearer token.

Returns `Promise<void>` and never throws. Call sites use
`void emitActivityEvent(...)` to keep emission off the user-facing
critical path.

### 3. `route.ts` — Next.js handler

- Zod-validates `since` (ISO8601), `limit` (1–200, default 50),
  `types` (csv of `users|items|reports|all`).
- Reads `PLATFORM_SYNC_SECRET` + `PLATFORM_WORK_ID` from env; missing
  → 503 (`not_provisioned`).
- Bad query → 400 (`parse_error`).
- Bad signature / drift / missing headers → 401 (`unauthorized`).
- Success → 200 with `FeedResponse`.

Pinned `runtime = 'nodejs'` (we need Node `crypto`, not the Edge
subset) and `dynamic = 'force-dynamic'` (signed/timestamp-sensitive
responses must never be cached).

### 4. Push emit sites

Four call sites. Pattern is identical at each:

1. Let the existing DB write happen first (transactional commit).
2. `void emitActivityEvent({ actionType, summary, metadata })` —
   never awaited, so the user-facing response time isn't coupled to
   platform availability.
3. Use the inlined `displayName` style from the spec — most metadata
   fields are already in scope (e.g. `clientProfile.name` in the
   reports handler, `auditUser` in the items handler).

The `lib/auth/index.ts` site uses a **dynamic import** for the push
client because the auth file already does that for `./tenant` to
dodge a known circular-import cycle. Staying consistent there.

The `admin/reports/[id]` site guards on `existingReport.status !== status`
so re-saves on the same record don't double-emit a "resolved" event.

## Verification

### Playwright HTTP integration tests

`apps/web-e2e/tests/api/platform-activity-feed.spec.ts` — 12 cases,
mode-adaptive. Probes the endpoint once at the top to detect whether
the running server has `PLATFORM_SYNC_SECRET` + `PLATFORM_WORK_ID`
set, then runs the matching assertion set:

- **Unprovisioned** (CI default, no env vars):
  - `503` on a bare GET.
  - `503` still wins over a forged bearer + timestamp (the platform's
    "not_provisioned" banner must not be masked by an `unauthorized`
    response).
- **Provisioned** (local `.env.local` with both vars set):
  - `401` for missing Authorization, non-Bearer prefix, missing
    `x-platform-ts`, drift > 5 min, tampered query, single-byte
    flipped signature.
  - `200` with `{ entries, nextCursor, serverTime }` shape for a
    valid signed request.
- **Mode-independent**:
  - `< 500` for out-of-range `limit`, invalid `types` csv, malformed
    `since` (zod validation runs before signature check).

Not currently wired to the GitHub Actions CI gate (template CI is
`lint + build` only — see `CLAUDE.md` §4). Run manually with
`pnpm --filter @ever-works/web-e2e test platform-activity-feed`.

### Manual / shell verification

Template has no automated test runner today. Manual verification:

```bash
# from apps/web/ with .env.local set:
TS=$(node -e "console.log(new Date().toISOString())")
QS="limit=10&types=all"
SIG=$(node -e "
const c = require('crypto');
const s = process.env.PLATFORM_SYNC_SECRET;
const wid = process.env.PLATFORM_WORK_ID;
process.stdout.write(c.createHmac('sha256', s).update(\`\${process.argv[1]}:\${process.argv[2]}:\${wid}\`).digest('hex'));
" "$TS" "$QS")
curl -i "http://localhost:3000/api/platform/activity-feed?$QS" \
  -H "Authorization: Bearer $SIG" \
  -H "x-platform-ts: $TS"
```

Expected matrix (pull):

- `200` with entries when secret + work ID match and DB has rows.
- `200` with empty `entries` and `nextCursor: null` on a clean DB.
- `401` after tampering with the query string or flipping a byte in
  the signature.
- `401` after rewinding `x-platform-ts` by 10 minutes.
- `503` after unsetting `PLATFORM_SYNC_SECRET`.

Expected matrix (push) — point `PLATFORM_API_URL` at a local mock
server (`nc -l 3100` or `node -e 'http.createServer...'`):

- New user signup → exactly one `POST /api/activity-log/ingest`
  observed, `actionType: WEBSITE_USER_REGISTERED`, fresh UUID
  `eventId`, summary present.
- Admin item creation → one POST with `WEBSITE_ITEM_SUBMITTED`.
- Submitting a report → one POST with `WEBSITE_REPORT_FILED`.
- PUT a report to `status='resolved'` → one POST with
  `WEBSITE_REPORT_RESOLVED`.
- Re-PUT same report to `status='resolved'` → **no second POST** (the
  status-transition guard catches it).
- Stop the mock; signup → 2 retries observed, then a single
  `[platform-activity-push] giving up...` warning. User-facing
  response time isn't impacted.
- Unset `PLATFORM_API_URL` → signup completes with **no** outbound
  POST and **no** warning.

Repo-wide quality checks:

```bash
pnpm lint
pnpm tsc --noEmit
pnpm build
```

## Risks

- **Stale `clientProfiles` join** — if a user signs up but no profile
  row exists yet (race during onboarding), display name falls back
  to email → user-id. Acceptable v1 behaviour; not a correctness bug.
- **`itemAuditLogs` row volume** — busy directories could see
  thousands of audit rows per day. The `createdAt` index covers the
  `since` filter; the `limit` cap prevents pathological pages.
- **Multi-tenant deployments** — the template's `TENANT_ID` is not
  threaded into queries. A multi-tenant deployment with several
  Works on one instance would leak cross-tenant rows. Tracked in
  `docs/questions.md` with a default of "v1 single-tenant only".

## Rollout

1. Land this spec + endpoint on `develop`.
2. Platform side (ever-works PR #740) already encrypts and provisions
   `PLATFORM_SYNC_SECRET` per-Work via
   `WorkLifecycleService.createWork` / the secret-rotation endpoint.
3. Once a directory is redeployed with the env vars in place, the
   platform's "Activity Feed (pull)" UI lights up automatically.
4. Push-mode follow-up spec when product asks for it.
