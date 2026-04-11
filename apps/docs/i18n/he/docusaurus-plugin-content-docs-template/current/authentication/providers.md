---
id: providers
title: ספקי אימות
sidebar_label: ספקים
sidebar_position: 3
---

# ספקי אימות

## ספקים נתמכים

### Google OAuth
1. עבור ל-Google Cloud Console
2. צור אישורי OAuth 2.0
3. הוסף URI להפניה: `http://localhost:3000/api/auth/callback/google`
4. הגדר `GOOGLE_CLIENT_ID` ו-`GOOGLE_CLIENT_SECRET`

### GitHub OAuth
1. עבור ל-GitHub Settings > Developer settings > OAuth Apps
2. צור OAuth App חדש
3. Callback URL: `http://localhost:3000/api/auth/callback/github`
4. הגדר `GITHUB_CLIENT_ID` ו-`GITHUB_CLIENT_SECRET`

### Facebook OAuth
1. עבור ל-developers.facebook.com
2. צור אפליקציה חדשה
3. הוסף מוצר Facebook Login
4. הגדר `FACEBOOK_CLIENT_ID` ו-`FACEBOOK_CLIENT_SECRET`

### Microsoft OAuth
1. עבור ל-Azure Active Directory
2. רשום אפליקציה חדשה
3. הוסף URI להפניה
4. הגדר `MICROSOFT_CLIENT_ID` ו-`MICROSOFT_CLIENT_SECRET`

### Credentials (דוא"ל/סיסמה)
ספק מובנה לאימות דוא"ל וסיסמה. משתמש ב-bcrypt לגיבוב סיסמאות.
