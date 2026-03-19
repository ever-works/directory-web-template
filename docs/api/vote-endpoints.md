---
id: vote-endpoints
title: Vote Endpoints
sidebar_label: Votes
sidebar_position: 25
---

# Vote Endpoints

The voting system provides endpoints for upvoting and downvoting items. Votes use a net-score model where the count represents upvotes minus downvotes. Public endpoints return vote counts while authenticated endpoints allow casting, updating, and removing votes. Blocked users are prevented from voting.

## Overview

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/items/[slug]/votes` | GET | Public | Get vote count and user vote status |
| `/api/items/[slug]/votes` | POST | User | Cast or update a vote |
| `/api/items/[slug]/votes` | DELETE | User | Remove a vote |
| `/api/items/[slug]/votes/count` | GET | Public | Get net vote count only |
| `/api/items/[slug]/votes/status` | GET | User | Get full vote record for user |

## Combined Vote Endpoint

### Get Vote Information

```
GET /api/items/[slug]/votes
```

Returns the net vote count for an item and the current user's vote status if authenticated. No authentication is required, but authenticated users receive their vote status in the response.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `slug` | string | Item slug |

**Success Response (200):**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Always `true` on success |
| `count` | integer | Net vote count (upvotes minus downvotes) |
| `userVote` | string or null | `"up"`, `"down"`, or `null` if unauthenticated or no vote |

For unauthenticated users, `userVote` is always `null`. The `count` can be negative if there are more downvotes than upvotes.

**Source:** `template/app/api/items/[slug]/votes/route.ts`

### Cast or Update Vote

```
POST /api/items/[slug]/votes
```

Casts a new vote or replaces an existing vote on an item. If the user already has a vote, the previous vote is deleted before the new one is created. This means changing from upvote to downvote (or vice versa) is a single operation.

**Authentication:** Required

**Request Body:**

```json
{
  "type": "up"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | `"up"` for upvote, `"down"` for downvote |

**Success Response (200):**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

The response returns the updated net vote count after the vote is applied.

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | Invalid vote type (must be `"up"` or `"down"`) |
| 401 | Not authenticated |
| 403 | User is suspended or banned |
| 404 | Client profile not found |

**Source:** `template/app/api/items/[slug]/votes/route.ts`

### Remove Vote

```
DELETE /api/items/[slug]/votes
```

Removes the current user's vote from an item. If no vote exists, the operation completes successfully without error (idempotent). After removal, `userVote` is `null`.

**Authentication:** Required

**Success Response (200):**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

| Status | Condition |
|---|---|
| 401 | Not authenticated |
| 404 | Client profile not found |

**Source:** `template/app/api/items/[slug]/votes/route.ts`

## Vote Count Endpoint

### Get Vote Count

```
GET /api/items/[slug]/votes/count
```

Returns only the net vote count for an item. This is a lightweight public endpoint optimized for quick vote count retrieval without user-specific vote status.

**Success Response (200):**

```json
{
  "success": true,
  "count": 15
}
```

The count can be positive, negative, or zero depending on the balance of upvotes and downvotes.

**Source:** `template/app/api/items/[slug]/votes/count/route.ts`

## Vote Status Endpoint

### Get User Vote Status

```
GET /api/items/[slug]/votes/status
```

Returns the full vote record for the authenticated user on a specific item. Returns `null` if the user has not voted on the item.

**Authentication:** Required

**Success Response (200) -- User Has Voted:**

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

**Success Response (200) -- No Vote:**

```json
null
```

Note that this endpoint returns the raw database `voteType` values (`"UPVOTE"` or `"DOWNVOTE"`) rather than the simplified `"up"` / `"down"` format used by the combined endpoint.

| Status | Condition |
|---|---|
| 401 | Not authenticated |
| 404 | Client profile not found |

**Source:** `template/app/api/items/[slug]/votes/status/route.ts`

## Key Implementation Details

- **Net Score:** Vote count is calculated as upvotes minus downvotes. A negative count indicates more downvotes than upvotes.
- **Vote Replacement:** When a user changes their vote type, the existing vote is deleted and a new one is created. There is no in-place update.
- **Blocked User Prevention:** The `isUserBlocked()` check on the POST endpoint prevents suspended or banned users from voting. The block check is only enforced on vote creation, not on vote removal.
- **VoteType Enum:** The database stores votes as `VoteType.UPVOTE` and `VoteType.DOWNVOTE`. The API translates these to `"up"` and `"down"` for external consumers.
- **Idempotent Delete:** Deleting a vote that does not exist still returns a 200 response with the current count and `userVote: null`.
