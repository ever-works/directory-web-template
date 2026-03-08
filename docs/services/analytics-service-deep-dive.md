---
id: analytics-service-deep-dive
title: Analytics Service Deep Dive
sidebar_label: Analytics Service (Deep Dive)
sidebar_position: 54
---

# Analytics Service Deep Dive

## Overview

The Analytics subsystem consists of three cooperating services that handle background data processing, data export, and scheduled reporting. Together they power the admin analytics dashboard with pre-warmed caches and automated report generation.

- **`AnalyticsBackgroundProcessor`** -- Scheduled background jobs that pre-warm analytics caches
- **`AnalyticsExportService`** -- Export analytics data to CSV or JSON
- **`AnalyticsScheduledReportsService`** -- Automated report generation on daily/weekly/monthly/quarterly schedules

## Source Files

| File | Path |
|------|------|
| Background Processor | `template/lib/services/analytics-background-processor.ts` |
| Export Service | `template/lib/services/analytics-export.service.ts` |
| Scheduled Reports | `template/lib/services/analytics-scheduled-reports.service.ts` |
| Repository | `template/lib/repositories/admin-analytics-optimized.repository.ts` |

## Architecture

```
Admin Dashboard (React)
        |
        v
  API Routes (/api/admin/analytics)
        |
  ┌─────┼──────────────────────┐
  │     │                      │
  v     v                      v
Background    Export       Scheduled
Processor     Service      Reports
  │             │              │
  └──────┬──────┘              │
         │                     │
         v                     v
AdminAnalyticsOptimizedRepository
         │
         v
     PostgreSQL (with in-memory cache)
```

## AnalyticsBackgroundProcessor

### Overview

A singleton service that schedules six recurring background jobs to pre-warm analytics caches. This keeps the admin dashboard responsive by ensuring data is always pre-computed.

### Job Schedule

| Job ID | Name | Interval | Description |
|--------|------|----------|-------------|
| `user-growth` | User Growth Aggregation | 10 min | Pre-warms user growth trend data for 6, 12, and 24 month windows |
| `activity-trends` | Activity Trends Aggregation | 5 min | Pre-warms activity data for 7, 14, and 30 day windows |
| `top-items` | Top Items Ranking | 15 min | Pre-warms top items for 10, 20, and 50 item limits |
| `recent-activity` | Recent Activity Update | 2 min | Pre-warms recent activity for 10 and 20 item limits |
| `performance-metrics` | Performance Metrics Update | 30 sec | Updates query performance statistics |
| `cache-cleanup` | Cache Cleanup | 1 hour | Clears expired cache entries |

### Constructor Behavior

On construction, automatically initializes all jobs unless `DISABLE_AUTO_SYNC=true` is set.

### Method Reference

#### `getJobStatuses(): JobStatus[]`

Returns the status of all scheduled jobs.

```typescript
interface JobStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  lastRun: Date;
  nextRun: Date;
  duration: number;
  error?: string;
}
```

#### `getJobMetrics(): JobMetrics`

Returns aggregate metrics for all jobs.

```typescript
interface JobMetrics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageJobDuration: number;
  lastCleanup: Date;
}
```

#### `triggerJob(id: string): Promise<void>`

Manually triggers a specific job by ID. Throws if the job ID is not found.

#### `clearCache(): Promise<void>`

Manually clears all analytics caches.

#### `invalidateCache(pattern: string): Promise<void>`

Invalidates cache entries matching a specific pattern.

#### `stop(): void`

Stops all background jobs via the `BackgroundJobManager`.

#### `restart(): void`

Stops and re-initializes all background jobs.

### Concurrency Protection

Each job execution checks `status === 'running'` before starting. If a previous execution is still in progress, the new invocation is silently skipped.

### Singleton Access

```typescript
import { getAnalyticsBackgroundProcessor } from '@/lib/services/analytics-background-processor';

const processor = getAnalyticsBackgroundProcessor();
processor.triggerJob('top-items');
```

## AnalyticsExportService

### Overview

Exports analytics data in CSV or JSON format. Supports individual metric exports and comprehensive reports.

### Export Methods

#### `exportUserGrowthTrends(months?, options): Promise<ExportResult>`

Exports user growth data for the specified number of months.

#### `exportActivityTrends(days?, options): Promise<ExportResult>`

Exports activity trend data for the specified number of days.

#### `exportTopItems(limit?, options): Promise<ExportResult>`

Exports top-performing items data.

#### `exportRecentActivity(limit?, options): Promise<ExportResult>`

Exports recent activity data.

#### `exportComprehensiveReport(options): Promise<ExportResult>`

Generates a combined report with all metrics and a summary section.

### Export Options

```typescript
interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  dateRange?: { start: Date; end: Date };
  includeMetadata?: boolean;
  compression?: boolean;
}
```

### Export Result

```typescript
interface ExportResult {
  data: string | Buffer;
  filename: string;
  contentType: string;
  size: number;
  timestamp: Date;
}
```

### CSV Generation

The CSV export handles:
- Array data: generates headers from object keys, properly escapes values containing commas, quotes, and newlines
- Nested objects: recursively flattens with dot-notation keys
- Missing properties: uses union of all keys across all rows

### JSON Export

With `includeMetadata: true`, wraps data in:
```json
{
  "metadata": {
    "generatedAt": "...",
    "totalRecords": 100,
    "exportFormat": "JSON",
    "version": "1.0.0",
    "dateRange": "..."
  },
  "data": [...]
}
```

## AnalyticsScheduledReportsService

### Overview

Manages automated report templates and their scheduled generation. Uses the `BackgroundJobManager` with cron expressions for precise scheduling.

### Default Report Templates

| Template ID | Schedule | Format | Description |
|------------|----------|--------|-------------|
| `daily-activity-summary` | Daily 09:00 | CSV | Platform activity summary |
| `weekly-user-growth` | Monday 09:00 | CSV | User registration trends |
| `monthly-comprehensive` | 1st of month 09:00 | JSON | Complete analytics report |
| `quarterly-performance` | 1st of quarter 09:00 | CSV | Quarterly performance review |

### Method Reference

#### `getReportTemplates(): ReportTemplate[]`

Returns all configured report templates.

#### `getScheduledReports(): ScheduledReport[]`

Returns all generated reports with their status.

#### `createReportTemplate(template): ReportTemplate`

Creates a custom report template and schedules it if active.

#### `updateReportTemplate(id, updates): ReportTemplate | null`

Updates a template. Re-schedules if the schedule or active status changed.

#### `deleteReportTemplate(id): boolean`

Deletes a template and unschedules its job.

#### `generateReport(options): Promise<ReportResult>`

Manually generates a report from a template.

#### `getReportStatistics(): ReportStats`

Returns aggregate statistics (total templates, active templates, successful/failed reports).

#### `stop(): void` / `restart(): void`

Controls the scheduled report lifecycle.

### Singleton Access

```typescript
import { getAnalyticsScheduledReportsService } from '@/lib/services/analytics-scheduled-reports.service';

const reportsService = getAnalyticsScheduledReportsService();
const templates = reportsService.getReportTemplates();
```

## Error Handling

- **Background jobs:** Errors are caught per-job; failed jobs are tracked in metrics and status but do not affect other jobs
- **Export validation:** Invalid format or date range causes `validateExportOptions` to return `false`, triggering an error
- **Report generation:** Failures create a `ScheduledReport` entry with `status: 'failed'` and the error message

## Usage Examples

```typescript
// Trigger a manual cache refresh
const processor = getAnalyticsBackgroundProcessor();
await processor.triggerJob('user-growth');

// Export data
const exportService = new AnalyticsExportService();
const result = await exportService.exportComprehensiveReport({
  format: 'json',
  includeMetadata: true,
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
});

// Create a custom report template
const reportsService = getAnalyticsScheduledReportsService();
reportsService.createReportTemplate({
  name: 'Custom Weekly Report',
  description: 'Custom metrics for the team',
  schedule: 'weekly',
  format: 'csv',
  includeMetadata: true,
  recipients: ['team@example.com'],
  isActive: true,
});
```
