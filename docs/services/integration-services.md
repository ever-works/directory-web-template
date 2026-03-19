---
id: integration-services
title: Integration Services
sidebar_label: Integration Services
sidebar_position: 3
---

# Integration Services

The template includes integration services for external platforms: **Twenty CRM** for customer relationship management and **PostHog** for product analytics. These services handle API communication, data synchronization, and configuration management.

## Twenty CRM Integration

The Twenty CRM integration consists of four service modules that work together to provide bidirectional data synchronization between the application and a self-hosted or cloud Twenty CRM instance.

### Architecture

```
TwentyCrmApiService          # Connection testing and basic API calls
  -> TwentyCrmRestClient     # HTTP client with retry logic and error handling
TwentyCrmSyncService          # Bidirectional data synchronization
  -> TwentyCrmSyncFactory    # Factory for creating configured sync instances
TwentyCrmConfigDbService      # Configuration persistence in database
```

### TwentyCrmApiService

**File:** `lib/services/twenty-crm-api.service.ts`

Handles connection testing and basic API operations.

#### Connection Testing

```typescript
class TwentyCrmApiService {
  async testConnection(
    baseUrl: string,
    apiKey: string
  ): Promise<TwentyCrmTestConnectionResult> {
    const client = new TwentyCrmRestClient({
      baseUrl,
      apiKey,
      timeout: 10000,    // 10 second timeout
      maxRetries: 0,     // No retries for connection tests
    });

    const response = await client.get('/rest/metadata', { skipRetry: true });

    return {
      ok: response.success,
      latencyMs: Math.round(performance.now() - startTime),
      message: response.success ? 'Successfully connected' : response.error.message,
      details: { status: response.success ? 200 : response.error.status },
    };
  }
}
```

The connection test calls the `/rest/metadata` endpoint, which requires authentication and confirms both network connectivity and valid API credentials.

#### Reachability Check

```typescript
async isReachable(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const response = await fetch(baseUrl, {
    method: 'HEAD',
    signal: controller.signal,
  });

  return response.ok;
}
```

A lightweight HEAD request with a 5-second timeout to check if the CRM instance is accessible, without requiring authentication.

### TwentyCrmRestClient

**File:** `lib/services/twenty-crm-rest-client.service.ts`

A full-featured HTTP client for the Twenty CRM REST API with retry logic and error handling.

#### Configuration

```typescript
interface TwentyCrmRestClientConfig {
  baseUrl: string;      // CRM instance URL
  apiKey: string;       // API authentication key
  timeout: number;      // Request timeout in milliseconds
  maxRetries: number;   // Maximum retry attempts
}
```

#### Features

- **Automatic retries**: Configurable retry count with exponential backoff
- **Timeout handling**: Per-request timeout via `AbortController`
- **Discriminated union responses**: Returns `{ success: true, data }` or `{ success: false, error }` instead of throwing
- **Error classification**: Distinguishes between network errors, timeout errors, and API errors

### TwentyCrmSyncService

**File:** `lib/services/twenty-crm-sync.service.ts`

Handles bidirectional synchronization of data between the application and Twenty CRM. Typically syncs entities like contacts (from client profiles) and companies.

### TwentyCrmSyncFactory

**File:** `lib/services/twenty-crm-sync-factory.ts`

Factory pattern for creating properly configured sync service instances. Reads configuration from the database via `TwentyCrmConfigDbService` and creates a `TwentyCrmSyncService` with the correct credentials and mapping.

### TwentyCrmConfigDbService

**File:** `lib/services/twenty-crm-config-db.service.ts`

Persists CRM configuration (base URL, API key, field mappings, sync settings) in the application database. Configuration is managed through the admin interface at `/api/admin/twenty-crm/config`.

### Admin API Integration

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/twenty-crm/config` | Get current CRM configuration |
| `PUT` | `/api/admin/twenty-crm/config` | Update CRM configuration |
| `POST` | `/api/admin/twenty-crm/test-connection` | Test CRM connectivity |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `TWENTY_CRM_BASE_URL` | Twenty CRM instance URL (optional, can be set via admin UI) |
| `TWENTY_CRM_API_KEY` | Twenty CRM API key (optional, can be set via admin UI) |

Configuration can be set either via environment variables or through the admin interface, with database-stored configuration taking priority.

## PostHog Analytics Integration

**File:** `lib/services/posthog-api.service.ts`

The `PostHogApiService` provides server-side access to PostHog analytics data for the admin dashboard.

### Configuration

```typescript
class PostHogApiService {
  private readonly apiKey: string | undefined;
  private readonly projectId: string | undefined;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = analyticsConfig.posthog.personalApiKey;
    this.projectId = analyticsConfig.posthog.projectId;
    this.baseUrl = POSTHOG_HOST?.value?.replace('/js', '') || 'https://us.i.posthog.com';
  }
}
```

### API Methods

#### Total Page Views

```typescript
async getTotalPageViews(days: number = 30): Promise<number>
```

Queries the PostHog Trends API for `$pageview` events within the specified date range.

**Request Parameters:**

```typescript
{
  events: [{ id: '$pageview', name: '$pageview', type: 'events', order: 0 }],
  date_from: '2025-01-01',
  date_to: '2025-01-31',
  insight: 'TRENDS',
}
```

### HTTP Client

All PostHog API requests include the personal API key in the Authorization header:

```typescript
private async makeRequest<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${this.baseUrl}/api/projects/${this.projectId}/${endpoint}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-cache',
  });

  return response.json() as T;
}
```

### Configuration Check

```typescript
isConfigured(): boolean {
  return !!(this.apiKey && this.projectId);
}
```

The service gracefully handles missing configuration by throwing an error with a clear message when `isConfigured()` returns false, rather than making API calls that will fail.

### Response Types

```typescript
interface PostHogInsightResponse {
  results: Array<{
    data: number[];
    labels: string[];
    count: number;
  }>;
}

interface PostHogEventResponse {
  results: Array<{
    event: string;
    timestamp: string;
    properties: Record<string, unknown>;
  }>;
  count: number;
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `POSTHOG_KEY` | PostHog project API key (client-side tracking) |
| `POSTHOG_PERSONAL_API_KEY` | PostHog personal API key (server-side data access) |
| `POSTHOG_PROJECT_ID` | PostHog project identifier |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog instance host URL |

## Analytics Background Processing

### AnalyticsBackgroundProcessor

**File:** `lib/services/analytics-background-processor.ts`

Handles deferred analytics processing to avoid blocking user-facing requests. Analytics events are queued and processed in batches.

### AnalyticsExportService

**File:** `lib/services/analytics-export.service.ts`

Exports analytics data in various formats (CSV, JSON) for the admin dashboard export functionality.

### AnalyticsScheduledReports

**File:** `lib/services/analytics-scheduled-reports.service.ts`

Generates periodic analytics reports on a configurable schedule, typically triggered by cron jobs or background workers.

## Integration Patterns

### Error Handling

All integration services use a consistent pattern for handling external API failures:

```typescript
// Discriminated union return type
type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; status?: number; code?: string } };
```

This avoids try/catch boilerplate in callers and makes error paths explicit.

### Timeout Protection

External API calls include timeout protection to prevent hung requests:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);

const response = await fetch(url, { signal: controller.signal });
clearTimeout(timeoutId);
```

### Configuration Precedence

For integrations that support both environment variables and database configuration:

1. **Database configuration** (set via admin UI) takes highest priority
2. **Environment variables** serve as fallback defaults
3. **Hardcoded defaults** (e.g., PostHog US cloud URL) as last resort

This allows initial setup via environment variables with runtime reconfiguration through the admin interface.
