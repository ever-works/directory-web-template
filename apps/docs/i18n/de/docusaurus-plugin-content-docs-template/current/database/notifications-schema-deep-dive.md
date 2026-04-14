---
id: notifications-schema-deep-dive
title: "Benachrichtigungsschema – tiefer Einblick"
sidebar_label: "Benachrichtigungsschema"
sidebar_position: 59
---

# Benachrichtigungsschema – tiefer Einblick

## Übersicht

Das Benachrichtigungsmodul bietet Benutzern ein In-App-Benachrichtigungssystem. Benachrichtigungen sind typisiert, unterstützen die Verfolgung gelesener/ungelesener Nachrichten und können beliebige Datennutzlasten enthalten. Das System umfasst außerdem eine Tabelle `newsletterSubscriptions` für die Verwaltung von E-Mail-Abonnements.

**Quelldatei:** `template/lib/db/schema.ts`
**Beziehungsdatei:** `template/lib/db/migrations/relations.ts`

---

## Table: `notifications`

In-app notification records delivered to users.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `userId` | `user_id` | `text` | No | - | FK -> `users.id` (CASCADE) |
| `type` | `type` | `text (enum)` | No | - | See notification types |
| `title` | `title` | `text` | No | - | Notification headline |
| `message` | `message` | `text` | No | - | Notification body |
| `data` | `data` | `text` | Yes | - | JSON payload |
| `isRead` | `is_read` | `boolean` | No | `false` | Read status |
| `readAt` | `read_at` | `timestamp` | Yes | - | When marked as read |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `user_id` | `users.id` | CASCADE |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `notifications_user_idx` | `userId` | B-tree |
| `notifications_type_idx` | `type` | B-tree |
| `notifications_is_read_idx` | `isRead` | B-tree |
| `notifications_created_at_idx` | `createdAt` | B-tree |

---

## Aufzählung des Benachrichtigungstyps

```typescript
// Defined inline in the schema
type: text('type', {
    enum: [
        'item_submission',    // A new item was submitted
        'comment_reported',   // A comment was reported
        'item_reported',      // An item was reported
        'user_registered',    // A new user registered
        'payment_failed',     // A payment attempt failed
        'system_alert'        // System-level notification
    ]
}).notNull()
```

|Typ|Beschreibung|Typischer Empfänger|
|---|---|---|
|`item_submission`|Neuer Artikel zur Überprüfung eingereicht|Admin-Benutzer|
|`comment_reported`|Ein Kommentar wurde von einem Benutzer markiert|Admin-Benutzer|
|`item_reported`|Ein Artikel wurde von einem Benutzer markiert|Admin-Benutzer|
|`user_registered`|Neuer Benutzer hat ein Konto erstellt|Admin-Benutzer|
|`payment_failed`|Ein Zahlungsversuch ist fehlgeschlagen|Betroffener Benutzer|
|`system_alert`|Warnungen und Ankündigungen auf Systemebene|Alle Benutzer oder bestimmte Benutzer|

---

## TypeScript Types

```typescript
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
```

---

## Beziehungen

```typescript
// From relations.ts
export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id]
    }),
}));

// Users have many notifications
export const usersRelations = relations(users, ({ many }) => ({
    // ... other relations
    notifications: many(notifications),
}));
```

---

## Table: `newsletterSubscriptions`

Email newsletter subscription management, separate from in-app notifications.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `email` | `email` | `text` | No | - | Unique |
| `isActive` | `is_active` | `boolean` | No | `true` | Active subscription flag |
| `subscribedAt` | `subscribed_at` | `timestamp` | No | `now()` | - |
| `unsubscribedAt` | `unsubscribed_at` | `timestamp` | Yes | - | - |
| `lastEmailSent` | `last_email_sent` | `timestamp` | Yes | - | - |
| `source` | `source` | `text` | Yes | `'footer'` | `footer`, `popup`, etc. |

### Constraints

| Name | Columns | Type |
|---|---|---|
| `newsletterSubscriptions_email_unique` | `email` | Unique |

### TypeScript Types

```typescript
export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type NewNewsletterSubscription = typeof newsletterSubscriptions.$inferInsert;
```

---

## Beziehungsdiagramm

```mermaid
erDiagram
    users ||--o{ notifications : "receives"

    notifications {
        text id PK
        text user_id FK
        text type
        text title
        text message
        text data
        boolean is_read
        timestamp read_at
        timestamp created_at
    }

    newsletterSubscriptions {
        text id PK
        text email UK
        boolean is_active
        timestamp subscribed_at
        timestamp unsubscribed_at
        text source
    }
```

---

## Notification Flow

```mermaid
flowchart LR
    A[Event occurs] --> B[Create notification record]
    B --> C[Notification appears in user inbox]
    C --> D{User reads?}
    D -->|Yes| E[Mark isRead=true, set readAt]
    D -->|No| F[Stays in unread list]
```

---

## Die Spalte `data`

In der Spalte `data` wird eine JSON-Zeichenfolge (nicht JSONB) mit beliebigem Kontext für die Benachrichtigung gespeichert. Die Struktur variiert je nach Benachrichtigungstyp:

```typescript
// item_submission
{ "itemSlug": "new-tool", "itemName": "New Tool", "submittedBy": "user-id" }

// comment_reported
{ "commentId": "comment-uuid", "itemSlug": "my-item", "reportId": "report-uuid" }

// payment_failed
{ "subscriptionId": "sub-uuid", "amount": 1999, "currency": "usd" }

// system_alert
{ "severity": "info", "actionUrl": "/admin/settings" }
```

---

## Query Examples

### Create a notification

```typescript
import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';

await db.insert(notifications).values({
    userId: targetUserId,
    type: 'item_submission',
    title: „Neuer Artikel eingereicht“,
    message: 'A new tool "Acme Editor" has been submitted for review.',
    data: JSON.stringify({
        itemSlug: 'acme-editor',
        itemName: 'Acme Editor',
        submittedBy: submitterUserId,
    }),
});
```

### Get unread notifications for a user

```typescript
import { eq, and, desc } from 'drizzle-orm';

const unread = await db
    .select()
    .from(notifications)
    .where(
        and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
        )
    )
    .orderBy(desc(notifications.createdAt));
```

### Get unread count

```typescript
import { sql } from 'drizzle-orm';

const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
        and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
        )
    );
```

### Mark notification as read

```typescript
await db
    .update(notifications)
    .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
    })
    .where(eq(notifications.id, notificationId));
```

### Mark all notifications as read

```typescript
await db
    .update(notifications)
    .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
    })
    .where(
        and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
        )
    );
```

### Get paginated notification history

```typescript
const page = 1;
const limit = 20;

const history = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
```

### Subscribe to newsletter

```typescript
import { newsletterSubscriptions } from '@/lib/db/schema';

await db
    .insert(newsletterSubscriptions)
    .values({
        email: 'user@example.com',
        source: 'footer',
    })
    .onConflictDoUpdate({
        target: newsletterSubscriptions.email,
        set: {
            isActive: true,
            subscribedAt: new Date(),
            unsubscribedAt: null,
        },
    });
```

### Unsubscribe from newsletter

```typescript
await db
    .update(newsletterSubscriptions)
    .set({
        isActive: false,
        unsubscribedAt: new Date(),
    })
    .where(eq(newsletterSubscriptions.email, 'user@example.com'));
```

### Get active newsletter subscribers

```typescript
const subscribers = await db
    .select()
    .from(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.isActive, true));
```

---

## Designhinweise

- **`data` ist Text, nicht JSONB.** Die Benachrichtigungsspalte `data` wird als Nur-Text-Feld mit serialisiertem JSON gespeichert, nicht als `jsonb`-Spalte. Dies bedeutet, dass Sie beim Schreiben `JSON.stringify()` und beim Lesen `JSON.parse()` müssen. Abfragen können nicht nach Feldern innerhalb von `data` filtern.
- **Keine Tabelle mit Benachrichtigungseinstellungen.** Das aktuelle Schema enthält keine Tabelle mit Benutzerbenachrichtigungseinstellungen. Alle Benachrichtigungstypen werden an alle entsprechenden Benutzer übermittelt. Um Benachrichtigungseinstellungen pro Benutzer hinzuzufügen, müsste eine neue Tabelle `notification_preferences` erstellt werden.
- **Kaskadenlöschung.** Wenn ein Benutzer gelöscht wird, werden alle seine Benachrichtigungen automatisch über den CASCADE-Fremdschlüssel entfernt.
- **Newsletter ist unabhängig.** Die Tabelle `newsletterSubscriptions` ist nicht über einen Fremdschlüssel mit der Tabelle `users` verknüpft. Dies ist beabsichtigt – Newsletter-Abonnements können für nicht registrierte Besucher bestehen, die lediglich eine E-Mail-Adresse angeben.
- **Quellenverfolgung.** Das Feld `source` bei Newsletter-Abonnements verfolgt zu Analysezwecken, woher das Abonnement stammt (Fußzeilenformular, Popup usw.).
