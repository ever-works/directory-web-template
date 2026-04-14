---
id: utils-reference
title: "הפניה לשירותים"
sidebar_label: "Utils הפניה"
sidebar_position: 24
---

# הפניה לשירותים

התבנית מספקת פונקציות שירות בשתי ספריות: `utils/` עבור עוזרים למטרות כלליות ו-`lib/utils/` עבור כלי עזר משולבים במסגרת. הפניה זו מתעדת כל מודול שירות, הייצוא שלו ודפוסי השימוש שלו.

## מבנה ספריות

```
utils/                              # General-purpose utilities
├── date.ts                         # Date formatting
├── pagination.ts                   # Pagination helpers
└── profile-button.utils.ts         # Profile UI helpers

lib/utils/                          # Framework-integrated utilities
├── index.ts                        # cn() class name merger
├── api-error.ts                    # Safe API error responses
├── bot-detection.ts                # User-Agent bot detection
├── checkout-utils.ts               # Payment checkout helpers
├── client-auth.ts                  # Client-side auth utilities
├── currency-format.ts              # Currency formatting
├── custom-navigation.ts            # Navigation helpers
├── database-check.ts               # Database connectivity check
├── email-validation.ts             # ReDoS-safe email validation
├── error-handler.ts                # Error handling utilities
├── featured-items.ts               # Featured item sorting/filtering
├── footer-utils.ts                 # Footer content utilities
├── image-domains.ts                # Image domain whitelist
├── pagination-validation.ts        # Server-side pagination validation
├── payment-provider.ts             # Payment provider detection
├── plan-expiration.utils.ts        # Plan expiration calculations
├── rate-limit.ts                   # In-memory rate limiter
├── request-body.ts                 # Request body parsing
├── server-url.ts                   # Server URL resolution
├── settings.ts                     # Settings helpers
├── slug.ts                         # URL slug utilities
├── url-cleaner.ts                  # URL cleaning and validation
├── url-filter-sync.ts              # URL/filter state synchronization
├── twenty-crm-client.utils.ts      # Twenty CRM client utils
└── twenty-crm-validation.ts        # Twenty CRM validation
```

## כלי עזר לתאריך (`utils/date.ts`)

### formatDate

עיצוב תאריך עם חודש, יום ושנה ארוכים.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### formatDateTime

עיצוב תאריך עם חודש ארוך, יום, שנה, שעה ודקה.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### formatDateShort

פורמטים עם חודש קצר. מחזירה `'-'` עבור ערכים null/לא מוגדרים.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## עימוד (`utils/pagination.ts`)

### clampAndScrollToTop

מצמיד מספר עמוד לטווח חוקי וגולל את החלון למעלה.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|פרמטר|הקלד|תיאור|
|---|---|---|
|`newPage`|`number`|מספר העמוד המבוקש|
|`total`|`number`|סך העמודים|
|`setPage`|`(page: number) => void`|תפקיד קובע המדינה|

התנהגות: מהדק לטווח `[1, total]`, מטפל ב-`NaN` כברירת מחדל ל-1, ומבצע גלילה חלקה למעלה.

## כלי עזר ללחצן פרופיל (`utils/profile-button.utils.ts`)

### formatDisplayName

עיצוב חכם של שמות תצוגה על סמך אורך:

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### getInitials

מחלץ ראשי תיבות מתוך שם:

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### getProfilePath

בונה נתיב פרופיל בטוח בכתובת האתר:

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### getThemeColors

החזרת צבעי ערכת נושא נוכחיים עבור שכבות-על של ממשק משתמש:

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## מיזוג שם כיתה (`lib/utils/index.ts`)

### cn

משלב שיעורי CSS של Tailwind עם פתרון סכסוכים:

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

משתמש ב-`clsx` לשיעורים מותנים וב-`tailwind-merge` לפתרון סכסוכים.

## טיפול בשגיאות API (`lib/utils/api-error.ts`)

### safeErrorResponse

יוצר תגובות שגיאה המונעות דליפת מידע בייצור:

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|סביבה|התגובה מכילה|
|---|---|
|פיתוח|בפועל `error.message`|
|הפקה|גנרי `fallbackMessage` בלבד|

פרטי השגיאה המלאים תמיד מתועדים בצד השרת ללא קשר לסביבה.

### safeErrorMessage

מחלץ מחרוזת הודעת שגיאה בטוחה מבלי ליצור תגובה:

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## אימות דוא"ל (`lib/utils/email-validation.ts`)

### isValidEmail

אימות דוא"ל בטוח ב-ReDoS באמצעות ניתוח ידני (ללא ביטוי רגולרי פגיע):

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

כללי אימות:
- אורך בין 5 ל-254 תווים
- חלק מקומי: 1-64 תווים, אלפאנומרי + תווים מיוחדים מותרים
- דומיין: מבנה חוקי עם נקודה אחת לפחות
- כל תווית דומיין: 1-63 תווים, מתחיל/מסתיים באלפאנומרי

### isValidEmailRegex

אימות אלטרנטיבי המבוסס על regex (גם ReDoS-safe):

```typescript
isValidEmailRegex('user@example.com')  // true
```

## עיצוב מטבע (`lib/utils/currency-format.ts`)

### פורמטCurrency

פורמט סכומים של יחידות קטנות (סנט) למחרוזות מטבע מקומיות:

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### formatCurrencyAmount

פורמט סכומים של יחידות עיקריות (דולר) למחרוזות מטבע מקומיות:

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### getCurrencySymbol

מחזירה את הסמל עבור קוד מטבע:

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

תומך ב-22 מטבעות כולל USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW ועוד.

## Slug Utilities (`lib/utils/slug.ts`)

### להצניע

ממיר טקסט לשבלולים ידידותיים לכתובות אתרים:

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### לבטל את העצל

ממיר שבלולים בחזרה לטקסט קריא:

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## כתובות שירות (`lib/utils/url-cleaner.ts`)

### cleanUrl

מנקה ומנרמל מחרוזות כתובת URL:

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

מאמת שכתובת אתר היא מוחלטת עם פרוטוקול ושם מארח:

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### getBaseUrl

מחזירה את כתובת האתר הבסיסית של האפליקציה המנורמלת עם שרשרת החלפה:

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### buildUrl

בונה כתובות אתרים מלאות מקטעי נתיב:

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## הגבלת תעריפים (`lib/utils/rate-limit.ts`)

### מגבלת שיעור

מגביל קצב בזיכרון עבור נקודות קצה של API:

```typescript
import { ratelimit } from '@/lib/utils/rate-limit';

const result = await ratelimit(
  `api:${clientIP}`,  // Unique key
  100,                // Max requests
  60 * 1000           // Window: 1 minute
);

if (!result.success) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': String(result.retryAfter) }
  });
}
```

סוג החזרה:

```typescript
interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;  // Seconds until reset (only when limited)
}
```

### resetRateLimit / getRateLimitStatus

```typescript
resetRateLimit('api:192.168.1.1');     // Clear rate limit for key

const status = getRateLimitStatus('api:192.168.1.1', 100);
// { remaining: 95, resetTime: 1706000000000 }
```

החנות מנוקה אוטומטית כל 5 דקות.

## אימות עידוד (`lib/utils/pagination-validation.ts`)

### validatePaginationParams

אימות פרמטר עימוד בצד השרת עבור נתיבי API:

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

כללי אימות:
- `page`: חייב להיות מספר שלם חיובי (ברירת מחדל: 1)
- `limit`: חייב להיות בין 1 ל-100 (ברירת מחדל: 10)

## זיהוי בוטים (`lib/utils/bot-detection.ts`)

### isBot

מזהה בוטים לפי מחרוזת User-Agent:

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

קטגוריות שזוהו: מנועי חיפוש, סורקי מדיה חברתית, כלי ביצועים, מסגרות אוטומציה, לקוחות HTTP.

## פריטים נבחרים (`lib/utils/featured-items.ts`)

### sortItemsWithFeatured

מקומות פריטים מוצגים בתחילת רשימה, ממוינים לפי סדר מוצג:

```typescript
const sorted = sortItemsWithFeatured(allItems, featuredItems);
// Featured items first (by order), then remaining items
```

### isItemFeatured / getFeaturedItemData

```typescript
const featured = isItemFeatured('my-item', featuredItems);  // boolean
const data = getFeaturedItemData('my-item', featuredItems);  // FeaturedItem | undefined
```

### filterActiveFeaturedItems

מסיר פריטים נבחרים שפג תוקפם בהתבסס על תאריך `featuredUntil`.

### isFeaturedItemExpiring

בודק אם תוקף פריט מוצג פג תוך 7 ימים.

## כתובת האתר של השרת (`lib/utils/server-url.ts`)

### getFrontendUrl

פותר את כתובת האתר של ממשק הקצה מהקשר הבקשה הנוכחי:

```typescript
const url = await getFrontendUrl();
```

סדר רזולוציה:
1. `window.location.origin` (צד הלקוח)
2. `x-forwarded-host` / `host` כותרות (בצד השרת, מאומת כנגד תצורה)
3. מוגדר `WEB_URL` fallback

## טבלת סיכום

|מודול|ייצוא מפתח|קטגוריה|
|---|---|---|
|`utils/date`|`formatDate`, `formatDateTime`, `formatDateShort`|עיצוב|
|`utils/pagination`|`clampAndScrollToTop`|עוזרי ממשק משתמש|
|`utils/profile-button.utils`|`formatDisplayName`, `getInitials`, `getProfilePath`|עוזרי ממשק משתמש|
|`lib/utils/index`|`cn`|סטיילינג|
|`lib/utils/api-error`|`safeErrorResponse`, `safeErrorMessage`|טיפול בשגיאות|
|`lib/utils/bot-detection`|`isBot`|אבטחה|
|`lib/utils/currency-format`|`formatCurrency`, `formatCurrencyAmount`, `getCurrencySymbol`|עיצוב|
|`lib/utils/email-validation`|`isValidEmail`, `isValidEmailRegex`|אימות|
|`lib/utils/featured-items`|`sortItemsWithFeatured`, `filterActiveFeaturedItems`|נתונים|
|`lib/utils/pagination-validation`|`validatePaginationParams`|אימות|
|`lib/utils/rate-limit`|`ratelimit`, `resetRateLimit`|אבטחה|
|`lib/utils/server-url`|`getFrontendUrl`|תשתית|
|`lib/utils/slug`|`slugify`, `deslugify`|עיצוב|
|`lib/utils/url-cleaner`|`cleanUrl`, `getBaseUrl`, `buildUrl`|תשתית|
