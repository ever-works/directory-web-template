---
id: item-history
title: تاريخ العنصر والتدقيق
sidebar_label: تاريخ العنصر والتدقيق
sidebar_position: 17
---

# تاريخ العنصر والتدقيق

يتضمن قالب Ever Works نظامًا شاملاً لمراجعة الحسابات يتتبع جميع التغييرات التي تم إجراؤها على العناصر طوال دورة حياتها. يتم تسجيل كل عملية إنشاء وتحديث وتغيير حالة ومراجعة وحذف واستعادة بمعلومات التغيير التفصيلية وهوية المؤدي والطوابع الزمنية.

## نظرة عامة على الهندسة المعمارية

| مكون | المسار | الغرض |
|---|---|---|
| `itemAuditService` | `lib/services/item-audit.service.ts` | طبقة الخدمة لتسجيل إجراءات التدقيق |
| `item-audit.queries.ts` | `lib/db/queries/item-audit.queries.ts` | استعلامات قاعدة البيانات لسجل التدقيق CRUD |
| 4ـ | 5 ــ | خطاف استعلام React لجلب سجلات التدقيق |
| 6ـ | `components/admin/items/item-history-modal.tsx` | واجهة مستخدم مشروطة لعرض سجل العناصر |

## إجراءات التدقيق

يتتبع النظام ستة أنواع من الإجراءات:

| العمل | ثابت | الوصف |
|---|---|---|
| تم الإنشاء | 8ـ | تم إنشاء العنصر |
| تم التحديث | `ItemAuditAction.UPDATED` | تم تعديل حقول العناصر |
| تم تغيير الحالة | `ItemAuditAction.STATUS_CHANGED` | تم تغيير حالة السلعة |
| تمت المراجعة | `ItemAuditAction.REVIEWED` | تمت مراجعة السلعة (تمت الموافقة عليها/الرفض) |
| محذوف | ‹‹١٢› | تم حذف العنصر (الناعم أو الصلب) |
| مستعادة | 13 ــ | تمت استعادة العنصر من الحذف |

## الحقول المتعقبة

تقوم خدمة التدقيق بمراقبة الحقول التالية لاكتشاف التغيير:

| المجال | اكتب |
|---|---|
| 14 ــ | اسم العنصر |
| `description` | وصف السلعة |
| 16 ــ | عنوان URL للمصدر/المنتج |
| `category` | مهمة الفئة |
| 18 ــ | مصفوفة العلامات |
| 19 ــ | مهام المجموعة |
| 20 ــ | الحالة المميزة |
| ‹٢١› | عنوان URL للرمز/الشعار |
| ‹٢٢› | حالة السلعة |

## خدمة تدقيق العناصر

يوفر 23 أساليب تسجيل عالية المستوى يتم استدعاؤها من مسارات وخدمات API.

### إنشاء عنصر التسجيل

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### تسجيل تحديثات العناصر

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### تسجيل المراجعات

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### حذف السجل واستعادته

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### تصميم غير معوق

يتم تضمين كافة عمليات تسجيل التدقيق في كتل محاولة الالتقاط ولن تؤدي إلى حدوث أخطاء قد تؤدي إلى حظر العملية الأساسية:

```tsx
async function logAction(params: LogActionParams): Promise<void> {
  try {
    await createItemAuditLog(createParams);
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    console.error('[ItemAuditService] Failed to log action:', error);
  }
}
```

## كشف التغيير

تقارن الدالة `detectChanges` حالتي عنصر وترجع اختلافًا تفصيليًا:

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

مثال الإخراج:

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

تتعامل الدالة مع المساواة العميقة للصفائف (المقارنة المصنفة) وترجع `null` إذا لم يتم اكتشاف أي تغييرات.

## طبقة قاعدة البيانات

### مخطط سجل التدقيق

يحتوي كل إدخال في سجل التدقيق على:

| المجال | اكتب | الوصف |
|---|---|---|
| `id` | `string` | معرف فريد |
| `itemId` | 4ـ | سبيكة/معرف العنصر |
| 5 ــ | 6ـ | اسم العنصر وقت الإجراء |
| `action` | 8ـ | نوع العمل |
| `previousStatus` | `string \| null` | الحالة قبل الإجراء |
| `newStatus` | ‹‹١٢› | الحالة بعد الإجراء |
| 13 ــ | 14 ــ | تفاصيل التغيير على مستوى الحقل |
| `performedBy` | 16 ــ | معرف المستخدم الذي قام بالإجراء |
| `performedByName` | 18 ــ | اسم عرض المستخدم |
| 19 ــ | 20 ــ | ملاحظات إضافية (مثل تعليقات المراجعة) |
| ‹٢١› | ‹٢٢› | بيانات السياق الإضافية |
| ‹٢٣› | ‹٢٤› | عندما وقع الإجراء |

### وظائف الاستعلام

| وظيفة | الوصف |
|---|---|
| 25 ــ | قم بإنشاء إدخال سجل تدقيق جديد |
| ‹٢٦› | احصل على سجل مرقّم مع معلومات المؤدي |
| ‹٢٧› | احصل على أحدث إدخال للسجل |
| 28 ــ | تصفية السجلات حسب نوع الإجراء |
| ‹٢٩› | تصفية السجلات حسب المؤدي |
| ‹‹‹‹‹‹ 30 | احصل على تفاصيل العد حسب نوع الإجراء |

### استعلام التاريخ المرقّم

```tsx
import { getItemHistory } from '@/lib/db/queries/item-audit.queries';

const result = await getItemHistory({
  itemId: 'my-item-slug',
  page: 1,
  limit: 20,
  actionFilter: ['updated', 'status_changed']
});

// Returns: { logs, total, page, limit, totalPages }
```

ينضم الاستعلام إلى الجدول 0 لتضمين البريد الإلكتروني الخاص بالمؤدي بجانب كل إدخال سجل.

## الخطاف 1

```tsx
import { useItemHistory } from '@/hooks/use-item-history';

function ItemHistoryPanel({ itemId }) {
  const { data, isLoading, isError } = useItemHistory({
    itemId,
    page: 1,
    limit: 20,
    actionFilter: ['updated', 'reviewed'],
    enabled: true
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div>
      <p>Total entries: {data.total}</p>
      {data.logs.map(entry => (
        <div key={entry.id}>
          <span>{entry.action}</span>
          <span>{entry.performedByName}</span>
          <span>{entry.createdAt}</span>
        </div>
      ))}
    </div>
  );
}
```

### تكوين الخطاف

| الخيار | الافتراضي | الوصف |
|---|---|---|
| `itemId` | مطلوب | معرف العنصر/الارتباط الثابت لجلب السجل لـ |
| `page` | `1` | رقم الصفحة |
| `limit` | 4ـ | العناصر لكل صفحة |
| 5 ــ | 6ـ | مجموعة من أنواع الإجراءات للتصفية حسب |
| `enabled` | 8ـ | ما إذا كان الاستعلام نشطًا |
| `staleTime` | 30 ثانية | مدة نضارة ذاكرة التخزين المؤقت |

## نموذج تاريخ العنصر

يوفر المكون 10 واجهة مستخدم كاملة لعرض سجل تدقيق العنصر:

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### ميزات مشروطة

| ميزة | الوصف |
|---|---|
| تصفية العمل | قائمة منسدلة للتصفية حسب نوع الإجراء (تم الإنشاء، التحديث، إلخ.) |
| إدخالات مرمزة بالألوان | يحتوي كل نوع إجراء على رمز مميز ونظام ألوان |
| تغييرات قابلة للتوسيع | انقر لتوسيع تفاصيل التغيير على مستوى الحقل |
| الطوابع الزمنية النسبية | "منذ ساعتين"، "منذ 3D" مع التاريخ الكامل عند التمرير |
| عرض المؤدي | يعرض اسم المستخدم أو البريد الإلكتروني أو "النظام" للإجراءات الآلية |
| سياق المراجعة | يعرض التسميات "موافق عليه"/"مرفوض" وأسباب الرفض |
| ترقيم الصفحات | ترقيم صفحات مدمج للتواريخ الطويلة |
| دعم لوحة المفاتيح | مفتاح الهروب يغلق المشروط |

### نظام ألوان العمل

| العمل | اللون | أيقونة |
|---|---|---|
| تم الإنشاء | أخضر | زائد |
| تم التحديث | أزرق | تحرير2 |
| تم تغيير الحالة | أصفر | تحديث سو |
| تمت المراجعة | أرجواني | دائرة التحقق |
| محذوف | أحمر | سلة المهملات2 |
| مستعادة | البط البري | تدويرCcw |

## الملفات الرئيسية

| ملف | المسار |
|---|---|
| خدمة التدقيق | `lib/services/item-audit.service.ts` |
| استعلامات التدقيق | `lib/db/queries/item-audit.queries.ts` |
| هوك التاريخ | `hooks/use-item-history.ts` |
| التاريخ مشروط | `components/admin/items/item-history-modal.tsx` |
