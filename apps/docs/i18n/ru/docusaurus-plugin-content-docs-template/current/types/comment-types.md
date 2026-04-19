---
id: comment-types
title: Определения типов комментариев
sidebar_label: Типы комментариев
sidebar_position: 4
---

# Определения типов комментариев

**Источник:** `lib/types/comment.ts`

Комментарии позволяют пользователям оставлять отзывы и отзывы о товарах. Типы комментариев в основном выводятся из схемы базы данных Drizzle ORM, что обеспечивает их синхронизацию с миграцией базы данных.

## Схема базы данных

Типы `Comment` и `NewComment` выводятся из таблицы `comments`, определенной в `lib/db/schema.ts`:

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

## Типы

### `Comment`

Предполагаемый тип выбора из схемы базы данных. Представляет комментарий, возвращаемый запросами к базе данных.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

Это приводит к объекту следующей формы:

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

**Детали поля:**

|Поле|Тип|Описание|
|-------|------|-------------|
|`id`|`string`|Автоматически сгенерированный первичный ключ UUID|
|`content`|`string`|Текст комментария|
|`userId`|`string`|Внешний ключ для `clientProfiles.id` (каскадное удаление)|
|`itemId`|`string`|Слаг или идентификатор комментируемого элемента|
|`rating`|`number`|Числовой рейтинг (по умолчанию: 0)|
|`createdAt`|`Date`|Временная метка создания (с часовым поясом)|
|`updatedAt`|`Date`|Временная метка последнего обновления (с часовым поясом)|
|`editedAt`|`Дата \|ноль`|Временная метка последнего редактирования, ноль, если никогда не редактировалось|
|`deletedAt`|`Дата \|ноль`|Временная метка мягкого удаления, ноль, если не удалена|

### `NewComment`

Предполагаемый тип вставки из схемы базы данных. Представляет данные, необходимые для создания нового комментария.

```typescript
type NewComment = typeof comments.$inferInsert;
```

Это приводит к объекту, в котором автоматически сгенерированные поля и поля по умолчанию являются необязательными:

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

Расширенный тип комментария, включающий соответствующие данные пользователя. Используется при отображении комментариев в пользовательском интерфейсе, где наряду с содержимым комментария требуется информация о пользователе (имя, аватар).

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

## Примеры использования

### Создание нового комментария

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### Запрос комментариев с пользовательскими данными

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

### Фильтрация мягко удаляемых комментариев

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### Проверка, был ли отредактирован комментарий

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## Примечания к проектированию

### Почему типы, связанные с моросящим дождем?

Типы `Comment` и `NewComment` получены из схемы ORM Drizzle с использованием `$inferSelect` и `$inferInsert`. Этот подход обеспечивает:

1. **Автоматическая синхронизация** – типы обновляются автоматически при изменении схемы в результате миграции.
2. **Различие «Вставка» и «Выбор»** — `NewComment` правильно помечает автоматически созданные поля как необязательные.
3. **Точность базы данных** – типы точно соответствуют типам и ограничениям столбцов базы данных.

### Мягкое удаление шаблона

В комментариях используется поле `deletedAt` для мягкого удаления:
- Ненулевое значение `deletedAt` означает, что комментарий «удален», но все еще существует в базе данных.
- Запросы следует фильтровать по `deletedAt IS NULL`, чтобы отображались только активные комментарии.
- Поле `editedAt` отделено от `updatedAt`, чтобы отличать обновления системы от изменений пользователя.

### Каскадное поведение

Поле `userId` имеет политику удаления `CASCADE`. При удалении пользователя из `clientProfiles` все его комментарии автоматически удаляются из базы данных.

## Связанные типы

- [`Vote`](./vote-types.md) — еще один тип взаимодействия с пользователем для каждого элемента.
- [`ItemData`](./item-types.md) — родительский элемент, к которому принадлежат комментарии.
- [`Profile`](./user-types.md) — данные профиля пользователя, на которые ссылается `CommentWithUser.user`.
