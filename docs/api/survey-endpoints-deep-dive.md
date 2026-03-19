---
id: survey-endpoints-deep-dive
title: "Surveys API Reference"
sidebar_label: "Surveys (Deep Dive)"
sidebar_position: 56
---

# Surveys API Reference

## Overview

The Surveys API provides full CRUD operations for surveys and their responses. Surveys can be global or item-specific, and support draft/published/closed lifecycle states. Survey creation, updates, and deletion require admin authentication, while public users can view published surveys and submit responses.

## Endpoints

### GET /api/surveys

Retrieve surveys with optional filters and pagination. Checks database availability before processing.

**Request**

| Parameter | Type    | In    | Description                                               |
| --------- | ------- | ----- | --------------------------------------------------------- |
| type      | string  | query | Filter by type: `"global"` or `"item"`                    |
| itemId    | string  | query | Filter by item ID                                         |
| status    | string  | query | Filter by status: `"draft"`, `"published"`, or `"closed"` |
| page      | integer | query | Page number (default: 1, minimum: 1)                      |
| limit     | integer | query | Items per page (default: 10, min: 1, max: 100)            |

**Response**

```typescript
{
  success: true;
  data: {
    surveys: Array<Survey>;
    total: number;
    totalPages: number;
    page: number;
  }
}
```

**Example**

```typescript
const response = await fetch(
  "/api/surveys?type=global&status=published&page=1&limit=10",
);
const { data } = await response.json();
// data.surveys = [{ id: "...", title: "User Satisfaction", type: "global", ... }]
```

### POST /api/surveys

Create a new survey. Requires admin authentication.

**Request**

```typescript
{
  title: string;              // Required
  description?: string;
  type: "global" | "item";    // Required
  itemId?: string;            // Required if type is "item"
  status?: "draft" | "published" | "closed";
  surveyJson: object;         // Required -- SurveyJS-compatible JSON definition
}
```

**Response**

```typescript
{
  success: true;
  data: Survey; // The created survey object
}
```

**Example**

```typescript
const response = await fetch("/api/surveys", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "User Satisfaction Survey",
    type: "global",
    status: "draft",
    surveyJson: {
      pages: [
        {
          elements: [
            {
              type: "rating",
              name: "satisfaction",
              title: "How satisfied are you?",
            },
          ],
        },
      ],
    },
  }),
});
const { data: survey } = await response.json();
```

### GET `/api/surveys/{surveyId}`

Retrieve a specific survey by ID or slug. Non-published surveys are only visible to admins.

**Request**

| Parameter | Type   | In   | Description                  |
| --------- | ------ | ---- | ---------------------------- |
| surveyId  | string | path | Survey ID or slug (required) |

**Response**

```typescript
{
  success: true;
  data: Survey;
}
```

**Example**

```typescript
const response = await fetch("/api/surveys/user-satisfaction-2024");
const { data: survey } = await response.json();
```

### PUT `/api/surveys/{surveyId}`

Update a survey by ID or slug. Requires admin authentication.

**Request**

```typescript
{
  title?: string;
  description?: string;
  status?: "draft" | "published" | "closed";
  surveyJson?: object;
}
```

**Response**

```typescript
{
  success: true;
  data: Survey;
  message: "Survey updated successfully";
}
```

**Example**

```typescript
const response = await fetch("/api/surveys/abc-123", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "published" }),
});
```

### DELETE `/api/surveys/{surveyId}`

Delete a survey by ID or slug. Requires admin authentication.

**Request**

| Parameter | Type   | In   | Description                  |
| --------- | ------ | ---- | ---------------------------- |
| surveyId  | string | path | Survey ID or slug (required) |

**Response**

```typescript
{
  success: true;
  data: null;
  message: "Survey deleted successfully";
}
```

### GET `/api/surveys/{surveyId}/responses`

Retrieve paginated responses for a specific survey. Requires admin authentication.

**Request**

| Parameter | Type   | In    | Description                   |
| --------- | ------ | ----- | ----------------------------- |
| surveyId  | string | path  | Survey ID (required)          |
| itemId    | string | query | Filter by item ID             |
| userId    | string | query | Filter by user ID             |
| startDate | string | query | Filter from date (ISO format) |
| endDate   | string | query | Filter to date (ISO format)   |
| page      | number | query | Page number                   |
| limit     | number | query | Items per page                |

**Response**

```typescript
{
  success: true;
  data: {
    responses: Array<{
      id: string;
      surveyId: string;
      userId: string | null;
      itemId: string | null;
      data: object; // Survey answer data
      completedAt: string; // ISO 8601
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    totalPages: number;
  }
}
```

### POST `/api/surveys/{surveyId}/responses`

Submit a response to a published survey. Authentication is optional -- anonymous submissions are allowed.

**Request**

```typescript
{
  surveyId: string; // Must match the path parameter
  data: object; // Required -- survey answer data
}
```

**Response**

```typescript
{
  success: true;
  data: {
    id: string;
    surveyId: string;
    userId: string | null; // Set if user is authenticated
    itemId: string | null;
    data: object;
    completedAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    updatedAt: string;
  }
  message: "Response submitted successfully";
}
```

**Example**

```typescript
const response = await fetch("/api/surveys/abc-123/responses", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    surveyId: "abc-123",
    data: { satisfaction: 5, feedback: "Great product!" },
  }),
});
```

### GET `/api/surveys/responses/{responseId}`

Retrieve a specific survey response by ID. Requires admin authentication.

**Request**

| Parameter  | Type   | In   | Description            |
| ---------- | ------ | ---- | ---------------------- |
| responseId | string | path | Response ID (required) |

**Response**

```typescript
{
  success: true;
  data: SurveyResponse;
}
```

## Authentication

| Endpoint                                  | Auth Required                                |
| ----------------------------------------- | -------------------------------------------- |
| GET /api/surveys                          | Public (database must be available)          |
| POST /api/surveys                         | Admin only                                   |
| `GET /api/surveys/{surveyId}`             | Public for published; admin for draft/closed |
| `PUT /api/surveys/{surveyId}`             | Admin only                                   |
| `DELETE /api/surveys/{surveyId}`          | Admin only                                   |
| `GET /api/surveys/{surveyId}/responses`   | Admin only                                   |
| `POST /api/surveys/{surveyId}/responses`  | Public (optional auth for user tracking)     |
| `GET /api/surveys/responses/{responseId}` | Admin only                                   |

## Error Responses

| Status | Description                                                             |
| ------ | ----------------------------------------------------------------------- |
| 400    | Invalid request body -- missing required `data` field or malformed JSON |
| 401    | Unauthorized -- admin authentication required                           |
| 404    | Survey or response not found                                            |
| 500    | Internal server error -- database failure                               |
| 503    | Database unavailable or schema not initialized                          |

## Rate Limiting

No explicit rate limiting. Response submissions capture IP address and user agent for audit purposes. The GET /api/surveys endpoint checks database availability before processing and returns `503` if the database is unreachable.

## Related Endpoints

- [Config Feature Endpoints](./config-feature-endpoints) -- Check if the surveys feature is enabled
