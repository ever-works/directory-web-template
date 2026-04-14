---
id: config-manager-system
title: "نظام إدارة التكوين"
sidebar_label: "نظام إدارة التكوين"
sidebar_position: 41
---

# نظام إدارة التكوين

## نظرة عامة

يوفر نظام إدارة التكوين طبقتين تكوين متكاملتين: فئة **ConfigManager** (`lib/config-manager.ts`) لإدارة ملف تكوين المحتوى المستند إلى YAML (`config.yml`) مع استمرارية مدعومة بـ Git، و**ConfigService** (`lib/config/`) للتحقق من تكوين التطبيق المستند إلى متغير البيئة والوصول إليه باستخدام مخططات Zod. وهي تغطي معًا كلاً من الإعدادات القابلة للتحرير في وقت التشغيل وتكوين بيئة وقت النشر.

## الهندسة المعمارية

وينقسم النظام إلى نظامين فرعيين متميزين:

### ConfigManager (يعتمد على YAML، وقابل للتحرير في وقت التشغيل)

`lib/config-manager.ts` يدير ملف `config.yml` داخل الدليل `.content/` (المستنسخ من مستودع البيانات). يقرأ ويكتب تكوين YAML، وينفذ التغييرات تلقائيًا ويدفعها إلى مستودع Git باستخدام `isomorphic-git`. يُستخدم هذا للإعدادات التي يمكن للمسؤولين تغييرها في وقت التشغيل (ترقيم الصفحات، التنقل، الرأس/التذييل).

### ConfigService (قائمة على البيئة، تم التحقق من صحة بدء التشغيل)

`lib/config/` يوفر رقمًا مفردًا تم التحقق من صحته بواسطة Zod يقرأ جميع متغيرات البيئة عند بدء التشغيل وينظمها في أقسام مكتوبة: الأساسية، والمصادقة، والبريد الإلكتروني، والدفع، والتحليلات، والتكاملات. يتضمن أعلام الميزات وأدوات الكشف عن البيئة والصادرات القابلة للاهتزاز.

```
config-manager.ts       --> Runtime YAML config (config.yml)
lib/config/
  index.ts              --> Barrel exports
  config-service.ts     --> Singleton ConfigService class
  types.ts              --> Type definitions
  env.ts                --> Zod-validated env variables
  feature-flags.ts      --> Database-dependent feature toggles
  schemas/              --> Zod schemas per section
  client.ts             --> Client-safe config exports
```

## مرجع واجهة برمجة التطبيقات

### مدير التكوين (`lib/config-manager.ts`)

#### أنواع

```typescript
interface PaginationConfig {
  type: 'standard' | 'infinite';
  itemsPerPage: number;
}

interface AppConfig {
  pagination: PaginationConfig;
  [key: string]: any;
}
```

#### `configManager` (سينجلتون)

المثيل الفردي المُصدَّر الافتراضي لـ `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

إرجاع كائن التكوين الكامل، ودمج محتويات الملف مع الإعدادات الافتراضية.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

إرجاع قيمة التكوين ذات المستوى الأعلى حسب المفتاح.

#### `configManager.getNestedValue(keyPath: string): any`

إرجاع قيمة تكوين متداخلة باستخدام التدوين النقطي (على سبيل المثال، `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

يقوم بتحديث مفتاح المستوى الأعلى ويستمر في الملف + Git.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

يقوم بتحديث مفتاح متداخل باستخدام التدوين النقطي. يتضمن النموذج الأولي للحماية من التلوث.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

طريقة ملائمة لتحديث إعدادات ترقيم الصفحات.

#### `configManager.getPaginationConfig(): PaginationConfig`

إرجاع تكوين ترقيم الصفحات الحالي.

### خدمة التكوين (`lib/config/config-service.ts`)

#### `configService` (سينجلتون)

وحدة مفردة للخادم فقط تتحقق من صحة كافة متغيرات البيئة عند بدء التشغيل.

|الملكية|اكتب|الوصف|
|----------|------|-------------|
|`configService.core`|`CoreConfig`|عناوين URL، معلومات الموقع، قاعدة البيانات|
|`configService.auth`|`AuthConfig`|الأسرار، موفري OAuth|
|`configService.email`|`EmailConfig`|SMTP، إعادة الإرسال، نوفو|
|`configService.payment`|`PaymentConfig`|شريط، ليمون سكويزي، بولار|
|`configService.analytics`|`AnalyticsConfig`|PostHog، Sentry، Recaptcha|
|`configService.integrations`|`IntegrationsConfig`|Trigger.dev، عشرين إدارة علاقات العملاء|

#### علامات الميزة (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

يتم تمكين الميزات (التقييمات والتعليقات والمفضلات والعناصر المميزة والاستطلاعات) عند تكوين `DATABASE_URL`.

#### مرافق البيئة (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## تفاصيل التنفيذ

**قائمة انتظار عمليات Git**: `ConfigManager` تستخدم قائمة انتظار تسلسلية بنمط كائن المزامنة (mutex) لمنع عمليات Git المتزامنة. عند استدعاء `writeConfig()`، يتم حفظ الملف على الفور، ويتم وضع التزام/دفع Git في قائمة الانتظار. إذا فشلت عمليات Git، فسيظل حفظ الملف ناجحًا.

**تبعيات Git المحملة بشكل بطيء**: `isomorphic-git` يتم تحميل وحدة HTTP الخاصة بها ببطء عبر `import()` الديناميكي بنمط مفرد لتجنب مشكلات التجميع ومنع عمليات الاستيراد المكررة.

**حماية النموذج الأولي من التلوث**: تقوم طريقة `updateNestedKey()` بالتحقق من مفاتيح `__proto__` و`constructor` و`prototype` في كل مستوى من المسار لمنع هجمات تلوث النموذج الأولي.

**التحقق من صحة بدء التشغيل**: `ConfigService` يتحقق من صحة جميع متغيرات البيئة باستخدام مخططات Zod أثناء الاستيراد الأول. يؤدي التكوين غير الصالح إلى فشل بدء التشغيل مع ظهور رسائل خطأ وصفية. تستخدم المخططات معالجات `.catch()` للتدهور السلس في الحقول الاختيارية.

**التنفيذ على الخادم فقط**: `config-service.ts` يقوم باستيراد `'server-only'` لمنع التضمين غير المقصود في حزم العميل. يتم تصدير التكوين الآمن للعميل بشكل منفصل من `lib/config/client.ts`.

## التكوين

### متغيرات البيئة مدير التكوين

|متغير|مطلوب|الوصف|
|----------|----------|-------------|
|`DATA_REPOSITORY`|نعم|عنوان URL لمستودع Git للمحتوى|
|`GH_TOKEN`|لجيت دفع|رمز الوصول إلى جيثب|
|`GITHUB_BRANCH`|لا|اسم الفرع (الافتراضي: `main`)|
|`GIT_NAME`|لا|اسم المرسل (الافتراضي: `Website Bot`)|
|`GIT_EMAIL`|لا|البريد الإلكتروني للمتعهد (الافتراضي: `website@ever.works`)|

### متغيرات البيئة ConfigService

راجع `.env.example` للحصول على القائمة الكاملة. تتضمن الأقسام الرئيسية `AUTH_SECRET`، `DATABASE_URL`، `STRIPE_*`، `POSTHOG_*`، `RESEND_*`، وغيرها من الأقسام التي تم التحقق من صحتها بواسطة مخططات Zod.

## أمثلة الاستخدام

```typescript
// Runtime config (YAML)
import { configManager } from '@/lib/config-manager';

// Read pagination settings
const pagination = configManager.getPaginationConfig();
console.log(pagination.type); // 'standard' | 'infinite'

// Update pagination
await configManager.updatePagination('infinite', 24);

// Update a nested key
await configManager.updateNestedKey('custom_header', [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]);

// Environment config (validated)
import { configService, coreConfig, paymentConfig } from '@/lib/config';

const appUrl = coreConfig.APP_URL;
const stripeEnabled = paymentConfig.stripe.enabled;

// Feature flags
import { isFeatureEnabled } from '@/lib/config';

if (isFeatureEnabled('comments')) {
  // Render comments section
}
```

## أفضل الممارسات

- استخدم `configManager` للإعدادات التي يلزم تغييرها في وقت التشغيل بواسطة المسؤولين دون إعادة النشر.
- استخدم `configService` لتكوين وقت النشر الذي يجب التحقق من صحته عند بدء التشغيل.
- قم باستيراد التكوين الآمن للعميل من `@/lib/config/client` في مكونات العميل، وليس من تصدير البرميل الرئيسي أبدًا.
- تعامل دائمًا مع الإرجاع `Promise<boolean>` من `updateKey` و`updateNestedKey` لاكتشاف حالات فشل الكتابة.
- استخدم علامات الميزات لتقليل الأداء الوظيفي بشكل أنيق عندما لا يتم تكوين التبعيات الاختيارية (مثل قاعدة البيانات).

## الوحدات ذات الصلة

- [نظام التخزين المؤقت](./cache-system) - يستخدم `CACHE_TAGS.CONFIG` للتخزين المؤقت للتكوين
- [نظام الحراس](./guards-system-deep-dive) - يستهلك تكوين الخطة/الميزة
- [مكتبة المحتوى](/template/architecture/content-library) - دقة مسار المحتوى المستخدمة بواسطة ConfigManager
