---
id: migration-guide
title: מדריך העברת גרסאות
sidebar_label: מדריך הגירה
sidebar_position: 8
---

# מדריך העברת גרסה

מדריך זה עוסק בשדרוג התקנת Ever Works Template שלך, טיפול בהעברות מסדי נתונים בין גרסאות, ניהול שינויים שבירים, כתיבה והחלה של סקריפטים להעברה והליכי ביטול.

## סקירת זרימת עבודה של שדרוג

שדרוג התבנית מתבצע בעקבות תהליך מובנה כדי למזער סיכונים:

```
1. Review changelog for breaking changes
2. Back up your database (pg_dump)
3. Create a feature branch for the upgrade
4. Update dependencies (pnpm install)
5. Generate and apply database migrations
6. Run lint, type check, and build locally
7. Test critical paths (auth, payments, content)
8. Deploy to staging / preview
9. Verify staging
10. Deploy to production
```

## מערכת העברת מסדי נתונים

### איך עובדות ההגירות

התבנית משתמשת ב-Drizzle ORM עם Drizzle Kit להעברת סכימה. הסכימה מוגדרת ב- `lib/db/schema.ts` וההעברות נוצרות כקובצי SQL אל `lib/db/migrations/` .

תצורה ב- `drizzle.config.ts` :

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

### פקודות הגירה

| פקודה | מטרה | מתי להשתמש |
|--------|--------|----------------|
| `pnpm db:generate` | צור SQL משינויים בסכימה | לאחר שינוי `lib/db/schema.ts` |
| `pnpm db:migrate` | החל העברות ממתינות (Drizzle CLI) | לפני הפעלת האפליקציה לאחר שינויים |
| `pnpm db:migrate:cli` | החל עם רישום מילולי | לאיתור באגים בבעיות הגירה |
| `pnpm db:seed` | אכלוס נתונים ראשוניים | לאחר הגירה טריה או שינויים בזרעים |
| `pnpm db:studio` | בדיקת מסד נתונים חזותית | עבור איתור באגים או סקירת נתונים |

### מבנה קבצי הגירה

ההגירות מאוחסנות כקובצי SQL ממוספרים:

```
lib/db/migrations/
  0000_burly_darkstar.sql          # Initial schema
  0001_add_image_to_users.sql      # Add image column
  ...
  0019_add_subscription_renewal_fields.sql
  ...
  0028_tiresome_mauler.sql         # Latest migration
  meta/
    _journal.json                  # Migration journal
```

טפטוף עוקב אחר הגירות שהוחלו ב- `drizzle.__drizzle_migrations` :

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### יצירת הגירה חדשה

לאחר שינוי `lib/db/schema.ts` :

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### העברות אוטומטיות

התבנית מריצה העברות אוטומטית בשני מקומות:

**זמן בנייה** (דרך `scripts/build-migrate.ts` ):

```typescript
// Production builds: failure causes build to fail
if (isProduction) {
  process.exit(1);
}

// Preview deployments: connection errors are tolerated
if (isConnectionError && !isAuthError) {
  process.exit(0); // Allow preview to deploy
}
```

**זמן ריצה** (דרך `instrumentation.ts` ):

```typescript
export async function register() {
  try {
    await initializeDatabase(); // Runs migrate then seed
  } catch (error) {
    if (isProduction) throw error; // Fail fast
    // Dev/preview: log and continue
  }
}
```

### בטיחות הגירה לפי סביבה

| סביבה | זמן בנייה | זמן ריצה | על כישלון |
|-------------|--------|--------|------------|
| הפקה | חובה | Fallback | בנייה נכשלת / זריקת אפליקציה |
| תצוגה מקדימה | שגיאות חיבור נסבלות | פעיל | אזהרת יומנים, האפליקציה מתחילה |
| פיתוח | לא בשימוש | פעיל | אזהרת יומנים, האפליקציה מתחילה |
| CI (לא Vercel) | דילג | לא בשימוש | לא רלוונטי |

## הליכי החזרה לאחור

### טפטוף אינו תומך בהחזרה אוטומטית

ערכת טפטוף מייצרת העברות קדימה בלבד. כדי להפוך הגירה:

**אפשרות 1: העברה הפוכה ידנית**

1. זהה את ההגירה הבעייתית ב- `lib/db/migrations/` 2. כתוב SQL הפוך באופן ידני:

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. הגש ישירות למסד הנתונים:

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. הסר את קובץ ההעברה קדימה מ- `lib/db/migrations/` 5. עדכן את יומן הטפטוף במידת הצורך

**אפשרות 2: שחזור מגיבוי**

גישת ההחזרה הבטוחה ביותר עבור העברות מורכבות:

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**אפשרות 3: החזר סכימה והפקה מחדש**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## עדכוני תלות

### עדכון תלות

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### תלות קריטית

חבילות אלו דורשות בדיקה קפדנית בעת שדרוג:

| חבילה | סיכון | הערות |
|--------|------|-------|
| `next` | גבוה | גרסאות עיקריות משנות ממשקי API, ניתוב, תצורה |
| `next-auth` | גבוה | שינויים ב-Auth API, אסטרטגיית הפעלה |
| `drizzle-orm` / `drizzle-kit` | גבוה | Schema API, שינויים בפורמט הגירה |
| `next-intl` | בינוני | שינויים בניתוב וטעינת הודעות |
| `@sentry/nextjs` | בינוני | תאימות וו מכשור |
| `stripe` | בינוני | גירסאות API לתשלום |
| `@heroui/react` | בינוני | שינויים ברכיבי ממשק המשתמש |
| `@trigger.dev/sdk` | בינוני | שינויים ב-API לתזמון עבודה |

### ביטולי pnpm

התבנית משתמשת בעקיפות pnpm ב- `package.json` כדי לאלץ גרסאות עקביות:

```json
{
  "pnpm": {
    "overrides": {
      "@types/react": "19.2.7",
      "@types/react-dom": "19.2.3",
      "esbuild": "0.27.0",
      "@opentelemetry/api": "1.9.0"
    }
  }
}
```

בעת שדרוג של React או esbuild, עדכן את העקיפות הללו כך שיתאימו.

## שבירת רשימת השינויים

בעת שדרוג בין גרסאות תבניות, סקור כל קטגוריה:

### שינויים בסכימה

- [ ] השווה את `lib/db/schema.ts` ל-upstream עבור עמודות חדשות/שונות
- [ ] צור העברות: `pnpm db:generate` - [ ] סקירת SQL שנוצר עבור פעולות הרסניות (הורדת עמודות, שינויים בסוג)
- [ ] החל על מסד נתונים בדיקה תחילה
- [ ] ודא תאימות זרעים: `pnpm db:seed` ### שינויים במסלול API

- [ ] בדוק אם יש מסלולים ששונו או הוסרו ב- `app/api/` - [ ] עדכן אינטגרציות חיצוניות וכתובות URL של webhook
- [ ] ודא שנתיבי נקודת הקצה של cron עדיין תואמים `vercel.json` ### שינויים בתצורה

- [ ] השווה את `.env.example` עבור משתנים חדשים או ששמם שונה
- [ ] סקור `next.config.ts` שינויים (כותרות, חבילת אינטרנט, תוספים)
- [ ] סמן את `vercel.json` לשינויים בלוח הזמנים של קרון
- [ ] סקור `drizzle.config.ts` לשינויי נתיב

### שינויים באימות

- [ ] השווה את `auth.config.ts` למעלה הזרם
- [ ] ודא תאימות אסטרטגיית ההפעלה
- [ ] בדוק כתובות URL להתקשרות חוזרת של OAuth
- [ ] סקור את הגדרות ההרשאה ב- `lib/permissions/definitions.ts` ### שינויים בממשק המשתמש והסגנון

- [ ] השווה את `tailwind.config.ts` לשינויים בנושא
- [ ] בדוק חזותית דפי מפתח
- [ ] בדוק פריסות רספונסיביות
- [ ] ודא שההתאמות האישיות של הנושא עדיין חלות

## תהליך שדרוג שלב אחר שלב

### 1. היכונו

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. מיזוג במעלה הזרם

אם אתה עוקב אחר התבנית כשלט במעלה הזרם:

```bash
git fetch upstream
git merge upstream/main --no-commit
```

לפתור קונפליקטים תוך שימת לב ל:
- `lib/db/schema.ts` -- שינויים בסכימה
- `next.config.ts` -- תצורת בנייה
- `auth.config.ts` -- ספקי אישור
- `package.json` -- גרסאות תלות

### 3. התקן והעבר

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. אימות מקומי

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. בדיקת נתיבים קריטיים

| אזור | מה לבדוק |
|------|-------------|
| אימות | התחברות, התנתקות, OAuth, התמדה בהפעלה |
| תשלומים | זרימות מנויים, טיפול ב-webhook |
| תוכן | עיבוד עמודים, חיפוש, סינון |
| אדמין | גישה ללוח המחוונים, אכיפת RBAC |
| i18n | החלפת מיקום, שלמות התרגום |
| משרות ברקע | יומני מסוף לרישום עבודה |

### 6. פריסה

1. לחץ על ענף התכונה לאימות CI
2. פרוס לסביבת הבמה / תצוגה מקדימה
3. הפעל מבחני עשן על בימות
4. מיזוג ל- `main` לפריסת ייצור

## תאימות גרסה

### Node.js

הגרסה המינימלית מוגדרת ב- `package.json` :

```json
{ "engines": { "node": ">=20.19.0" } }
```

### מסד נתונים

| ספק | נתמך | הערות |
|--------|------------|-------|
| PostgreSQL 14+ | כן | ייצור מומלץ |
| Supabase | כן | עם איחוד חיבורים |
| ניאון | כן | PostgreSQL ללא שרת |

### פלטפורמות

| פלטפורמה | סטטוס | הערות |
|--------|--------|-------|
| ורצל | יעד ראשוני | תמיכת קרון, תצוגה מקדימה וקצה מלאה |
| דוקר | נתמך | פלט עצמאי למכולות |
| אירוח עצמי | נתמך | דורש ניהול תהליכים |

## פתרון בעיות בשדרוגים

| סימפטום | סיבה סבירה | פתרון |
|--------|----------------|--------|
| בנייה נכשלת | Deps לא תואמים | הפעל `pnpm outdated` , פתור קונפליקטים של עמיתים |
| שגיאות DB בעת האתחול | העברות שלא יושמו | `pnpm db:generate && pnpm db:migrate` |
| אישור שבור | תצורת הספק השתנתה | השווה את `auth.config.ts` ל-upstream |
| תרגומים חסרים | נוספו מפתחות חדשים | סמן את `messages/` עבור ערכים חסרים |
| סטיילינג שבור | תצורת Tailwind השתנתה | השווה `tailwind.config.ts` |
| חוסר התאמה בין סוגים | סכימה עודכנה | הפעל מחדש את `pnpm db:generate` |
