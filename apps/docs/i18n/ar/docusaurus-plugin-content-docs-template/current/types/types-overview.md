---
id: types-overview
title: اكتب نظرة عامة على النظام
sidebar_label: نظرة عامة
sidebar_position: 0
---

# اكتب نظرة عامة على النظام

يستخدم القالب نظام نوع TypeScript شامل موجود في `lib/types/`. تعمل تعريفات الأنواع هذه كمصدر وحيد للحقيقة لهياكل البيانات المستخدمة عبر مسارات واجهة برمجة التطبيقات والخدمات والمستودعات ومكونات واجهة المستخدم.

## اكتب الملفات

يحتوي الدليل `lib/types/` على الوحدات التالية:

|ملف|الوصف|
|------|-------------|
|`item.ts`|بيانات العنصر وطلبات CRUD وخيارات القائمة وثوابت التحقق من الصحة وتعريفات الحالة|
|`user.ts`|بيانات المستخدم الإداري وأنواع المصادقة ومخططات التحقق من Zod والوظائف المساعدة|
|`profile.ts`|هيكل ملف تعريف المستخدم العام بما في ذلك الروابط الاجتماعية والمهارات والمحفظة والتقديمات|
|`category.ts`|بيانات الفئة وطلبات CRUD وخيارات القائمة وثوابت التحقق من الصحة|
|`comment.ts`|أنواع التعليقات المستنتجة من مخطط قاعدة البيانات، بما في ذلك التعليقات الغنية بالمستخدم|
|`vote.ts`|مخطط التصويت (Zod)، وأنواع الاستجابة، وأنواع الأخطاء، وحالة التصويت من جانب العميل|
|`survey.ts`|أنواع الاستبيانات والاستبيانات وخيارات التصفية وتعدادات الحالة/النوع|
|`location.ts`|إعدادات الموقع، وأنواع الاستعلام الجغرافي، وأنواع موفري الخرائط، والبيانات الإحداثية|
|`sponsor-ad.ts`|أنواع إعلانات الجهة الراعية بما في ذلك الطلبات والاستجابات والإحصائيات وبيانات لوحة المعلومات|
|`client.ts`|أنواع ملفات تعريف العميل للبوابة التي تواجه العميل، بما في ذلك لوحة المعلومات والإحصائيات|
|`client-item.ts`|أنواع إرسال العناصر من جانب العميل مع مقاييس المشاركة ومرشحات الحالة|
|`role.ts`|أنواع الأدوار والأذونات لنظام RBAC|
|`tag.ts`|بيانات العلامة وطلبات CRUD وخيارات القائمة وثوابت التحقق من الصحة|
|`twenty-crm-config.types.ts`|عشرون تكوينًا لتكامل CRM وأنواع اختبار الاتصال|
|`twenty-crm-entities.types.ts`|عشرون نوعًا من كيانات إدارة علاقات العملاء (CRM) لسجلات الأفراد والشركات|
|`twenty-crm-errors.types.ts`|أنواع الأخطاء الهيكلية، وأكواد الأخطاء، وأنواع الحماية لأخطاء CRM|
|`twenty-crm-sync.types.ts`|عمليات الصعود وإدخالات ذاكرة التخزين المؤقت والأنواع المرتبطة بالمزامنة|

## أنماط العمارة

### نمط CRUD ثابت

تتبع معظم أنواع الكيانات نمطًا ثابتًا من الواجهات:

```typescript
// Core data interface
interface EntityData {
  id: string;
  name: string;
  // ... entity-specific fields
}

// Create request (input for POST endpoints)
interface CreateEntityRequest {
  // Required fields for creation
}

// Update request (input for PUT/PATCH endpoints)
interface UpdateEntityRequest extends Partial<CreateEntityRequest> {
  id: string; // ID is always required for updates
}

// List response (paginated)
interface EntityListResponse {
  entities: EntityData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Single entity response
interface EntityResponse {
  success: boolean;
  entity?: EntityData;
  error?: string;
}

// List/query options
interface EntityListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### ثوابت التحقق

تقوم كل وحدة كيان بتصدير كائن ثوابت التحقق باستخدام `as const` لسلامة النوع:

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

يتم استخدام هذه الثوابت في كل من التحقق من جانب الخادم والتحقق من صحة النموذج من جانب العميل، مما يضمن قواعد متسقة عبر المكدس.

### ردود الاتحاد التمييزية

تستخدم أنواع استجابة واجهة برمجة التطبيقات (API) الاتحادات التمييزية لمعالجة الأخطاء الآمنة من النوع:

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

يتم استخدام هذا النمط بواسطة `SponsorAdResponse`، `ClientResponse`، `ClientListResponse`، وغيرهم.

### تكامل مخطط Zod

تستخدم عدة وحدات Zod للتحقق من صحة وقت التشغيل جنبًا إلى جنب مع أنواع TypeScript:

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

يتم استخدام هذا في `vote.ts` (لمخطط التصويت) و`user.ts` (للتحقق من صحة المستخدم).

### أنواع موسعة مع العلاقات

تستخدم الأنواع التي تتضمن بيانات ذات صلة الكلمة الأساسية `extends`:

```typescript
// Base type
interface EntityData {
  id: string;
  name: string;
}

// Extended type with related user data
interface EntityWithUser extends EntityData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Extended type with count (for statistics)
interface EntityWithCount extends EntityData {
  count?: number;
}
```

## اتفاقيات الاستيراد

يتم استيراد الأنواع باستخدام الكلمة الأساسية `type` لعمليات استيراد النوع فقط:

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

وهذا يضمن مسح الأنواع في وقت الترجمة ولا يؤثر على حجم الحزمة.

## التكوين مقابل أنواع وقت التشغيل

توضح وحدة الموقع النمط المستخدم للتكوين:

- **أنواع التكوين** تستخدم `snake_case` لمطابقة ملفات تكوين YAML
- **أنواع وقت التشغيل** تستخدم `camelCase` للاستخدام الاصطلاحي لـ TypeScript
- تقوم وظيفة التعيين بالتحويل بين التنسيقين

```typescript
// YAML config (snake_case)
interface LocationConfigSettings {
  distance_filter_enabled?: boolean;
  default_radius_km?: number;
}

// Runtime (camelCase)
interface LocationSettings {
  distanceFilterEnabled: boolean;
  defaultRadiusKm: number;
}

// Converter function
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

## تعدادات الحالة والتسميات

يتم تعريف قيم الحالة ككائنات const ذات التسمية المقابلة وتعيينات الألوان:

```typescript
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ItemStatus =
  (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## أنواع قاعدة البيانات المستنتجة

يتم استنتاج بعض الأنواع مباشرةً من مخطط Drizzle ORM:

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

يضمن هذا الأسلوب بقاء الأنواع متزامنة مع عمليات ترحيل قاعدة البيانات تلقائيًا.

## الوثائق ذات الصلة

- [أنواع العناصر](./item-types.md) - هياكل بيانات العناصر الأساسية
- [أنواع المستخدمين](./user-types.md) - مصادقة المستخدم وأنواع ملفات التعريف
- [أنواع الفئات](./category-types.md) - أنواع إدارة الفئات
- [أنواع التعليقات](./comment-types.md) - أنواع التعليقات والمراجعة
- [أنواع التصويت](./vote-types.md) - أنواع أنظمة التصويت
- [أنواع الاستطلاعات](./survey-types.md) - أنواع الاستطلاعات والاستجابة
- [أنواع المواقع](./location-types.md) - تحديد الموقع الجغرافي وأنواع الخرائط
- [أنواع الإعلانات الداعمة](./sponsor-ad-types.md) - أنواع الرعاية والإعلان
- [أنواع CRM](./crm-types.md) - عشرون نوعًا من تكامل CRM
