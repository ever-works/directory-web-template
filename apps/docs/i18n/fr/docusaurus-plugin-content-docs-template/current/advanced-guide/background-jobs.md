---
id: background-jobs
title: Tâches en arrière-plan
sidebar_label: Tâches en arrière-plan
sidebar_position: 4
---

# Tâches en arrière-plan

The Ever Works Template includes a robust background job system with a pluggable architecture that supports multiple scheduling backends. Jobs run automatically for tasks such as repository synchronization, subscription management, and analytics cache warming.

## Architecture Overview

The background job system follows a **Strategy pattern** with a common `BackgroundJobManager` interface and three interchangeable implementations:

| Component | File | Purpose |
|---|---|---|
| `BackgroundJobManager` | `lib/background-jobs/types.ts` | Interface contract for all managers |
| `LocalJobManager` | `lib/background-jobs/local-job-manager.ts` | `setInterval`-based scheduling for development |
| `TriggerDevJobManager` | `lib/background-jobs/trigger-dev-job-manager.ts` | Trigger.dev SDK v4 integration for production |
| `NoOpJobManager` | `lib/background-jobs/noop-job-manager.ts` | Silent no-op for disabled environments |
| `job-factory.ts` | `lib/background-jobs/job-factory.ts` | Factory + singleton creation logic |
| `config.ts` | `lib/background-jobs/config.ts` | Scheduling mode resolution |
| `initialize-jobs.ts` | `lib/background-jobs/initialize-jobs.ts` | Centralized job registration |

### Scheduling Mode Resolution

The system determines which manager to use based on environment configuration, following a strict priority order:

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

The resolution logic lives in `lib/background-jobs/config.ts`:

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

## The BackgroundJobManager Interface

All managers implement the same interface defined in `lib/background-jobs/types.ts`:

```typescript
interface BackgroundJobManager {
  scheduleJob(id: string, name: string, job: () => void | Promise<void>, interval: number): void;
  scheduleCronJob(id: string, name: string, job: () => void | Promise<void>, cronExpression: string): void;
  triggerJob(id: string): Promise<void>;
  stopJob(id: string): void;
  stopAllJobs(): void;
  getJobStatus(id: string): JobStatus | undefined;
  getAllJobStatuses(): JobStatus[];
  getJobMetrics(): JobMetrics;
}
```

### Key Types

```typescript
type JobStatusType = 'running' | 'completed' | 'failed' | 'scheduled' | 'stopped';

interface JobStatus {
  id: string;
  name: string;
  status: JobStatusType;
  lastRun: Date | null;
  nextRun: Date | null;
  duration: number;
  error?: string;
}

interface JobMetrics {
  totalExecutions: number;
  successfulJobs: number;
  failedJobs: number;
  averageJobDuration: number;
  lastCleanup: Date;
}
```

## Job Factory and Singleton

The factory in `lib/background-jobs/job-factory.ts` creates the appropriate manager and exposes a singleton:

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

The singleton ensures only one manager instance exists per process. Use `resetJobManager()` in tests to clear the instance.

## LocalJobManager (Development)

The `LocalJobManager` uses `setInterval` and `setTimeout` for scheduling. It provides:

- **Overlap prevention**: Skips execution if a previous run of the same job is still in progress.
- **Metrics tracking**: Tracks total executions, success/failure counts, and average duration.
- **Cron-to-interval conversion**: Converts common cron expressions to millisecond intervals for approximate local scheduling.
- **Quiet development mode**: Reduces logging noise when `NODE_ENV=development`.

Supported cron conversions:

| Cron Expression | Interval |
|---|---|
| `*/30 * * * * *` | 30 seconds |
| `*/2 * * * *` | 2 minutes |
| `*/5 * * * *` | 5 minutes |
| `*/15 * * * *` | 15 minutes |
| `0 * * * *` | 1 hour |
| `0 9 * * *` | 24 hours |

## TriggerDevJobManager (Production)

The `TriggerDevJobManager` registers schedules with the Trigger.dev SDK v4. Key behaviors:

- **No local timers**: Does not run `setInterval` -- actual execution is handled by the Trigger.dev worker process.
- **Lazy SDK loading**: Dynamically imports `@trigger.dev/sdk` to prevent bundling issues.
- **Interval-to-cron conversion**: Converts millisecond intervals to cron expressions for the Trigger.dev API.
- **Metric recording**: Records execution metrics when the worker invokes the run handler.

### Configuration

Set the following environment variables to enable Trigger.dev:

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

The manager only activates when all of these conditions are met:
1. `TRIGGER_DEV_API_KEY` and `TRIGGER_DEV_API_URL` are both set (`isFullyConfigured`)
2. `TRIGGER_DEV_ENABLED` is `true`
3. `NODE_ENV` is `production`

## NoOpJobManager (Disabled)

When `DISABLE_AUTO_SYNC=true` is set in development, the `NoOpJobManager` silently ignores all scheduling calls. Every method is a no-op, and metrics remain at zero. This is useful for:

- Running the dev server without background noise
- Debugging frontend-only features
- Reducing resource usage during UI development

## Registered Jobs

Jobs are registered centrally in `lib/background-jobs/initialize-jobs.ts`. This module runs during application startup via the instrumentation hook.

### Core Jobs

| Job ID | Name | Schedule | Description |
|---|---|---|---|
| `repository-sync` | Repository Synchronization | Every 5 minutes | Syncs content from the Git-based CMS repository |
| `subscription-renewal-reminder` | Subscription Renewal Reminder | Daily at 9:00 AM | Sends email reminders for subscriptions expiring in 7 days |
| `subscription-expired-cleanup` | Subscription Expiration Cleanup | Daily at midnight | Processes and expires subscriptions past their end date |

### Analytics Jobs

Registered by `AnalyticsBackgroundProcessor` in `lib/services/analytics-background-processor.ts`:

| Job ID | Name | Interval |
|---|---|---|
| `analytics-user-growth` | User Growth Aggregation | 10 minutes |
| `analytics-activity-trends` | Activity Trends Aggregation | 5 minutes |
| `analytics-top-items` | Top Items Ranking | 15 minutes |
| `analytics-recent-activity` | Recent Activity Update | 2 minutes |
| `analytics-performance-metrics` | Performance Metrics Update | 30 seconds |
| `analytics-cache-cleanup` | Cache Cleanup | 1 hour |

### Trigger Task ID Definitions

Task IDs and cron schedules are defined in `lib/background-jobs/triggers/`:

| File | Task IDs | Purpose |
|---|---|---|
| `analytics.ts` | `AnalyticsTaskIds` | Analytics cache warming and cleanup |
| `sync.ts` | `SyncTaskIds` | Repository synchronization |
| `subscriptions.ts` | `SubscriptionTaskIds` | Subscription lifecycle management |
| `reports.ts` | `ReportTaskIds` | Scheduled report generation |

## Vercel Cron Integration

When deployed to Vercel, background jobs can also be triggered via Vercel Cron Jobs configured in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

These endpoints hit API routes that execute the same job logic, providing a platform-native scheduling mechanism on Vercel.

## Adding a New Background Job

### Step 1: Define Task IDs (Optional)

Create or update a file in `lib/background-jobs/triggers/`:

```typescript
// lib/background-jobs/triggers/my-feature.ts
export const MyFeatureTaskIds = {
  cleanup: 'my-feature-cleanup',
  notify: 'my-feature-notify',
} as const;

export const MyFeatureCrons: Record<keyof typeof MyFeatureTaskIds, string> = {
  cleanup: '0 2 * * *',   // Daily at 2 AM
  notify: '*/30 * * * *', // Every 30 minutes
};
```

### Step 2: Implement the Job Function

Create the job logic in `lib/services/`:

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### Step 3: Register in initialize-jobs.ts

Add the job to `lib/background-jobs/initialize-jobs.ts`:

```typescript
manager.scheduleCronJob(
  'my-feature-cleanup',
  'My Feature Cleanup',
  async () => {
    const { myFeatureCleanupJob } = await import('@/lib/services/my-feature-jobs');
    await myFeatureCleanupJob();
  },
  '0 2 * * *'
);
```

**Important**: Use dynamic `import()` inside the job callback to prevent webpack from bundling Node.js modules during the build phase.

### Step 4: Add Vercel Cron (Optional)

If deploying on Vercel, add a cron endpoint to `vercel.json` and create the corresponding API route:

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## Monitoring and Debugging

### Checking Job Status

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### Manual Job Triggering

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### Disabling Jobs in Development

Set the environment variable to skip all background jobs:

```bash
DISABLE_AUTO_SYNC=true
```

This activates the `NoOpJobManager`, which silently ignores all scheduling calls.

## Best Practices

1. **Always use dynamic imports** in job callbacks registered in `initialize-jobs.ts` to prevent webpack bundling issues.
2. **Keep job functions idempotent** -- jobs may run more than once if there are timing overlaps or retries.
3. **Use structured logging** with a `[JobName]` prefix for easier log filtering.
4. **Return result objects** from job functions (like `JobResult` in `subscription-jobs.ts`) for observability.
5. **Handle errors gracefully** -- the manager catches and logs errors, but your job logic should handle partial failures.
6. **Test with the LocalJobManager** in development before deploying to Trigger.dev.