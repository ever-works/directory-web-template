---
id: reports-endpoints
title: Reports Endpoints
sidebar_label: Reports
sidebar_position: 20
---

# Reports Endpoints

The reports system allows authenticated users to flag inappropriate content and provides administrators with tools to review, moderate, and resolve reports. Reports support content types including items and comments, with built-in duplicate prevention.

## Overview

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/reports` | POST | User | Submit a content report |
| `/api/admin/reports` | GET | Admin | List reports with filtering |
| `/api/admin/reports/stats` | GET | Admin | Get report statistics |
| `/api/admin/reports/[id]` | GET | Admin | Get a single report |
| `/api/admin/reports/[id]` | PUT | Admin | Update report status and resolution |

## Public Endpoints

### Submit a Report

```
POST /api/reports
```

Authenticated users can report items or comments for inappropriate content. Each user can only report the same content once (duplicate prevention via `hasUserReportedContent` check). Blocked users (suspended or banned) are prevented from submitting reports.

**Authentication:** Required (session-based)

**Request Body:**

```json
{
  "contentType": "item",
  "contentId": "awesome-productivity-tool",
  "reason": "spam",
  "details": "This tool is promoting malicious software"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `contentType` | string | Yes | Type of content: `"item"` or `"comment"` |
| `contentId` | string | Yes | ID or slug of the content being reported |
| `reason` | string | Yes | One of: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |
| `details` | string | No | Additional context about the report |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "report": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "awesome-productivity-tool",
    "reason": "spam",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | Invalid content type, missing content ID, or invalid reason |
| 401 | User not authenticated |
| 403 | Client profile required, or user is suspended/banned |
| 404 | Client profile not found |
| 409 | User has already reported this content |
| 500 | Internal server error |

**Source:** `template/app/api/reports/route.ts`

## Admin Endpoints

All admin endpoints require `session.user.isAdmin` to be true.

### List Reports

```
GET /api/admin/reports
```

Returns a paginated list of content reports with reporter information. Supports filtering by status, content type, and reason, plus text search across content ID, details, and reporter name/email.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number (minimum 1) |
| `limit` | integer | 10 | Results per page (1-100) |
| `search` | string | - | Search across content ID, details, reporter name/email |
| `status` | string | - | Filter: `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `contentType` | string | - | Filter: `"item"`, `"comment"` |
| `reason` | string | - | Filter: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "rpt_abc123",
        "contentType": "item",
        "contentId": "some-item-slug",
        "reason": "spam",
        "status": "pending",
        "details": "Suspicious content",
        "reportedBy": "client_456",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

**Source:** `template/app/api/admin/reports/route.ts`

### Get Report Statistics

```
GET /api/admin/reports/stats
```

Returns aggregate statistics about reports including counts by status, content type, and reason.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "total": 156,
    "pendingCount": 23,
    "resolvedCount": 120,
    "byStatus": {
      "pending": 23,
      "reviewed": 10,
      "resolved": 120,
      "dismissed": 3
    },
    "byContentType": {
      "item": 100,
      "comment": 56
    },
    "byReason": {
      "spam": 80,
      "inappropriate": 45,
      "harassment": 20,
      "other": 11
    }
  }
}
```

**Source:** `template/app/api/admin/reports/stats/route.ts`

### Get Report by ID

```
GET /api/admin/reports/[id]
```

Retrieves a single report with full details including reporter and reviewer information.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Report ID |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "some-item-slug",
    "reason": "spam",
    "status": "reviewed",
    "details": "Suspicious content",
    "reportedBy": "client_456",
    "reviewedBy": "admin_789",
    "reviewNote": "Confirmed as spam",
    "resolution": "content_removed",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-21T09:00:00.000Z"
  }
}
```

| Status | Condition |
|---|---|
| 403 | Not an admin |
| 404 | Report not found |

**Source:** `template/app/api/admin/reports/[id]/route.ts`

### Update Report

```
PUT /api/admin/reports/[id]
```

Updates a report's status, resolution, and review note. When a resolution is set, the system automatically executes the corresponding moderation action (content removal, user warning, suspension, or ban).

**Request Body:**

```json
{
  "status": "resolved",
  "resolution": "content_removed",
  "reviewNote": "Confirmed spam content, removed from listing"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string | No | `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `resolution` | string | No | `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"` |
| `reviewNote` | string | No | Admin notes about the review |

**Moderation Actions by Resolution:**

The following automated actions are triggered based on the resolution value:

| Resolution | Action |
|---|---|
| `content_removed` | Calls `removeContent()` to remove the reported item or comment |
| `user_warned` | Calls `warnUser()` to issue a warning to the content owner |
| `user_suspended` | Calls `suspendUser()` to suspend the content owner's account |
| `user_banned` | Calls `banUser()` to permanently ban the content owner |
| `no_action` | No moderation action is taken |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "id": "rpt_abc123",
    "status": "resolved",
    "resolution": "content_removed",
    "reviewNote": "Confirmed spam content"
  },
  "moderationResult": {
    "success": true,
    "message": "Content removed successfully"
  }
}
```

| Status | Condition |
|---|---|
| 400 | Invalid status or resolution value; content owner not found for user-level actions (for example `Item submitter has no client profile`, or `Item not found` when the content is gone) |
| 403 | Not an admin |
| 404 | Report not found |
| 409 | The moderation action does not fit the target's state (`User is already banned` or `User is already suspended` by another report or by hand, `User not found`, or `content_removed` on content that cannot be found) |
| 500 | The moderation action failed (for example `Failed to warn user`), or the report could not be saved |

On every moderation error (400 owner not found, 409, 500 action failed) the report is **left unchanged**: the action runs before the report is saved. The `error` field carries the action's message, which the admin reports page shows in its error toast.

**Source:** `template/app/api/admin/reports/[id]/route.ts`

## Data Model

Reports use the following enums defined in `lib/db/schema`:

- **ReportContentType:** `"item"`, `"comment"`
- **ReportReason:** `"spam"`, `"harassment"`, `"inappropriate"`, `"other"`
- **ReportStatus:** `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"`
- **ReportResolution:** `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"`

## Integration with Moderation

When a report is resolved with a user-level resolution (`user_warned`, `user_suspended`, `user_banned`), the system:

1. Looks up the content owner via `getContentOwner()`, which returns a `client_profiles.id` (for an item it maps `submitted_by`, a `users.id`, to the submitter's client profile)
2. Executes the appropriate moderation function from `lib/services/moderation.service`
3. Uses the `reviewNote` as the reason for the moderation action
4. Saves the report and records the admin's ID as the reviewer

The moderation action runs before the report is saved. If the owner cannot be identified or the action fails, the route answers an error with the action's message and the report stays as it was, so the admin can pick another resolution.

The action runs only when the resolution changes. The review dialog sends the saved resolution back with every edit, so a resolution the report already has is not run again: editing the note or status of a completed report saves without banning, suspending, warning or removing a second time.

**Retry after a failed save.** The action and the report save are two writes (`content_removed` deletes from the Git data repository, so one transaction cannot cover both). If the action succeeds and the save fails, the admin retries the same resolution, and the retry saves the report without acting twice (`lib/services/report-moderation.ts`):

- `user_warned` / `content_removed`: skipped when `moderation_history` already records that action for this report, so the user is not warned, or notified of the removal, a second time.
- `user_banned` / `user_suspended`: the action runs; an `ALREADY_BANNED` / `ALREADY_SUSPENDED` answer counts as done only when `moderation_history` records the same action for this report. A ban or suspension from another report (or made by hand) stays a 409, and a user unbanned since is banned again.
- `content_removed` answering `NOT_FOUND` stays a 409: the item may only be unreadable (data repository not synced yet, a YAML file that fails to parse) while it is still public.

The same rule applies when a report is moved to another resolution and back: a warning or removal this report recorded is not repeated. Two cases leave no history row, so their retry still answers 409: content whose owner has no client profile, and a ban or suspension whose history write failed after the user was changed (`docs/questions.md` Q-009a).
