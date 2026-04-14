---
id: pagination-system
title: "نظام ترقيم الصفحات"
sidebar_label: "نظام ترقيم الصفحات"
sidebar_position: 45
---

# نظام ترقيم الصفحات

## نظرة عامة

يوفر نظام ترقيم الصفحات حساب ترقيم الصفحات من جانب الخادم وأدوات مساعدة للتنقل في الصفحة من جانب العميل. وهو يتألف من وحدتين صغيرتين ومركزتين: `lib/paginate.ts` لحساب البيانات التعريفية للصفحة (أرقام الصفحات والإزاحات) و`utils/pagination.ts` لتثبيت أرقام الصفحات بأمان وتفعيل سلوك التمرير إلى الأعلى عند تغيير الصفحة.

## الهندسة المعمارية

نظام ترقيم الصفحات خفيف الوزن عن عمد وينقسم إلى طبقتين:

- **`lib/paginate.ts`** (خادم/مشترك) - وظائف خالصة لرياضيات ترقيم الصفحات. يُستخدم في مسارات واجهة برمجة التطبيقات (API)، ومكونات الخادم، ومنطق جلب البيانات لحساب شريحة البيانات التي سيتم إرجاعها.
- **`utils/pagination.ts`** (العميل) - مساعد واجهة المستخدم الذي يربط أرقام الصفحات بنطاقات صالحة ويقوم بتمرير الصفحة إلى الأعلى. يتم استخدامه بواسطة مكونات ترقيم الصفحات وطرق عرض القائمة.

يتم استهلاك كلتا الوحدتين بواسطة مكونات واجهة مستخدم ترقيم الصفحات وصفحات قائمة المحتوى. توفر `ConfigManager` القيمة `itemsPerPage` التي تغذي هذه الحسابات.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## مرجع واجهة برمجة التطبيقات

### الصادرات من `lib/paginate.ts`

#### `PER_PAGE: number`

العناصر الافتراضية لكل صفحة ثابتة. القيمة: `12`.

#### `totalPages(size: number, perPage?: number): number`

حساب العدد الإجمالي للصفحات لحجم مجموعة معين. يستخدم `Math.ceil()` لضمان تضمين الصفحة الجزئية الأخيرة.

**المعلمات:**
- `size`--إجمالي عدد العناصر في المجموعة
- `perPage` - العناصر لكل صفحة (الإعداد الافتراضي هو `PER_PAGE`)

**المرتجعات:** إجمالي عدد الصفحات (الحد الأدنى 1 للمجموعات غير الفارغة)

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

يحسب بيانات تعريف ترقيم الصفحات من معلمة صفحة أولية (والتي قد تأتي كسلسلة من معلمات استعلام URL).

**المعلمات:**
- `rawPage` - رقم الصفحة المطلوبة (الافتراضي هو `1`). يقبل كلاً من `number` و`string`.
- `perPage` - العناصر لكل صفحة (الإعداد الافتراضي هو `PER_PAGE`)

**المرتجعات:**
- `page`--رقم الصفحة التي تم تحليلها كعدد صحيح
- `start` - إزاحة الفهرس الصفرية لتقطيع مصفوفة البيانات

### الصادرات من `utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

ينتقل بأمان إلى صفحة جديدة عن طريق تثبيت القيمة على النطاق الصالح `[1, total]`، وتحديث حالة الصفحة، وتمرير النافذة إلى الأعلى برسوم متحركة سلسة.

**المعلمات:**
- `newPage`--رقم الصفحة المطلوبة (يمكن أن يكون خارج النطاق)
- `total`--إجمالي عدد الصفحات
- `setPage` - وظيفة ضبط حالة React للصفحة الحالية

**السلوك:**
- المشابك `NaN` القيم إلى الصفحة 1
- قيم المشابك أدناه 1 إلى الصفحة 1
- تثبيت القيم أعلاه `total` إلى `total`
- المكالمات `window.scrollTo({ top: 0, behavior: 'smooth' })` (آمنة لـ SSR؛ الشيكات `typeof window`)

## تفاصيل التنفيذ

**تحليل السلسلة**: `paginateMeta` يقبل `string | number` للمعلمة `rawPage` لأن معلمات استعلام URL تصل كسلاسل. ويستخدم `parseInt()` للتحويل.

**الإزاحة المستندة إلى الصفر**: يتم حساب القيمة `start` التي يتم إرجاعها بواسطة `paginateMeta` كـ `(page - 1) * perPage`، مما يوفر فهرسًا يستند إلى صفر مناسب لعبارات `Array.slice()` أو SQL `OFFSET`.

**أمان SSR**: `clampAndScrollToTop` يتحقق من `typeof window !== 'undefined'` قبل الاتصال بـ`window.scrollTo()`، مما يجعل الاتصال آمنًا في سياقات العرض من جانب الخادم.

** معالجة NaN **: `clampAndScrollToTop` يحول الإدخال باستخدام `Number()` ويعود إلى الصفحة 1 إذا كانت النتيجة `NaN`.

## التكوين

حجم الصفحة الافتراضي (`PER_PAGE = 12`) هو ثابت في `lib/paginate.ts`. يمكن تجاوز حجم صفحة وقت التشغيل من خلال `ConfigManager`:

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

يدعم `ConfigManager` نوعين من ترقيم الصفحات:
- `'standard'` - التنقل التقليدي صفحة تلو الأخرى
- `'infinite'` - نمط التمرير اللانهائي / تحميل المزيد

## أمثلة الاستخدام

```typescript
// Server-side: compute pagination for an API response
import { totalPages, paginateMeta, PER_PAGE } from '@/lib/paginate';

function getItemsPage(items: Item[], rawPage: string | number) {
  const { page, start } = paginateMeta(rawPage);
  const pageItems = items.slice(start, start + PER_PAGE);
  const total = totalPages(items.length);

  return {
    items: pageItems,
    pagination: {
      page,
      totalPages: total,
      totalItems: items.length,
      perPage: PER_PAGE,
    },
  };
}

// Client-side: handle page change in a React component
import { clampAndScrollToTop } from '@/utils/pagination';
import { totalPages } from '@/lib/paginate';

function PaginatedList({ items }: { items: Item[] }) {
  const [page, setPage] = useState(1);
  const total = totalPages(items.length);

  return (
    <>
      <ItemGrid items={getPageSlice(items, page)} />
      <PaginationControls
        currentPage={page}
        totalPages={total}
        onPageChange={(newPage) => clampAndScrollToTop(newPage, total, setPage)}
      />
    </>
  );
}

// Using custom page size from ConfigManager
import { configManager } from '@/lib/config-manager';
import { totalPages, paginateMeta } from '@/lib/paginate';

const { itemsPerPage } = configManager.getPaginationConfig();
const { page, start } = paginateMeta(rawPage, itemsPerPage);
const total = totalPages(items.length, itemsPerPage);
```

## أفضل الممارسات

- استخدم دائمًا `paginateMeta()` لتحليل معلمات الصفحة من سلاسل استعلام URL للتعامل مع إجبار النوع والإعدادات الافتراضية بأمان.
- قم بتمرير التجاوز `perPage` من `ConfigManager` بدلاً من الاعتماد على الثابت `PER_PAGE` عندما يكون المسؤول قد قام بتغيير حجم الصفحة.
- استخدم `clampAndScrollToTop()` في جميع عمليات التنقل في الصفحة من جانب العميل لمنع أرقام الصفحات خارج النطاق وتوفير تجربة مستخدم متسقة.
- بالنسبة لتطبيقات التمرير اللانهائية، استخدم `start` الإزاحة من `paginateMeta()` لحساب الشريحة التالية من العناصر المراد إلحاقها.
- خذ بعين الاعتبار ترقيم الصفحات `type` من `ConfigManager` (`'standard'` مقابل `'infinite'`) عند اختيار مكون واجهة المستخدم لترقيم الصفحات الذي سيتم عرضه.

## الوحدات ذات الصلة

- [نظام إدارة التكوين](./config-manager-system) - يوفر تكوين ترقيم الصفحات في وقت التشغيل (`type`، `itemsPerPage`)
- [مكتبة المحتوى](/template/architecture/content-library) - يستخدم ترقيم الصفحات لصفحات قائمة المحتوى
