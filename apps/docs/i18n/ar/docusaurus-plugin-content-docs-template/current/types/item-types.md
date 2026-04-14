---
id: item-types
title: تعريفات نوع العنصر
sidebar_label: أنواع العناصر
sidebar_position: 1
---

# تعريفات نوع العنصر

**المصدر:** `lib/types/item.ts`

العناصر هي كيانات المحتوى الأساسية في القالب. تحدد هذه الوحدة هياكل البيانات لإنشاء العناصر وقراءتها وتحديثها وإدراجها، بالإضافة إلى ثوابت التحقق من الصحة وأنواع إدارة الحالة.

## واجهات

### `ItemLocationData`

بيانات الموقع للعناصر التي يمكن ترميزها جغرافيًا. تم تخزينها في YAML وفهرستها في `item_location_index` للاستعلامات الجغرافية السريعة.

```typescript
import type { MapProvider } from './location';

interface ItemLocationData {
  address?: string;       // Full address string for geocoding
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;      // Pre-geocoded latitude
  longitude?: number;     // Pre-geocoded longitude
  service_area?: string;  // e.g., "Nationwide", "New York Metro"
  is_remote?: boolean;    // Whether this item operates remotely
  geocoded_by?: MapProvider; // Which geocoding provider was used
}
```

### `ItemData`

يتم إرجاع بنية بيانات العنصر الأساسي بواسطة عمليات القراءة.

```typescript
interface ItemData {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  featured?: boolean;
  icon_url?: string;
  updated_at: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  deleted_at?: string;        // ISO timestamp for soft delete
  action?: 'visit-website' | 'start-survey' | 'buy';
  showSurveys?: boolean;      // Whether to show surveys section
  publisher?: string;         // Publisher name for display
  location?: ItemLocationData;
}
```

** التفاصيل الرئيسية: **
- `category` يدعم كلاً من سلسلة واحدة ومصفوفة للعناصر متعددة الفئات
- `status` يستخدم تدفق موافقة من أربع حالات: مسودة، معلقة، معتمدة، مرفوضة
- `deleted_at` يتيح الحذف المبسط دون إزالة البيانات
- `action` يحدد نوع زر CTA في صفحة تفاصيل العنصر

### `CreateItemRequest`

حمولة الإدخال لإنشاء عنصر جديد (نقطة نهاية POST).

```typescript
interface CreateItemRequest {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  brand?: string;
  featured?: boolean;
  icon_url?: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  location?: ItemLocationData;
}
```

### `UpdateItemRequest`

حمولة الإدخال لتحديث عنصر موجود. يمتد `Partial<CreateItemRequest>` بحيث تكون كافة الحقول باستثناء `id` اختيارية.

```typescript
interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  deleted_at?: string; // For soft delete operations
}
```

### `ItemListOptions`

معلمات الاستعلام لتصفية قوائم العناصر وترقيم صفحاتها.

```typescript
interface ItemListOptions {
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  categories?: string[];     // Multi-category filtering
  tags?: string[];           // Multi-tag filtering
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;  // Include soft-deleted items (default: false)
  submittedBy?: string;      // Filter by submitting user
  search?: string;           // Search by name or description
  city?: string;             // Filter by city
  country?: string;          // Filter by country
  includeRemote?: boolean;   // Include remote items in location queries
}
```

### `ItemListResponse`

استجابة مرقّمة لاستعلامات قائمة العناصر.

```typescript
interface ItemListResponse {
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `ItemResponse`

مغلف الاستجابة لعمليات العنصر الواحد.

```typescript
interface ItemResponse {
  success: boolean;
  item?: ItemData;
  error?: string;
  message?: string;
}
```

### `ReviewRequest`

الحمولة للموافقة على عنصر أو رفضه أثناء عملية المراجعة.

```typescript
interface ReviewRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}
```

## اكتب الأسماء المستعارة

### `SortField`

الحقول الصالحة لفرز قوائم العناصر:

```typescript
type SortField = 'name' | 'updated_at' | 'status' | 'submitted_at';
```

### `SortOrder`

اتجاه الترتيب:

```typescript
type SortOrder = 'asc' | 'desc';
```

### `ItemStatus`

نوع اتحاد مشتق من `ITEM_STATUSES`:

```typescript
type ItemStatus = (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];
// Resolves to: 'draft' | 'pending' | 'approved' | 'rejected'
```

## الثوابت

### `ITEM_VALIDATION`

قيود التحقق من صحة حقول العناصر:

```typescript
const ITEM_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 500,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 50,
} as const;
```

### `ITEM_STATUSES`

قيم الحالة الأساسية لسير عمل الموافقة على العنصر:

```typescript
const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
```

### `ITEM_STATUS_LABELS`

تسميات يمكن قراءتها بواسطة الإنسان لكل حالة:

```typescript
const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;
```

### `ITEM_STATUS_COLORS`

تعيينات ألوان واجهة المستخدم لكل حالة:

```typescript
const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## أمثلة الاستخدام

### إنشاء عنصر

```typescript
import type { CreateItemRequest } from '@/lib/types/item';
import { ITEM_VALIDATION } from '@/lib/types/item';

function validateItemName(name: string): boolean {
  return (
    name.length >= ITEM_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= ITEM_VALIDATION.NAME_MAX_LENGTH
  );
}

const newItem: CreateItemRequest = {
  id: 'unique-id-123',
  name: 'My Tool',
  slug: 'my-tool',
  description: 'A description of my tool that is at least 10 characters.',
  source_url: 'https://example.com',
  category: ['productivity', 'developer-tools'],
  tags: ['open-source', 'free'],
  status: 'pending',
};
```

### تصفية العناصر

```typescript
import type { ItemListOptions } from '@/lib/types/item';

const options: ItemListOptions = {
  status: 'approved',
  categories: ['productivity'],
  tags: ['open-source'],
  page: 1,
  limit: 20,
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeRemote: true,
};
```

### تقديم شارات الحالة

```typescript
import { ITEM_STATUS_LABELS, ITEM_STATUS_COLORS } from '@/lib/types/item';
import type { ItemStatus } from '@/lib/types/item';

function getStatusBadge(status: ItemStatus) {
  return {
    label: ITEM_STATUS_LABELS[status],
    color: ITEM_STATUS_COLORS[status],
  };
}

// getStatusBadge('pending')
// => { label: 'Pending Review', color: 'yellow' }
```

## الأنواع ذات الصلة

- [`ItemLocationData`](./location-types.md) يشير إلى `MapProvider` من وحدة الموقع
- [`ClientSubmissionData`](./item-types.md) في `client-item.ts` يمتد `ItemData` بمقاييس المشاركة
- [`CategoryData`](./category-types.md) يحدد قيم الفئة المشار إليها في `ItemData.category`
- [`TagData`](./category-types.md) يحدد قيم العلامة المشار إليها في `ItemData.tags`
