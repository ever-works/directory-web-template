---
id: logger-system
title: "מערכת לוגר"
sidebar_label: "מערכת לוגר"
sidebar_position: 44
---

# מערכת לוגר

## סקירה כללית

מערכת לוגר מספקת כלי רישום קל משקל ומודע לסביבה עבור פלט יומן עקבי בכל היישום. הוא תומך בארבע רמות יומן (DEBUG, INFO, WARN, ERROR), מופעי לוגר בהיקף ההקשר ועיצוב ספציפי לסביבה - פלט מסוף בסגנון בדפדפן במהלך הפיתוח ופלט רגיל בפורמט JSON ב-Node.js ובסביבות ייצור.

## אדריכלות

המודול (`lib/logger.ts`) מייצא שני פריטים:

- **`logger`** -- מופע יחיד ללא תווית הקשר, מתאים לרישום למטרות כלליות.
- **`Logger`** (מחלקה) -- המחלקה עצמה, ליצירת מופעי לוגר קונטקסטואלי בהיקף של מודולים או תכונות ספציפיות.

הלוגר עוקב אחר אסטרטגיית סינון פשוטה: בייצור (`NODE_ENV !== 'development'`), נפלטות רק הודעות אזהרה ושגיאה. בפיתוח, כל הרמות מתועדות. זה מבטיח שפלט ניפוי באגים לא ידלוף לסביבות ייצור.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## הפניה ל-API

### יצוא

#### `logger` (סינגלטון)

מופע מראש של `Logger` ללא הקשר. השתמש לרישום מהיר ללא טווח.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (כיתה)

##### `static create(context: string): Logger`

שיטת מפעל ליצירת לוגר בהיקף של הקשר. מחרוזת ההקשר מופיעה בתור קידומת בכל הודעות היומן.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

רושם הודעה ברמת ניפוי באגים. נפלט רק בפיתוח.

##### `info(message: string, data?: any): void`

רושם הודעת מידע. נפלט רק בפיתוח.

##### `warn(message: string, data?: any): void`

רושם הודעת אזהרה. נפלט בכל הסביבות.

##### `error(message: string, error?: any): void`

רושם הודעת שגיאה. אם הפרמטר `error` הוא מופע `Error`, הלוגר מחלץ אוטומטית מאפיינים `message`, `stack` ו-`name`. נפלט בכל הסביבות.

##### `api(method: string, url: string, data?: any): void`

שיטת נוחות לרישום בקשות API. נציגים אל `debug()` עם נתונים מובנים. פיתוח בלבד.

##### `performance(label: string, duration: number): void`

שיטת נוחות לרישום מדדי ביצועים. רושם את התווית ומשך הזמן באלפיות שניות. פיתוח בלבד.

### סוגים פנימיים

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;  // ISO 8601
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
}
```

## פרטי יישום

**זיהוי סביבה**: הלוגר בודק `process.env.NODE_ENV === 'development'` בזמן הבנייה ושומר את התוצאה במטמון. זה ימנע חיפושי סביבה חוזרים בכל שיחת יומן.

**סגנון דפדפן**: בעת הפעלה בדפדפן (`typeof window !== 'undefined'`) במצב פיתוח, הודעות יומן מעוצבות באמצעות הוראות CSS `%c`:

|רמה|צבע|
|-------|-------|
|ניפוי באגים|`#6366f1` (אינדיגו)|
|מידע|`#3b82f6` (כחול)|
|הזהר|`#f59e0b` (ענבר)|
|שגיאה|`#ef4444` (אדום)|

**פלט Node.js**: בסביבות או בייצור של Node.js, הודעות מעוצבות כמחרוזות רגילות עם נתונים מסודרים של JSON (מודפסים יפה עם הזחה של 2 רווחים).

**חילוץ שגיאות**: השיטה `error()` מזהה מופעים של `Error` ומחלצת `errorMessage`, `stack`, ו-`name` לאובייקט נתונים מובנה לניפוי באגים קל יותר.

## תצורה

לוגר אין צורך בהגדרה. התנהגותו נקבעת לחלוטין על ידי `NODE_ENV`:

|`NODE_ENV`|ניפוי באגים|מידע|הזהר|שגיאה|
|------------|-------|------|------|-------|
|`development`|כן|כן|כן|כן|
|`production`|לא|לא|כן|כן|
|`test`|לא|לא|כן|כן|

## דוגמאות לשימוש

```typescript
import { logger, Logger } from '@/lib/logger';

// General logging
logger.info('Server started on port 3000');
logger.warn('Deprecated API endpoint called', { endpoint: '/api/v1/items' });
logger.error('Failed to fetch data', new Error('Network timeout'));

// Context-scoped logging
const dbLogger = Logger.create('Database');
dbLogger.info('Connection established', { host: 'localhost', port: 5432 });
dbLogger.error('Query failed', new Error('Connection refused'));

// API request logging
const apiLogger = Logger.create('API');
apiLogger.api('GET', '/api/items', { page: 1, limit: 20 });
apiLogger.api('POST', '/api/items', { title: 'New Item' });

// Performance tracking
const perfLogger = Logger.create('Performance');
const start = performance.now();
// ... expensive operation ...
const duration = performance.now() - start;
perfLogger.performance('fetchItems', duration);
// Output: [10:30:45] DEBUG [Performance] Performance: fetchItems { duration: "42ms" }
```

## שיטות עבודה מומלצות

- צור יומנים בהיקף של הקשר עבור כל מודול או אזור תכונה באמצעות `Logger.create('ModuleName')` כדי להקל על סינון יומנים.
- השתמש ב-`debug()` למעקב מפורט שלעולם לא אמור להופיע בהפקה; השתמש ב-`info()` לאירועים בולטים.
- העבר תמיד `Error` אובייקטים (לא מחרוזות) לשיטת `error()` כך שעקבות מחסנית ייתפסו אוטומטית.
- השתמש בשיטת `api()` עבור רישום בקשות HTTP כדי לשמור על מבנה יומן עקבי בכל קריאות API.
- אל תסתמך על לוגר לניטור בייצור; להשתלב עם פלטפורמת תצפית מתאימה (PostHog, Sentry) למעקב אחר שגיאות ייצור.

## מודולים קשורים

- [שכבת לקוח API](/template/architecture/api-client-layer) -- משתמש ביומן לרישום בקשות/תגובות
- [מערכת Config Manager](./config-manager-system) -- ConfigService רושם תוצאות אימות בעת ההפעלה
