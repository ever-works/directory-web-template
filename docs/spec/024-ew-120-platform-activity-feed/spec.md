---
id: spec-024-ew-120-platform-activity-feed
title: 'Spec 024 — EW-120 Platform Activity Feed (pull endpoint + push emitter)'
sidebar_label: '024 Activity Feed'
---

# Feature spec — `024-ew-120-platform-activity-feed`

> **Status:** proposed.
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code),
> VII (Plugin & Integration Boundaries),
> IX (Test Coverage Bar — Definition of Done).

## 1. Summary

The Ever Works platform (EW-120) needs a way to surface activity that
happens **on the deployed directory site** — new user registrations,
user-submitted items, items moving through admin review, and content
reports — back to the operator inside the platform's "Activity Feed"
tab. The platform supports two transports for that:

- **push** — the deployed site `POST`s each event to the platform's
  `/api/activity-log/ingest` endpoint as it happens.
- **pull** — the platform reaches into the deployed site over HMAC and
  asks for a paginated window of recent events.

This spec covers **both halves** of the template-side contract:

1. **Pull mode** — `GET /api/platform/activity-feed`. Authenticates
   each request with a per-Work HMAC-SHA256 signature, returns a
   normalised JSON window of the three event sources already backed
   by the template's Drizzle schema (`users`, `itemAuditLogs`,
   `reports`). Wire-compatible with the platform's
   `DirectoryWebsiteClient` (see ever-works repo,
   `apps/api/src/works/activity-feed/directory-website-client.service.ts`).
2. **Push mode** — outbound `POST $PLATFORM_API_URL/api/activity-log/ingest`
   fired from four event hook sites: user registration, item creation,
   report filed, report resolved. Fire-and-forget with 2 short
   retries; bearer-token auth; idempotent on `(workId, eventId)`.

Only one mode is **live for a given Work** at a time (the operator
picks per-Work on the platform UI; the unused half's traffic is
rejected or silently no-ops). Both code paths ship together so a
template deploy is mode-agnostic.

## 2. Motivation

- The platform PR
  ([ever-works#740](https://github.com/ever-works/ever-works/pull/740))
  built the entire pull-side stack — schema migration, encrypted
  per-Work secret store, HTTP client with retry / timeout / drift
  checking, mode-aware service routing, UI banner + degraded states —
  but it has no upstream to talk to. Without this endpoint on each
  deployed site, `activitySyncMode === 'pull'` always degrades to
  `not_provisioned`.
- Operators are asking for a feed of "what happened on my directory"
  without us having to invent a brand-new transport. Pull mode lets
  the deployed site stay passive: no outbound traffic when nobody is
  looking, exact-once delivery on demand, no retry queues. That
  removes a whole class of failure modes from the directory side.
- Push-only would require every deployed instance to be reachable
  from the platform's outbound IPs AND keep a working secret pinned
  in env at all times. Pull lets the platform initiate, which is the
  shape we already have for every other platform-→-template surface
  (cron pings, sponsor-ad fan-out, etc.).

## 3. Goals

- Expose `GET /api/platform/activity-feed` that, given a valid HMAC
  signature, returns a JSON page of the three event sources.
- Verify each request with a constant-time HMAC-SHA256 comparison
  matching the platform's `DirectoryWebsiteClient.sign` scheme
  exactly: `HMAC-SHA256(secret, ${timestamp}:${queryString}:${workId})`.
- Reject stale requests (timestamp drift > 5 minutes) and replays.
- Return ≤ 200 entries per page, cursor-paginated by timestamp.
- Default to `503 not_provisioned` when env vars are missing so the
  platform surfaces a clean "configure pull mode" banner rather than
  a runtime error.
- Stay on the same Node.js runtime + Drizzle stack the rest of the
  template uses — no new dependencies, no edge runtime.

## 4. Non-goals

- **Comments / votes / favourites / item views** — these exist in the
  schema but aren't part of the EW-120 v1 entry-type vocabulary on
  the platform side. We can extend later without breaking the wire.
- **Multi-tenant fan-out** — one deployed site = one Work. The
  template's tenant column is independent of the platform's Work ID.
- **Rate limiting on pull** — the platform is the sole caller and
  self-throttles.
- **Durable push queue** — push uses fire-and-forget with 2 in-process
  retries. Adding BullMQ/Redis would force every self-hoster to
  provision Redis just for activity-feed UI. Idempotency on the
  platform side (`(workId, eventId)` unique constraint) covers the
  duplicate case; the dropped-on-outage case is acceptable for v1
  because activity-feed is display-only. Swapping for queue-backed
  emission later is a ~50-line change behind the same
  `emitActivityEvent(...)` API.
- **Admin UI for inspecting recent pulls / push attempts** — out of
  scope for v1.

## 5. User-visible behaviour

Operators don't see this endpoint directly. The behaviour they observe
is in the Ever Works platform UI:

- Before any deploy that wires the env vars in, the platform shows a
  "pull mode is not provisioned on this directory" banner with a
  link to settings.
- Once `PLATFORM_SYNC_SECRET` + `PLATFORM_WORK_ID` are set and the
  site is redeployed, the Activity Feed tab starts showing
  `directory-site` entries (users / items / reports), merged into
  the existing platform-side feed and sorted newest-first.
- If the secret falls out of sync (rotation gap, stale env), the
  platform falls back to `unauthorized` and the operator gets a
  "rotate secret" CTA on the platform settings page.

## 6. Wire contract — pull mode

### Request

```
GET /api/platform/activity-feed?since=<ISO8601>&limit=<int>&types=<csv>
Authorization: Bearer <hex-hmac>
x-platform-ts: <ISO8601>
User-Agent: ever-works-platform/activity-feed
```

- `since` (optional) — **cursor** from the previous page; entries with
  `timestamp < since` are returned (newest-first pagination — the
  cursor is the OLDEST timestamp of the page that preceded it, so
  follow-up pages return strictly OLDER rows).
- `limit` (1–200, default 50) — page size.
- `types` — comma-separated, one or more of `users,items,reports,all`.

The HMAC is computed over the **canonical** form of the query (sorted
lexicographically, URI-encoded, `since` omitted when absent):

```
HMAC-SHA256(secret, `${timestamp}:${canonicalQuery}:${workId}`)
```

### Response

```json
{
	"entries": [
		{
			"id": "user:<uuid>",
			"type": "user_registered",
			"timestamp": "2026-05-14T16:00:00.000Z",
			"summary": "alice signed up",
			"actor": { "id": "<uuid>", "name": "alice", "email": "a@example.com" },
			"target": { "id": "<uuid>", "type": "user", "name": "alice", "adminUrl": "https://site/admin/users/<uuid>" }
		}
	],
	"nextCursor": "2026-05-14T15:55:00.000Z",
	"serverTime": "2026-05-14T16:01:23.456Z"
}
```

- `type` ∈ `user_registered | item_created | item_status_changed | report_created`.
- `target.type` ∈ `user | item | report`.
- `nextCursor` is the timestamp of the LAST (oldest) entry returned,
  or `null` when the page wasn't full. The platform threads it back
  as `since` on the next request and the server returns entries with
  `timestamp < nextCursor` (exclusive — strictly older).
- `serverTime` is used by the platform for drift detection (rejects
  if > 5 minutes off).

### Status codes

| Status | Meaning on platform side                              |
| ------ | ----------------------------------------------------- |
| 200    | success                                               |
| 400    | `parse_error` — bad query (platform stops retrying)   |
| 401    | `unauthorized` — bad signature / drift / missing hdrs |
| 503    | `not_provisioned` — env vars missing                  |

## 6b. Wire contract — push mode

### Request (template → platform)

```
POST $PLATFORM_API_URL/api/activity-log/ingest
Authorization: Bearer $PLATFORM_API_SECRET_TOKEN
Content-Type: application/json
User-Agent: ever-works-directory-template/activity-feed-push

{
	"workId": "<uuid>",
	"eventId": "<uuid>",
	"actionType": "WEBSITE_USER_REGISTERED" | "WEBSITE_ITEM_SUBMITTED"
	            | "WEBSITE_REPORT_FILED"  | "WEBSITE_REPORT_RESOLVED",
	"occurredAt": "2026-05-14T17:00:00.000Z",
	"summary": "alice signed up",
	"metadata": { "userId": "...", "email": "..." }
}
```

- `eventId` is a fresh UUID per call; the platform stores
  `(workId, eventId)` uniquely so retries are idempotent.
- `summary` is capped at 500 chars in the client before send (matches
  the platform DTO's `MaxLength(500)`).
- `metadata` is optional; the platform caps it at 8KB serialised.

### Status handling (template → platform)

| Status | Template behaviour                                          |
| ------ | ----------------------------------------------------------- |
| 202    | success — event accepted, stop                              |
| 4xx    | **permanent** — give up after one attempt, log and move on  |
| 5xx    | retryable — back off 200ms → 800ms (2 retries), then drop   |
| network/timeout | retryable — same backoff as 5xx                    |

`409 mode-mismatch` (Work is configured for pull / disabled) and `401`
(bad token) are 4xx → permanent. Retrying won't change the answer.

### Emit sites

Four locations in the template emit fire-and-forget. Order matters:
the DB write happens **first**, the emit is queued **after** the
successful local commit so a transient platform issue doesn't poison
the user-facing operation.

| Site                                     | Trigger                                          | Action type                 |
| ---------------------------------------- | ------------------------------------------------ | --------------------------- |
| `lib/auth/index.ts` `createUser`         | NextAuth.js adapter inserts a `users` row        | `WEBSITE_USER_REGISTERED`   |
| `app/api/admin/items/route.ts` `POST`    | Admin creates an item (writes `itemAuditLogs`)   | `WEBSITE_ITEM_SUBMITTED`    |
| `app/api/reports/route.ts` `POST`        | User files a content report                      | `WEBSITE_REPORT_FILED`      |
| `app/api/admin/reports/[id]/route.ts` `PUT` | Status transitions to `resolved` or `dismissed` | `WEBSITE_REPORT_RESOLVED`   |

The `report resolved` emit is **conditional**: it only fires when the
status actually transitions to a terminal state (`existingReport.status !== status`
guard) so re-saves on the same record don't double-emit.

## 7. Data sources

| DB table         | Filter                                                | Entry `type`            | Target type |
| ---------------- | ----------------------------------------------------- | ----------------------- | ----------- |
| `users`          | LEFT JOIN `clientProfiles` for display name           | `user_registered`       | `user`      |
| `itemAuditLogs`  | `action IN ('created','status_changed')`              | `item_created` / `item_status_changed` | `item` |
| `reports`        | LEFT JOIN `clientProfiles` for reporter name          | `report_created`        | `report`    |

Each source is queried with a per-source over-fetch of `limit` rows
(not `limit / sourceCount`), then merged globally by timestamp DESC
and trimmed to `limit`. This avoids the same dominant-source starvation
bug the platform side just fixed (EW-120 Codex P1, commit `4070ec08`).

## 8. Environment variables

| Var                         | Required for           | Purpose                                                       |
| --------------------------- | ---------------------- | ------------------------------------------------------------- |
| `PLATFORM_WORK_ID`          | both modes             | UUID of this directory's Work                                 |
| `PLATFORM_SYNC_SECRET`      | pull                   | HMAC secret used to verify incoming platform requests         |
| `PLATFORM_ADMIN_BASE_URL`   | optional (pull)        | Absolute base for `target.adminUrl` (defaults request origin) |
| `PLATFORM_API_URL`          | push                   | Base URL of the platform API (e.g. `https://api.ever.works`)  |
| `PLATFORM_API_SECRET_TOKEN` | push                   | Bearer token for `POST /api/activity-log/ingest`              |

There's no separate enable/disable toggle — the env vars **are** the
feature flag:

- Pull mode: `PLATFORM_SYNC_SECRET` + `PLATFORM_WORK_ID` set → live.
  Either blank → endpoint returns `503 not_provisioned`.
- Push mode: `PLATFORM_API_URL` + `PLATFORM_API_SECRET_TOKEN` +
  `PLATFORM_WORK_ID` set → emit on each event. Any missing → silent
  no-op (no log noise — OSS users who aren't using the platform's
  Activity Feed feature don't get warnings on every signup).

## 9. Security posture

**Pull mode (incoming):**

- Constant-time HMAC compare (`timingSafeEqual` against an
  equal-length buffer regardless of attacker-controlled token length).
- Work ID is part of the signed payload so a leaked secret for one
  Work can't be replayed against another Work hosted on the same
  template instance (multi-tenant deployments).
- 5-minute drift window mitigates replay; the platform applies the
  same cap on our `serverTime`.
- Endpoint reads the canonical query from validated params, not from
  `URL.search` — proxies / Next.js can normalise / add params, and we
  must not let those into the signed string.
- No tenant data crosses the boundary beyond what the platform needs
  to render an admin link (id, display name, action type, timestamp).

**Push mode (outgoing):**

- 5-second per-request timeout via `AbortController` so a slow
  platform never wedges the user-facing operation.
- 2 in-process retries with bounded backoff (200ms → 800ms) — total
  worst-case latency from emit to give-up is ~6 seconds, all on the
  background `void` promise.
- Bearer token never logged. Failure messages quote HTTP status + a
  200-char body slice but the request body itself is not echoed.
- Metadata payloads exclude PII beyond what's strictly needed for the
  operator-facing feed (e.g. email is included on user-registered so
  admins can match support tickets — same data already in the
  platform's user list).

## 10. Open questions

- Do we need a `tenantId` filter when `TENANT_ID` is set? V1 returns
  everything; multi-tenant deployments are extremely rare on this
  template today. Tracked in `docs/questions.md` with a default of
  "no filter".
- Should `itemAuditLogs.action = 'reviewed'` map to
  `item_status_changed` too? V1 omits it because the platform vocab
  doesn't have a distinct "reviewed" state. Default: only `created`
  + `status_changed`.

## 11. References

- Platform PR: [ever-works#740](https://github.com/ever-works/ever-works/pull/740)
- Platform ADR-004: `docs/specs/decisions/004-activity-feed-push-vs-pull.md`
  (in the ever-works repo)
- Platform client implementation:
  `apps/api/src/works/activity-feed/directory-website-client.service.ts`
- Platform entry-type contract:
  `apps/api/src/works/activity-feed/dto/feed-entry.dto.ts`
