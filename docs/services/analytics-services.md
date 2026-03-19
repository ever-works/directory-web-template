---
id: analytics-services
title: Analytics Services
sidebar_label: Analytics Services
sidebar_position: 7
---

# Analytics Services

The template includes a comprehensive analytics system with background data processing, data export, scheduled report generation, and PostHog integration for page view tracking. These services power the admin analytics dashboard.

## Architecture

```
lib/services/
  analytics-background-processor.ts    # Background job scheduler for cache warming
  analytics-export.service.ts          # CSV/JSON data export
  analytics-scheduled-reports.service.ts # Scheduled report generation
  posthog-api.service.ts               # PostHog page view integration
```

All analytics services are singletons instantiated through getter functions and delegate scheduling to a shared `BackgroundJobManager`.

## AnalyticsBackgroundProcessor

The background processor pre-warms analytics caches by running periodic queries against the `AdminAnalyticsOptimizedRepository`. This ensures the admin dashboard loads instantly with pre-computed data rather than running expensive queries on demand.

### Scheduled Jobs

| Job ID | Name | Interval | Description |
|--------|------|----------|-------------|
| `user-growth` | User Growth Aggregation | 10 minutes | Pre-warms 6, 12, and 24-month growth trends |
| `activity-trends` | Activity Trends Aggregation | 5 minutes | Pre-warms 7, 14, and 30-day activity data |
| `top-items` | Top Items Ranking | 15 minutes | Pre-warms top 10, 20, and 50 items |
| `recent-activity` | Recent Activity Update | 2 minutes | Pre-warms last 10 and 20 activity entries |
| `performance-metrics` | Performance Metrics Update | 30 seconds | Updates query performance stats |
| `cache-cleanup` | Cache Cleanup | 1 hour | Clears expired cache entries |

### Usage

```typescript
import { getAnalyticsBackgroundProcessor } from '@/lib/services/analytics-background-processor';

const processor = getAnalyticsBackgroundProcessor();

// Monitor job statuses
const statuses = processor.getJobStatuses();
// [{ id, name, status, lastRun, nextRun, duration, error? }]

// Get aggregate metrics
const metrics = processor.getJobMetrics();
// { totalJobs, successfulJobs, failedJobs, averageJobDuration, lastCleanup }

// Manually trigger a specific job
await processor.triggerJob('user-growth');

// Cache management
await processor.clearCache();
await processor.invalidateCache('user-growth');

// Lifecycle control
processor.stop();
processor.restart();
```

### Job Execution

Each job runs with concurrency protection -- if a previous execution is still in progress, the next scheduled run is skipped. Job metrics (success/failure counts, average duration) are tracked internally and exposed via `getJobMetrics()`.

Jobs can be disabled globally by setting `DISABLE_AUTO_SYNC=true` in environment variables.

## AnalyticsExportService

The export service generates downloadable analytics data in CSV or JSON format with optional metadata.

### Export Options

```typescript
interface ExportOptions {
  format: 'csv' | 'json';
  dateRange?: { start: Date; end: Date };
  includeMetadata?: boolean;
  compression?: boolean;
}
```

### Available Exports

| Method | Description | Parameters |
|--------|-------------|------------|
| `exportUserGrowthTrends()` | User growth over time | `months` (default: 12) |
| `exportActivityTrends()` | Daily activity metrics | `days` (default: 7) |
| `exportTopItems()` | Highest-ranked items | `limit` (default: 10) |
| `exportRecentActivity()` | Latest platform activity | `limit` (default: 10) |
| `exportComprehensiveReport()` | All metrics combined | None |

### Comprehensive Report

The comprehensive export aggregates all data sources in parallel and includes a computed summary:

```typescript
const exportService = new AnalyticsExportService();

const result = await exportService.exportComprehensiveReport({
  format: 'json',
  includeMetadata: true,
  dateRange: { start: new Date('2024-01-01'), end: new Date() },
});
// result: { data, filename, contentType, size, timestamp }
```

The summary section includes total users, total votes, total comments, and the top-performing item.

### CSV Generation

CSV export handles both flat arrays and nested objects. Array data produces standard tabular CSV with headers derived from the union of all row keys. Object data (such as the comprehensive report) recursively flattens nested structures with dot-notation keys. All values are properly escaped with RFC 4180-compliant quoting.

### JSON Export with Metadata

When `includeMetadata` is enabled, JSON exports wrap the data with generation metadata:

```typescript
{
  metadata: {
    generatedAt: "2024-12-15T10:30:00.000Z",
    totalRecords: 365,
    exportFormat: "JSON",
    version: "1.0.0",
    dateRange: "2024-01-01 to 2024-12-15"
  },
  data: { /* actual analytics data */ }
}
```

## AnalyticsScheduledReportsService

The scheduled reports service automates recurring report generation using cron-based scheduling. Reports are generated from templates and stored for download.

### Default Report Templates

| Template ID | Name | Schedule | Format |
|-------------|------|----------|--------|
| `daily-activity-summary` | Daily Activity Summary | Daily at 09:00 | CSV |
| `weekly-user-growth` | Weekly User Growth Report | Monday at 09:00 | CSV |
| `monthly-comprehensive` | Monthly Comprehensive Analytics | 1st of month at 09:00 | JSON |
| `quarterly-performance` | Quarterly Performance Review | 1st of quarter at 09:00 | CSV |

### Report Template Structure

```typescript
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

### Template Management

```typescript
import { getAnalyticsScheduledReportsService } from '@/lib/services/analytics-scheduled-reports.service';

const reportsService = getAnalyticsScheduledReportsService();

// List all templates
const templates = reportsService.getReportTemplates();

// Create a custom template
const newTemplate = reportsService.createReportTemplate({
  name: 'Weekly Export',
  description: 'Custom weekly data export',
  schedule: 'weekly',
  format: 'csv',
  includeMetadata: true,
  recipients: ['admin@example.com'],
  isActive: true,
});

// Update a template (reschedules if active status or schedule changes)
reportsService.updateReportTemplate('daily-activity-summary', { isActive: false });

// Delete a template
reportsService.deleteReportTemplate('custom-12345');

// Get statistics
const stats = reportsService.getReportStatistics();
// { totalTemplates, activeTemplates, totalReports, successfulReports, failedReports }
```

### Cron Scheduling

Each schedule maps to a cron expression managed by the `BackgroundJobManager`:

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Daily | `0 9 * * *` | Every day at 09:00 |
| Weekly | `0 9 * * 1` | Every Monday at 09:00 |
| Monthly | `0 9 1 * *` | First day of each month at 09:00 |
| Quarterly | `0 9 1 1,4,7,10 *` | First day of each quarter at 09:00 |

## PostHogApiService

The `PostHogApiService` integrates with PostHog for page view analytics using the Insights Trends API.

### Configuration

The service requires two environment variables:

| Variable | Description |
|----------|-------------|
| `POSTHOG_PERSONAL_API_KEY` | PostHog personal API key |
| `POSTHOG_PROJECT_ID` | PostHog project identifier |

### Usage

```typescript
import { postHogApiService } from '@/lib/services/posthog-api.service';

// Check if PostHog is configured
if (postHogApiService.isConfigured()) {
  // Get total page views for the last 30 days
  const totalViews = await postHogApiService.getTotalPageViews(30);

  // Get page views broken down by date
  const viewsByDate = await postHogApiService.getPageViewsByDateRange(
    new Date('2024-12-01'),
    new Date('2024-12-31')
  );
  // { "2024-12-01": 150, "2024-12-02": 200, ... }
}
```

Both methods query the `$pageview` event using the PostHog Trends insight endpoint. Errors are caught and return graceful fallbacks (`0` for totals, `{}` for date ranges) so the dashboard never breaks when PostHog is unavailable.

## Source Files

| File | Path |
|------|------|
| Analytics Background Processor | `template/lib/services/analytics-background-processor.ts` |
| Analytics Export Service | `template/lib/services/analytics-export.service.ts` |
| Analytics Scheduled Reports | `template/lib/services/analytics-scheduled-reports.service.ts` |
| PostHog API Service | `template/lib/services/posthog-api.service.ts` |
