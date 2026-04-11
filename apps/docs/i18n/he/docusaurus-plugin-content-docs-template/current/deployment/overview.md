---
id: overview
title: סקירת פריסה
sidebar_label: סקירת פריסה
sidebar_position: 1
---

# סקירת פריסה

תבנית Ever Works מותאמת לפריסה על **Vercel**, תוך תמיכה בכל פלטפורמה תואמת Node.js. מדריך זה מכסה את תהליך הפריסה המוכן לייצור מהכנה ועד השקה.

## התחלה מהירה (פריסה ב-Vercel)

### 1. דרישות מקדימות

לפני הפריסה, ודא שניתן לספק:

- [ ] מסד נתונים PostgreSQL (מומלץ Neon או Supabase)
- [ ] מאגר GitHub עם נתוני תוכן
- [ ] חשבון Vercel (הגרסה החינמית מספיקה להתחלה)
- [ ] משתני סביבה מוגדרים (ראה מדריך [משתני סביבה](./environment-variables))

### 2. חיבור ל-Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Deploy to production
vercel --prod
```

או חבר מאגר GitHub ישירות דרך ממשק Vercel לפריסה אוטומטית.

### 3. משתני סביבה נדרשים

```bash
# Core
AUTH_SECRET=<openssl rand -base64 32>
DATABASE_URL=postgresql://user:pass@host/db
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Cookies
COOKIE_SECRET=<openssl rand -base64 32>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# Cron
CRON_SECRET=<openssl rand -base64 32>
```

לרשימה המלאה של משתנים, ראה מדריך [משתני סביבה](./environment-variables).

### 4. אתחול מסד הנתונים

מסד הנתונים מאותחל אוטומטית בהפעלה הראשונה של האפליקציה. ניתן גם להפעיל ידנית:

```bash
cd apps/web
pnpm db:migrate
pnpm db:seed
```

## סקירת ארכיטקטורה

```
┌─────────────────────────────────────────┐
│           Vercel Edge Network           │
│         (CDN + Load Balancing)          │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           Next.js Application           │
│                                         │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  App Router │  │   API Routes     │  │
│  │  (RSC/ISR)  │  │  /api/**         │  │
│  └─────────────┘  └──────────────────┘  │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼────┐      ┌───────▼──────┐
│  Neon  │      │  Git CMS Repo │
│  (DB)  │      │  (Content)   │
└────────┘      └──────────────┘
```

## מצבי פריסה

### ייצור (Vercel)

- **CI/CD**: פריסה אוטומטית בכל דחיפה לענף הראשי
- **תצוגה מקדימה**: URL תצוגה מקדימה אוטומטי לכל Pull Request
- **Cron Jobs**: Vercel Crons מקוריים המנוהלים דרך `vercel.json`
- **רשת Edge**: הפצת תוכן גלובלית ואיזון עומסים

### אירוח עצמי

התבנית תומכת גם בפריסה עצמאית של Node.js:

```bash
# Build
pnpm build

# Start
pnpm start
```

דורש הגדרה נוספת: Node.js >= 20.19.0, PostgreSQL, מנהל תהליכים (PM2 וכו') ו-Reverse Proxy (Nginx וכו').

## שירותים מרכזיים

| שירות | מטרה | מומלץ |
|-------|------|-------|
| **PostgreSQL** | מסד נתונים ראשי | Neon, Supabase |
| **מאגר תוכן** | נתוני CMS מבוססי Git | GitHub (ציבורי או פרטי) |
| **דואר אלקטרוני** | הודעות עסקאות | Postmark, Resend |
| **תשלומים** | מנויים | Stripe, Lemon Squeezy |
| **מעקב שגיאות** | ניטור | Sentry |
| **אנליטיקה** | אנליטיקת משתמשים | PostHog |

## רשימת בדיקות פריסה

### פריסה ראשונה

- [ ] כל משתני הסביבה הנדרשים מוגדרים
- [ ] URL מסד הנתונים נכון ומסד הנתונים נגיש
- [ ] `DATA_REPOSITORY` מצביע על מאגר תוכן תקני
- [ ] `AUTH_SECRET` מוגדר עם ערך אקראי חזק
- [ ] `CRON_SECRET` מוגדר להגנה על נקודות קצה cron
- [ ] `COOKIE_SECURE=true` מוגדר לייצור
- [ ] Webhooks תשלום מוגדרים (אם משתמשים בתכונות תשלום)

### כל פריסה

- [ ] מיגרציות מסד הנתונים רצות אוטומטית בבקשה הראשונה
- [ ] Cron Jobs מופיעים בלוח הבקרה של Vercel
- [ ] מעקב שגיאות (Sentry) עובד כראוי
- [ ] בדיקת בריאות אפליקציה `/api/health` מחזירה 200

## מדריכים מפורטים

| נושא | תיעוד |
|------|-------|
| הגדרת משתני סביבה | [משתני סביבה](./environment-variables) |
| הגדרת מסד נתונים ומיגרציה | [ניהול מסד נתונים](./database-management) |
| הגדרת Cron Jobs | [משימות Cron](./cron-jobs) |
| אימות Cron Jobs | [אימות Cron](./cron-verification) |
| ניטור והתראות | [ניטור](./monitoring) |

## מדריך עזר מהיר

```bash
# Production deploy
vercel --prod

# Check logs
vercel logs

# Run DB migration (if needed)
cd apps/web && pnpm db:migrate

# Check environment variables
vercel env ls

# Health check
curl https://yourdomain.com/api/health
```
