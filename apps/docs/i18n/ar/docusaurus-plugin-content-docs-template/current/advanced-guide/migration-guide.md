---
id: migration-guide
title: دليل ترحيل الإصدار
sidebar_label: دليل الهجرة
sidebar_position: 8
---

# دليل ترحيل الإصدار

يغطي هذا الدليل ترقية تثبيت قالب Ever Works الخاص بك، والتعامل مع عمليات ترحيل قاعدة البيانات بين الإصدارات، وإدارة التغييرات المعطلة، وكتابة البرامج النصية للترحيل وتطبيقها، وإجراءات التراجع.

## ترقية نظرة عامة على سير العمل

تتبع ترقية القالب عملية منظمة لتقليل المخاطر:

```
1. Review changelog for breaking changes
2. Back up your database (pg_dump)
3. Create a feature branch for the upgrade
4. Update dependencies (pnpm install)
5. Generate and apply database migrations
6. Run lint, type check, and build locally
7. Test critical paths (auth, payments, content)
8. Deploy to staging / preview
9. Verify staging
10. Deploy to production
```

## نظام ترحيل قاعدة البيانات

### كيف تعمل الهجرات

يستخدم القالب Drizzle ORM مع Drizzle Kit لعمليات ترحيل المخطط. يتم تعريف المخطط في "0" ويتم إنشاء عمليات الترحيل كملفات SQL إلى "1".

التكوين في 2:

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

### أوامر الترحيل

| الأمر | الغرض | متى تستخدم |
|---------|--------|-------------|
| `pnpm db:generate` | إنشاء SQL من تغييرات المخطط | بعد التعديل `lib/db/schema.ts` |
| `pnpm db:migrate` | تطبيق عمليات الترحيل المعلقة (Drizzle CLI) | قبل بدء التطبيق بعد التغييرات |
| `pnpm db:migrate:cli` | تنطبق مع التسجيل المطول | لتصحيح مشكلات الترحيل |
| 4ـ | تعبئة البيانات الأولية | بعد الهجرة الجديدة أو تغيرات البذور |
| 5 ــ | فحص قاعدة البيانات المرئية | لتصحيح الأخطاء أو مراجعة البيانات |

### هيكل ملف الهجرة

يتم تخزين عمليات الترحيل كملفات SQL مرقمة:

```
lib/db/migrations/
  0000_burly_darkstar.sql          # Initial schema
  0001_add_image_to_users.sql      # Add image column
  ...
  0019_add_subscription_renewal_fields.sql
  ...
  0028_tiresome_mauler.sql         # Latest migration
  meta/
    _journal.json                  # Migration journal
```

يتتبع Drizzle عمليات الترحيل المطبقة في `drizzle.__drizzle_migrations` :

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### إنشاء هجرة جديدة

بعد التعديل 0:

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### عمليات الترحيل التلقائية

يقوم القالب بتشغيل عمليات الترحيل تلقائيًا في مكانين:

** وقت البناء ** (عبر `scripts/build-migrate.ts` ):

```typescript
// Production builds: failure causes build to fail
if (isProduction) {
  process.exit(1);
}

// Preview deployments: connection errors are tolerated
if (isConnectionError && !isAuthError) {
  process.exit(0); // Allow preview to deploy
}
```

** وقت التشغيل ** (عبر `instrumentation.ts` ):

```typescript
export async function register() {
  try {
    await initializeDatabase(); // Runs migrate then seed
  } catch (error) {
    if (isProduction) throw error; // Fail fast
    // Dev/preview: log and continue
  }
}
```

### سلامة الهجرة حسب البيئة

| البيئة | وقت البناء | وقت التشغيل | على الفشل |
|-------------|------------|--------|------------|
| الإنتاج | مطلوب | احتياطي | فشل البناء / رمي التطبيق |
| معاينة | أخطاء الاتصال مسموح بها | نشط | تحذير السجلات، يبدأ التطبيق |
| التنمية | غير مستخدم | نشط | تحذير السجلات، يبدأ التطبيق |
| CI (غير فيرسيل) | تخطي | غير مستخدم | لا يوجد |

## إجراءات التراجع

### Drizzle لا يدعم التراجع التلقائي

تقوم Drizzle Kit بإنشاء عمليات ترحيل للأمام فقط. لعكس عملية الترحيل:

**الخيار 1: الترحيل العكسي اليدوي**

1. تحديد مشكلة الترحيل في `lib/db/migrations/` 2. اكتب SQL العكسي يدويًا:

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. التقدم مباشرة إلى قاعدة البيانات:

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. قم بإزالة ملف الترحيل الأمامي من 0
5. قم بتحديث مجلة Drizzle إذا لزم الأمر

**الخيار 2: الاستعادة من النسخة الاحتياطية**

نهج التراجع الأكثر أمانًا لعمليات الترحيل المعقدة:

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**الخيار 3: التراجع عن المخطط وإعادة إنشائه**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## تحديثات التبعية

### تحديث التبعيات

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### التبعيات الحرجة

تتطلب هذه الحزم اختبارًا دقيقًا عند الترقية:

| الحزمة | خطر | ملاحظات |
|---------|------|-------|
| `next` | عالية | تعمل الإصدارات الرئيسية على تغيير واجهات برمجة التطبيقات والتوجيه والتكوين |
| `next-auth` | عالية | تغييرات واجهة برمجة التطبيقات (API) واستراتيجية الجلسة |
| `drizzle-orm` / `drizzle-kit` | عالية | واجهة برمجة تطبيقات المخطط، تغييرات تنسيق الترحيل |
| 4ـ | متوسطة | تغييرات التوجيه وتحميل الرسائل |
| 5 ــ | متوسطة | التوافق مع خطاف الأجهزة |
| 6ـ | متوسطة | إصدار واجهة برمجة تطبيقات الدفع |
| `@heroui/react` | متوسطة | تغييرات دعم مكون واجهة المستخدم |
| 8ـ | متوسطة | تغييرات واجهة برمجة التطبيقات لجدولة الوظائف |

### تجاوزات pnpm

يستخدم القالب تجاوزات pnpm في 9 لفرض إصدارات متسقة:

```json
{
  "pnpm": {
    "overrides": {
      "@types/react": "19.2.7",
      "@types/react-dom": "19.2.3",
      "esbuild": "0.27.0",
      "@opentelemetry/api": "1.9.0"
    }
  }
}
```

عند ترقية React أو esbuild، قم بتحديث هذه التجاوزات لتتوافق.

## قائمة مراجعة التغييرات العاجلة

عند الترقية بين إصدارات القالب، قم بمراجعة كل فئة:

### تغييرات المخطط

- [ ] قارن `lib/db/schema.ts` مع المنبع للأعمدة الجديدة/المعدلة
- [ ] توليد الهجرات: `pnpm db:generate` - [ ] مراجعة SQL التي تم إنشاؤها للعمليات التدميرية (إسقاط العمود، وتغييرات النوع)
- [ ] قم بالتقدم إلى قاعدة بيانات اختبارية أولاً
- [ ] التحقق من توافق البذور: `pnpm db:seed` ### تغييرات مسار واجهة برمجة التطبيقات

- [ ] تحقق من وجود مسارات تمت إعادة تسميتها أو إزالتها في `app/api/` - [ ] تحديث عمليات التكامل الخارجية وعناوين URL الخاصة بالويب هوك
- [ ] تحقق من أن مسارات نقطة النهاية cron لا تزال متطابقة مع `vercel.json` ### تغييرات التكوين

- [ ] قارن `.env.example` للمتغيرات الجديدة أو المعاد تسميتها
- [ ] مراجعة 6 تغييرات (العناوين، حزمة الويب، المكونات الإضافية)
- [ ] تحقق من `vercel.json` لتغييرات جدول cron
- [ ] قم بمراجعة `drizzle.config.ts` لتغييرات المسار

### تغييرات المصادقة

- [ ] قارن `auth.config.ts` مع المنبع
- [ ] التحقق من توافق استراتيجية الجلسة
- [ ] اختبار عناوين URL لرد اتصال OAuth
- [ ] مراجعة تعريفات الأذونات في `lib/permissions/definitions.ts` ### تغييرات واجهة المستخدم والتصميم

- [ ] قارن `tailwind.config.ts` لتغييرات السمة
- [ ] فحص الصفحات الرئيسية بصريًا
- [ ] اختبار التخطيطات سريعة الاستجابة
- [ ] تأكد من استمرار تطبيق تخصيصات السمات

## عملية الترقية خطوة بخطوة

### 1. استعد

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. دمج المنبع

إذا قمت بتتبع القالب كجهاز تحكم عن بعد:

```bash
git fetch upstream
git merge upstream/main --no-commit
```

حل النزاعات مع الاهتمام بما يلي:
- `lib/db/schema.ts` -- تغييرات المخطط
- 1-- بناء التكوين
- `auth.config.ts` -- مقدمو المصادقة
- `package.json` --إصدارات التبعية

### 3. التثبيت والترحيل

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. التحقق محليا

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. اختبار المسارات الحرجة

| المنطقة | ما الذي يجب اختباره |
|------|------------|
| المصادقة | تسجيل الدخول، تسجيل الخروج، OAuth، استمرارية الجلسة |
| المدفوعات | تدفقات الاشتراك، والتعامل مع webhook |
| المحتوى | عرض الصفحة والبحث والتصفية |
| المشرف | الوصول إلى لوحة المعلومات، وإنفاذ RBAC |
| i18n | تبديل اللغة، واكتمال الترجمة |
| وظائف الخلفية | سجلات وحدة التحكم لتسجيل الوظائف |

### 6. النشر

1. ادفع فرع الميزات للتحقق من CI
2. النشر في بيئة التدريج/المعاينة
3. قم بإجراء اختبارات الدخان على التدريج
4. ادمج إلى `main` لنشر الإنتاج

## توافق الإصدار

### نود.جي إس

يتم تعريف الحد الأدنى للإصدار في 1:

```json
{ "engines": { "node": ">=20.19.0" } }
```

### قاعدة البيانات

| مقدم | مدعوم | ملاحظات |
|----------|----------|-------|
| بوستجري إس كيو إل 14+ | نعم | الإنتاج الموصى به |
| سوباباس | نعم | مع تجمع الاتصال |
| نيون | نعم | PostgreSQL بدون خادم |

### المنصات

| منصة | الحالة | ملاحظات |
|----------|-------|-------|
| فيرسيل | الهدف الأساسي | دعم كامل للكرون والمعاينة والحافة |
| عامل الميناء | مدعوم | إخراج مستقل للحاويات |
| استضافة ذاتية | مدعوم | يتطلب إدارة العملية |

## استكشاف أخطاء الترقيات وإصلاحها

| العَرَض | السبب المحتمل | الحل |
|---------|------------|---------|
| فشل البناء | انخفاضات غير متوافقة | تشغيل `pnpm outdated` ، حل تعارضات الأقران |
| أخطاء قاعدة البيانات عند بدء التشغيل | الهجرات غير المطبقة | `pnpm db:generate && pnpm db:migrate` |
| المصادقة مكسورة | تم تغيير تكوين الموفر | قارن `auth.config.ts` مع المنبع |
| ترجمات مفقودة | تمت إضافة مفاتيح جديدة | تحقق من `messages/` للإدخالات المفقودة |
| التصميم مكسور | تم تغيير تكوين Tailwind | قارن 4|
| عدم تطابق الأنواع | تم تحديث المخطط | إعادة التشغيل `pnpm db:generate` |
