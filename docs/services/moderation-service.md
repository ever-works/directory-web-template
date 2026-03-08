---
id: moderation-service
title: Moderation Service
sidebar_label: Moderation Service
sidebar_position: 8
---

# Moderation Service

The template includes a content moderation system that enables administrators to take action on reported content and users. The service handles content removal, user warnings, suspensions, and bans, with full audit logging and email notifications.

## Overview

The moderation service is implemented as a set of standalone async functions (not a class) that coordinate between the database, the Git-based content repository, and the email notification system.

```
lib/services/
  moderation.service.ts              # Core moderation actions
  email-notification.service.ts      # Email notifications for moderation (see Notification Service docs)
```

## Moderation Actions

Four primary actions are available to administrators:

| Action | Function | Target | Effect |
|--------|----------|--------|--------|
| Remove Content | `removeContent()` | Item or Comment | Deletes the content from the platform |
| Warn User | `warnUser()` | User | Increments warning counter, sends warning email |
| Suspend User | `suspendUser()` | User | Sets user status to `suspended` |
| Ban User | `banUser()` | User | Sets user status to `banned` (permanent) |

### Action Flow

Every moderation action follows the same pattern:

1. **Validate** -- Check that the target (user/content) exists and is in a valid state
2. **Execute** -- Perform the database or repository operation
3. **Log** -- Create a moderation history record with full audit details
4. **Notify** -- Send an email notification to the affected user (non-blocking)

### Result Type

All moderation functions return a consistent result type:

```typescript
interface ModerationResult {
  success: boolean;
  message: string;
  error?: string;  // Error code: NOT_FOUND, ALREADY_BANNED, ALREADY_SUSPENDED, INVALID_TYPE
}
```

## Content Removal

The `removeContent()` function handles deletion of both items and comments based on the content type:

```typescript
import { removeContent } from '@/lib/services/moderation.service';

const result = await removeContent(
  'comment',           // contentType: 'item' | 'comment'
  'comment-id-123',    // contentId
  'report-id-456',     // reportId (the associated report)
  'admin-user-id'      // adminId (performing the action)
);
```

### Content Type Handling

| Content Type | Deletion Method | Additional Data Logged |
|-------------|----------------|----------------------|
| `comment` | Soft delete via `deleteComment()` | None |
| `item` | Hard delete via `ItemRepository.delete()` | Item name and slug |

Before deletion, the service resolves the content owner via `getContentOwner()` so that the moderation history record and email notification can be attributed to the correct user.

### Content Owner Resolution

```typescript
import { getContentOwner } from '@/lib/services/moderation.service';

const owner = await getContentOwner('item', 'item-id-123');
// { success: true, userId: 'user-456' }
// or { success: false, error: 'Item not found' }
```

For comments, the owner is the `userId` field on the comment record. For items, the owner is the `submitted_by` field from the item data.

## User Warning

Warnings are the lightest moderation action. They increment a counter and notify the user but do not restrict access.

```typescript
import { warnUser } from '@/lib/services/moderation.service';

const result = await warnUser(
  'user-id-123',       // userId (client profile ID)
  'Inappropriate content', // reason
  'report-id-456',     // reportId
  'admin-user-id'      // adminId
);
// { success: true, message: 'User warned successfully. Total warnings: 2' }
```

### Validation Guards

| Check | Error Code |
|-------|-----------|
| User does not exist | `NOT_FOUND` |
| User is already banned | `ALREADY_BANNED` |

The warning count is stored on the client profile and incremented atomically via `incrementWarningCount()`.

## User Suspension

Suspension restricts the user from submitting items, posting comments, and voting while allowing them to view content.

```typescript
import { suspendUser } from '@/lib/services/moderation.service';

const result = await suspendUser(
  'user-id-123',
  'Repeated policy violations',
  'report-id-456',
  'admin-user-id'
);
```

### Validation Guards

| Check | Error Code |
|-------|-----------|
| User does not exist | `NOT_FOUND` |
| User is already suspended | `ALREADY_SUSPENDED` |
| User is already banned | `ALREADY_BANNED` |

## User Ban

Banning is the most severe action. It permanently restricts all account access.

```typescript
import { banUser } from '@/lib/services/moderation.service';

const result = await banUser(
  'user-id-123',
  'Severe guideline violation',
  'report-id-456',
  'admin-user-id'
);
```

### Validation Guards

| Check | Error Code |
|-------|-----------|
| User does not exist | `NOT_FOUND` |
| User is already banned | `ALREADY_BANNED` |

## Audit Trail

Every moderation action creates a record in the `moderation_history` table via `createModerationHistory()`:

```typescript
{
  userId: string;          // Affected user
  action: ModerationAction; // WARN, SUSPEND, BAN, CONTENT_REMOVED
  reason: string;          // Admin-provided reason
  reportId: string;        // Associated report
  performedBy: string;     // Admin who took the action
  contentType?: string;    // For content removal actions
  contentId?: string;      // For content removal actions
  details?: object;        // Additional context (e.g., warning count, item name)
}
```

The `ModerationAction` enum defines the available action types:

| Action | Description |
|--------|-------------|
| `WARN` | User warning issued |
| `SUSPEND` | User account suspended |
| `BAN` | User account banned |
| `CONTENT_REMOVED` | Content deleted from platform |

## Email Notifications

All moderation actions trigger non-blocking email notifications via `EmailNotificationService`. Emails are sent using `.catch()` to prevent notification failures from blocking the moderation action:

| Action | Email Method | Recipient |
|--------|-------------|-----------|
| Content Removed | `sendContentRemovedEmail()` | Content owner |
| Warning | `sendUserWarningEmail()` | Warned user |
| Suspension | `sendUserSuspensionEmail()` | Suspended user |
| Ban | `sendUserBanEmail()` | Banned user |

## Source Files

| File | Path |
|------|------|
| Moderation Service | `template/lib/services/moderation.service.ts` |
| Email Notification Service | `template/lib/services/email-notification.service.ts` |
| Moderation DB Queries | `template/lib/db/queries/moderation.queries.ts` |
