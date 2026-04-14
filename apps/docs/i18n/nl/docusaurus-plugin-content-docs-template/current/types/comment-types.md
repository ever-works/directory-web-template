---
id: comment-types
title: Definities van commentaartypes
sidebar_label: Typen opmerkingen
sidebar_position: 4
---

# Definities van commentaartypes

**Bron:** `lib/types/comment.ts`

Met opmerkingen kunnen gebruikers recensies en feedback over items achterlaten. De commentaartypen worden voornamelijk afgeleid van het Drizzle ORM-databaseschema, waardoor ze synchroon blijven met databasemigraties.

## Databaseschema

De typen `Comment` en `NewComment` worden afgeleid uit de tabel `comments` die is gedefinieerd in `lib/db/schema.ts`:

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

## Soorten

### `Comment`

Afgeleid selectietype uit het databaseschema. Vertegenwoordigt een opmerking zoals geretourneerd door databasequery's.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

Dit resulteert in een object met de volgende vorm:

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

**Veldgegevens:**

|Veld|Typ|Beschrijving|
|-------|------|-------------|
|`id`|`string`|Automatisch gegenereerde primaire UUID-sleutel|
|`content`|`string`|Teksttekst van commentaar|
|`userId`|`string`|Externe sleutel naar `clientProfiles.id` (trapsgewijze verwijdering)|
|`itemId`|`string`|Naaktslak of ID van het item waarop wordt gereageerd|
|`rating`|`number`|Numerieke beoordeling (standaard: 0)|
|`createdAt`|`Date`|Tijdstempel van creatie (met tijdzone)|
|`updatedAt`|`Date`|Tijdstempel van de laatste update (met tijdzone)|
|`editedAt`|`Datum \|nul`|Tijdstempel van de laatste bewerking, null als deze nooit is bewerkt|
|`deletedAt`|`Datum \|nul`|Tijdstempel voor zachte verwijdering, null indien niet verwijderd|

### `NewComment`

Afgeleid invoegtype uit het databaseschema. Vertegenwoordigt de gegevens die nodig zijn om een ​​nieuwe opmerking te maken.

```typescript
type NewComment = typeof comments.$inferInsert;
```

Dit leidt tot een object waarbij automatisch gegenereerde en standaardvelden optioneel zijn:

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

Uitgebreid commentaartype dat de gerelateerde gebruikersgegevens bevat. Wordt gebruikt bij het weergeven van opmerkingen in de gebruikersinterface waarbij gebruikersinformatie (naam, avatar) nodig is naast de inhoud van de opmerking.

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

## Gebruiksvoorbeelden

### Een nieuwe opmerking maken

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### Opmerkingen bevragen met gebruikersgegevens

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

### Voorlopig verwijderde reacties eruit filteren

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### Controleren of een opmerking is bewerkt

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## Ontwerpnotities

### Waarom door motregen afgeleide typen?

De typen `Comment` en `NewComment` zijn afgeleid van het Drizzle ORM-schema met behulp van `$inferSelect` en `$inferInsert`. Deze aanpak biedt:

1. **Automatische synchronisatie** - Typen worden automatisch bijgewerkt wanneer het schema via migraties verandert
2. **Onderscheid tussen invoegen en selecteren** - `NewComment` markeert automatisch gegenereerde velden correct als optioneel
3. **Databasenauwkeurigheid** - Typen komen exact overeen met de databasekolomtypen en -beperkingen

### Patroon zacht verwijderen

Opmerkingen gebruiken een `deletedAt`-veld voor zachte verwijdering:
- Een niet-null `deletedAt` waarde betekent dat de opmerking is "verwijderd", maar nog steeds bestaat in de database
- Zoekopdrachten moeten worden gefilterd op `deletedAt IS NULL` om alleen actieve opmerkingen weer te geven
- Het veld `editedAt` staat los van `updatedAt` om systeemupdates te onderscheiden van gebruikersbewerkingen

### Cascade-gedrag

Het `userId` veld heeft een `CASCADE` verwijderbeleid. Wanneer een gebruiker wordt verwijderd uit `clientProfiles`, worden al zijn opmerkingen automatisch uit de database verwijderd.

## Gerelateerde typen

- [`Vote`](./vote-types.md) - Een ander type gebruikersinteractie per item
- [`ItemData`](./item-types.md) - Het bovenliggende item waartoe opmerkingen behoren
- [`Profile`](./user-types.md) - De gebruikersprofielgegevens waarnaar wordt verwezen door `CommentWithUser.user`
