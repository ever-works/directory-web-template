---
id: mappers-system
title: "نظام الخرائط"
sidebar_label: "نظام الخرائط"
sidebar_position: 48
---

# نظام الخرائط

## نظرة عامة

يوفر نظام Mappers System وظائف تحويل نقية وخالية من الآثار الجانبية تعمل على تحويل نماذج بيانات التطبيق الداخلية إلى حمولات CRM (إدارة علاقات العملاء) الخارجية. حاليًا، يقوم بتنفيذ مصممي الخرائط لتكامل Twenty CRM، وتحويل `ClientProfile` و`Company` الكيانات إلى `Person` و@@TOK002@@@ والحمولات النافعة مع تعيين الحقول الآمنة الخالية والتحقق من صحة الحقول المطلوبة.

## الهندسة المعمارية

توجد وحدة مصممي الخرائط في `lib/mappers/` وتتبع نمطًا صارمًا لفصل الاهتمامات:

- **مصممو الخرائط** عبارة عن وظائف خالصة: لا يوجد إدخال/إخراج، ولا استدعاءات لقاعدة البيانات، ولا طلبات HTTP.
- **الخدمات** (في `lib/services/`) تستهلك مصممي الخرائط لإعداد البيانات قبل إرسالها إلى واجهات برمجة التطبيقات الخارجية.
- **الأنواع** يتم استيرادها من مخطط قاعدة البيانات (`lib/db/schema`) وتعريفات أنواع CRM (`lib/types/twenty-crm-entities.types`).

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

تدفق البيانات هو:

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## مرجع واجهة برمجة التطبيقات

### الصادرات من `lib/mappers/twenty-crm.mapper.ts`

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

التحقق من أن معرف الكيان موجود وغير فارغ. يعد هذا فحصًا أمنيًا مهمًا يضمن أن كل سجل CRM يحتوي على `external_id` صالح للربط بالنظام المحلي.

**المعلمات:**
- `id` - معرف الكيان المحلي (قد يكون غير محدد أو فارغًا)
- `entityType` - اسم نوع الكيان لرسائل الخطأ (على سبيل المثال، `'ClientProfile'`)

**المرتجعات:** سلسلة معرف مشذبة

**الرميات:** `Error` إذا كان المعرف مفقودًا أو فارغًا أو غير محدد أو سلسلة فارغة.

#### `extractCityFromLocation(location: string | undefined | null): string | null`

يوزع سلسلة موقع ذات شكل حر لاستخراج اسم المدينة. يتعامل مع التنسيقات المختلفة عن طريق التقسيم على الفواصل وأخذ الجزء الأول.

**الصيغ المدعومة:**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**المرتجعات:** اسم المدينة أو `null` إذا كان الموقع فارغًا/غير محدد.

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

يقوم بتعيين كيان قاعدة بيانات `ClientProfile` محلي إلى حمولة Twenty CRM `Person`.

** رسم الخرائط الميدانية: **

|حقل ملف تعريف العميل|حقل عشرين شخصًا|مطلوب|
|--------------------|--------------------|----------|
|`id`|`external_id`|نعم (رمية إذا كانت مفقودة)|
|`name`|`name`|نعم|
|`email`|`email`|نعم|
|`phone`|`phone`|اختياري|
|`jobTitle`|`job_title`|اختياري|
|`company`|`company_name`|اختياري|
|`website`|`website`|اختياري|
|`location`|`city` (مستخرج)|اختياري|
|`accountType`|`account_type`|اختياري|
|`plan`|`plan`|اختياري|
|`totalSubmissions`|`total_submissions`|اختياري|

**المرتجعات:** كائن `TwentyPerson` يحتوي على الحقول المملوءة فقط.

**الرميات:** `Error` إذا كان `clientProfile.id` مفقودًا.

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

يقوم بتعيين كيان `Company` محلي إلى حمولة Twenty CRM `Company`.

** رسم الخرائط الميدانية: **

|مجال الشركة|مجال الشركة العشرين|مطلوب|
|--------------|---------------------|----------|
|`id`|`external_id`|نعم (رمية إذا كانت مفقودة)|
|`name`|`name`|نعم|
|`domain`|`domain_name`|اختياري|
|`website`|`website`|اختياري|
|`status`|`status`|اختياري|

**المرتجعات:** كائن `TwentyCompany` يحتوي على الحقول المملوءة فقط.

**الرميات:** `Error` إذا كان `company.id` مفقودًا.

## تفاصيل التنفيذ

** التعيين الآمن تمامًا **: تستخدم الحقول الاختيارية عمليات فحص صريحة `if` قبل التعيين، مما يضمن عدم إرسال `null` و`undefined` والقيم الفارغة إلى CRM أبدًا. يؤدي هذا إلى الحفاظ على نظافة الحمولات وتجنب الكتابة فوق بيانات CRM الحالية بقيم فارغة.

**فرض المعرف الخارجي**: يستدعي كل مصمم خرائط `ensureExternalId()` كأول عملية له. يؤدي هذا إلى ظهور معرفات غير صالحة على الفور، باتباع نمط الفشل السريع الذي يمنع السجلات المعزولة في نظام إدارة علاقات العملاء (CRM).

**لا توجد تغييرات**: تعمل وظائف مخطط الخرائط على إنشاء كائنات جديدة بدلاً من تعديل الإدخال. لا يتم تغيير كائن الإدخال `ClientProfile` أو `Company` أبدًا.

** تقليم الحقل الاختياري **: تتم إضافة الحقول إلى كائن الإخراج فقط عندما تحتوي على قيم صحيحة. يؤدي هذا إلى إنتاج الحد الأدنى من الحمولات التي تعمل فقط على تحديث الحقول غير الخالية في نظام إدارة علاقات العملاء (CRM).

**استرشادي لاستخراج المدينة**: تستخدم وظيفة `extractCityFromLocation()` أسلوبًا بسيطًا للتقسيم بفواصل. يتعامل هذا مع تنسيقات الموقع الأكثر شيوعًا (المدينة، المدينة + الولاية، المدينة + الولاية + البلد) ولكنه لا يحاول تحليل تنسيقات العناوين المعقدة.

## التكوين

لا يوجد تكوين مطلوب. إن مصممي الخرائط عبارة عن وظائف خالصة تعتمد فقط على أنواع المدخلات الخاصة بهم. تتم إدارة تكوين اتصال Twenty CRM (عنوان URL لواجهة برمجة التطبيقات، والرموز المميزة) بواسطة طبقة خدمة التكامل.

## أمثلة الاستخدام

```typescript
import {
  mapClientProfileToPerson,
  mapCompanyToTwentyCompany,
  ensureExternalId,
  extractCityFromLocation,
} from '@/lib/mappers/twenty-crm.mapper';

// Map a client profile to a CRM person
const clientProfile = await db.query.clientProfiles.findFirst({
  where: eq(clientProfiles.id, userId),
});

const personPayload = mapClientProfileToPerson(clientProfile);
// {
//   external_id: "usr_abc123",
//   name: "Jane Doe",
//   email: "jane@example.com",
//   job_title: "CTO",
//   company_name: "Acme Corp",
//   city: "San Francisco",
//   plan: "premium",
// }

// Map a company to a CRM company
const company = await db.query.companies.findFirst({
  where: eq(companies.id, companyId),
});

const companyPayload = mapCompanyToTwentyCompany(company);
// {
//   external_id: "comp_xyz789",
//   name: "Acme Corp",
//   domain_name: "acme.com",
//   website: "https://acme.com",
//   status: "active",
// }

// Use utility functions independently
const city = extractCityFromLocation("Berlin, Germany");
// "Berlin"

const validId = ensureExternalId(user.id, "User");
// "usr_abc123" or throws Error
```

## أفضل الممارسات

- استخدم دائمًا وظائف مخطط الخرائط بدلاً من إنشاء حمولات CRM يدويًا لضمان تسمية الحقول المتسقة والسلامة الخالية.
- تعامل مع `Error` التي تم إلقاؤها بواسطة `ensureExternalId()` في طبقة الخدمة؛ قم بتسجيله وتخطي مزامنة CRM لهذا السجل بدلاً من تعطل الدفعة بأكملها.
- عند إضافة حقول جديدة إلى مخطط، اتبع النمط الموجود: تحقق من الصدق قبل التعيين إلى كائن الإخراج.
- اكتب اختبارات الوحدة لمصممي الخرائط نظرًا لأنها وظائف خالصة بدون تبعيات، مما يسهل اختبارها بشكل منفصل.
- إذا كانت هناك حاجة إلى تكامل CRM جديد، فقم بإنشاء ملف مخطط جديد (على سبيل المثال، `hubspot.mapper.ts`) في نفس الدليل باتباع نفس الأنماط.

## الوحدات ذات الصلة

- [نظام إدارة التكوين](./config-manager-system) - تكوين التكامل عبر `configService.integrations`
- [طبقة عميل API](/template/architecture/api-client-layer) - عميل HTTP الذي تستخدمه خدمات CRM
