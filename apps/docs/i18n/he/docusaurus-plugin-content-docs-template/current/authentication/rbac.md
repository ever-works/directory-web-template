---
id: rbac
title: בקרת גישה מבוססת תפקידים
sidebar_label: RBAC
sidebar_position: 4
---

# בקרת גישה מבוססת תפקידים

## סקירה כללית

התבנית מיישמת RBAC עם תפקידים המאוחסנים בבסיס הנתונים.

## תפקידים ברירת מחדל

| תפקיד | תיאור |
|-------|-------|
| admin | גישה מלאה למערכת |
| moderator | גישה לניהול תוכן |
| user | גישה מאומתת רגילה |
| guest | גישה ציבורית מוגבלת |

## הקצאת תפקידים

תפקידים מוקצים בבסיס הנתונים. מנהלי מערכת יכולים לנהל תפקידים דרך לוח הניהול בכתובת `/admin/users`.

## בדיקת הרשאות

```typescript
// במסלולי API
const session = await auth();
if (!session?.user?.role || session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## הגנה על מסלולים

השתמש ב-middleware להגנה על מסלולים לפי תפקידים. ה-auth middleware בודק את ההפעלה והתפקיד לפני מתן גישה.
