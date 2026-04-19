---
id: migrations-guide
title: מדריך הגירה
sidebar_label: הגירות
sidebar_position: 4
---

# מדריך הגירה

התבנית Ever Works משתמשת ב-**Drizzle Kit** להגירות של מסדי נתונים. העברות הן קבצי SQL שעוקבים אחר שינויי סכימה לאורך זמן, ומבטיחים מצב עקבי של מסד נתונים בין סביבות וחברי צוות.

## איך עובדות ההגירות

Drizzle Kit משווה את הגדרת הסכימה הנוכחית (`lib/db/schema.ts`) מול העברות שנוצרו בעבר ומייצרת קבצי הגירה של SQL עבור כל הבדלים.

```
lib/db/schema.ts (source of truth)
        │
        ▼
  drizzle-kit generate
        │
        ▼
lib/db/migrations/
  ├── 0000_burly_darkstar.sql       (initial schema)
  ├── 0001_add_image_to_users.sql
  ├── 0002_silly_victor_mancha.sql
  ├── ...
  └── 0028_tiresome_mauler.sql      (latest)
```

## מבנה ספריית הגירה

```
lib/db/migrations/
├── 0000_burly_darkstar.sql           # Initial schema (16KB - all core tables)
├── 0001_add_image_to_users.sql       # Add image column to users
├── 0002_silly_victor_mancha.sql      # Subscription and payment tables
├── 0003_gigantic_thunderbolts.sql    # Small schema adjustment
├── 0004_big_marrow.sql               # Small schema adjustment
├── 0005_sharp_malcolm_colcord.sql    # Favorites table
├── 0006_giant_the_phantom.sql        # Featured items table
├── 0007_tiresome_true_believers.sql  # Sponsor ads table
├── 0008_add_twenty_crm_singleton_constraint.sql  # CRM singleton
├── 0009_add_integration_mappings.sql # Integration mappings
├── 0010_convert_comments_timestamps_to_timestamptz.sql # Timezone fix
├── 0011_quiet_gravity.sql            # Companies table
├── 0012_purple_vindicator.sql        # Items-companies join
├── 0013_add_surveys_table.sql        # Survey system
├── 0014_fat_madame_masque.sql        # Seed status, item views, audit logs
├── 0015_previous_jack_flag.sql       # Report and moderation tables
├── 0016_solid_stellaris.sql          # Minor adjustment
├── 0017_whole_supreme_intelligence.sql # Minor adjustment
├── 0018_wooden_electro.sql           # Additional indexes
├── 0019_add_subscription_renewal_fields.sql # Auto-renewal support
├── 0020_chunky_naoko.sql             # Minor adjustment
├── 0021_redundant_dragon_lord.sql    # Additional indexes
├── 0022_tidy_dakota_north.sql        # Payment account improvements
├── 0023_boring_silverclaw.sql        # Collection tables
├── 0024_deep_wrecker.sql             # Additional improvements
├── 0025_overconfident_moon_knight.sql # Location features
├── 0026_exotic_clea.sql              # Minor adjustment
├── 0027_minor_mesmero.sql            # Minor adjustment
├── 0028_tiresome_mauler.sql          # Latest migration
├── meta/                             # Drizzle migration metadata
├── relations.ts                      # Drizzle relation definitions
└── schema.ts                         # Snapshot of schema at migration time
```

הספרייה `meta/` מכילה את מטא-נתוני המעקב הפנימיים של Drrizzle Kit. הקבצים `relations.ts` ו-`schema.ts` בספריית ההעברות הם צילומי מצב עזר ואין לערוך אותם באופן ידני.

## פקודות

### צור הגירה

לאחר שינוי `lib/db/schema.ts`, צור העברה:

```bash
pnpm db:generate
```

זה מפעיל `drizzle-kit generate` אשר:
1. קורא את הסכימה הנוכחית מ-`lib/db/schema.ts`
2. משווה אותו לתמונת המצב העדכנית של ההגירה
3. יוצר קובץ SQL חדש ב-`lib/db/migrations/`
4. מעדכן את מטא-נתוני ההעברה ב-`meta/`

### הפעל העברות בהמתנה

החל את ההגירות שלא יושמו על מסד הנתונים שלך:

```bash
pnpm db:migrate
```

זה קורא `lib/db/migrate.ts` אשר:
1. מתחבר למסד הנתונים באמצעות `DATABASE_URL`
2. בודק בטבלה `drizzle.__drizzle_migrations` עבור העברות מיושמות
3. מפעיל את ההגירות שלא הוחלו
4. מעדכן את טבלת המעקב

### פתח את סטודיו טפטוף

הפעל עורך מסד נתונים חזותי:

```bash
pnpm db:studio
```

## רץ הגירה (`lib/db/migrate.ts`)

רץ ההגירה (`runMigrations()`) הוא אדיש ובטוח להתקשר בכל סטארט-אפ:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');

  // Log current migration state
  // ...

  // Run migrations (Drizzle automatically skips applied ones)
  await migrate(db, { migrationsFolder: './lib/db/migrations' });

  return true;
}
```

התנהגויות מפתח:
- **Idempotent**: טפטוף עוקב אחר הגירות מיושמות ב-`drizzle.__drizzle_migrations`; מדלגים על העברות שכבר הוחלו
- **רישום**: מדווח על העברות שהוחלו לאחרונה לפני ואחרי ביצוע
- **טיפול בשגיאות**: מחזירה `false` בכשל עם הודעות שגיאה מפורטות
- **הפעלה אוטומטית**: נקרא במהלך הפעלת האפליקציה באמצעות `lib/db/initialize.ts`

## העברה אוטומטית בעת ההפעלה

התבנית מפעילה העברות אוטומטית עם הפעלת היישום. זה מופעל על ידי `instrumentation.ts` שמתקשר ל-`initializeDatabase()` מ-`lib/db/initialize.ts`.

זרימת ההפעלה:
1. בדוק אם `DATABASE_URL` מוגדר (דלג אם לא)
2. הפעל את כל ההגירות הממתינות
3. בדוק אם מסד הנתונים הוזן
4. אם לא זרעו, רכשו מנעול מייעץ והפעילו זרע

בייצור, כשלי הגירה גורמים לשגיאה לאותת למערכות ניטור. בסביבות פיתוח ותצוגה מקדימה, האפליקציה ממשיכה עם אזהרה.

## יצירת הגירות חדשות

### שלב 1: שנה את הסכימה

ערוך `lib/db/schema.ts` כדי להוסיף, לשנות או להסיר הגדרות טבלה:

```typescript
// Add a new table
export const newTable = pgTable('new_table', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Add a column to an existing table
// Just add the new column to the existing pgTable definition
```

### שלב 2: צור את ההגירה

```bash
pnpm db:generate
```

זה יוצר קובץ SQL חדש כמו `0029_some_name.sql`.

### שלב 3: סקור את ה-SQL שנוצר

סקור תמיד את ההעברה שנוצרה לפני החלתה. בדוק אם:
- תקן את שמות הטבלה והעמודות
- סוגי נתונים ואילוצים מתאימים
- הגדרות אינדקס
- קשרי מפתח זרים
- כל פעולות הרסניות (הורדת טבלה, זרוק עמודה)

### שלב 4: החל את ההגירה

```bash
pnpm db:migrate
```

### שלב 5: התחייבות

בצע גם את שינוי הסכימה וגם את קובץ ההעברה שנוצר:
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (מטא נתונים מעודכנים)

## זרימת עבודה בצוות

### טיפול בשינויי סכימה במקביל

כאשר מספר חברי צוות משנים את הסכימה בו זמנית:

1. כל מפתח מייצר את ההגירה שלו באופן מקומי
2. בעת מיזוג, ייתכן שיהיה צורך למספור מחדש קובצי הגירה אם מספרי רצף מתנגשים
3. ערכת טפטוף עוקבת אחר העברות לפי hash, לא לפי מספר, כך שביצוע מחוץ לסדר מטופל
4. לאחר המיזוג, הפעל את `pnpm db:migrate` כדי להחיל את כל ההגירות החדשות

### שיקולי סביבה

|סביבה|אסטרטגיית הגירה|
|-------------|-------------------|
|פיתוח|הפעלה אוטומטית בעת האתחול; ליצור ולבדוק באופן מקומי|
|תצוגה מקדימה/במה|הפעלה אוטומטית בפריסה דרך `instrumentation.ts`|
|הפקה|הפעלה אוטומטית בזמן הפריסה; מעקב אחר כשלים|

### שיטות עבודה מומלצות

1. **דאגה אחת לכל הגירה**: שמור את ההגירות ממוקדות בתכונה או שינוי בודד
2. **לעולם אל תערוך העברות קיימות**: ברגע שהעברה הוחלה בכל מקום, התייחס אליה כבלתי ניתן לשינוי
3. **סקור את ה-SQL שנוצר**: בדוק תמיד מה מייצר ערכת טפטוף לפני היישום
4. **הגירות בדיקה**: הפעל העברות מול מסד נתונים בדיקה לפני הפריסה לייצור
5. **כלול קובצי הגירה בסקירת קוד**: יש לסקור את SQL ההעברה בדיוק כמו קוד יישום
6. **גיבוי לפני העברות הרסניות**: גבה תמיד לפני הפעלת העברות שמפילות טבלאות או עמודות
