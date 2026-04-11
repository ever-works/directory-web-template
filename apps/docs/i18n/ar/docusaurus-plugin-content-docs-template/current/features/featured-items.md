---
id: featured-items
title: نظام العناصر المميزة
sidebar_label: العناصر المميزة
sidebar_position: 2
---

# نظام العناصر المميزة

يتيح نظام العناصر المميزة للمسؤولين إبراز عناصر محددة في الموقع من خلال الترتيب المخصص وتواريخ انتهاء الصلاحية وعناصر التحكم في التنشيط.

## نموذج البيانات

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  itemDescription?: string;
  featuredOrder: number;        // Display position
  featuredUntil?: string;       // Expiration date (ISO string)
  isActive: boolean;
  featuredBy: string;           // Admin user ID
  featuredAt: string;           // When it was featured
  createdAt: string;
  updatedAt: string;
}
```

## إدارة المشرف

### خطاف useAdminFeaturedItems

```typescript
import { useAdminFeaturedItems } from '@/hooks/use-admin-featured-items';

const {
  // Data
  featuredItems,        // FeaturedItem[]
  allItems,             // ItemData[] (for picker)
  filteredItems,        // FeaturedItem[] (after local search/filter)

  // State
  isLoading, isSubmitting,
  currentPage, totalPages, totalItems,
  searchTerm, showActiveOnly,

  // Actions
  setSearchTerm,        // (term: string) => void
  setShowActiveOnly,    // (active: boolean) => void
  addFeaturedItem,      // (data) => Promise<boolean>
  updateFeaturedItem,   // (id, data) => Promise<boolean>
  removeFeaturedItem,   // (id) => Promise<boolean>
  reorderItems,         // (orderedIds: string[]) => Promise<boolean>
  refetch, refreshData,
} = useAdminFeaturedItems({ page: 1, limit: 20 });
```

### استجابة واجهة برمجة التطبيقات

تعرض واجهة برمجة تطبيقات العناصر المميزة نتائج مرقّمة مع بيانات تعريف التنقل:

```typescript
interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## الطلب

تدعم العناصر المميزة إعادة الترتيب بالسحب والإفلات من خلال الوظيفة `reorderItems` ، التي تقبل مجموعة من المعرفات بترتيب العرض المطلوب:

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

يحدد الحقل `featuredOrder` موضع العرض على الواجهة الأمامية.

## انتهاء الصلاحية

يمكن عرض العناصر مع تاريخ انتهاء صلاحية اختياري ( `featuredUntil` ). عند التعيين:
- يتم استبعاد السلعة تلقائيًا من العرض بعد تاريخ انتهاء الصلاحية
- يمكن للمسؤول رؤية العناصر منتهية الصلاحية عن طريق تبديل عامل التصفية `showActiveOnly` - يتم دعم الإزالة اليدوية أيضًا عبر `removeFeaturedItem` ## العرض من جانب العميل

### useFeaturedItemsClient Hook

يقوم الخطاف المواجه للعامة بجلب العناصر المميزة النشطة للعرض:

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### useFeatureItemsSection Hook

خطاف ذو مستوى أعلى يوفر منطق عرض على مستوى القسم:

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## ميزة العلم

العناصر المميزة تحترم علامة الميزة `featuredItems` :

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

يتم تعطيل الميزة تلقائيًا عندما لا يتم تكوين 0.

## نقاط نهاية واجهة برمجة التطبيقات

| الطريقة | نقطة النهاية | الوصف |
|--------|----------|-------------|
| احصل على | `/api/admin/featured-items` | قائمة العناصر المميزة (مرقّمة) |
| مشاركة | `/api/admin/featured-items` | إضافة عنصر مميز |
| ضع | `/api/admin/featured-items/:id` | تحديث إعدادات العناصر المميزة |
| حذف | 4ـ | إزالة من المميز |
| ضع | 5 ــ | إعادة ترتيب العناصر المميزة |
| احصل على | 6ـ | عام: احصل على العناصر المميزة النشطة |
