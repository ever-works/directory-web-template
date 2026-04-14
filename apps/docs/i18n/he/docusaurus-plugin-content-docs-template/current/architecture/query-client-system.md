---
id: query-client-system
title: "מערכת שאילתות לקוח"
sidebar_label: "מערכת שאילתות לקוח"
sidebar_position: 43
---

# מערכת שאילתות לקוח

## סקירה כללית

מערכת ה-Query Client מספקת תצורה מרכזית של TanStack React Query עבור האפליקציה. הוא מורכב משני מודולים: מפעל לקוח שאילתה למטרות כלליות (`lib/query-client.ts`) המטפל בניהול יחידת שרת/לקוח, ותצורה מותאמת לחיוב (`lib/react-query-config.ts`) עם מפעלי מפתח שאילתות, אסטרטגיות שליפה מוקדמת וכלי עזר לאי תוקף של מטמון.

## אדריכלות

למערכת שתי נקודות כניסה המשרתות חששות שונים:

- **`lib/query-client.ts`** -- לקוח השאילתה הראשי בשימוש בכל היישום. זה יוצר מופעים נפרדים עבור סביבות שרת ולקוח, ומבטיח שהעיבוד בצד השרת לא מחלק מצב בין בקשות בזמן שהדפדפן עושה שימוש חוזר במופע בודד.
- **`lib/react-query-config.ts`** -- לקוח שאילתה מיוחד המוגדר לניהול חיוב ומנוי. הוא מוסיף מפעלי מפתח שאילתות, אסטרטגיות שליפה מוקדמת וכלי עזר לפסילת מטמון המותאמים לנתונים הקשורים לתשלום.

```
query-client.ts
  |-- createQueryClientInstance()   (Factory function)
  |-- getQueryClient()              (Server/client singleton)

react-query-config.ts
  |-- queryClient                   (Billing-optimized instance)
  |-- queryKeys                     (Key factory)
  |-- prefetchStrategies            (Prefetch helpers)
  |-- cacheUtils                    (Invalidation utilities)
```

## הפניה ל-API

### ייצוא מ-`lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

פונקציית מפעל שיוצרת `QueryClient` חדש עם ברירות המחדל הבאות:

|אפשרות|ערך|מטרה|
|--------|-------|---------|
|`staleTime`|5 דקות|נתונים נחשבים טריים|
|`gcTime`|10 דקות|שמירת מטמון לאחר שימוש אחרון|
|`refetchOnWindowFocus`|`false`|מנע אחזור מוגזם|
|`refetchOnMount`|`false`|דלג על אחזור אם הנתונים טריים|
|`refetchOnReconnect`|`true`|אחזר מחדש בשחזור הרשת|
|`retry`|עד 2 ניסיונות|נסה שוב פשוט עבור כל השגיאות|
|`retryDelay`|גיבוי אקספוננציאלי, מקסימום 30 שניות|`1000 * 2^attempt`|
|Mutation `retry`| 1 |Retry mutations once|
|Mutation `onError`|Toast + console.error|הודעת שגיאה גלובלית|

#### `getQueryClient(): QueryClient`

מחזיר את המופע `QueryClient` המתאים. בשרת, הוא יוצר מופע חדש לכל שיחה (ללא מצב משותף). בלקוח, הוא מחזיר מופע יחיד (נוצר פעם אחת ונעשה בו שימוש חוזר).

### ייצוא מ-`lib/react-query-config.ts`

#### `queryClient: QueryClient`

מופע `QueryClient` מוגדר מראש המותאם לפעולות חיוב. ההבדלים העיקריים מהלקוח הכללי:

- `refetchOnWindowFocus: true` -- מבטיח שסטטוס המנוי תמיד עדכני
- `refetchOnMount: true` -- משחזר נתונים מיושנים על הרכבה של רכיב
- ניסיון חוזר מדלג על שגיאות 4xx ו-401 (לא מנסים שוב שגיאות לקוח/אישור)
- גיבוי אקספוננציאלי כולל ריצוד (85-115% מהשהיית הבסיס)
- `notifyOnChangeProps` מוגדר ל-`['data', 'error', 'isLoading', 'isFetching']` עבור עיבוד מחדש אופטימלי

#### `queryKeys`

מפעל מפתח שאילתה היררכי לניהול מטמון עקבי:

```typescript
const queryKeys = {
  billing: {
    all: ['billing'],
    subscription: () => ['billing', 'subscription'],
    payments: () => ['billing', 'payments'],
    user: (userId: string) => ['billing', 'user', userId],
  },
  user: {
    all: ['user'],
    profile: () => ['user', 'profile'],
    settings: () => ['user', 'settings'],
  },
  admin: {
    all: ['admin'],
    users: () => ['admin', 'users'],
    subscriptions: () => ['admin', 'subscriptions'],
    payments: () => ['admin', 'payments'],
  },
};
```

#### `prefetchStrategies`

פונקציות שליפה מראש מובנות מראש לדפוסי ניווט נפוצים:

- `prefetchStrategies.billing()` -- משחזר מראש נתוני מנויים ותשלום
- `prefetchStrategies.userProfile()` -- משחזר מראש נתוני פרופיל משתמש

#### `cacheUtils`

כלי עזר לניהול מטמון:

- `cacheUtils.invalidateBilling()` -- מבטל את כל שאילתות החיוב
- `cacheUtils.invalidateSubscription()` -- מבטל שאילתת מנוי
- `cacheUtils.invalidatePayments()` -- מבטל את שאילתת התשלומים
- `cacheUtils.removeBilling()` -- Removes all billing data from cache
- `cacheUtils.resetCache()` -- מנקה את כל מטמון השאילתה

## פרטי יישום

**Server/client split**: `getQueryClient()` uses TanStack's `isServer` flag to determine the environment. Server instances are ephemeral (new per request) to prevent data leaking between users. The browser singleton is stored in a module-level variable.

**Error handling strategy**: The general client uses `toast.error()` from Sonner for mutation errors, providing immediate user feedback. The billing client skips retries on 4xx errors since they indicate client-side issues that retrying will not resolve.

**נסה שוב עם ריצוד**: לקוח החיוב מוסיף ריצוד אקראי (85-115% מהשהיית הבסיס) לגיבוי אקספוננציאלי כדי למנוע בעיות עדר רועם כאשר לקוחות רבים מנסים שוב בו-זמנית לאחר הפרעה בשירות.

## תצורה

אין צורך בקבצי תצורה נוספים. שני הלקוחות מוגדרים לחלוטין בקוד. To adjust defaults, modify the `defaultOptions` in the respective factory functions.

## דוגמאות לשימוש

```typescript
// General usage -- getting the query client
import { getQueryClient } from '@/lib/query-client';

// In a React Server Component or provider
const queryClient = getQueryClient();

// In a client component with React Query
import { useQuery } from '@tanstack/react-query';

function ItemsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });
  // ...
}

// Billing usage -- using query key factories
import { queryKeys, cacheUtils } from '@/lib/react-query-config';

function useSubscription() {
  return useQuery({
    queryKey: queryKeys.billing.subscription(),
    queryFn: fetchSubscription,
  });
}

// After a successful payment
async function onPaymentSuccess() {
  cacheUtils.invalidateBilling();
}

// Prefetch on navigation
import { prefetchStrategies } from '@/lib/react-query-config';

function SettingsLink() {
  return (
    <Link
      href="/settings/billing"
      onMouseEnter={() => prefetchStrategies.billing()}
    >
      Billing Settings
    </Link>
  );
}
```

## שיטות עבודה מומלצות

- Use `getQueryClient()` from `lib/query-client.ts` for all general data fetching; use the billing-specific client only for payment-related features.
- Always use `queryKeys` factories for cache key consistency; לעולם אל מערכי מפתחות שאילתות קשיח.
- Call `cacheUtils.invalidateBilling()` after any mutation that changes subscription or payment state.
- Use `prefetchStrategies` on hover or route pre-loading to improve perceived performance.
- Avoid calling `cacheUtils.resetCache()` in production unless absolutely necessary, as it discards all cached data.

## מודולים קשורים

- [שכבת לקוח API](/template/architecture/api-client-layer) -- גורם לקריאות ה-API לצרוך על ידי פונקציות שאילתה
- [מערכת Guards](./guards-system-deep-dive) -- בקרת גישה מבוססת תוכנית שעשויה להיות תלויה בנתוני מנוי
