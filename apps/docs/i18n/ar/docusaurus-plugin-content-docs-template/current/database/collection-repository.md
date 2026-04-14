---
id: collection-repository
title: مستودع المجموعة
sidebar_label: مستودع المجموعة
sidebar_position: 20
---

# مستودع المجموعة

يدير `CollectionRepository` مجموعات منسقة من العناصر. فهو يوفر عمليات CRUD للمجموعات المخزنة في مستودع مدعوم من Git ويتعامل مع العلاقة ثنائية الاتجاه بين المجموعات والعناصر، بما في ذلك تعيين العناصر الدفعية مع دعم التراجع.

**الملف المصدر:** `template/lib/repositories/collection.repository.ts`

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

## تعريف الفئة

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### التبعيات

|استيراد|الغرض|
|--------|---------|
|`Collection`، `CreateCollectionRequest`، `UpdateCollectionRequest`|تعريفات النوع|
|`CollectionListOptions`، `COLLECTION_VALIDATION`|الخيارات وثوابت التحقق|
|`createCollectionGitService` / `CollectionGitService`|تخزين Git للمجموعات|
|`ItemRepository`|عمليات العناصر عبر الكيانات|
|`ItemData`، `UpdateItemRequest`|أنواع العناصر للمهمة|

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

إرجاع مجموعات مرقّمة باستخدام التقطيع في الذاكرة بعد تطبيق مرشحات `findAll`.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

الإعدادات الافتراضية: `page = 1`، `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

إرجاع قائمة خفيفة من العناصر غير المحذوفة المخصصة لمجموعة.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

يقوم بتحميل كافة العناصر (بما في ذلك المحذوفة)، والمرشحات لتلك العناصر التي تحتوي صفيفها `collections` على المعرف المحدد، وتستبعد العناصر المحذوفة مبدئيًا، وتقوم بإرجاع `id`، و`name`، و`slug` فقط.

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

يقوم بتحديث مجموعة موجودة. يجب أن يتضمن الكائن `data` الحقل `id`.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

التحقق من صحة قيود طول الاسم والوصف إذا تم توفير هذه الحقول.

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

العملية الأكثر تعقيدًا هي تعيين مجموعة من العناصر لمجموعة من خلال معالجة الأخطاء بأسلوب المعاملات.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**تدفق المعالجة:**

1. ** البحث عن المجموعة ** - الرميات إذا لم يتم العثور عليها
2. **إلغاء تكرار** البزاقات الواردة
3. **حساب الفرق** - يقارن العناصر الحالية مقابل العناصر الجديدة لتحديد الارتباطات الثابتة التي يجب إضافتها والارتباطات الثابتة التي سيتم إزالتها
4. **تحميل الدفعة** - يقوم بتحميل العناصر التي تحتاج إلى تغييرات فقط عبر `findManyBySlugs`
5. **إنشاء التحديثات** - بالنسبة للعناصر التي تتم إضافتها، يتم إلحاق معرف المجموعة بمصفوفة `collections` الخاصة بهم؛ بالنسبة للعناصر التي تتم إزالتها، قم بتوصيلها
6. **استمرار المجموعة** - كتابة المجموعة المحدثة أولاً
7. ** عناصر التحديث الدفعي ** - يستدعي `itemRepository.batchUpdate` لجميع العناصر التي تم تغييرها
8. **التراجع عند الفشل** -- إذا فشلت تحديثات العنصر، فستتم محاولة إعادة المجموعة إلى حالتها السابقة

إرجاع المجموعة المستمرة وعدد العناصر التي تم تعديلها بالفعل.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## ثوابت التحقق

يشير المستودع إلى `COLLECTION_VALIDATION` من `@/types/collection`:

|ثابت|الغرض|
|----------|---------|
|`ID_MIN_LENGTH`|الحد الأدنى لطول معرف المجموعة|
|`ID_MAX_LENGTH`|الحد الأقصى لطول معرف المجموعة|
|`NAME_MIN_LENGTH`|الحد الأدنى لطول اسم المجموعة|
|`NAME_MAX_LENGTH`|الحد الأقصى لطول اسم المجموعة|
|`DESCRIPTION_MAX_LENGTH`|الحد الأقصى لطول الوصف|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## مثال الاستخدام

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
