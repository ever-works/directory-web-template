---
id: reports-moderation
title: Reports & Content Moderation
sidebar_label: Reports & Moderation
sidebar_position: 4
---

# Reports & Content Moderation

The Ever Works template includes a content reporting and moderation system that enables users to flag inappropriate content and administrators to take action on reported items and comments.

## Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  User reports │────▶│  /api/reports   │────▶│  Database            │
│  content      │     │  (API Route)    │     │  (reports table)     │
└──────────────┘     └─────────────────┘     └─────────────────────┘
                                                       │
┌──────────────┐     ┌─────────────────┐              │
│  Admin review │────▶│  ModerationSvc  │◀─────────────┘
│  dashboard    │     │  (Actions)      │
└──────────────┘     └─────────────────┘
```

## Content Types

The system supports reporting two content types:

```typescript
enum ReportContentType {
  ITEM = 'item',
  COMMENT = 'comment',
}
```

## ModerationService

Located at `lib/services/moderation.service.ts`, the service provides moderation actions:

### Content Owner Resolution

```typescript
async function getContentOwner(
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<ContentOwnerResult>;
// Returns: { success: boolean, userId?: string, error?: string }
```

Resolves the author of reported content by looking up comments via `getCommentById()` or items via `ItemRepository.findById()`.

### Moderation Actions

| Action | Description | Effect |
|--------|-------------|--------|
| **Remove content** | Delete the reported item or comment | Content removed, history recorded |
| **Warn user** | Increment warning count | Warning counter incremented |
| **Suspend user** | Temporarily suspend account | Account access restricted |
| **Ban user** | Permanently ban account | Account permanently restricted |
| **Dismiss report** | Mark report as resolved without action | Report closed |

### Action Implementation

Each action creates a moderation history entry and may trigger email notifications:

```typescript
// Example: Remove content
async function removeContent(
  contentType: ReportContentTypeValues,
  contentId: string,
  reportId: string,
  adminId: string
): Promise<ModerationResult>;
```

The service delegates to:
- `deleteComment()` -- For comment removal
- `ItemRepository` -- For item removal
- `createModerationHistory()` -- For audit trail
- `incrementWarningCount()` -- For user warnings
- `suspendUserQuery()` / `banUserQuery()` -- For account actions
- `EmailNotificationService` -- For user notification emails

## Admin Hook

```typescript
import { useAdminReports } from '@/hooks/use-admin-reports';

const {
  reports,           // Report[]
  total, page, totalPages,
  isLoading, isSubmitting,
  resolveReport,     // (id, action, reason?) => Promise<boolean>
  dismissReport,     // (id, reason?) => Promise<boolean>
  deleteReport,      // (id) => Promise<boolean>
  refetch, refreshData,
} = useAdminReports({ page: 1, limit: 10 });
```

## Moderation Workflow

1. **User reports content** -- Selects a reason and submits via the report API
2. **Admin notification** -- `NotificationService.createItemReportedNotification()` or `createCommentReportedNotification()` alerts admins
3. **Admin reviews** -- Views report details in the admin dashboard
4. **Admin takes action** -- Chooses from: remove content, warn user, suspend, ban, or dismiss
5. **History recorded** -- `createModerationHistory()` logs the action with admin ID, timestamp, and reason
6. **User notified** -- Email notification sent to the content owner about the action taken

## Moderation Actions Enum

```typescript
enum ModerationAction {
  REMOVE_CONTENT = 'remove_content',
  WARN_USER = 'warn_user',
  SUSPEND_USER = 'suspend_user',
  BAN_USER = 'ban_user',
  DISMISS = 'dismiss',
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports` | Submit a new report |
| GET | `/api/admin/reports` | List reports (admin, paginated) |
| POST | `/api/admin/reports/:id/resolve` | Resolve a report with action |
| POST | `/api/admin/reports/:id/dismiss` | Dismiss a report |
| DELETE | `/api/admin/reports/:id` | Delete a report |

## Related Documentation

- [Notification System](./notifications.md) -- How report notifications are delivered
- [Voting & Comments](./voting-comments.md) -- Comment system that can be reported
