---
id: cron-endpoints
title: Cron Job API Endpoints
sidebar_label: Cron Endpoints
sidebar_position: 6
---

# Cron Job API Endpoints

The template includes three cron job endpoints that run on scheduled intervals via Vercel Cron. These endpoints handle content synchronization, subscription reminders, and subscription expiration processing.

## Cron Configuration

Cron schedules are defined in `vercel.json`:

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

## Content Sync (`/api/cron/sync`)

| Method | Path | Schedule | Description |
|--------|------|----------|-------------|
| `GET` | `/api/cron/sync` | Daily at 3:00 AM UTC | Synchronize Git-based content repository |

### What It Does

The sync cron job pulls the latest content from the configured Git data repository (`DATA_REPOSITORY`) and updates the local content cache. This ensures the application reflects any changes made directly to the content repository (e.g., via GitHub PR merge).

### Sync Process

```
1. Verify CRON_SECRET authorization
2. Check if sync is already in progress (mutex lock)
3. Pull latest changes from remote Git repository
4. Parse and validate updated YAML content files
5. Update local content cache
6. Return sync result with duration
```

### Key Behaviors

- **Mutex lock**: Only one sync can run at a time. Concurrent requests are rejected with a status message
- **Timeout**: Sync operations have a 5-minute timeout to prevent runaway processes
- **Retry logic**: Failed syncs retry up to 3 times
- **Development mode**: Auto-sync can be disabled via `DISABLE_AUTO_SYNC=true` environment variable

### Response

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## Subscription Reminders (`/api/cron/subscription-reminders`)

| Method | Path | Schedule | Description |
|--------|------|----------|-------------|
| `GET` | `/api/cron/subscription-reminders` | Daily at 9:00 AM UTC | Send subscription renewal reminders |

### What It Does

Queries subscriptions approaching their renewal date and sends email reminders to subscribers. This helps reduce involuntary churn by alerting users before their payment is processed.

### Reminder Logic

```
1. Verify CRON_SECRET authorization
2. Query subscriptions renewing within reminder window
3. Filter out already-notified subscriptions
4. Send reminder emails via email notification service
5. Mark subscriptions as notified
6. Return count of reminders sent
```

### Reminder Windows

Typical reminder windows:
- **7 days before renewal**: First reminder
- **1 day before renewal**: Final reminder

### Response

```json
{
  "success": true,
  "message": "Subscription reminders sent",
  "data": {
    "reminders_sent": 15,
    "errors": 0
  }
}
```

## Subscription Expiration (`/api/cron/subscription-expiration`)

| Method | Path | Schedule | Description |
|--------|------|----------|-------------|
| `GET` | `/api/cron/subscription-expiration` | Daily at midnight UTC | Process expired subscriptions |

### What It Does

Identifies subscriptions past their expiration date and updates their status. This handles subscriptions that were cancelled but had remaining time, as well as subscriptions that failed to renew.

### Expiration Process

```
1. Verify CRON_SECRET authorization
2. Query subscriptions with expiration date in the past
3. Update subscription status to 'expired'
4. Revoke associated access/permissions
5. Send expiration notification emails
6. Log expiration events for audit trail
7. Return count of processed expirations
```

### Response

```json
{
  "success": true,
  "message": "Subscription expirations processed",
  "data": {
    "expired": 3,
    "errors": 0
  }
}
```

## Background Jobs (`/api/cron/jobs`)

The `background-jobs-init.ts` file in the cron jobs directory initializes background job processing. This sets up any recurring tasks that need to run within the application runtime.

## Security

### CRON_SECRET Verification

All cron endpoints verify a `CRON_SECRET` header or query parameter to prevent unauthorized execution:

```typescript
// Typical cron authorization check
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Vercel Cron Authorization

When deployed on Vercel, cron jobs are automatically called by Vercel's cron scheduler with the proper `CRON_SECRET` header. The secret is configured in the Vercel dashboard under project settings.

| Environment Variable | Description |
|---------------------|-------------|
| `CRON_SECRET` | Shared secret for cron job authorization |

### Manual Execution

Cron endpoints can be triggered manually for debugging by including the `CRON_SECRET` in the Authorization header:

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/sync
```

## Monitoring

### Sync Status

The sync cron job status can be monitored via:
- `/api/version/sync` - Returns last sync time and result
- Server logs - Sync operations are logged with `[SYNC_MANAGER]` prefix

### Error Handling

All cron jobs implement comprehensive error handling:
- Failed operations are logged with full error details
- Partial failures do not prevent processing of remaining items
- Error counts are included in the response for monitoring
- Critical failures trigger console errors for log aggregation alerts

## Schedule Reference

| Cron Expression | Meaning |
|----------------|---------|
| `0 3 * * *` | Every day at 3:00 AM UTC |
| `0 9 * * *` | Every day at 9:00 AM UTC |
| `0 0 * * *` | Every day at midnight UTC |

All times are in UTC. Consider your user base timezone distribution when adjusting these schedules.
