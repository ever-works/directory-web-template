---
id: data-versioning
title: מערכת גרסאות נתונים
sidebar_label: גרסאות נתונים
sidebar_position: 6
---

# מערכת הצגת גרסת נתונים

Ever Works כולל מערכת גרסאות נתונים שמציגה למשתמשים את הגרסה הנוכחית של הנתונים שהם צופים בהם, ומספקת שקיפות לגבי רעננות התוכן.

## סקירה כללית

המערכת מספקת:
- 📊 **הצגת גרסה בזמן אמת** - מציגה את הגרסה הנוכחית של מאגר הנתונים
- 🔄 **רענון אוטומטי** - מעדכנת את מידע הגרסה מדי תקופה
- 🎨 **מגוון וריאנטים** - תצוגות תג, inline ומפורטת
- 💡 **פרטים בתיבת עזרה** - העבר עכבר לקבלת מידע מקיף
- ⚡ **תמיכה ב-ISR** - עובד עם יצירה סטטית מצטברת
- 🛡️ **טיפול בשגיאות** - נפילה חינה כאשר אינו זמין

## ארכיטקטורה

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Git Repository]
    Git --> Sync[Auto Sync]
    Sync --> Cache[Cache Layer]
    Cache --> Response[Version Info]
```

## רכיבים

### VersionDisplay

הרכיב הראשי להצגת מידע גרסה.

```tsx
import { VersionDisplay } from "@/components/version";

// תצוגת inline בסיסית
<VersionDisplay variant="inline" />

// וריאנט תג
<VersionDisplay variant="badge" />

// תצוגה מפורטת עם מידע נוסף
<VersionDisplay variant="detailed" showDetails={true} />
```

**מאפיינים**:
- `variant`: `"inline" | "badge" | "detailed"` - סגנון תצוגה
- `showDetails`: `boolean` - הצגת מידע מורחב (וריאנט מפורט בלבד)
- `className`: `string` - מחלקות CSS נוספות
- `refreshInterval`: `number` - מרווח רענון אוטומטי במילישניות (ברירת מחדל: 5 דקות)

### VersionTooltip

רכיב עטיפה שמוסיף תיבת עזרה עם מידע גרסה מפורט.

```tsx
import { VersionTooltip } from "@/components/version";

<VersionTooltip>
  <VersionDisplay variant="badge" />
</VersionTooltip>
```

**תכונות**:
- מציג גיבוב commit ותאריך
- מציג הודעת commit
- מציג מידע על המחבר
- קישורים למאגר

### הוק useVersionInfo

הוק מותאם אישית לניהול מידע גרסה עם מטמון ורענון אוטומטי.

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000, // 5 דקות
  retryOnError: true,
  retryDelay: 10000
});
```

**מחזיר**:
- `versionInfo`: אובייקט נתוני גרסה
- `loading`: מצב טעינה
- `error`: מצב שגיאה
- `refetch`: פונקציית רענון ידני

## נקודת קצה API

### GET /api/version

מחזיר מידע על הגרסה הנוכחית של מאגר הנתונים.

**תגובה**:
```json
{
  "commit": "abc1234",
  "date": "2024-01-01T12:00:00.000Z",
  "message": "Update data items",
  "author": "Developer Name",
  "repository": "https://github.com/owner/repo",
  "lastSync": "2024-01-01T12:05:00.000Z"
}
```

**תכונות**:
- סנכרון אוטומטי של המאגר לפני שליפה
- כותרות מטמון מתאימות לביצועים אופטימליים
- תמיכה ב-ETag למטמון יעיל
- טיפול בשגיאות עם קודי מצב HTTP מתאימים

**כותרות מטמון**:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: "abc1234"
```

## הגדרות

### משתני סביבה

```env
# כתובת URL של מאגר הנתונים
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# GitHub token למאגרים פרטיים (אופציונלי)
GH_TOKEN=ghp_your_github_token_here

# מרווח סנכרון מאגר (אופציונלי, ברירת מחדל: 5 דקות)
REPO_SYNC_INTERVAL=300000
```

### אסטרטגיית מטמון

#### מטמון צד לקוח
- **משך**: דקה אחת
- **אסטרטגיה**: stale-while-revalidate
- **רענון**: עדכונים אוטומטיים ברקע

#### מטמון צד שרת
- **משך**: 60 שניות
- **אסטרטגיה**: s-maxage עם אימות מחדש
- **ETag**: מבוסס על גיבוב commit

## דוגמאות שימוש

### תג גרסה בכותרת תחתונה

```tsx
// components/footer/Footer.tsx
import { VersionDisplay } from "@/components/version";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <p>© 2024 Ever Works</p>
        <VersionDisplay variant="badge" />
      </div>
    </footer>
  );
}
```

### לוח מחוונים של מנהל

```tsx
// app/admin/dashboard/page.tsx
import { VersionDisplay } from "@/components/version";

export default function AdminDashboard() {
  return (
    <div>
      <h1>לוח מחוונים של מנהל</h1>
      <VersionDisplay 
        variant="detailed" 
        showDetails={true}
        refreshInterval={60000} // דקה אחת
      />
    </div>
  );
}
```

### מימוש מותאם אישית

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

export function CustomVersionDisplay() {
  const { versionInfo, loading, error, refetch } = useVersionInfo();

  if (loading) return <div>טוען גרסה...</div>;
  if (error) return <div>גרסה אינה זמינה</div>;

  return (
    <div>
      <p>גרסת נתונים: {versionInfo.commit.substring(0, 7)}</p>
      <p>עודכן: {new Date(versionInfo.date).toLocaleDateString()}</p>
      <button onClick={refetch}>רענן</button>
    </div>
  );
}
```

## וריאנטים של תצוגה

### וריאנט Inline

תצוגת טקסט קומפקטית המתאימה לכותרות תחתונות או סרגלי צד.

```tsx
<VersionDisplay variant="inline" />
// פלט: "Data v.abc1234 • עודכן לפני שעתיים"
```

### וריאנט תג

תג בצורת גלולה עם איקון, מתאים לכותרות או ניווט.

```tsx
<VersionDisplay variant="badge" />
// פלט: [🔄 v.abc1234]
```

### וריאנט מפורט

תצוגה מקיפה עם כל מידע הגרסה.

```tsx
<VersionDisplay variant="detailed" showDetails={true} />
// פלט: כרטיס עם commit, תאריך, הודעה, מחבר, קישור למאגר
```

## שיטות עבודה מומלצות

### 1. מיקום
- **כותרת תחתונה**: השתמש בוריאנט inline או תג
- **לוחות ניהול**: השתמש בוריאנט המפורט
- **כותרות**: השתמש בוריאנט תג
- **תיבות עזרה**: עטוף כל וריאנט ב-VersionTooltip

### 2. מרווחי רענון
- **דפים ציבוריים**: 5-10 דקות
- **דפי ניהול**: 1-2 דקות
- **לוחות בזמן אמת**: 30 שניות

### 3. טיפול בשגיאות
- ספק תמיד ממשק משתמש חלופי
- תעד שגיאות לצורך ניטור
- הצג הודעות ידידותיות למשתמש

### 4. ביצועים
- השתמש במשכי מטמון מתאימים
- יישם stale-while-revalidate
- הימנע מקריאות API מופרזות

## פתרון בעיות

### גרסה לא מתעדכנת

**בעיה**: מידע הגרסה לא מתרענן

**פתרון**: בדוק מרווח הרענון והגדרות המטמון

```tsx
// אילוץ רענון מיידי
const { refetch } = useVersionInfo();
refetch();
```

### שגיאות API

**בעיה**: `/api/version` מחזיר שגיאות

**פתרון**: אמת משתני סביבה וגישה למאגר

```bash
# Check environment variables
echo $DATA_REPOSITORY
echo $GH_TOKEN

# Test repository access
git ls-remote $DATA_REPOSITORY
```

### טעינה איטית

**בעיה**: רכיב הגרסה נטען לאט

**פתרון**: אופטימייז את המטמון וצמצם את תדירות הרענון
