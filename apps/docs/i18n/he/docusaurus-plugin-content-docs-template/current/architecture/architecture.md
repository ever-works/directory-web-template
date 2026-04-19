---
id: architecture
title: סקירה כללית של אדריכלות
sidebar_label: סקירה כללית
sidebar_position: 0
---

# סקירה כללית של אדריכלות

דף זה מספק מפה ברמה גבוהה של ארכיטקטורת התבניות Ever Works. השתמש בו כנקודת התחלה לפני הצלילה לדפים המפורטים שלאחר מכן.

## קרן טכנולוגיה

התבנית היא אפליקציה **Next.js 16** המשתמשת ב-**נתב האפליקציות** עם **React 19**. הוא מייצר פלט `standalone` עבור פריסות מכולות ומחיל מספר אופטימיזציות ברמת המסגרת ב-`next.config.ts`:

|שכבה|טכנולוגיה|מטרה|
|---|---|---|
|**מסגרת**|Next.js 16 (נתב אפליקציות)|עיבוד שרת ולקוח, ניתוב, מסלולי API|
|**UI**|React 19, HeroUI, Radix UI, Tailwind CSS 4|ספריית רכיבים, פרימיטיבים, סטיילינג|
|**מסד נתונים**|טפטוף ORM + PostgreSQL (או SQLite באופן מקומי)|ניהול סכימה, העברות, שאילתות|
|**אימות**|NextAuth.js v5 (ביטא)|אישור מרובה ספקים עם שמירה במטמון של הפעלה|
|**בינלאומיות**|next-intl|ניתוב וחבילות הודעות המודעות למיקום|
|**תשלומים**|Stripe, Polar, LemonSqueezy, Solidgate|תזרימי מנוי ותשלומים חד פעמיים|
|**תוכן**|CMS מבוסס Git (ספריית `.content/`)|תוכן Markdown/YAML משובט ממאגר נתונים|
|**ניטור**|Sentry, PostHog, Vercel Analytics|מעקב אחר שגיאות, ניתוח מוצר, ביצועים|
|**מייל**|שלח שוב|משלוח דוא"ל עסקה|
|**טקסט עשיר**|טיפטפ|עורך WYSIWYG לתוכן מנהלי|

## מבנה הפרויקט

התבנית עוקבת אחר ארגון שכבות מבוסס תכונות. להלן הספריות ברמה העליונה והאחריות שלהן:

```text
template/
  app/              # Next.js App Router -- routes and layouts
    [locale]/       # Locale-prefixed pages (i18n)
      admin/        # Admin dashboard pages
      auth/         # Authentication flows
      dashboard/    # Client dashboard
      items/        # Item detail pages
      categories/   # Category browsing
      ...
    api/            # API route handlers
  components/       # Shared React components (UI, layout, features)
  lib/              # Core logic -- the heart of the application
    auth/           # Authentication providers, guards, session caching
    db/             # Drizzle schema, migrations, seed, queries
    middleware/     # Permission checks and middleware utilities
    repositories/  # Data-access layer (database queries)
    services/      # Business logic services
    payment/       # Payment provider integrations
    mail/           # Email templates and sending
    analytics/     # Analytics tracking layer
    config/        # Centralized configuration service
    validations/   # Zod schemas for input validation
    utils/         # General utility functions
    ...
  hooks/            # Custom React hooks (React Query wrappers, UI logic)
  constants/        # Application-wide constants
  types/            # Shared TypeScript type definitions
  i18n/             # Internationalization setup and locale request config
  messages/         # Translation message files (JSON per locale)
  e2e/              # Playwright end-to-end tests
  scripts/          # Build, seed, migration, and utility scripts
  public/           # Static assets
```

להדרכה מלאה של ספרייה, עיין בדף [מבנה הפרויקט](/architecture/project-structure).

## אדריכלות שכבתית

בסיס הקוד אוכף הפרדה ברורה של חששות על פני שלוש שכבות:

### שכבת מצגת

רכיבי תגובה ב-`components/` וקבצי עמוד ב-`app/[locale]/` מטפלים בעיבוד ואינטראקציה עם המשתמש. רכיבי שרת מביאים נתונים ישירות; רכיבי לקוח משתמשים בווים של React Query מ-`hooks/` עבור מצב בצד הלקוח.

### שכבת לוגיקה עסקית

השירותים ב-`lib/services/` מכילים את כללי הליבה העסקיים. התבנית נשלחת עם למעלה מ-30 קבצי שירות המכסים ניתוח, מנויים, ניהול, סנכרון CRM, קידוד גיאוגרפי, התראות ועוד. השירותים נקראים על ידי מטפלי נתיב API ורכיבי שרת, אך לעולם לא ישירות על ידי קוד ממשק משתמש בדפדפן.

### שכבת גישה לנתונים

מאגרים ב-`lib/repositories/` מקיפים את כל שאילתות מסד הנתונים באמצעות Drizzle ORM. לכל ישות תחום (פריטים, קטגוריות, אוספים, משתמשים, תפקידים, תגים, מודעות חסות) יש קובץ מאגר משלה. זה מרחיק פרטים ברמת SQL משכבת ​​השירות.

למבט מעמיק יותר על זרימת הנתונים בין השכבות הללו, ראה [Data Flow](/architecture/data-flow).

## נתב וניתוב אפליקציות Next.js

כל המסלולים הפונה למשתמש חיים תחת `app/[locale]/`, מה שמאפשר כתובות אתרים עם קידומת מקומית מחוץ לקופסה באמצעות `next-intl`. האפליקציה משתמשת במספר תכונות של נתב אפליקציות:

- **פריסות** -- קבצי `layout.tsx` מקוננים עבור מנהל מערכת, לוח מחוונים של לקוח ואזורים ציבוריים.
- **קבוצות מסלול** -- הקבוצה `(listing)` מטפלת ברישום הספריות הראשיות ובגלישה בתגים מבלי להשפיע על מבנה כתובת האתר.
- **מסלולים דינמיים** -- `[page]`, `[...tag]`, ומקטעים בעלי שם עבור פריטים, קטגוריות ואוספים.
- **שכתובים** - מוגדר ב-`next.config.ts` כדי להפנות נתיבי קטגוריה חשופים לתצוגת הגילוי המעומדת שלהם.

ראה [Routing](/architecture/routing) למפת המסלול המלאה.

## מערכת אימות

האימות בנוי על **NextAuth.js v5** עם מערכת תצורת ספק ב-`lib/auth/`. הקובץ `auth.config.ts` בבסיס הפרויקט מתזמר:

- **ספקי OAuth** -- Google ו-GitHub, מוגדרים באמצעות משתני סביבה ומופעלים/מושבתים באופן דינמי.
- **ספק אישורים** -- אימות דוא"ל/סיסמה עם hashing bcrypt.
- **מתאם Supabase** -- אחסון הפעלה אופציונלי בגיבוי Supabase.
- **שמירת הפעלה במטמון** -- `lib/auth/cached-session.ts` מפחית חיפושי הפעלה מיותרים.
- **מערכת שמירה** -- `lib/auth/guards.ts` ו-`lib/guards/` אוכפים גישה מבוססת תפקידים ברמת המסלול.

לפרטים על מערכת השמירה והרשאות מבוססות תפקידים, ראה [Guards System](/architecture/guards-system) ו-[Permissions System](/architecture/permissions-system).

## טפטפו ORM ומסד נתונים

שכבת מסד הנתונים משתמשת ב-**Drizzle ORM** עם הסכימה המוגדרת ב-`lib/db/schema.ts`. היבטים מרכזיים:

- **הגירות** נוצרות עם `drizzle-kit generate` ומוחלות עם `drizzle-kit migrate`.
- **זרימת** סקריפטים ב-`lib/db/seed.ts` וב-`scripts/cli-seed.ts` מאכלסים נתונים ראשוניים כולל תפקידים.
- **תצורה** חיה ב-`drizzle.config.ts` בשורש הפרויקט.
- PostgreSQL נדרש לייצור; SQLite נתמך לפיתוח מקומי.

ראה [Repository Patterns](/architecture/repository-patterns) כיצד בנויה שכבת הגישה לנתונים.

## שרשרת כלי התווך

התבנית משתמשת בתוכנת Next.js (דרך הפלאגין `next-intl` שהוחל ב-`next.config.ts`) בשילוב עם בדיקות הרשאות מותאמות אישית ב-`lib/middleware/permission-check.ts`. צינור התווך מטפל ב:

- זיהוי מקומי וניתוב
- אימות מצב אימות
- הגנה על מסלול מבוססת תפקידים
- כותרות אבטחה (HSTS, CSP, X-Frame-Options ועוד - מוגדרות ב-`next.config.ts`)

לפירוט מפורט, ראה [Middleware](/architecture/middleware) ו-[Middleware Deep Dive](/architecture/middleware-deep-dive).

## תצורה ואבטחה

הקובץ `next.config.ts` מגדיר מספר ברירות מחדל של אבטחה וביצועים:

- **פלט עצמאי** לפריסות ידידותיות ל-Docker.
- **כותרות אבטחה** כולל Content-Security-Policy, HSTS, X-Content-Type-Options ו-X-Frame-Options.
- **אופטימיזציה של תמונה** עם תמיכה בתבניות מרחוק ומדיניות בטיחות SVG.
- **שילוב שומר** הוחל כמעטפת התצורה החיצונית ביותר למעקב אחר שגיאות.
- **אופטימיזציה של חבילות** עבור HeroUI ו- Lucide React כדי להקטין את גודל החבילה.

## דפי אדריכלות מפורטים

חקור את הדפים הבאים לסיקור מעמיק יותר של מערכות בודדות:

|עמוד|מה זה מכסה|
|---|---|
|[סטאק טכנולוגי](/architecture/tech-stack)|מלאי תלות מלא ופרטי גרסאות|
|[מבנה פרויקט](/architecture/project-structure)|הדרכה לפי ספרייה|
|[זרימת נתונים](/architecture/data-flow)|בקש מחזור חיים מדפדפן למסד נתונים|
|[ניתוב](/architecture/routing)|מבנה נתב אפליקציה ודפוסי כתובת URL|
|[תבניות רכיבים](/architecture/component-patterns)|רכיבי שרת לעומת לקוח, דפוסי קומפוזיציה|
|[ניהול מדינה](/אדריכלות/ניהול מדינה)|React Query, Zustand ומצב שרת|
|[שכבת API](/architecture/api-layer)|עיצוב API של REST ודפוסי מטפל במסלול|
|[תוכנה בינונית](/architecture/middleware)|צינור ועיבוד בקשות של תוכנת אמצעית|
|[מערכת Guards](/architecture/guards-system)|בקרת גישה מבוססת תפקידים ברמת המסלול|
|[מערכת הרשאות](/architecture/permissions-system)|הגדרות הרשאה עדינות|
|[דפוסי מאגרים](/architecture/repository-patterns)|מוסכמות שכבת גישה לנתונים|
|[תבניות אימות](/architecture/validation-patterns)|סכימות Zod ואימות קלט|
|[מערכת נושא](/architecture/theme-system)|ארכיטקטורת נושא וניהול צבעים|
|[מערכת צבע](/architecture/color-system)|צינור יצירת צבעים דינמי|
|[מערכת SEO](/architecture/seo-system)|מטא נתונים, מפות אתר ונתונים מובנים|
|[ספריית תשלום](/architecture/payment-library)|שילוב תשלומים מרובי ספקים|
|[ספריית תוכן](/architecture/content-library)|צינור תוכן CMS מבוסס Git|
|[מערכת עורך](/architecture/editor-system)|שילוב עורך טקסט עשיר של Tiptap|
|[Mapper Patterns](/architecture/mapper-patterns)|טרנספורמציה של נתונים בין שכבות|
|[גבולות שגיאה](/architecture/error-boundaries)|טיפול בשגיאות ושחזור|
|[שכבת Analytics](/architecture/analytics-layer)|צינור מעקב וניתוח אירועים|
|[Swagger System](/architecture/swagger-system)|הפקת תיעוד OpenAPI|

## לאן ללכת הלאה

- **חדש בפרויקט?** התחל עם [תחילת העבודה](/להתחיל) כדי להתקין ולהפעיל את התבנית.
- **מוכן להתאמה אישית?** קפוץ לקטע [מדריכים](/מדריכים) להדרכות שלב אחר שלב.
- **רוצה את המלאי הטכנולוגי המלא?** עיין ב[Tech Stack](/architecture/tech-stack).

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
