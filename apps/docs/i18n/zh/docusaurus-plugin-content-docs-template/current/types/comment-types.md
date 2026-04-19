---
id: comment-types
title: 评论类型定义
sidebar_label: 评论类型
sidebar_position: 4
---

# 评论类型定义

**来源：** `lib/types/comment.ts`

评论允许用户留下对项目的评论和反馈。评论类型主要从 Drizzle ORM 数据库架构中推断出来，确保它们与数据库迁移保持同步。

## 数据库架构

`Comment` 和 `NewComment` 类型是从 `lib/db/schema.ts` 中定义的 `comments` 表推断出来的：

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

## 类型

### `Comment`

从数据库模式推断选择类型。表示数据库查询返回的注释。

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

这将解析为具有以下形状的对象：

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

**字段详细信息：**

|领域|类型|描述|
|-------|------|-------------|
|`id`|`string`|自动生成 UUID 主键|
|`content`|`string`|评论正文|
|`userId`|`string`|外键`clientProfiles.id`（级联删除）|
|`itemId`|`string`|正在评论的项目的 Slug 或 ID|
|`rating`|`number`|数字评级（默认值：0）|
|`createdAt`|`Date`|创建时间戳（带时区）|
|`updatedAt`|`Date`|上次更新的时间戳（带时区）|
|`editedAt`|`日期\|空`|最后一次编辑的时间戳，如果从未编辑过则为 null|
|`deletedAt`|`日期\|空`|软删除时间戳，不删除则为null|

### `NewComment`

从数据库架构推断插入类型。表示创建新评论所需的数据。

```typescript
type NewComment = typeof comments.$inferInsert;
```

这解析为一个对象，其中自动生成的字段和默认字段是可选的：

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

包含相关用户数据的扩展评论类型。在 UI 中显示评论时使用，其中需要用户信息（姓名、头像）以及评论内容。

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

## 使用示例

### 创建新评论

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### 使用用户数据查询评论

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

### 过滤掉软删除的评论

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### 检查评论是否已被编辑

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## 设计笔记

### 为什么是毛毛雨推断类型？

`Comment` 和 `NewComment` 类型是使用 `$inferSelect` 和 `$inferInsert` 从 Drizzle ORM 模式派生的。这种方法提供：

1. **自动同步** - 当架构通过迁移发生更改时，类型会自动更新
2. **插入与选择的区别** - `NewComment` 正确地将自动生成的字段标记为可选
3. **数据库准确性** - 类型与数据库列类型和约束完全匹配

### 软删除模式

评论使用 `deletedAt` 字段进行软删除：
- 非空 `deletedAt` 值表示评论已“删除”但仍然存在于数据库中
- 查询应按 `deletedAt IS NULL` 过滤以仅显示活跃评论
- `editedAt` 字段与 `updatedAt` 分开，以区分系统更新和用户编辑

### 级联行为

`userId` 字段具有 `CASCADE` 删除策略。当用户从`clientProfiles` 中删除时，他们的所有评论都会自动从数据库中删除。

## 相关类型

- [`Vote`](./vote-types.md) - 另一种每项用户交互类型
- [`ItemData`](./item-types.md) - 评论所属的父项目
- [`Profile`](./user-types.md) - `CommentWithUser.user` 引用的用户配置文件数据
