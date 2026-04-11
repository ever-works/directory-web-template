---
id: drizzle-config
title: הגדרת Drizzle ORM
sidebar_label: הגדרת Drizzle
sidebar_position: 9
---

# הגדרת Drizzle ORM

דף זה מתעד את הגדרות Drizzle ORM המשמשות את התבנית לניהול סכמת מסד נתונים, העברות ובנייה בטוחת-טיפוסים של שאילתות. ההגדרות נמצאות ב-`drizzle.config.ts` בשורש הפרויקט.

## סקירה כללית

התבנית משתמשת ב-[Drizzle ORM](https://orm.drizzle.team/) עם PostgreSQL כניב מסד הנתונים. Drizzle מספק גישה בטוחת-טיפוסים למסד הנתונים, יצירת העברות אוטומטית וסטודיו חזותי לבדיקת מסד הנתונים.

## קובץ ההגדרות

ההגדרה המלאה מוגדרת ב-`drizzle.config.ts`:

```ts
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

// השתמש בכתובת URL מדומה אם DATABASE_URL לא מוגדר (מסד הנתונים אופציונלי לפרויקט זה)
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

## מאפייני הגדרה

### `schema`

- **ערך:** `"./lib/db/schema.ts"`
- **מטרה:** מצביע לקובץ המכיל את כל הגדרות טבלאות Drizzle. כאן חיות הצהרות `pgTable`.

קובץ הסכמה ב-`lib/db/schema.ts` מגדיר טבלאות באמצעות בוני עמודות PostgreSQL של Drizzle:

```ts
import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  serial,
  varchar,
  uniqueIndex,
  index,
  jsonb,
  check,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  image: text("image"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ...עמודות נוספות
});
```

### `out`

- **ערך:** `"./lib/db/migrations"`
- **מטרה:** ספרייה שבה נשמרים קבצי העברת SQL שנוצרו. בכל פעם שמריצים `drizzle-kit generate`, מופיעים כאן קבצי העברה חדשים.

### `dialect`

- **ערך:** `"postgresql"`
- **מטרה:** מציין את מנוע מסד הנתונים. התבנית מכוונת ל-PostgreSQL לפריסות ייצור.

### `dbCredentials`

- **ערך:** `{ url: databaseUrl }`
- **מטרה:** מחרוזת חיבור למסד הנתונים. נקראת ממשתנה הסביבה `DATABASE_URL`.

## טעינת משתני סביבה

ההגדרה טוענת משתני סביבה משני קבצים, לפי הסדר:

1. `.env` — משתני סביבה בסיסיים
2. `.env.local` — דריסות מקומיות (בעדיפות גבוהה יותר)

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

גישה זו של טעינה כפולה מאפשרת לשמור ברירות מחדל משותפות ב-`.env` תוך כדי דריסת כתובות URL וסודות מסד נתונים מקומית.

## כתובת URL גיבוי למסד נתונים

ההגדרה כוללת כתובת URL מדומה כגיבוי:

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

גיבוי זה קיים מכיוון שמסד הנתונים אופציונלי לפרויקט זה. הוא מאפשר לפקודות Drizzle Kit כמו `generate` לפעול גם כאשר אין מסד נתונים אמיתי, דבר שמועיל ב-CI/CD או בהגדרת פרויקט ראשונית.

## פקודות נפוצות

התבנית מגדירה מספר סקריפטים הקשורים למסד נתונים ב-`package.json`:

| פקודה | תיאור |
|---------|-------------|
| `pnpm db:generate` | יצירת קבצי העברה משינויי סכמה |
| `pnpm db:migrate` | החלת העברות ממתינות על מסד הנתונים |
| `pnpm db:seed` | מילוי מסד הנתונים בנתונים ראשוניים |
| `pnpm db:studio` | פתיחת Drizzle Studio לניהול מסד נתונים חזותי |

### יצירת העברות

לאחר שינוי הסכמה ב-`lib/db/schema.ts`, צור העברה חדשה:

```bash
pnpm db:generate
```

זה יוצר קובץ העברת SQL חדש ב-`lib/db/migrations/` המכיל את הצהרות ה-DDL הנדרשות לסנכרון מסד הנתונים עם הסכמה שלך.

### הרצת העברות

החל את כל ההעברות הממתינות:

```bash
pnpm db:migrate
```

### העברה אוטומטית בהפעלה

התבנית תומכת גם בהעברה אוטומטית במהלך הפעלת האפליקציה דרך קובץ ה-instrumentation. זה משמש כגיבוי לפריסות תצוגה מקדימה:

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // ...
  try {
    console.log("[Instrumentation] Running database initialization...");
    await initializeDatabase();
    console.log("[Instrumentation] Database initialization completed");
  } catch (error) {
    // בייצור, זורק מחדש לאות כישלון קריטי
    // בפיתוח, מאפשר לאפליקציה להפעיל לצורך ניפוי שגיאות
  }
}
```

לבניות ייצור על Vercel, העברות בזמן בנייה דרך `scripts/build-migrate.ts` הן הגישה המועדפת.

## הגדרת DATABASE_URL

### פיתוח מקומי (PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / ייצור

הגדר `DATABASE_URL` במשתני הסביבה של פרויקט Vercel שלך, בדרך כלל מצביע למופע PostgreSQL מנוהל (Neon, Supabase, Railway וכד'):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## אבטחת טיפוסים

מכיוון ש-Drizzle יוצר סוגי TypeScript ישירות מהסכמה שלך, כל השאילתות נבדקות סוגים במלואן בזמן הקומפילציה. לא נדרש שלב יצירת קוד נפרד — קובץ הסכמה עצמו הוא מקור האמת היחיד גם לגבי מבנה מסד הנתונים וגם לגבי סוגי TypeScript.

## משאבים קשורים

- [עיון בסביבה](/template/configuration/environment-reference) — רשימה מלאה של משתני סביבה כולל `DATABASE_URL`
- [בדיקת תקינות מסד נתונים](/template/guides/database-health-check) — ניטור קישוריות מסד נתונים
- [מדריך Instrumentation](/template/guides/instrumentation) — אתחול אוטומטי של מסד נתונים בהפעלה
