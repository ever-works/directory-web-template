---
id: cache-system
title: "מערכת מטמון"
sidebar_label: "מערכת מטמון"
sidebar_position: 40
---

# מערכת מטמון

## סקירה כללית

מערכת המטמון מספקת תצורת מטמון מרכזית ואי תוקף עבור היישום Next.js. הוא מגדיר משכי TTL (Time To Live) עקביים ומפתחות מטמון מבוססי תגים המשמשים עם Next.js `unstable_cache`, ומציע כלי עזר לאי תוקף של מטמון בטוח המטפל במקרים קצה כמו הגבלות שלב רינדור ב-Next.js 16.

## אדריכלות

מערכת המטמון מפוצלת לשני מודולים הפועלים יחד:

- **`lib/cache-config.ts`** -- מגדיר את כל קבועי ה-TTL של המטמון ומחוללי תגי המטמון. זהו מקור האמת היחיד לגבי משך הזמן שהנתונים נשמרים במטמון ובאילו תגים משתמשים לביטול ממוקד.
- **`lib/cache-invalidation.ts`** -- מספק פונקציות אסינכרון הקוראות ל-`revalidateTag()` כדי לבטל את התוקף של מטמונים ספציפיים או כל מטמון הקשור לתוכן. זה עוטף כל קריאה בלוגיקת בטיחות כדי לטפל בשגיאות עיבוד שלב של Next.js בחן.

שני המודולים נצרכים על ידי שכבת התוכן (`lib/content.ts`) ותהליכי סנכרון ברקע כדי לשמור על עדכוני הנתונים במטמון לאחר עדכוני המאגר.

## הפניה ל-API

### ייצוא מ-`lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

אובייקט קבוע המגדיר משכי מטמון בשניות עבור כל קטגוריית נתונים.

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

הגדרות תג מטמון לשימוש עם `revalidateTag()`. תגים סטטיים הם מחרוזות פשוטות; תגים דינמיים הם פונקציות מפעל שמקבלות פרמטר של שבלול או מיקום.

### ייצוא מ-`lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

מבטל את כל המטמונים הקשורים לתוכן (תוכן, פריטים, קטגוריות, תגים, אוספים, דפים) ומנקה את המטמון `fetchItems` בזיכרון. יש לקרוא לאחר סנכרון מאגר מוצלח.

#### `invalidateItemCache(slug: string): Promise<void>`

מבטל את תוקף המטמון עבור פריט בודד המזוהה על ידי הקליעה שלו.

#### `invalidatePageCache(slug: string): Promise<void>`

מבטל את תוקף המטמון עבור דף סטטי בודד המזוהה על ידי הקליעה שלו.

## פרטי יישום

**בטיחות ב-Render-phase**: Next.js זורק שגיאה כאשר `revalidateTag()` נקרא במהלך שלב העיבוד של React. העטיפה הפנימית של `safeRevalidateTag()` תופסת את השגיאה הספציפית הזו באמצעות `isRenderPhaseError()`, שבודקת אם קיימים תבניות מחרוזות מרובות (`during render`, `render phase`, `revalidate` + @@@TOK006@@K@, @@TOK@0@0@0, @@@TOK006@@0 להיות עמיד בפני שינויים בהודעת השגיאה של Next.js בין הגרסאות.

**תאימות Next.js 16**: הקריאה `revalidateTag()` כוללת ארגומנט שני `'max'` לסמנטיקה stale-while-revalidate, כנדרש ב-Next.js 16.

**ניקוי מטמון בזיכרון**: לאחר אי תוקף מבוסס תג, `invalidateContentCaches()` מתקשר גם ל-`clearFetchItemsCache()` כדי לשטוף נתונים בזיכרון שעוקפים את המטמון מבוסס הקובץ Next.js.

## תצורה

אין צורך בתצורה נוספת. ערכי ה-TTL הם קבועים מקודדים. כדי לשנות את משכי המטמון, שנה את הערכים ב-`CACHE_TTL`.

|קבוע|משך זמן|Use Case|
|----------|----------|----------|
|`CONTENT`|600 שניות (10 דקות)|מטמון תוכן כללי|
|`ITEM`|600 שניות (10 דקות)|דפי פריט בודדים|
|`CONFIG`|600 שניות (10 דקות)|תצורת האתר|
|`PAGES`|600 שניות (10 דקות)|דפים סטטיים|

## דוגמאות לשימוש

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

## שיטות עבודה מומלצות

- השתמש תמיד בקבועים `CACHE_TAGS` במקום מחרוזות תגיות בקידוד קשיח כדי למנוע שגיאות הקלדה ולהבטיח עקביות.
- התקשר ל`invalidateContentCaches()` לאחר כל סנכרון מוצלח של מאגר כדי לשמור על עדכניות הנתונים.
- השתמש בתגים ספציפיים לאזור (`ITEMS_LOCALE`, `CATEGORIES_LOCALE`) בעת שמירה של נתונים עם סינון מקומי במטמון כדי לאפשר ביטול ממוקד.
- אל תתקשר ישירות אל `revalidateTag()`; השתמש במעטפת הבטוח מ-`cache-invalidation.ts` כדי למנוע קריסות של שלב רינדור.
- שמור על ערכי TTL מיושרים בין סוגי נתונים קשורים כדי למנוע הפניות צולבות מיושנות.

## מודולים קשורים

- [ספריית תוכן](/template/architecture/content-library) -- צרכן ראשי של תגי מטמון וערכי TTL
- [מערכת Config Manager](./config-manager-system) -- משתמש ב-`CACHE_TAGS.CONFIG` לשמירה במטמון של תצורת האתר
