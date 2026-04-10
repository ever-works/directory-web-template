---
id: database-scripts
title: "سكريبتات قاعدة البيانات"
sidebar_label: "سكريبتات"
sidebar_position: 10
---

# سكريبتات قاعدة البيانات

يوفر القالب مجموعة من سكريبتات إدارة قاعدة البيانات للترحيل وبذر البيانات والصيانة. تستخدم هذه السكريبتات Drizzle ORM وهي مصممة للعمل في التطوير المحلي وخطوط أنابيب CI/CD ونشر الإنتاج على Vercel.

## جرد السكريبتات

| السكريبت | الأمر | الغرض |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | منفذ الترحيل أثناء البناء |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | ترحيل يدوي تفاعلي |
| `cli-seed.ts` | `pnpm db:seed` | نقطة دخول CLI لبذر البيانات |
| `seed.ts` | تنفيذ مباشر | بذر كامل لقاعدة البيانات |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | إعداد كتالوج منتجات Stripe |
| `clean-database.js` | `node scripts/clean-database.js` | إعادة تعيين شاملة (حذف كل شيء) |

## سكريبتات الترحيل

### الترحيل أثناء البناء (build-migrate.ts)

يعمل تلقائياً أثناء `pnpm build` في نشرات Vercel. مصمم لتحديثات المخطط بدون وقت توقف.

```mermaid
flowchart TD
    A[Build Start] --> B{SKIP_BUILD_MIGRATIONS?}
    B -->|true| C[Skip & Exit 0]
    B -->|false| D{CI Environment?}
    D -->|CI, not Vercel| C
    D -->|Vercel or Local| E{DATABASE_URL set?}
    E -->|No| C
    E -->|Yes| F[Run Drizzle Migrations]
    F --> G{Success?}
    G -->|Yes| H[Verify Schema]
    G -->|No| I{Production?}
    H --> J{Columns exist?}
    J -->|Yes| K[Exit 0 - Success]
    J -->|No| L[Exit 1 - Fail]
    I -->|Yes| L
    I -->|Preview| M{Connection error?}
    M -->|Yes| C
    M -->|Auth error| L
```

**السلوك حسب البيئة:**

| البيئة | فشل الترحيل | خطأ الاتصال | خطأ المصادقة |
|---|---|---|---|
| الإنتاج (`VERCEL_ENV=production`) | فشل البناء | فشل البناء | فشل البناء |
| المعاينة (`VERCEL_ENV=preview`) | فشل البناء | نجاح البناء (تحذير) | فشل البناء |
| CI (GitHub Actions) | تخطي كامل | تخطي كامل | تخطي كامل |
| التطوير المحلي | فشل البناء | فشل البناء | فشل البناء |

**التحقق من المخطط:**

بعد نجاح الترحيل، يتحقق السكريبت من وجود الأعمدة الحيوية:

```typescript
// Verified columns in client_profiles table:
const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
```

### CLI الترحيل اليدوي (cli-migrate.ts)

أداة ترحيل تفاعلية للتنفيذ اليدوي مقابل أي قاعدة بيانات.

```bash
# Using package.json script
pnpm db:migrate:cli

# Direct execution with custom database
DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

**عملية من ثلاث خطوات:**

1. **التحقق من الحالة الحالية** -- يستعلم جدول `drizzle.__drizzle_migrations` للحصول على تاريخ الترحيلات المطبقة
2. **تنفيذ الترحيلات** -- يستدعي `runMigrations()` من `lib/db/migrate.ts`
3. **التحقق من المخطط** -- يؤكد وجود الأعمدة المطلوبة

## سكريبتات بذر البيانات

### بذر قاعدة البيانات (seed.ts)

يملأ قاعدة البيانات ببيانات اختبار واقعية. يقوم بالبذر فقط إذا كانت الجداول فارغة.

```bash
DATABASE_URL=postgres://... pnpm seed
```

**ترتيب البذر والتبعيات:**

```mermaid
graph TD
    A[Roles] --> B[Permissions]
    B --> C[Role-Permission Links]
    C --> D[Users]
    D --> E[Client Profiles]
    D --> F[User Roles]
    E --> G[Newsletter Subscriptions]
    E --> H[Activity Logs]
    E --> I[Comments]
    E --> J[Votes]
```

**البيانات المولدة:**

```typescript
// 20 users with sequential emails
{ email: 'user1@example.com', ... }
{ email: 'user2@example.com', ... }

// Client profiles with varied plans
{ plan: i % 5 === 0 ? 'premium' : i % 3 === 0 ? 'standard' : 'free' }

// Role assignment: first user = admin
{ roleId: i === 0 ? 'role-admin' : 'role-user' }

// Newsletter subscriptions: every 3rd user
users.filter((_, i) => i % 3 === 0)
```

### نقطة دخول CLI للبذر (cli-seed.ts)

سكريبت مغلف يحمل متغيرات البيئة ويفوض إلى `lib/db/seed.ts`.

يبحث السكريبت عن ملفات البيئة بهذا الترتيب:
1. `.env.local` (مفضل)
2. `.env` (بديل)
3. متغيرات البيئة النظامية فقط (إذا لم توجد ملفات)

### بذر منتجات Stripe (seed-stripe-products.ts)

ينشئ كتالوج كامل لمنتجات Stripe مع خطط اشتراك وعناصر شراء لمرة واحدة.

```bash
npx tsx scripts/seed-stripe-products.ts
```

**مطلوب:** `STRIPE_SECRET_KEY` في `.env.local`

**المنتجات والأسعار:**

| المنتج | مفتاح الخطة | نوع السعر | البيانات الوصفية |
|---|---|---|---|
| Free | `free` | اشتراك ($0/شهر) | `type: subscription` |
| Standard | `standard` | $10/شهر، $96/سنة | `annualDiscount: 20` |
| Premium | `premium` | $20/شهر، $180/سنة | `annualDiscount: 25` |
| إعلان مدعوم - أسبوعي | `sponsor_weekly` | $100 مرة واحدة | `type: sponsor_ad` |
| إعلان مدعوم - شهري | `sponsor_monthly` | $300 مرة واحدة | `type: sponsor_ad` |

## تنظيف قاعدة البيانات

### clean-database.js

يحذف جميع الجداول ومخطط تتبع ترحيلات Drizzle. يوفر إعادة تعيين كاملة لقاعدة البيانات.

```bash
node scripts/clean-database.js
```

**العمليات المنفذة:**

1. يحذف جميع الجداول في مخطط `public` باستخدام `CASCADE`
2. يحذف مخطط `drizzle` (تاريخ الترحيلات)

```sql
-- Step 1: Drop all public tables
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Step 2: Drop migration tracking
DROP SCHEMA IF EXISTS drizzle CASCADE;
```

**تحذير:** هذه العملية لا رجعة فيها. احرص دائماً على إنشاء نسخة احتياطية قبل التنفيذ في أي بيئة تحتوي بيانات حقيقية.

## سير العمل الشائعة

### إعداد تطوير جديد

```bash
# 1. Start local PostgreSQL
docker compose up -d postgres

# 2. Generate migration files from schema
pnpm db:generate

# 3. Apply migrations
pnpm db:migrate:cli

# 4. Seed test data
pnpm db:seed

# 5. Seed Stripe products (if using payments)
npx tsx scripts/seed-stripe-products.ts
```

### إعادة التعيين وإعادة البذر

```bash
# 1. Clean everything
node scripts/clean-database.js

# 2. Re-apply migrations
pnpm db:migrate:cli

# 3. Re-seed
pnpm db:seed
```

## متغيرات البيئة

| المتغير | مطلوب بواسطة | الغرض |
|---|---|---|
| `DATABASE_URL` | جميع السكريبتات | سلسلة اتصال PostgreSQL |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | اضبط على `true` لتخطي ترحيلات البناء |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | مفتاح API لـ Stripe لإنشاء المنتجات |
| `SEED_ADMIN_EMAIL` | seed.ts (عبر lib) | بريد حساب المسؤول |
| `SEED_ADMIN_PASSWORD` | seed.ts (عبر lib) | كلمة مرور حساب المسؤول |

## معالجة الأخطاء

تتبع جميع سكريبتات قاعدة البيانات هذه الاتفاقيات:

- كود الخروج `0` للنجاح أو شروط التخطي المقبولة
- كود الخروج `1` للأخطاء التي يجب أن توقف خط الأنابيب
- سلاسل الاتصال مُقنَّعة في السجلات (`://***:***@`)
- رسائل خطأ مفصلة مسجلة على جانب الخادم
- أخطاء الإنتاج تفشل البناء دائماً (بدون إسكات)
