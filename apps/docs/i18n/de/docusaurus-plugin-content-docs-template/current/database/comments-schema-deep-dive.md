---
id: comments-schema-deep-dive
title: "Kommentare Schema Deep Dive"
sidebar_label: "Kommentarschema"
sidebar_position: 54
---

# Kommentare Schema Deep Dive

## Übersicht

Das Kommentarsystem ermöglicht es Benutzern, Feedback und Bewertungen zu Artikeln zu hinterlassen. Kommentare sind mit `client_profiles` verknüpft (nicht direkt mit `users`), enthalten ein Bewertungsfeld und unterstützen das vorläufige Löschen über `deletedAt`. Das Moderationssubsystem (`reports` und `moderation_history`) bietet Inhaltsberichte und die Verfolgung administrativer Maßnahmen.

**Quelldatei:** `template/lib/db/schema.ts`
**Beziehungsdatei:** `template/lib/db/migrations/relations.ts`

---

## Table: `comments`

Stores user-submitted comments/reviews on items.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `content` | `content` | `text` | No | - | Comment body |
| `userId` | `userId` | `text` | No | - | FK -> `client_profiles.id` (CASCADE) |
| `itemId` | `itemId` | `text` | No | - | Item slug |
| `rating` | `rating` | `integer` | No | `0` | Numeric rating |
| `createdAt` | `created_at` | `timestamp (tz)` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp (tz)` | No | `now()` | - |
| `editedAt` | `edited_at` | `timestamp (tz)` | Yes | - | When last edited |
| `deletedAt` | `deleted_at` | `timestamp (tz)` | Yes | - | Soft delete |

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `userId` | `client_profiles.id` | CASCADE |

### TypeScript Types

```typescript
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

:::info Note on Foreign Key
Comments reference `client_profiles.id`, not `users.id`. This means the comment author must have a client profile created before they can post comments.
:::

---

## Moderationstische

### Tabelle: `reports`

Inhaltsberichtssystem für Artikel und Kommentare.

### Spalten

|Spalte|DB-Name|Typ|Nullbar|Standard|Einschränkungen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nein|`crypto.randomUUID()`|Primärschlüssel|
|`contentType`|`content_type`|`text (enum)`|Nein| - |`item`, `comment`|
|`contentId`|`content_id`|`text`|Nein| - |ID des gemeldeten Inhalts|
|`reason`|`reason`|`text (enum)`|Nein| - |Siehe Aufzählung unten|
|`details`|`details`|`text`|Ja| - |Vom Benutzer bereitgestellte Details|
|`status`|`status`|`text (enum)`|Nein|`'pending'`|Siehe Aufzählung unten|
|`resolution`|`resolution`|`text (enum)`|Ja| - |Siehe Aufzählung unten|
|`reportedBy`|`reported_by`|`text`|Nein| - |FK -> `client_profiles.id` (KASKADE)|
|`reviewedBy`|`reviewed_by`|`text`|Ja| - |FK -> `users.id` (SET NULL)|
|`reviewNote`|`review_note`|`text`|Ja| - |Anmerkung zur Administratorüberprüfung|
|`createdAt`|`created_at`|`timestamp`|Nein|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nein|`now()`| - |
|`reviewedAt`|`reviewed_at`|`timestamp`|Ja| - | - |
|`resolvedAt`|`resolved_at`|`timestamp`|Ja| - | - |

### Aufzählungen melden

```typescript
export const ReportContentType = {
    ITEM: 'item',
    COMMENT: 'comment'
} as const;

export const ReportReason = {
    SPAM: 'spam',
    HARASSMENT: 'harassment',
    INAPPROPRIATE: 'inappropriate',
    OTHER: 'other'
} as const;

export const ReportStatus = {
    PENDING: 'pending',
    REVIEWED: 'reviewed',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed'
} as const;

export const ReportResolution = {
    CONTENT_REMOVED: 'content_removed',
    USER_WARNED: 'user_warned',
    USER_SUSPENDED: 'user_suspended',
    USER_BANNED: 'user_banned',
    NO_ACTION: 'no_action'
} as const;
```

### Indizes

|Name|Spalten|Typ|
|---|---|---|
|`reports_content_type_idx`|`contentType`|B-Baum|
|`reports_content_id_idx`|`contentId`|B-Baum|
|`reports_status_idx`|`status`|B-Baum|
|`reports_reported_by_idx`|`reportedBy`|B-Baum|
|`reports_created_at_idx`|`createdAt`|B-Baum|
|`reports_content_type_content_id_idx`|`(contentType, contentId)`|Zusammengesetzter B-Baum|

### TypeScript-Typen

```typescript
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
```

---

### Table: `moderation_history`

Tracks all moderation actions taken against users.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `userId` | `user_id` | `text` | No | - | FK -> `client_profiles.id` (CASCADE) |
| `action` | `action` | `text (enum)` | No | - | See enum below |
| `reason` | `reason` | `text` | Yes | - | - |
| `reportId` | `report_id` | `text` | Yes | - | FK -> `reports.id` (SET NULL) |
| `performedBy` | `performed_by` | `text` | Yes | - | FK -> `users.id` (SET NULL) |
| `contentType` | `content_type` | `text (enum)` | Yes | - | `item`, `comment` |
| `contentId` | `content_id` | `text` | Yes | - | - |
| `details` | `details` | `jsonb` | Yes | - | Additional context |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |

### Moderation Action Enum

```typescript
export const ModerationAction = {
    WARN: 'warn',
    SUSPEND: 'suspend',
    BAN: 'ban',
    UNSUSPEND: 'unsuspend',
    UNBAN: 'unban',
    CONTENT_REMOVED: 'content_removed'
} as const;
```

### Indexes

| Name | Columns | Type |
|---|---|---|
| `moderation_history_user_id_idx` | `userId` | B-tree |
| `moderation_history_action_idx` | `action` | B-tree |
| `moderation_history_report_id_idx` | `reportId` | B-tree |
| `moderation_history_performed_by_idx` | `performedBy` | B-tree |
| `moderation_history_created_at_idx` | `createdAt` | B-tree |

### TypeScript Types

```typescript
export type ModerationHistoryRecord = typeof moderationHistory.$inferSelect;
export type NewModerationHistoryRecord = typeof moderationHistory.$inferInsert;
```

---

## Beziehungsdiagramm

```mermaid
erDiagram
    client_profiles ||--o{ comments : "writes"
    client_profiles ||--o{ reports : "reports content"
    client_profiles ||--o{ moderation_history : "moderated"
    users ||--o{ reports : "reviews (admin)"
    users ||--o{ moderation_history : "performs (admin)"
    reports ||--o{ moderation_history : "triggers"

    comments {
        text id PK
        text content
        text userId FK
        text itemId
        integer rating
        timestamp edited_at
        timestamp deleted_at
    }

    reports {
        text id PK
        text content_type
        text content_id
        text reason
        text status
        text resolution
        text reported_by FK
        text reviewed_by FK
    }

    moderation_history {
        text id PK
        text user_id FK
        text action
        text report_id FK
        text performed_by FK
        jsonb details
    }
```

---

## Report Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending : Report submitted
    pending --> reviewed : Admin reviews
    reviewed --> resolved : Action taken
    reviewed --> dismissed : No violation found
    resolved --> [*]
    dismissed --> [*]
```

---

## Abfragebeispiele

### Erhalten Sie Kommentare zu einem Artikel

```typescript
import { db } from '@/lib/db/drizzle';
import { comments } from '@/lib/db/schema';
import { eq, isNull, desc } from 'drizzle-orm';

const itemComments = await db
    .select()
    .from(comments)
    .where(
        and(
            eq(comments.itemId, 'my-item-slug'),
            isNull(comments.deletedAt)
        )
    )
    .orderBy(desc(comments.createdAt));
```

### Erstellen Sie einen Kommentar

```typescript
await db.insert(comments).values({
    content: 'Great tool, highly recommended!',
    userId: clientProfileId, // Note: client_profiles.id, NOT users.id
    itemId: 'my-item-slug',
    rating: 5,
});
```

### Einen Kommentar vorläufig löschen

```typescript
await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(eq(comments.id, commentId));
```

### Senden Sie einen Bericht

```typescript
import { reports } from '@/lib/db/schema';

await db.insert(reports).values({
    contentType: 'comment',
    contentId: commentId,
    reason: 'spam',
    details: 'This comment appears to be promotional spam.',
    reportedBy: clientProfileId,
});
```

### Erhalten Sie ausstehende Berichte

```typescript
const pendingReports = await db
    .select()
    .from(reports)
    .where(eq(reports.status, 'pending'))
    .orderBy(desc(reports.createdAt));
```

### Zeichnen Sie eine Moderationsaktion auf

```typescript
import { moderationHistory } from '@/lib/db/schema';

await db.insert(moderationHistory).values({
    userId: targetClientProfileId,
    action: 'warn',
    reason: 'Posting spam content',
    reportId: reportId,
    performedBy: adminUserId,
    contentType: 'comment',
    contentId: commentId,
});
```
