---
id: engagement-services
title: Engagement & Moderation Services
sidebar_label: Engagement & Moderation
sidebar_position: 2
---

# Engagement & Moderation Services

The engagement and moderation services handle user interaction tracking, content popularity scoring, content moderation workflows, and survey management. These services bridge the gap between raw database metrics and meaningful business logic.

## Engagement Service

**File:** `lib/services/engagement.service.ts`

The engagement service calculates true popularity scores using real engagement metrics with logarithmic scaling designed to handle millions of interactions.

### ItemWithEngagement Type

```typescript
interface ItemWithEngagement extends ItemData {
  engagement?: ItemEngagementMetrics;
}
```

The `ItemEngagementMetrics` type (from `lib/db/queries/engagement.queries.ts`) provides:

| Metric | Type | Description |
|--------|------|-------------|
| `views` | `number` | Total page views |
| `votes` | `number` | Net vote count (upvotes minus downvotes) |
| `avgRating` | `number` | Average star rating (0-5) |
| `favorites` | `number` | Number of times favorited |
| `comments` | `number` | Total comments |

### Logarithmic Scaling

The scoring system uses `log10` scaling to handle large metric ranges gracefully:

```typescript
function logScale(value: number, weight: number = 1000): number {
  if (value <= 0) return 0;
  return Math.log10(value + 1) * weight;
}
```

This ensures meaningful differentiation across all scales:

| Raw Value | Log Score (weight=1000) |
|-----------|------------------------|
| 1 | 301 |
| 10 | 1,041 |
| 100 | 2,004 |
| 1,000 | 3,000 |
| 1,000,000 | 6,000 |

### Popularity Score Calculation

The `calculatePopularityScore()` function combines multiple engagement signals:

```typescript
export function calculatePopularityScore(item: ItemWithEngagement): number {
  let score = 0;

  // Featured items get massive boost
  if (item.featured) score += 10000;

  if (engagement) {
    score += logScale(engagement.views, 1000);       // Views
    score += logScale(Math.max(engagement.votes, 0), 1200);  // Votes
    score += engagement.avgRating * 500;              // Rating (linear)
    score += logScale(engagement.favorites, 1100);    // Favorites
    score += logScale(engagement.comments, 1000);     // Comments
  }

  // Recency bonus (0-1750 points, decays over time)
  score += recencyScore;

  return score;
}
```

### Score Component Weights

| Component | Scaling | Weight | Max at 1M | Description |
|-----------|---------|--------|-----------|-------------|
| Featured | Flat | 10,000 | 10,000 | Base boost for featured items |
| Views | Logarithmic | 1,000 | ~6,000 | Page view count |
| Votes | Logarithmic | 1,200 | ~7,200 | Net positive votes (higher weight for active engagement) |
| Rating | Linear | 500/star | 2,500 | Average rating (already bounded 0-5) |
| Favorites | Logarithmic | 1,100 | ~6,600 | Strong interest signal |
| Comments | Logarithmic | 1,000 | ~6,000 | Discussion indicator |
| Recency | Linear decay | - | 1,750 | Newer items get visibility boost |

### Recency Scoring

Items receive a time-based bonus that decays linearly over 30 days:

```typescript
const ageInDays = (now - itemTime) / (1000 * 60 * 60 * 24);
// Items within last 30 days get 0-1000 points (linear decay)
```

Items older than 30 days receive no recency bonus, while newly created or updated items receive the maximum boost.

## Moderation Service

**File:** `lib/services/moderation.service.ts`

The moderation service handles content removal, user warnings, suspensions, and bans in response to reported content.

### Dependencies

The moderation service integrates with multiple modules:

```typescript
import { createModerationHistory, incrementWarningCount, suspendUser, banUser } from 'moderation.queries';
import { deleteComment, getCommentById } from 'comment.queries';
import { ItemRepository } from 'item.repository';
import { EmailNotificationService } from 'email-notification.service';
```

### Content Owner Resolution

The `getContentOwner()` function identifies who authored reported content:

```typescript
async function getContentOwner(
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<ContentOwnerResult> {
  if (contentType === ReportContentType.COMMENT) {
    const comment = await getCommentById(contentId);
    return { success: true, userId: comment.userId };
  }
  if (contentType === ReportContentType.ITEM) {
    const item = await itemRepository.findById(contentId);
    return { success: true, userId: item.submitted_by };
  }
}
```

### Moderation Actions

#### Content Removal

The `removeContent()` function handles deletion of reported comments and items:

```typescript
async function removeContent(
  contentType: ReportContentTypeValues,
  contentId: string,
  reportId: string,
  adminId: string
): Promise<ModerationResult>
```

The removal flow:

```
1. Get content owner (for audit trail)
2. Delete content:
   - Comments: Soft delete via deleteComment()
   - Items: Delete from Git repository via ItemRepository.delete()
3. Create moderation history record
4. Send email notification to content owner
5. Return result
```

#### Email Notifications

When content is removed, the owner receives an email via `EmailNotificationService.sendContentRemovedEmail()`:

```typescript
EmailNotificationService.sendContentRemovedEmail(
  user.email,
  'comment',  // or 'item'
  reason
).catch((err) => console.error('Failed to send content removed email:', err));
```

Email sending is fire-and-forget (`.catch()` prevents unhandled rejections) to avoid blocking the moderation action.

### Moderation History

Every moderation action is recorded in the database:

```typescript
await createModerationHistory({
  userId: ownerResult.userId,
  action: ModerationAction.CONTENT_REMOVED,
  reason: 'Content removed due to report violation',
  reportId,
  performedBy: adminId,
  contentType,
  contentId,
  details: { itemName: item.name, itemSlug: item.slug }
});
```

### Moderation Actions Enum

| Action | Description |
|--------|-------------|
| `CONTENT_REMOVED` | Comment or item was deleted |
| `WARNING_ISSUED` | Warning sent to user |
| `USER_SUSPENDED` | Temporary account suspension |
| `USER_BANNED` | Permanent account ban |

### User Escalation

The moderation service supports escalating actions against repeat offenders:

```typescript
// Increment warning count
await incrementWarningCount(userId);

// Suspend user (temporary)
await suspendUser(userId, duration);

// Ban user (permanent)
await banUser(userId);
```

## Survey Service

**File:** `lib/services/survey.service.ts`

The `SurveyService` is a server-side only service that handles survey CRUD operations and response collection.

### Usage Context

```typescript
// Server-side only - import guard
import 'server-only';  // (implied by usage pattern)

// API Routes and Server Components only
// Client Components should use surveyApiClient from lib/api/survey-api.client
```

### Standard CRUD Methods

| Method | Description |
|--------|-------------|
| `create(data)` | Create new survey with auto-generated slug |
| `getOne(id)` | Get survey by ID |
| `getBySlug(slug)` | Get survey by URL slug |
| `getMany(filters)` | Get surveys with filtering and pagination |
| `update(id, data)` | Update survey by ID |
| `delete(id)` | Delete survey by ID |

### Survey-Specific Methods

| Method | Description |
|--------|-------------|
| `submitResponse(surveyId, data)` | Submit a survey response |
| `getResponses(surveyId, filters)` | Get responses for a survey |
| `getResponseById(responseId)` | Get a single response |

### Slug Generation

Surveys auto-generate URL-friendly slugs from titles, with uniqueness checks:

```typescript
async create(data: CreateSurveyData): Promise<Survey> {
  const slug = this.generateSlug(data.title);
  const existingSurvey = await queries.getSurveyBySlug(slug);
  const finalSlug = existingSurvey ? await this.ensureUniqueSlug(slug) : slug;
  // ...
}
```

### Survey Lifecycle

| Status | Description |
|--------|-------------|
| `draft` | Survey is being created, not visible to users |
| `published` | Survey is live and accepting responses |
| `closed` | Survey is no longer accepting responses |

The `publishedAt` and `closedAt` timestamps are set automatically when the status changes.

## Item Audit Service

**File:** `lib/services/item-audit.service.ts`

Tracks all changes made to items for accountability and history viewing. The audit trail is accessible via the `/api/admin/items/[id]/history` endpoint.
