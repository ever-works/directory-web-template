---
id: setup-guide
title: دليل إعداد المصادقة
sidebar_label: دليل الإعداد
sidebar_position: 2
---

# دليل إعداد المصادقة

كيفية تكوين المصادقة في تطبيق Ever Works الخاص بك.

## متغيرات البيئة المطلوبة

```env
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### إنشاء مفتاح سري آمن:
```bash
openssl rand -base64 32
# أو
npx auth secret
```

## إعداد موفر OAuth

أضف إلى .env.local:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## تكوين NextAuth.js

يوجد إعداد المصادقة في apps/web/auth.config.ts. ويتضمن:
- استراتيجية الجلسة: JWT
- دوال الاستدعاء لبيانات الجلسة
- معالجات الأحداث لإنشاء المستخدم

## اختبار المصادقة

1. تشغيل خادم التطوير: pnpm run dev
2. الانتقال إلى http://localhost:3000/sign-in
3. الاختبار باستخدام بيانات الاعتماد
4. اختبار تدفقات OAuth
