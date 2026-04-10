---
id: environment-reference
title: עיון מלא במשתני סביבה
sidebar_label: עיון בסביבה
sidebar_position: 1
---

# עיון מלא במשתני סביבה

דף זה מספק עיון מקיף בכל משתני הסביבה בשימוש תבנית Ever Works. המשתנים מאורגנים לפי קטגוריה עם הסוגים, הערכים המוגדרים כברירת מחדל וחובת הציון שלהם.

העתק את `.env.example` ל-`.env.local` ומלא את הערכים לפריסתך.

## תוכן ומאגר נתונים

| משתנה | סוג | נדרש | ברירת מחדל | תיאור |
|----------|------|----------|---------|-------------|
| `DATA_REPOSITORY` | string (URL) | **כן** | -- | כתובת URL של מאגר Git לנתוני תוכן |
| `GH_TOKEN` | string | לא | -- | אסימון גישה אישי ל-GitHub (למאגרים פרטיים) |
| `GITHUB_TOKEN` | string | לא | -- | משתנה אסימון GitHub חלופי |
| `GITHUB_BRANCH` | string | לא | `master` | ענף Git לשיבוט תוכן ממנו |

## מסד נתונים

| משתנה | סוג | נדרש | ברירת מחדל | תיאור |
|----------|------|----------|---------|-------------|
| `DATABASE_URL` | string | מומלץ | -- | מחרוזת חיבור למסד נתונים (SQLite או Postgres) |

כאשר `DATABASE_URL` אינו מוגדר, תכונות התלויות במסד נתונים (דירוגים, תגובות, מועדפים, סקרים, פריטים מומלצים) מושבתות אוטומטית דרך מערכת דגלי התכונות.

## אימות

| משתנה | סוג | נדרש | ברירת מחדל | תיאור |
|----------|------|----------|---------|-------------|
| `AUTH_SECRET` | string | **כן** | -- | סוד NextAuth (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **כן** | -- | סוד הצפנת קובצי Cookie |
| `COOKIE_DOMAIN` | string | לא | -- | דומיין Cookie (לדוגמה, `localhost`) |
| `COOKIE_SECURE` | boolean | לא | `true` | דגל Cookie מאובטח |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | לא | `15m` | זמן חיים של אסימון גישה |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | לא | `7d` | זמן חיים של אסימון רענון |

### ספקי OAuth

| משתנה | סוג | נדרש | תיאור |
|----------|------|----------|-------------|
| `GOOGLE_CLIENT_ID` | string | לא | מזהה לקוח Google OAuth |
| `GOOGLE_CLIENT_SECRET` | string | לא | סוד לקוח Google OAuth |
| `GITHUB_CLIENT_ID` | string | לא | מזהה לקוח GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | string | לא | סוד לקוח GitHub OAuth |
| `MICROSOFT_CLIENT_ID` | string | לא | מזהה לקוח Microsoft OAuth |
| `MICROSOFT_CLIENT_SECRET` | string | לא | סוד לקוח Microsoft OAuth |
| `FB_CLIENT_ID` | string | לא | מזהה לקוח Facebook OAuth |
| `FB_CLIENT_SECRET` | string | לא | סוד לקוח Facebook OAuth |
| `X_CLIENT_ID` | string | לא | מזהה לקוח X (Twitter) OAuth |
| `X_CLIENT_SECRET` | string | לא | סוד לקוח X (Twitter) OAuth |
| `LINKEDIN_CLIENT_ID` | string | לא | מזהה לקוח LinkedIn OAuth |
| `LINKEDIN_CLIENT_SECRET` | string | לא | סוד לקוח LinkedIn OAuth |

ספקי OAuth מופעלים אוטומטית כשמזהה הלקוח והסוד מוגדרים שניהם.

## אתר ומיתוג (בטוח ללקוח)

כל משתני `NEXT_PUBLIC_*` חשופים לדפדפן.

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | כתובת URL של יישום הספרייה |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | כתובת URL הציבורית של אתר החברה |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | כתובת URL בסיסית של API |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | שם האתר לצורך מטא-נתונים |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | סלוגן האתר |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | שם המותג עבור schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (ראה .env.example) | תיאור SEO (עד 160 תווים) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | מילות מפתח SEO מופרדות בפסיקים |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | נתיב הלוגו (יחסי ל-/public) |

### ערכת נושא של תמונת OG

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | צבע התחלה של הדרגה בתמונת OG |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | צבע סיום של הדרגה בתמונת OG |

### קישורי רשתות חברתיות

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | קישור GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | קישור X (Twitter) |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (ראה .env.example) | קישור LinkedIn |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (ראה .env.example) | קישור Facebook |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | קישור לבלוג |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | כתובת דוא"ל ליצירת קשר |

### ייחוס

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | כתובת URL לקישור "נבנה עם" |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | טקסט קישור "נבנה עם" |

## ספקי תשלום

### Stripe

| משתנה | סוג | נדרש | תיאור |
|----------|------|----------|-------------|
| `STRIPE_SECRET_KEY` | string | לא | מפתח סודי של Stripe (לשרת בלבד) |
| `STRIPE_PUBLISHABLE_KEY` | string | לא | מפתח ניתן לפרסום של Stripe |
| `STRIPE_WEBHOOK_SECRET` | string | לא | סוד חתימת webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | לא | מפתח ניתן לפרסום בטוח ללקוח |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | לא | טעינת מחירים מ-Stripe API |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | לא | הפעלת תשלום Stripe |

#### מזהי מחיר Stripe רב-מטבעיים

עבור תוכניות Standard ו-Premium, התבנית תומכת במזהי מחיר ספציפיים למטבע:

```
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=
...
```

### LemonSqueezy

| משתנה | סוג | תיאור |
|----------|------|-------------|
| `LEMONSQUEEZY_API_KEY` | string | מפתח API |
| `LEMONSQUEEZY_STORE_ID` | string | מזהה חנות |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | סוד webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | כתובת URL של נקודת קצה webhook |
| `LEMONSQUEEZY_TEST_MODE` | boolean | הפעלת מצב בדיקה |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | וריאנט תוכנית חינמית |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | וריאנט תוכנית סטנדרטית |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | וריאנט תוכנית פרמיום |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | הפעלת תשלום |

### Polar

| משתנה | סוג | תיאור |
|----------|------|-------------|
| `POLAR_ACCESS_TOKEN` | string | אסימון גישה |
| `POLAR_WEBHOOK_SECRET` | string | סוד webhook |
| `POLAR_ORGANIZATION_ID` | string | מזהה ארגון |
| `POLAR_SANDBOX` | boolean | מצב ארגז חול (ברירת מחדל: `true`) |
| `POLAR_API_URL` | string (URL) | כתובת URL מותאמת ל-API |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | מזהה תוכנית חינמית |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | מזהה תוכנית סטנדרטית |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | מזהה תוכנית פרמיום |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | הפעלת תשלום |

### Solidgate

| משתנה | סוג | תיאור |
|----------|------|-------------|
| `SOLIDGATE_API_KEY` | string | מפתח API |
| `SOLIDGATE_SECRET_KEY` | string | מפתח סודי |
| `SOLIDGATE_WEBHOOK_SECRET` | string | סוד webhook |
| `SOLIDGATE_MERCHANT_ID` | string | מזהה סוחר |
| `SOLIDGATE_API_BASE_URL` | string (URL) | כתובת URL בסיסית של API |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | מפתח בטוח ללקוח |

### תמחור מוצרים

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | מחיר רמת החינם |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | מחיר הרמה הסטנדרטית |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | מחיר הרמה הפרמיום |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | מזהה סכום ניסיון פרמיום |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | מזהה סכום ניסיון סטנדרטי |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | הפעלת סכומי ניסיון |

## אנליטיקה וניטור

### PostHog

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | מפתח API של פרויקט PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | מארח PostHog |
| `POSTHOG_DEBUG` | boolean | `false` | הפעלת רישום ניפוי שגיאות |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | הקלטת הפעלות |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | לכידה אוטומטית של אירועים |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | מפתח API בצד השרת |
| `POSTHOG_PROJECT_ID` | string | -- | מזהה פרויקט לאנליטיקה |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | מעקב אחר חריגים |

### Sentry

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | DSN של Sentry |
| `SENTRY_ORG` | string | `ever-co` | ארגון Sentry |
| `SENTRY_PROJECT` | string | `ever-works` | שם פרויקט Sentry |
| `SENTRY_AUTH_TOKEN` | string | -- | אסימון אימות Sentry |
| `SENTRY_ENABLE_DEV` | boolean | `false` | הפעלה במצב פיתוח |
| `SENTRY_DEBUG` | boolean | `false` | מצב ניפוי שגיאות |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | מעקב אחר חריגים |

### אנליטיקה אחרת

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | ספק חריגים (`posthog` או `sentry`) |
| `ANALYZE` | boolean | `true` | הפעלת ניתוח חבילה |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | מפתח אתר reCAPTCHA |
| `RECAPTCHA_SECRET_KEY` | string | -- | מפתח סודי reCAPTCHA |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | שיעור דגימה של Speed Insights |

## דוא"ל

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `EMAIL_PROVIDER` | string | `resend` | ספק דוא"ל (`resend` או `novu`) |
| `EMAIL_FROM` | string | `info@ever.works` | כתובת שולח להתראות |
| `EMAIL_SUPPORT` | string | `support@ever.works` | כתובת דוא"ל תמיכה |
| `COMPANY_NAME` | string | `Ever Works` | שם החברה לתבניות דוא"ל |
| `RESEND_API_KEY` | string | -- | מפתח API של Resend |
| `NOVU_API_KEY` | string | -- | מפתח API של Novu |
| `SMTP_HOST` | string | -- | שם מארח שרת SMTP |
| `SMTP_PORT` | number | `587` | פורט SMTP |
| `SMTP_USER` | string | -- | שם משתמש SMTP |
| `SMTP_PASSWORD` | string | -- | סיסמת SMTP |

## אינטגרציות

### Twenty CRM

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | כתובת URL של מופע Twenty CRM |
| `TWENTY_CRM_API_KEY` | string | -- | מפתח API לאימות |
| `TWENTY_CRM_ENABLED` | boolean | `false` | הפעלה/השבתה מפורשת |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | מצב סינכרון (`disabled`, `platform`, `direct_crm`) |

### Trigger.dev (משימות רקע)

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | הפעלת Trigger.dev |
| `TRIGGER_DEV_API_KEY` | string | -- | מפתח API |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | כתובת URL מותאמת ל-API |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | סביבה (`development`, `staging`, `production`) |

### משימות Cron

| משתנה | סוג | תיאור |
|----------|------|-------------|
| `CRON_SECRET` | string | סוד אימות לנקודות קצה של cron |

### מפות ומיקום

| משתנה | סוג | תיאור |
|----------|------|-------------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | אסימון ציבורי של Mapbox (`pk.*`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | מפתח Google Maps מוגבל לדפדפן |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | מזהה מפה של Google Maps |

### API של פלטפורמת Ever Works

| משתנה | סוג | ברירת מחדל | תיאור |
|----------|------|---------|-------------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | כתובת URL של API הפלטפורמה |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | אסימון אימות API הפלטפורמה |

## Vercel ופריסה

| משתנה | סוג | תיאור |
|----------|------|-------------|
| `VERCEL_TOKEN` | string | אסימון גישה אישי ל-Vercel |
| `VERCEL_PROJECT_ID` | string | מזהה פרויקט Vercel |
