---
id: items-api-endpoints-deep-dive
title: Items API Endpoints Deep Dive
sidebar_label: Items API Deep Dive
sidebar_position: 65
---

# Items API Endpoints Deep Dive

ה-API של Items מספק נקודות קצה הפונות לציבור לאינטראקציה עם פריטים, כולל הערות, הצבעות, מעקב אחר צפיות, שיוך חברות ומדדי מעורבות. נקודות קצה אלו מפעילות את תכונות הליבה הפונות למשתמש של אתר הספרייה.

**ספריית מקור:** `template/app/api/items/`

---

## Route Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/items/{slug}/comments` | Public | List item comments |
| `POST` | `/api/items/{slug}/comments` | Session | Create a comment |
| `PUT` | `/api/items/{slug}/comments/{commentId}` | Session (owner) | Update a comment |
| `DELETE` | `/api/items/{slug}/comments/{commentId}` | Session (owner) | Delete a comment |
| `GET` | `/api/items/{slug}/comments/rating` | Public | Get rating statistics |
| `GET` | `/api/items/{slug}/comments/rating/{commentId}` | Public | Get single comment rating |
| `PATCH` | `/api/items/{slug}/comments/rating/{commentId}` | Public | Update comment rating |
| `GET` | `/api/items/{slug}/company` | Admin | Get item's company |
| `POST` | `/api/items/{slug}/company` | Admin | Assign company to item |
| `DELETE` | `/api/items/{slug}/company` | Admin | Remove company from item |
| `POST` | `/api/items/{slug}/views` | Public | Record item view |
| `GET` | `/api/items/{slug}/votes` | Public | Get vote info + user status |
| `POST` | `/api/items/{slug}/votes` | Session | Cast or update vote |
| `DELETE` | `/api/items/{slug}/votes` | Session | Remove vote |
| `GET` | `/api/items/{slug}/votes/count` | Public | Get vote count only |
| `GET` | `/api/items/{slug}/votes/status` | Session | Get user's vote record |
| `GET` | `/api/items/engagement` | Public | Batch engagement metrics |
| `GET` | `/api/items/popularity-scores` | Public | Debug popularity scores |

---

## הערות

### רשימת הערות

מחזירה את כל ההערות לפריט ספציפי, כולל פרטי פרופיל משתמש.

|רכוש|ערך|
|----------|-------|
|**שיטה**|`GET`|
|**נתיב**|`/api/items/{slug}/comments`|
|**אישור**|אין (ציבורי)|
|**מקור**|`items/[slug]/comments/route.ts`|

#### תגובה

**סטטוס 200**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool! Really helped boost my productivity.",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

#### תלתל דוגמה

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments
```

---

### Create Comment

Creates a new comment with a rating for an item.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/items/{slug}/comments` |
| **Auth** | Session (user with client profile) |
| **Source** | `items/[slug]/comments/route.ts` |

#### Request Body

```json
{
  "content": "This tool is excellent for team collaboration!",
  "rating": 5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | `string` | Yes | Comment text (must be non-empty) |
| `rating` | `integer` | Yes | Rating from 1 to 5 |

#### Responses

| Status | Description |
|--------|-------------|
| 200 | Comment created successfully |
| 400 | Invalid content or rating |
| 401 | Authentication required |
| 403 | User is blocked (suspended or banned) |
| 404 | Client profile not found |
| 500 | Server error |

**Status 200**

```json
{
  "success": true,
  "comment": {
    "id": "comment_new123",
    "content": "This tool is excellent for team collaboration!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "awesome-productivity-tool",
    "createdAt": "2024-01-21T14:00:00.000Z",
    "updatedAt": "2024-01-21T14:00:00.000Z",
    "deletedAt": null,
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

#### curl Example

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/comments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "content": "Great tool!", "rating": 5 }'
```

:::note Moderation
Blocked users (suspended or banned) receive a 403 response with a message explaining their block status. The `isUserBlocked()` check is performed using the client profile's status field.
:::

---

### עדכן תגובה

עדכון תוכן ו/או דירוג של תגובה. רק מחבר התגובה יכול לעדכן את התגובה שלו.

|רכוש|ערך|
|----------|-------|
|**שיטה**|`PUT`|
|**נתיב**|`/api/items/{slug}/comments/{commentId}`|
|**אישור**|הפעלה (בעל תגובה)|
|**מקור**|`items/[slug]/comments/[commentId]/route.ts`|

#### גוף הבקשה

יש לספק לפחות שדה אחד:

```json
{
  "content": "Updated review text.",
  "rating": 4
}
```

|שדה|הקלד|חובה|אילוצים|
|-------|------|----------|-------------|
|`content`|`string`|לא|1-1000 תווים|
|`rating`|`integer`|לא| 1-5 |

#### תגובה

**סטטוס 200** -- מחזיר את ההערה המעודכנת עם פרטי משתמש וחותמת זמן `editedAt`.

```json
{
  "id": "comment_123abc",
  "content": "Updated review text.",
  "rating": 4,
  "userId": "client_456def",
  "itemId": "awesome-productivity-tool",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-21T15:00:00.000Z",
  "editedAt": "2024-01-21T15:00:00.000Z",
  "deletedAt": null,
  "user": {
    "id": "client_456def",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "image": "https://example.com/avatars/john.jpg"
  }
}
```

---

### Delete Comment

Soft-deletes a comment. Only the comment author can delete their comment.

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/items/{slug}/comments/{commentId}` |
| **Auth** | Session (comment owner) |
| **Source** | `items/[slug]/comments/[commentId]/route.ts` |

#### Response

**Status 204** -- No content (comment deleted successfully).

| Status | Description |
|--------|-------------|
| 204 | Comment deleted |
| 401 | Unauthorized |
| 404 | Comment not found or not authorized |

#### curl Example

```bash
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/comments/comment_123 \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### קבל סטטיסטיקת דירוג

מחזירה סטטיסטיקות דירוג מצטברות עבור פריט: דירוג ממוצע וספירה כוללת.

|רכוש|ערך|
|----------|-------|
|**שיטה**|`GET`|
|**נתיב**|`/api/items/{slug}/comments/rating`|
|**אישור**|אין (ציבורי)|
|**מקור**|`items/[slug]/comments/rating/route.ts`|

#### תגובה

**סטטוס 200**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`averageRating`|`number`|דירוג ממוצע (0 אם אין דירוגים, מקסימום 5)|
|`totalRatings`|`number`|המספר הכולל של תגובות שלא נמחקו עם דירוגים|

#### תלתל דוגמה

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments/rating
```

---

### Get/Update Single Comment Rating

#### Get Comment Rating

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Auth** | None (public) |

Returns the full comment object for a specific comment ID.

#### Update Comment Rating

| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Auth** | None |

**Request Body:**
```json
{
  "rating": 4
}
```

Returns the updated comment object.

---

## איגוד החברה

נקודות קצה למנהל מערכת בלבד לניהול הקשר בין פריטים וחברות.

### קבל את חברת פריט

|רכוש|ערך|
|----------|-------|
|**שיטה**|`GET`|
|**נתיב**|`/api/items/{slug}/company`|
|**אישור**|מנהל מערכת|
|**מקור**|`items/[slug]/company/route.ts`|

#### תגובה

**סטטוס 200** -- נמצאה חברה.

```json
{
  "success": true,
  "data": {
    "id": "company_123",
    "name": "Acme Corp",
    "website": "https://acme.com"
  }
}
```

**סטטוס 200** -- לא הוקצתה חברה.

```json
{
  "success": true,
  "data": null
}
```

---

### Assign Company to Item

Assigns a company to an item. This operation is idempotent.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/items/{slug}/company` |
| **Auth** | Admin |
| **Source** | `items/[slug]/company/route.ts` |

#### Request Body

```json
{
  "companyId": "company_123"
}
```

#### Responses

**Status 201** -- New association created.

```json
{
  "success": true,
  "data": { /* association object */ },
  "created": true,
  "updated": false
}
```

**Status 200** -- Existing association updated.

```json
{
  "success": true,
  "data": { /* association object */ },
  "created": false,
  "updated": true
}
```

**Status 409** -- Item already linked to a different company.

```json
{
  "error": "Item is already linked to another company"
}
```

---

### הסר חברה מהפריט

מסיר את שיוך החברה מפריט. הפעולה הזו היא אימפוטנטית.

|רכוש|ערך|
|----------|-------|
|**שיטה**|`DELETE`|
|**נתיב**|`/api/items/{slug}/company`|
|**אישור**|מנהל מערכת|

#### תגובה

**סטטוס 200**

```json
{
  "success": true,
  "deleted": true
}
```

#### תלתל דוגמה

```bash
# Assign company
curl -s -X POST http://localhost:3000/api/items/awesome-tool/company \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<admin_session>" \
  -d '{ "companyId": "company_123" }'

# Remove company
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/company \
  -H "Cookie: next-auth.session-token=<admin_session>"
```

---

## Views

### Record Item View

Records a unique daily view for an item with built-in deduplication, bot detection, and owner exclusion.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/items/{slug}/views` |
| **Auth** | None (public) |
| **Source** | `items/[slug]/views/route.ts` |

#### Processing Flow

1. **Database check** -- verifies database availability.
2. **Bot detection** -- rejects known bot user agents.
3. **Item validation** -- confirms the item exists (returns 404 if not found).
4. **Owner exclusion** -- if authenticated, skips counting if the viewer is the item owner.
5. **Viewer ID** -- reads or creates a viewer cookie (`VIEWER_COOKIE_NAME`) for anonymous tracking.
6. **Daily deduplication** -- records the view only once per viewer per day.

#### Response

**Status 200** -- View processed.

```json
{ "success": true, "counted": true }
```

| Scenario | `counted` | `reason` |
|----------|-----------|----------|
| New view recorded | `true` | -- |
| Duplicate view (same day) | `false` | -- |
| Bot detected | `false` | `"bot"` |
| Owner viewing own item | `false` | `"owner"` |

**Status 404** -- Item not found.

```json
{ "success": false, "error": "Item not found" }
```

#### curl Example

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/views \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
```

### Implementation Notes

- The viewer cookie is `HttpOnly`, `Secure` in production, and has `SameSite: lax`.
- View deduplication is based on `(itemId, viewerId, viewedDateUtc)` where the date is `YYYY-MM-DD` in UTC.
- The `isBot()` utility checks the user agent against known bot patterns.

---

## הצבעות

### קבל מידע על הצבעה

מחזירה את ספירת ההצבעות הכוללת ואת סטטוס ההצבעות של המשתמש הנוכחי (אם מאומת).

|רכוש|ערך|
|----------|-------|
|**שיטה**|`GET`|
|**נתיב**|`/api/items/{slug}/votes`|
|**אישור**|אין (ציבורי; סטטוס משתמש מחייב הפעלה)|
|**מקור**|`items/[slug]/votes/route.ts`|

#### תגובה

**סטטוס 200**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`count`|`number`|ספירת קולות נטו (הצבעות למעלה - הצבעות כלפי מטה)|
|`userVote`|`"מעלה" \|"למטה" \|null`|הצבעת המשתמש (`null` אם לא מאומתת או ללא הצבעה)|

---

### Cast or Update Vote

Casts a new vote or replaces an existing vote.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/items/{slug}/votes` |
| **Auth** | Session (user with client profile) |
| **Source** | `items/[slug]/votes/route.ts` |

#### Request Body

```json
{
  "type": "up"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | Yes | Vote type: `"up"` or `"down"` |

#### Response

**Status 200**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

| Status | Description |
|--------|-------------|
| 200 | Vote cast successfully |
| 400 | Invalid vote type |
| 401 | Unauthorized |
| 403 | User is blocked (suspended/banned) |
| 404 | Client profile not found |

#### curl Example

```bash
# Upvote
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "up" }'

# Downvote
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "down" }'
```

---

### הסר הצבעה

מסיר את ההצבעה של המשתמש הנוכחי מפריט.

|רכוש|ערך|
|----------|-------|
|**שיטה**|`DELETE`|
|**נתיב**|`/api/items/{slug}/votes`|
|**אישור**|הפעלה (משתמש עם פרופיל לקוח)|
|**מקור**|`items/[slug]/votes/route.ts`|

#### תגובה

**סטטוס 200**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

---

### Get Vote Count

A lightweight endpoint that returns only the vote count (no user status).

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/{slug}/votes/count` |
| **Auth** | None (public) |
| **Source** | `items/[slug]/votes/count/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "count": 15
}
```

---

### קבל סטטוס הצבעת משתמש

מחזירה את רשומת ההצבעה המלאה עבור ההצבעה של המשתמש המאומת על פריט ספציפי.

|רכוש|ערך|
|----------|-------|
|**שיטה**|`GET`|
|**נתיב**|`/api/items/{slug}/votes/status`|
|**אישור**|הפעלה (משתמש)|
|**מקור**|`items/[slug]/votes/status/route.ts`|

#### תגובה

**סטטוס 200** -- המשתמש הצביע.

```json
{
  "id": "vote_123abc",
  "userId": "client_456def",
  "itemId": "item_123abc",
  "voteType": "UPVOTE",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

**סטטוס 200** -- המשתמש לא הצביע.

```json
null
```

---

## Engagement Metrics

### Batch Engagement Metrics

Fetches engagement metrics (views, votes, ratings, favorites, comments) for multiple items in a single request.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/engagement` |
| **Auth** | None (public) |
| **Caching** | `force-dynamic` |
| **Source** | `items/engagement/route.ts` |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slugs` | `string` | Yes | Comma-separated list of item slugs (max 200) |

#### Response

**Status 200**

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1500,
      "votes": 25,
      "avgRating": 4.2,
      "favorites": 12,
      "comments": 8
    },
    "another-tool": {
      "views": 800,
      "votes": 10,
      "avgRating": 3.8,
      "favorites": 5,
      "comments": 3
    }
  }
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Missing `slugs` parameter or more than 200 slugs |

#### curl Example

```bash
curl -s "http://localhost:3000/api/items/engagement?slugs=awesome-tool,another-tool,third-tool"
```

---

### ציוני פופולריות (ניפוי באגים)

נקודת קצה של ניפוי באגים שמחזירה פריטים ממוינים לפי ציון הפופולריות המחושב שלהם עם פירוט מפורט של גורמי הניקוד.

|רכוש|ערך|
|----------|-------|
|**שיטה**|`GET`|
|**נתיב**|`/api/items/popularity-scores`|
|**אישור**|אין (ציבורי)|
|**שמירה במטמון**|`force-dynamic`|
|**מקור**|`items/popularity-scores/route.ts`|

#### פרמטרי שאילתה

|פרמטר|הקלד|חובה|ברירת מחדל|תיאור|
|-----------|------|----------|---------|-------------|
|`limit`|`integer`|לא| `20` |מספר פריטים להחזרה (מקסימום 100)|
|`locale`|`string`|לא|`"en"`|שפה לפריטים|

#### תגובה

**סטטוס 200**

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Tool",
      "slug": "top-tool",
      "featured": true,
      "score": 15234,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 2500,
        "votes": 1200,
        "rating": 2100,
        "favorites": 900,
        "comments": 234,
        "recency": 300
      },
      "engagement": {
        "views": 5000,
        "votes": 50,
        "avgRating": 4.2,
        "favorites": 30,
        "comments": 15
      },
      "ageInDays": 15
    }
  ]
}
```

#### אלגוריתם ניקוד

ציון הפופולריות משתמש בקנה מידה לוגריתמי כדי למנוע מהחריגים לשלוט:

|פקטור|משקל|נוסחה|
|--------|--------|---------|
|דחיפה מומלצת| 10000 |בונוס שטוח עבור פריטים נבחרים|
|צפיות| 1000 |`log10(views + 1) * 1000`|
|הצבעות| 1200 |`log10(max(votes, 0) + 1) * 1200`|
|דירוג ממוצע| 500 |`avgRating * 500`|
|מועדפים| 1100 |`log10(favorites + 1) * 1100`|
|הערות| 1000 |`log10(comments + 1) * 1000`|
|עדכניות|עד 1000|בונוס דעיכה עבור פריטים מתחת לגיל 180 יום|

פריטים ללא נתוני מעורבות מקבלים ציון היוריסטי קטן המבוסס על איכות מטא נתונים (ספירת תגים, אורך שם, נוכחות אייקונים, קוד קידום).

#### תלתל דוגמה

```bash
curl -s "http://localhost:3000/api/items/popularity-scores?limit=10&locale=en"
```

---

## TypeScript Usage

```typescript
// Fetch comments for an item
const commentsRes = await fetch(`/api/items/${slug}/comments`);
const { comments } = await commentsRes.json();

// Post a comment
const newComment = await fetch(`/api/items/${slug}/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Great tool!', rating: 5 }),
}).then(r => r.json());

// Upvote an item
const voteRes = await fetch(`/api/items/${slug}/votes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'up' }),
}).then(r => r.json());
console.log(`New vote count: ${voteRes.count}`);

// Record a view
await fetch(`/api/items/${slug}/views`, { method: 'POST' });

// Batch fetch engagement for multiple items
const slugList = ['tool-a', 'tool-b', 'tool-c'].join(',');
const { metrics } = await fetch(`/api/items/engagement?slugs=${slugList}`).then(r => r.json());

// Get rating stats
const { averageRating, totalRatings } = await fetch(
  `/api/items/${slug}/comments/rating`
).then(r => r.json());
```

## Moderation Integration

Several endpoints in the Items API integrate with the moderation system:

- **Commenting:** The `POST /api/items/{slug}/comments` endpoint checks if the user is blocked (suspended or banned) before allowing comment creation.
- **Voting:** The `POST /api/items/{slug}/votes` endpoint performs the same block check.
- Blocked users receive a `403` response with a human-readable message explaining their status.

The block check uses `isUserBlocked()` and `getBlockReasonMessage()` from `@/lib/db/queries/moderation.queries`.
