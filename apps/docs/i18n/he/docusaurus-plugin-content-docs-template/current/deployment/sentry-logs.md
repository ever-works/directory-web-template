---
id: sentry-logs
title: הגדרת לוגים של Sentry
sidebar_label: לוגים של Sentry
sidebar_position: 7
---

# הגדרת לוגים של Sentry

מסמך זה מסביר כיצד להגדיר ולהשתמש בלוגים של Sentry במאגר Template ובמאגר Ever Works.

## סקירה כללית

לוגים של Sentry מספקים ניהול לוגים מרוכז, המאפשר לך לתפוס, להעביר ולנתח לוגי אפליקציה ב-Logs Explorer של Sentry. בעת הפעלה, כל הלוגים מועברים אוטומטית ל-Sentry, ומספקים תצוגה מאוחדת של התנהגות האפליקציה בסביבות שונות.

## תכונות

- ✅ העברת לוגים אוטומטית ל-Sentry
- ✅ תמיכה בכל רמות הלוגינג (debug, info, warn, error)
- ✅ לוגינג הקשרי עם תיוג אוטומטי
- ✅ תצורה ספציפית לסביבה
- ✅ לוגינג מובנה עם תמיכת מטא-נתונים
- ✅ אינטגרציה עם כלי logger קיים

## תצורה

### משתני סביבה

הוסף משתנים אלו לקובץ `.env.local` לפיתוח מקומי:

```env
# תצורת Sentry (נדרש ללוגים)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# הפעלת Sentry בפיתוח (אופציונלי, ברירת מחדל רק בייצור)
SENTRY_ENABLE_DEV=true

# מצב debug של Sentry (אופציונלי)
SENTRY_DEBUG=false

# תצורת לוגים של Sentry
SENTRY_LOGS_ENABLED=true  # הפעלה/כיבוי לוגים של Sentry (ברירת מחדל: true)
SENTRY_LOGS_LEVEL=info    # רמת לוגינג מינימלית לתפיסה (ברירת מחדל: info)
```

### תצורה ספציפית לסביבה

#### פיתוח מקומי

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=debug  # תפיסת כל הלוגים בפיתוח
```

#### פיתוח/Staging

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=info  # תפיסת לוגים של info, warn ו-error
```

#### ייצור

```env
SENTRY_ENABLE_DEV=false  # לא נדרש בייצור
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=warn  # תפיסת אזהרות ושגיאות בלבד בייצור
```

## שימוש

### לוגינג בסיסי

כלי ה-logger מעביר לוגים ל-Sentry אוטומטית בעת הפעלה:

```typescript
import { logger } from '@/lib/logger';

// לוג info
logger.info('User logged in', { userId: '12345' });

// לוג אזהרה
logger.warn('Rate limit approaching', { current: 90, limit: 100 });

// לוג שגיאה
logger.error('Payment failed', { orderId: '67890', error: errorObject });

// לוג debug (בפיתוח בלבד)
logger.debug('API request', { method: 'GET', url: '/api/users' });
```

### לוגינג הקשרי

צור logger עם הקשר ספציפי לארגון טוב יותר:

```typescript
import { Logger } from '@/lib/logger';

const paymentLogger = Logger.create('PaymentService');

paymentLogger.info('Processing payment', { amount: 100, currency: 'USD' });
paymentLogger.error('Payment failed', error);
```

### רמות לוגינג

ה-logger תומך בארבע רמות לוגינג, ממופות אוטומטית לרמות חומרה של Sentry:

| רמת Logger | רמת Sentry | תיאור |
|-------------|-------------|-------|
| `DEBUG` | `debug` | מידע מפורט לדיבוג (פיתוח בלבד) |
| `INFO` | `info` | הודעות מידע כלליות |
| `WARN` | `warning` | הודעות אזהרה על בעיות פוטנציאליות |
| `ERROR` | `error` | הודעות שגיאה על כשלים |

## כיצד זה עובד

### אתחול

לוגים של Sentry מופעלים הן ב-instrumentation של הלקוח והן ב-instrumentation של השרת:

1. **צד שרת** (`instrumentation.ts`): מאתחל Sentry לסביבת הרצת Node.js
2. **צד לקוח** (`instrumentation-client.ts`): מאתחל Sentry לסביבת הרצת הדפדפן

שתי התצורות כוללות:
```typescript
_experiments: {
  enableLogs: SENTRY_LOGS_ENABLED,
}
```

### העברת לוגים

כלי ה-logger (`lib/logger.ts`) אוטומטית:
1. בודק אם לוגים של Sentry מופעלים
2. מעצב ערכי לוג עם הקשר ומטא-נתונים
3. מעביר לוגים ל-Sentry באמצעות `Sentry.captureMessage()` עם תגיות ורמות מתאימות
4. עובר בחן למצב fallback אם Sentry אינו זמין

### מבנה לוג

כל ערך לוג שנשלח ל-Sentry כולל:
- **הודעה**: הודעת הלוג עם קידומת הקשר אופציונלית
- **רמה**: רמת חומרה (debug, info, warning, error)
- **תגיות**:
  - `logLevel`: רמת הלוג המקורית
  - `logType`: תמיד `application_log`
  - `context`: מזהה הקשר אופציונלי
- **נתונים נוספים**:
  - `data`: כל נתונים נוספים שסופקו
  - `timestamp`: חותמת זמן ISO

## צפייה בלוגים ב-Sentry

### Logs Explorer

1. נווט לפרויקט Sentry שלך
2. עבור ל-**Logs** ← **Logs Explorer**
3. השתמש בפילטרים למציאת לוגים ספציפיים:
   - סינון לפי תגית `logLevel` (debug, info, warn, error)
   - סינון לפי תגית `context` לצפייה בלוגים ממודולים ספציפיים
   - סינון לפי `logType:application_log` לצפייה בלוגי אפליקציה בלבד

### שאילתות לוגים

שאילתות לדוגמה ב-Logs Explorer של Sentry:

```
# כל לוגי השגיאות
logLevel:error

# לוגים מהקשר ספציפי
context:PaymentService

# כל לוגי האפליקציה
logType:application_log

# שגיאות מטווח זמן ספציפי
logLevel:error timestamp:>2024-01-01
```

## אינטגרציה עם חבילת ניטור

אם אתה משתמש בחבילת `@ever-works/monitoring`, ודא שהיא מוגדרת לעבוד עם לוגים של Sentry:

1. חבילת הניטור צריכה לאתחל Sentry עם לוגים מופעלים
2. כלי ה-logger בתבנית זו יעביר לוגים ל-Sentry אוטומטית
3. שני המערכות עובדות יחד לספק ניטור מקיף

## פתרון בעיות

### לוגים אינם מופיעים ב-Sentry

1. **בדיקת תצורת DSN**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   ודא שה-DSN מוגדר כראוי ונגיש.

2. **אימות שלוגים מופעלים**
   ```bash
   echo $SENTRY_LOGS_ENABLED
   ```
   חייב להיות `true` להעברת לוגים.

3. **בדיקת אתחול Sentry**
   - אמת שה-`SENTRY_ENABLED` הוא true
   - בדוק את קונסול הדפדפן לשגיאות אתחול Sentry
   - ודא שה-`_experiments.enableLogs` מוגדר ל-`true`

4. **אימות סינון רמת לוגינג**
   - ודא שרמת הלוגינג שלך עומדת בסף ה-`SENTRY_LOGS_LEVEL`
   - לוגי Debug נתפסים רק אם הרמה מוגדרת ל-`debug`

### שיקולי ביצועים

- לוגים נשלחים באופן א-סינכרוני ולא יחסמו את האפליקציה
- בייצור, שקול הגדרת `SENTRY_LOGS_LEVEL=warn` להפחתת נפח הלוגים
- Sentry מטפל אוטומטית בהגבלת קצב ואיגוד

### כיבוי לוגים

לכיבוי לוגים של Sentry ללא כיבוי Sentry לחלוטין:

```env
SENTRY_LOGS_ENABLED=false
```

ה-logger ימשיך לעבוד כרגיל, אך לוגים לא יועברו ל-Sentry.

## שיטות עבודה מומלצות

1. **שימוש ברמות לוגינג מתאימות**
   - השתמש ב-`debug` עבור מידע מפורט בפיתוח
   - השתמש ב-`info` עבור זרימה כללית של אפליקציה
   - השתמש ב-`warn` עבור בעיות פוטנציאליות שאינן פוגעות בפונקציונליות
   - השתמש ב-`error` עבור שגיאות וחריגות ממשיות

2. **כלול הקשר**
   - השתמש ב-loggers הקשריים לארגון טוב יותר
   - כלול מטא-נתונים רלוונטיים בנתוני לוג

3. **הימנע מנתונים רגישים**
   - לעולם אל תרשום סיסמאות, אסימונים או נתונים אישיים
   - נקה נתונים לפני לוגינג

4. **תצורת ייצור**
   - הגדר `SENTRY_LOGS_LEVEL=warn` בייצור
   - עקוב אחרי שימוש בכמסה של Sentry
   - סקור לוגים בקביעות לאיתור דפוסים

## רשימת בדיקה לאימות

- [ ] DSN של Sentry מוגדר כראוי
- [ ] `SENTRY_LOGS_ENABLED=true` הוגדר
- [ ] לוגים מופיעים ב-Logs Explorer של Sentry
- [ ] רמות לוגים ממופות כראוי (info, warn, error, debug)
- [ ] תגיות הקשר גלויות ב-Sentry
- [ ] לוגים עובדים גם מקומית וגם בסביבות פריסה
- [ ] QA יכול לראות ולסנן לוגים ב-Logs Explorer של Sentry

## משאבים נוספים

- [תיעוד לוגים של Sentry](https://docs.sentry.io/product/logs/)
- [אינטגרציית Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [מדריך Logs Explorer של Sentry](https://docs.sentry.io/product/logs/explorer/)
