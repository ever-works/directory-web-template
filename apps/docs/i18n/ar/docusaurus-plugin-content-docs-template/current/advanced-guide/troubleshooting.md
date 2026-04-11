---
id: troubleshooting
title: دليل استكشاف الأخطاء وإصلاحها
sidebar_label: استكشاف الأخطاء وإصلاحها
sidebar_position: 7
---

# دليل استكشاف الأخطاء وإصلاحها

يغطي هذا الدليل الأخطاء الشائعة وتقنيات تصحيح الأخطاء وتفسير السجل ومشكلات البيئة الخاصة بقالب Ever Works. يتم تنظيم المشكلات حسب الفئة مع الأعراض والأسباب والحلول.

## بناء القضايا

### لم يتم العثور على الوحدة أثناء الإنشاء

**الأعراض**: فشل الإنشاء بسبب `Module not found: Can't resolve 'postgres'` أو أخطاء مماثلة في الوحدة الأصلية لـ Node.js.

**السبب**: يحاول Webpack تجميع وحدات الخادم فقط لحزمة العميل.

**الحل**: تأكد من إدراج الوحدة في `serverExternalPackages` في `next.config.ts` :

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

إذا قمت بإضافة تبعية جديدة للخادم فقط، فقم بإضافتها إلى هذه المصفوفة.

### انتهت مهلة إنشاء الصفحة الثابتة

**الأعراض**: فشل الإنشاء باستخدام `Error: Timeout of 180000ms exceeded` أثناء الإنشاء الثابت.

**السبب**: الصفحات التي تجلب بيانات خارجية أثناء وقت الإنشاء تتجاوز المهلة المحددة.

**الحل**: يقوم القالب بتعيين مهلة مدتها 3 دقائق:

```typescript
staticPageGenerationTimeout: 180,
```

بالنسبة للصفحات التي تحتاج إلى مزيد من الوقت، قم بزيادة هذه القيمة. وبدلاً من ذلك، قم بتبديل الصفحات البطيئة إلى العرض الديناميكي:

```typescript
export const dynamic = 'force-dynamic';
```

### دليل المحتوى مفقود أثناء الإنشاء

**الأعراض**: فشل الإنشاء لأن `.content/data` غير موجود.

**السبب**: لم يتم استنساخ محتوى نظام إدارة المحتوى المستند إلى Git. يعمل البرنامج النصي 1 أثناء الخطافات 2 و3.

**حل**:

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### تحذيرات Webpack من Supabase، bcryptjs، postgres، stripe

**الأعراض**: يُصدر الإصدار تحذيرات حول هذه الحزم ولكنه يكتمل بنجاح.

**السبب**: التحذيرات المعروفة من الحزم التي تشير إلى واجهات برمجة تطبيقات Node.js غير متوفرة في المتصفح.

**الحل**: تم منعها بالفعل في `next.config.ts` :

```typescript
config.ignoreWarnings = [
	{ module: /@supabase\/realtime-js/ },
	{ module: /@supabase\/supabase-js/ },
	{ module: /bcryptjs/ },
	{ message: /bcryptjs/ },
	{ module: /postgres/ },
	{ module: /stripe/ }
];
```

لا يلزم اتخاذ أي إجراء - فالتحذيرات لا تؤثر على مخرجات البناء.

### نفاد ذاكرة جافا سكريبت

**الأعراض**: إنشاء الأعطال باستخدام `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory` .

**الحل**: خصصت البرامج النصية للإنشاء بالفعل 8 جيجابايت:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

إذا استمرت ذاكرة البناء في النفاد، فتحقق مما يلي:

- إنشاء صفحات ثابتة بشكل مفرط (تقليل الصفحات التي تم إنشاؤها في وقت الإنشاء)
- التبعيات الكبيرة لا تهتز بشكل صحيح
- تسرب الذاكرة في البرامج النصية وقت البناء

## مشكلات قاعدة البيانات

### تم رفض الاتصال بـ PostgreSQL

**الأعراض**: فشل التطبيق مع `connection refused` أو `ECONNREFUSED` أو 2.

**خطوات التشخيص**:

1. تحقق من 3 في 4:
    ``` باش
    العقدة -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.DATABASE_URL ? 'Set' : 'Missing')"
    ```
2. اختبر الاتصال مباشرة: 5
3. تأكد من تشغيل PostgreSQL: `pg_isready` ** الأسباب والإصلاحات الشائعة **:

| السبب | إصلاح |
| ---------------------- | ----------------------------------------------- |
| PostgreSQL لا يعمل | ابدأ الخدمة |
| منفذ خاطئ | تحقق من المنفذ في سلسلة الاتصال الخاصة بك |
| قاعدة بيانات مفقودة | `createdb your_database_name` |
| فشل المصادقة | تحقق من اسم المستخدم/كلمة المرور في `DATABASE_URL` |
| مطلوب SSL | أضف `?sslmode=require` إلى سلسلة الاتصال |

### فشل الترحيل

**الأعراض**: فشل `pnpm db:migrate` بسبب أخطاء المخطط أو SQL.

**الحل**: استخدم أداة ترحيل واجهة سطر الأوامر المطولة لتصحيح الأخطاء:

```bash
pnpm db:migrate:cli
```

هذا يظهر:

1. حالة الترحيل الحالية (قائمة عمليات الترحيل المطبقة)
2. مخرجات تنفيذ الترحيل التفصيلية
3. التحقق من المخطط بعد الترحيل

إذا كانت عمليات الترحيل تالفة، فتحقق من جدول تتبع Drizzle:

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### فشلت تهيئة قاعدة البيانات في الأجهزة

**الأعراض**: تعرض وحدة التحكم الرقم `[Instrumentation] Database initialization failed` عند بدء التشغيل.

**السبب**: يقوم الخطاف `instrumentation.ts` بتشغيل الترحيل والبذر عند بدء التشغيل. يشير الفشل إلى وجود مشكلة في اتصال قاعدة البيانات أو المخطط.

**السلوك حسب البيئة**:

| البيئة | على الفشل |
| ----------- | -------------------------------------- |
| الإنتاج | يلقي خطأ، يخدم النشر 503 |
| التنمية | تحذير السجلات، يبدأ التطبيق لتصحيح الأخطاء |
| معاينة | تحذير السجلات، يبدأ التطبيق لتصحيح الأخطاء |

من 2:

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### البذور عالقة في حالة "البذر".

**الأعراض**: سجلات التطبيق `[DB Init] Another instance is seeding` بشكل متكرر.

**السبب**: تعطلت عملية أولية سابقة دون تحديث الحالة.

**الحل**: يتعامل رمز التهيئة تلقائيًا مع البذور القديمة بعد 5 دقائق:

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

لحل المشكلة فورًا، قم بتحديث حالة البذور يدويًا:

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

ثم أعد تشغيل التطبيق.

## مشكلات المصادقة

### لم يتم تعيين AUTH_SECRET

**الأعراض**: يتعطل التطبيق بسبب `AUTH_SECRET is not set` أو أخطاء في الجلسة.

**حل**:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### عدم تطابق عنوان URL لرد اتصال OAuth

**الأعراض**: يقوم تسجيل دخول OAuth بإعادة التوجيه إلى صفحة خطأ تحتوي على `redirect_uri_mismatch` .

**الحل**: يجب أن يتطابق عنوان URL لرد الاتصال في وحدة تحكم موفر OAuth تمامًا مع ما يلي:

| مقدم | عنوان URL لرد الاتصال |
| -------- | --------------------------------------------------- |
| جوجل | `https://yourdomain.com/api/auth/callback/google` |
| جيثب | `https://yourdomain.com/api/auth/callback/github` |
| فيسبوك | `https://yourdomain.com/api/auth/callback/facebook` |
| تويتر | 4ـ |

للتنمية المحلية، استخدم 5.

### عدم ظهور موفري OAuth

**الأعراض**: يتم عرض تسجيل الدخول ببيانات الاعتماد فقط، وأزرار OAuth مفقودة.

**السبب**: يعود موفرو OAuth إلى وضع التعطيل في حالة فشل التكوين. من 6:

```typescript
} catch (error) {
  // Fallback to credentials only
  return createNextAuthProviders({
    credentials: { enabled: true },
    google: { enabled: false },
    github: { enabled: false },
    facebook: { enabled: false },
    twitter: { enabled: false },
  });
}
```

**الحل**: تأكد من تعيين كل من `CLIENT_ID` و `CLIENT_SECRET` لكل مزود. يتحقق البرنامج النصي للتحقق من البيئة من صحة أزواج OAuth:

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### انتهاء صلاحية الجلسات بشكل غير متوقع

**الأسباب الشائعة**:

| السبب | الحل |
| ---------------------- | ---------------------------------------------------- |
| `AUTH_SECRET` تم التغيير | تغيير السر يبطل كافة الجلسات |
| مجال ملف تعريف الارتباط غير متطابق | اضبط `COOKIE_DOMAIN` ليتوافق مع مجال النشر الخاص بك |
| عدم تطابق HTTPS | اضبط `COOKIE_SECURE=false` لتطوير HTTP المحلي |

## مشكلات النشر

### فشل بناء Vercel ولكن نجح البناء المحلي

**قائمة المراجعة**:

1. تم تعيين كافة متغيرات البيئة المطلوبة في لوحة تحكم Vercel
2. يمكن الوصول إليه من شبكة Vercel
3. إصدار Node.js متوافق (يتطلب الإصدار 20.19.0 أو أعلى)
4. دليل المحتوى موجود (يقوم CI بإنشاء 4 تلقائيًا)
5. تخصيص الذاكرة كافية

### عدم تنفيذ مهام Vercel cron

**الأعراض**: نقاط النهاية المجدولة في `vercel.json` لا تعمل.

**خطوات التشخيص**:

1. تحقق من وجود `vercel.json` في جذر المشروع بالمسارات الصحيحة:
    ```json
    { "المسار": "/api/cron/sync"، "الجدول الزمني": "0 3 * * *" }
    ```
2. تأكد من أن خطة Vercel تدعم cron (Pro أو Enterprise)
3. تحقق من لوحة معلومات Vercel ضمن علامة التبويب Cron Jobs للحصول على سجلات التنفيذ
4. اختبر نقطة النهاية يدويًا: 7

### فشل ترحيل وقت البناء في Vercel

**الأعراض**: يظهر سجل البناء 8.

**السلوك**: يعالج البرنامج النصي 9 سيناريوهات مختلفة:

- **الإنتاج**: جميع حالات الفشل تؤدي إلى فشل البناء
- **المعاينة مع خطأ في الاتصال**: تستمر عملية الإنشاء مع ظهور تحذير
- **المعاينة مع خطأ في المصادقة**: فشل الإنشاء (تكوين خاطئ)

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

لتخطي عمليات ترحيل وقت البناء بالكامل:

```bash
SKIP_BUILD_MIGRATIONS=true
```

## قضايا التدويل

### تظهر مفاتيح الترجمة بدلاً من النص

**الأعراض**: تعرض الصفحات `common.WELCOME` بدلاً من "مرحبًا".

**الحل**:

1. تأكد من وجود ملف الترجمة: `messages/<locale>.json` 2. تأكد من تطابق مسار المفتاح مع مساحة الاسم المستخدمة في "2".
3. يستخدم النظام الاحتياطي `deepmerge` لدمج الرسائل المحلية مع الإعدادات الافتراضية باللغة الإنجليزية:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

إذا كان هناك مفتاح مفقود من الملف المحلي، فيجب أن يوفره البديل الإنجليزي.

### يُرجع التوجيه المحلي 404

**الأعراض**: تعرض عناوين URL مثل `/fr/discover` صفحة 404.

**الحل**: تحقق من أن اللغة موجودة في المصفوفة 1 في 2:

```typescript
export const LOCALES = [
	'en',
	'fr',
	'es',
	'de',
	'zh',
	'ar',
	'he',
	'ru',
	'uk',
	'pt',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'hi',
	'id',
	'bg'
] as const;
```

وتحقق من تكوين التوجيه في `i18n/routing.ts` :

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## تفسير السجل

### بادئات السجل

| البادئة | المصدر | الموقع |
| ------------------- | ----------------------------------- | -------------------------- |
| `[Instrumentation]` | بدء تشغيل التطبيق (DB init، Sentry) | `instrumentation.ts` |
| `[Migration]` | تنفيذ ترحيل قاعدة البيانات | `lib/db/migrate.ts` |
| 4ـ | تهيئة قاعدة البيانات والبذر | 5 ــ |
| 6ـ | وقت البناء النصي للهجرة | `scripts/build-migrate.ts` |
| 8ـ | أخطاء في جلب بيانات تخطيط الجذر | `app/[locale]/layout.tsx` |

### علامات خطأ الحراسة

تتضمن أخطاء الحراسة من الأجهزة العلامات التالية للتصفية:

| العلامة | القيم |
| ------------- | ----------------------------------------- |
| `component` | `instrumentation` |
| ‹‹١٢› | 13 ــ |
| 14 ــ | 15 أو 16 أو 17 |

## أوامر التشخيص

| مهمة | الأمر |
| ------------------------ | ----------------------------------- |
| تحقق من أخطاء TypeScript | 18 ــ |
| تشغيل لينتر | 19 ــ |
| التحقق من صحة البيئة | 20 ــ |
| فحص سريع للبيئة | ‹٢١› |
| اختبار الاتصال بقاعدة البيانات | ‹٢٢› |
| عرض حالة الترحيل | ‹٢٣› |
| توليد هجرات جديدة | ‹٢٤› |
| تطبيق عمليات الترحيل المعلقة | 25 ــ |
| قاعدة بيانات البذور | ‹٢٦› |
| تنظيف ذاكرة التخزين المؤقت للبناء | ‹٢٧› |
| إعادة بناء كاملة | 28 ــ |
| إعادة ضبط قاعدة البيانات | ‹٢٩› |

## الحصول على المساعدة

1. ابحث عن [مشكلات GitHub](https://github.com/ever-works/directory-web-template/issues)
2. قم بمراجعة الملف 30 للحصول على إرشادات التطوير بمساعدة الذكاء الاصطناعي
3. تحقق من لوحة معلومات Sentry للحصول على تفاصيل الخطأ (إذا تم تكوينها)
4. بالنسبة للمشكلات الأمنية، أرسل بريدًا إلكترونيًا إلىsecurity@ever.co على انفراد
