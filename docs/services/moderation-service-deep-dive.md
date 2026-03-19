---
id: moderation-service-deep-dive
title: "Moderation Service Deep Dive"
sidebar_label: "Moderation Service"
sidebar_position: 45
---

# Moderation Service

## Overview

The Moderation Service implements the complete content moderation pipeline for the platform, handling content removal, user warnings, suspensions, and bans. It integrates with the reporting system, audit trail, and email notification services to provide a comprehensive moderation workflow. Every moderation action is logged to a history table and triggers an email notification to the affected user.

## Architecture

The Moderation Service operates as the central orchestrator for admin-initiated moderation actions. It coordinates between content repositories (items and comments), user profiles, moderation history logging, and email notifications. All actions require an admin user ID and a report ID for traceability.

```
Admin Dashboard / API Route
        |
   moderation.service.ts   (orchestration)
        |
   +----------+----------+-----------+
   | Comment  | Item     | Client    |
   | Queries  | Repo     | Profile   |
   +----------+----------+-----------+
        |              |
   moderation.queries   email-notification.service
        |
   Database (moderation_history, client_profiles, comments, items)
```

## API Reference

### Types

#### `ModerationResult`

Standard result type for all moderation operations.

```typescript
interface ModerationResult {
  success: boolean;
  message: string;
  error?: string; // Error code: 'NOT_FOUND', 'ALREADY_BANNED', 'INVALID_TYPE', etc.
}
```

#### `ContentOwnerResult`

Result of looking up the owner of reported content.

```typescript
interface ContentOwnerResult {
  success: boolean;
  userId?: string;
  error?: string;
}
```

### Functions

#### `getContentOwner(contentType: ReportContentTypeValues, contentId: string): Promise<ContentOwnerResult>`

Resolves the owner (author) of reported content. For comments, it looks up the comment's `userId`. For items, it looks up the item's `submitted_by` field via the `ItemRepository`.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `contentType` | `ReportContentTypeValues` | `'comment'` or `'item'` |
| `contentId` | `string` | ID of the content |

**Returns:** `ContentOwnerResult` -- Contains `userId` on success, or `error` on failure.

---

#### `removeContent(contentType: ReportContentTypeValues, contentId: string, reportId: string, adminId: string): Promise<ModerationResult>`

Removes reported content (deletes a comment or item) and logs the moderation action. Sends an email notification to the content owner.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `contentType` | `ReportContentTypeValues` | `'comment'` or `'item'` |
| `contentId` | `string` | ID of the content to remove |
| `reportId` | `string` | Associated report ID for audit trail |
| `adminId` | `string` | Admin user performing the action |

**Behavior by content type:**
- **Comment:** Soft-deletes the comment via `deleteComment`, logs to moderation history, sends content-removed email
- **Item:** Deletes the item via `ItemRepository.delete()`, logs with item name and slug metadata, sends email

---

#### `warnUser(userId: string, reason: string, reportId: string, adminId: string): Promise<ModerationResult>`

Issues a warning to a user. Increments their warning count, logs the action, and sends a warning email.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | `string` | Client profile ID of the user |
| `reason` | `string` | Reason for the warning |
| `reportId` | `string` | Associated report ID |
| `adminId` | `string` | Admin performing the action |

**Guards:**
- Returns error if user not found
- Returns error if user is already banned (cannot warn a banned user)

---

#### `suspendUser(userId: string, reason: string, reportId: string, adminId: string): Promise<ModerationResult>`

Suspends a user account. Updates the user's status to `'suspended'`, logs the action, and sends a suspension email.

**Parameters:** Same as `warnUser`.

**Guards:**
- Returns error if user not found
- Returns error if user is already suspended
- Returns error if user is already banned

---

#### `banUser(userId: string, reason: string, reportId: string, adminId: string): Promise<ModerationResult>`

Permanently bans a user account. Updates the user's status to `'banned'`, logs the action, and sends a ban notification email.

**Parameters:** Same as `warnUser`.

**Guards:**
- Returns error if user not found
- Returns error if user is already banned

## Implementation Details

- **Non-blocking emails:** All email notifications are dispatched with `.catch()` handlers, meaning email failures are logged but never block the moderation action from completing.
- **Moderation history:** Every action creates a record in the `moderation_history` table via `createModerationHistory`, providing a complete audit trail of all moderation decisions.
- **Escalation path:** The service supports a natural escalation: warn -> suspend -> ban. Each level has guards preventing redundant actions (e.g., cannot warn a banned user).
- **Warning counter:** `warnUser` calls `incrementWarningCount` which atomically increments the user's warning count and returns the new total, which is included in the moderation history and the email.
- **Content type polymorphism:** `removeContent` handles both comments and items through the `ReportContentType` enum, using the appropriate repository/query for each type.

## Database Interactions

| Operation | Query Function | Table |
|-----------|---------------|-------|
| Get comment | `getCommentById(id)` | `comments` |
| Delete comment | `deleteComment(id)` | `comments` |
| Get item | `ItemRepository.findById(id)` | `items` (YAML/Git) |
| Delete item | `ItemRepository.delete(id)` | `items` (YAML/Git) |
| Get user profile | `getClientProfileById(id)` | `client_profiles` |
| Increment warnings | `incrementWarningCount(userId)` | `client_profiles` |
| Suspend user | `suspendUserQuery(userId)` | `client_profiles` |
| Ban user | `banUserQuery(userId)` | `client_profiles` |
| Log action | `createModerationHistory(data)` | `moderation_history` |

## Error Handling

- All functions return `ModerationResult` with structured error codes (`NOT_FOUND`, `ALREADY_BANNED`, `ALREADY_SUSPENDED`, `INVALID_TYPE`, `UNKNOWN_ERROR`).
- Errors are caught at the top level of each function, logged to console, and returned as failure results.
- Email sending failures are caught independently and do not affect the moderation result.
- The `getContentOwner` helper catches errors and returns a failure result rather than throwing.

## Usage Examples

```typescript
import {
  removeContent,
  warnUser,
  suspendUser,
  banUser,
  getContentOwner,
} from '@/lib/services/moderation.service';

// Remove a reported comment
const result = await removeContent('comment', commentId, reportId, adminId);
if (result.success) {
  console.log(result.message); // "Comment removed successfully"
}

// Warn a user
const warnResult = await warnUser(userId, 'Inappropriate language', reportId, adminId);
// => { success: true, message: "User warned successfully. Total warnings: 2" }

// Suspend a user after repeated violations
const suspendResult = await suspendUser(userId, 'Repeated violations', reportId, adminId);

// Ban a user
const banResult = await banUser(userId, 'Severe violation of terms', reportId, adminId);

// Look up who owns the reported content
const owner = await getContentOwner('item', itemId);
if (owner.success) {
  console.log('Content owner:', owner.userId);
}
```

## Configuration

This service has no direct environment variable dependencies. Email sending depends on the `EmailNotificationService` being properly configured (SMTP/provider credentials).

## Related Services

- [Report Service](./report-service.md) -- Reports trigger moderation actions
- [Notification Service](./notification-service-deep-dive.md) -- In-app notifications for admins
- [Email System](./mail-system.md) -- Email notifications to affected users
- [Comment Service](./comment-service.md) -- Comment deletion
- [Item Service](./item-service.md) -- Item deletion
- [User Service](./user-service.md) -- User status management
