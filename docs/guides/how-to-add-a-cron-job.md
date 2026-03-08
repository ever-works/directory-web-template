---
id: how-to-add-a-cron-job
title: "How to Add a Cron Job"
sidebar_label: "Add a Cron Job"
sidebar_position: 72
---

# How to Add a Cron Job

This guide explains how to add scheduled tasks to the template using Vercel Cron Jobs. Cron jobs are implemented as standard API routes that Vercel calls on a schedule defined in `vercel.json`.

## Prerequisites

- A Vercel project linked to the repository
- `CRON_SECRET` environment variable set in Vercel (for production authentication)
- Understanding of cron schedule expressions

---

## Architecture Overview

Cron jobs in the template follow this pattern:

```
vercel.json          <-- Cron schedule configuration
  |
app/api/cron/
  sync/route.ts                     <-- Content sync (daily at 3 AM)
  subscription-reminders/route.ts   <-- Email reminders (daily at 9 AM)
  subscription-expiration/route.ts  <-- Expiration check (daily at midnight)
  your-job/route.ts                 <-- Your new cron job
```

Each cron endpoint is a regular Next.js API route that:

1. Verifies the `CRON_SECRET` for authentication
2. Executes the job logic (usually by calling a service)
3. Returns a JSON response with success status and timing information

---

## Step 1: Define the Schedule in vercel.json

Open `vercel.json` and add your cron entry:

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
    },
    {
      "path": "/api/cron/cleanup-notifications",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

### Common Cron Schedules

| Schedule | Expression | Description |
|----------|-----------|-------------|
| Every hour | `0 * * * *` | At minute 0 of every hour |
| Daily at midnight | `0 0 * * *` | Once per day at 00:00 UTC |
| Daily at 9 AM | `0 9 * * *` | Once per day at 09:00 UTC |
| Weekly on Sunday | `0 2 * * 0` | Every Sunday at 02:00 UTC |
| Every 6 hours | `0 */6 * * *` | At minute 0 past every 6th hour |

Vercel Cron uses UTC timezone. On the Hobby plan, the minimum interval is once per day. On Pro and Enterprise plans, the minimum is once per minute.

---

## Step 2: Create the API Route

Create a new directory and route file under `app/api/cron/`:

```typescript
// app/api/cron/cleanup-notifications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/lib/services/notification.service";
import { safeErrorResponse } from "@/lib/utils/api-error";
import crypto from "crypto";

/**
 * Verify cron secret to prevent unauthorized access.
 * Uses timing-safe comparison to prevent timing attacks.
 * Requires CRON_SECRET in production, optional in development.
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow access if CRON_SECRET is not configured
  if (!cronSecret && process.env.NODE_ENV === "development") {
    console.log("[Cron] Bypassing auth in development (CRON_SECRET not set)");
    return true;
  }

  if (!cronSecret || !authHeader) {
    return false;
  }

  const expectedValue = `Bearer ${cronSecret}`;

  // Timing-safe comparison
  if (authHeader.length !== expectedValue.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(authHeader, "utf8"),
    Buffer.from(expectedValue, "utf8")
  );
}

/**
 * GET /api/cron/cleanup-notifications
 * Weekly cron job to clean up old read notifications
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[CRON] Notification cleanup triggered");

    // Run the cleanup (remove read notifications older than 90 days)
    const result = await NotificationService.cleanupOldNotifications(90);
    const duration = Date.now() - startTime;

    console.log(
      `[CRON] Cleanup completed in ${duration}ms: ${
        result.success
          ? `${result.deletedCount} notifications removed`
          : result.error
      }`
    );

    return NextResponse.json(
      {
        success: result.success,
        timestamp: new Date().toISOString(),
        duration,
        deletedCount: result.deletedCount,
      },
      {
        status: result.success ? 200 : 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    return safeErrorResponse(error, "Cron job failed");
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
```

---

## Step 3: Extract Job Logic into a Service

Keep route handlers thin. The actual work should live in a service or a dedicated job function:

```typescript
// lib/services/cleanup-jobs.ts

import { NotificationService } from "./notification.service";
import { Logger } from "@/lib/logger";

const logger = Logger.create("CleanupJobs");

export async function runNotificationCleanup(daysOld = 90) {
  logger.info(`Starting notification cleanup (older than ${daysOld} days)`);

  const result = await NotificationService.cleanupOldNotifications(daysOld);

  if (result.success) {
    logger.info(`Cleanup complete: ${result.deletedCount} notifications removed`);
  } else {
    logger.error("Cleanup failed", result.error);
  }

  return result;
}
```

Then simplify the route:

```typescript
// app/api/cron/cleanup-notifications/route.ts
import { runNotificationCleanup } from "@/lib/services/cleanup-jobs";

// Inside GET handler:
const result = await runNotificationCleanup(90);
```

---

## Step 4: Test Locally

In development, cron endpoints work like any API route. Call them directly:

```bash
# Without CRON_SECRET (development only)
curl http://localhost:3000/api/cron/cleanup-notifications

# With CRON_SECRET
curl -H "Authorization: Bearer your-secret" \
  http://localhost:3000/api/cron/cleanup-notifications
```

---

## Step 5: Set the CRON_SECRET in Vercel

In your Vercel project settings, add the `CRON_SECRET` environment variable. Vercel automatically sends this secret in the `Authorization: Bearer <secret>` header when invoking cron jobs.

```
CRON_SECRET=your-random-secret-string
```

Generate a secure secret:

```bash
openssl rand -base64 32
```

---

## Response Format Convention

Follow the response pattern used by existing cron jobs:

```typescript
{
  success: boolean;
  timestamp: string;       // ISO 8601
  duration: number;        // milliseconds
  message: string;         // Human-readable summary
  details?: string;        // Optional error details
}
```

Always set `Cache-Control: no-cache, no-store, must-revalidate` on cron responses to prevent caching.

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Cron job times out on Vercel | Vercel serverless functions have a 10-second default timeout (60s on Pro). Move long-running work to a background job or break it into smaller batches |
| Forgetting CRON_SECRET in production | Without the secret, anyone can trigger your cron endpoint. Always set it in Vercel environment variables |
| Testing cron schedules | Use [crontab.guru](https://crontab.guru) to verify your schedule expression before deploying |
| Cron not firing on Hobby plan | Vercel Hobby plan limits cron to once per day. Upgrade to Pro for more frequent schedules |
| Missing `Cache-Control` header | Cron responses can be cached by CDN edges. Always disable caching on cron endpoints |

---

## Related Pages

- [How to Add a Service](/template/guides/how-to-add-a-service) -- structuring the job logic as a service
- [How to Add an API Endpoint](/template/guides/how-to-add-an-api-endpoint) -- API route conventions
- [Error Handling](/template/guides/error-handling) -- using `safeErrorResponse` for consistent error responses
- [Logging](/template/guides/logging) -- structured logging for cron job output
