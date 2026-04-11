---
id: database-management
title: ניהול מסד נתונים
sidebar_label: ניהול מסד נתונים
sidebar_position: 4
---

# ניהול מסד נתונים

תבנית Ever Works משתמשת ב-PostgreSQL עם Drizzle ORM לכל פעולות מסד הנתונים. מדריך זה מכסה ניהול מסד נתונים בייצור, מיגרציות, מאגר חיבורים, ניטור ומערכות אתחול נתונים.

## ארכיטקטורה

| שכבה | קובץ | אחריות |
|------|------|--------|
| **הגדרה** | `drizzle.config.ts` | נתיבי סכמה, פלט מיגרציה, דיאלקט |
| **חיבור** | `lib/db/drizzle.ts` | מאגר חיבורים, Singleton, אתחול עצלן |
| **קונפיגורציה** | `lib/db/config.ts` | URL מאובטח למסד הנתונים ופונקציות עזר לסביבה |
| **סכמה** | `lib/db/schema.ts` | הגדרות טבלאות, אינדקסים, מגבלות |
| **מיגרציה** | `lib/db/migrate.ts` | מנוע מיגרציה אידמפוטנטי |
| **אתחול** | `lib/db/initialize.ts` | מיגרציה אוטומטית, אתחול נתונים, advisory locks |
| **נתוני זרע** | `lib/db/seed.ts` | נתונים ראשוניים: תפקידים, הרשאות, משתמש מנהל |

## ניהול חיבורים

### Singleton עם אתחול עצלן

חיבור מסד הנתונים נוצר בשימוש הראשון ונשמר דרך `globalThis` להישרדות עם טעינת HMR בפיתוח. מתוך `lib/db/drizzle.ts`:

```typescript
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle> | undefined;
};

function initializeDatabase(): ReturnType<typeof drizzle> {
  if (!getDatabaseUrl()) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (globalForDb.db) {
    return globalForDb.db;
  }

  const poolSize = getPoolSize();
  const conn = postgres(getDatabaseUrl()!, {
    max: poolSize,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
  });

  globalForDb.conn = conn;
  globalForDb.db = drizzle(conn, { schema });
  return globalForDb.db;
}
```

אובייקט `db` המיוצא משתמש ב-JavaScript Proxy לאתחול עצלן שקוף:

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

משמעות הדבר שלא נוצר חיבור למסד הנתונים עד לשאילתה הראשונה בפועל. נתיבים שאינם משתמשים במסד הנתונים אינם מחויבים בעלות חיבור.

### הגדרת מאגר חיבורים

| הגדרה | ברירת מחדל בייצור | ברירת מחדל בפיתוח | תיאור |
|-------|------------------|------------------|-------|
| `max` | 20 | 10 | מקסימום חיבורים במאגר |
| `idle_timeout` | 20 שניות | 20 שניות | סגירת חיבור סרק |
| `connect_timeout` | 30 שניות | 30 שניות | פסק זמן לניסיון חיבור חדש |
| `prepare` | false | false | נטרול Prepared Statements (תאימות Vercel) |

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

## סקירת סכמה

הסכמה ב-`lib/db/schema.ts` מגדירה את הטבלאות הראשיות הבאות:

### משתמשים ואימות

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique(),
  image: text('image'),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  createdAtIndex: index('users_created_at_idx').on(table.createdAt)
}));
```

### בקרת גישה מבוססת תפקידים

```typescript
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isAdmin: boolean('is_admin').notNull().default(false),
  status: text('status', { enum: ['active', 'inactive'] }).default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
}));
```

### רשימת טבלאות מלאה

| טבלה | מטרה |
|------|------|
| `users` | חשבונות משתמשים |
| `accounts` | קישור ספקי OAuth (מתאם NextAuth) |
| `sessions` | סשנים פעילים של משתמשים |
| `roles` | הגדרות תפקידים עם דגל מנהל |
| `permissions` | הגדרות הרשאות (משאב:פעולה) |
| `userRoles` | הקצאות משתמש-תפקיד |
| `rolePermissions` | הקצאות תפקיד-הרשאה |
| `clientProfiles` | פרופילים מורחבים לרשימות |
| `subscriptions` | רשומות מנויים בתשלום |
| `subscriptionHistory` | מעקב ביקורת שינויי מנויים |
| `paymentProviders` | הגדרת תשלום מרובה ספקים |
| `paymentAccounts` | פרטי חשבון ספציפיים לספק |
| `activityLogs` | מעקב ביקורת פעולות משתמשים |
| `comments` | תגובות משתמשים על פריטים |
| `votes` | הצבעות/דירוגים של משתמשים |
| `favorites` | מועדפים/סימניות של משתמשים |
| `notifications` | התראות בתוך האפליקציה |
| `seedStatus` | מעקב אתחול נתונים (רשומה בודדת) |

## מערכת מיגרציה

### פקודות מיגרציה

| פקודה | סקריפט | תיאור |
|-------|---------|-------|
| `pnpm db:generate` | `drizzle-kit generate` | יצירת SQL משינויי סכמה |
| `pnpm db:migrate` | `drizzle-kit migrate` | יישום מיגרציות ממתינות (Drizzle CLI) |
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | ביצוע מיגרציה עם לוגים מפורטים |
| `pnpm db:studio` | `drizzle-kit studio` | פתיחת ממשק Drizzle Studio |

## אתחול מסד הנתונים

### אתחול אוטומטי בהפעלה

`instrumentation.ts` מפעיל `initializeDatabase()` בכל הפעלת אפליקציה:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    await initializeDatabase();
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In dev/preview, allow app to start for debugging
  }
}
```

## אתחול נתונים

### אתחול נתונים ידני

```bash
# Seed the database with initial data
pnpm db:seed
```

### פרטי מנהל מערכת

בסביבת ייצור, הגדר פרטי כניסה מפורשים למנהל:

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

## ניטור

### Drizzle Studio

גלוש במסד הנתונים דרך ממשק גרפי:

```bash
pnpm db:studio
```

### בדיקת תקינות מסד הנתונים

נקודת הקצה `/api/health` יכולה לבדוק את חיבור מסד הנתונים:

```bash
curl -s https://yourdomain.com/api/health
```
