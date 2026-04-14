---
id: engagement-queries-deep-dive
title: استعلامات المشاركة، نظرة عميقة
sidebar_label: استعلامات المشاركة، نظرة عميقة
sidebar_position: 64
---

# استعلامات المشاركة، نظرة عميقة

مرجع شامل لجميع وظائف استعلام قاعدة البيانات المتعلقة بالتفاعل، بما في ذلك الأصوات والتعليقات والمفضلات وطرق العرض والتقييمات ومقاييس الشعبية المجمعة.

## نظرة عامة

يتم تنظيم طبقة استعلام المشاركة في ثلاث وحدات متخصصة:

- **`engagement.queries.ts`** - تجميع مقاييس المشاركة الجماعية لتسجيل الشعبية (المشاهدات، الأصوات، المفضلة، التعليقات، التقييمات)
- **`vote.queries.ts`** - عمليات التصويت CRUD، وحسابات النتيجة الصافية، وفرز العناصر على أساس التصويت
- **`comment.queries.ts`** - عمليات التعليق CRUD مع تفاصيل المستخدم والحذف المبسط وإدارة التصنيف

## ملفات المصدر

```
lib/db/queries/engagement.queries.ts
lib/db/queries/vote.queries.ts
lib/db/queries/comment.queries.ts
```

---

## Function Reference: engagement.queries.ts

### `ItemEngagementMetrics` (Interface)

```typescript
interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

### `getEngagementMetricsPerItem`

Gets all engagement metrics for multiple items in a single query batch. Optimized for bulk operations like sorting all items by popularity.

```typescript
async function getEngagementMetricsPerItem(
  itemSlugs: string[]
): Promise<Map<string, ItemEngagementMetrics>>
```

**Parameters:**

| Parameter   | Type       | Required | Description               |
|-------------|------------|----------|---------------------------|
| `itemSlugs` | `string[]` | Yes      | Array of item slugs       |

**Returns:** `Promise<Map<string, ItemEngagementMetrics>>` -- Map of item slug to full engagement metrics

**SQL Pattern:** Runs four queries in parallel using `Promise.all`:

1. **Views per item:**
   ```sql
   SELECT item_id, count(*) FROM item_views
   WHERE item_id IN (...) GROUP BY item_id;
   ```

2. **Net votes per item (upvotes - downvotes):**
   ```sql
   SELECT item_id,
     SUM(CASE WHEN vote_type = 'upvote' THEN 1
              WHEN vote_type = 'downvote' THEN -1
              ELSE 0 END) as net_score
   FROM votes WHERE item_id IN (...) GROUP BY item_id;
   ```

3. **Favorites per item:**
   ```sql
   SELECT item_slug, count(*) FROM favorites
   WHERE item_slug IN (...) GROUP BY item_slug;
   ```

4. **Comments count and average rating:**
   ```sql
   SELECT item_id, count(*), COALESCE(AVG(rating), 0) as avg_rating
   FROM comments
   WHERE item_id IN (...) AND deleted_at IS NULL
   GROUP BY item_id;
   ```

**Performance Notes:**
- All four queries run concurrently via `Promise.all`
- Empty array guard avoids unnecessary database calls
- Results merged in-memory into a single Map
- Items with no engagement data receive default zeros

---

### `getFavoritesPerItem`

يحصل على عدد المفضلة لكل عنصر.

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|نعم|مجموعة من البزاقات البند|

**المرتجعات:** `Promise<Map<string, number>>` - خريطة العنصر الثابت لعدد المفضلة

**ملاحظة:** يستعلم عن الجدول `favorites` باستخدام `itemSlug` (وليس `itemId`)، مما يعكس اصطلاح تسمية المخطط لهذا الجدول.

---

### `getCommentsPerItem`

Gets comments count and average rating per item.

```typescript
async function getCommentsPerItem(
  itemSlugs: string[]
): Promise<Map<string, { count: number; avgRating: number }>>
```

**Returns:** `Promise<Map<string, { count: number; avgRating: number }>>` -- Map of item slug to comment count and average rating

**SQL Pattern:**

```sql
SELECT item_id, count(*), COALESCE(AVG(rating), 0) as avg_rating
FROM comments
WHERE item_id IN (...) AND deleted_at IS NULL
GROUP BY item_id;
```

**Note:** Excludes soft-deleted comments (`deleted_at IS NULL`).

---

## مرجع الوظيفة: voice.queries.ts

### `createVote`

يخلق تصويت جديد. تطبيع معرف العنصر عبر `getItemIdFromSlug` قبل الإدراج.

```typescript
async function createVote(vote: InsertVote)
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|نعم|بيانات التصويت مع سبيكة العنصر|

** العوائد: ** سجل التصويت الذي تم إنشاؤه (عبر `RETURNING`)

** نمط SQL: **

```sql
INSERT INTO votes (user_id, item_id, vote_type, ...)
VALUES (?, ?, ?, ...) RETURNING *;
```

---

### `getVoteByUserIdAndItemId`

Gets a user's vote on a specific item.

```typescript
async function getVoteByUserIdAndItemId(
  userId: string,
  itemSlug: string
)
```

**Parameters:**

| Parameter  | Type     | Required | Description |
|------------|----------|----------|-------------|
| `userId`   | `string` | Yes      | User ID     |
| `itemSlug` | `string` | Yes      | Item slug   |

**Returns:** Vote array (empty if not found, single element if found)

**SQL Pattern:**

```sql
SELECT * FROM votes
WHERE user_id = ? AND item_id = ?
LIMIT 1;
```

---

### `deleteVote`

يحذف التصويت بواسطة المعرف بشكل دائم.

```typescript
async function deleteVote(voteId: string)
```

** نمط SQL: **

```sql
DELETE FROM votes WHERE id = ?;
```

---

### `getItemsSortedByVotes`

Gets items sorted by total vote count with pagination.

```typescript
async function getItemsSortedByVotes(
  limit: number = 10,
  offset: number = 0
)
```

**Parameters:**

| Parameter | Type     | Required | Default | Description        |
|-----------|----------|----------|---------|--------------------|
| `limit`   | `number` | No       | `10`    | Results per page   |
| `offset`  | `number` | No       | `0`     | Pagination offset  |

**Returns:** Array of `{ itemId: string, voteCount: number }` sorted by vote count descending

**SQL Pattern:**

```sql
SELECT item_id, count(id) as vote_count
FROM votes
GROUP BY item_id
ORDER BY vote_count DESC
LIMIT ? OFFSET ?;
```

---

### `getVoteCountForItem`

الحصول على صافي نقاط التصويت لعنصر واحد (الأصوات المؤيدة ناقص الأصوات السلبية).

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**العائدات:** صافي نتيجة التصويت (الإيجابي = المزيد من الأصوات المؤيدة، السالب = المزيد من الأصوات السلبية، 0 = أصوات متساوية أو معدومة)

** نمط SQL: **

```sql
SELECT SUM(CASE
  WHEN vote_type = 'upvote' THEN 1
  WHEN vote_type = 'downvote' THEN -1
  ELSE 0
END) as net_score
FROM votes WHERE item_id = ?;
```

---

### `getVotesPerItem`

Gets net vote scores for multiple items.

```typescript
async function getVotesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Returns:** `Promise<Map<string, number>>` -- Map of item slug to net vote score

---

## مرجع الوظيفة: comment.queries.ts

### `createComment`

إنشاء تعليق جديد. تطبيع `itemId` عبر `getItemIdFromSlug`.

```typescript
async function createComment(data: NewComment)
```

**المرتجعات:** سجل التعليق الذي تم إنشاؤه

---

### `getCommentsByItemId`

Gets all non-deleted comments for an item with user information, ordered by most recent first.

```typescript
async function getCommentsByItemId(
  itemSlug: string
): Promise<CommentWithUser[]>
```

**Returns:** Array of `CommentWithUser` including:
- Comment fields: `id`, `content`, `rating`, `createdAt`, `updatedAt`, `editedAt`, `deletedAt`
- User fields: `user.id`, `user.name`, `user.email`, `user.image`

**SQL Pattern:**

```sql
SELECT comments.*, client_profiles.id, name, email, avatar
FROM comments
INNER JOIN client_profiles ON comments.user_id = client_profiles.id
WHERE comments.item_id = ? AND comments.deleted_at IS NULL
ORDER BY comments.created_at DESC;
```

---

### `getCommentById`

يحصل على تعليق بواسطة المعرف (بدون تفاصيل المستخدم).

```typescript
async function getCommentById(id: string)
```

---

### `getCommentWithUserById`

Gets a comment by ID with user information.

```typescript
async function getCommentWithUserById(
  id: string
): Promise<CommentWithUser | undefined>
```

---

### `updateComment`

تحديث محتوى التعليق و/أو التصنيف. قم بتعيين كلاً من `updatedAt` و`editedAt` لتتبع سجل التحرير.

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

** نمط SQL: **

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**ملاحظة التصميم:** `editedAt` منفصل عن `updatedAt` لتمييز تعديلات المستخدم عن تحديثات النظام. يمكن لواجهة المستخدم عرض المؤشرات "المحررة" بناءً على `editedAt`.

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

يقوم Soft بحذف التعليق عن طريق تعيين `deletedAt`.

```typescript
async function deleteComment(id: string)
```

** نمط SQL: **

```sql
UPDATE comments SET deleted_at = NOW() WHERE id = ? RETURNING *;
```

---

## Shared Types

### `CommentWithUser`

```typescript
type CommentWithUser = {
  id: string;
  content: string;
  rating: number | null;
  userId: string;
  itemId: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};
```

---

## ملاحظات الأداء

1. **تنفيذ الاستعلام المتوازي** -- `getEngagementMetricsPerItem` يقوم بتشغيل جميع الاستعلامات المترية الأربعة بشكل متزامن عبر `Promise.all`، مما يقلل زمن الوصول الإجمالي إلى أبطأ استعلام فردي.

2. ** صافي نقاط التصويت ** - يستخدم تعبيرات `CASE WHEN` في SQL لحساب التصويت الإيجابي/التصويت السلبي، مع تجنب الاستعلامات المنفصلة لكل نوع تصويت.

3. **تصفية الحذف الناعم** - تقوم جميع استعلامات التعليقات بتصفية `deleted_at IS NULL` بشكل متسق لاستبعاد التعليقات المحذوفة ناعمًا.

4. **تطبيع البزاقات الثابتة** - يقوم كل من `vote.queries.ts` و`comment.queries.ts` بتسوية البزاقات الثابتة للعناصر عبر `getItemIdFromSlug` قبل عمليات قاعدة البيانات، مما يضمن مطابقة المفاتيح بشكل متسق.

5. ** حراس المصفوفات الفارغة ** - تعود جميع وظائف الاستعلام المجمع فورًا بخرائط فارغة عند تمرير مصفوفات فارغة.

## أمثلة الاستخدام

### فرز العناصر حسب الشعبية

```typescript
import { getEngagementMetricsPerItem } from '@/lib/db/queries';

const metrics = await getEngagementMetricsPerItem(allItemSlugs);

const sorted = allItemSlugs.sort((a, b) => {
  const ma = metrics.get(a) ?? { votes: 0, views: 0, favorites: 0, comments: 0 };
  const mb = metrics.get(b) ?? { votes: 0, views: 0, favorites: 0, comments: 0 };
  const scoreA = ma.votes * 3 + ma.favorites * 2 + ma.comments + ma.views * 0.1;
  const scoreB = mb.votes * 3 + mb.favorites * 2 + mb.comments + mb.views * 0.1;
  return scoreB - scoreA;
});
```

### تبديل التصويت على عنصر

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### جلب التعليقات لصفحة العنصر

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
