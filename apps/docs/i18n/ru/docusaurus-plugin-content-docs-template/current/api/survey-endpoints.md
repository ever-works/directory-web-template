---
id: survey-endpoints
title: "?? API ??"
sidebar_label: "??"
sidebar_position: 14
---

# ?? API ??

?? API ??????????????? CRUD ????????**??**(????)?**????**,?????/???/??????????

**???:**
- `template/app/api/surveys/route.ts`
- `template/app/api/surveys/[surveyId]/route.ts`
- `template/app/api/surveys/[surveyId]/responses/route.ts`
- `template/app/api/surveys/responses/[responseId]/route.ts`

## ????

|??|??|??|??|
|--------|------|------|-------------|
|??|`/api/surveys`|??|??????????|
|???|`/api/surveys`|???|?????|
|??|`/api/surveys/{surveyId}`|????|?? ID ? slug ??????|
|??|`/api/surveys/{surveyId}`|???|????|
|??|`/api/surveys/{surveyId}`|???|????|
|??|`/api/surveys/{surveyId}/responses`|???|??????|
|???|`/api/surveys/{surveyId}/responses`|??|????|
|??|`/api/surveys/responses/{responseId}`|???|??????|

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

## ?? `/api/surveys`

????????? **??????????**

### ????

|??|??|??|??|
|-------|------|----------|-------------|
|`title`|???|**?**|????|
|`description`|???|?|????|
|`type`|`"global"` ? `"item"`|**?**|????|
|`itemId`|???|?|???? ID(????????)|
|`status`|`"draft"`?`"published"` ? `"closed"`|?|????|
|`surveyJson`|??|**?**|????(?????)|

### ??:201 ???

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

## ?`/api/surveys/{surveyId}`

??????? **??????????** ???????,???????? ID ? slug ?????

### ????

|??|??|??|??|
|-------|------|----------|-------------|
|`title`|???|?|????|
|`description`|???|?|?????|
|`status`|`"draft"`?`"published"` ? `"closed"`|?|????|
|`surveyJson`|??|?|???????|

### ??:200 ??

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

## ??`/api/surveys/{surveyId}/responses`

???????????? **??????????**

### ????

|??|??|??|??|
|-----------|------|----------|-------------|
|`itemId`|???|?|??? ID ????|
|`userId`|???|?|??? ID ????|
|`startDate`|???(??)|?|??????????|
|`endDate`|???(??)|?|??????????|
|`page`|??|?|??|
|`limit`|??|?|?????|

### ??:200

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

## ??`/api/surveys/responses/{responseId}`

? ID ????????? **??????????**

### ??:200

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

