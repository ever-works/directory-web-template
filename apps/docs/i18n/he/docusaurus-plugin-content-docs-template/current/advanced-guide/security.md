---
id: security
title: הקשחת אבטחה
sidebar_label: בִּטָחוֹן
sidebar_position: 6
---

# הקשחת אבטחה

תבנית Ever Works כוללת שכבות מרובות של אבטחה כברירת מחדל. מדריך זה מתעד את ההגנות המובנות ומספק המלצות להקשיחה נוספת של פריסת הייצור שלך.

## כותרות אבטחה

התבנית מגדירה כותרות אבטחה באופן גלובלי ב- `next.config.ts` עבור כל המסלולים:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: "..." },
      ],
    },
  ];
},
```

### פירוט כותרות

| כותרת | ערך | מטרה |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | מונע התקפות הרחה מסוג MIME |
| `X-Frame-Options` | `DENY` | חוסם את ההטמעה של האתר ב-iframes (הגנת קליקים) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | מגביל מידע מפנה שנשלח למקורות חיצוניים |
| `X-DNS-Prefetch-Control` | `on` | מאפשר אחזור DNS מראש לביצועים |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | אוכף HTTPS למשך ~2 שנים, מכסה את כל תת-הדומיינים, כשיר לרשימת טעינה מוקדמת של HSTS |
| `Content-Security-Policy` | ראה למטה | מגביל מקורות טעינת משאבים |

### מדיניות אבטחת תוכן

ה-CSP מוגדר כ:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

| הוראה | ערך | הערות |
|---|---|---|
| `default-src` | `'self'` | אפשר רק משאבים מאותו מקור כברירת מחדל |
| `script-src` | `'self' 'unsafe-inline'` + LemonSqueezy | נדרש עבור סקריפטים מוטבעים וווידג'ט תשלום |
| `style-src` | `'self' 'unsafe-inline'` | נדרש עבור CSS-in-JS ו-Tailwind |
| `img-src` | `'self' data: https:` | מאפשר תמונות מאותו מקור, מזהי URI של נתונים וכל מקור HTTPS |
| `font-src` | `'self'` | רק גופנים באירוח עצמי |
| `connect-src` | `'self' https:` | קריאות API לאותו מקור ולכל נקודת קצה HTTPS |
| `frame-ancestors` | `'none'` | מונע הטמעה בכל iframe (שווה ערך ל- `X-Frame-Options: DENY` ) |

### SVG Image Security

תמונות SVG מקבלות ארגז חול נוסף:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

קובצי SVG מוגשים כקבצים מצורפים עם סקריפטים מושבתים לחלוטין ובארגז חול, ומונעים התקפות XSS מבוססות SVG.

### התקשות נוספת

ה- `poweredByHeader` מושבת:

```typescript
poweredByHeader: false,
```

פעולה זו מסירה את הכותרת `X-Powered-By: Next.js` , ומונעת טביעת אצבע של הטכנולוגיה.

## אבטחת אימות

### שילוב NextAuth.js

התבנית משתמשת ב-NextAuth.js (Auth.js) לאימות. תכונות האבטחה העיקריות כוללות:

- **מפגשי JWT או מסד נתונים** עם אסטרטגיית הפעלה ניתנת להגדרה
- **הגנה על CSRF** בכל הגשת הטפסים
- **תצורת קובצי Cookie מאובטחת** עם דגלים `httpOnly` , `secure` ו- `sameSite` - **אימות קלט** עם סכימות Zod בכל פעולות הטופס

### פעולות מאומתות

פעולות השרת מוגנות באמצעות עטיפות פעולות מאומתות המוגדרות ב- `lib/auth/middleware.ts` :

```typescript
// Validate input with Zod before processing
export function validatedAction<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData);
  };
}

// Validate input AND require authentication
export function validatedActionWithUser<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("User is not authenticated");
    }
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData, session.user);
  };
}
```

**השתמש תמיד ב- `validatedActionWithUser` ** לפעולות מאומתות. זה מבטיח שגם אימות קלט וגם אימות הפעלה מתרחשים לפני ביצוע היגיון עסקי כלשהו.

## אכיפת RBAC

התבנית כוללת מערכת בקרת גישה מלאה מבוססת תפקידים ב- `lib/middleware/permission-check.ts` .

### פורמט הרשאה

ההרשאות פועלות לפי דפוס `resource:action` :

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### פונקציות בדיקת הרשאות

| פונקציה | מטרה | דוגמה |
|---|---|---|
| `hasPermission` | בדוק הרשאה יחידה | `hasPermission(user, 'items:create')` |
| `hasAnyPermission` | בדוק אם למשתמש יש לפחות | `hasAnyPermission(user, ['items:review', 'items:approve'])` |
| `hasAllPermissions` | בדוק אם המשתמש רשם את כל | `hasAllPermissions(user, ['users:read', 'users:update'])` |
| `hasResourcePermission` | בדוק לפי משאב + מחרוזות פעולה | `hasResourcePermission(user, 'items', 'delete')` |
| `canManageResource` | סמן צור/עדכן/מחק | `canManageResource(user, 'categories')` |
| `canReviewItems` | בדוק הרשאות סקירת פריט | `canReviewItems(user)` |
| `canManageUsers` | בדוק הרשאות ניהול משתמשים | `canManageUsers(user)` |
| `canManageRoles` | בדוק הרשאות ניהול תפקידים | `canManageRoles(user)` |
| `canViewAnalytics` | בדוק גישה לניתוח | `canViewAnalytics(user)` |
| `isSuperAdmin` | בדוק אם יש תפקיד מנהל-על או את כל ההרשאות | `isSuperAdmin(user)` |

### שימוש בהרשאות בנתיבי API

```typescript
import { hasPermission, UserPermissions } from '@/lib/middleware/permission-check';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPerms: UserPermissions = {
    userId: session.user.id,
    roles: session.user.roles,
    permissions: session.user.permissions,
  };

  if (!hasPermission(userPerms, 'items:create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with authorized logic
}
```

### זיהוי סופר אדמין

הפונקציה `isSuperAdmin` משתמשת בגישה כפולה לאבטחה מירבית:

1. **בדיקת תפקידים**: בודק אם למשתמש יש את התפקיד `super-admin` 2. **הרשאה חוזרת**: מאמת שלמשתמש יש כל הרשאות מערכת מוגדרות

זה מבטיח ששום ערכת הרשאות חלקית לא יכולה להעניק בטעות גישת סופר-אדמין.

## הגבלת תעריפים

### הגנת נתיב API

הטמעת הגבלת שיעור עבור מסלולי API הפונה לציבור כדי למנוע שימוש לרעה:

```typescript
// Example using a simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}
```

עבור פריסות ייצור, שקול להשתמש ב:
- **Vercel Edge Middleware** עם הגבלת קצב `@vercel/edge` - **Upstash Redis** להגבלת תעריפים מבוזרת על פני מופעים ללא שרת
- **הגבלת קצב Cloudflare** בשכבת CDN

### Cron Endpoint Protection

נקודות קצה של Cron API צריכות לאמת סוד משותף כדי למנוע הפניה לא מורשית:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

ה- `CRON_SECRET` מוגדר באמצעות משתני סביבה ומוגדר במהלך הפריסה (ראה זרימת העבודה של פריסת Vercel של צינור ה-CI/CD).

## אימות קלט

### אימות סכמת Zod

יש לאמת את כל קלט הטפסים ומטעני ה-API באמצעות סכימות Zod:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### מניעת הזרקת SQL

התבנית משתמשת ב-Drizzle ORM עבור כל שאילתות מסד הנתונים, אשר מפרמטר את כל הערכים באופן אוטומטי. לעולם אל תבנה מחרוזות SQL גולמיות עם קלט משתמש.

### מניעת XSS

- רכיבי שרת מעבדים בשרת ואינם חושפים HTML גולמי ללקוח.
- יש לבצע אסקייפ לכל התוכן שנוצר על ידי המשתמש באמצעות ה-Escape המובנה של React (JSX בורחת אוטומטית למחרוזות).
- כותרת ה-CSP חוסמת סקריפטים מוטבעים ממקורות לא מהימנים.

## אבטחה משתנה סביבתי

### סודות נדרשים

| משתנה | מטרה | דור |
|---|---|---|
| `AUTH_SECRET` | חותם אסימוני JWT וקובצי Cookie של הפעלה | `openssl rand -base64 32` |
| `COOKIE_SECRET` | מצפין ערכי קובצי Cookie | `openssl rand -base64 32` |
| `CRON_SECRET` | מאמת בקשות נקודת קצה של cron | `openssl rand -base64 32` |
| `DATABASE_URL` | מחרוזת חיבור למסד נתונים | מסופק על ידי מארח מסד הנתונים |

### שיטות עבודה מומלצות

1. **לעולם אל תתחייב סודות** לבקרת גרסאות. השתמש ב- `.env.local` לפיתוח וסודות ברמת הפלטפורמה לייצור.
2. **סובב סודות באופן קבוע**, במיוחד `AUTH_SECRET` ו `COOKIE_SECRET` .
3. **השתמש בסודות נפרדים לכל סביבה** -- אל תשתף סודות ייצור עם בימוי או פיתוח.
4. **הגבלת גישה** למשתני סביבת ייצור באמצעות RBAC של הפלטפורמה שלך (תפקידי צוות Vercel, כללי הגנה על סביבת GitHub).

## רשימת אבטחה להפקה

| קטגוריה | פריט | סטטוס |
|---|---|---|
| **כותרות** | כל כותרות האבטחה שהוגדרו ב- `next.config.ts` | מובנה |
| **כותרות** | `poweredByHeader` מושבת | מובנה |
| **כותרות** | טעינה מוקדמת של HSTS מופעלת עם גיל מקסימלי לשנתיים | מובנה |
| **אישור** | `AUTH_SECRET` הוא ערך אקראי חזק | ידני |
| **אישור** | קובצי Cookie של הפעלה משתמשים ב- `httpOnly` , `secure` , `sameSite` | מובנה |
| **אישור** | כל פעולות השרת משתמשות ב- `validatedActionWithUser` | סקירה |
| **RBAC** | נבדקו הרשאות בכל נתיב מוגן | סקירה |
| **RBAC** | גישת סופר-אדמין דורשת הקצאת תפקיד מפורשת | מובנה |
| **קלט** | אימות Zod על כל קלט הטפסים ומטעני API | סקירה |
| **קלט** | ללא שאילתות SQL גולמיות (Drizzle ORM בלבד) | סקירה |
| **קרון** | נקודות קצה של Cron מאמתות `CRON_SECRET` | סקירה |
| **סודות** | כל הסודות מסובבים וספציפיים לסביבה | ידני |
| **CSP** | מדיניות אבטחת תוכן נבדקה עבור דומיינים של ייצור | ידני |
| **דפס** | ניתוח CodeQL פועל מדי שבוע על בסיס הקוד | מובנה |
| **דפס** | תלות שנבדקה ( `pnpm audit` ) | ידני |

## דיווח על בעיות אבטחה

אם אתה מגלה פגיעות אבטחה, דווח עליה באופן פרטי:

- **דוא"ל**: security@ever.co
- **אל** תפתח בעיית GitHub ציבורית עבור פרצות אבטחה.
- כלול שלבי רבייה והערכת השפעה במידת האפשר.
