---
id: background-jobs-system
title: Background Jobs System
sidebar_label: Background Jobs
sidebar_position: 38
---

# Background Jobs System

The template includes an extensible background job system with three interchangeable implementations: a local `setInterval`-based manager for development, a Trigger.dev integration for production, and a no-op manager for disabling jobs entirely.

## File Structure

```
lib/background-jobs/
  index.ts                      # Public API - exports types, factory, config
  types.ts                      # BackgroundJobManager interface, types
  config.ts                     # Trigger.dev configuration, scheduling mode
  job-factory.ts                # Factory function and singleton management
  local-job-manager.ts          # Local setInterval-based implementation
  trigger-dev-job-manager.ts    # Trigger.dev SDK integration
  noop-job-manager.ts           # No-op implementation for disabled mode
  initialize-jobs.ts            # Centralized job registration
  triggers/                     # Job-specific trigger definitions
    analytics.ts
    reports.ts
    subscriptions.ts
    sync.ts
```

## The `BackgroundJobManager` Interface

All implementations share a common interface:

```ts
export interface BackgroundJobManager {
  // Schedule by interval (milliseconds)
  scheduleJob(
    id: string,
    name: string,
    job: () => void | Promise<void>,
    interval: number
  ): void;

  // Schedule by cron expression
  scheduleCronJob(
    id: string,
    name: string,
    job: () => void | Promise<void>,
    cronExpression: string
  ): void;

  // Manually trigger a job
  triggerJob(id: string): Promise<void>;

  // Stop a specific job
  stopJob(id: string): void;

  // Stop all jobs
  stopAllJobs(): void;

  // Get status of a specific job
  getJobStatus(id: string): JobStatus | undefined;

  // Get all job statuses
  getAllJobStatuses(): JobStatus[];

  // Get execution metrics
  getJobMetrics(): JobMetrics;
}
```

### Status and Metrics Types

```ts
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

## Job Factory (`job-factory.ts`)

The factory creates the appropriate manager based on environment:

```ts
import { getJobManager, resetJobManager } from '@/lib/background-jobs';

// Get the singleton manager (created on first call)
const manager = getJobManager();

// Register a job
manager.scheduleJob(
  'cleanup',
  'Daily Cleanup',
  async () => { /* ... */ },
  24 * 60 * 60 * 1000 // 24 hours
);

// Reset (useful for testing)
resetJobManager();
```

### Selection Logic

The factory follows this priority order:

1. **NoOpJobManager** - If `DISABLE_AUTO_SYNC=true` in development
2. **TriggerDevJobManager** - If Trigger.dev is fully configured and enabled in production
3. **LocalJobManager** - Fallback for all other environments

```ts
export function createJobManager(): BackgroundJobManager {
  if (coreConfig.NODE_ENV === 'development' && process.env.DISABLE_AUTO_SYNC === 'true') {
    return new NoOpJobManager();
  }

  if (shouldUseTriggerDev()) {
    return new TriggerDevJobManager(getTriggerDevConfig());
  }

  return new LocalJobManager();
}
```

## LocalJobManager

Uses `setInterval` for scheduling. Ideal for development and self-hosted deployments:

```ts
const manager = new LocalJobManager();

// Interval-based scheduling
manager.scheduleJob('sync', 'Repository Sync', async () => {
  await syncRepository();
}, 5 * 60 * 1000); // Every 5 minutes

// Cron-based scheduling (converted to interval internally)
manager.scheduleCronJob('cleanup', 'Nightly Cleanup', async () => {
  await runCleanup();
}, '0 0 * * *'); // Daily at midnight
```

### Cron-to-Interval Conversion

The `LocalJobManager` converts common cron expressions to approximate intervals:

| Cron Pattern | Interval |
|-------------|----------|
| `*/30 * * * * *` | 30 seconds |
| `*/2 * * * *` | 2 minutes |
| `*/5 * * * *` | 5 minutes |
| `*/10 * * * *` | 10 minutes |
| `*/15 * * * *` | 15 minutes |
| `0 * * * *` | 1 hour |
| `0 9 * * *` | 24 hours |
| Other | 1 minute (default) |

### Execution Guards

The local manager prevents overlapping executions. If a job is already running when its interval fires, the execution is skipped:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## TriggerDevJobManager

Registers jobs with the Trigger.dev SDK for cloud-based execution. In production, the actual scheduling and execution is handled by the Trigger.dev worker, not local timers.

```ts
const config: TriggerDevConfig = {
  enabled: true,
  apiKey: 'tr_dev_...',
  apiUrl: 'https://api.trigger.dev',
  environment: 'production',
  isFullyConfigured: true,
  isPartiallyConfigured: false,
};

const manager = new TriggerDevJobManager(config);

// Jobs are registered with Trigger.dev schedules
manager.scheduleCronJob('sync', 'Repository Sync', async () => {
  await syncRepository();
}, '*/5 * * * *');
```

### How It Works

1. `scheduleJob` converts the interval to a cron expression
2. `registerTask` lazily loads `@trigger.dev/sdk` and calls `schedules.task()`
3. The run handler records metrics when executed by the Trigger.dev worker
4. `stopJob` only clears local state (remote schedules are managed via the Trigger.dev dashboard)

## NoOpJobManager

All operations are no-ops. Used when background jobs are disabled:

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## Configuration (`config.ts`)

### Trigger.dev Configuration

```ts
import { getTriggerDevConfig, shouldUseTriggerDev } from '@/lib/background-jobs';

const config = getTriggerDevConfig();
// => {
//   enabled: boolean,
//   apiKey: string | undefined,
//   apiUrl: string,           // default: 'https://api.trigger.dev'
//   environment: string,      // default: 'development'
//   isFullyConfigured: boolean, // apiKey AND apiUrl present
//   isPartiallyConfigured: boolean,
// }

if (shouldUseTriggerDev()) {
  // Use Trigger.dev (fully configured + enabled + production)
}
```

### Scheduling Mode

The `getSchedulingMode` function determines which system to use:

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

Priority order:

1. **disabled** - `DISABLE_AUTO_SYNC` is truthy
2. **trigger-dev** - Fully configured and enabled in production
3. **vercel** - Running on the Vercel platform
4. **local** - Fallback

## Job Registration (`initialize-jobs.ts`)

All background jobs are registered centrally via `initializeBackgroundJobs`:

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### Registered Jobs

| Job ID | Name | Schedule | Description |
|--------|------|----------|-------------|
| `repository-sync` | Repository Synchronization | Every 5 minutes | Syncs the Git-based CMS content |
| `subscription-renewal-reminder` | Subscription Renewal Reminder | Daily at 9:00 AM | Sends reminders for expiring subscriptions |
| `subscription-expired-cleanup` | Subscription Expiration Cleanup | Daily at midnight | Processes and expires past-due subscriptions |

### Singleton Guard

The initialization function includes a singleton guard to prevent double-registration:

```ts
let isInitialized = false;

export async function initializeBackgroundJobs(): Promise<void> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (isInitialized) return;
  isInitialized = true;

  const { getJobManager } = await import('@/lib/background-jobs');
  const manager = getJobManager();

  // Register jobs with dynamic imports to prevent webpack bundling issues
  manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
    const { syncManager } = await import('@/lib/services/sync-service');
    await syncManager.performSync();
  }, 5 * 60 * 1000);

  // ... more jobs
}
```

Dynamic imports inside job callbacks prevent webpack from analyzing the full dependency chain at build time.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRIGGER_DEV_API_KEY` | For Trigger.dev | API key for Trigger.dev |
| `TRIGGER_DEV_API_URL` | No | Custom API URL (default: `https://api.trigger.dev`) |
| `TRIGGER_DEV_ENABLED` | No | Enable Trigger.dev (default: `false`) |
| `TRIGGER_DEV_ENVIRONMENT` | No | Environment name (default: `development`) |
| `DISABLE_AUTO_SYNC` | No | Set to `true` to disable all background jobs |
| `VERCEL` | Auto-set | Set to `1` by Vercel platform |

## Related Files

- `lib/background-jobs/index.ts` - Public API exports
- `lib/background-jobs/types.ts` - Interface and type definitions
- `lib/background-jobs/config.ts` - Configuration helpers
- `lib/background-jobs/job-factory.ts` - Factory and singleton
- `lib/background-jobs/local-job-manager.ts` - Local implementation
- `lib/background-jobs/trigger-dev-job-manager.ts` - Trigger.dev implementation
- `lib/background-jobs/noop-job-manager.ts` - No-op implementation
- `lib/background-jobs/initialize-jobs.ts` - Job registration
- `lib/services/sync-service.ts` - Repository sync service
- `lib/services/subscription-jobs.ts` - Subscription job implementations
