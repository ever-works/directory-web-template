---
id: health-endpoints
title: "עיון ב-Health API"
sidebar_label: "בריאות"
sidebar_position: 52
---

# עיון ב-Health API

## סקירה כללית

נקודת הקצה Health מספקת בדיקת קישוריות מסד נתונים פשוטה למטרות ניטור ותשתית. הוא מבצע שאילתה קלה כדי לוודא שחיבור מסד הנתונים פעיל ומגיב, ומחזיר מידע סטטוס עם חותמות זמן.

## נקודות קצה

### GET /api/health/database

מבצע בדיקת תקינות בסיסית של מסד הנתונים על ידי ביצוע שאילתת `SELECT 1` כדי לאמת את חיבור מסד הנתונים.

**בקשה**

אין צורך בפרמטרים או בגוף.

**תגובה**
```typescript
// Healthy response
{
  status: "healthy";
  database: "connected";
  timestamp: string;        // ISO 8601 format, e.g. "2024-01-15T10:30:00.000Z"
  result: object;           // Raw query result from SELECT 1
}

// Unhealthy response (status 500)
{
  status: "unhealthy";
  database: "disconnected";
  error: "Database connection check failed";
  timestamp: string;
}
```

**דוגמה**
```typescript
const response = await fetch('/api/health/database');
const health = await response.json();

if (health.status === 'healthy') {
  console.log('Database is connected at', health.timestamp);
} else {
  console.error('Database is disconnected:', health.error);
}
```

## אימות

נקודת קצה זו היא **ציבורי** -- אין צורך באימות. הוא מיועד לשימוש על ידי מאזני עומסים, צגי זמן פעולה ובדיקות תקינות של פריסה.

## תגובות שגיאה

|סטטוס|תיאור|
|--------|-------------|
| 200 |חיבור למסד נתונים בריא|
| 500 |חיבור מסד הנתונים נכשל -- מחזיר סטטוס `"unhealthy"` עם פרטי שגיאה|

## הגבלת תעריפים

לא חלה הגבלת תעריפים מפורשת. נקודת קצה זו היא קלת משקל ומתאימה לסקרים תכופים על ידי מערכות ניטור.

## נקודות קצה קשורות

- [Config Feature Endpoints](./config-feature-endpoints) -- דגלי זמינות תכונות (תלוי גם במסד נתונים)
- [Version Sync Endpoints](./version-sync-endpoints) -- גרסת מערכת וסטטוס סנכרון
