---
id: cron-api-endpoints
title: Cron API Endpoints
sidebar_label: Cron API
sidebar_position: 59
---

# Cron API Endpoints

The Cron API provides scheduled job endpoints that are triggered by Vercel Cron, external schedulers, or the internal `BackgroundJobManager`. All cron endpoints require authentication via the `CRON_SECRET` environment variable using a `Bearer` token in the `Authorization` header.

**Source directory:** `template/app/api/cron/`

---

## Authentication

Cron endpoints use a shared secret for authorization:

- **Production:** The `CRON_SECRET` environment variable must be set. Requests must include `Authorization: Bearer <CRON_SECRET>`.
- **Development:** If `CRON_SECRET` is not configured, access is allowed without authentication for a frictionless local development experience.
- **Security:** All cron endpoints use `crypto.timingSafeEqual()` for constant-time comparison to prevent timing attacks.

**Unauthorized response (401):**

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing cron secret"
}
```

---

## Vercel Cron Configuration

The cron schedule is defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

| Job | Schedule | Description |
|-----|----------|-------------|
| Content Sync | Daily at 3:00 AM UTC | Synchronizes content from the Git-based CMS |
| Subscription Reminders | Daily at 9:00 AM UTC | Sends renewal reminder emails |
| Subscription Expiration | Daily at midnight UTC | Processes expired subscriptions |

---

## Content Sync

Triggers a content synchronization from the Git-based CMS repository.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/cron/sync` |
| **Auth** | `CRON_SECRET` (Bearer token) |
| **Source** | `cron/sync/route.ts` |

### Response

**Status 200** -- Sync completed successfully.

```json
{
  "success": true,
  "timestamp": "2024-01-20T03:00:05.123Z",
  "duration": 5123,
  "message": "Sync completed successfully"
}
```

**Status 500** -- Sync failed.

```json
{
  "success": false,
  "timestamp": "2024-01-20T03:00:10.456Z",
  "duration": 10456,
  "message": "Cron sync failed",
  "details": "Error description"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the sync succeeded |
| `timestamp` | `string` (ISO 8601) | When the sync completed |
| `duration` | `number` | Duration in milliseconds |
| `message` | `string` | Human-readable status message |
| `details` | `string` (optional) | Additional details on failure |

### Response Headers

All responses include `Cache-Control: no-cache, no-store, must-revalidate` to prevent caching of sync results.

### curl Example

```bash
curl -s http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Subscription Expiration

Finds and processes expired subscriptions by updating their status from `active` to `expired` and sending notification emails.

| Property | Value |
|----------|-------|
| **Methods** | `GET`, `POST` |
| **Path** | `/api/cron/subscription-expiration` |
| **Auth** | `CRON_SECRET` (Bearer token) |
| **Source** | `cron/subscription-expiration/route.ts` |

### Response

**Status 200** -- Processed successfully.

```json
{
  "success": true,
  "message": "Processed 3 expired subscriptions",
  "data": {
    "processed": 3,
    "affectedUsers": [
      {
        "subscriptionId": "sub_abc123",
        "userId": "user_456",
        "planId": "standard"
      }
    ],
    "errors": [],
    "timestamp": "2024-01-20T00:00:05.123Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data.processed` | `number` | Number of subscriptions updated to expired |
| `data.affectedUsers` | `array` | List of affected subscriptions (no PII) |
| `data.errors` | `string[]` | Any non-fatal errors (e.g., email delivery failures) |
| `data.timestamp` | `string` | Processing timestamp |

### Processing Steps

1. Finds active subscriptions past their end date.
2. Updates status from `active` to `expired`.
3. Sends expiration notification emails via the email service.
4. Returns a summary -- email failures do not cause the entire job to fail.

### curl Example

```bash
# Via GET
curl -s http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"

# Via POST (also supported for manual triggers)
curl -s -X POST http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Subscription Reminders

Sends renewal reminder emails to users with subscriptions nearing their renewal date.

| Property | Value |
|----------|-------|
| **Methods** | `GET`, `POST` |
| **Path** | `/api/cron/subscription-reminders` |
| **Auth** | `CRON_SECRET` (Bearer token) |
| **Source** | `cron/subscription-reminders/route.ts` |

### Response

**Status 200** -- Job completed successfully.

```json
{
  "message": "Subscription reminder job completed",
  "success": true,
  "sent": 5,
  "errors": []
}
```

**Status 207** -- Job completed with partial errors (Multi-Status).

```json
{
  "error": "Job completed with errors",
  "success": false,
  "sent": 3,
  "errors": ["Failed to send reminder to user_123"]
}
```

### curl Example

```bash
curl -s http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Background Jobs Initialization

The background jobs module (`cron/jobs/background-jobs-init.ts`) is not an API endpoint but a singleton initialization module used to configure the scheduling mode on application startup.

**Source:** `cron/jobs/background-jobs-init.ts`

### Scheduling Modes

| Mode | Description |
|------|-------------|
| `vercel` | Jobs handled by Vercel Cron via `/api/cron/*` endpoints |
| `local` | Internal scheduler (for self-hosted deployments) |
| `trigger-dev` | Trigger.dev integration for managed background jobs |
| `disabled` | Background sync disabled (`DISABLE_AUTO_SYNC=true`) |

### Usage

```typescript
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';

// Called once from layout.tsx -- safe to call multiple times
await ensureBackgroundJobsInitialized();
```

### Key Features

- Uses `globalThis` for singleton state, ensuring initialization runs only once per process.
- Skips initialization during tests (`NODE_ENV=test`) and builds (`NEXT_PHASE=phase-production-build`).
- Failed initialization resets state to allow automatic retry on the next call.

---

## TypeScript Usage

```typescript
// Trigger content sync programmatically
async function triggerSync(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/sync', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();

  if (data.success) {
    console.log(`Sync completed in ${data.duration}ms`);
  } else {
    console.error('Sync failed:', data.message, data.details);
  }
}

// Check subscription expiration
async function processExpirations(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/subscription-expiration', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();
  console.log(`Processed ${data.data.processed} expirations`);

  if (data.data.errors.length > 0) {
    console.warn('Non-fatal errors:', data.data.errors);
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Production: Yes, Dev: No | Shared secret for cron endpoint authentication |
| `DISABLE_AUTO_SYNC` | No | Set to `true` to disable automatic content sync |
