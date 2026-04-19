---
id: cache-system
title: "نظام ذاكرة التخزين المؤقت"
sidebar_label: "نظام ذاكرة التخزين المؤقت"
sidebar_position: 40
---

# نظام ذاكرة التخزين المؤقت

## نظرة عامة

يوفر نظام ذاكرة التخزين المؤقت تكوينًا مركزيًا لذاكرة التخزين المؤقت وإبطالًا لتطبيق Next.js. فهو يحدد فترات TTL (مدة البقاء) المتسقة ومفاتيح التخزين المؤقت المستندة إلى العلامات المستخدمة مع Next.js `unstable_cache`، ويوفر أدوات مساعدة آمنة لإبطال ذاكرة التخزين المؤقت التي تتعامل مع حالات الحافة مثل قيود مرحلة العرض في Next.js 16.

## الهندسة المعمارية

ينقسم نظام ذاكرة التخزين المؤقت إلى وحدتين تعملان معًا:

- **`lib/cache-config.ts`** - يحدد كافة ثوابت TTL لذاكرة التخزين المؤقت ومولدات علامات ذاكرة التخزين المؤقت. هذا هو المصدر الوحيد للحقيقة فيما يتعلق بمدة بقاء البيانات مخزنة مؤقتًا والعلامات المستخدمة للإبطال المستهدف.
- **`lib/cache-invalidation.ts`** - يوفر وظائف غير متزامنة تستدعي `revalidateTag()` لإبطال ذاكرة التخزين المؤقت المحددة أو جميعها ذات الصلة بالمحتوى. فهو يغلف كل استدعاء في منطق الأمان للتعامل مع أخطاء مرحلة عرض Next.js بأمان.

يتم استهلاك كلتا الوحدتين بواسطة طبقة المحتوى (`lib/content.ts`) وعمليات مزامنة الخلفية للحفاظ على تحديث البيانات المخزنة مؤقتًا بعد تحديثات المستودع.

## مرجع واجهة برمجة التطبيقات

### الصادرات من `lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

كائن ثابت يحدد مدة ذاكرة التخزين المؤقت بالثواني لكل فئة بيانات.

#### `CACHE_TAGS`

```typescript
export const CACHE_TAGS: {
  CONTENT: 'content';
  ITEMS: 'items';
  ITEM: (slug: string) => string;       // `item:${slug}`
  CATEGORIES: 'categories';
  TAGS: 'tags';
  COLLECTIONS: 'collections';
  CONFIG: 'config';
  PAGES: 'pages';
  PAGE: (slug: string) => string;       // `page:${slug}`
  ITEMS_LOCALE: (locale: string) => string;       // `items:${locale}`
  CATEGORIES_LOCALE: (locale: string) => string;  // `categories:${locale}`
  TAGS_LOCALE: (locale: string) => string;        // `tags:${locale}`
  COLLECTIONS_LOCALE: (locale: string) => string; // `collections:${locale}`
};
```

تعريفات علامات ذاكرة التخزين المؤقت للاستخدام مع `revalidateTag()`. العلامات الثابتة هي سلاسل عادية؛ العلامات الديناميكية هي وظائف المصنع التي تقبل المعلمة الثابتة أو المحلية.

### الصادرات من `lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

يبطل كافة ذاكرات التخزين المؤقت ذات الصلة بالمحتوى (المحتوى، العناصر، الفئات، العلامات، المجموعات، الصفحات) ويمسح ذاكرة التخزين المؤقت `fetchItems` في الذاكرة. يجب أن يتم استدعاؤه بعد مزامنة المستودع الناجحة.

#### `invalidateItemCache(slug: string): Promise<void>`

يبطل ذاكرة التخزين المؤقت لعنصر واحد تم تحديده بواسطة سبيكةه الثابتة.

#### `invalidatePageCache(slug: string): Promise<void>`

يبطل صلاحية ذاكرة التخزين المؤقت لصفحة ثابتة واحدة تم تحديدها بواسطة سبيكةها الثابتة.

## تفاصيل التنفيذ

**أمان مرحلة العرض**: يعرض Next.js خطأً عند استدعاء `revalidateTag()` أثناء مرحلة عرض React. يلتقط الغلاف الداخلي `safeRevalidateTag()` هذا الخطأ المحدد باستخدام `isRenderPhaseError()`، والذي يتحقق من وجود أنماط سلسلة متعددة (`during render`، `render phase`، `revalidate` + `render`، `unsupported` + `render`) تتغير رسالة الخطأ المرنة ضد Next.js عبر الإصدارات.

**توافق Next.js 16**: يتضمن استدعاء `revalidateTag()` وسيطة ثانية `'max'` لدلالات لا معنى لها أثناء إعادة التحقق، كما هو مطلوب بواسطة Next.js 16.

**مسح ذاكرة التخزين المؤقت في الذاكرة**: بعد إبطال الصلاحية المستند إلى العلامة، يستدعي `invalidateContentCaches()` أيضًا `clearFetchItemsCache()` لمسح أي بيانات في الذاكرة تتجاوز ذاكرة التخزين المؤقت المستندة إلى ملف Next.js.

## التكوين

ليس هناك حاجة إلى تكوين إضافي. قيم TTL هي ثوابت مضمنة. لتغيير مدة ذاكرة التخزين المؤقت، قم بتعديل القيم في `CACHE_TTL`.

|ثابت|المدة|حالة الاستخدام|
|----------|----------|----------|
|`CONTENT`|600 ثانية (10 دقائق)|ذاكرة التخزين المؤقت للمحتوى العام|
|`ITEM`|600 ثانية (10 دقائق)|صفحات العناصر الفردية|
|`CONFIG`|600 ثانية (10 دقائق)|تكوين الموقع|
|`PAGES`|600 ثانية (10 دقائق)|صفحات ثابتة|

## أمثلة الاستخدام

```typescript
import { CACHE_TTL, CACHE_TAGS } from '@/lib/cache-config';
import { unstable_cache } from 'next/cache';

// Cache a data-fetching function with tags and TTL
const getCachedItems = unstable_cache(
  async () => {
    return await fetchItemsFromSource();
  },
  ['items-list'],
  {
    tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.ITEMS],
    revalidate: CACHE_TTL.CONTENT,
  }
);

// Cache a single item with a dynamic tag
const getCachedItem = unstable_cache(
  async (slug: string) => {
    return await fetchItemBySlug(slug);
  },
  ['item-detail'],
  {
    tags: [CACHE_TAGS.ITEM('my-item-slug')],
    revalidate: CACHE_TTL.ITEM,
  }
);

// Invalidate all caches after a sync
import { invalidateContentCaches } from '@/lib/cache-invalidation';

async function onSyncComplete() {
  await invalidateContentCaches();
}

// Invalidate a single item after editing
import { invalidateItemCache } from '@/lib/cache-invalidation';

async function onItemUpdated(slug: string) {
  await invalidateItemCache(slug);
}
```

## أفضل الممارسات

- استخدم دائمًا ثوابت `CACHE_TAGS` بدلاً من سلاسل العلامات ذات الترميز الثابت لتجنب الأخطاء المطبعية وضمان الاتساق.
- اتصل بـ `invalidateContentCaches()` بعد كل مزامنة ناجحة للمستودع للحفاظ على تحديث البيانات.
- استخدم العلامات الخاصة بالإعدادات المحلية (`ITEMS_LOCALE`، `CATEGORIES_LOCALE`) عند تخزين البيانات التي تمت تصفيتها محليًا مؤقتًا لتمكين إبطال الهدف.
- لا تتصل بـ `revalidateTag()` مباشرة؛ استخدم الأغلفة الآمنة من `cache-invalidation.ts` لتجنب أعطال مرحلة العرض.
- حافظ على محاذاة قيم TTL عبر أنواع البيانات ذات الصلة لمنع المراجع الترافقية التي لا معنى لها.

## الوحدات ذات الصلة

- [مكتبة المحتوى](/template/architecture/content-library) -- المستهلك الأساسي لعلامات ذاكرة التخزين المؤقت وقيم TTL
- [نظام إدارة التكوين](./config-manager-system) - يستخدم `CACHE_TAGS.CONFIG` للتخزين المؤقت لتكوين الموقع
