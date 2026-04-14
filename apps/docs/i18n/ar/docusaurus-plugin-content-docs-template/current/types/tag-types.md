---
id: tag-types
title: تعريفات نوع العلامة
sidebar_label: أنواع العلامات
sidebar_position: 20
---

# تعريفات نوع العلامة

**المصدر:** `lib/types/tag.ts`

توفر العلامات نظامًا مسطحًا لوضع العلامات على العناصر. تتم إدارتها من خلال واجهة الإدارة ويتم تخزينها في نظام المحتوى القائم على الملفات.

## واجهات

### `TagData`

بنية بيانات العلامة الأساسية.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`id`|`string`|المعرف الثابت المستخدم في ملفات YAML للعناصر|
|`name`|`string`|علامة يمكن قراءتها بواسطة الإنسان تظهر في واجهة المستخدم، من 2 إلى 50 حرفًا|
|`isActive`|`boolean`|يتم إخفاء العلامات غير النشطة من عوامل التصفية العامة ولكن يتم الاحتفاظ بها في البيانات|

### `TagWithCount`

تم توسيع بيانات العلامة مع إحصائيات الاستخدام.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

الحمولة لإنشاء علامة جديدة.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

الحمولة لتحديث العلامة. لا يمكن تغيير `id`.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

معلمات الاستعلام لعلامات القائمة.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## أنواع الاستجابة

### `TagListResponse`

استجابة قائمة العلامات المرقّمة.

```typescript
interface TagListResponse {
  tags: TagWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `TagResponse`

نتيجة عملية علامة واحدة.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## قواعد التحقق من الصحة

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|الميدان|القاعدة|
|-------|------|
|`name`|2-50 حرفا|
|`id`|يجب أن تكون فريدة عبر جميع العلامات|

## العلامات في نظام المحتوى

تتم الإشارة إلى العلامات بواسطة المعرف في ملفات YAML للعنصر:

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

يقرأ مستودع العلامات تعريفات العلامات من مستودع المحتوى ويقدمها إلى واجهة مستخدم المسؤول ومكونات التصفية.

## تكامل الفلتر

تتكامل العلامات مع نظام التصفية من جانب العميل من خلال هذه المكونات:

- `components/filters/components/tags/` - واجهة مستخدم مرشح العلامات
- `components/filters/hooks/use-tag-visibility.ts` - يتحكم في العلامات التي تظهر
- `components/filters/utils/tag-utils.ts` - وظائف مساعدة لتصفية العلامات

## مثال الاستخدام

```typescript
import type {
  TagData,
  CreateTagRequest,
  TagListOptions,
} from '@/lib/types/tag';

// Create a new tag
const newTag: CreateTagRequest = {
  id: 'ai-powered',
  name: 'AI Powered',
  isActive: true,
};

// List active tags sorted by name
const options: TagListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

## الأنواع ذات الصلة

- [أنواع المجموعات](./collection-types.md) - المجموعات كنموذج تجميع بديل
- [أنواع العناصر](./item-types.md) - العناصر التي تشير إلى العلامات
- [أنواع الأذونات](./permission-types.md) - `tags:read`، `tags:create`، إلخ.
