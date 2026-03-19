---
id: queries
title: Database Queries Reference
sidebar_label: Queries
sidebar_position: 2
---

# Database Queries Reference

The `lib/db/queries/` directory contains 23+ query modules organized by domain. Each module encapsulates Drizzle ORM queries for a specific feature area, following the Single Responsibility Principle.

## Module Overview

All query modules are barrel-exported from `lib/db/queries/index.ts` for convenient importing:

```typescript
import { getUser, getUserByEmail } from '@/lib/db/queries';
```

## Query Modules

### activity.queries.ts

Activity logging and retrieval for the audit trail system.

**Key Functions:**
- Log user activities (sign-in, sign-up, account changes)
- Query activity history by user or date range

### auth.queries.ts

Authentication-related database operations.

**Key Functions:**
- Find user by email for credential authentication
- Create and verify password reset tokens
- Manage verification tokens

### client.queries.ts

The largest query module (37KB), handling all client-facing operations.

**Key Functions:**
- Client profile CRUD operations
- Client item submissions and management
- Client dashboard data aggregation
- Search and filter client data
- Paginated listing queries

### comment.queries.ts

Comment system operations.

**Key Functions:**
- Create, update, and soft-delete comments
- Fetch comments by item with pagination
- Comment moderation queries (admin)
- Rating aggregation

### company.queries.ts

Company management queries.

**Key Functions:**
- Company CRUD operations
- Company search and filtering
- Item-company association management
- Company statistics and analytics

### dashboard.queries.ts

Dashboard data aggregation for both admin and client dashboards.

**Key Functions:**
- Admin dashboard statistics (total users, items, revenue)
- Client dashboard statistics (submissions, views, engagement)
- Time-series data for charts
- Activity summaries

### engagement.queries.ts

Aggregated engagement metrics across views, votes, favorites, and comments.

**Key Functions:**
- Get engagement scores for items
- Aggregate view counts
- Calculate popularity metrics
- Engagement rankings

### integration-mapping.queries.ts

CRM integration mapping operations.

**Key Functions:**
- Create and update integration mappings
- Look up CRM IDs from Ever IDs and vice versa
- Track sync timestamps and version hashes
- Bulk mapping operations

### item.queries.ts

Core item queries (items are stored in Git, but metadata is tracked in the database).

**Key Functions:**
- Item metadata operations
- Item view tracking
- Item engagement data

### item-audit.queries.ts

Item audit log operations.

**Key Functions:**
- Record item creation, update, deletion, and review actions
- Query audit history for specific items
- Filter audit logs by action type, performer, or date range

### item-view.queries.ts

Item view tracking and analytics.

**Key Functions:**
- Record unique daily views (deduplicated by viewer ID and date)
- Query view counts by item and date range
- View analytics aggregation

### location-index.queries.ts

Location-based search and indexing.

**Key Functions:**
- Geospatial queries for nearby items
- Location index management
- Distance calculations
- Location-based search with filters

### moderation.queries.ts

Content moderation system.

**Key Functions:**
- Create and manage content reports
- Update report status and resolution
- Record moderation actions
- Moderation statistics and queue management

### newsletter.queries.ts

Newsletter subscription management.

**Key Functions:**
- Subscribe and unsubscribe operations
- Check subscription status
- List active subscribers
- Track email send history

### payment.queries.ts

Payment-related database operations.

**Key Functions:**
- Payment provider management
- Payment account linking
- Transaction recording
- Payment history queries

### report.queries.ts

Content reporting system queries.

**Key Functions:**
- Create reports (item or comment)
- List reports with filters and pagination
- Update report status
- Report analytics

### subscription.queries.ts

Subscription lifecycle management (17KB).

**Key Functions:**
- Create and update subscriptions
- Subscription status transitions
- Subscription history recording
- Find subscriptions by user or provider ID
- Renewal and cancellation operations
- Subscription analytics

### survey.queries.ts

Survey system operations.

**Key Functions:**
- Survey CRUD operations
- Survey response recording
- Response aggregation and analytics
- Survey status management (draft, published, closed)

### user.queries.ts

User management queries.

**Key Functions:**
- User CRUD operations
- User search and filtering
- User role management
- Account deletion (soft delete)

### vote.queries.ts

Voting system operations.

**Key Functions:**
- Create, update, and remove votes
- Check existing votes for a user-item pair
- Aggregate vote counts by item
- Vote type toggling (upvote/downvote)

## Shared Utilities

### types.ts

Shared TypeScript types used across query modules:

```typescript
// Common query parameter types
export interface PaginationParams {
  page: number;
  limit: number;
}
```

### utils.ts

Shared utility functions for query building:

- Pagination helpers (offset calculation, result formatting)
- Common filter builders
- SQL fragment helpers

## Query Patterns

### Standard Query Pattern

All query modules follow a consistent pattern:

```typescript
import { db } from '../drizzle';
import { eq, desc, and, sql } from 'drizzle-orm';
import { tableName } from '../schema';

export async function getItemById(id: string) {
  const result = await db
    .select()
    .from(tableName)
    .where(eq(tableName.id, id))
    .limit(1);
  return result[0] || null;
}
```

### Paginated Queries

Many modules implement paginated queries:

```typescript
export async function getItems(page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db.select().from(tableName)
      .orderBy(desc(tableName.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(tableName),
  ]);
  return {
    items,
    total: Number(countResult[0].count),
    page,
    limit,
  };
}
```

### Aggregation Queries

The engagement and dashboard modules use SQL aggregation:

```typescript
export async function getEngagementScore(itemId: string) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(v.vote_count, 0) as votes,
      COALESCE(c.comment_count, 0) as comments,
      COALESCE(f.favorite_count, 0) as favorites,
      COALESCE(iv.view_count, 0) as views
    FROM ...
  `);
  return result;
}
```

## Import Convention

Import query functions through the barrel export:

```typescript
// Preferred: import from barrel
import { getUser, createSubscription, getVotesByItem } from '@/lib/db/queries';

// Also valid: import from specific module
import { getUser } from '@/lib/db/queries/user.queries';
```
