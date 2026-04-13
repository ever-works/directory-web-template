---
id: auth-endpoints
title: נקודות קצה של ממשק API של אימות
sidebar_label: נקודות קצה של אימות
sidebar_position: 4
---

# נקודות קצה של ממשק API של אימות

נקודות קצה של אימות מטפלות בטיפול במסלול NextAuth.js, ניהול סיסמאות ואחזור הפעלה נוכחית של משתמש. מסלול הליבה הכלי של NextAuth מנהל את כל החזרות OAuth, ניהול הפעלות והגנת CSRF באופן אוטומטי.

## NextAuth Handler (`/api/auth/[...nextauth]`)

נתיב ה-catch-all מייצא את המטפלים של NextAuth מ-`lib/auth/index.ts`:

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

המסלול היחיד הזה מטפל בכל פעולות NextAuth:

### קבל נקודות קצה (דרך NextAuth)

|נתיב|תיאור|
|------|-------------|
|`/api/auth/signin`|עבד את דף הכניסה או הפניה מחדש לספק|
|`/api/auth/signout`|לטפל ביציאה|
|`/api/auth/session`|קבל הפעלה נוכחית בתור JSON|
|`/api/auth/csrf`|קבל אסימון CSRF|
|`/api/auth/providers`|רשימת ספקי אישור זמינים|
|`/api/auth/callback/[provider]`|מטפל בהתקשרות חוזרת של OAuth|

### נקודות קצה של POST (דרך NextAuth)

|נתיב|תיאור|
|------|-------------|
|`/api/auth/signin/[provider]`|התחל כניסה עם ספק|
|`/api/auth/signout`|תהליך היציאה|
|`/api/auth/callback/credentials`|עבד את פרטי הכניסה|
|`/api/auth/_log`|רישום פנימי של Auth.js|

### זרימת התקשרות חוזרת של OAuth

כאשר משתמש מאמת עם ספק OAuth:

```
1. User clicks "Sign in with Google"
2. Redirect to Google consent screen
3. Google redirects back to /api/auth/callback/google
4. NextAuth verifies the OAuth code
5. signIn callback runs (lib/auth/index.ts)
   -> Validates user email
   -> Allows account linking for OAuth
6. jwt callback enriches token
   -> Sets userId, provider, isAdmin
   -> Creates client profile for new OAuth users
7. Session created, user redirected to callback URL
```

### דפים מותאמים אישית

NextAuth מוגדר להשתמש בדפי אימות מותאמים אישית במקום בממשק המשתמש של NextAuth המוגדר כברירת מחדל:

|מטרה|נתיב מותאם אישית|
|---------|-------------|
|היכנס|`/auth/signin`|
|צא|`/auth/signout`|
|שגיאה|`/auth/error`|
|אמת את הבקשה|`/auth/verify-request`|
|רישום משתמש חדש|`/auth/register`|

## ניהול סיסמאות (`/api/auth/change-password`)

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`POST`|`/api/auth/change-password`|שנה את סיסמת המשתמש המאומת|

### גוף הבקשה

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

### אימות

דורש הפעלה חוקית. נקודת הקצה מאמתת את הסיסמה הנוכחית לפני העדכון.

### תגובה

```json
// Success
{ "success": true, "message": "Password changed successfully" }

// Error
{ "success": false, "error": "Current password is incorrect" }
```

## משתמש נוכחי (`/api/current-user`)

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/current-user`|קבל נתוני משתמש מאומתים עדכניים|

### תגובה

מחזירה את אובייקט משתמש ההפעלה המועשר בשדות ספציפיים ליישום:

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "isAdmin": false,
    "clientProfileId": "profile-uuid",
    "provider": "google"
  }
}
```

### תגובה לא מאומתת

מחזירה `null` או סטטוס `401` כאשר אין הפעלה חוקית.

## טיפול באסימוני הפעלה

NextAuth מאחסן אסימוני הפעלה בקובצי Cookie של HTTP בלבד:

|שם עוגיה|סביבה|
|------------|-------------|
|`next-auth.session-token`|פיתוח (HTTP)|
|`__Secure-next-auth.session-token`|הפקה (HTTPS)|

### הגנת CSRF

NextAuth כולל הגנת CSRF מובנית. קובץ Cookie של אסימון CSRF (`next-auth.csrf-token`) מוגדר בלקוח ויש לכלול אותו בבקשות POST לנקודות קצה של NextAuth.

## טיפול בשגיאות

שגיאות אימות ממפות להודעות ידידותיות למשתמש ב-`lib/auth/error-handler.ts`:

|דפוס שגיאה|הודעת משתמש|
|--------------|--------------|
|`GOOGLE_CLIENT_ID` קשור|האימות של Google אינו מוגדר כהלכה|
|`GITHUB_CLIENT_ID` קשור|אימות GitHub אינו מוגדר כהלכה|
|`FB_CLIENT_ID` קשור|אימות פייסבוק אינו מוגדר כהלכה|
|`MICROSOFT_CLIENT_ID` קשור|האימות של Microsoft אינו מוגדר כהלכה|
|`SUPABASE` קשור|אימות Supabase אינו מוגדר כהלכה|
|`NEXTAUTH` קשור|NextAuth אינו מוגדר כהלכה|

הפונקציה `handleAuthError()` תופסת את השגיאות הללו ומחזירה תגובה מובנית `{ error: string }`.

## אירועי אישור

תצורת NextAuth ב-`lib/auth/index.ts` מטפלת באירועי מחזור חיים:

### אירוע יציאה

מבטל את תוקף מטמון ההפעלה עבור המשתמש כדי להבטיח שלא יוצגו נתוני הפעלה מיושנים:

```typescript
events: {
  signOut: async (event) => {
    const token = 'token' in event ? event.token : undefined;
    if (token?.userId) {
      await invalidateSessionCache(undefined, token.userId);
    }
  }
}
```

### אירוע עדכון משתמש

מבטל את תוקף מטמון ההפעלה כאשר נתוני המשתמש משתנים (למשל, עדכון פרופיל, שינוי תפקיד):

```typescript
events: {
  updateUser: async ({ user }) => {
    if (user?.id) {
      await invalidateSessionCache(undefined, user.id);
    }
  }
}
```

## תצורה קשורה

|קובץ|מטרה|
|------|---------|
|`auth.config.ts`|תצורת ספק ברמה העליונה|
|`lib/auth/index.ts`|מופע NextAuth עם התקשרויות ואירועים|
|`lib/auth/providers.ts`|מפעל ספק OAuth|
|`lib/auth/credentials.ts`|ספק דוא"ל/סיסמא|
|`lib/auth/cached-session.ts`|שכבת מטמון הפעלה|
|`lib/auth/admin-guard.ts`|תוכנת התווך של נתיב מנהל|
