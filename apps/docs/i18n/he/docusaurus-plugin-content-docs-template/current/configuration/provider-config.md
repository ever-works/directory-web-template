---
id: provider-config
title: "הגדרת ספקים"
sidebar_label: "הגדרת ספקים"
sidebar_position: 4
---

# הגדרת ספקים

התבנית משתמשת ב-singleton מרכזי `ConfigService` לניהול כל ספקי השירותים החיצוניים. כל ספק מוגדר דרך סכמות מאומתות עם Zod עם זיהוי תכונות אוטומטי -- ספקים מופעלים כאשר קיימים האישורים הנדרשים שלהם.

## ארכיטקטורת ConfigService

ה-`ConfigService` ב-`lib/config/config-service.ts` הוא singleton בצד השרת בלבד שמאמת את כל משתני הסביבה בזמן האתחול:

```ts
import { configService } from '@/lib/config';

// גישה לחלקי תצורה
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

השירות מאורגן בשישה חלקים, כל אחד עם סכמת Zod משלו:

| חלק | גישה | קובץ סכמה |
|-----|------|----------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### ייבואים ניתנים ל-Tree-Shaking

ניתן לייבא חלקים בודדים ישירות לצורך tree-shaking טוב יותר:

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### אימות בזמן האתחול

כל התצורה מאומתת עם Zod בייבוא הראשון. ערכים לא חוקיים מפעילים חלופות `.catch()` כאשר אפשרי, בעוד שגיאות שלא ניתן לשחזר באמת נזרקות בזמן האתחול:

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## ספקי אימות

מוגדרים ב-`lib/config/schemas/auth.schema.ts`. ספקי OAuth מזהים הפעלה אוטומטית:

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### ספקי OAuth נתמכים

| ספק | משתנה Client ID | משתנה Client Secret |
|-----|----------------|---------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

### ממשק אחורי לאימות Supabase

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| משתנה | תיאור |
|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | כתובת URL של פרויקט Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | מפתח אנונימי של Supabase |

### הגדרות אימות נוספות

| משתנה | ברירת מחדל | תיאור |
|-------|-----------|-------|
| `AUTH_SECRET` | -- | נדרש לחתימת הפעלה |
| `COOKIE_SECRET` | -- | סוד הצפנת קובץ cookie |
| `COOKIE_DOMAIN` | `'localhost'` | דומיין קובץ cookie |
| `COOKIE_SECURE` | `false` | קבצי cookie דרך HTTPS בלבד |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | TTL של אסימון גישה |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | TTL של אסימון רענון |

## ספקי תשלום

מוגדרים ב-`lib/config/schemas/payment.schema.ts`. כל ספק מופעל אוטומטית כאשר האישורים הנדרשים שלו מוגדרים.

### Stripe

מופעל אוטומטית כאשר קיימים `secretKey` ו-`publishableKey`:

| משתנה | תיאור |
|-------|-------|
| `STRIPE_SECRET_KEY` | מפתח סודי בצד השרת |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | מפתח ציבורי בצד הלקוח |
| `STRIPE_WEBHOOK_SECRET` | אימות חתימת Webhook |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | מזהה מחיר לתוכנית חינמית |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | מזהה מחיר לתוכנית סטנדרטית |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | מזהה מחיר לתוכנית פרמיום |

### LemonSqueezy

מופעל אוטומטית כאשר קיימים `apiKey` ו-`storeId`:

| משתנה | תיאור |
|-------|-------|
| `LEMONSQUEEZY_API_KEY` | מפתח API |
| `LEMONSQUEEZY_STORE_ID` | מזהה חנות |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | סוד Webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | כתובת URL של נקודת קצה Webhook |
| `LEMONSQUEEZY_TEST_MODE` | הפעלת מצב בדיקה (`'true'`/`'false'`) |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | מזהה גרסה לתוכנית חינמית |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | מזהה גרסה לתוכנית סטנדרטית |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | מזהה גרסה לתוכנית פרמיום |

### Polar

מופעל אוטומטית כאשר קיימים `accessToken` ו-`organizationId`:

| משתנה | ברירת מחדל | תיאור |
|-------|-----------|-------|
| `POLAR_ACCESS_TOKEN` | -- | אסימון גישה ל-API |
| `POLAR_ORGANIZATION_ID` | -- | מזהה ארגון |
| `POLAR_WEBHOOK_SECRET` | -- | סוד Webhook |
| `POLAR_SANDBOX` | `true` | מצב ארגז חול (הגדר `'false'` לייצור) |
| `POLAR_API_URL` | -- | כתובת URL מותאמת אישית של API |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | מזהה תוכנית לרמה חינמית |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | מזהה תוכנית לרמה סטנדרטית |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | מזהה תוכנית לרמה פרמיום |

### תצוגת תמחור מוצרים

| משתנה | ברירת מחדל | תיאור |
|-------|-----------|-------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | מחיר תצוגה לתוכנית חינמית |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | מחיר תצוגה לתוכנית סטנדרטית |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | מחיר תצוגה לתוכנית פרמיום |

## ספקי דואר אלקטרוני

מוגדרים ב-`lib/config/schemas/email.schema.ts`.

### SMTP

מופעל אוטומטית כאשר קיימים `host`, `user` ו-`password` כולם:

| משתנה | ברירת מחדל | תיאור |
|-------|-----------|-------|
| `SMTP_HOST` | -- | שם מארח שרת SMTP |
| `SMTP_PORT` | `587` | פורט שרת SMTP |
| `SMTP_USER` | -- | שם משתמש לאימות SMTP |
| `SMTP_PASSWORD` | -- | סיסמה לאימות SMTP |

### Resend

מופעל אוטומטית כאשר קיים `apiKey`:

| משתנה | תיאור |
|-------|-------|
| `RESEND_API_KEY` | מפתח API של Resend |

### Novu

מופעל אוטומטית כאשר קיים `apiKey`:

| משתנה | תיאור |
|-------|-------|
| `NOVU_API_KEY` | מפתח API של Novu |

### הגדרות דואר אלקטרוני

| משתנה | ברירת מחדל | תיאור |
|-------|-----------|-------|
| `COMPANY_NAME` | `'Ever Works'` | שם חברה בתבניות דואר אלקטרוני |
| `EMAIL_PROVIDER` | `'resend'` | ספק דואר אלקטרוני פעיל (`'resend'`, `'novu'`) |
| `EMAIL_FROM` | -- | כתובת דואר אלקטרוני של השולח |
| `EMAIL_SUPPORT` | -- | כתובת דואר אלקטרוני לתמיכה |

## ספקי אנליטיקה

מוגדרים ב-`lib/config/schemas/analytics.schema.ts`.

### PostHog

מופעל אוטומטית כאשר קיים `key`:

| משתנה | ברירת מחדל | תיאור |
|-------|-----------|-------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | מפתח API של פרויקט PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | כתובת URL מארח PostHog |
| `POSTHOG_DEBUG` | `false` | הפעלת מצב ניפוי שגיאות |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | הפעלת הקלטת הפעלה |
| `POSTHOG_AUTO_CAPTURE` | `false` | לכידת אירועים אוטומטית |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | מעקב אחר חריגות |
| `POSTHOG_PERSONAL_API_KEY` | -- | מפתח API אישי (לוח בקרה של מנהל) |
| `POSTHOG_PROJECT_ID` | -- | מזהה פרויקט (לוח בקרה של מנהל) |

### Sentry

מופעל אוטומטית כאשר קיים `dsn`:

| משתנה | ברירת מחדל | תיאור |
|-------|-----------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | DSN של Sentry |
| `SENTRY_ORG` | -- | מזהה ארגון Sentry |
| `SENTRY_PROJECT` | -- | שם פרויקט Sentry |
| `SENTRY_AUTH_TOKEN` | -- | אסימון אימות למפות מקור |
| `SENTRY_ENABLE_DEV` | `false` | הפעלה בסביבת פיתוח |
| `SENTRY_DEBUG` | `false` | מצב ניפוי שגיאות |

### reCAPTCHA

מופעל אוטומטית כאשר קיימים גם `siteKey` וגם `secretKey`:

| משתנה | תיאור |
|-------|-------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | מפתח אתר בצד הלקוח |
| `RECAPTCHA_SECRET_KEY` | מפתח סודי בצד השרת |

### Vercel Analytics

| משתנה | ברירת מחדל | תיאור |
|-------|-----------|-------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | הפעלת Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | קצב דגימה (0--1) |

### ספק מעקב חריגות

| משתנה | ברירת מחדל | תיאור |
|-------|-----------|-------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'`, `'sentry'` או `'none'` |

## בדיקת סטטוס ספק

```ts
import { configService } from '@/lib/config';

// בדוק אם Stripe מוגדר
if (configService.payment.stripe.enabled) {
  // Stripe מוכן לשימוש
}

// בדוק אם ספק דואר אלקטרוני זמין
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// רשום ספקי OAuth מופעלים
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## קבצים קשורים

| נתיב | תיאור |
|------|-------|
| `lib/config/config-service.ts` | Singleton ConfigService |
| `lib/config/schemas/auth.schema.ts` | סכמות ספקי אימות |
| `lib/config/schemas/payment.schema.ts` | סכמות ספקי תשלום |
| `lib/config/schemas/email.schema.ts` | סכמות ספקי דואר אלקטרוני |
| `lib/config/schemas/analytics.schema.ts` | סכמות ספקי אנליטיקה |
| `lib/config/schemas/integrations.schema.ts` | סכמות ספקי אינטגרציות |
| `lib/config/schemas/core.schema.ts` | סכמת תצורה מרכזית |
| `lib/config/types.ts` | הגדרות סוג TypeScript |
| `lib/config/index.ts` | ייצוא Barrel |
| `.env.example` | מדריך מלא למשתני סביבה |
