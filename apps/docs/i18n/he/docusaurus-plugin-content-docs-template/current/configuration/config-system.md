---
id: config-system
title: מערכת הגדרות
sidebar_label: מערכת הגדרות
sidebar_position: 0
---

# מערכת הגדרות

תבנית Ever Works משתמשת במערכת הגדרות מרכזית ובטוחת-טיפוסים, הבנויה על סכמות אימות Zod. כל משתני הסביבה מאומתים בעת הפעלת האפליקציה, ומספקים משוב מיידי על תצורה חסרה או לא תקפה. המערכת תומכת גם בסודות לשרת בלבד וגם במשתנים ציבוריים בטוחים ללקוח.

## ארכיטקטורה

```
lib/config/
  config-service.ts        # יחידת ConfigService מרכזית
  client.ts                # הגדרה בטוחה ללקוח (NEXT_PUBLIC_*)
  env.ts                   # סכמת env מדור קודם (הגדרת API)
  server-config.ts         # פונקציות עזר מיושנות (השתמש ב-ConfigService)
  feature-flags.ts         # דגלי זמינות תכונות
  index.ts                 # יצוא ברל
  types.ts                 # הגדרות סוגי TypeScript
  schemas/
    index.ts               # יצוא ברל של סכמות
    core.schema.ts         # כתובות URL, מידע אתר, מסד נתונים, תוכן
    auth.schema.ts         # סודות אימות, ספקי OAuth, JWT, קוקיז
    email.schema.ts        # הגדרת SMTP, Resend, Novu
    payment.schema.ts      # Stripe, LemonSqueezy, Polar, תמחור
    analytics.schema.ts    # PostHog, Sentry, Vercel Analytics, Recaptcha
    integrations.schema.ts # Trigger.dev, Twenty CRM, Cron
  billing/
    index.ts               # ברל הגדרת חיוב
    stripe.config.ts       # הגדרה ספציפית ל-Stripe
    lemonsqueezy.config.ts # הגדרת LemonSqueezy
    polar.config.ts        # הגדרת Polar
    solidgate.config.ts    # הגדרת Solidgate
    types.ts               # סוגי חיוב
  utils/
    env-parser.ts          # כלי עזר לניתוח משתני סביבה
    validation-logger.ts   # עיצוב ורישום תוצאות אימות
```

## יחידת ConfigService

הליבה של מערכת ההגדרות היא מחלקת `ConfigService` ב-`lib/config/config-service.ts`. היא:

1. אוספת את כל משתני הסביבה דרך פונקציות אוספות
2. מאמתת אותן מול סכמת Zod משולבת
3. מאחסנת את ההגדרה המאומתת כיחידה
4. מספקת getter מוקלד לכל קטע הגדרה

```typescript
import { configService } from '@/lib/config';

// גישה לקטעים ספציפיים
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### יצוא קטעים

לצורך tree-shaking ונוחות, קטעים בודדים מיוצאים גם ישירות:

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// גישה ישירה ללא קידומת ConfigService
const dbUrl = coreConfig.DATABASE_URL;
```

### אכיפת שרת בלבד

מודול `ConfigService` מייבא `'server-only'`, מה שאומר:

- ניתן להשתמש בו רק במרכיבי שרת, מסלולי API וקוד בצד-שרת
- ניסיון לייבאו במרכיב לקוח יפיק שגיאת בנייה
- זה מונע חשיפה מקרית של סודות כמו מפתחות API

## הגדרת לקוח (`lib/config/client.ts`)

הגדרה בטוחה ללקוח נמצאת במודול נפרד הקורא רק משתני `NEXT_PUBLIC_*`:

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// מיתוג אתר
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // קישורי מדיה חברתית
siteConfig.attribution // ייחוס "נבנה עם"

// תמחור
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// סביבה
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

מודול זה בטוח לייבוא בכל מרכיב, כולל קוד צד-לקוח.

## סכמות אימות

לכל קטע הגדרה יש סכמת Zod ייעודית ב-`lib/config/schemas/`:

### סכמה מרכזית (`core.schema.ts`)

מאמתת: `NODE_ENV`, `APP_URL`, `SITE_URL`, `API_BASE_URL`, `DATABASE_URL`, מטאדאטה של אתר (שם, סיסמת קמפיין, תיאור, מילות מפתח, לוגו), קישורים חברתיים, ערכת נושא לתמונת OG, ייחוס והגדרות מאגר תוכן.

### סכמת אימות (`auth.schema.ts`)

מאמתת: `AUTH_SECRET`, `COOKIE_SECRET`, הגדרות תפוגת טוקן JWT, הגדרת קוקיז, אישורי ספק OAuth (Google, GitHub, Microsoft, Facebook, X/Twitter, LinkedIn), הגדרת Supabase ואישורי משתמש זרע.

### סכמת דואר אלקטרוני (`email.schema.ts`)

מאמתת: `EMAIL_PROVIDER` (resend/novu), `EMAIL_FROM`, `EMAIL_SUPPORT`, `COMPANY_NAME`, הגדרות SMTP (מארח, יציאה, משתמש, סיסמה), מפתח API של Resend ומפתח API של Novu.

### סכמת תשלום (`payment.schema.ts`)

מאמתת: Stripe (מפתח סודי, מפתח ניתן לפרסום, סוד webhook, מזהי מחיר, תמחור דינמי, מרובה-מטבעות), LemonSqueezy (מפתח API, מזהה חנות, webhook, מזהי גרסאות), Polar (אסימון גישה, webhook, ארגון, מזהי תוכניות), תמחור מוצר, סכומי ניסיון.

### סכמת ניתוח נתונים (`analytics.schema.ts`)

מאמתת: PostHog (מפתח, מארח, דיבוג, הקלטת סשן, לכידה אוטומטית, מפתח API אישי, מזהה פרויקט), Sentry (DSN, ארגון, פרויקט, אסימון אימות, דיבוג), Vercel Analytics, Recaptcha (מפתח אתר, מפתח סוד), ספק מעקב חריגות.

### סכמת אינטגרציות (`integrations.schema.ts`)

מאמתת: Trigger.dev (מופעל, מפתח API, URL, סביבה), Twenty CRM (כתובת URL בסיסית, מפתח API, מופעל, מצב סינכרון), Cron (סוד).

## התנהגות אימות

מערכת האימות משתמשת ב-`.catch()` של Zod לשפל חינני:

```typescript
// מתוך integrations.schema.ts
export const twentyCrmConfigSchema = z
  .object({
    baseUrl: z.string().url().optional().catch(undefined),
    apiKey: z.string().optional(),
    enabled: z.boolean().default(false),
    syncMode: twentyCrmSyncModeSchema,
  })
  .transform((data) => ({
    ...data,
    enabled: data.enabled ?? Boolean(data.baseUrl && data.apiKey),
  }));
```

- **שדות אופציונליים** עם `.catch()` מתאוששים בחינניות עם ברירות מחדל
- **שדות נדרשים** ללא `.catch()` גורמים לכישלון בהפעלה
- **שלבי טרנספורמציה** מחשבים ערכים נגזרים (כמו זיהוי אוטומטי של מצב מופעל)

תוצאות האימות נרשמות בעת ההפעלה דרך `validation-logger.ts`, ומציגות אילו אינטגרציות פעילות ואזהרות על הגדרה אופציונלית חסרה.

## דגלי תכונות (`lib/config/feature-flags.ts`)

דגלי תכונות מספקים מנגנון פשוט להפעלה/ביטול פעולות תלויות-מסד-נתונים:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // לרנדר את קטע התגובות
}
```

כל דגלי התכונות כרגע קשורים לזמינות `DATABASE_URL`. כאשר אין מסד נתונים מוגדר, תכונות אינטראקטיביות מושבתות בזמן שהדירקטורי ממשיך להגיש תוכן סטטי.

## הגירה מהגדרה ישנה

מודול `server-config.ts` מכיל פונקציות עזר מיושנות. נתיבי הגירה:

| מיושן | החלפה |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## קבצים קשורים

- `lib/config/config-service.ts` — יחידת ConfigService
- `lib/config/client.ts` — הגדרה בטוחה ללקוח
- `lib/config/schemas/*.schema.ts` — סכמות אימות Zod
- `lib/config/feature-flags.ts` — דגלי תכונות
- `lib/config/types.ts` — הגדרות סוגי TypeScript
- `.env.example` — עיון מלא במשתני סביבה
