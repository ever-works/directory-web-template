---
id: items-api-endpoints-deep-dive
title: Items API Endpoints Deep Dive
sidebar_label: Items API Deep Dive
sidebar_position: 65
---

# Items API Endpoints Deep Dive

The Items API provides public-facing endpoints for interacting with items, including comments, votes, views tracking, company associations, and engagement metrics. These endpoints power the core user-facing features of the directory website.

**Source directory:** `template/app/api/items/`

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

### Unpublished items

The views route, the comment list and create routes, the rating statistics route and the vote read and cast routes answer only for a public item: approved (or with no status) and not soft-deleted, as on the item page. For a draft, pending, rejected or soft-deleted item they answer as for an unknown slug: `POST .../views`, `POST .../comments` and `POST .../votes` return 404 `{ "success": false, "error": "Item not found" }`, the comment list is empty, and the rating and vote reads return zero. Comments and votes left while an item was public stay in the database and reappear if the item is approved again. All of them call `findPublicItem` (`apps/web/lib/public-item.ts`), which reads the item through `fetchItem` (T-2853). `POST .../views` needs no session, and it checks for bots first: a request whose user agent looks like a bot gets 200 `{ "success": true, "counted": false, "reason": "bot" }` for any slug, so the 404 applies only to requests that pass bot detection. `POST .../comments` and `POST .../votes` need one: a request without a session gets 401 first, whatever the item. `DELETE .../votes` answers the item's net votes, so it answers only for a public item too: after the 401 for a request without a session, any other slug gets 404 `Item not found` and no vote is removed (T-2864). A vote left on an item that is no longer public can be taken back once the item is approved again.

The routes that show engagement totals do the same (T-2857): `GET /api/items/{slug}/activity` returns zero totals and `days` zero-filled entries, `GET .../votes/count` returns `{ "success": true, "count": 0 }`, and `GET /api/items/engagement` returns zeros for every slug that names no public item, as for an unknown slug, with no database query for it. The first two call `findPublicItem`; the batch route calls `findPublicItemSlugs` (same file), which keeps the slugs of the public listing (`fetchItems`, kept in memory), so it reads no item file per slug. Outside `next dev` that listing is kept in memory for up to 10 minutes, unless `invalidateContentCaches()` clears it first: a content sync does, and so do the admin item routes (create, update, delete, review and bulk, since T-2865) and the collection, category and tag admin routes. So the batch route follows an admin reject or delete at once; activity and votes/count read the item file and change at once too.

---

## Comments

### List Comments

Returns all comments for a specific item, including user profile information. A slug with no public item (unknown, draft, pending, rejected or soft-deleted) returns an empty list.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/{slug}/comments` |
| **Auth** | None (public) |
| **Source** | `items/[slug]/comments/route.ts` |

#### Response

**Status 200**

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
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

#### curl Example

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
| 404 | `Item not found`: no public item has this slug (unknown, draft, pending, rejected or soft-deleted); or `Client profile not found` |
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

### Update Comment

Updates a comment's content and/or rating. Only the comment author can update their comment.

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **Path** | `/api/items/{slug}/comments/{commentId}` |
| **Auth** | Session (comment owner) |
| **Source** | `items/[slug]/comments/[commentId]/route.ts` |

#### Request Body

At least one field must be provided:

```json
{
  "content": "Updated review text.",
  "rating": 4
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `content` | `string` | No | 1-1000 characters |
| `rating` | `integer` | No | 1-5 |

#### Response

**Status 200** -- Returns the updated comment with user information and an `editedAt` timestamp.

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

### Get Rating Statistics

Returns aggregated rating statistics for an item: average rating and total count. A slug with no public item (unknown, draft, pending, rejected or soft-deleted) returns `{ "averageRating": 0, "totalRatings": 0 }`.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/{slug}/comments/rating` |
| **Auth** | None (public) |
| **Source** | `items/[slug]/comments/rating/route.ts` |

#### Response

**Status 200**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

| Field | Type | Description |
|-------|------|-------------|
| `averageRating` | `number` | Average rating (0 if no ratings, max 5) |
| `totalRatings` | `number` | Total number of non-deleted comments with ratings |

#### curl Example

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

Returns one comment as the comments list of the item shows it: the same fields, with the author's public profile in `user`. It answers only for a comment the list shows: not soft-deleted, by an author whose account is active, on the item named by `slug`, and that item is public (approved or with no status, not soft-deleted). Any other comment answers 404 `{ "error": "Comment not found" }`: a comment its author deleted or a moderator removed, one asked for through another slug, and one on a draft, pending or rejected item, including comments left while the item was public (T-2856).

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

## Company Association

Admin-only endpoints to manage the relationship between items and companies. All three check the caller's admin role in the database with `checkAdminAuth()` (`lib/auth/admin-guard.ts`), not the session's `isAdmin` claim: a signed-out caller gets `401 Unauthorized` and a signed-in non-admin `403 Forbidden`, both as `{ "success": false, "error": ... }`.

### Get Item Company

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/{slug}/company` |
| **Auth** | Admin |
| **Source** | `items/[slug]/company/route.ts` |

#### Response

**Status 200** -- Company found.

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

**Status 200** -- No company assigned.

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

### Remove Company from Item

Removes the company association from an item. This operation is idempotent.

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/items/{slug}/company` |
| **Auth** | Admin |

#### Response

**Status 200**

```json
{
  "success": true,
  "deleted": true
}
```

#### curl Example

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
3. **Item validation** -- confirms a public item has this slug: an unknown, draft, pending, rejected or soft-deleted item returns 404, so the route tells nobody that an unpublished slug exists.
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

**Status 404** -- No public item has this slug (unknown, draft, pending, rejected or soft-deleted).

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

## Votes

### Get Vote Info

Returns the total vote count and the current user's vote status (if authenticated). A slug with no public item (unknown, draft, pending, rejected or soft-deleted) returns a count of 0 and `userVote: null`.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/{slug}/votes` |
| **Auth** | None (public; user status requires session) |
| **Source** | `items/[slug]/votes/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `count` | `number` | Net vote count (upvotes - downvotes) |
| `userVote` | `"up" \| "down" \| null` | User's vote (`null` if unauthenticated or no vote) |

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
| 404 | `Item not found`: no public item has this slug (unknown, draft, pending, rejected or soft-deleted); or `Client profile not found` |

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

### Remove Vote

Removes the current user's vote from an item.

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/items/{slug}/votes` |
| **Auth** | Session (user with client profile) |
| **Source** | `items/[slug]/votes/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

---

### Get Vote Count

A lightweight endpoint that returns only the vote count (no user status). A slug with no public item (unknown, draft, pending, rejected or soft-deleted) returns a count of 0.

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

### Get User Vote Status

Returns the full vote record for the authenticated user's vote on a specific item.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/{slug}/votes/status` |
| **Auth** | Session (user) |
| **Source** | `items/[slug]/votes/status/route.ts` |

#### Response

**Status 200** -- User has voted.

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

**Status 200** -- User has not voted.

```json
null
```

---

## Engagement Metrics

### Batch Engagement Metrics

Fetches engagement metrics (views, votes, ratings, favorites, comments) for multiple items in a single request. A slug with no public item (unknown, draft, pending, rejected or soft-deleted) gets all zeros and is not queried.

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

### Popularity Scores (Debug)

A debug endpoint that returns items sorted by their calculated popularity score with a detailed breakdown of scoring factors.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/popularity-scores` |
| **Auth** | None (public) |
| **Caching** | `force-dynamic` |
| **Source** | `items/popularity-scores/route.ts` |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | `integer` | No | `20` | Number of items to return (max 100) |
| `locale` | `string` | No | `"en"` | Language for items |

#### Response

**Status 200**

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

#### Scoring Algorithm

The popularity score uses logarithmic scaling to prevent outliers from dominating:

| Factor | Weight | Formula |
|--------|--------|---------|
| Featured boost | 10000 | Flat bonus for featured items |
| Views | 1000 | `log10(views + 1) * 1000` |
| Votes | 1200 | `log10(max(votes, 0) + 1) * 1200` |
| Average rating | 500 | `avgRating * 500` |
| Favorites | 1100 | `log10(favorites + 1) * 1100` |
| Comments | 1000 | `log10(comments + 1) * 1000` |
| Recency | up to 1000 | Decaying bonus for items under 180 days old |

Items without engagement data receive a small heuristic score based on metadata quality (tags count, name length, icon presence, promo code).

#### curl Example

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
