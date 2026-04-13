---
id: version-sync-endpoints
title: "התייחסות לגרסה וסנכרון API"
sidebar_label: "גרסה וסנכרון"
sidebar_position: 58
---

# התייחסות לגרסה וסנכרון API

## סקירה כללית

נקודות הקצה של הגרסה והסנכרון מספקות גישה למידע על גרסת התוכן ולבקרות הסנכרון של המאגר של האפליקציה. נקודת הקצה של הגרסה קוראת מטא נתונים של Git ממאגר התוכן, בעוד שנקודות הקצה של הסינכרון מאפשרות הפעלה וניטור של פעולות סנכרון של מאגר רקע.

## נקודות קצה

### קבל /api/גרסה

מאחזר מידע גרסה מקיף ממאגר התוכן של Git, כולל פרטי ההתחייבות העדכניים ביותר, מחבר, ענף וחותמת זמן של סנכרון. מנסה אוטומטית לסנכרן את המאגר אם ספריית Git לא נמצאת (שימושי להתחלות קרות ב-Vercel).

**בקשה**

אין צורך בפרמטרים.

**תגובה**
```typescript
{
  commit: string;       // Short commit hash (7 characters), e.g. "a1b2c3d"
  date: string;         // Commit date in ISO 8601 format
  message: string;      // Commit message
  author: string;       // Commit author name
  repository: string;   // DATA_REPOSITORY URL or "unknown"
  lastSync: string;     // Current timestamp (ISO 8601) indicating when this info was fetched
  branch?: string;      // Current Git branch (defaults to "main")
}
```

**כותרות תגובה**
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `ETag: "<commit-hash>-<timestamp>"`
- `Last-Modified: <commit-date>`

**דוגמה**
```typescript
const response = await fetch('/api/version');
const version = await response.json();
// { commit: "a1b2c3d", date: "2024-01-15T10:30:00.000Z", message: "Update content", author: "John", ... }
```

### POST /api/version/sync

מפעיל סנכרון רקע ידני של מאגר התוכן של Git. מונע פעולות סנכרון במקביל -- אם סנכרון כבר מתבצע, הוא חוזר מיד עם הודעת סטטוס.

**בקשה**
```typescript
{
  options?: object;   // Reserved for future use (optional)
}
```

גוף הבקשה הוא אופציונלי לחלוטין.

**תגובה**
```typescript
// Successful sync
{
  success: true;
  timestamp: string;    // ISO 8601 completion timestamp
  duration: number;     // Operation duration in milliseconds
  message: string;      // e.g. "Repository synchronized successfully"
  details?: string;     // e.g. "Updated 5 files, 3 commits ahead"
}

// Sync already in progress
{
  success: true;
  timestamp: string;
  duration: number;
  message: "Sync was already in progress";
  details: "Another sync operation is currently running";
}

// Sync failed (status 500)
{
  success: false;
  error: string;        // e.g. "Manual sync request failed"
  timestamp: string;
  duration: number;
  details?: string;     // e.g. "Git fetch failed: network timeout"
}
```

**דוגמה**
```typescript
const response = await fetch('/api/version/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const result = await response.json();
console.log(`Sync completed in ${result.duration}ms: ${result.message}`);
```

### קבל /api/version/sync

מחזירה את סטטוס הסנכרון הנוכחי כולל אם פועל סנכרון, מתי הסנכרון האחרון התרחש וזמן פעילות השרת.

**בקשה**

אין צורך בפרמטרים.

**תגובה**
```typescript
{
  syncInProgress: boolean;              // Whether a sync operation is currently running
  lastSyncTime: string | null;          // ISO 8601 timestamp of last successful sync
  timeSinceLastSync: number | null;     // Milliseconds since last sync
  timeSinceLastSyncHuman: string;       // Human-readable, e.g. "300s ago" or "never"
  uptime: number;                       // Server uptime in seconds
  timestamp: string;                    // Current server timestamp (ISO 8601)
}
```

**דוגמה**
```typescript
const response = await fetch('/api/version/sync');
const status = await response.json();

if (status.syncInProgress) {
  console.log('Sync is currently running...');
} else {
  console.log(`Last synced: ${status.timeSinceLastSyncHuman}`);
}
```

## אימות

כל נקודות הקצה של הגרסה והסנכרון הן **ציבוריות** -- אין צורך באימות. נקודות קצה אלו מיועדות לניטור לוחות מחוונים וכלים אדמיניסטרטיביים.

## תגובות שגיאה

### קבל /api/גרסה

|סטטוס|קוד|תיאור|
|--------|------|-------------|
| 404 |`REPOSITORY_NOT_FOUND`|מאגר התוכן ספריית Git לא נמצאה|
| 404 |`NO_COMMITS`|מאגר קיים אך אינו מכיל התחייבויות|
| 500 |`GIT_ERROR`|נכשל קריאת יומן Git או מידע על התחייבות|
| 500 |`VALIDATION_ERROR`|חסרים שדות חובה בנתוני התחייבות|
| 500 |`INTERNAL_ERROR`|שגיאת זמן ריצה לא צפויה|

תגובות השגיאה כוללות גוף מובנה עם `error`, `code`, `timestamp` ושדות `details` אופציונליים.

### POST /api/version/sync

|סטטוס|תיאור|
|--------|-------------|
| 200 |הסנכרון הושלם בהצלחה או שכבר היה בתהליך|
| 500 |פעולת הסנכרון נכשלה (כוללת משך ופרטי שגיאה)|

## הגבלת תעריפים

- **קבל /api/גרסה**: מאוחסן במטמון למשך דקה אחת בצד הלקוח עם 5 דקות stale-while-revalidate. כולל כותרות ETag ו-Last-Modified עבור בקשות מותנות.
- **קבל /api/version/sync** ו-**POST /api/version/sync**: ללא שמירה במטמון (`Cache-Control: no-cache, no-store, must-revalidate`). מניעת סנכרון במקביל מבטיחה שרק סנכרון אחד פועל בכל פעם.

## נקודות קצה קשורות

- [נקודות קצה בריאות](./health-endpoints) -- בדיקת תקינות קישוריות מסד נתונים
- [Config Feature Endpoints](./config-feature-endpoints) -- דגלי זמינות תכונות
