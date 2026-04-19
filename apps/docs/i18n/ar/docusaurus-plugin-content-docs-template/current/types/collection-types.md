---
id: collection-types
title: تعريفات نوع المجموعة
sidebar_label: أنواع المجموعات
sidebar_position: 15
---

# تعريفات نوع المجموعة

**المصدر:** `types/collection.ts`

المجموعات عبارة عن مجموعات منسقة من العناصر مرتبة حسب الموضوع. إنها تسمح للمسؤولين بإنشاء قوائم منتقاة بعناية مثل "أفضل الاختيارات" أو "الجديد هذا الأسبوع" أو "الأفضل للمؤسسات".

## واجهات

### `Collection`

هيكل بيانات المجموعة الأولية.

```typescript
interface Collection {
  id: string;              // Unique identifier (slug-friendly)
  slug: string;            // URL-safe slug
  name: string;            // Display name
  description: string;     // Collection description
  icon_url?: string;       // Optional icon/image URL
  item_count: number;      // Number of items in collection
  items?: string[];        // Array of item IDs assigned to this collection
  isActive: boolean;       // Whether the collection is publicly visible
  created_at?: string;     // ISO 8601 creation timestamp
  updated_at?: string;     // ISO 8601 last update timestamp
}
```

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`id`|`string`|المعرف الفريد، من 3 إلى 50 حرفًا|
|`slug`|`string`|نسخة آمنة من الاسم URL|
|`name`|`string`|اسم العرض، 2-100 حرف|
|`description`|`string`|وصف نصي عادي، بحد أقصى 500 حرف|
|`icon_url`|`string?`|عنوان URL للأيقونة أو صورة الغلاف|
|`item_count`|`number`|العدد المحسوب للعناصر المخصصة|
|`items`|`string[]?`|معرفات العناصر؛ يتم ملؤها فقط عند الطلب|
|`isActive`|`boolean`|يتحكم في الرؤية العامة|

### `CreateCollectionRequest`

الحمولة لإنشاء مجموعة جديدة.

```typescript
interface CreateCollectionRequest {
  id: string;
  name: string;
  slug?: string;         // Auto-generated from name if omitted
  description?: string;
  icon_url?: string;
  isActive?: boolean;    // Defaults to true
}
```

### `UpdateCollectionRequest`

الحمولة لتحديث مجموعة موجودة. كافة الحقول باستثناء `id` اختيارية.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

الحمولة لتعيين العناصر إلى المجموعة.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

معلمات الاستعلام لمجموعات القائمة.

```typescript
interface CollectionListOptions {
  includeInactive?: boolean;                          // Default: false
  search?: string;                                     // Filter by name
  sortBy?: 'name' | 'item_count' | 'created_at';     // Default: 'name'
  sortOrder?: 'asc' | 'desc';                         // Default: 'asc'
  page?: number;                                       // Default: 1
  limit?: number;                                      // Default: 20
}
```

## أنواع الاستجابة

### `CollectionsResponse`

يتم إرجاعها عند إدراج مجموعات متعددة.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

يتم إرجاعها عند جلب مجموعة واحدة بعناصرها.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## قواعد التحقق من الصحة

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|الميدان|القاعدة|
|-------|------|
|`id`|من 3 إلى 50 حرفًا، يجب أن تكون فريدة|
|`name`|2-100 حرف|
|`description`|الحد الأقصى 500 حرف|

## مثال الاستخدام

```typescript
import type {
  Collection,
  CreateCollectionRequest,
  CollectionListOptions,
} from '@/types/collection';

// Create a collection
const newCollection: CreateCollectionRequest = {
  id: 'top-picks-2025',
  name: 'Top Picks 2025',
  description: 'Our favourite tools this year.',
  isActive: true,
};

// List with filtering
const options: CollectionListOptions = {
  search: 'top',
  sortBy: 'item_count',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};
```

## الأنواع ذات الصلة

- [أنواع العناصر](./item-types.md) - العناصر التي تنتمي إلى المجموعات
- [أنواع العلامات](./tag-types.md) - العلامات كنموذج تنظيمي بديل
