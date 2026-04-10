---
id: security-config
title: "הגדרת אבטחה"
sidebar_label: "הגדרת אבטחה"
sidebar_position: 5
---

# הגדרת אבטחה

התבנית מיישמת אסטרטגיית אבטחה רב-שכבתית עם בקרת גישה מבוססת הרשאות, אימות קלט, תגובות שגיאה בטוחות וניקוי כתובות URL. מדריך זה מתעד כל שכבת אבטחה וכיצד להגדיר אותה.

## מערכת הרשאות

התבנית משתמשת במודל הרשאות גרגירארי של משאב-פעולה המוגדר ב-`lib/permissions/definitions.ts` ומאכף דרך `lib/middleware/permission-check.ts`.

### פורמט הרשאות

הרשאות עוקבות אחר הפורמט `resource:action`:

```
items:read
items:create
items:update
items:delete
items:review
items:approve
items:reject
categories:read
categories:create
users:assignRoles
analytics:read
system:settings
```

### פונקציות בדיקת הרשאות

ה-middleware לבדיקת הרשאות ב-`lib/middleware/permission-check.ts` מספק קבוצה מקיפה של פונקציות עזר לאישור:

```ts
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasResourcePermission,
  canManageResource,
  canReviewItems,
  canManageUsers,
  canManageRoles,
  canViewAnalytics,
  isSuperAdmin
} from '@/lib/middleware/permission-check';

// Check a single permission
hasPermission(userPermissions, 'items:create');

// Check if user has ANY of the given permissions
hasAnyPermission(userPermissions, ['items:review', 'items:approve']);

// Check if user has ALL of the given permissions
hasAllPermissions(userPermissions, ['items:read', 'items:update']);

// Check a resource:action pair (with validation)
hasResourcePermission(userPermissions, 'items', 'delete');

// Get all permissions for a resource
const itemPerms = getResourcePermissions(userPermissions, 'items');
// e.g., ['items:read', 'items:create', 'items:update']

// Check if user can manage (create/update/delete) a resource
canManageResource(userPermissions, 'categories');
```

### ממשק UserPermissions

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### בדיקות ספציפיות לתפקיד

```ts
// Check if user can review items (review, approve, or reject)
canReviewItems(userPermissions);

// Check if user can manage users
canManageUsers(userPermissions);

// Check if user can manage roles
canManageRoles(userPermissions);

// Check if user can view analytics
canViewAnalytics(userPermissions);
```

### זיהוי מנהל-על

הפונקציה `isSuperAdmin` בודקת שני תנאים:

1. למשתמש יש את התפקיד `'super-admin'` (עדיף), או
2. המשתמש מחזיק בכל הרשאות המערכת (מנגנון גיבוי)

```ts
export function isSuperAdmin(userPermissions: UserPermissions): boolean {
  if (userPermissions.roles.includes('super-admin')) {
    return true;
  }
  // Fallback: check if user has ALL system permissions
  const allPermissions: Permission[] = [
    'items:read', 'items:create', 'items:update', 'items:delete',
    'items:review', 'items:approve', 'items:reject',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'tags:read', 'tags:create', 'tags:update', 'tags:delete',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:assignRoles',
    'analytics:read', 'analytics:export',
    'system:settings'
  ];
  return hasAllPermissions(userPermissions, allPermissions);
}
```

### אימות הרשאות

```ts
// Validate a permission string is recognized
validatePermission('items:read'); // true
validatePermission('invalid:perm'); // false

// Parse a permission into resource and action
parsePermission('items:create');
// Returns: { resource: 'items', action: 'create' }

// Get a summary grouped by resource
getPermissionSummary(userPermissions);
// Returns: { items: ['read', 'create'], categories: ['read'], ... }
```

## הגנה על מסלולי API

מסלולי API משתמשים באימות מבוסס סשן עם בדיקות תפקיד מנהל:

```ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  // Proceed with authorized logic...
}
```

## אימות קלט

התבנית משתמשת בסכמות Zod לאורך כל האפליקציה לאימות קלט:

```ts
import { z } from 'zod';

const createNotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  userId: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

// In API route
const body = await request.json();
const parsed = createNotificationSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
}
```

## ניקוי URL

מודול העורך כולל ניקוי כתובות URL ב-`lib/editor/utils/utils.ts`:

```ts
export function isAllowedUri(uri: string | undefined, protocols?: ProtocolConfig): boolean {
  const allowedProtocols = [
    "http", "https", "ftp", "ftps", "mailto", "tel",
    "callto", "sms", "cid", "xmpp"
  ];
  // Validates URI against whitelist and strips ATTR_WHITESPACE
  // ...
}

export function sanitizeUrl(inputUrl: string, baseUrl: string, protocols?: ProtocolConfig): string {
  try {
    const url = new URL(inputUrl, baseUrl);
    if (isAllowedUri(url.href, protocols)) return url.href;
  } catch { /* invalid URL */ }
  return "#";
}
```

זה מונע הטמעת `javascript:` וכתובות URL בעלות פרוטוקולים מסוכנים אחרים בתוכן העורך.

## הגנה מפני זיהום אב-טיפוס

`ConfigManager` מגן מפני זיהום אב-טיפוס בעת עדכון מפתחות תצורה מקוננים:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

async updateNestedKey(keyPath: string, value: any): Promise<boolean> {
  const keys = keyPath.split('.');
  for (const key of keys) {
    if (this.isPrototypePollutingKey(key)) {
      return false; // Silently reject
    }
  }
  // ...
}
```

## אבטחת קוקיז

תצורת הקוקיז מאומתת דרך סכמת Zod:

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

לסביבת ייצור, הגדר:

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## כותרות אבטחה של Next.js

קובץ `next.config.ts` מגדיר כותרות אבטחה. כותרות נפוצות להגדרה:

| כותרת | מטרה |
|-------|------|
| `X-Frame-Options` | מניעת clickjacking |
| `X-Content-Type-Options` | מניעת MIME type sniffing |
| `Referrer-Policy` | שליטה במידע referrer |
| `X-XSS-Protection` | הפעלת סינון XSS בדפדפן |
| `Strict-Transport-Security` | אכיפת HTTPS |
| `Permissions-Policy` | הגבלת תכונות הדפדפן |

## אבטחת משתני סביבה

מערכת התצורה מבטיחה שמשתנים רגישים נמצאים בצד השרת בלבד:

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

משתנים עם הקידומת `NEXT_PUBLIC_` חשופים ללקוח. כל השאר (מפתחות סודיים, כתובות URL של מסדי נתונים, אסימוני API) נשארים בצד השרת בלבד:

- `STRIPE_SECRET_KEY` -- בצד השרת בלבד
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- בטוח ללקוח
- `DATABASE_URL` -- בצד השרת בלבד
- `AUTH_SECRET` -- בצד השרת בלבד

## שיטות עבודה מומלצות

1. **תמיד לאמת קלט** עם סכמות Zod לפני עיבוד
2. **לבדוק אימות** בראש כל handler של נתיב API
3. **להשתמש בבדיקות הרשאות** לבקרת גישה מבוססת תפקידים
4. **לנקות כתובות URL** לפני הטמעתן בתוכן
5. **לשמור סודות בצד השרת בלבד** תוך שימוש בהגנת הייבוא `server-only`
6. **להגדיר `COOKIE_SECURE=true`** בסביבת ייצור
7. **להשתמש בסודות חזקים** עבור `AUTH_SECRET` ו-`COOKIE_SECRET` (לפחות 32 בייטים base64)
8. **לסקור את מודל ההרשאות** בעת הוספת משאבים או פעולות חדשות

## קבצים קשורים

| נתיב | תיאור |
|------|--------|
| `lib/middleware/permission-check.ts` | פונקציות אכיפת הרשאות |
| `lib/permissions/definitions.ts` | הגדרות הרשאות ותפקידים |
| `lib/config/config-service.ts` | Singleton תצורה בצד השרת בלבד |
| `lib/config/schemas/auth.schema.ts` | סכמות תצורת אימות/Cookie |
| `lib/editor/utils/utils.ts` | כלי עזר לניקוי URL |
| `lib/config-manager.ts` | מנהל YAML תצורה עם הגנה מפני זיהום אב-טיפוס |
| `auth.config.ts` | תצורת NextAuth |
| `next.config.ts` | כותרות אבטחה ו-CSP |
