---
id: collection-repository
title: מאגר אוספים
sidebar_label: מאגר אוספים
sidebar_position: 20
---

# מאגר אוספים

ה-`CollectionRepository` מנהל אוספים אוצרת של פריטים. הוא מספק פעולות CRUD עבור אוספים המאוחסנים במאגר עם גיבוי של Git ומטפל ביחסים הדו-כיווניים בין אוספים ופריטים, כולל הקצאת פריט אצווה עם תמיכה ב-rollback.

**קובץ מקור:** `template/lib/repositories/collection.repository.ts`

---

## Architecture Overview

```
Admin Collection UI
        |
  API Route / Server Action
        |
  CollectionRepository
        |
  +-----+-----+
  |             |
CollectionGitService   ItemRepository
  (collections.yml)    (item files)
```

Collections are stored in a YAML file within the Git repository. Each collection maintains a list of item slugs. When items are assigned or removed, both the collection record and the individual item records are updated.

> **Note:** This file uses the `'server-only'` import guard to prevent accidental client-side usage.

---

## הגדרת כיתה

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### תלות

|ייבוא|מטרה|
|--------|---------|
|`Collection`, `CreateCollectionRequest`, `UpdateCollectionRequest`|הגדרות סוג|
|`CollectionListOptions`, `COLLECTION_VALIDATION`|אפשרויות וקבועי אימות|
|`createCollectionGitService` / `CollectionGitService`|Git אחסון לאוספים|
|`ItemRepository`|פעולות של פריט בין ישויות|
|`ItemData`, `UpdateItemRequest`|סוגי פריטים להקצאה|

---

## Query Methods

### `findAll(options?): Promise<Collection[]>`

Returns all collections with optional filtering and sorting.

```ts
async findAll(options: CollectionListOptions = {}): Promise<Collection[]>
```

**Behavior:**
- Computes `item_count` from the items array length on each collection
- Filters out inactive collections unless `options.includeInactive` is true
- Applies case-insensitive search across `name`, `slug`, and `description`
- Supports sorting by `name` (default), `item_count`, or `created_at`
- Supports `asc` (default) or `desc` sort order

---

### `findAllPaginated(options?): Promise<PaginatedResult>`

מחזיר אוספים מעומדים באמצעות חיתוך בזיכרון לאחר החלת מסננים `findAll`.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

ברירות מחדל: `page = 1`, `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

מחזירה רשימה קלה של פריטים שלא נמחקו שהוקצו לאוסף.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

טוען את כל הפריטים (כולל שנמחקו), מסננים לאלה שמערך `collections` שלהם מכיל את המזהה הנתון, לא כולל פריטים שנמחקו בצורה רכה, ומחזיר רק `id`, `name`, ו-`slug`.

---

## Mutation Methods

### `create(data): Promise<Collection>`

Creates a new collection after validation.

```ts
async create(data: CreateCollectionRequest): Promise<Collection>
```

**Validation rules** (from `COLLECTION_VALIDATION` constants):
- `id` must be between `ID_MIN_LENGTH` and `ID_MAX_LENGTH` characters
- `id` must match `/^[a-z0-9-]+$/`
- `name` must be between `NAME_MIN_LENGTH` and `NAME_MAX_LENGTH` characters
- `description` must not exceed `DESCRIPTION_MAX_LENGTH` characters

---

### `update(data): Promise<Collection>`

מעדכן אוסף קיים. האובייקט `data` חייב לכלול את השדה `id`.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

מאמת את אילוצי אורך השם והתיאור אם שדות אלה מסופקים.

---

### `delete(id): Promise<void>`

Deletes a collection and removes its ID from all items that reference it.

```ts
async delete(id: string): Promise<void>
```

**Processing steps:**

1. Loads all items (including deleted) from the item repository
2. For each item whose `collections` array contains this collection ID, removes the reference and saves the update
3. Deletes the collection record from Git

---

### `assignItems(collectionId, itemSlugs): Promise<AssignResult>`

הפעולה המורכבת ביותר -- מקצה קבוצה של פריטים לאוסף עם טיפול בשגיאות בסגנון עסקה.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**זרימת עיבוד:**

1. **מצא אוסף** -- זריקות אם לא נמצא
2. **כפילו** שבלולים נכנסים
3. **חישוב הבדל** -- משווה פריטים נוכחיים לעומת פריטים חדשים כדי לזהות שבלולים להוספה ושבלולים להסרה
4. **טעינת אצווה** -- טוען רק את הפריטים שצריכים שינויים דרך `findManyBySlugs`
5. **עדכוני בנייה** -- עבור פריטים שנוספים, מוסיף את מזהה האוסף למערך `collections` שלהם; עבור פריטים שמוסרים, מחבר אותו החוצה
6. **המשיכי אוסף** -- כותב תחילה את האוסף המעודכן
7. **פריטי עדכון אצווה** -- שיחות `itemRepository.batchUpdate` עבור כל הפריטים שהשתנו
8. **החזרה לאחור על כישלון** -- אם עדכוני הפריטים נכשלים, ניסיונות להחזיר את האוסף למצבו הקודם

מחזירה את האוסף המתמשך ואת מספר הפריטים ששונו בפועל.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## קבועי אימות

המאגר מפנה ל-@@TOK000@@@ מ-`@/types/collection`:

|קבוע|מטרה|
|----------|---------|
|`ID_MIN_LENGTH`|אורך מזהה איסוף מינימלי|
|`ID_MAX_LENGTH`|אורך מזהה איסוף מקסימלי|
|`NAME_MIN_LENGTH`|אורך שם אוסף מינימלי|
|`NAME_MAX_LENGTH`|אורך שם אוסף מקסימלי|
|`DESCRIPTION_MAX_LENGTH`|אורך תיאור מקסימלי|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## דוגמה לשימוש

```ts
import { collectionRepository } from '@/lib/repositories/collection.repository';

// List active collections sorted by item count
const collections = await collectionRepository.findAll({
  sortBy: 'item_count',
  sortOrder: 'desc',
});

// Assign items to a collection
const result = await collectionRepository.assignItems(
  'featured-2025',
  ['item-slug-1', 'item-slug-2', 'item-slug-3']
);
console.log(`Updated ${result.updatedItems} items`);

// Get items in a collection
const items = await collectionRepository.getAssignedItems('featured-2025');
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/services/collection-git.service.ts` | Git storage backend |
| `lib/repositories/item.repository.ts` | Item CRUD and batch operations |
| `@/types/collection.ts` | Type definitions and validation constants |
