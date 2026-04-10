---
id: setup-guide
title: מדריך הגדרת אימות
sidebar_label: מדריך הגדרה
sidebar_position: 2
---

# מדריך הגדרת אימות

כיצד להגדיר אימות ביישום Ever Works שלך.

## משתני סביבה נדרשים

```env
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### יצירת סוד מאובטח:
```bash
openssl rand -base64 32
# או
npx auth secret
```

## הגדרת ספק OAuth

הוסף לקובץ `.env.local`:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## הגדרת NextAuth.js

קובץ התצורה נמצא ב-`apps/web/auth.config.ts`. הוא כולל:
- אסטרטגיית הפעלה: JWT
- Callbacks לנתוני הפעלה
- מטפלי אירועים ליצירת משתמשים

## בדיקת אימות

1. הפעל שרת פיתוח: `pnpm run dev`
2. עבור ל-`http://localhost:3000/sign-in`
3. בדוק עם פרטי אישורים
4. בדוק זרימות OAuth
