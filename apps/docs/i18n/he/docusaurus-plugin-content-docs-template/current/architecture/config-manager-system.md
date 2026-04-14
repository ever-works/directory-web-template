---
id: config-manager-system
title: "מערכת מנהל התצורה"
sidebar_label: "מערכת מנהל התצורה"
sidebar_position: 41
---

# מערכת מנהל התצורה

## סקירה כללית

מערכת Config Manager מספקת שתי שכבות תצורה משלימות: המחלקה **ConfigManager** (`lib/config-manager.ts`) לניהול קובץ תצורת התוכן מבוסס YAML (`config.yml`) עם התמדה מגובת Git, ו-**ConfigService** (@@@TOK002-based) סביבת גישה ל-@@@TOK002. תצורה עם סכימות Zod. יחד הם מכסים גם הגדרות הניתנות לעריכה בזמן ריצה וגם תצורת סביבת בזמן הפריסה.

## אדריכלות

המערכת מחולקת לשתי תת-מערכות נפרדות:

### ConfigManager (מבוסס YAML, ניתן לעריכה בזמן ריצה)

`lib/config-manager.ts` מנהל את הקובץ `config.yml` בתוך הספרייה `.content/` (משובט ממאגר הנתונים). הוא קורא וכותב את תצורת YAML, ואוטומטי מתחייב ודוחף שינויים למאגר Git באמצעות `isomorphic-git`. זה משמש להגדרות שמנהלי מערכת יכולים לשנות בזמן ריצה (דפיון, ניווט, כותרת עליונה/תחתונה).

### ConfigService (מבוסס סביבה, מאומת אתחול)

`lib/config/` מספק יחידה מאומתת של Zod הקוראת את כל משתני הסביבה בעת ההפעלה ומארגן אותם לקטעים מוקלדים: ליבה, אישור, דואר אלקטרוני, תשלום, ניתוח ואינטגרציות. זה כולל דגלי תכונה, כלי עזר לזיהוי סביבה ויצוא שניתן לטלטל עצים.

```
config-manager.ts       --> Runtime YAML config (config.yml)
lib/config/
  index.ts              --> Barrel exports
  config-service.ts     --> Singleton ConfigService class
  types.ts              --> Type definitions
  env.ts                --> Zod-validated env variables
  feature-flags.ts      --> Database-dependent feature toggles
  schemas/              --> Zod schemas per section
  client.ts             --> Client-safe config exports
```

## הפניה ל-API

### ConfigManager (`lib/config-manager.ts`)

#### סוגים

```typescript
interface PaginationConfig {
  type: 'standard' | 'infinite';
  itemsPerPage: number;
}

interface AppConfig {
  pagination: PaginationConfig;
  [key: string]: any;
}
```

#### `configManager` (סינגלטון)

מופע הסינגלטון המיוצא כברירת מחדל של `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

מחזיר את אובייקט התצורה המלא, ממזג את תוכן הקובץ עם ברירות המחדל.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

מחזירה ערך תצורה ברמה העליונה לפי מפתח.

#### `configManager.getNestedValue(keyPath: string): any`

מחזירה ערך תצורה מקונן באמצעות סימון נקודות (לדוגמה, `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

מעדכן מפתח ברמה העליונה וממשיך לקובץ + Git.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

מעדכן מפתח מקונן באמצעות סימון נקודות. כולל אב טיפוס הגנה מפני זיהום.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

שיטת נוחות לעדכון הגדרות עימוד.

#### `configManager.getPaginationConfig(): PaginationConfig`

מחזירה את תצורת העימוד הנוכחית.

### ConfigService (`lib/config/config-service.ts`)

#### `configService` (סינגלטון)

יחידת שרת בלבד המאמתת את כל משתני הסביבה בעת ההפעלה.

|רכוש|הקלד|תיאור|
|----------|------|-------------|
|`configService.core`|`CoreConfig`|כתובות אתרים, מידע על האתר, מסד נתונים|
|`configService.auth`|`AuthConfig`|סודות, ספקי OAuth|
|`configService.email`|`EmailConfig`|SMTP, שלח מחדש, Novu|
|`configService.payment`|`PaymentConfig`|Stripe, LemonSqueezy, Polar|
|`configService.analytics`|`AnalyticsConfig`|PostHog, Sentry, Recaptcha|
|`configService.integrations`|`IntegrationsConfig`|Trigger.dev, Twenty CRM|

#### דגלים של תכונה (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

תכונות (דירוגים, הערות, מועדפים, פריטים נבחרים, סקרים) מופעלות כאשר `DATABASE_URL` מוגדר.

#### שירותי סביבה (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## פרטי יישום

**תור פעולות Git**: `ConfigManager` משתמש בתור טורי עם דפוס mutex כדי למנוע פעולות Git במקביל. כאשר קוראים ל-`writeConfig()`, הקובץ נשמר מיד, וה-Git commit/push מונח בתור. אם פעולות Git נכשלות, שמירת הקובץ עדיין תצליח.

**תלות ב-Git שנטענות בעצלתיים**: `isomorphic-git` ומודול ה-HTTP שלו נטענים בעצלתיים באמצעות `import()` דינמי עם דפוס יחיד כדי למנוע בעיות צרור ולמנוע יבוא כפול.

**הגנה מפני זיהום אב-טיפוס**: שיטת `updateNestedKey()` בודקת את `__proto__`, `constructor`, ו-`prototype` בכל רמה של הנתיב כדי למנוע התקפות אבטיפוס של זיהום.

**אימות הפעלה**: `ConfigService` מאמת את כל משתני הסביבה באמצעות סכימות Zod במהלך הייבוא הראשון. תצורה לא חוקית גורמת לכשל באתחול עם הודעות שגיאה תיאוריות. סכימות משתמשות במטפלים `.catch()` לצורך השפלה חיננית בשדות אופציונליים.

**אכיפה לשרת בלבד**: `config-service.ts` מייבאת `'server-only'` כדי למנוע הכללה בשוגג בחבילות לקוחות. תצורה בטוחה ללקוח מיוצאת בנפרד מ-`lib/config/client.ts`.

## תצורה

### משתני סביבה של ConfigManager

|משתנה|חובה|תיאור|
|----------|----------|-------------|
|`DATA_REPOSITORY`|כן|כתובת האתר של מאגר Git לתוכן|
|`GH_TOKEN`|עבור Git push|אסימון גישה של GitHub|
|`GITHUB_BRANCH`|לא|שם הסניף (ברירת מחדל: `main`)|
|`GIT_NAME`|לא|שם מחויב (ברירת מחדל: `Website Bot`)|
|`GIT_EMAIL`|לא|דוא"ל מחויב (ברירת מחדל: `website@ever.works`)|

### משתני סביבת ConfigService

ראה `.env.example` לרשימה המלאה. חלקי מפתח כוללים `AUTH_SECRET`, `DATABASE_URL`, `STRIPE_*`, `POSTHOG_*`, `RESEND_*`, ואחרים מאומתים על ידי סכימות Zod.

## דוגמאות לשימוש

```typescript
// Runtime config (YAML)
import { configManager } from '@/lib/config-manager';

// Read pagination settings
const pagination = configManager.getPaginationConfig();
console.log(pagination.type); // 'standard' | 'infinite'

// Update pagination
await configManager.updatePagination('infinite', 24);

// Update a nested key
await configManager.updateNestedKey('custom_header', [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]);

// Environment config (validated)
import { configService, coreConfig, paymentConfig } from '@/lib/config';

const appUrl = coreConfig.APP_URL;
const stripeEnabled = paymentConfig.stripe.enabled;

// Feature flags
import { isFeatureEnabled } from '@/lib/config';

if (isFeatureEnabled('comments')) {
  // Render comments section
}
```

## שיטות עבודה מומלצות

- השתמש ב-`configManager` עבור הגדרות שצריך לשנות בזמן ריצה על ידי מנהלי מערכת ללא פריסה מחדש.
- השתמש ב-`configService` עבור תצורה של זמן הפריסה שאמורה להיות מאומתת בעת ההפעלה.
- ייבא תצורה בטוחה ללקוח מ-`@/lib/config/client` ברכיבי לקוח, לעולם לא מיצוא החבית הראשית.
- טפל תמיד בהחזרה `Promise<boolean>` מ-`updateKey` ו-`updateNestedKey` כדי לזהות כשלי כתיבה.
- השתמש בדגלי תכונה כדי לגרוע בחן את הפונקציונליות כאשר תלות אופציונלית (כמו מסד הנתונים) אינן מוגדרות.

## מודולים קשורים

- [מערכת מטמון](./cache-system) -- משתמש ב-`CACHE_TAGS.CONFIG` עבור שמירה במטמון של תצורה
- [מערכת Guards](./guards-system-deep-dive) -- צורכת תצורת תוכנית/תכונה
- [ספריית תוכן](/template/architecture/content-library) -- רזולוציית נתיב תוכן בשימוש על ידי ConfigManager
