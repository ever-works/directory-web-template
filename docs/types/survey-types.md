---
id: survey-types
title: Survey Type Definitions
sidebar_label: Survey Types
sidebar_position: 6
---

# Survey Type Definitions

**Source:** `lib/types/survey.ts`

This module defines all shared type definitions for surveys and survey responses. It serves as the single source of truth for survey-related data structures used by the Survey Service, Survey API Client, and API route handlers.

## Enums

### `SurveyTypeEnum`

Defines whether a survey applies globally or is scoped to a specific item.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

| Value | Description |
|-------|-------------|
| `GLOBAL` | Survey appears site-wide, not tied to any specific item |
| `ITEM` | Survey is associated with a specific item (via `itemId`) |

### `SurveyStatusEnum`

Lifecycle states for a survey.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

| Value | Description |
|-------|-------------|
| `DRAFT` | Survey is being created/edited and is not visible to respondents |
| `PUBLISHED` | Survey is live and accepting responses |
| `CLOSED` | Survey is no longer accepting responses but data is preserved |

## Interfaces

### `CreateSurveyData`

Data required to create a new survey.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  surveyJson: any;
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | Yes | Display title of the survey |
| `description` | `string` | No | Optional description/subtitle |
| `type` | `SurveyTypeEnum` | Yes | Whether the survey is global or item-scoped |
| `itemId` | `string` | No | Item ID (required when `type` is `ITEM`) |
| `status` | `SurveyStatusEnum` | No | Initial status (defaults to `DRAFT`) |
| `surveyJson` | `any` | Yes | Survey.js-compatible JSON definition |

### `UpdateSurveyData`

Data for updating an existing survey. All fields are optional.

```typescript
interface UpdateSurveyData {
  title?: string;
  slug?: string;
  description?: string;
  status?: SurveyStatusEnum;
  surveyJson?: any;
}
```

### `SubmitResponseData`

Data for submitting a survey response from a respondent.

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;
  itemId?: string;
  data: any;
  ipAddress?: string;
  userAgent?: string;
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `surveyId` | `string` | Yes | ID of the survey being responded to |
| `userId` | `string` | No | Authenticated user ID (null for anonymous) |
| `itemId` | `string` | No | Item context for item-scoped surveys |
| `data` | `any` | Yes | Survey.js response data object |
| `ipAddress` | `string` | No | Respondent IP for analytics/deduplication |
| `userAgent` | `string` | No | Browser user agent string |

### `SurveyFilters`

Filters for querying surveys in list endpoints.

```typescript
interface SurveyFilters {
  type?: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  page?: number;
  limit?: number;
}
```

### `ResponseFilters`

Filters for querying survey responses.

```typescript
interface ResponseFilters {
  itemId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `itemId` | `string?` | Filter responses by item |
| `userId` | `string?` | Filter responses by user |
| `startDate` | `string?` | ISO date string for range start |
| `endDate` | `string?` | ISO date string for range end |
| `page` | `number?` | Pagination page number |
| `limit` | `number?` | Results per page |

## Usage Examples

### Creating a global survey

```typescript
import type { CreateSurveyData } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const surveyData: CreateSurveyData = {
  title: 'User Satisfaction Survey',
  description: 'Help us improve by sharing your experience',
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.DRAFT,
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'satisfaction',
            title: 'How satisfied are you with our platform?',
            rateMin: 1,
            rateMax: 5,
          },
          {
            type: 'comment',
            name: 'feedback',
            title: 'Any additional feedback?',
          },
        ],
      },
    ],
  },
};
```

### Creating an item-scoped survey

```typescript
import { SurveyTypeEnum } from '@/lib/types/survey';

const itemSurvey: CreateSurveyData = {
  title: 'Product Review',
  type: SurveyTypeEnum.ITEM,
  itemId: 'my-tool-slug',
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'quality',
            title: 'Rate this product',
          },
        ],
      },
    ],
  },
};
```

### Filtering surveys

```typescript
import type { SurveyFilters } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const filters: SurveyFilters = {
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.PUBLISHED,
  page: 1,
  limit: 10,
};
```

### Submitting a response

```typescript
import type { SubmitResponseData } from '@/lib/types/survey';

const response: SubmitResponseData = {
  surveyId: 'survey-uuid-123',
  userId: 'user-uuid-456',
  data: {
    satisfaction: 4,
    feedback: 'The platform is easy to use!',
  },
};
```

### Filtering responses by date range

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## Design Notes

### Survey.js Integration

The `surveyJson` field uses the `any` type to accept Survey.js JSON definitions. Survey.js is a third-party library that defines surveys as JSON objects describing pages, elements, and their configuration. The template stores this JSON as-is and renders it using the Survey.js React component.

### Survey Lifecycle

1. **Draft** - Survey is created and can be edited freely
2. **Published** - Survey is live; responses can be submitted
3. **Closed** - Survey stops accepting responses; existing data is preserved

### Global vs. Item Surveys

- **Global surveys** (`SurveyTypeEnum.GLOBAL`) appear site-wide and are not tied to any item
- **Item surveys** (`SurveyTypeEnum.ITEM`) are shown on specific item detail pages and require an `itemId`

The `ItemData.showSurveys` field (from `item.ts`) controls whether the surveys section is displayed on an item page.

## Related Types

- [`ItemData.showSurveys`](./item-types.md) - Controls survey visibility per item
- [`ItemData.action`](./item-types.md) - The `'start-survey'` action links to a survey
