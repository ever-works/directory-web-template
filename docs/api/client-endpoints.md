---
id: client-endpoints
title: Client API Endpoints
sidebar_label: Client Endpoints
sidebar_position: 2
---

# Client API Endpoints

Client-facing API endpoints serve authenticated end-users (non-admin). These routes handle the client dashboard, item submissions, favorites management, and public item interactions such as comments, votes, and views.

## Client Dashboard & Items (`/api/client`)

All `/api/client/*` routes require an authenticated session with a valid `clientProfileId`.

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/client/dashboard/stats` | Client dashboard statistics (items count, views, engagement) |

### Client Items

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/client/items` | List items submitted by the current client |
| `POST` | `/api/client/items` | Submit a new item for review |
| `GET` | `/api/client/items/stats` | Client item statistics (published, pending, rejected) |
| `GET` | `/api/client/items/coordinates` | Get coordinates for client's items |
| `GET` | `/api/client/items/[id]` | Get item details |
| `PUT` | `/api/client/items/[id]` | Update own item |
| `DELETE` | `/api/client/items/[id]` | Delete own item (soft delete) |
| `POST` | `/api/client/items/[id]/restore` | Restore a soft-deleted item |

### Geo Stats

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/client/geo-stats` | Geographic statistics for client items |

## Public Item Interactions (`/api/items`)

These endpoints handle public-facing item features. Some require authentication (e.g., voting), while others are fully public (e.g., viewing).

### Comments

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/items/[slug]/comments` | List comments for an item | Public |
| `POST` | `/api/items/[slug]/comments` | Add a comment | Required |
| `GET` | `/api/items/[slug]/comments/[commentId]` | Get comment details | Public |
| `PUT` | `/api/items/[slug]/comments/[commentId]` | Update own comment | Required |
| `DELETE` | `/api/items/[slug]/comments/[commentId]` | Delete own comment | Required |

### Comment Ratings

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/items/[slug]/comments/rating` | Get rating summary | Public |
| `POST` | `/api/items/[slug]/comments/rating` | Submit a rating | Required |
| `GET` | `/api/items/[slug]/comments/rating/[commentId]` | Get rating for a comment | Public |

### Votes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/items/[slug]/votes/count` | Get vote count | Public |
| `GET` | `/api/items/[slug]/votes/status` | Get current user's vote status | Required |
| `POST` | `/api/items/[slug]/votes` | Vote on an item (upvote/downvote) | Required |

### Views

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/items/[slug]/views` | Record a page view | Public |

### Engagement & Popularity

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/items/engagement` | Get engagement metrics for items | Public |
| `GET` | `/api/items/popularity-scores` | Get calculated popularity scores | Public |

### Company

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/items/[slug]/company` | Get company info for an item | Public |

## Favorites (`/api/favorites`)

Manage user's favorite items. All favorites endpoints require authentication.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/favorites` | List current user's favorite items |
| `POST` | `/api/favorites/[itemSlug]` | Toggle favorite status for an item |
| `DELETE` | `/api/favorites/[itemSlug]` | Remove item from favorites |

## User Profile (`/api/user`)

User profile and subscription management endpoints.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/user/profile/location` | Get user's detected location |
| `GET` | `/api/user/currency` | Get user's detected/preferred currency |
| `GET` | `/api/user/plan-status` | Get current subscription plan status |
| `GET` | `/api/user/subscription` | Get subscription details |
| `GET` | `/api/user/payments` | Get payment history |

## Current User (`/api/current-user`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/current-user` | Get authenticated user session data |

## Sponsor Ads - User (`/api/sponsor-ads/user`)

Endpoints for users managing their own sponsored advertisements.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sponsor-ads/user` | List user's sponsor ads |
| `GET` | `/api/sponsor-ads/user/stats` | User ad performance statistics |
| `GET` | `/api/sponsor-ads/user/[id]` | Get ad details |
| `PUT` | `/api/sponsor-ads/user/[id]` | Update own ad |
| `POST` | `/api/sponsor-ads/user/[id]/cancel` | Cancel own ad |
| `POST` | `/api/sponsor-ads/user/[id]/renew` | Renew expired ad |

## Surveys (`/api/surveys`)

Survey management and response collection.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/surveys` | List published surveys | Public |
| `GET` | `/api/surveys/[surveyId]` | Get survey details | Public |
| `POST` | `/api/surveys/[surveyId]/responses` | Submit a survey response | Public |
| `GET` | `/api/surveys/responses/[responseId]` | Get response details | Required |

## Reports (`/api/reports`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/reports` | Submit a content report | Required |

## Public Data Endpoints

These endpoints require no authentication:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/categories/exists` | Check if a category slug exists |
| `GET` | `/api/collections/exists` | Check if a collection slug exists |
| `GET` | `/api/featured-items` | List featured items |
| `GET` | `/api/sponsor-ads` | Get active sponsor ads for display |
| `POST` | `/api/sponsor-ads/checkout` | Initiate sponsor ad checkout |

## Pagination Patterns

Client-facing list endpoints support the standard pagination parameters:

```
GET /api/client/items?page=1&limit=10&sort=createdAt&order=desc
GET /api/items/[slug]/comments?page=1&limit=20
GET /api/favorites?page=1&limit=50
```

Responses include pagination metadata:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```
