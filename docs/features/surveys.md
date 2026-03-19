---
id: surveys
title: Surveys System
sidebar_label: Surveys
sidebar_position: 11
---

# Surveys System

The Ever Works template includes a built-in surveys system that supports both global surveys (site-wide feedback) and item-specific surveys (attached to individual directory items). Surveys are managed through the admin dashboard and responses are collected from authenticated users.

## Architecture

```
Surveys System
  |
  +-- SurveyService (lib/services/survey.service.ts)
  |     Server-side business logic singleton
  |
  +-- Database Queries (lib/db/queries/)
  |     Survey and response CRUD operations
  |
  +-- Admin Pages (app/[locale]/admin/surveys/)
  |     Create, edit, preview, publish, view responses
  |
  +-- API Client (lib/api/survey-api.client.ts)
  |     Client-side API wrapper
  |
  +-- Database Schema (lib/db/schema.ts)
        surveys + survey_responses tables
```

## Survey Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Global** | Site-wide survey, not tied to any item | General feedback, NPS surveys, user satisfaction |
| **Item-specific** | Linked to a specific item via `itemId` | Product feedback, service reviews, feature requests |

## SurveyService

The `SurveyService` class (`lib/services/survey.service.ts`) handles all business logic. It is a server-side only service (do not import in client components).

### CRUD Operations

| Method | Description |
|--------|-------------|
| `create(data)` | Create a new survey with auto-generated slug |
| `getOne(id)` | Get survey by ID |
| `getBySlug(slug)` | Get survey by URL-friendly slug |
| `getMany(filters?, userId?)` | List surveys with pagination, filtering, and completion status |
| `update(id, data)` | Update survey fields and handle status transitions |
| `delete(id)` | Delete survey (blocked if responses exist) |

### Response Operations

| Method | Description |
|--------|-------------|
| `submitResponse(data)` | Submit a survey response (validates survey is published) |
| `getResponses(surveyId, filters?)` | Get paginated responses for a survey |
| `getResponseById(id)` | Get a single response |

### Slug Generation

Survey slugs are auto-generated from the title with Unicode support:

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

The service ensures slug uniqueness by appending a counter if a collision is detected.

## Survey Lifecycle

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

| Status | Description |
|--------|-------------|
| `draft` | Survey is being edited, not visible to users |
| `published` | Survey is live and accepting responses |
| `closed` | Survey is no longer accepting responses |

Status transitions update metadata timestamps:

- Setting status to `published` sets `publishedAt`
- Setting status to `closed` sets `closedAt`

## Survey Data Structure

Surveys use a JSON-based question definition stored in the `surveyJson` column. This allows flexible survey structures without schema changes.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: 'global' | 'item';
  itemId?: string;          // Required when type is 'item'
  status?: 'draft' | 'published' | 'closed';
  surveyJson: object;       // Question definitions
}
```

### Survey Response Structure

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;          // Authenticated user ID
  itemId?: string;          // Item ID for item-specific surveys
  data: object;             // Response data matching surveyJson
  ipAddress?: string;       // For rate limiting
  userAgent?: string;       // For analytics
}
```

## Admin Management

The admin survey pages provide a full lifecycle management interface:

### Admin Routes

| Route | Description |
|-------|-------------|
| `/admin/surveys` | Survey listing with status tabs |
| `/admin/surveys/create` | New survey creation form |
| `/admin/surveys/[slug]/edit` | Edit existing survey |
| `/admin/surveys/[slug]/preview` | Preview survey before publishing |
| `/admin/surveys/[slug]/responses` | View and analyze responses |

### Admin Capabilities

- **Create surveys** with title, description, type, and question JSON
- **Edit surveys** in draft or published state
- **Preview** before publishing to verify appearance
- **Publish/close** surveys to control response collection
- **View responses** with filtering and pagination
- **Delete surveys** (only if no responses have been collected)

The `getMany` method supports efficient querying with:

- **Response counting** via SQL JOINs (single query, no N+1)
- **Completion status** per user (shows if current user has already responded)
- **Pagination** with page/limit parameters
- **Filtering** by status and type

## Error Handling

The service includes robust error handling for common database issues:

| Error Condition | Behavior |
|----------------|----------|
| Table not found | Clear message: "Run database migrations" |
| Connection refused | "Database connection failed" |
| DATABASE_URL missing | "Database not configured" |
| Survey not found | 404-style error |
| Survey not published | "Survey is [status] and not accepting responses" |
| Delete with responses | "Cannot delete survey with N responses" |

## Feature Flags

Surveys are controlled by the feature flags system. The `surveys` flag is automatically enabled when `DATABASE_URL` is configured:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## Client-Side Usage

Client components use the API client wrapper instead of the service directly:

```typescript
// Use in client components
import { surveyApiClient } from '@/lib/api/survey-api.client';

// Fetch surveys
const surveys = await surveyApiClient.getMany({ status: 'published' });

// Submit response
await surveyApiClient.submitResponse({
  surveyId: 'survey-uuid',
  data: { rating: 5, feedback: 'Great!' },
});
```

## E2E Testing

Surveys are covered by multiple E2E test files:

- `e2e/tests/admin/surveys.spec.ts` -- Admin management workflows
- `e2e/tests/public/surveys.spec.ts` -- Public survey display and submission
- `e2e/page-objects/admin/surveys.page.ts` -- Admin survey page object

## Related Files

- `lib/services/survey.service.ts` -- Business logic service
- `lib/db/schema.ts` -- `surveys` and `survey_responses` table definitions
- `lib/db/queries/` -- Survey database queries
- `lib/types/survey.ts` -- TypeScript type definitions
- `lib/api/survey-api.client.ts` -- Client-side API wrapper
- `app/[locale]/admin/surveys/` -- Admin pages
- `components/admin/` -- Admin UI components
- `e2e/tests/admin/surveys.spec.ts` -- Admin E2E tests
- `e2e/tests/public/surveys.spec.ts` -- Public E2E tests
