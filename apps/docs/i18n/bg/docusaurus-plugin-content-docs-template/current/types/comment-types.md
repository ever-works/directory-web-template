---
id: comment-types
title: Дефиниции на типа коментар
sidebar_label: Типове коментари
sidebar_position: 4
---

# Дефиниции на типа коментар

**Източник:** `lib/types/comment.ts`

Коментарите позволяват на потребителите да оставят отзиви и отзиви за артикули. Типовете коментари се извеждат основно от схемата на базата данни на Drizzle ORM, като се гарантира, че остават в синхрон с миграциите на базата данни.

## Схема на база данни

Типовете `Comment` и `NewComment` се извеждат от таблицата `comments`, дефинирана в `lib/db/schema.ts`:

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

## Видове

### `Comment`

Изведен избран тип от схемата на базата данни. Представлява коментар, върнат от заявки към базата данни.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

Това се разрешава до обект със следната форма:

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

**Подробности за полето:**

|Поле|Тип|Описание|
|-------|------|-------------|
|`id`|`string`|Автоматично генериран UUID първичен ключ|
|`content`|`string`|Основен текст на коментара|
|`userId`|`string`|Външен ключ към `clientProfiles.id` (каскадно изтриване)|
|`itemId`|`string`|Охладител или ID на коментирания елемент|
|`rating`|`number`|Числова оценка (по подразбиране: 0)|
|`createdAt`|`Date`|Времево клеймо на създаване (с часова зона)|
|`updatedAt`|`Date`|Времево клеймо на последната актуализация (с часова зона)|
|`editedAt`|`Дата \|нула`|Времево клеймо на последната редакция, нула, ако никога не е редактирано|
|`deletedAt`|`Дата \|нула`|Времево клеймо за меко изтриване, нула, ако не е изтрито|

### `NewComment`

Изведен тип вмъкване от схемата на базата данни. Представлява данните, необходими за създаване на нов коментар.

```typescript
type NewComment = typeof comments.$inferInsert;
```

Това разрешава до обект, където автоматично генерираните и зададените по подразбиране полета не са задължителни:

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

Разширен тип коментар, който включва свързаните потребителски данни. Използва се при показване на коментари в потребителския интерфейс, където е необходима потребителска информация (име, аватар) заедно със съдържанието на коментара.

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

## Примери за използване

### Създаване на нов коментар

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### Запитване за коментари с потребителски данни

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

### Филтриране на безпроблемно изтрити коментари

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### Проверява се дали даден коментар е редактиран

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## Бележки по дизайна

### Защо типове, изведени от дъжд?

Типовете `Comment` и `NewComment` са получени от схемата Drizzle ORM с помощта на `$inferSelect` и `$inferInsert`. Този подход осигурява:

1. **Автоматично синхронизиране** - Типовете се актуализират автоматично, когато схемата се промени чрез миграции
2. **Разлика между вмъкване и избор** - `NewComment` маркира правилно автоматично генерираните полета като незадължителни
3. **Точност на базата данни** – Типовете съвпадат точно с типовете и ограниченията на колоните на базата данни

### Шаблон за меко изтриване

Коментарите използват поле `deletedAt` за меко изтриване:
- Ненулева стойност `deletedAt` означава, че коментарът е „изтрит“, но все още съществува в базата данни
- Заявките трябва да се филтрират по `deletedAt IS NULL`, за да се показват само активни коментари
- Полето `editedAt` е отделно от `updatedAt`, за да се разграничат системните актуализации от потребителските редакции

### Каскадно поведение

Полето `userId` има `CASCADE` политика за изтриване. Когато даден потребител бъде изтрит от `clientProfiles`, всички негови коментари се премахват автоматично от базата данни.

## Свързани типове

- [`Vote`](./vote-types.md) - Друг тип взаимодействие с потребителя за всеки елемент
- [`ItemData`](./item-types.md) - Родителският елемент, към който принадлежат коментарите
- [`Profile`](./user-types.md) - Данните от потребителския профил, посочени от `CommentWithUser.user`
