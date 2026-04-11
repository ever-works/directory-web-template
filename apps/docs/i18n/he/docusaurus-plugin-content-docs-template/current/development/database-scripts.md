---
id: database-scripts
title: "סקריפטים למסד נתונים"
sidebar_label: "סקריפטים"
sidebar_position: 10
---

# סקריפטים למסד נתונים

התבנית מספקת סט של סקריפטים לניהול מסד נתונים למיגרציות, זריעת נתונים ותחזוקה. סקריפטים אלה משתמשים ב-Drizzle ORM ומיועדים לעבוד בפיתוח מקומי, צינורות CI/CD ופריסות ייצור ב-Vercel.

## מלאי הסקריפטים

| סקריפט | פקודה | מטרה |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | מבצע מיגרציה בזמן בנייה |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | מיגרציה ידנית אינטראקטיבית |
| `cli-seed.ts` | `pnpm db:seed` | נקודת כניסה CLI לזריעת נתונים |
| `seed.ts` | הפעלה ישירה | זריעה מלאה של מסד נתונים |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | הגדרת קטלוג מוצרי Stripe |
| `clean-database.js` | `node scripts/clean-database.js` | איפוס מוחלט (מוחק הכל) |

## סקריפטי מיגרציה

### מיגרציה בזמן בנייה (build-migrate.ts)

רץ אוטומטית במהלך `pnpm build` בפריסות Vercel. מיועד לעדכוני סכמה ללא זמן השבתה.

```mermaid
flowchart TD
    A[Build Start] --> B{SKIP_BUILD_MIGRATIONS?}
    B -->|true| C[Skip & Exit 0]
    B -->|false| D{CI Environment?}
    D -->|CI, not Vercel| C
    D -->|Vercel or Local| E{DATABASE_URL set?}
    E -->|No| C
    E -->|Yes| F[Run Drizzle Migrations]
    F --> G{Success?}
    G -->|Yes| H[Verify Schema]
    G -->|No| I{Production?}
    H --> J{Columns exist?}
    J -->|Yes| K[Exit 0 - Success]
    J -->|No| L[Exit 1 - Fail]
    I -->|Yes| L
    I -->|Preview| M{Connection error?}
    M -->|Yes| C
    M -->|Auth error| L
```

**התנהגות לפי סביבה:**

| סביבה | כשל מיגרציה | שגיאת חיבור | שגיאת אימות |
|---|---|---|---|
| ייצור (`VERCEL_ENV=production`) | הבנייה נכשלת | הבנייה נכשלת | הבנייה נכשלת |
| תצוגה מקדימה (`VERCEL_ENV=preview`) | הבנייה נכשלת | הבנייה עוברת (אזהרה) | הבנייה נכשלת |
| CI (GitHub Actions) | מדולג לחלוטין | מדולג לחלוטין | מדולג לחלוטין |
| פיתוח מקומי | הבנייה נכשלת | הבנייה נכשלת | הבנייה נכשלת |

**אימות סכמה:**

לאחר מיגרציה מוצלחת, הסקריפט מוודא שקיימות עמודות קריטיות:

```typescript
// Verified columns in client_profiles table:
const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
```

### CLI מיגרציה ידנית (cli-migrate.ts)

כלי מיגרציה אינטראקטיבי להפעלה ידנית מול כל מסד נתונים.

```bash
# Using package.json script
pnpm db:migrate:cli

# Direct execution with custom database
DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

**תהליך שלושה שלבים:**

1. **בדיקת המצב הנוכחי** -- מבצע שאילתה לטבלה `drizzle.__drizzle_migrations` לגבי היסטוריית המיגרציות שהוחלו
2. **הפעלת מיגרציות** -- קורא ל-`runMigrations()` מ-`lib/db/migrate.ts`
3. **אימות סכמה** -- מאשר שהעמודות הנדרשות קיימות

## סקריפטי זריעת נתונים

### זריעת מסד נתונים (seed.ts)

ממלא את מסד הנתונים בנתוני בדיקה ריאליסטיים. זורע רק אם הטבלאות ריקות.

```bash
DATABASE_URL=postgres://... pnpm seed
```

**סדר זריעה ותלויות:**

```mermaid
graph TD
    A[Roles] --> B[Permissions]
    B --> C[Role-Permission Links]
    C --> D[Users]
    D --> E[Client Profiles]
    D --> F[User Roles]
    E --> G[Newsletter Subscriptions]
    E --> H[Activity Logs]
    E --> I[Comments]
    E --> J[Votes]
```

**נתונים שנוצרים:**

```typescript
// 20 users with sequential emails
{ email: 'user1@example.com', ... }
{ email: 'user2@example.com', ... }

// Client profiles with varied plans
{ plan: i % 5 === 0 ? 'premium' : i % 3 === 0 ? 'standard' : 'free' }

// Role assignment: first user = admin
{ roleId: i === 0 ? 'role-admin' : 'role-user' }

// Newsletter subscriptions: every 3rd user
users.filter((_, i) => i % 3 === 0)
```

### נקודת כניסה CLI לזריעה (cli-seed.ts)

סקריפט עטיפה שטוען משתני סביבה ומאציל ל-`lib/db/seed.ts`.

הסקריפט מחפש קבצי סביבה בסדר הזה:
1. `.env.local` (מועדף)
2. `.env` (חלופי)
3. משתני סביבה מערכתיים בלבד (אם אין קבצים)

### זריעת מוצרי Stripe (seed-stripe-products.ts)

יוצר קטלוג מוצרי Stripe מלא עם תוכניות מנוי ופריטי רכישה חד-פעמית.

```bash
npx tsx scripts/seed-stripe-products.ts
```

**נדרש:** `STRIPE_SECRET_KEY` ב-`.env.local`

**מוצרים ומחירים:**

| מוצר | מפתח תוכנית | סוג מחיר | מטא-דאטה |
|---|---|---|---|
| Free | `free` | מנוי ($0/חודש) | `type: subscription` |
| Standard | `standard` | $10/חודש, $96/שנה | `annualDiscount: 20` |
| Premium | `premium` | $20/חודש, $180/שנה | `annualDiscount: 25` |
| מודעה ממומנת - שבועית | `sponsor_weekly` | $100 חד-פעמי | `type: sponsor_ad` |
| מודעה ממומנת - חודשית | `sponsor_monthly` | $300 חד-פעמי | `type: sponsor_ad` |

## ניקוי מסד נתונים

### clean-database.js

מוחק את כל הטבלאות וסכמת מעקב המיגרציות של Drizzle. מספק איפוס מלא של מסד הנתונים.

```bash
node scripts/clean-database.js
```

**פעולות שמבוצעות:**

1. מוחק את כל הטבלאות בסכמת `public` באמצעות `CASCADE`
2. מוחק את סכמת `drizzle` (היסטוריית מיגרציות)

```sql
-- Step 1: Drop all public tables
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Step 2: Drop migration tracking
DROP SCHEMA IF EXISTS drizzle CASCADE;
```

**אזהרה:** פעולה זו בלתי הפיכה. תמיד צור גיבוי לפני הפעלה בכל סביבה עם נתונים אמיתיים.

## זרימות עבודה נפוצות

### הגדרת פיתוח חדש

```bash
# 1. Start local PostgreSQL
docker compose up -d postgres

# 2. Generate migration files from schema
pnpm db:generate

# 3. Apply migrations
pnpm db:migrate:cli

# 4. Seed test data
pnpm db:seed

# 5. Seed Stripe products (if using payments)
npx tsx scripts/seed-stripe-products.ts
```

### איפוס וזריעה מחדש

```bash
# 1. Clean everything
node scripts/clean-database.js

# 2. Re-apply migrations
pnpm db:migrate:cli

# 3. Re-seed
pnpm db:seed
```

## משתני סביבה

| משתנה | נדרש על-ידי | מטרה |
|---|---|---|
| `DATABASE_URL` | כל הסקריפטים | מחרוזת חיבור PostgreSQL |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | הגדר ל-`true` לדילוג על מיגרציות בנייה |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | מפתח API של Stripe ליצירת מוצרים |
| `SEED_ADMIN_EMAIL` | seed.ts (דרך lib) | אימייל חשבון מנהל |
| `SEED_ADMIN_PASSWORD` | seed.ts (דרך lib) | סיסמת חשבון מנהל |

## טיפול בשגיאות

כל סקריפטי מסד הנתונים עוקבים אחר אמנות אלה:

- קוד יציאה `0` להצלחה או תנאי דילוג מקובלים
- קוד יציאה `1` לכשלים שצריכים לעצור את הצינור
- מחרוזות חיבור מוסתרות ביומנים (`://***:***@`)
- הודעות שגיאה מפורטות נרשמות בצד השרת
- שגיאות ייצור תמיד גורמות לכישלון בנייה (ללא השתקה)
