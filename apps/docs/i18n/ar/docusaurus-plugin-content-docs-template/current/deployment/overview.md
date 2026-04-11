---
id: overview
title: نظرة عامة على النشر
sidebar_label: نظرة عامة
sidebar_position: 1
---

# نظرة عامة على النشر

تم تحسين قالب Ever Works للنشر على **Vercel**، مع دعم أي منصة متوافقة مع Node.js. يغطي هذا الدليل عملية النشر الجاهز للإنتاج من التحضير حتى الإطلاق.

## البداية السريعة (نشر Vercel)

### 1. المتطلبات المسبقة

قبل النشر، تأكد من توفر ما يلي:

- [ ] قاعدة بيانات PostgreSQL (يُوصى بـ Neon أو Supabase)
- [ ] مستودع GitHub يحتوي على بيانات المحتوى
- [ ] حساب Vercel (الإصدار المجاني كافٍ للبداية)
- [ ] متغيرات البيئة المكوّنة (راجع دليل [متغيرات البيئة](./environment-variables))

### 2. الاتصال بـ Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Deploy to production
vercel --prod
```

أو قم بتوصيل مستودع GitHub مباشرةً عبر لوحة تحكم Vercel للنشر التلقائي.

### 3. متغيرات البيئة المطلوبة

```bash
# Core
AUTH_SECRET=<openssl rand -base64 32>
DATABASE_URL=postgresql://user:pass@host/db
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Cookies
COOKIE_SECRET=<openssl rand -base64 32>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# Cron
CRON_SECRET=<openssl rand -base64 32>
```

للقائمة الكاملة للمتغيرات، راجع دليل [متغيرات البيئة](./environment-variables).

### 4. تهيئة قاعدة البيانات

يتم تهيئة قاعدة البيانات تلقائياً عند أول تشغيل للتطبيق. يمكنك أيضاً تشغيلها يدوياً:

```bash
cd apps/web
pnpm db:migrate
pnpm db:seed
```

## نظرة عامة على البنية

```
┌─────────────────────────────────────────┐
│           Vercel Edge Network           │
│         (CDN + Load Balancing)          │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           Next.js Application           │
│                                         │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  App Router │  │   API Routes     │  │
│  │  (RSC/ISR)  │  │  /api/**         │  │
│  └─────────────┘  └──────────────────┘  │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼────┐      ┌───────▼──────┐
│  Neon  │      │  Git CMS Repo │
│  (DB)  │      │  (Content)   │
└────────┘      └──────────────┘
```

## أوضاع النشر

### الإنتاج (Vercel)

- **CI/CD**: نشر تلقائي عند كل دفع إلى الفرع الرئيسي
- **المعاينة**: عنوان URL معاينة تلقائي لكل طلب سحب
- **Cron Jobs**: Vercel Crons الأصلية المُدارة عبر `vercel.json`
- **شبكة Edge**: توزيع المحتوى عالمياً وموازنة التحميل

### الاستضافة الذاتية

يدعم القالب أيضاً النشر المستقل على Node.js:

```bash
# Build
pnpm build

# Start
pnpm start
```

يتطلب تكويناً إضافياً: Node.js >= 20.19.0، وPostgreSQL، ومدير عمليات (PM2 وما شابه)، وبروكسي عكسي (Nginx وما شابه).

## الخدمات الرئيسية

| الخدمة | الغرض | الموصى به |
|--------|-------|----------|
| **PostgreSQL** | قاعدة البيانات الرئيسية | Neon، Supabase |
| **مستودع المحتوى** | بيانات CMS القائم على Git | GitHub (عام أو خاص) |
| **البريد الإلكتروني** | رسائل المعاملات | Postmark، Resend |
| **الدفع** | الاشتراكات | Stripe، Lemon Squeezy |
| **تتبع الأخطاء** | المراقبة | Sentry |
| **التحليلات** | تحليلات المستخدم | PostHog |

## قائمة تحقق النشر

### النشر الأول

- [ ] تعيين جميع متغيرات البيئة الضرورية
- [ ] صحة عنوان URL لقاعدة البيانات وإمكانية الوصول إليها
- [ ] `DATA_REPOSITORY` يشير إلى مستودع محتوى صحيح
- [ ] تعيين `AUTH_SECRET` بقيمة عشوائية قوية
- [ ] تعيين `CRON_SECRET` لحماية نقاط نهاية cron
- [ ] `COOKIE_SECURE=true` مُعيَّن للإنتاج
- [ ] تكوين Webhooks للدفع (إن كنت تستخدم ميزات الدفع)

### كل عملية نشر

- [ ] ترحيلات قاعدة البيانات تعمل تلقائياً عند الطلب الأول
- [ ] Cron Jobs تظهر في لوحة تحكم Vercel
- [ ] تتبع الأخطاء (Sentry) يعمل بشكل صحيح
- [ ] فحص صحة التطبيق `/api/health` يُرجع 200

## الأدلة التفصيلية

| الموضوع | التوثيق |
|---------|---------|
| إعداد متغيرات البيئة | [متغيرات البيئة](./environment-variables) |
| إعداد قاعدة البيانات والترحيل | [إدارة قاعدة البيانات](./database-management) |
| إعداد Cron Jobs | [Cron Jobs](./cron-jobs) |
| التحقق من Cron Jobs | [التحقق من Cron](./cron-verification) |
| المراقبة والتنبيهات | [المراقبة](./monitoring) |

## مرجع سريع

```bash
# Production deploy
vercel --prod

# Check logs
vercel logs

# Run DB migration (if needed)
cd apps/web && pnpm db:migrate

# Check environment variables
vercel env ls

# Health check
curl https://yourdomain.com/api/health
```
