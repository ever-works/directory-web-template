---
id: routing
title: ארכיטקטורת ניתוב
sidebar_label: ניתוב
sidebar_position: 6
---

# ארכיטקטורת ניתוב

התבנית Ever Works משתמשת בנתב האפליקציה Next.js עם בינאום דרך `next-intl`, ומספקת מסלולים עם קידומת מקומית, קבוצות מסלולים לארגון לוגי ושכבת API מקיפה.

## נתב אפליקציות עם פלח מיקום

כל הדפים הפונים למשתמש מקוננים תחת קטע דינמי `[locale]`, מה שמאפשר תמיכה מרובת שפות עבור 6 מקומות: `en`, `fr`, `es`, `de`, @@@TOK0, @@@TOK0 ו-0.

```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale layout (wraps all localized pages)
│   ├── providers.tsx   # Client providers for the locale subtree
│   ├── globals.css     # Global styles
│   └── ...pages        # All localized pages
├── api/                # API routes (not locale-prefixed)
├── layout.tsx          # Root layout (HTML, fonts, metadata)
└── not-found.tsx       # 404 page
```

כתובות האתרים עוקבות אחר הדפוס `/{locale}/path`, לדוגמה:
- `/en/pricing` -- דף תמחור באנגלית
- `/fr/admin/items` -- דף פריטי ניהול בצרפתית
- `/de/categories` -- דף הקטגוריות בגרמנית

## תצורת Next.js

ה-`next.config.ts` מגדיר מספר התנהגויות ניתוב:

### משכתב

```typescript
async rewrites() {
  return [
    {
      source: "/:path",
      destination: "/:path/discover/1",
    },
    {
      source: "/:path/discover",
      destination: "/:path/discover/1",
    },
  ];
}
```

שכתובים אלה מפנים את נתיב המקום הבסיסי ו-`/discover` לעמוד הראשון של רישום הגילוי (`/discover/1`), ומספקים כתובת URL נקייה של ברירת מחדל.

### כותרות אבטחה

כל המסלולים מקבלים כותרות אבטחה כולל:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` עם גיל מרבי של שנתיים
- `Content-Security-Policy` עם ברירות מחדל מגבילות
- `Referrer-Policy: strict-origin-when-cross-origin`

### plugin next-intl

הפלאגין `next-intl` מוחל על התצורה של Next.js, מצביע על `./i18n/request.ts` לפתרון המקום:

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## קבוצות מסלול

הספרייה `[locale]` משתמשת במספר קבוצות לוגיות לארגון דפים:

### (רישום) -- דפי רישום ראשיים

קבוצת המסלולים `(listing)` היא קבוצה בסוגריים (ללא קטע כתובת URL) העוטפת את דפי רישום הספריות הראשיות בפריסה משותפת.

### admin/ -- פאנל ניהול

מדור הניהול מספק ממשק אחורי מלא:

```
[locale]/admin/
├── auth/               # Admin sign-in
├── categories/         # Category CRUD
├── clients/            # Client management
├── collections/        # Collection CRUD
├── comments/           # Comment moderation
├── companies/          # Company management
├── featured-items/     # Featured item management
├── items/              # Item review and management
├── reports/            # Report review
├── roles/              # Role and permission management
├── settings/           # Site settings
├── sponsorships/       # Sponsorship management
├── surveys/            # Survey builder
├── tags/               # Tag management
├── users/              # User management
├── layout.tsx          # Admin layout (sidebar, navigation)
├── layout-client.tsx   # Client-side admin layout logic
└── page.tsx            # Admin dashboard
```

### auth/ -- דפי אימות

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### לקוח/ -- לוח מחוונים ללקוח

מדור הלקוח מספק תכונות משתמש מאומתות לניהול ההגשות והחשבון שלהם.

### לוח מחוונים/ -- לוח מחוונים למשתמש

לוח מחוונים כללי למשתמש עם סקירת חשבון, פעילות והגדרות.

## נתיבי API (29 קבוצות)

מסלולי API חיים מחוץ לקטע `[locale]` בכתובת `app/api/` ואינם בעלי קידומת מקומית. הם משמשים כקצה העורפי לאחזור נתונים בצד הלקוח.

|קבוצת מסלול|מטרה|נקודות קצה מרכזיות|
|-------------|---------|---------------|
|`admin/`|פעולות אדמין|פריטים, משתמשים, קטגוריות, הגדרות|
|`auth/`|אימות|הפעלה, התקשרויות OAuth|
|`categories/`|נתוני קטגוריה|רשימה, חפש|
|`client/`|פעולות לקוח|פרופיל, הגשות, לוח מחוונים|
|`collections/`|איסוף נתונים|רשימה, פירוט|
|`config/`|תצורת האתר|תכונה דגלים, הגדרות|
|`cron/`|משימות מתוזמנות|בדיקות מנוי, ניקיון|
|`current-user/`|מידע משתמש נוכחי|פרופיל, נתוני הפעלה|
|`extract/`|חילוץ כתובת אתר|חילוץ מטא נתונים מכתובות URL|
|`favorites/`|מועדפים|הוסף, הסר, רשימה|
|`featured-items/`|פריטים מומלצים|רשימת פריטים מוצגים פעילים|
|`geocode/`|קידוד גיאוגרפי|חיפוש כתובות, קידוד גיאוגרפי הפוך|
|`health/`|בדיקת בריאות|מסד נתונים ומצב שירות|
|`internal/`|פעולות פנימיות|נקודות קצה ברמת המערכת|
|`items/`|נתוני פריט|רשימה, פירוט, חיפוש|
|`lemonsqueezy/`|LemonSqueezy|מטפל Webhook|
|`location/`|נתוני מיקום|פריטים בקרבת מקום, חיפוש מיקום|
|`payment/`|פעולות תשלום|קופה, אמצעי תשלום|
|`polar/`|פולאר|מטפל Webhook|
|`reference/`|נתוני התייחסות|ספירות, ערכי חיפוש|
|`reports/`|דוחות תוכן|שלח, בדוק דוחות|
|`solidgate/`|סולידגייט|מטפל Webhook|
|`sponsor-ads/`|מודעות חסות|CRUD, הפעלה|
|`stripe/`|פס|מטפל ב-Webhook, קופה|
|`surveys/`|סקרים|רשום, הגיבו, תוצאות|
|`user/`|פעולות משתמש|פרופיל, הגדרות|
|`verify-recaptcha/`|reCAPTCHA|אימות אסימון|
|`version/`|מידע על גרסה|גרסת אפליקציה ופרטי בנייה|

## כלי ביניים

האפליקציה משתמשת בתוכנת האמצע `next-intl` לזיהוי וניתוב מקומיים. ידיות התווך:

1. **זיהוי מיקום**: קובע את המקום של המשתמש מנתיב כתובת האתר, קובצי Cookie או כותרת `Accept-Language`
2. **הפניות מקומיות**: מפנה בקשות ללא קידומת מקומית למקום המתאים
3. **מקום ברירת מחדל**: חוזר לאנגלית (`en`) כאשר לא מזוהה העדפת מיקום

התוכנה מוגדרת בספרייה `i18n/` עם כללי ניתוב מקומיים המוגדרים ב-`i18n/routing.ts` וטיפול בבקשות ב-`i18n/request.ts`.

## יצירה סטטית ומסלולים דינמיים

התבנית משתמשת במספר אסטרטגיות של שליפת נתונים:

- **יצירת סטטי**: דפים כמו מדיניות פרטיות, תנאים והגבלות ועוד נוצרים באופן סטטי
- **עיבוד דינמי**: דפי ניהול, לוחות מחוונים ודפים מאומתים מעובדים באופן דינמי
- **ISR (Regeneration Static Incremental)**: דפי קטגוריות ותגים משתמשים ב-ISR עם אימות מחדש
- **יצירת מפת אתר**: `app/sitemap.ts` יוצר באופן דינמי את מפת האתר מנתוני תוכן

ה-`staticPageGenerationTimeout` מוגדר ל-180 שניות ב-`next.config.ts` כדי להכיל מאגרי תוכן גדולים במהלך בנייה.
