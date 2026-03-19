---
id: analytics-background
title: "Analytics Background Processing"
sidebar_label: "Analytics Background"
sidebar_position: 27
---

# Analytics Background Processing

The template includes three interconnected services for analytics data management: a **background processor** for cache pre-warming, an **export service** for data extraction, and a **scheduled reports service** for automated report generation.

## Architecture Overview

```
AnalyticsBackgroundProcessor (singleton)
  |-- Schedules 6 recurring jobs via BackgroundJobManager
  |-- Pre-warms analytics cache at configured intervals
  |-- Provides monitoring and manual trigger APIs

AnalyticsExportService
  |-- Exports analytics data to CSV or JSON
  |-- Supports individual datasets or comprehensive reports
  |-- Includes metadata and date range filtering

AnalyticsScheduledReportsService (singleton)
  |-- Manages report templates (daily, weekly, monthly, quarterly)
  |-- Schedules report generation via cron expressions
  |-- Tracks report generation history and statistics
```

All three services use the `AdminAnalyticsOptimizedRepository` for data access.

## Background Processor

**Source:** `lib/services/analytics-background-processor.ts`

The `AnalyticsBackgroundProcessor` runs periodic jobs that pre-warm the analytics cache, ensuring the admin dashboard loads quickly without hitting the database on every request.

### Job Schedule

| Job ID               | Name                       | Interval     |
|----------------------|----------------------------|--------------|
| `user-growth`        | User Growth Aggregation    | 10 minutes   |
| `activity-trends`    | Activity Trends Aggregation| 5 minutes    |
| `top-items`          | Top Items Ranking          | 15 minutes   |
| `recent-activity`    | Recent Activity Update     | 2 minutes    |
| `performance-metrics`| Performance Metrics Update | 30 seconds   |
| `cache-cleanup`      | Cache Cleanup              | 1 hour       |

### Initialization

The processor initializes automatically as a singleton unless the `DISABLE_AUTO_SYNC` environment variable is set to `'true'`:

```ts
import { getAnalyticsBackgroundProcessor } from '@/lib/services/analytics-background-processor';

// Get or create the singleton instance
const processor = getAnalyticsBackgroundProcessor();
```

### Job Execution

Each job has built-in protections:

- **Skip if running** -- if a previous execution of the same job is still in progress, the new invocation is skipped
- **Metrics tracking** -- every execution records duration, success/failure, and updates running averages
- **Error isolation** -- a failed job logs the error but does not affect other scheduled jobs

### Job Status Tracking

Each job maintains a `JobStatus` record:

```ts
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

### Processor Metrics

Aggregate metrics across all jobs:

```ts
interface JobMetrics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageJobDuration: number;
  lastCleanup: Date;
}
```

### Public API

```ts
const processor = getAnalyticsBackgroundProcessor();

// View all job statuses
const statuses = processor.getJobStatuses();

// View aggregate metrics
const metrics = processor.getJobMetrics();

// Manually trigger a specific job
await processor.triggerJob('user-growth');

// Cache management
await processor.clearCache();
await processor.invalidateCache('user-growth*');

// Lifecycle control
processor.stop();      // Stop all analytics jobs
processor.restart();   // Stop and re-initialize all jobs
```

### Stopping the Processor

```ts
import { stopAnalyticsBackgroundProcessor } from '@/lib/services/analytics-background-processor';

// Stops the singleton and sets it to null
stopAnalyticsBackgroundProcessor();
```

## Export Service

**Source:** `lib/services/analytics-export.service.ts`

The `AnalyticsExportService` converts analytics data into downloadable formats (CSV or JSON).

### Supported Formats

| Format | Content Type               | Extension |
|--------|----------------------------|-----------|
| CSV    | `text/csv; charset=utf-8`  | `.csv`    |
| JSON   | `application/json`         | `.json`   |

### Export Options

```ts
interface ExportOptions {
  format: 'csv' | 'json';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMetadata?: boolean;
  compression?: boolean;
}
```

### Export Methods

Each method accepts data-specific parameters plus `ExportOptions`:

```ts
const exportService = new AnalyticsExportService();

// Export individual datasets
const userGrowth = await exportService.exportUserGrowthTrends(12, options);
const activity = await exportService.exportActivityTrends(7, options);
const topItems = await exportService.exportTopItems(10, options);
const recent = await exportService.exportRecentActivity(20, options);

// Export comprehensive report (all datasets combined)
const fullReport = await exportService.exportComprehensiveReport(options);
```

### Export Result

All export methods return an `ExportResult`:

```ts
interface ExportResult {
  data: string | Buffer;
  filename: string;       // Auto-generated with timestamp
  contentType: string;
  size: number;           // Byte size
  timestamp: Date;
}
```

### JSON Metadata

When `includeMetadata` is enabled, JSON exports include:

```ts
interface ExportMetadata {
  generatedAt: string;
  dateRange?: string;
  totalRecords: number;
  exportFormat: string;
  version: string;
}
```

### CSV Formatting

The CSV exporter handles:
- **Array data** -- auto-detects headers from object keys across all rows
- **Nested objects** -- recursively flattens with dot-notation keys (e.g., `summary.totalUsers`)
- **Special characters** -- properly escapes quotes, commas, and newlines in cell values

### Validation

Export options are validated before processing:

```ts
const isValid = exportService.validateExportOptions(options);
// Checks: valid format, date range start before end
```

## Scheduled Reports Service

**Source:** `lib/services/analytics-scheduled-reports.service.ts`

The `AnalyticsScheduledReportsService` automates report generation on configurable schedules.

### Default Report Templates

| Template ID             | Name                           | Schedule   | Format |
|-------------------------|--------------------------------|------------|--------|
| `daily-activity-summary`| Daily Activity Summary         | Daily 9AM  | CSV    |
| `weekly-user-growth`    | Weekly User Growth Report      | Monday 9AM | CSV    |
| `monthly-comprehensive` | Monthly Comprehensive Analytics| 1st of month 9AM | JSON |
| `quarterly-performance` | Quarterly Performance Review   | 1st of quarter 9AM | CSV |

### Report Template Structure

```ts
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  format: 'csv' | 'json';
  includeMetadata: boolean;
  recipients: string[];
  lastGenerated?: Date;
  nextGeneration?: Date;
  isActive: boolean;
}
```

### Cron Expressions

Each schedule maps to a cron expression:

| Schedule   | Cron Expression      | Description                        |
|------------|---------------------|------------------------------------|
| Daily      | `0 9 * * *`         | 9:00 AM every day                  |
| Weekly     | `0 9 * * 1`         | 9:00 AM every Monday               |
| Monthly    | `0 9 1 * *`         | 9:00 AM on the 1st of each month   |
| Quarterly  | `0 9 1 1,4,7,10 *`  | 9:00 AM on first day of quarter    |

### Managing Templates

```ts
import { getAnalyticsScheduledReportsService } from '@/lib/services/analytics-scheduled-reports.service';

const reportsService = getAnalyticsScheduledReportsService();

// List all templates
const templates = reportsService.getReportTemplates();

// Create a custom template
const newTemplate = reportsService.createReportTemplate({
  name: 'Custom Weekly Report',
  description: 'Custom weekly analytics summary',
  schedule: 'weekly',
  format: 'csv',
  includeMetadata: true,
  recipients: ['team@example.com'],
  isActive: true,
});

// Update a template
reportsService.updateReportTemplate('daily-activity-summary', {
  recipients: ['admin@example.com', 'team@example.com'],
});

// Delete a template (also unschedules it)
reportsService.deleteReportTemplate('custom-12345');
```

### Manual Report Generation

Generate a report on demand using any template:

```ts
const result = await reportsService.generateReport({
  template: templates[0],
  dateRange: {
    start: new Date('2025-01-01'),
    end: new Date('2025-01-31'),
  },
});

// result: { filename, size, data, contentType }
```

### Viewing Generated Reports

```ts
// List all generated reports
const reports = reportsService.getScheduledReports();

// Get statistics
const stats = reportsService.getReportStatistics();
// {
//   totalTemplates: 4,
//   activeTemplates: 4,
//   totalReports: 12,
//   successfulReports: 11,
//   failedReports: 1
// }
```

### Lifecycle Control

```ts
import {
  getAnalyticsScheduledReportsService,
  stopAnalyticsScheduledReports,
} from '@/lib/services/analytics-scheduled-reports.service';

const service = getAnalyticsScheduledReportsService();

// Stop all scheduled reports
service.stop();

// Restart all scheduled reports
service.restart();

// Stop and destroy singleton
stopAnalyticsScheduledReports();
```

## Environment Configuration

| Variable             | Effect                                           |
|----------------------|--------------------------------------------------|
| `DISABLE_AUTO_SYNC`  | Set to `'true'` to prevent background jobs from starting |

Both the background processor and scheduled reports service check this variable during construction.
