---
id: internal-endpoints
title: "נקודות קצה פנימיות ומערכתיות"
sidebar_label: "פנימי ומערכת"
sidebar_position: 17
---

# נקודות קצה פנימיות ומערכתיות

נקודות קצה אלו מספקות פעולות ברמת המערכת: אתחול מסד הנתונים, תצורת דגל תכונה, בדיקות תקינות, מידע על גרסה וסנכרון מאגר. רובם משמשים את הפלטפורמה עצמה ולא את משתמשי הקצה.

**קבצי מקור:**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## סיכום נקודות קצה

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|קבל|`/api/internal/db-init`|מפתחים בלבד|הפעל אתחול מסד הנתונים|
|קבל|`/api/config/features`|אין|קבל דגלים של זמינות תכונות|
|קבל|`/api/health/database`|אין|בדיקת תקינות מסד הנתונים|
|קבל|`/api/version`|אין|קבל מידע על גרסת האפליקציה|
|קבל|`/api/version/sync`|אין|קבל סטטוס סנכרון|
|פוסט|`/api/version/sync`|אין|הפעל סנכרון ידני של מאגר|

---

## GET `/api/internal/db-init`

Triggers automatic database migration and seeding if the database is not yet initialized.

### Security

This endpoint is **only available in development mode**. In production, it returns 403:

```ts
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json(
    { error: 'Not available in production' },
    { status: 403 }
  );
}
```

### Runtime Configuration

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Response: 200

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

### Response: 403 (Production)

```json
{
  "error": "Not available in production"
}
```

---

## קבל `/api/config/features`

מחזירה דגלי זמינות תכונות נוכחיות בהתבסס על תצורת המערכת (בעיקר זמינות מסד נתונים). זוהי **נקודת קצה ציבורית** המשמשת את ה-frontend לטיפול בחן בתכונות חסרות.

### תגובות: 200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### תגובה: 200 (ללא מסד נתונים)

כאשר מסד הנתונים אינו מוגדר, כל התכונות מושבתות:

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

### שמירה במטמון

תגובות מוצלחות נשמרות במטמון למשך 5 דקות עם stale-while-revalidate:

```ts
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

תגובות שגיאה משתמשות ב-`Cache-Control: no-cache`.

### התנהגות שגיאה

במקרה של שגיאה, נקודת הקצה מחזירה את כל התכונות כבלתי זמינות (עם סטטוס 500) כדי להבטיח שהממשק יתדרדר בחן.

---

## GET `/api/health/database`

A lightweight health check that tests the database connection by executing `SELECT 1`.

### Response: 200 (Healthy)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "result": [{ "test": 1 }]
}
```

### Response: 500 (Unhealthy)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection check failed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Use Cases

- Kubernetes/Docker liveness and readiness probes
- Monitoring dashboards
- Deployment verification scripts
- Load balancer health checks

---

## קבל `/api/version`

מאחזר מידע גרסה מקיף ממאגר התוכן של Git, כולל פרטי המחויבות העדכניים ביותר, מידע מחבר, ענף וסטטוס סנכרון.

### איך זה עובד

1. מאמת שספריית Git קיימת בנתיב התוכן
2. אם המדריך `.git` חסר, ניסיונות לסנכרן (שימושי להתחלות קרות ב-Vercel)
3. קורא את ההתחייבות האחרונה באמצעות `isomorphic-git`
4. מחזיר מידע גרסה מעוצב עם כותרות מטמון

### תגובות: 200

```json
{
  "commit": "a1b2c3d",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Add new feature for user management",
  "author": "John Doe",
  "repository": "https://github.com/user/repo.git",
  "lastSync": "2024-01-15T10:35:00.000Z",
  "branch": "main"
}
```

### כותרות תגובה

|כותרת|ערך|תיאור|
|--------|-------|-------------|
|`Cache-Control`|`public, max-age=60, stale-while-revalidate=300`|מטמון לקוח של דקה|
|`ETag`|`"a1b2c3d-1705312200000"`|מבוסס על commit hash|
|`Last-Modified`|`Mon, 15 Jan 2024 10:30:00 GMT`|התחייב חותמת זמן|

### תגובות שגיאה

כל השגיאות כוללות פורמט מובנה עם קוד שגיאה:

|סטטוס|קוד|מצב|
|--------|------|-----------|
| 404 |`REPOSITORY_NOT_FOUND`|ספריית Git לא קיימת|
| 404 |`NO_COMMITS`|למאגר אין התחייבויות|
| 500 |`GIT_ERROR`|נכשל קריאת מידע התחייבות|
| 500 |`VALIDATION_ERROR`|חסרים שדות חובה בנתוני התחייבות|
| 500 |`INTERNAL_ERROR`|שגיאה לא צפויה|

```json
{
  "error": "Data repository not found",
  "code": "REPOSITORY_NOT_FOUND",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "details": "Git directory not found at: /path/to/content/.git"
}
```

---

## GET `/api/version/sync`

Returns the current synchronization status including whether a sync is in progress, when the last sync occurred, and server uptime.

### Response: 200

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-15T10:30:00.000Z",
  "timeSinceLastSync": 300000,
  "timeSinceLastSyncHuman": "300s ago",
  "uptime": 86400,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Response: 200 (Never Synced)

```json
{
  "syncInProgress": false,
  "lastSyncTime": null,
  "timeSinceLastSync": null,
  "timeSinceLastSyncHuman": "never",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

## פרסם `/api/version/sync`

מפעיל באופן ידני סנכרון ברקע של מאגר התוכן של Git. מונע פעולות סנכרון במקביל (אם סנכרון כבר פועל, הוא מחזיר הצלחה עם הודעת מידע).

### גוף הבקשה

אופציונלי. שמור לשימוש עתידי:

```json
{}
```

### תגובה: 200 (הסנכרון הושלם)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 1250,
  "message": "Repository synchronized successfully",
  "details": "Updated 5 files, 3 commits ahead"
}
```

### תגובה: 200 (כבר בתהליך)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 50,
  "message": "Sync was already in progress",
  "details": "Another sync operation is currently running"
}
```

### תגובות: 500

```json
{
  "success": false,
  "error": "Manual sync request failed",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 800,
  "details": "Git fetch failed: network timeout"
}
```

גם תגובות GET וגם תגובות POST כוללות `Cache-Control: no-cache, no-store, must-revalidate` כדי למנוע מצב סנכרון מעופש.

---

## Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/internal/db-init/route.ts` | Database initialization endpoint |
| `template/app/api/config/features/route.ts` | Feature flags endpoint |
| `template/app/api/health/database/route.ts` | Database health check |
| `template/app/api/version/route.ts` | Version info endpoint |
| `template/app/api/version/sync/route.ts` | Sync trigger and status |
| `template/lib/db/initialize.ts` | Database initialization logic |
| `template/lib/config/feature-flags.ts` | Feature flag resolution |
| `template/lib/services/sync-service.ts` | Repository sync service |
| `template/lib/lib.ts` | Content path and filesystem utilities |
