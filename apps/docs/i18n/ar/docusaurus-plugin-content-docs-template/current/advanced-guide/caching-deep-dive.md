---
id: caching-deep-dive
title: التخزين المؤقت العمارة الغوص العميق
sidebar_label: هندسة التخزين المؤقت
sidebar_position: 1
---

#التعمق في بنية التخزين المؤقت

يغطي هذا الدليل بنية التخزين المؤقت متعددة الطبقات المستخدمة عبر القالب، بدءًا من ذاكرة التخزين المؤقت لجلسة العمل في الذاكرة وحتى استراتيجيات التخزين المؤقت على مستوى Next.js ISR وCDN.

## نظرة عامة على الهندسة المعمارية

```
Request Flow with Caching Layers
=================================

  Client Request
       |
       v
  +------------------+
  |  CDN / Edge      |  <-- Static assets, ISR pages
  +------------------+
       |
       v
  +------------------+
  |  Next.js Cache   |  <-- unstable_cache, revalidateTag
  +------------------+
       |
       v
  +------------------+
  |  In-Memory Cache |  <-- SessionCache, ServerClient cache
  +------------------+
       |
       v
  +------------------+
  |  Data Source      |  <-- Database, filesystem, APIs
  +------------------+
```

## الطبقة الأولى: ذاكرة التخزين المؤقت للمحتوى (Next.js `unstable_cache` )

يستخدم القالب تكوين ذاكرة التخزين المؤقت المركزي المحدد في 1 لإدارة علامات TTL وذاكرة التخزين المؤقت لجميع بيانات المحتوى.

### تكوين ذاكرة التخزين المؤقت TTL

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### علامات ذاكرة التخزين المؤقت للإبطال المستهدف

تتيح علامات ذاكرة التخزين المؤقت إمكانية إبطال التفاصيل الدقيقة دون مسح ذاكرة التخزين المؤقت بأكملها:

```typescript
// lib/cache-config.ts
export const CACHE_TAGS = {
  CONTENT: 'content',
  ITEMS: 'items',
  ITEM: (slug: string) => `item:${slug}`,
  CATEGORIES: 'categories',
  TAGS: 'tags',
  COLLECTIONS: 'collections',
  CONFIG: 'config',
  PAGES: 'pages',
  PAGE: (slug: string) => `page:${slug}`,
  ITEMS_LOCALE: (locale: string) => `items:${locale}`,
  CATEGORIES_LOCALE: (locale: string) => `categories:${locale}`,
} as const;
```

### استخدام `unstable_cache` في وظائف المحتوى

تقرأ وظائف تحميل المحتوى في نظام ملفات التفاف 1 باستخدام 2:

```typescript
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from './cache-config';

const getCachedItems = unstable_cache(
  async (locale: string) => {
    // Expensive filesystem read
    return await loadItemsFromDisk(locale);
  },
  ['items'],
  {
    tags: [CACHE_TAGS.ITEMS, CACHE_TAGS.CONTENT],
    revalidate: CACHE_TTL.CONTENT,
  }
);
```

## الطبقة الثانية: ذاكرة التخزين المؤقت للجلسة (داخل الذاكرة)

تعمل الفئة 0 في 1 على التخلص من حمل المصادقة الزائد عن طريق تخزين الجلسات التي تم فك تشفيرها مؤقتًا في الذاكرة.

### كيف يعمل

```
Session Lookup Flow
====================

  API Request
       |
       v
  Extract session token (cookie / header)
       |
       v
  SHA-256 hash token -> cache key
       |
       v
  +-- Cache HIT? --+
  |  YES           |  NO
  |  Return cached |  Call NextAuth auth()
  |  session       |  Cache result
  +----------------+  Return session
```

### قرارات التصميم الرئيسية

| قرار | القيمة | الأساس المنطقي |
|----------|-------|-----------|
| تي تي ال | 10 دقائق | التوازن بين النضارة وتقليل النفقات العامة |
| الحجم الأقصى | 1000 إدخال | منع تسرب الذاكرة على الخوادم طويلة الأمد |
| تجزئة المفتاح | شا-256 | منع تسرب الرمز المميز في عمليات تفريغ الذاكرة |
| تنظيف | 10% احتمالية | استهلاك تكلفة التنظيف عبر الطلبات |
| الإخلاء | LRU (الأقدم أولاً) | قم بإزالة الإدخالات التي تم إنشاؤها مؤخرًا |

### إبطال ذاكرة التخزين المؤقت

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## الطبقة 3: ذاكرة التخزين المؤقت لعميل واجهة برمجة تطبيقات الخادم

يتضمن 0 في 1 ذاكرة تخزين مؤقت LRU مدمجة لطلبات GET:

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

سلوك ذاكرة التخزين المؤقت:
- ** طلبات GET فقط ** يتم تخزينها مؤقتًا (تتجاوز الطفرات ذاكرة التخزين المؤقت)
- **الطلبات المتضمنة AbortSignal** لا يتم تخزينها مؤقتًا أبدًا
- ** إخلاء LRU ** يزيل الإدخال الأقدم عندما تصل ذاكرة التخزين المؤقت إلى 100 عنصر
- ** انتهاء الصلاحية القائم على TTL ** يبطل الإدخالات بعد 5 دقائق

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## استراتيجية إبطال ذاكرة التخزين المؤقت

توفر الوحدة `lib/cache-invalidation.ts` إبطالًا آمنًا يتعامل مع قيود مرحلة العرض الخاصة بـ Next.js:

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

يكتشف المجمع أخطاء مرحلة العرض ويسجل التحذيرات بدلاً من التعطل:

```typescript
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      console.warn(`Skipping cache invalidation during render phase (tag: ${tag})`);
    } else {
      throw error;
    }
  }
}
```

## ISR (التجديد الثابت التزايدي)

تستخدم الصفحات ISR من خلال تصدير 0 أو TTLs لكل وظيفة:

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## اعتبارات الأداء

1. **معدل دخول ذاكرة التخزين المؤقت للجلسة**: المراقبة باستخدام `getSessionCacheStats()` . المعدل الصحي فوق 80%.
2. **ذاكرة التخزين المؤقت للمحتوى**: مدة البقاء لمدة 10 دقائق تعني أن تحديثات المحتوى تستغرق ما يصل إلى 10 دقائق للظهور. فرض الإلغاء بعد المزامنة للحصول على التحديثات الفورية.
3. **استخدام الذاكرة**: الحد الأقصى لذاكرة التخزين المؤقت للجلسة هو 1000 إدخال (حوالي 1-2 ميجابايت). الحد الأقصى لذاكرة التخزين المؤقت لعميل الخادم هو 100 إدخال.
4. **البدء البارد**: الطلب الأول بعد النشر يفتقد دائمًا جميع ذاكرات التخزين المؤقت في الذاكرة.

### مراقبة أداء ذاكرة التخزين المؤقت

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## مرجع التكوين

| طبقة ذاكرة التخزين المؤقت | تي تي ال | الحجم الأقصى | الإخلاء | إبطال |
|-------------|-----------|------------|--------------|------|------|------|
| المحتوى (unstable_cache) | 600 ثانية | غير محدود | على أساس العلامات | `revalidateTag()` |
| جلسة (في الذاكرة) | 10 دقائق | 1000 | LRU + TTL | `invalidateSessionCache()` |
| عميل خادم API | 5 دقائق | 100 | LRU + TTL | `clearCache()` |
| صفحات ISR | 600 ثانية | القائم على القرص | على أساس الوقت | `revalidatePath()` |

## استكشاف الأخطاء وإصلاحها

### البيانات القديمة بعد تحديث المحتوى

1. تأكد من استدعاء `invalidateContentCaches()` بعد اكتمال مزامنة المستودع.
2. تحقق من تطابق علامات ذاكرة التخزين المؤقت بين الوظيفة المخزنة مؤقتًا واستدعاء الإلغاء.
3. للإبطال الفوري، اتصل بالرقم 5 لمسح ذاكرة التخزين المؤقت للمحتوى الموجود في الذاكرة.

### ذاكرة التخزين المؤقت للجلسة مفقودة في كل طلب

1. تحقق من وجود رمز الجلسة في ملفات تعريف الارتباط أو الرؤوس.
2. تأكد من أن `extractSessionToken` يمكنه تحليل تنسيق ملف تعريف الارتباط الخاص بك.
3. تأكد من تطابق أسماء ملفات تعريف الارتباط المميزة: `next-auth.session-token` أو 8.

### تزايد استخدام الذاكرة

1. تقتصر ذاكرة التخزين المؤقت للجلسة على 1000 إدخال مع التنظيف الاحتمالي.
2. قوة التنظيف: 9.
3. الشاشة باستخدام 10.

## الوثائق ذات الصلة

- [التعمق في إدارة الجلسة](./session-management-deep-dive.md)
- [بنية عميل API](./api-client-architecture.md)
- [تحسين قاعدة البيانات](./database-optimization.md)
