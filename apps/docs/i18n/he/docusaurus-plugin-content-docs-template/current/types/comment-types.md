---
id: comment-types
title: הגדרות סוג הערה
sidebar_label: סוגי הערות
sidebar_position: 4
---

# הגדרות סוג הערה

**מקור:** `lib/types/comment.ts`

הערות מאפשרות למשתמשים להשאיר ביקורות ומשוב על פריטים. סוגי ההערות מוסקים בעיקר מסכימת מסד הנתונים של Drizzle ORM, מה שמבטיח שהם יישארו מסונכרנים עם העברות מסד הנתונים.

## סכמת מסד נתונים

הסוגים `Comment` ו-`NewComment` מוסקים מהטבלה `comments` המוגדרת ב-`lib/db/schema.ts`:

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

## סוגים

### `Comment`

סוג בחירה משוער מסכימת מסד הנתונים. מייצג הערה כפי שהוחזרה על ידי שאילתות מסד נתונים.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

זה נפתר לאובייקט עם הצורה הבאה:

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

**פרטי שדה:**

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`id`|`string`|מפתח ראשי UUID שנוצר באופן אוטומטי|
|`content`|`string`|גוף הטקסט של ההערה|
|`userId`|`string`|מפתח זר ל`clientProfiles.id` (מחיקה מדורגת)|
|`itemId`|`string`|שבלול או מזהה של הפריט שעליו מגיבים|
|`rating`|`number`|דירוג מספרי (ברירת מחדל: 0)|
|`createdAt`|`Date`|חותמת זמן של יצירה (עם אזור זמן)|
|`updatedAt`|`Date`|חותמת זמן של עדכון אחרון (עם אזור זמן)|
|`editedAt`|`תאריך \|null`|חותמת זמן של העריכה האחרונה, ריק אם מעולם לא נערך|
|`deletedAt`|`תאריך \|null`|חותמת זמן מחיקה רכה, ריק אם לא נמחק|

### `NewComment`

סוג הוספה משוער מסכימת מסד הנתונים. מייצג את הנתונים הדרושים ליצירת הערה חדשה.

```typescript
type NewComment = typeof comments.$inferInsert;
```

זה פותר לאובייקט שבו שדות שנוצרו אוטומטית ושדות ברירת מחדל הם אופציונליים:

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

סוג הערה מורחב הכולל את נתוני המשתמש הקשורים. משמש בעת הצגת הערות בממשק המשתמש שבו נדרש מידע משתמש (שם, דמות) לצד תוכן ההערות.

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

## דוגמאות לשימוש

### יצירת תגובה חדשה

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### שאילתת הערות עם נתוני משתמש

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

### סינון תגובות שנמחקו ברכות

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### בודק אם הערה נערכה

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## הערות עיצוב

### מדוע סוגים המבוססים על טפטוף?

הסוגים `Comment` ו-`NewComment` נגזרים מסכימת ה-Drizzle ORM באמצעות `$inferSelect` ו-`$inferInsert`. גישה זו מספקת:

1. **סנכרון אוטומטי** - סוגים מתעדכנים באופן אוטומטי כאשר הסכימה משתנה באמצעות העברות
2. **הבחנה הוספה לעומת בחירה** - `NewComment` מסמן נכון שדות שנוצרו אוטומטית כאופציונליים
3. **דיוק מסד הנתונים** - הסוגים תואמים בדיוק את סוגי העמודות והאילוצים של מסד הנתונים

### תבנית מחיקה רכה

הערות משתמשות בשדה `deletedAt` למחיקה רכה:
- ערך `deletedAt` שאינו ריק פירושו שהתגובה "נמחקה" אך עדיין קיימת במסד הנתונים
- יש לסנן שאילתות לפי `deletedAt IS NULL` כדי להציג רק הערות פעילות
- השדה `editedAt` נפרד מ`updatedAt` כדי להבחין בין עדכוני מערכת לבין עריכות של משתמשים

### התנהגות אשד

לשדה `userId` יש מדיניות מחיקה `CASCADE`. כאשר משתמש נמחק מ-`clientProfiles`, כל ההערות שלו מוסרות אוטומטית ממסד הנתונים.

## סוגים קשורים

- [`Vote`](./vote-types.md) - סוג אינטראקציה אחר של משתמש לכל פריט
- [`ItemData`](./item-types.md) - פריט האב שההערות שייכות לו
- [`Profile`](./user-types.md) - נתוני פרופיל המשתמש שאליהם מתייחסים `CommentWithUser.user`
