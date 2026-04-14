---
id: comment-types
title: Definizioni del tipo di commento
sidebar_label: Tipi di commento
sidebar_position: 4
---

# Definizioni del tipo di commento

**Fonte:** `lib/types/comment.ts`

I commenti consentono agli utenti di lasciare recensioni e feedback sugli articoli. I tipi di commento vengono principalmente dedotti dallo schema del database Drizzle ORM, garantendo che rimangano sincronizzati con le migrazioni del database.

## Schema della banca dati

I tipi `Comment` e `NewComment` vengono dedotti dalla tabella `comments` definita in `lib/db/schema.ts`:

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

## Tipi

### `Comment`

Tipo di selezione dedotto dallo schema del database. Rappresenta un commento restituito dalle query del database.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

Questo si risolve in un oggetto con la seguente forma:

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

**Dettagli campo:**

|Campo|Digitare|Descrizione|
|-------|------|-------------|
|`id`|`string`|Chiave primaria UUID generata automaticamente|
|`content`|`string`|Corpo del testo del commento|
|`userId`|`string`|Chiave esterna per `clientProfiles.id` (eliminazione a cascata)|
|`itemId`|`string`|Slug o ID dell'elemento commentato|
|`rating`|`number`|Valutazione numerica (impostazione predefinita: 0)|
|`createdAt`|`Date`|Timestamp di creazione (con fuso orario)|
|`updatedAt`|`Date`|Timestamp dell'ultimo aggiornamento (con fuso orario)|
|`editedAt`|"Data \|nullo`|Timestamp dell'ultima modifica, null se mai modificata|
|`deletedAt`|"Data \|nullo`|Timestamp di eliminazione temporanea, null se non eliminato|

### `NewComment`

Tipo di inserimento dedotto dallo schema del database. Rappresenta i dati necessari per creare un nuovo commento.

```typescript
type NewComment = typeof comments.$inferInsert;
```

Questo si risolve in un oggetto in cui i campi generati automaticamente e predefiniti sono facoltativi:

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

Tipo di commento esteso che include i relativi dati utente. Utilizzato quando si visualizzano commenti nell'interfaccia utente in cui sono necessarie informazioni sull'utente (nome, avatar) insieme al contenuto del commento.

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

## Esempi di utilizzo

### Creazione di un nuovo commento

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### Interrogazione di commenti con i dati dell'utente

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

### Filtrare i commenti eliminati temporaneamente

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### Controllare se un commento è stato modificato

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## Note di progettazione

### Perché i tipi dedotti da Drizzle?

I tipi `Comment` e `NewComment` derivano dallo schema Drizzle ORM utilizzando `$inferSelect` e `$inferInsert`. Questo approccio fornisce:

1. **Sincronizzazione automatica**: i tipi si aggiornano automaticamente quando lo schema cambia tramite migrazioni
2. **Distinzione tra inserimento e selezione** - `NewComment` contrassegna correttamente i campi generati automaticamente come facoltativi
3. **Precisione del database**: i tipi corrispondono esattamente ai tipi e ai vincoli delle colonne del database

### Modello di eliminazione graduale

I commenti utilizzano un campo `deletedAt` per l'eliminazione temporanea:
- Un valore `deletedAt` diverso da null indica che il commento è "eliminato" ma esiste ancora nel database
- Le query devono essere filtrate in base a `deletedAt IS NULL` per mostrare solo i commenti attivi
- Il campo `editedAt` è separato da `updatedAt` per distinguere gli aggiornamenti di sistema dalle modifiche dell'utente

### Comportamento a cascata

Il campo `userId` ha un criterio di eliminazione `CASCADE`. Quando un utente viene eliminato da `clientProfiles`, tutti i suoi commenti vengono automaticamente rimossi dal database.

## Tipi correlati

- [`Vote`](./vote-types.md) - Un altro tipo di interazione utente per elemento
- [`ItemData`](./item-types.md) - L'elemento principale a cui appartengono i commenti
- [`Profile`](./user-types.md) - I dati del profilo utente a cui fa riferimento `CommentWithUser.user`
