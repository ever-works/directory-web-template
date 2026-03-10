---
id: report-service
title: Report Service
sidebar_label: Report Service
sidebar_position: 35
---

# Report Service

The report system enables users to flag inappropriate content (items or comments) for admin review. It tracks the full lifecycle from submission through review to resolution, with support for multiple report reasons, resolution actions, and statistics.

## Architecture Overview

| Module | Path | Purpose |
|--------|------|---------|
| Queries | `lib/db/queries/report.queries.ts` | Database CRUD for reports |
| Schema | `lib/db/schema.ts` | Report, moderation history tables and enums |
| Moderation | `lib/db/queries/moderation.queries.ts` | Moderation history tracking |

## Schema Enums

The report system uses four enum sets defined in the schema:

### Content Types

```ts
export const ReportContentType = {
  ITEM: 'item',
  COMMENT: 'comment',
} as const;
```

### Report Reasons

```ts
export const ReportReason = {
  SPAM: 'spam',
  HARASSMENT: 'harassment',
  INAPPROPRIATE: 'inappropriate',
  OTHER: 'other',
} as const;
```

### Report Status

```ts
export const ReportStatus = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;
```

### Resolution Actions

```ts
export const ReportResolution = {
  CONTENT_REMOVED: 'content_removed',
  USER_WARNED: 'user_warned',
  USER_SUSPENDED: 'user_suspended',
  USER_BANNED: 'user_banned',
  NO_ACTION: 'no_action',
} as const;
```

## Database Schema

### reports

| Column | Type | Description |
|--------|------|-------------|
| `id` | `text` (UUID) | Primary key |
| `content_type` | `text` | `item` or `comment` |
| `content_id` | `text` | ID of the reported content |
| `reason` | `text` | `spam`, `harassment`, `inappropriate`, or `other` |
| `details` | `text` | Optional free-text details |
| `status` | `text` | `pending`, `reviewed`, `resolved`, or `dismissed` |
| `resolution` | `text` | Resolution action taken (nullable) |
| `reported_by` | `text` | FK to `client_profiles.id` (cascade delete) |
| `reviewed_by` | `text` | FK to `users.id` (set null on delete) |
| `review_note` | `text` | Admin review notes |
| `created_at` | `timestamp` | Submission time |
| `updated_at` | `timestamp` | Last modification |
| `reviewed_at` | `timestamp` | When admin reviewed |
| `resolved_at` | `timestamp` | When report was resolved |

Indexes cover `content_type`, `content_id`, `status`, `reported_by`, `created_at`, and a composite index on `(content_type, content_id)`.

## Report Queries

### Creating a Report

```ts
export async function createReport(data: {
  contentType: ReportContentTypeValues;
  contentId: string;
  reason: ReportReasonValues;
  details?: string;
  reportedBy: string;
}): Promise<Report> {
  const insertData: NewReport = {
    contentType: data.contentType,
    contentId: data.contentId,
    reason: data.reason,
    details: data.details || null,
    reportedBy: data.reportedBy,
    status: ReportStatus.PENDING,
  };
  const [report] = await db.insert(reports).values(insertData).returning();
  return report;
}
```

### Fetching a Report with Reporter Info

```ts
export async function getReportById(
  id: string
): Promise<ReportWithReporter | null> {
  const result = await db
    .select({
      // ... all report fields
      reporter: {
        id: clientProfiles.id,
        name: clientProfiles.name,
        email: clientProfiles.email,
        avatar: clientProfiles.avatar,
      },
    })
    .from(reports)
    .leftJoin(clientProfiles, eq(reports.reportedBy, clientProfiles.id))
    .where(eq(reports.id, id))
    .limit(1);
  // ...
}
```

### Listing Reports with Pagination and Filters

The `getReports` function supports pagination, search, and filtering by status, content type, and reason:

```ts
export async function getReports(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReportStatusValues;
  contentType?: ReportContentTypeValues;
  reason?: ReportReasonValues;
}): Promise<{
  reports: ReportWithReporter[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}>
```

The search parameter performs ILIKE matching across `content_id`, `details`, reporter `name`, and reporter `email`.

### Updating Report Status

```ts
export async function updateReport(
  id: string,
  data: {
    status?: ReportStatusValues;
    resolution?: ReportResolutionValues;
    reviewNote?: string;
    reviewedBy?: string;
  }
): Promise<Report | null>
```

The update function automatically sets timestamps based on state transitions:

- `reviewedAt` is set when status changes from `pending`
- `resolvedAt` is set when status becomes `resolved` or `dismissed`

### Duplicate Detection

Before creating a report, check if the user already reported the same content:

```ts
export async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean> {
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.reportedBy, reportedBy),
        eq(reports.contentType, contentType),
        eq(reports.contentId, contentId)
      )
    )
    .limit(1);
  return !!existing;
}
```

### Report Statistics

```ts
export async function getReportStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byContentType: Record<string, number>;
  byReason: Record<string, number>;
  pendingCount: number;
  resolvedCount: number;
}>
```

Statistics are broken down by status, content type, and reason using `GROUP BY` queries.

## Report Lifecycle

```
User submits report
       |
       v
   [PENDING] -----> Admin reviews
       |                |
       v                v
  [REVIEWED] -----> Admin resolves
       |                |
       v                v
  [RESOLVED]      [DISMISSED]
```

1. **User submits** -- `createReport()` with status `pending`
2. **Admin reviews** -- `updateReport()` sets status to `reviewed`, records `reviewedBy` and `reviewedAt`
3. **Admin resolves** -- `updateReport()` sets status to `resolved` or `dismissed`, records resolution action and `resolvedAt`

## Resolution Actions

When resolving a report, admins can choose from these actions:

| Resolution | Effect |
|-----------|--------|
| `content_removed` | The reported content is removed |
| `user_warned` | The offending user receives a warning |
| `user_suspended` | The user account is suspended |
| `user_banned` | The user account is permanently banned |
| `no_action` | Report is dismissed without action |

## Moderation History

Related moderation actions are tracked in the `moderation_history` table, which records warnings, suspensions, bans, and content removals along with the associated report ID and performing admin.

## Types

```ts
export type ReportWithReporter = Report & {
  reporter: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  reviewer: {
    id: string;
    email: string | null;
  } | null;
};
```

## Related Documentation

- [Reports & Moderation Feature](/template/features/reports-moderation) -- UI components
- [Moderation Service](/template/services/moderation-service) -- Moderation actions
- [Comment Service](/template/services/comment-service) -- Reportable comment content
