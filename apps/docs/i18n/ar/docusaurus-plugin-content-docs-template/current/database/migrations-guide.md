---
id: migrations-guide
title: دليل الهجرة
sidebar_label: الهجرات
sidebar_position: 4
---

# دليل الهجرة

يستخدم قالب Ever Works **Drizzle Kit** لعمليات ترحيل قاعدة البيانات. عمليات الترحيل هي ملفات SQL تتعقب تغييرات المخطط بمرور الوقت، مما يضمن حالة قاعدة البيانات المتسقة عبر البيئات وأعضاء الفريق.

## كيف تعمل الهجرات

يقوم Drizzle Kit بمقارنة تعريف المخطط الحالي (`lib/db/schema.ts`) مع عمليات الترحيل التي تم إنشاؤها مسبقًا وينتج ملفات ترحيل SQL لأية اختلافات.

```
lib/db/schema.ts (source of truth)
        │
        ▼
  drizzle-kit generate
        │
        ▼
lib/db/migrations/
  ├── 0000_burly_darkstar.sql       (initial schema)
  ├── 0001_add_image_to_users.sql
  ├── 0002_silly_victor_mancha.sql
  ├── ...
  └── 0028_tiresome_mauler.sql      (latest)
```

## هيكل دليل الهجرة

```
lib/db/migrations/
├── 0000_burly_darkstar.sql           # Initial schema (16KB - all core tables)
├── 0001_add_image_to_users.sql       # Add image column to users
├── 0002_silly_victor_mancha.sql      # Subscription and payment tables
├── 0003_gigantic_thunderbolts.sql    # Small schema adjustment
├── 0004_big_marrow.sql               # Small schema adjustment
├── 0005_sharp_malcolm_colcord.sql    # Favorites table
├── 0006_giant_the_phantom.sql        # Featured items table
├── 0007_tiresome_true_believers.sql  # Sponsor ads table
├── 0008_add_twenty_crm_singleton_constraint.sql  # CRM singleton
├── 0009_add_integration_mappings.sql # Integration mappings
├── 0010_convert_comments_timestamps_to_timestamptz.sql # Timezone fix
├── 0011_quiet_gravity.sql            # Companies table
├── 0012_purple_vindicator.sql        # Items-companies join
├── 0013_add_surveys_table.sql        # Survey system
├── 0014_fat_madame_masque.sql        # Seed status, item views, audit logs
├── 0015_previous_jack_flag.sql       # Report and moderation tables
├── 0016_solid_stellaris.sql          # Minor adjustment
├── 0017_whole_supreme_intelligence.sql # Minor adjustment
├── 0018_wooden_electro.sql           # Additional indexes
├── 0019_add_subscription_renewal_fields.sql # Auto-renewal support
├── 0020_chunky_naoko.sql             # Minor adjustment
├── 0021_redundant_dragon_lord.sql    # Additional indexes
├── 0022_tidy_dakota_north.sql        # Payment account improvements
├── 0023_boring_silverclaw.sql        # Collection tables
├── 0024_deep_wrecker.sql             # Additional improvements
├── 0025_overconfident_moon_knight.sql # Location features
├── 0026_exotic_clea.sql              # Minor adjustment
├── 0027_minor_mesmero.sql            # Minor adjustment
├── 0028_tiresome_mauler.sql          # Latest migration
├── meta/                             # Drizzle migration metadata
├── relations.ts                      # Drizzle relation definitions
└── schema.ts                         # Snapshot of schema at migration time
```

يحتوي الدليل `meta/` على بيانات تعريف التتبع الداخلية لـ Drizzle Kit. تعتبر الملفات `relations.ts` و`schema.ts` الموجودة في دليل الترحيل لقطات مرجعية ويجب عدم تحريرها يدويًا.

## الأوامر

### إنشاء الهجرة

بعد تعديل `lib/db/schema.ts`، أنشئ عملية ترحيل:

```bash
pnpm db:generate
```

يعمل هذا `drizzle-kit generate` والذي:
1. يقرأ المخطط الحالي من `lib/db/schema.ts`
2. يقارنه مع أحدث لقطة الهجرة
3. يقوم بإنشاء ملف SQL جديد في `lib/db/migrations/`
4. يقوم بتحديث بيانات تعريف الترحيل في `meta/`

### تشغيل عمليات الترحيل المعلقة

قم بتطبيق أي عمليات ترحيل غير مطبقة على قاعدة بياناتك:

```bash
pnpm db:migrate
```

هذا يستدعي `lib/db/migrate.ts` والذي:
1. يتصل بقاعدة البيانات باستخدام `DATABASE_URL`
2. التحقق من جدول `drizzle.__drizzle_migrations` لعمليات الترحيل المطبقة
3. يقوم بتشغيل أي عمليات ترحيل لم يتم تطبيقها
4. تحديث جدول التتبع

### افتح ستوديو دريزل

قم بتشغيل محرر قاعدة البيانات المرئية:

```bash
pnpm db:studio
```

## عداء الهجرة (`lib/db/migrate.ts`)

يعتبر مشغل الترحيل (`runMigrations()`) غير فعال وآمن للاتصال به عند كل بدء تشغيل:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');

  // Log current migration state
  // ...

  // Run migrations (Drizzle automatically skips applied ones)
  await migrate(db, { migrationsFolder: './lib/db/migrations' });

  return true;
}
```

السلوكيات الرئيسية:
- **Idempotent**: Drizzle يتتبع عمليات الترحيل المطبقة في `drizzle.__drizzle_migrations`؛ يتم تخطي عمليات الترحيل المطبقة بالفعل
- **التسجيل**: يُبلغ عن عمليات الترحيل المطبقة مؤخرًا قبل التنفيذ وبعده
- **معالجة الأخطاء**: إرجاع `false` عند الفشل مع رسائل خطأ مفصلة
- **بدء التشغيل التلقائي**: يتم الاتصال به أثناء بدء تشغيل التطبيق عبر `lib/db/initialize.ts`

## الهجرة التلقائية عند بدء التشغيل

يقوم القالب تلقائيًا بتشغيل عمليات الترحيل عند بدء تشغيل التطبيق. يتم تشغيل هذا بواسطة `instrumentation.ts` الذي يستدعي `initializeDatabase()` من `lib/db/initialize.ts`.

تدفق البداية:
1. تحقق من تكوين `DATABASE_URL` (تخطي إذا لم يكن الأمر كذلك)
2. تشغيل جميع عمليات الترحيل المعلقة
3. تحقق مما إذا كانت قاعدة البيانات قد تم زرعها
4. إذا لم يتم تصنيفها، فاحصل على قفل استشاري وقم بتشغيل البذور

في الإنتاج، يؤدي فشل الترحيل إلى حدوث خطأ في الإشارة إلى أنظمة المراقبة. في بيئات التطوير والمعاينة، يستمر التطبيق مع وجود تحذير.

## خلق هجرات جديدة

### الخطوة 1: تعديل المخطط

قم بتحرير `lib/db/schema.ts` لإضافة تعريفات الجدول أو تعديلها أو إزالتها:

```typescript
// Add a new table
export const newTable = pgTable('new_table', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Add a column to an existing table
// Just add the new column to the existing pgTable definition
```

### الخطوة 2: إنشاء الهجرة

```bash
pnpm db:generate
```

يؤدي هذا إلى إنشاء ملف SQL جديد مثل `0029_some_name.sql`.

### الخطوة 3: قم بمراجعة SQL الذي تم إنشاؤه

قم دائمًا بمراجعة الترحيل الذي تم إنشاؤه قبل تطبيقه. تحقق من:
- تصحيح أسماء الجداول والأعمدة
- أنواع البيانات المناسبة والقيود
- تعريفات الفهرس
- العلاقات الرئيسية الخارجية
- أي عمليات تدميرية (DROP TABLE، DROP COLUMN)

### الخطوة 4: تطبيق الترحيل

```bash
pnpm db:migrate
```

### الخطوة 5: الالتزام

تنفيذ كل من تغيير المخطط وملف الترحيل الذي تم إنشاؤه:
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (بيانات التعريف المحدثة)

## سير عمل الفريق

### التعامل مع تغييرات المخطط المتزامنة

عندما يقوم العديد من أعضاء الفريق بتعديل المخطط في وقت واحد:

1. يقوم كل مطور بإنشاء عملية الترحيل الخاصة به محليًا
2. عند الدمج، قد تحتاج ملفات الترحيل إلى إعادة ترقيم في حالة تعارض أرقام التسلسل
3. يقوم Drizzle Kit بتتبع عمليات الترحيل عن طريق التجزئة، وليس عن طريق الرقم، لذلك تتم معالجة التنفيذ خارج الترتيب
4. بعد الدمج، قم بتشغيل `pnpm db:migrate` لتطبيق جميع عمليات الترحيل الجديدة

### اعتبارات البيئة

|البيئة|استراتيجية الهجرة|
|-------------|-------------------|
|التنمية|التشغيل التلقائي عند بدء التشغيل؛ توليد واختبار محليا|
|معاينة/التدريج|التشغيل التلقائي عند النشر عبر `instrumentation.ts`|
|الإنتاج|التشغيل التلقائي عند النشر؛ مراقبة الفشل|

### أفضل الممارسات

1. **أحد الاهتمامات لكل عملية ترحيل**: حافظ على تركيز عمليات الترحيل على ميزة واحدة أو تغيير واحد
2. **لا تقم مطلقًا بتحرير عمليات الترحيل الحالية**: بمجرد تطبيق عملية الترحيل في أي مكان، تعامل معها على أنها غير قابلة للتغيير
3. **مراجعة SQL التي تم إنشاؤها**: تحقق دائمًا مما تنشئه Drizzle Kit قبل التقديم
4. **اختبار عمليات الترحيل**: قم بتشغيل عمليات الترحيل على قاعدة بيانات اختبارية قبل النشر في الإنتاج
5. **تضمين ملفات الترحيل في مراجعة التعليمات البرمجية**: يجب مراجعة Migration SQL تمامًا مثل كود التطبيق
6. **النسخ الاحتياطي قبل عمليات الترحيل المدمرة**: قم دائمًا بالنسخ الاحتياطي قبل تشغيل عمليات الترحيل التي تؤدي إلى إسقاط الجداول أو الأعمدة
