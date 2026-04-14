---
id: comment-types
title: Kommentartypdefinitionen
sidebar_label: Kommentartypen
sidebar_position: 4
---

# Kommentartypdefinitionen

**Quelle:** `lib/types/comment.ts`

Mithilfe von Kommentaren können Benutzer Bewertungen und Feedback zu Artikeln hinterlassen. Die Kommentartypen werden hauptsächlich aus dem Drizzle ORM-Datenbankschema abgeleitet, um sicherzustellen, dass sie mit Datenbankmigrationen synchron bleiben.

## Datenbankschema

Die Typen `Comment` und `NewComment` werden aus der Tabelle `comments` abgeleitet, die in `lib/db/schema.ts` definiert ist:

```typescript
// From lib/db/schema.ts
const comments = pgTable('comments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  content: text('content').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => clientProfiles.id, { onDelete: 'cascade' }),
  itemId: text('itemId').notNull(),
  rating: integer('rating').notNull().default(0),
  createdAt: timestamp('created_at', {
    mode: 'date',
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).notNull().defaultNow(),
  editedAt: timestamp('edited_at', {
    mode: 'date',
    withTimezone: true,
  }),
  deletedAt: timestamp('deleted_at', {
    mode: 'date',
    withTimezone: true,
  }),
});
```

## Typen

### `Comment`

Abgeleiteter Auswahltyp aus dem Datenbankschema. Stellt einen Kommentar dar, der von Datenbankabfragen zurückgegeben wird.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

Dies ergibt ein Objekt mit der folgenden Form:

```typescript
// Effective type (inferred from schema)
interface CommentShape {
  id: string;
  content: string;
  userId: string;
  itemId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}
```

**Felddetails:**

|Feld|Typ|Beschreibung|
|-------|------|-------------|
|`id`|`string`|Automatisch generierter UUID-Primärschlüssel|
|`content`|`string`|Textkörper des Kommentars|
|`userId`|`string`|Fremdschlüssel zu `clientProfiles.id` (kaskadierendes Löschen)|
|`itemId`|`string`|Slug oder ID des Artikels, der kommentiert wird|
|`rating`|`number`|Numerische Bewertung (Standard: 0)|
|`createdAt`|`Date`|Zeitstempel der Erstellung (mit Zeitzone)|
|`updatedAt`|`Date`|Zeitstempel der letzten Aktualisierung (mit Zeitzone)|
|`editedAt`|`Datum \|null`|Zeitstempel der letzten Bearbeitung, null, wenn nie bearbeitet|
|`deletedAt`|`Datum \|null`|Zeitstempel für vorläufiges Löschen, null, wenn nicht gelöscht|

### `NewComment`

Abgeleiteter Einfügetyp aus dem Datenbankschema. Stellt die Daten dar, die zum Erstellen eines neuen Kommentars erforderlich sind.

```typescript
type NewComment = typeof comments.$inferInsert;
```

Dies wird in ein Objekt aufgelöst, bei dem automatisch generierte und standardmäßige Felder optional sind:

```typescript
// Effective type (inferred from schema)
interface NewCommentShape {
  id?: string;       // Auto-generated if not provided
  content: string;   // Required
  userId: string;    // Required
  itemId: string;    // Required
  rating?: number;   // Defaults to 0
  createdAt?: Date;  // Defaults to now()
  updatedAt?: Date;  // Defaults to now()
  editedAt?: Date | null;
  deletedAt?: Date | null;
}
```

### `CommentWithUser`

Erweiterter Kommentartyp, der die zugehörigen Benutzerdaten enthält. Wird verwendet, wenn Kommentare in der Benutzeroberfläche angezeigt werden, wenn neben dem Kommentarinhalt auch Benutzerinformationen (Name, Avatar) erforderlich sind.

```typescript
interface CommentWithUser extends Comment {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}
```

## Anwendungsbeispiele

### Einen neuen Kommentar erstellen

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### Kommentare mit Benutzerdaten abfragen

```typescript
import type { CommentWithUser } from '@/lib/types/comment';

function renderComment(comment: CommentWithUser) {
  const authorName = comment.user.name ?? 'Anonymous';
  const isEdited = comment.editedAt !== null;
  const isDeleted = comment.deletedAt !== null;

  return {
    author: authorName,
    avatar: comment.user.image,
    text: isDeleted ? '[Comment deleted]' : comment.content,
    rating: comment.rating,
    date: comment.createdAt,
    edited: isEdited,
  };
}
```

### Vorläufig gelöschte Kommentare herausfiltern

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### Überprüfen, ob ein Kommentar bearbeitet wurde

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## Designhinweise

### Warum von Nieselregen abgeleitete Typen?

Die Typen `Comment` und `NewComment` werden aus dem Drizzle-ORM-Schema mithilfe von `$inferSelect` und `$inferInsert` abgeleitet. Dieser Ansatz bietet:

1. **Automatische Synchronisierung** – Typen werden automatisch aktualisiert, wenn sich das Schema durch Migrationen ändert
2. **Unterscheidung zwischen Einfügen und Auswählen** – `NewComment` markiert automatisch generierte Felder korrekt als optional
3. **Datenbankgenauigkeit** – Typen stimmen genau mit den Spaltentypen und Einschränkungen der Datenbank überein

### Soft-Delete-Muster

Kommentare verwenden ein `deletedAt`-Feld zum vorläufigen Löschen:
- Ein `deletedAt`-Wert ungleich Null bedeutet, dass der Kommentar „gelöscht“ wurde, aber noch in der Datenbank vorhanden ist
- Abfragen sollten nach `deletedAt IS NULL` gefiltert werden, um nur aktive Kommentare anzuzeigen
- Das Feld `editedAt` ist von `updatedAt` getrennt, um Systemaktualisierungen von Benutzeränderungen zu unterscheiden

### Kaskadenverhalten

Das Feld `userId` verfügt über eine Löschrichtlinie `CASCADE`. Wenn ein Benutzer aus `clientProfiles` gelöscht wird, werden alle seine Kommentare automatisch aus der Datenbank entfernt.

## Verwandte Typen

- [`Vote`](./vote-types.md) – Ein weiterer Benutzerinteraktionstyp pro Element
- [`ItemData`](./item-types.md) – Das übergeordnete Element, zu dem Kommentare gehören
- [`Profile`](./user-types.md) – Die Benutzerprofildaten, auf die von `CommentWithUser.user` verwiesen wird
