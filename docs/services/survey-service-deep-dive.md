---
id: survey-service-deep-dive
title: Survey Service Deep Dive
sidebar_label: Survey Service (Deep Dive)
sidebar_position: 56
---

# Survey Service Deep Dive

## Overview

The Survey Service handles all survey-related business logic on the server side. It provides standard CRUD operations for surveys plus response submission and retrieval. Surveys are stored in a PostgreSQL database using Drizzle ORM.

This service is **server-only** and should never be imported in client components. Client components should use `surveyApiClient` from `lib/api/survey-api.client.ts` instead.

## Source Files

| File | Path |
|------|------|
| Service | `template/lib/services/survey.service.ts` |
| API Client (client-side) | `template/lib/api/survey-api.client.ts` |
| DB Queries | `template/lib/db/queries/survey.queries.ts` |
| Types | `template/lib/types/survey.ts` |
| Migration | `template/lib/db/migrations/0013_add_surveys_table.sql` |

## Architecture

```
Client Components
    |
surveyApiClient (/api/surveys/*)
    |
API Route Handlers
    |
SurveyService (server-only)
    |
DB Queries (survey.queries.ts)
    |
PostgreSQL (surveys, survey_responses tables)
```

## Survey Lifecycle

```
Draft --> Published --> Closed
          |
          +--> Responses submitted while published
```

- **Draft:** Survey is being edited, not visible to users
- **Published:** Survey is live and accepting responses. Sets `publishedAt` timestamp
- **Closed:** Survey is no longer accepting responses. Sets `closedAt` timestamp

## Method Reference

### `create(data: CreateSurveyData): Promise<Survey>`

Creates a new survey with an auto-generated URL slug.

**Parameters:**
```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: string;
  itemId?: string;
  status?: 'draft' | 'published' | 'closed';
  surveyJson: any;  // SurveyJS-compatible JSON definition
}
```

**Implementation details:**
1. Generate slug from title using Unicode-safe slug generation
2. Check for slug uniqueness; if duplicate, append incrementing number
3. If status is `published`, set `publishedAt` to now
4. If status is `closed`, set `closedAt` to now

**Error handling:** Database errors are caught and classified:
- `DATABASE_URL` / `connect ECONNREFUSED` / `database` errors throw `'Database not configured'`
- Other errors propagate unchanged

### `getBySlug(slug: string): Promise<Survey | null>`

Retrieves a survey by its URL slug. Returns `null` if not found.

### `getOne(id: string): Promise<Survey | null>`

Retrieves a survey by its database ID. Returns `null` if not found.

### `getMany(filters?, userId?): Promise<SurveyListResult>`

Retrieves surveys with pagination and filtering. Uses efficient JOINs to get response count and completion status in a single query.

**Parameters:**
- `filters` (`SurveyFilters`) -- Page, limit, status, search, etc.
- `userId` -- If provided, includes whether the user has completed each survey

**Returns:**
```typescript
{
  surveys: Survey[];
  total: number;
  totalPages: number;
  page: number;
}
```

**Error classification:**
- `relation ... does not exist` -- Suggests running `pnpm db:migrate`
- Connection errors -- Throws `'Database connection failed'`

### `update(id: string, data: UpdateSurveyData): Promise<Survey>`

Updates a survey. Handles status transition logic:

- If changing to `published` (from non-published): sets `publishedAt`
- If changing to `closed` (from non-closed): sets `closedAt`
- If slug is changed, checks for uniqueness (appends number if duplicate)

Throws `'Survey not found'` if the survey does not exist.

### `delete(id: string): Promise<void>`

Deletes a survey. Safety check: **refuses to delete surveys that have responses**. Throws `'Cannot delete survey with N responses'` if responses exist.

### `submitResponse(data: SubmitResponseData): Promise<SurveyResponse>`

Submits a response to a published survey.

**Parameters:**
```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;
  itemId?: string;
  data: any;          // Response data matching surveyJson schema
  ipAddress?: string;
  userAgent?: string;
}
```

**Validation:**
- Survey must exist
- Survey must have status `published` (throws if draft or closed)

Sets `completedAt` to the current timestamp.

### `getResponses(surveyId: string, filters?: ResponseFilters): Promise<SurveyResponse[]>`

Retrieves responses for a specific survey with optional filtering.

### `getResponseById(id: string): Promise<SurveyResponse | null>`

Retrieves a single response by ID.

## Slug Generation

The `generateSlug` method handles Unicode characters:

1. Normalize to NFD (separates diacritical marks)
2. Strip combining diacritical marks (`U+0300` to `U+036F`)
3. Lowercase
4. Replace spaces/underscores with hyphens
5. Remove non-alphanumeric characters (except hyphens)
6. Collapse multiple hyphens
7. Trim leading/trailing hyphens
8. Fallback to `'survey'` if result is empty (e.g., all non-Latin input)

**Examples:**
- `"Cafe Survey"` becomes `cafe-survey`
- `"Nino's Test"` becomes `ninos-test`

### `ensureUniqueSlug(baseSlug, ignoreId?): Promise<string>`

Appends an incrementing number to the base slug until it finds a unique one: `base-2`, `base-3`, etc.

## Singleton Access

```typescript
import { surveyService } from '@/lib/services/survey.service';

const survey = await surveyService.create({
  title: 'User Satisfaction Survey',
  type: 'feedback',
  surveyJson: { /* SurveyJS definition */ },
  status: 'draft',
});
```

## Error Handling

The service implements contextual error handling for database issues:

- **Missing table:** Detected via `relation ... does not exist`. Advises running migrations.
- **Connection errors:** Detected via `DATABASE_URL`, `ECONNREFUSED`, `ENOTFOUND`, `connection` keywords.
- **Duplicate slug:** Automatically resolved by appending a number.
- **Delete protection:** Surveys with responses cannot be deleted.
- **Status validation:** Only published surveys accept responses.

## Usage Examples

```typescript
import { surveyService } from '@/lib/services/survey.service';

// Create a survey
const survey = await surveyService.create({
  title: 'Product Feedback',
  description: 'Tell us what you think',
  type: 'feedback',
  itemId: 'product-123',
  status: 'draft',
  surveyJson: {
    pages: [{
      elements: [{
        type: 'rating',
        name: 'satisfaction',
        title: 'How satisfied are you?',
      }],
    }],
  },
});

// Publish the survey
await surveyService.update(survey.id, { status: 'published' });

// Submit a response
await surveyService.submitResponse({
  surveyId: survey.id,
  userId: 'user_123',
  data: { satisfaction: 5 },
  ipAddress: '1.2.3.4',
  userAgent: 'Mozilla/5.0...',
});

// List surveys with response counts
const result = await surveyService.getMany(
  { page: 1, limit: 10, status: 'published' },
  'user_123'
);

// Close the survey
await surveyService.update(survey.id, { status: 'closed' });
```
