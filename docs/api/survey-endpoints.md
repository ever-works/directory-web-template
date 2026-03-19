---
id: survey-endpoints
title: "Surveys API Endpoints"
sidebar_label: "Surveys"
sidebar_position: 14
---

# Surveys API Endpoints

The Surveys API provides full CRUD operations for surveys and response collection. Surveys can be either **global** (site-wide) or **item-specific**, and support draft/published/closed lifecycle states.

**Source files:**
- `template/app/api/surveys/route.ts`
- `template/app/api/surveys/[surveyId]/route.ts`
- `template/app/api/surveys/[surveyId]/responses/route.ts`
- `template/app/api/surveys/responses/[responseId]/route.ts`

## Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/surveys` | Optional | List surveys with filters |
| POST | `/api/surveys` | Admin | Create a new survey |
| GET | `/api/surveys/{surveyId}` | Conditional | Get a single survey by ID or slug |
| PUT | `/api/surveys/{surveyId}` | Admin | Update a survey |
| DELETE | `/api/surveys/{surveyId}` | Admin | Delete a survey |
| GET | `/api/surveys/{surveyId}/responses` | Admin | List responses for a survey |
| POST | `/api/surveys/{surveyId}/responses` | Optional | Submit a response |
| GET | `/api/surveys/responses/{responseId}` | Admin | Get a single response |

---

## GET `/api/surveys`

Retrieves a paginated list of surveys with optional filtering. Database availability is checked before processing.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | `"global"` or `"item"` | No | -- | Filter by survey type |
| `itemId` | string | No | -- | Filter by associated item ID |
| `status` | `"draft"`, `"published"`, or `"closed"` | No | -- | Filter by status |
| `page` | integer | No | 1 | Page number (minimum 1) |
| `limit` | integer | No | 10 | Items per page (1-100) |

### Response Shape

#### 200 -- Surveys Retrieved

```json
{
  "success": true,
  "data": {
    "surveys": [
      {
        "id": "survey_abc123",
        "title": "User Satisfaction Survey",
        "type": "global",
        "status": "published",
        "surveyJson": { "questions": [] }
      }
    ],
    "total": 25,
    "totalPages": 3,
    "page": 1
  }
}
```

### Error Handling

The endpoint has special handling for common database errors:

- **Connection errors** (missing `DATABASE_URL`, refused connections) return **503** with a descriptive message.
- **Schema errors** (missing tables/relations) return **503** suggesting migrations need to run.
- Other errors return **500**.

---

## POST `/api/surveys`

Creates a new survey. **Requires admin authentication.**

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | **Yes** | Survey title |
| `description` | string | No | Survey description |
| `type` | `"global"` or `"item"` | **Yes** | Survey type |
| `itemId` | string | No | Associated item ID (for item-type surveys) |
| `status` | `"draft"`, `"published"`, or `"closed"` | No | Initial status |
| `surveyJson` | object | **Yes** | Survey definition (questions, structure) |

### Response: 201 Created

```json
{
  "success": true,
  "data": {
    "id": "survey_new123",
    "title": "New Survey",
    "type": "global",
    "status": "draft",
    "surveyJson": { "questions": [] }
  }
}
```

---

## GET `/api/surveys/{surveyId}`

Retrieves a single survey by its ID or slug. Non-published surveys are only visible to admins.

### Access Control Logic

```ts
// Published surveys are visible to everyone
if (survey.status !== 'published') {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { success: false, error: 'Survey not found' },
      { status: 404 }
    );
  }
}
```

The endpoint first attempts lookup by ID, then falls back to slug-based lookup.

### Response: 404 Not Found

Returned when the survey does not exist OR when a non-admin requests a non-published survey:

```json
{
  "success": false,
  "error": "Survey not found"
}
```

---

## PUT `/api/surveys/{surveyId}`

Updates an existing survey. **Requires admin authentication.** The handler first resolves the survey by ID or slug before applying updates.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | Updated title |
| `description` | string | No | Updated description |
| `status` | `"draft"`, `"published"`, or `"closed"` | No | Updated status |
| `surveyJson` | object | No | Updated survey definition |

### Response: 200 Updated

```json
{
  "success": true,
  "data": { "id": "survey_abc", "title": "Updated Title" },
  "message": "Survey updated successfully"
}
```

---

## DELETE `/api/surveys/{surveyId}`

Permanently deletes a survey. **Requires admin authentication.**

### Response: 200 Deleted

```json
{
  "success": true,
  "data": null,
  "message": "Survey deleted successfully"
}
```

---

## GET `/api/surveys/{surveyId}/responses`

Retrieves paginated responses for a specific survey. **Requires admin authentication.**

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `itemId` | string | No | Filter responses by item ID |
| `userId` | string | No | Filter responses by user ID |
| `startDate` | string (date) | No | Filter responses from this date |
| `endDate` | string (date) | No | Filter responses until this date |
| `page` | integer | No | Page number |
| `limit` | integer | No | Items per page |

### Response: 200

```json
{
  "success": true,
  "data": {
    "responses": [
      {
        "id": "resp_123",
        "surveyId": "survey_abc",
        "userId": "user_456",
        "itemId": null,
        "data": { "q1": "answer1" },
        "completedAt": "2024-01-20T10:30:00.000Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "total": 42,
    "totalPages": 5
  }
}
```

---

## POST `/api/surveys/{surveyId}/responses`

Submits a response to a published survey. Authentication is **optional** -- anonymous submissions are supported. The endpoint captures IP address and user agent metadata.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | object | **Yes** | Survey response data (answers) |

### How Metadata Is Captured

```ts
const forwardedFor = request.headers.get('x-forwarded-for') || '';
const ipAddress =
  (forwardedFor.split(',')[0]?.trim()) ||
  request.headers.get('x-real-ip') ||
  'unknown';

const userAgent = request.headers.get('user-agent') || 'unknown';
```

### Response: 201 Created

```json
{
  "success": true,
  "data": {
    "id": "resp_new123",
    "surveyId": "survey_abc",
    "data": { "q1": "my answer" },
    "completedAt": "2024-01-20T10:30:00.000Z"
  },
  "message": "Response submitted successfully"
}
```

#### 400 -- Invalid Body

```json
{
  "success": false,
  "error": "Invalid request body: \"data\" is required"
}
```

---

## GET `/api/surveys/responses/{responseId}`

Retrieves a single survey response by ID. **Requires admin authentication.**

### Response: 200

```json
{
  "success": true,
  "data": {
    "id": "resp_123",
    "surveyId": "survey_abc",
    "userId": "user_456",
    "data": { "q1": "answer1" },
    "completedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/surveys/route.ts` | List and create surveys |
| `template/app/api/surveys/[surveyId]/route.ts` | Single survey CRUD |
| `template/app/api/surveys/[surveyId]/responses/route.ts` | Survey response list and submit |
| `template/app/api/surveys/responses/[responseId]/route.ts` | Single response retrieval |
| `template/lib/services/survey.service.ts` | Survey business logic |
| `template/lib/types/survey.ts` | TypeScript types and interfaces |
