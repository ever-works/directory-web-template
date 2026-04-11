---
id: caching-deep-dive
title: מטמון ארכיטקטורה צלילה עמוקה
sidebar_label: ארכיטקטורת מטמון
sidebar_position: 1
---

# צלילה עמוקה של אדריכלות במטמון

מדריך זה מכסה את ארכיטקטורת המטמון הרב-שכבתית המשמשת על פני התבנית, ממטמון הפעלה בזיכרון ועד לאסטרטגיות מטמון של Next.js ISR ו-CDN ברמת CDN.

## סקירה כללית של אדריכלות

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

## שכבה 1: מטמון תוכן (Next.js `unstable_cache` )

התבנית משתמשת בתצורת מטמון מרכזית המוגדרת ב- `lib/cache-config.ts` לניהול תגי TTL ותגי מטמון עבור כל נתוני התוכן.

### תצורת TTL של מטמון

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### תגי מטמון עבור אי תוקף ממוקד

תגי מטמון מאפשרים אי תוקף עדין מבלי לשטוף את כל המטמון:

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

### שימוש ב- `unstable_cache` בפונקציות תוכן

פונקציות טעינת תוכן במערכת הקבצים `lib/content.ts` עוטפת נקראת עם `unstable_cache` :

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

## שכבה 2: מטמון הפעלה (בזיכרון)

המחלקה `SessionCache` ב- `lib/auth/session-cache.ts` מבטלת תקורה מיותרת של אימות על ידי שמירת הפעלות מפוענחות במטמון בזיכרון.

### איך זה עובד

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

### החלטות עיצוב מפתח

| החלטה | ערך | נימוק |
|--------|-------|--------|
| TTL | 10 דקות | איזון בין טריות להפחתת תקורה |
| גודל מקסימלי | 1,000 כניסות | מניעת דליפות זיכרון בשרתים ארוכי טווח |
| גיבוב מפתחות | SHA-256 | מניעת דליפת אסימון בהטמונות זיכרון |
| ניקוי | 10% הסתברותי | הפחת עלות ניקוי על פני בקשות |
| פינוי | LRU (המבוגר ביותר-ראשון) | הסר ערכים שהכי פחות נוצרו לאחרונה |

### אי תוקף מטמון

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## שכבה 3: מטמון לקוח API של שרת

ה- `ServerClient` ב- `lib/api/server-api-client.ts` כולל מטמון LRU מובנה עבור בקשות GET:

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

התנהגות מטמון:
- **רק בקשות GET** מאוחסנות במטמון (מוטציות עוקפות את המטמון)
- **בקשות עם AbortSignal** לעולם לא נשמרות במטמון
- **פינוי LRU** מסיר את הערך הישן ביותר כאשר המטמון מגיע ל-100 פריטים
- **תפוגה מבוססת TTL** מבטל כניסות לאחר 5 דקות

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## אסטרטגיית אי תוקף המטמון

המודול `lib/cache-invalidation.ts` מספק ביטול בטוח המטפל בהגבלות רינדור של Next.js:

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

המעטפת `safeRevalidateTag` מזהה שגיאות שלב רינדור ומתעדת אזהרות במקום קריסה:

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

## ISR (התחדשות סטטית אינקרמנטלית)

דפים משתמשים ב-ISR דרך ה-TTL `revalidate` לייצוא או לכל פונקציה:

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## שיקולי ביצועים

1. **קצב פגיעה של מטמון הפעלה**: צג באמצעות `getSessionCacheStats()` . שיעור בריא הוא מעל 80%.
2. **מטמון התוכן**: ה-TTL של 10 דקות אומר שלעדכוני תוכן לוקח עד 10 דקות להופיע. כפה ביטול לאחר סנכרון לעדכונים מיידיים.
3. **שימוש בזיכרון**: המטמון של ההפעלה מוגבל ל-1,000 ערכים (בערך 1-2 MB). מטמון לקוח השרת מכסה 100 ערכים.
4. **התחלות קרות**: בקשה ראשונה לאחר הפריסה תמיד מחמיצה את כל המטמונים בזיכרון.

### ניטור ביצועי מטמון

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## הפניה לתצורה

| שכבת מטמון | TTL | גודל מקסימלי | פינוי | אי תוקף |
|-------------|-----|--------|------------------|
| תוכן (מטמון_לא יציב) | שנות ה-600 | ללא הגבלה | מבוסס תגים | `revalidateTag()` |
| מושב (בזיכרון) | 10 דקות | 1,000 | LRU + TTL | `invalidateSessionCache()` |
| לקוח API של שרת | 5 דקות | 100 | LRU + TTL | `clearCache()` |
| דפי ISR | שנות ה-600 | מבוסס דיסק | מבוסס זמן | `revalidatePath()` |

## פתרון בעיות

### נתונים מיושנים לאחר עדכון התוכן

1. בדוק ש- `invalidateContentCaches()` נקרא לאחר סיום סנכרון המאגר.
2. ודא את התאמת תגי המטמון בין הפונקציה המאוחסנת במטמון לבין קריאת הביטול.
3. לביטול מיידי, התקשר ל- `clearFetchItemsCache()` כדי לנקות את מטמון התוכן בזיכרון.

### מטמון הפעלה פספס בכל בקשה

1. ודא שאסימון ההפעלה קיים בקובצי Cookie או בכותרות.
2. בדוק ש- `extractSessionToken` יכול לנתח את פורמט העוגיות שלך.
3. ודא ששמות קובצי ה-Cookie תואמים: `next-auth.session-token` או `__Secure-next-auth.session-token` .

### השימוש בזיכרון הולך וגדל

1. מטמון ההפעלה מגביל את עצמו ל-1,000 ערכים עם ניקוי הסתברותי.
2. ניקוי בכוח: `sessionCache.clear()` .
3. צג עם `getSessionCacheStats().size` .

## תיעוד קשור

- [Session Management Deep Dive](./session-management-deep-dive.md)
- [API Client Architecture](./api-client-architecture.md)
- [אופטימיזציה של מסד נתונים](./database-optimization.md)
