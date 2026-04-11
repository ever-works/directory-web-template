---
id: deployment-introduction
title: מבוא לפריסה
sidebar_label: מבוא לפריסה
sidebar_position: 1
---

# מבוא לפריסה

מדריך זה מספק סקירה מקיפה של פריסת תבנית Ever Works לסביבת ייצור. התבנית בנויה על Next.js 16 ומשתמשת במצב פלט עצמאי (standalone), מה שהופך אותה לתואמת עם פלטפורמות אירוח שונות ופריסות מיכלים.

## סקירת ארכיטקטורה

תבנית Ever Works מייצרת **בנייה עצמאית של Next.js** שמארזת את כל התלויות ליחידת פריסה אחת. זה מוגדר ב-`next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react"],
  },
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  staticPageGenerationTimeout: 180,
};
```

הגדרת `output: "standalone"` יוצרת ארטיפקט פריסה עצמאי המכיל רק את קבצי `node_modules` ההכרחיים, ומצמצמת משמעותית את גודל הפריסה.

## פלטפורמות נתמכות

### מומלץ: Vercel

Vercel היא פלטפורמת הפריסה המומלצת עבור התבנית. היא מספקת:

- פריסה ללא תצורה מוקדמת לאפליקציות Next.js
- תצורה אוטומטית של תעודות SSL
- תזמון משימות cron מובנה דרך `vercel.json`
- תמיכת פונקציות serverless למסלולי API
- פריסות תצוגה מקדימה לבקשות משיכה

התבנית כוללת תצורת `vercel.json` עם לוחות זמנים מוגדרים מראש של cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### אירוח עצמי: Docker

הפלט העצמאי תומך בהכלה של Docker. פריסה טיפוסית משתמשת בסביבת ריצה של Node.js כדי להגיש את האפליקציה הבנויה. הדרישה המרכזית היא לוודא שתיקיית פלט `standalone` מועתקת לצד תיקיות `public` ו-`.next/static` לתמונת המיכל.

### פלטפורמות ענן אחרות

ניתן לפרוס את התבנית על כל פלטפורמה התומכת באפליקציות Node.js:

- **Railway** -- פריסת full-stack פשוטה עם PostgreSQL מובנה
- **DigitalOcean App Platform** -- פריסת מיכלים מנוהלת
- **AWS (EC2, ECS או App Runner)** -- תשתית ענן מדרגית
- **Google Cloud Run** -- פלטפורמת מיכלים ללא שרתים
- **Azure App Service** -- אירוח Node.js מנוהל

## דרישות מוקדמות

### דרישות מערכת

- **Node.js**: גרסה 20.19.0 ומעלה (מוגדר בשדה `engines` ב-`package.json`)
- **מנהל חבילות**: pnpm (הפרויקט משתמש ב-`pnpm-lock.yaml`)
- **מסד נתונים**: PostgreSQL (נחוץ לתכונות ייצור כגון אימות, מנויים, אנליטיקה)
- **זיכרון**: לפחות 8 GB RAM מומלץ לתהליך הבנייה

סקריפט הבנייה מקצה זיכרון נוסף במפורש:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### משתני סביבה נחוצים

לפני הפריסה, ודא שמשתנים קריטיים אלה מוגדרים. סקריפט `scripts/check-env.js` מאמת אותם אוטומטית:

```bash
# Core (critical -- application will not function without these)
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
AUTH_SECRET=<generated-secret>         # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Cookie Configuration
COOKIE_SECRET=<generated-secret>       # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

סקריפט בדיקת הסביבה מסווג משתנים לפי קטגוריית אינטגרציה:

```
Core:            NODE_ENV, PORT, APP_*, BASE_URL
Database:        DATABASE_URL, DB_*, POSTGRES_*
Auth:            AUTH_*, GOOGLE_*, GITHUB_*, FB_*, TWITTER_*
Supabase:        SUPABASE_*, NEXT_PUBLIC_SUPABASE_*
Content:         DATA_REPOSITORY, GH_TOKEN
Email:           RESEND_API_KEY, EMAIL_*
Payment:         STRIPE_*, PAYPAL_*
Analytics:       POSTHOG_*, SENTRY_*
Background Jobs: TRIGGER_DEV_*
```

### אינטגרציות אופציונליות

משתני סביבה אלה מאפשרים תכונות אופציונליות:

```bash
# OAuth Providers (each requires both CLIENT_ID and CLIENT_SECRET)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=...
```

## מדריך פריסה מהירה

### שלב 1: הכנת הבנייה

הרץ את תהליך הבנייה המלא מקומית כדי לאמת שהכל מהדר בהצלחה:

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

סקריפט `build` מבצע מספר שלבים בסדר:

1. **בדיקת סביבה** (`scripts/check-env.js`) -- אימות משתנים נחוצים
2. **יצירת OpenAPI** (`scripts/generate-openapi.ts`) -- יצירת תיעוד API
3. **מיגרציית מסד נתונים** (`scripts/build-migrate.ts`) -- החלת שינויי סכמה ממתינים
4. **בנייה של Next.js** (`next build`) -- קימפול האפליקציה

### שלב 2: מיגרציות מסד נתונים במהלך הבנייה

סקריפט `scripts/build-migrate.ts` רץ אוטומטית במהלך הבנייה. הוא מטפל בסביבות שונות:

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

התנהגות מרכזית:

- **בניות ייצור**: שגיאות מיגרציה גורמות לכישלון בנייה (מונע פריסות פגומות)
- **פריסות תצוגה מקדימה**: שגיאות חיבור נסלחות (מסד הנתונים עשוי שלא להיות מוגדר עדיין)
- **בניות CI** (לא Vercel): מיגרציות מדולגות לחלוטין

### שלב 3: אתחול בזמן ריצה

כאשר האפליקציה מתחילה, `instrumentation.ts` מפעיל אתחול מסד נתונים:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Auto-initialize database (migrate and seed if needed)
  try {
    await initializeDatabase();
  } catch (error) {
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In development/preview, allow app to start for debugging
  }
}
```

רצף האתחול:

1. הרץ מיגרציות ממתינות (Drizzle מטפל באידמפוטנטיות)
2. בדוק אם מסד הנתונים נזרע
3. אם לא, רכוש נעילה ייעוצית של PostgreSQL והרץ סקריפט זריעה
4. שחרר נעילה לאחר זריעה

### שלב 4: פריסה ל-Vercel

לפריסת Vercel, חבר את המאגר שלך והגדר:

1. הגדר **Framework Preset** ל-Next.js
2. הגדר **Build Command** ל-`pnpm build`
3. הגדר **Install Command** ל-`pnpm install`
4. הוסף את כל משתני הסביבה הנחוצים בלוח הבקרה של Vercel
5. פרוס

### שלב 5: אימות הפריסה

לאחר הפריסה, אמת:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## כותרות אבטחה

התבנית מגדירה כותרות אבטחה אוטומטית ב-`next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' ...",
        },
      ],
    },
  ];
}
```

## תצורת מאגר חיבורים

מאגר חיבורי מסד הנתונים ניתן לתצורה דרך משתנה הסביבה `DB_POOL_SIZE`:

```typescript
const getPoolSize = (): number => {
  const envPoolSize = process.env.DB_POOL_SIZE;
  if (envPoolSize) {
    const parsed = parseInt(envPoolSize, 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50));
  }
  return getNodeEnv() === 'production' ? 20 : 10;
};
```

- **ברירת מחדל בייצור**: 20 חיבורים
- **ברירת מחדל בפיתוח**: 10 חיבורים
- **טווח הניתן לתצורה**: 1 עד 50 חיבורים
- **פסק זמן סרק**: 20 שניות
- **פסק זמן חיבור**: 30 שניות

## הצעדים הבאים

- [SSL ודומיינים מותאמים אישית](./ssl-domains.md) -- הגדר דומיינים מותאמים אישית ותעודות SSL
- [ניהול מסד נתונים](./database-management.md) -- פעולות מסד נתונים בייצור
- [גיבוי ושחזור](./backup-recovery.md) -- אסטרטגיות גיבוי למסד נתונים
- [ניטור](./monitoring.md) -- הגדר מעקב שגיאות וניטור ביצועים
