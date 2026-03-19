---
id: moderation-endpoints
title: Moderation System
sidebar_label: Moderation
sidebar_position: 28
---

# Moderation System

The moderation system provides programmatic content moderation through a service layer rather than standalone API endpoints. Moderation actions are triggered automatically when administrators resolve content reports via the Reports API. The system supports warning users, suspending accounts, banning accounts, and removing content, with full audit history and email notifications.

## Overview

Moderation is not exposed as separate REST endpoints. Instead, it is invoked through the report resolution workflow:

```
PUT /api/admin/reports/[id]  -->  resolution triggers moderation action
```

When an admin sets a `resolution` value on a report, the corresponding moderation function executes automatically.

| Resolution Value | Moderation Function | Effect |
|---|---|---|
| `content_removed` | `removeContent()` | Soft-deletes the reported comment or item |
| `user_warned` | `warnUser()` | Increments the user's warning count |
| `user_suspended` | `suspendUser()` | Sets user status to `"suspended"` |
| `user_banned` | `banUser()` | Sets user status to `"banned"` |
| `no_action` | None | No moderation action taken |

## Moderation Actions

### Remove Content

```typescript
removeContent(contentType, contentId, reportId, adminId): Promise<ModerationResult>
```

Removes the reported content based on its type. For comments, this performs a soft delete (sets `deletedAt`). For items, this deletes the item from the Git-based content repository.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `contentType` | `"item"` or `"comment"` | Type of content to remove |
| `contentId` | string | ID or slug of the content |
| `reportId` | string | Associated report ID |
| `adminId` | string | Admin user performing the action |

**Processing Steps:**

1. Look up content owner via `getContentOwner()`
2. If comment: soft-delete via `deleteComment()`
3. If item: delete from Git repository via `itemRepository.delete()`
4. Log moderation history with action `CONTENT_REMOVED`
5. Send content removal notification email to the content owner

**Source:** `template/lib/services/moderation.service.ts`

### Warn User

```typescript
warnUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Issues a warning to a user by incrementing their `warningCount` field. Users who are already banned cannot receive warnings.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `userId` | string | Client profile ID of the user |
| `reason` | string | Reason for the warning |
| `reportId` | string | Associated report ID |
| `adminId` | string | Admin user performing the action |

**Processing Steps:**

1. Verify user exists and is not already banned
2. Increment warning count via `incrementWarningCount()`
3. Log moderation history with action `WARN`
4. Send warning email notification with the current warning count

**Success Result:**

```json
{
  "success": true,
  "message": "User warned successfully. Total warnings: 3"
}
```

**Source:** `template/lib/services/moderation.service.ts`

### Suspend User

```typescript
suspendUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Suspends a user account by setting their status to `"suspended"` and recording a `suspendedAt` timestamp. Suspended users cannot create comments, submit votes, or file reports.

**Guards:**

- Returns error if user is already suspended
- Returns error if user is already banned

**Processing Steps:**

1. Verify user exists and is not already suspended or banned
2. Set status to `"suspended"` with `suspendedAt` timestamp
3. Log moderation history with action `SUSPEND`
4. Send suspension email notification

**Source:** `template/lib/services/moderation.service.ts`

### Ban User

```typescript
banUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Permanently bans a user account by setting their status to `"banned"` and recording a `bannedAt` timestamp. Banned users are blocked from all authenticated actions.

**Guards:**

- Returns error if user is already banned

**Processing Steps:**

1. Verify user exists and is not already banned
2. Set status to `"banned"` with `bannedAt` timestamp
3. Log moderation history with action `BAN`
4. Send ban email notification

**Source:** `template/lib/services/moderation.service.ts`

## Content Owner Resolution

The `getContentOwner()` function determines who owns the reported content:

| Content Type | Owner Source |
|---|---|
| `comment` | `comment.userId` field from the comments table |
| `item` | `item.submitted_by` field from the item repository |

This is used by all user-level moderation actions (`user_warned`, `user_suspended`, `user_banned`) to identify the target user for the action.

**Source:** `template/lib/services/moderation.service.ts`

## Moderation History

All moderation actions create an audit trail in the `moderationHistory` database table.

### History Record Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique record ID |
| `userId` | string | Client profile ID of the affected user |
| `action` | string | `"CONTENT_REMOVED"`, `"WARN"`, `"SUSPEND"`, or `"BAN"` |
| `reason` | string or null | Reason for the moderation action |
| `reportId` | string or null | Associated report ID |
| `performedBy` | string or null | Admin user ID who performed the action |
| `contentType` | string or null | `"item"` or `"comment"` (for content removal) |
| `contentId` | string or null | ID of the removed content |
| `details` | object or null | Additional context (e.g., warning count, item name) |
| `createdAt` | timestamp | When the action was performed |

### History Queries

| Function | Description |
|---|---|
| `getModerationHistoryByUser(userId, limit)` | Get all moderation actions for a user (default limit: 50) |
| `getModerationHistoryByReport(reportId)` | Get moderation actions linked to a specific report |

Both query functions enrich results with user profile information and the admin performer's details.

**Source:** `template/lib/db/queries/moderation.queries.ts`

## User Status Management

### Status Values

| Status | Description |
|---|---|
| `active` | Normal account, all features available |
| `suspended` | Temporarily restricted, cannot create content |
| `banned` | Permanently restricted, blocked from all actions |

### Database Operations

| Function | Description |
|---|---|
| `suspendUser(userId)` | Sets status to `"suspended"`, records `suspendedAt` |
| `unsuspendUser(userId)` | Restores status to `"active"`, clears `suspendedAt` |
| `banUser(userId)` | Sets status to `"banned"`, records `bannedAt` |
| `unbanUser(userId)` | Restores status to `"active"`, clears `bannedAt` |
| `incrementWarningCount(userId)` | Increments `warningCount` using SQL `COALESCE` |

### Blocked User Checks

Two helper functions check user status across the application:

- **`isUserBlocked(status)`** -- Returns `true` if status is `"suspended"` or `"banned"`
- **`getBlockReasonMessage(status)`** -- Returns a user-facing message explaining why the action is restricted

These checks are used by the comments, votes, and reports endpoints to prevent blocked users from creating content.

**Source:** `template/lib/db/queries/moderation.queries.ts`

## Email Notifications

The `EmailNotificationService` sends non-blocking notifications for moderation actions:

| Method | Trigger |
|---|---|
| `sendContentRemovedEmail(email, type, reason)` | Content removed by admin |
| `sendUserWarningEmail(email, reason, count)` | Warning issued |
| `sendUserSuspensionEmail(email, reason)` | Account suspended |
| `sendUserBanEmail(email, reason)` | Account banned |

All email sends use `.catch()` to prevent failures from interrupting the moderation workflow. A failed email does not cause the moderation action itself to fail.

## Key Implementation Details

- **Service Layer Pattern:** Moderation logic lives in `lib/services/moderation.service.ts`, not in API route handlers. This allows reuse across different entry points.
- **Audit Trail:** Every moderation action creates a `moderationHistory` record, providing a complete audit log for compliance and review.
- **Non-Blocking Emails:** Email notifications are sent asynchronously with `.catch()` handlers. If the email service is unavailable, the moderation action still succeeds.
- **Idempotency Guards:** Each action checks current user status before proceeding. Banning an already-banned user returns an error rather than creating a duplicate action.
- **Soft Delete vs Hard Delete:** Comments are soft-deleted (setting `deletedAt`), while items are fully removed from the Git repository. This difference reflects the storage model (database vs file-based content).
