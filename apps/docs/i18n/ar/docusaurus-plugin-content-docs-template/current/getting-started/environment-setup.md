---
title: "إعداد البيئة"
sidebar_label: "إعداد البيئة"
sidebar_position: 3
---

# إعداد البيئة

## متغيرات البيئة المطلوبة

```env
NODE_ENV=development
AUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
COOKIE_SECRET=your-cookie-secret
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
GH_TOKEN=your-github-token
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

## متغيرات البيئة الاختيارية

### مزودو OAuth

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
```

### خدمات الدفع

```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
LEMONSQUEEZY_API_KEY=
POLAR_API_KEY=
```

### خدمات البريد الإلكتروني

```env
EMAIL_SERVER=
EMAIL_FROM=
```

### التحليلات

```env
NEXT_PUBLIC_ANALYTICS_ID=
SENTRY_DSN=
```
