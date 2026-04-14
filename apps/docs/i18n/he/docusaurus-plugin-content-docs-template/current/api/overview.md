---
id: overview
title: סקירה כללית של נתיבי API
sidebar_label: סקירה כללית
sidebar_position: 0
---

# סקירה כללית של נתיבי API

התבנית חושפת כ-151 מטפלי נתיב API המאורגנים על פני 29 קבוצות נתיבים תחת הספרייה `app/api/`. כל המסלולים משתמשים במוסכמה של Next.js App Router עם `route.ts` קבצי ייצוא של מטפלי שיטות HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

## קבוצות מסלול

|קבוצה|נתיב|תיאור|כ. מסלולים|
|-------|------|-------------|---------------|
|**אדמין**|`/api/admin/*`|פאנל ניהול פעולות CRUD| ~60 |
|**סמכות**|`/api/auth/*`|מטפלי NextAuth + ניהול סיסמאות| 2 |
|**קטגוריות**|`/api/categories/*`|שאילתות קטגוריות ציבוריות| 1 |
|**לקוח**|`/api/client/*`|לוח מחוונים ללקוחות וניהול פריטים| ~7 |
|**אוספים**|`/api/collections/*`|שאילתות איסוף ציבורי| 1 |
|**תצורה**|`/api/config/*`|תצורת דגל תכונה| 1 |
|**קרון**|`/api/cron/*`|עבודות רקע מתוזמנות| 3 |
|**משתמש נוכחי**|`/api/current-user`|פרטי משתמש מאומתים נוכחיים| 1 |
|**חלץ**|`/api/extract`|חילוץ מטא נתונים של כתובת אתר| 1 |
|**מועדפים**|`/api/favorites/*`|פריטים מועדפים על המשתמש| 2 |
|**פריטים מומלצים**|`/api/featured-items`|רשימות פריטים מומלצים| 1 |
|**קוד גיאוגרפי**|`/api/geocode`|קידוד גיאוגרפי של כתובת| 1 |
|**בריאות**|`/api/health/*`|בדיקות תקינות המערכת| 1 |
|**פנימי**|`/api/internal/*`|פעולות פנימיות (DB init)| 1 |
|**פריטים**|`/api/items/*`|נקודות קצה של פריט ציבורי (הערות, הצבעות, צפיות)| ~12 |
|**סוחט לימוני**|`/api/lemonsqueezy/*`|שילוב תשלום לימון סחיטה| 7 |
|**מיקום**|`/api/location/*`|חיפוש מיקום ונתונים| 4 |
|**תשלום**|`/api/payment/*`|ניהול תשלומים/מנויים גנרי| 3 |
|**קוטבי**|`/api/polar/*`|שילוב תשלומים בפולאר| 5 |
|**התייחסות**|`/api/reference`|נקודת קצה של נתוני התייחסות| 1 |
|**דוחות**|`/api/reports`|הגשת דו"ח פומבי| 1 |
|**סולידגייט**|`/api/solidgate/*`|שילוב תשלומים של Solidgate| 2 |
|**מודעות חסות**|`/api/sponsor-ads/*`|ניהול מודעות חסות| 7 |
|**פס**|`/api/stripe/*`|אינטגרציית תשלומי פס| ~17 |
|**סקרים**|`/api/surveys/*`|סקר CRUD ותגובות| 4 |
|**משתמש**|`/api/user/*`|פרופיל משתמש ומנוי| 5 |
|**verify-recaptcha**|`/api/verify-recaptcha`|אימות reCAPTCHA| 1 |
|**גרסה**|`/api/version/*`|מידע על גרסת האפליקציה| 2 |

## דפוסי אדריכלות

### מבנה מטפל במסלול

מטפלי מסלול פועלים לפי דפוס עקבי של מטפל דק:

```typescript
// app/api/admin/items/route.ts
import { withAdminAuth } from '@/lib/auth/admin-guard';

export const GET = withAdminAuth(async (request: NextRequest) => {
  // 1. Parse and validate input (query params, body)
  // 2. Call service or repository
  // 3. Return JSON response
  return NextResponse.json({ success: true, data: result });
});
```

### דפוסי אימות

מסלולים משתמשים ברמות אימות שונות:

|רמה|שיטה|שימוש|
|-------|--------|-------|
|**ציבורי**|אין בדיקת אישור|רשימות פריטים, בדיקות תקינות, פרטי גרסה|
|**מאומת**|`auth()` או `getCachedSession()`|פרופיל משתמש, מועדפים, נקודות קצה של לקוח|
|**אדמין**|`withAdminAuth()` או `checkAdminAuth()`|כל המסלולים `/api/admin/*`|
|**קרון**|`CRON_SECRET` בדיקת כותרת|`/api/cron/*` מסלולים|

### טיפול בשגיאות

נתיבי API משתמשים בתבנית תגובה עקבית של שגיאה:

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: 'Human-readable error message' }
```

קודי מצב HTTP עוקבים אחר מוסכמות REST:

|סטטוס|שימוש|
|--------|-------|
| `200` |GET, PUT, PATCH מוצלח|
| `201` |POST מוצלח (נוצר משאב)|
| `400` |גוף הבקשה או הפרמטרים לא חוקיים|
| `401` |אימות חסר או לא חוקי|
| `403` |הרשאות מאומתות אך לא מספיקות|
| `404` |משאב לא נמצא|
| `409` |קונפליקט (משאב כפול)|
| `500` |שגיאת שרת פנימית|

### עימוד

נקודות קצה של רשימה תומכות בדרך כלל בעימוד מבוסס סמן או היסט:

```
GET /api/admin/items?page=1&limit=20&sort=createdAt&order=desc
```

פרמטרים נפוצים של שאילתה:

|פרמטר|הקלד|ברירת מחדל|תיאור|
|-----------|------|---------|-------------|
|`page`|מספר| `1` |מספר עמוד (מבוסס 1)|
|`limit`|מספר| `20` |פריטים לכל עמוד|
|`sort`|מחרוזת|`createdAt`|שדה מיון|
|`order`|מחרוזת|`desc`|כיוון המיון (`asc` או `desc`)|
|`search`|מחרוזת| - |שאילתת חיפוש בטקסט מלא|

### מעטפת תגובה

תגובות עם עימוד כוללות מטא נתונים:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

## מבנה ספריות

```
app/api/
  admin/               # Admin-only endpoints (19 resource groups)
  auth/                # NextAuth + password management
  categories/          # Public category data
  client/              # Client-facing dashboard + items
  collections/         # Public collection data
  config/              # Feature configuration
  cron/                # Scheduled jobs (sync, subscriptions)
  current-user/        # Current user session info
  extract/             # URL metadata extraction
  favorites/           # Favorite item management
  featured-items/      # Featured item listings
  geocode/             # Geocoding service
  health/              # Health checks (database)
  internal/            # Internal operations
  items/               # Public item interactions
  lemonsqueezy/        # Lemon Squeezy payments
  location/            # Location data (countries, cities)
  payment/             # Generic payment management
  polar/               # Polar payments
  reference/           # Reference data
  reports/             # Content reports
  solidgate/           # Solidgate payments
  sponsor-ads/         # Sponsor advertisement management
  stripe/              # Stripe payments
  surveys/             # Survey management
  user/                # User profile endpoints
  verify-recaptcha/    # reCAPTCHA verification
  version/             # App version info
```
