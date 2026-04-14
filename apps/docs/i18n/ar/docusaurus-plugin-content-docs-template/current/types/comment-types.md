---
id: comment-types
title: تعريفات نوع التعليق
sidebar_label: أنواع التعليق
sidebar_position: 4
---

# تعريفات نوع التعليق

**المصدر:** `lib/types/comment.ts`

تتيح التعليقات للمستخدمين ترك تعليقاتهم وتعليقاتهم على العناصر. يتم استنتاج أنواع التعليقات بشكل أساسي من مخطط قاعدة بيانات Drizzle ORM، مما يضمن بقائها متزامنة مع عمليات ترحيل قاعدة البيانات.

## مخطط قاعدة البيانات

يتم استنتاج الأنواع `Comment` و`NewComment` من الجدول `comments` المحدد في `lib/db/schema.ts`:

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

## أنواع

### `Comment`

نوع التحديد المستنتج من مخطط قاعدة البيانات. يمثل تعليقًا كما تم إرجاعه بواسطة استعلامات قاعدة البيانات.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

يؤدي هذا إلى حل كائن بالشكل التالي:

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

**تفاصيل الحقل:**

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`id`|`string`|مفتاح UUID الأساسي الذي تم إنشاؤه تلقائيًا|
|`content`|`string`|نص نص التعليق|
|`userId`|`string`|المفتاح الخارجي إلى `clientProfiles.id` (الحذف المتتالي)|
|`itemId`|`string`|سبيكة أو معرف العنصر الذي يتم التعليق عليه|
|`rating`|`number`|التصنيف الرقمي (الافتراضي: 0)|
|`createdAt`|`Date`|الطابع الزمني للإنشاء (مع المنطقة الزمنية)|
|`updatedAt`|`Date`|الطابع الزمني لآخر تحديث (مع المنطقة الزمنية)|
|`editedAt`|`التاريخ \|فارغة`|الطابع الزمني لآخر تعديل، لاغٍ إذا لم يتم تعديله مطلقًا|
|`deletedAt`|`التاريخ \|فارغة`|الطابع الزمني للحذف الناعم، سيكون فارغًا إذا لم يتم حذفه|

### `NewComment`

نوع الإدراج المستنتج من مخطط قاعدة البيانات. يمثل البيانات اللازمة لإنشاء تعليق جديد.

```typescript
type NewComment = typeof comments.$inferInsert;
```

يحل هذا الأمر مع كائن تكون فيه الحقول التي تم إنشاؤها تلقائيًا والحقول الافتراضية اختيارية:

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

نوع التعليق الموسع الذي يتضمن بيانات المستخدم ذات الصلة. يُستخدم عند عرض التعليقات في واجهة المستخدم حيث تكون معلومات المستخدم (الاسم والصورة الرمزية) مطلوبة بجانب محتوى التعليق.

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

## أمثلة الاستخدام

### إنشاء تعليق جديد

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### الاستعلام عن التعليقات مع بيانات المستخدم

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

### تصفية التعليقات المحذوفة بشكل بسيط

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### التحقق مما إذا تم تحرير التعليق

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## ملاحظات التصميم

### لماذا الأنواع المستنتجة بالرذاذ؟

يتم اشتقاق الأنواع `Comment` و`NewComment` من مخطط Drizzle ORM باستخدام `$inferSelect` و`$inferInsert`. يوفر هذا النهج:

1. **المزامنة التلقائية** - يتم تحديث الأنواع تلقائيًا عندما يتغير المخطط عبر عمليات الترحيل
2. **تمييز الإدراج مقابل التحديد** - `NewComment` يحدد بشكل صحيح الحقول التي تم إنشاؤها تلقائيًا على أنها اختيارية
3. **دقة قاعدة البيانات** - تتطابق الأنواع تمامًا مع أنواع وقيود أعمدة قاعدة البيانات

### نمط الحذف الناعم

تستخدم التعليقات حقل `deletedAt` للحذف المبسط:
- القيمة غير الفارغة `deletedAt` تعني أن التعليق "محذوف" ولكنه لا يزال موجودًا في قاعدة البيانات
- يجب تصفية الاستعلامات حسب `deletedAt IS NULL` لإظهار التعليقات النشطة فقط
- الحقل `editedAt` منفصل عن `updatedAt` لتمييز تحديثات النظام عن تعديلات المستخدم

### السلوك المتتالي

يحتوي الحقل `userId` على سياسة حذف `CASCADE`. عندما يتم حذف مستخدم من `clientProfiles`، تتم إزالة جميع تعليقاته تلقائيًا من قاعدة البيانات.

## الأنواع ذات الصلة

- [`Vote`](./vote-types.md) - نوع آخر لتفاعل المستخدم لكل عنصر
- [`ItemData`](./item-types.md) - العنصر الأصلي الذي تنتمي إليه التعليقات
- [`Profile`](./user-types.md) - بيانات ملف تعريف المستخدم المشار إليها بواسطة `CommentWithUser.user`
