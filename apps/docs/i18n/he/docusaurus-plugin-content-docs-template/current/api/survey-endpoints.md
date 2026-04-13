---
id: survey-endpoints
title: "סקרים ממשק API"
sidebar_label: "סקרים"
sidebar_position: 14
---

# סקרים ממשק API

ה-API של Surveys מספק פעולות CRUD מלאות עבור סקרים ואיסוף תשובות. סקרים יכולים להיות **גלובליים** ​​(ברחבי האתר) או **ספציפיים לפריט**, ולתמוך במצבי טיוטה/פורסם/סגור.

**קבצי מקור:**
- `template/app/api/surveys/route.ts`
- `template/app/api/surveys/[surveyId]/route.ts`
- `template/app/api/surveys/[surveyId]/responses/route.ts`
- `template/app/api/surveys/responses/[responseId]/route.ts`

## סיכום נקודות קצה

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|קבל|`/api/surveys`|אופציונלי|רשימת סקרים עם מסננים|
|פוסט|`/api/surveys`|מנהל מערכת|צור סקר חדש|
|קבל|`/api/surveys/{surveyId}`|מותנה|קבל סקר בודד לפי תעודת זהות או קלפון|
|PUT|`/api/surveys/{surveyId}`|מנהל מערכת|עדכן סקר|
|מחק|`/api/surveys/{surveyId}`|מנהל מערכת|מחק סקר|
|קבל|`/api/surveys/{surveyId}/responses`|מנהל מערכת|רשימת תשובות לסקר|
|פוסט|`/api/surveys/{surveyId}/responses`|אופציונלי|שלח תגובה|
|קבל|`/api/surveys/responses/{responseId}`|מנהל מערכת|קבל תגובה אחת|

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

## פרסם `/api/surveys`

יוצר סקר חדש. **מחייב אימות מנהל מערכת.**

### גוף הבקשה

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`title`|מחרוזת|**כן**|כותרת הסקר|
|`description`|מחרוזת|לא|תיאור הסקר|
|`type`|`"global"` או `"item"`|**כן**|סוג הסקר|
|`itemId`|מחרוזת|לא|מזהה פריט משויך (לסקרים מסוג פריט)|
|`status`|`"draft"`, `"published"`, או `"closed"`|לא|מצב ראשוני|
|`surveyJson`|חפץ|**כן**|הגדרת הסקר (שאלות, מבנה)|

### תגובה: 201 נוצר

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

מעדכן סקר קיים. **מצריך אימות מנהל.** המטפל פותר תחילה את הסקר לפי מזהה או שבלול לפני החלת עדכונים.

### גוף הבקשה

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`title`|מחרוזת|לא|כותרת מעודכנת|
|`description`|מחרוזת|לא|תיאור מעודכן|
|`status`|`"draft"`, `"published"`, או `"closed"`|לא|סטטוס מעודכן|
|`surveyJson`|חפץ|לא|הגדרת סקר מעודכנת|

### תגובה: 200 עודכנו

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

## קבל `/api/surveys/{surveyId}/responses`

מאחזר תשובות מעומדות עבור סקר ספציפי. **מחייב אימות מנהל מערכת.**

### פרמטרי שאילתה

|פרמטר|הקלד|חובה|תיאור|
|-----------|------|----------|-------------|
|`itemId`|מחרוזת|לא|סנן תגובות לפי מזהה פריט|
|`userId`|מחרוזת|לא|סנן תגובות לפי מזהה משתמש|
|`startDate`|מחרוזת (תאריך)|לא|סנן תגובות מתאריך זה|
|`endDate`|מחרוזת (תאריך)|לא|סנן תגובות עד תאריך זה|
|`page`|מספר שלם|לא|מספר עמוד|
|`limit`|מספר שלם|לא|פריטים לכל עמוד|

### תגובות: 200

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

## קבל `/api/surveys/responses/{responseId}`

מאחזר תגובת סקר בודדת לפי תעודת זהות. **מחייב אימות מנהל מערכת.**

### תגובות: 200

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
