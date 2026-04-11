---
id: environment-variables
title: משתני סביבה
sidebar_label: משתני סביבה
sidebar_position: 3
---

# משתני סביבה

מדריך זה מכסה את כל משתני הסביבה הנדרשים עבור אפליקציית הווב של תבנית Ever Works, כולל אימות, אבטחה והגדרה לתרחישי פריסה שונים.

## מערכת אימות

האפליקציה מאמתת משתני סביבה נדרשים בעת ההפעלה דרך `scripts/check-env.js`. היעדר משתנים קריטיים יגרום לכישלון ההפעלה עם הודעת שגיאה ברורה.

## מדריך משתנים

### ליבה (נדרשים)

| משתנה | תיאור | דוגמה |
|-------|-------|-------|
| `NODE_ENV` | סביבת ריצה | `production` |
| `AUTH_SECRET` | מפתח חתימה/הצפנה של NextAuth (לפחות 32 תווים) | `openssl rand -base64 32` |
| `DATABASE_URL` | מחרוזת חיבור PostgreSQL | `postgresql://user:pass@host/db` |
| `DATA_REPOSITORY` | URL למאגר Git של תוכן | `https://github.com/org/repo` |

### אימות

| משתנה | תיאור | נדרש |
|-------|-------|------|
| `AUTH_SECRET` | מפתח חתימת טוקן סשן | ✅ נדרש |
| `AUTH_URL` | URL מלא לייצור (אופציונלי ב-Vercel) | 🔄 אופציונלי |

### ספקי OAuth

| משתנה | ספק | תיאור |
|-------|-----|-------|
| `AUTH_GITHUB_ID` | GitHub | Client ID של אפליקציית OAuth |
| `AUTH_GITHUB_SECRET` | GitHub | Client Secret של אפליקציית OAuth |
| `AUTH_GOOGLE_ID` | Google | Client ID של OAuth |
| `AUTH_GOOGLE_SECRET` | Google | Client Secret של OAuth |

### עוגיות

| משתנה | תיאור | ברירת מחדל |
|-------|-------|------------|
| `COOKIE_SECRET` | מפתח הצפנת עוגיות | נדרש |
| `COOKIE_DOMAIN` | הדומיין של העוגיה | `localhost` |
| `COOKIE_SECURE` | עוגיות HTTPS בלבד | `true` לייצור |

### מסד נתונים

| משתנה | תיאור | דוגמה |
|-------|-------|-------|
| `DATABASE_URL` | חיבור PostgreSQL ראשי | `postgresql://...` |
| `DB_POOL_SIZE` | גודל מקסימלי של מאגר חיבורים | `20` |

### דואר אלקטרוני

| משתנה | תיאור | דוגמה |
|-------|-------|-------|
| `EMAIL_SERVER` | URL של SMTP | `smtp://user:pass@smtp.example.com:587` |
| `EMAIL_FROM` | כתובת שולח | `noreply@yourdomain.com` |

נתמכים גם משתני SMTP נפרדים (`EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT` וכו').

### תשלומים – Stripe

| משתנה | תיאור |
|-------|-------|
| `STRIPE_SECRET_KEY` | מפתח סודי של Stripe (`sk_live_...`) |
| `STRIPE_PUBLISHABLE_KEY` | מפתח ציבורי של Stripe (`pk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | מפתח חתימת Webhook (`whsec_...`) |

### תשלומים – Lemon Squeezy

| משתנה | תיאור |
|-------|-------|
| `LEMONSQUEEZY_API_KEY` | מפתח API של LemonSqueezy |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | מפתח חתימת Webhook |

### תשלומים – Paddle

| משתנה | תיאור |
|-------|-------|
| `PADDLE_API_KEY` | מפתח API של Paddle |
| `PADDLE_WEBHOOK_SECRET` | מפתח חתימת Webhook |

### אנליטיקה

| משתנה | שירות | תיאור |
|-------|-------|-------|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog | מפתח API של הפרויקט |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog | URL מופע |
| `NEXT_PUBLIC_GA_ID` | Google Analytics | מזהה GA4 |

### מעקב שגיאות

| משתנה | תיאור |
|-------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | שם מקור נתוני Sentry |
| `SENTRY_AUTH_TOKEN` | טוקן העלאת Source Maps |
| `SENTRY_ORG` | slug ארגון Sentry |
| `SENTRY_PROJECT` | slug פרויקט Sentry |

### ניוזלטרים

| משתנה | שירות | תיאור |
|-------|-------|-------|
| `MAILCHIMP_API_KEY` | Mailchimp | מפתח API |
| `MAILCHIMP_LIST_ID` | Mailchimp | מזהה רשימת קהל |
| `CONVERTKIT_API_KEY` | ConvertKit | מפתח API |
| `RESEND_API_KEY` | Resend | מפתח API |

### משימות רקע

| משתנה | תיאור |
|-------|-------|
| `CRON_SECRET` | אימות קריאות Vercel cron (לפחות 32 תווים) |
| `TRIGGER_SECRET_KEY` | מפתח Trigger.dev (כשמוגדר, מקבל עדיפות על Vercel Crons) |

### משתני לקוח ציבוריים

משתנים שמתחילים ב-`NEXT_PUBLIC_` נארזים לתוך קוד הלקוח:

| משתנה | תיאור |
|-------|-------|
| `NEXT_PUBLIC_APP_URL` | URL האפליקציה בייצור |
| `NEXT_PUBLIC_POSTHOG_KEY` | מפתח PostHog ללקוח |
| `NEXT_PUBLIC_POSTHOG_HOST` | URL מארח PostHog |
| `NEXT_PUBLIC_GA_ID` | מזהה Google Analytics |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (שגיאות לקוח) |

**⚠️ אזהרה:** לעולם אל תגדיר מפתחות רגישים (פרטי גישה למסד נתונים, מפתחות פרטיים וכו') למשתנה `NEXT_PUBLIC_` כלשהו.

## כיצד להגדיר

### פיתוח מקומי

צור קובץ `.env.local` בתיקיית `apps/web/`:

```bash
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your values
```

### Vercel

**הדרך המומלצת:** שימוש בממשק Vercel

1. עבור אל **הגדרות פרויקט** → **משתני סביבה**
2. הוסף משתנים עם בחירת הסביבה היעד (Production, Preview, Development)
3. פרוס — המשתנים מוזרקים אוטומטית בזמן הבנייה והריצה

**או השתמש ב-Vercel CLI:**

```bash
# Add a variable
vercel env add DATABASE_URL

# List all variables
vercel env ls

# Pull to local file
vercel env pull .env.local
```

## רשימת בדיקות אבטחה לייצור

- [ ] `AUTH_SECRET` נוצר בצורה מאובטחת ואקראית (`openssl rand -base64 32`)
- [ ] `COOKIE_SECRET` נוצר בצורה מאובטחת ואקראית (`openssl rand -base64 32`)
- [ ] `CRON_SECRET` נוצר בצורה מאובטחת ואקראית (`openssl rand -base64 32`)
- [ ] `COOKIE_SECURE=true` (חובה לייצור)
- [ ] סיסמה חזקה במחרוזת החיבור של מסד הנתונים
- [ ] שימוש ב-`sk_live_...` ולא מפתחות בדיקה ב-Stripe
- [ ] ל-`SENTRY_AUTH_TOKEN` יש הרשאות מינימליות הנדרשות
- [ ] לא חשוף ערכים רגישים (סיסמאות מסד נתונים, מפתחות פרטיים וכו')
