---
id: troubleshooting
title: מדריך לפתרון בעיות
sidebar_label: פתרון בעיות
sidebar_position: 7
---

# מדריך לפתרון בעיות

מדריך זה מכסה שגיאות נפוצות, טכניקות ניפוי באגים, פרשנות יומן ובעיות סביבה עבור תבנית Ever Works. הנושאים מאורגנים לפי קטגוריות עם סימפטומים, סיבות ופתרונות.

## בעיות בבנייה

### המודול לא נמצא במהלך הבנייה

**סימפטומים**: בנייה נכשלת עם שגיאות מודול מקוריות של `Module not found: Can't resolve 'postgres'` או דומות של Node.js.

**סיבה**: Webpack מנסה לאגד מודולים לשרת בלבד עבור חבילת הלקוח.

**פתרון**: ודא שהמודול מופיע ב- `serverExternalPackages` ב- `next.config.ts` :

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

אם הוספת תלות חדשה לשרת בלבד, הוסף אותה למערך זה.

### פסק זמן סטטי ליצירת דפים

**סימפטומים**: בנייה נכשלת עם `Error: Timeout of 180000ms exceeded` במהלך יצירה סטטית.

**סיבה**: דפים שמביאים נתונים חיצוניים במהלך זמן הבנייה חורגים מהזמן הקצוב.

**פתרון**: התבנית קובעת פסק זמן של 3 דקות:

```typescript
staticPageGenerationTimeout: 180,
```

עבור דפים שצריכים יותר זמן, הגדל ערך זה. לחלופין, החלף דפים איטיים לעיבוד דינמי:

```typescript
export const dynamic = 'force-dynamic';
```

### ספריית תוכן חסרה במהלך הבנייה

**סימפטומים**: Build נכשל כי `.content/data` אינו קיים.

**סיבה**: תוכן ה-CMS מבוסס Git לא שובט. הסקריפט `scripts/clone.cjs` פועל במהלך הוקס `predev` ו `prebuild` .

**פִּתָרוֹן**:

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### אזהרות Webpack מ-Supabase, bcryptjs, postgres, stripe

**סימפטומים**: Build מייצר אזהרות לגבי החבילות הללו אך מסתיים בהצלחה.

**סיבה**: אזהרות ידועות מחבילות המתייחסות לממשקי API של Node.js אינם זמינים בדפדפן.

**פתרון**: אלה כבר מודחקים ב- `next.config.ts` :

```typescript
config.ignoreWarnings = [
	{ module: /@supabase\/realtime-js/ },
	{ module: /@supabase\/supabase-js/ },
	{ module: /bcryptjs/ },
	{ message: /bcryptjs/ },
	{ module: /postgres/ },
	{ module: /stripe/ }
];
```

אין צורך בפעולה -- אזהרות אינן משפיעות על פלט הבנייה.

### ג'אווה סקריפט חסר זיכרון

**סימפטומים**: צור קריסות עם `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory` .

**פתרון**: סקריפטי הבנייה כבר מקצים 8 GB:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

אם ל-build עדיין נגמר הזיכרון, בדוק אם:

- יצירת דפים סטטית מוגזמת (צמצם את הדפים שנבנו בזמן הבנייה)
- תלות גדולה לא מטלטלת כראוי
- דליפות זיכרון בתסריטים בזמן בנייה

## בעיות במסד נתונים

### התחברות סירבה ל-PostgreSQL

**תסמינים**: היישום נכשל עם `connection refused` , `ECONNREFUSED` או `connect ETIMEDOUT` .

**שלבי אבחון**:

1. אמת את `DATABASE_URL` ב- `.env.local` :
    ```באש
    node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.DATABASE_URL? 'Set': 'חסר')"
    ```
2. בדוק את החיבור ישירות: `psql $DATABASE_URL -c "SELECT 1"` 3. בדוק ש-PostgreSQL פועל: `pg_isready` **סיבות ותיקונים נפוצות**:

| גורם | תקן |
| ---------------------------- | ------------------------------------------------------- |
| PostgreSQL לא פועל | התחל את השירות |
| יציאה שגויה | אמת את היציאה במחרוזת החיבור שלך |
| מסד נתונים חסר | `createdb your_database_name` |
| כשל באימות | בדוק את שם המשתמש/סיסמה ב- `DATABASE_URL` |
| נדרש SSL | הוסף `?sslmode=require` למחרוזת החיבור |

### ההעברה נכשלה

**סימפטומים**: `pnpm db:migrate` נכשל עם שגיאות סכימה או SQL.

**פתרון**: השתמש בכלי ההגירה המילולי של CLI לניפוי באגים:

```bash
pnpm db:migrate:cli
```

זה מראה:

1. מצב העברה נוכחי (רשימת ההגירות החלות)
2. פלט ביצוע הגירה מפורט
3. אימות סכימה לאחר הגירה

אם ההגירות פגומות, בדוק את טבלת המעקב של טפטוף:

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### אתחול מסד הנתונים נכשל במכשור

**תסמינים**: הקונסולה מציגה `[Instrumentation] Database initialization failed` בעת ההפעלה.

**סיבה**: הקרס `instrumentation.ts` מפעיל הגירה וזריעה בעת ההפעלה. כשל מצביע על בעיה בקישוריות מסד הנתונים או בסכימה.

**התנהגות לפי סביבה**:

| סביבה | על כישלון |
| ----------- | -------------------------------------------- |
| הפקה | זורק שגיאה, הפריסה משרתת 503 |
| פיתוח | אזהרת יומנים, אפליקציה מתחילה לאיתור באגים |
| תצוגה מקדימה | אזהרת יומנים, אפליקציה מתחילה לאיתור באגים |

מ `instrumentation.ts` :

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### זרע תקוע במצב "זריעה".

**סימפטומים**: יומני יישומים `[DB Init] Another instance is seeding` שוב ושוב.

**סיבה**: פעולת סיד קודמת קרסה מבלי לעדכן את הסטטוס.

**פתרון**: קוד האתחול מטפל אוטומטית בזרעים מיושנים לאחר 5 דקות:

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

כדי לפתור באופן מיידי, עדכן ידנית את סטטוס ה-Seed:

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

לאחר מכן הפעל מחדש את היישום.

## בעיות אימות

### AUTH_SECRET לא מוגדר

**תסמינים**: יישום קורס עם `AUTH_SECRET is not set` או שגיאות הפעלה.

**פִּתָרוֹן**:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### אי התאמה של כתובת האתר להתקשרות חוזרת של OAuth

**תסמינים**: התחברות OAuth מפנה לדף שגיאה עם `redirect_uri_mismatch` .

**פתרון**: כתובת האתר להתקשרות חוזרת במסוף ספק ה-OAuth שלך חייבת להתאים בדיוק:

| ספק | כתובת אתר להתקשרות חוזרת |
| -------- | ---------------------------------------------------------- |
| גוגל | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| פייסבוק | `https://yourdomain.com/api/auth/callback/facebook` |
| טוויטר | `https://yourdomain.com/api/auth/callback/twitter` |

לפיתוח מקומי, השתמש ב- `http://localhost:3000/api/auth/callback/<provider>` .

### ספקי OAuth אינם מופיעים

**תסמינים**: רק פרטי כניסה מוצגים, לחצני OAuth חסרים.

**סיבה**: ספקי OAuth חוזרים למצב מושבת אם התצורה נכשלת. מ-6:

```typescript
} catch (error) {
  // Fallback to credentials only
  return createNextAuthProviders({
    credentials: { enabled: true },
    google: { enabled: false },
    github: { enabled: false },
    facebook: { enabled: false },
    twitter: { enabled: false },
  });
}
```

**פתרון**: בדוק שגם `CLIENT_ID` וגם `CLIENT_SECRET` מוגדרים עבור כל ספק. סקריפט בדיקת הסביבה מאמת צמדי OAuth:

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### פגישות שיפוג באופן בלתי צפוי

**סיבות נפוצות**:

| גורם | פתרון |
| ---------------------------- | ---------------------------------------------------- |
| `AUTH_SECRET` השתנה | שינוי הסוד מבטל את כל ההפעלות |
| אי התאמה של דומיין קובצי Cookie | הגדר את `COOKIE_DOMAIN` כך שיתאים לתחום הפריסה שלך |
| חוסר התאמה של HTTPS | הגדר `COOKIE_SECURE=false` לפיתוח HTTP מקומי |

## בעיות פריסה

### בניית Vercel נכשלת אך בנייה מקומית מצליחה

**רשימת בדיקה**:

1. כל משתני הסביבה הנדרשים מוגדרים בלוח המחוונים של Vercel
2. `DATABASE_URL` נגיש מהרשת של Vercel
3. תואמת גרסת Node.js (דורש 20.19.0 ומעלה)
4. ספריית תוכן קיימת (CI יוצר את `.content/data` באופן אוטומטי)
5. הקצאת זיכרון מספקת

### משימות Cron של Vercel לא מבוצעות

**תסמינים**: נקודות קצה מתוזמנות ב- `vercel.json` אינן פועלות.

**שלבי אבחון**:

1. ודא ש- `vercel.json` נמצא בשורש הפרויקט עם נתיבים נכונים:
    ``` json
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" }
    ```
2. אשר שתוכנית Vercel תומכת ב-cron (Pro או Enterprise)
3. בדוק את Vercel Dashboard בכרטיסייה Cron Jobs עבור יומני ביצוע
4. בדוק את נקודת הקצה באופן ידני: `curl https://yourdomain.com/api/cron/sync` ### ההעברה בזמן הבנייה נכשלת ב-Vercel

**תסמינים**: יומן בנייה מציג את `[Build Migration] Migration error` .

**התנהגות**: הסקריפט `scripts/build-migrate.ts` מטפל בתרחישים שונים:

- **ייצור**: כל התקלות גורמות לכשל בבנייה
- **תצוגה מקדימה עם שגיאת חיבור**: הבנייה נמשכת עם אזהרה
- **תצוגה מקדימה עם שגיאת אימות**: בנייה נכשלה (תצורה שגויה)

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

כדי לדלג לחלוטין על העברות בזמן בנייה:

```bash
SKIP_BUILD_MIGRATIONS=true
```

## בעיות בינלאומיות

### מקשי תרגום מוצגים במקום טקסט

**סימפטומים**: הדפים מציגים `common.WELCOME` במקום "ברוך הבא".

**פתרון**:

1. ודא שקובץ התרגום קיים: `messages/<locale>.json` 2. בדוק שנתיב המפתח תואם למרחב השמות המשמש ב- `useTranslations` 3. מערכת ההחלפה משתמשת ב- `deepmerge` כדי למזג הודעות מקומיות עם ברירות מחדל באנגלית:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

אם חסר מפתח בקובץ המקום, ה-fallback באנגלית צריך לספק אותו.

### ניתוב מקומי מחזיר 404

**תסמינים**: כתובות אתרים כמו `/fr/discover` מחזירות דף 404.

**פתרון**: ודא שהמקום נמצא במערך `LOCALES` ב- `lib/constants.ts` :

```typescript
export const LOCALES = [
	'en',
	'fr',
	'es',
	'de',
	'zh',
	'ar',
	'he',
	'ru',
	'uk',
	'pt',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'hi',
	'id',
	'bg'
] as const;
```

ואמת את תצורת הניתוב ב- `i18n/routing.ts` :

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## פירוש יומן

### קידומות יומן

| קידומת | מקור | מיקום |
| ------------------- | ----------------------------------- | -------------------------- |
| `[Instrumentation]` | הפעלה של אפליקציה (DB init, Sentry) | `instrumentation.ts` |
| `[Migration]` | ביצוע העברת מסדי נתונים | `lib/db/migrate.ts` |
| `[DB Init]` | אתחול וזריעה של מסדי נתונים | `lib/db/initialize.ts` |
| `[Build Migration]` | סקריפט העברה בזמן בנייה | `scripts/build-migrate.ts` |
| `[Layout]` | שגיאות באחזור נתוני פריסת שורש | `app/[locale]/layout.tsx` |

### תגיות שגיאת זקיף

שגיאות זקיף ממכשור כוללות את התגים הבאים לסינון:

| תג | ערכים |
| ------------- | ------------------------------------------ |
| `component` | `instrumentation` |
| `phase` | `database_init` |
| `environment` | `production` , `preview` או `development` |

## פקודות אבחון

| משימה | פקודה |
| ------------------------ | ----------------------------------- |
| בדוק שגיאות TypeScript | `pnpm tsc --noEmit` |
| לרוץ linter | `pnpm lint` |
| אימות סביבה | `node scripts/check-env.js` |
| בדיקת סביבה מהירה | `node scripts/check-env.js --quick` |
| בדוק את חיבור מסד הנתונים | `pnpm db:studio` |
| הצג מצב הגירה | `pnpm db:migrate:cli` |
| צור העברות חדשות | `pnpm db:generate` |
| החל העברות ממתינות | `pnpm db:migrate` |
| מסד נתונים זרעים | `pnpm db:seed` |
| נקה מטמון בנייה | `rm -rf .next` |
| בנייה מחדש מלאה | `rm -rf .next && pnpm build` |
| אפס מסד נתונים | `node scripts/clean-database.js` |

## קבלת עזרה

1. חפש ב-[GitHub Issues](https://github.com/ever-works/directory-web-template/issues)
2. עיין בקובץ `CLAUDE.md` לקבלת הנחיות לפיתוח בעזרת AI
3. בדוק את לוח המחוונים של Sentry לקבלת פרטי שגיאה (אם מוגדר)
4. לבעיות אבטחה, שלח דוא"ל ל- security@ever.co באופן פרטי
