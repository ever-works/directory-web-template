---
id: item-submissions
title: تقديمات البند
sidebar_label: تقديمات البند
sidebar_position: 31
---

#تقديم العناصر

يوفر نظام إرسال العناصر سير عمل كاملاً للمستخدمين لإرسال قوائم الدليل وإدارتها وتتبعها. ويتضمن تتبع الحالة (معلق، معتمد، مرفوض)، والتصفية، وبطاقات الإحصائيات، ونماذج التفاصيل، ونماذج التحرير، والحذف مع التأكيد.

## نظرة عامة على الهندسة المعمارية

| الوحدة | المسار | الغرض |
|--------|------|---------|
| قائمة التقديم | `components/submissions/submission-list.tsx` | مكون القائمة الرئيسية مع ترقيم الصفحات |
| عنصر التقديم | `components/submissions/submission-item.tsx` | بطاقة التقديم الفردية |
| مرشحات التقديم | `components/submissions/submission-filters.tsx` | علامات تبويب الحالة والبحث |
| بطاقات إحصائيات التقديم | `components/submissions/submission-stats-cards.tsx` | نظرة عامة على البطاقات الإحصائية |
| تحرير نموذج التقديم | 4ـ | التحرير المضمن مشروط |
| نموذج تفاصيل التقديم | 5 ــ | عرض التفاصيل للقراءة فقط |
| حذف مربع حوار التقديم | 6ـ | تأكيد الحذف |
| عنصر المهملات | `components/submissions/trash-item.tsx` | عرض العناصر المحذوفة |
| حارس الخطة | 8ـ | حدود التقديم حسب الخطة |

## نموذج بيانات التقديم

تمثل الواجهة `Submission` إرسالًا في واجهة المستخدم:

```ts
export interface Submission {
  id: string;
  title: string;
  description: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  source_url?: string;
}
```

يقوم المساعد `toSubmission` بالتحويل من نموذج بيانات API:

```ts
export function toSubmission(
  item: ClientSubmissionData
): Submission {
  const approvedAt =
    item.status === 'approved' ? item.reviewed_at : undefined;
  const rejectedAt =
    item.status === 'rejected' ? item.reviewed_at : undefined;

  return {
    id: item.id,
    title: item.name,
    description: item.description,
    status: (['approved', 'pending', 'rejected'].includes(
      item.status
    )
      ? item.status
      : 'pending') as Submission['status'],
    submittedAt: item.submitted_at || item.updated_at || null,
    approvedAt,
    rejectedAt,
    rejectionReason: item.review_notes,
    category: Array.isArray(item.category)
      ? item.category[0] || 'Uncategorized'
      : item.category || 'Uncategorized',
    tags: item.tags || [],
    views: item.views || 0,
    likes: item.likes || 0,
    source_url: item.source_url,
  };
}
```

## مكون قائمة التقديم

يعرض المكون `SubmissionList` قائمة عمليات الإرسال بحالات التحميل والفارغة والمأهولة:

```tsx
export interface SubmissionListProps {
  items: ClientSubmissionData[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  deletingId?: string | null;
  updatingId?: string | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateActionLabel?: string;
  emptyStateActionHref?: string;
  skeletonCount?: number;
}
```

السلوكيات الرئيسية:

- **حالة التحميل** - تعرض 0 عناصر نائبة
- **حالة فارغة** - تعرض عبارة تحث المستخدم على اتخاذ إجراء مرتبطة بـ `/submit` - **الحالة المأهولة** - تقوم بتعيين العناصر من خلال `toSubmission()` وعرض `SubmissionItem` لكل منها
- **مؤشرات التحميل المتفائلة** -- 4 و5 تعطيل العناصر المتأثرة

يضيف المتغير 6 عرض البيانات التعريفية للصفحات.

## تكوين الحالة

يتم تعيين كل حالة إرسال إلى رمز ونظام ألوان ومفتاح ترجمة:

```ts
const statusConfig = {
  approved: {
    labelKey: "STATUS_APPROVED",
    icon: FiCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pending: {
    labelKey: "STATUS_PENDING",
    icon: FiClock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  rejected: {
    labelKey: "STATUS_REJECTED",
    icon: FiX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};
```

تعرض الطلبات المرفوضة سبب الرفض في مربع شرح أحمر.

## مرشحات التقديم

يوفر المكون `SubmissionFilters` تصفية الحالة على نمط علامة التبويب والبحث عن النص:

```tsx
export interface SubmissionFiltersProps {
  status: ClientStatusFilter;
  search: string;
  onStatusChange: (status: ClientStatusFilter) => void;
  onSearchChange: (search: string) => void;
  isSearching?: boolean;
  disabled?: boolean;
  statusCounts?: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}
```

الميزات:

- ** علامات تبويب الحالة ** - أزرار حبوب منع الحمل للكل، تمت الموافقة عليه، وفي انتظاره، ومرفوض مع شارات العد الاختيارية
- **مدخلات البحث** - بحث عن النص الكامل باستخدام زر المسح ودوارة التحميل
- **متغير مضغوط** -- `SubmissionFiltersCompact` يستخدم قائمة منسدلة لتحديد التخطيطات ذات المساحة المحدودة

## بطاقات الإحصائيات

يعرض المكون 1 أربع بطاقات إحصائية في الشبكة:

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

تظهر البطاقات الأربع:

| بطاقة | مفتاح | اللون |
|------|-----|-------|
| إجمالي التقديمات | `total` | أزرق |
| تمت الموافقة عليه | `approved` | أخضر |
| في انتظار | `pending` | أصفر |
| مرفوض | `rejected` | أحمر |

تحتوي كل بطاقة على خلفية أيقونة متدرجة وهيكل تحميل متحرك وتأثير ظل التحويم.

## بطاقة مادة التقديم

كل 4 يعرض:

- العنوان مع شارة الحالة
- الوصف المقتطع (مشبك ذو سطرين)
- ما يصل إلى 5 علامات مع عدد الفائض
- صف البيانات الوصفية: الفئة، تاريخ الإرسال، عدد المشاهدات، عدد الإعجابات
- أزرار الإجراءات: عرض، تعديل، حذف
- تحميل المغازل على أزرار التحرير/الحذف عندما تكون العمليات جارية
- حالة التعطيل أثناء العمليات بالجملة

## حدود التقديم على أساس الخطة

يتحكم نظام حماية الخطة في عدد عمليات الإرسال التي يمكن للمستخدم تقديمها:

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

للتحقق من الحدود قبل الإرسال:

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

ميزات إضافية مرتبطة بالخطة لعمليات التقديم:

| ميزة | مجاني | قياسي | بريميوم |
|---------|------|----------|---------|
| إرسال العناصر | نعم | نعم | نعم |
| صور ماكس | 1 | 5 | غير محدود |
| كلمات الوصف | 200 | 500 | غير محدود |
| تحميل الفيديو | لا | لا | نعم |
| شارة التحقق | لا | نعم | نعم |
| مراجعة الأولوية | لا | نعم | نعم |
| مراجعة فورية | لا | لا | نعم |
| مدة المراجعة (أيام) | 7 | 3 | 1 |

## سير عمل التقديم

1. **إرسال المستخدم** - قم بملء نموذج الإرسال متعدد الخطوات
2. **التحقق من الصحة** - يتم التحقق من حدود الخطة والتحقق من صحة المدخلات
3. **التخزين** - يتم تخزين بيانات العنصر في نظام إدارة المحتوى المستند إلى Git عبر خدمة العنصر
4. **الحالة: معلق** - يدخل الإرسال إلى قائمة انتظار مراجعة المشرف
5. **مراجعة المشرف** - يوافق المشرف أو يرفض مع ملاحظات اختيارية
6. **الحالة: تمت الموافقة عليه/الرفض** - يرى المستخدم الحالة المحدثة في لوحة التحكم الخاصة به
7. **تحرير** -- يمكن للمستخدمين تعديل عمليات الإرسال (ضمن حدود تعديل الخطة)
8. **حذف** - يمكن للمستخدمين حذف عمليات الإرسال الخاصة بهم من خلال مربع حوار التأكيد

## التدويل

يستخدم كل نص واجهة المستخدم ترجمات `next-intl` ضمن مساحة الاسم `client.submissions` :

- `NO_SUBMISSIONS_TITLE` -- عنوان الحالة الفارغة
- `NO_SUBMISSIONS_DESC` -- وصف الحالة الفارغة
- `SUBMIT_FIRST_PROJECT` -- زر الحث على اتخاذ إجراء
- `STATUS_APPROVED` , `STATUS_PENDING` , `STATUS_REJECTED` - تسميات الحالة
- `SUBMITTED` -- بادئة التاريخ
- `VIEWS_COUNT` , `LIKES_COUNT` - تسميات مترية مع معلمة العد
- `REJECTION_REASON` -- تسمية وسيلة شرح الرفض
- `SEARCH_PLACEHOLDER` -- العنصر النائب لإدخال البحث
- `SHOWING_RESULTS` , `PAGE_INFO` --نص ترقيم الصفحات

## الوثائق ذات الصلة

- [نماذج متعددة الخطوات](/docs/template/features/multi-step-forms) -- تنفيذ نموذج التقديم
- [إدارة المشرف](/docs/template/features/admin-management) -- سير عمل مراجعة المشرف
- [التصويت والتعليقات](/docs/template/features/voting-comments) -- التفاعل مع المشاركات
