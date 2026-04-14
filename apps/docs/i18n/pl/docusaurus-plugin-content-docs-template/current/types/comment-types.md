---
id: comment-types
title: Definicje typów komentarzy
sidebar_label: Typy komentarzy
sidebar_position: 4
---

# Definicje typów komentarzy

**Źródło:** `lib/types/comment.ts`

Komentarze umożliwiają użytkownikom pozostawianie recenzji i opinii na temat przedmiotów. Typy komentarzy są ustalane głównie na podstawie schematu bazy danych Drizzle ORM, co zapewnia ich synchronizację z migracjami baz danych.

## Schemat bazy danych

Typy `Comment` i `NewComment` wynikają z tabeli `comments` zdefiniowanej w `lib/db/schema.ts`:

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

## Typy

### `Comment`

Wywnioskowany typ wyboru ze schematu bazy danych. Reprezentuje komentarz zwracany przez zapytania do bazy danych.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

Powoduje to utworzenie obiektu o następującym kształcie:

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

**Szczegóły pola:**

|Pole|Wpisz|Opis|
|-------|------|-------------|
|`id`|`string`|Automatycznie wygenerowany klucz podstawowy UUID|
|`content`|`string`|Treść tekstu komentarza|
|`userId`|`string`|Klucz obcy do `clientProfiles.id` (kaskadowe usuwanie)|
|`itemId`|`string`|Ślimak lub identyfikator komentowanego elementu|
|`rating`|`number`|Ocena numeryczna (domyślnie: 0)|
|`createdAt`|`Date`|Znacznik czasu utworzenia (ze strefą czasową)|
|`updatedAt`|`Date`|Znacznik czasu ostatniej aktualizacji (ze strefą czasową)|
|`editedAt`|`Data \|null`|Znacznik czasu ostatniej edycji, wartość null, jeśli nigdy nie była edytowana|
|`deletedAt`|`Data \|null`|Sygnatura czasowa usuwania nietrwałego, wartość null, jeśli nie została usunięta|

### `NewComment`

Wywnioskowany typ wstawiania ze schematu bazy danych. Reprezentuje dane potrzebne do utworzenia nowego komentarza.

```typescript
type NewComment = typeof comments.$inferInsert;
```

Prowadzi to do obiektu, w którym pola generowane automatycznie i domyślne są opcjonalne:

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

Rozszerzony typ komentarza, który zawiera powiązane dane użytkownika. Używane podczas wyświetlania komentarzy w interfejsie użytkownika, gdy obok treści komentarza potrzebne są informacje o użytkowniku (imię i awatar).

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

## Przykłady użycia

### Tworzenie nowego komentarza

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### Odpytywanie komentarzy z danymi użytkownika

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

### Filtrowanie nietrafnie usuniętych komentarzy

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### Sprawdzanie, czy komentarz został edytowany

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## Uwagi do projektu

### Dlaczego typy wywnioskowane przez mżawkę?

Typy `Comment` i `NewComment` wywodzą się ze schematu Drizzle ORM przy użyciu `$inferSelect` i `$inferInsert`. Takie podejście zapewnia:

1. **Automatyczna synchronizacja** — typy są aktualizowane automatycznie po zmianie schematu w wyniku migracji
2. **Wstaw i wybierz rozróżnienie** - `NewComment` poprawnie oznacza pola wygenerowane automatycznie jako opcjonalne
3. **Dokładność bazy danych** — typy dokładnie odpowiadają typom kolumn bazy danych i ograniczeniom

### Miękki wzór usuwania

W komentarzach używane jest pole `deletedAt` do trwałego usuwania:
- Wartość `deletedAt` różna od null oznacza, że komentarz został „usunięty”, ale nadal istnieje w bazie danych
- Zapytania powinny być filtrowane według `deletedAt IS NULL`, aby wyświetlić tylko aktywne komentarze
- Pole `editedAt` jest oddzielone od pola `updatedAt`, aby odróżnić aktualizacje systemu od zmian dokonanych przez użytkownika

### Zachowanie kaskadowe

Pole `userId` ma politykę usuwania `CASCADE`. Kiedy użytkownik zostanie usunięty z `clientProfiles`, wszystkie jego komentarze zostaną automatycznie usunięte z bazy danych.

## Powiązane typy

- [`Vote`](./vote-types.md) — Inny typ interakcji użytkownika dotyczący elementu
- [`ItemData`](./item-types.md) — Element nadrzędny, do którego należą komentarze
- [`Profile`](./user-types.md) — Dane profilu użytkownika, do których odwołuje się `CommentWithUser.user`
