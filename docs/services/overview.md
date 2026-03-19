---
id: overview
title: Services Layer Overview
sidebar_label: Overview
sidebar_position: 0
---

# Services Layer Overview

The services layer (`lib/services/`) contains 36+ service modules that implement the application's core business logic. Services sit between API route handlers and the data access layer (repositories and database queries), following the pattern: **Route Handler -> Service -> Repository/Query**.

## Service Inventory

### Content Management Services

| Service | File | Description |
|---------|------|-------------|
| `ItemGitService` | `item-git.service.ts` | Git-based item CRUD with YAML file operations |
| `CategoryGitService` | `category-git.service.ts` | Git-based category management |
| `CollectionGitService` | `collection-git.service.ts` | Git-based collection management |
| `TagGitService` | `tag-git.service.ts` | Git-based tag management |
| `CategoryFileService` | `category-file.service.ts` | File-based category operations |
| `FileService` | `file.service.ts` | Generic YAML file read/write service |
| `SyncManager` | `sync-service.ts` | Background content repository synchronization |

### User & Role Services

| Service | File | Description |
|---------|------|-------------|
| `RoleDbService` | `role-db.service.ts` | Role CRUD with permission management |
| `UserDbService` | `user-db.service.ts` | User account management |

### Engagement & Moderation Services

| Service | File | Description |
|---------|------|-------------|
| `engagement.service` | `engagement.service.ts` | Popularity scoring and engagement metrics |
| `moderation.service` | `moderation.service.ts` | Content moderation actions and workflows |
| `SurveyService` | `survey.service.ts` | Survey CRUD and response management |
| `ItemAuditService` | `item-audit.service.ts` | Item change audit trail |

### Payment & Subscription Services

| Service | File | Description |
|---------|------|-------------|
| `StripeProductsService` | `stripe-products.service.ts` | Stripe product/price synchronization |
| `SubscriptionService` | `subscription.service.ts` | Provider-agnostic subscription management |
| `WebhookSubscriptionService` | `webhook-subscription.service.ts` | Webhook event processing for subscriptions |
| `subscription-jobs` | `subscription-jobs.ts` | Subscription background job scheduling |

### Notification Services

| Service | File | Description |
|---------|------|-------------|
| `EmailNotificationService` | `email-notification.service.ts` | Transactional email sending |
| `NotificationService` | `notification.service.ts` | In-app notification management |

### Analytics Services

| Service | File | Description |
|---------|------|-------------|
| `PostHogApiService` | `posthog-api.service.ts` | PostHog analytics API integration |
| `AnalyticsBackgroundProcessor` | `analytics-background-processor.ts` | Background analytics processing |
| `AnalyticsExportService` | `analytics-export.service.ts` | Analytics data export |
| `AnalyticsScheduledReports` | `analytics-scheduled-reports.service.ts` | Scheduled analytics report generation |

### Integration Services

| Service | File | Description |
|---------|------|-------------|
| `TwentyCrmApiService` | `twenty-crm-api.service.ts` | Twenty CRM connection testing |
| `TwentyCrmRestClient` | `twenty-crm-rest-client.service.ts` | Twenty CRM REST client with retry logic |
| `TwentyCrmSyncService` | `twenty-crm-sync.service.ts` | Bidirectional CRM data synchronization |
| `TwentyCrmSyncFactory` | `twenty-crm-sync-factory.ts` | CRM sync instance factory |
| `TwentyCrmConfigDbService` | `twenty-crm-config-db.service.ts` | CRM configuration persistence |

### Location & Geocoding Services

| Service | File | Description |
|---------|------|-------------|
| `geocoding/*` | `geocoding/` | Address geocoding services |
| `location/*` | `location/` | Location data services (countries, cities, coordinates) |

### Utility Services

| Service | File | Description |
|---------|------|-------------|
| `CurrencyService` | `currency.service.ts` | Currency conversion and detection |
| `CurrencyDetectionService` | `currency-detection.service.ts` | Auto-detect user currency from location |
| `CompanyService` | `company.service.ts` | Company profile management |
| `SettingsService` | `settings.service.ts` | Application settings management |
| `SponsorAdService` | `sponsor-ad.service.ts` | Sponsor advertisement management |

## Architecture Patterns

### Service Instantiation

Services use two instantiation patterns:

**Class-based (most services):**

```typescript
export class ItemGitService {
  private config: ItemGitServiceConfig;

  constructor(config: ItemGitServiceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> { ... }
  async create(data: CreateItemRequest): Promise<ItemData> { ... }
  async update(id: string, data: UpdateItemRequest): Promise<ItemData> { ... }
}
```

**Singleton (shared services):**

```typescript
// SyncManager - singleton with module-level state
class SyncManager {
  private syncInProgress = false;
  private lastSyncTime: Date | null = null;

  async performSync(): Promise<SyncResult> { ... }
}
```

### Dependency Pattern

Services depend on repositories and database query modules, not on each other directly:

```
API Route Handler
  -> Service (business logic, validation, orchestration)
    -> Repository (data access abstraction)
      -> Database Queries (Drizzle ORM queries)
```

For example, the moderation service depends on:
- `moderation.queries` for database operations
- `comment.queries` for comment lookups
- `ItemRepository` for item operations
- `EmailNotificationService` for sending notifications

### Error Handling

Services return typed result objects rather than throwing exceptions:

```typescript
interface ModerationResult {
  success: boolean;
  message: string;
  error?: string;
}

interface SyncResult {
  success: boolean;
  message: string;
  details?: string;
  duration?: number;
}
```

This pattern allows callers to handle errors without try/catch boilerplate and provides consistent error reporting.

### Server-Only Enforcement

Several services use the `server-only` import to prevent accidental client-side bundling:

```typescript
import 'server-only';
```

This triggers a build error if the module is imported in a client component, ensuring database connections and API keys are never exposed to the browser.

## Service Configuration

Services receive configuration through:

1. **Constructor injection**: Services like `ItemGitService` accept a config object
2. **ConfigService**: Services like `PostHogApiService` use the centralized `lib/config/config-service.ts`
3. **Environment variables**: Some services read env vars directly for simple configuration

### Common Configuration Types

```typescript
// Git service configuration
interface ItemGitServiceConfig {
  owner: string;      // GitHub owner
  repo: string;       // Repository name
  token: string;      // GitHub token
  branch: string;     // Git branch
  dataDir: string;    // Local data directory
  itemsDir: string;   // Items subdirectory
}

// Sync configuration
const SYNC_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes
const SYNC_TIMEOUT_MS = 5 * 60 * 1000;   // 5 minutes
const MAX_RETRIES = 3;
```

## Module Exports

The main `lib/services/index.ts` exports core shared services:

```typescript
export {
  FileService,
  createFileService,
  fileServices,
  type YamlData,
  type FileServiceConfig,
} from './file.service';
```

Most services are imported directly from their individual files rather than through the barrel export, as they have specific initialization requirements.

## Testing Services

Since services encapsulate business logic separate from HTTP concerns, they are the natural boundary for unit testing:

```typescript
// Example test structure
const service = new RoleDbService();
const role = await service.create({
  name: 'Test Role',
  permissions: ['items:read', 'items:create'],
});
expect(role.name).toBe('Test Role');
```

Services that depend on external APIs (PostHog, Twenty CRM) should be tested with mocked HTTP clients.
