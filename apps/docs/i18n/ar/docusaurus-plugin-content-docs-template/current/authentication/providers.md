---
id: providers
title: مزودو المصادقة
sidebar_label: مزودو الخدمة
sidebar_position: 3
---

# مزودو المصادقة

## المزودون المدعومون

### Google OAuth
1. انتقل إلى Google Cloud Console
2. أنشئ بيانات اعتماد OAuth 2.0
3. أضف رابط إعادة التوجيه: `http://localhost:3000/api/auth/callback/google`
4. عيّن `GOOGLE_CLIENT_ID` و`GOOGLE_CLIENT_SECRET`

### GitHub OAuth
1. انتقل إلى GitHub Settings > Developer settings > OAuth Apps
2. أنشئ OAuth App جديداً
3. رابط الاستدعاء: `http://localhost:3000/api/auth/callback/github`
4. عيّن `GITHUB_CLIENT_ID` و`GITHUB_CLIENT_SECRET`

### Facebook OAuth
1. انتقل إلى developers.facebook.com
2. أنشئ تطبيقاً جديداً
3. أضف منتج Facebook Login
4. عيّن `FACEBOOK_CLIENT_ID` و`FACEBOOK_CLIENT_SECRET`

### Microsoft OAuth
1. انتقل إلى Azure Active Directory
2. سجّل تطبيقاً جديداً
3. أضف رابط إعادة التوجيه
4. عيّن `MICROSOFT_CLIENT_ID` و`MICROSOFT_CLIENT_SECRET`

### Credentials (البريد الإلكتروني / كلمة المرور)
مزود مدمج للمصادقة عبر البريد الإلكتروني وكلمة المرور. يستخدم bcrypt لتشفير كلمات المرور.
