---
id: surveys
title: نظام المسوحات
sidebar_label: المسوحات
sidebar_position: 11
---

#نظام الاستطلاعات

يشتمل قالب Ever Works على نظام استطلاعات مدمج يدعم كلاً من الاستطلاعات العالمية (التعليقات على مستوى الموقع) والاستطلاعات الخاصة بالعناصر (المرفقة بعناصر الدليل الفردية). تتم إدارة الاستطلاعات من خلال لوحة تحكم المشرف ويتم جمع الردود من المستخدمين المعتمدين.

## بنيان

```
Surveys System
  |
  +-- SurveyService (lib/services/survey.service.ts)
  |     Server-side business logic singleton
  |
  +-- Database Queries (lib/db/queries/)
  |     Survey and response CRUD operations
  |
  +-- Admin Pages (app/[locale]/admin/surveys/)
  |     Create, edit, preview, publish, view responses
  |
  +-- API Client (lib/api/survey-api.client.ts)
  |     Client-side API wrapper
  |
  +-- Database Schema (lib/db/schema.ts)
        surveys + survey_responses tables
```

## أنواع الاستطلاع

| اكتب | الوصف | حالة الاستخدام |
|------|------------|----------|
| **عالمي** | استطلاع على مستوى الموقع، غير مرتبط بأي عنصر | تعليقات عامة، استطلاعات NPS، رضا المستخدمين |
| **عنصر محدد** | مرتبط بعنصر محدد عبر `itemId` | تعليقات حول المنتج، ومراجعات الخدمة، وطلبات الميزات |

## خدمة المسح

تتعامل الفئة 1 (2) مع كل منطق الأعمال. إنها خدمة من جانب الخادم فقط (لا تقم باستيراد مكونات العميل).

### العمليات الخام

| الطريقة | الوصف |
|--------|------------|
| `create(data)` | قم بإنشاء استطلاع جديد باستخدام سبيكة يتم إنشاؤها تلقائيًا |
| 4ـ | الحصول على المسح عن طريق معرف |
| 5 ــ | احصل على استطلاع بواسطة سبيكة صديقة لعنوان URL |
| 6ـ | قم بإدراج الاستطلاعات مع ترقيم الصفحات والتصفية وحالة الإكمال |
| `update(id, data)` | تحديث حقول الاستطلاع والتعامل مع انتقالات الحالة |
| 8ـ | حذف الاستطلاع (يتم حظره في حالة وجود ردود) |

### عمليات الاستجابة

| الطريقة | الوصف |
|--------|------------|
| `submitResponse(data)` | إرسال رد على الاستطلاع (التحقق من صحة نشر الاستطلاع) |
| `getResponses(surveyId, filters?)` | احصل على ردود مرقّمة للاستطلاع |
| `getResponseById(id)` | احصل على رد واحد |

### جيل سبيكة

يتم إنشاء الارتباطات الثابتة للاستطلاع تلقائيًا من العنوان بدعم Unicode:

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

تضمن الخدمة تفرد البزاقة عن طريق إضافة عداد في حالة اكتشاف تصادم.

## دورة حياة المسح

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

| الحالة | الوصف |
|--------|------------|
| `draft` | يتم الآن تحرير الاستطلاع، وهو غير مرئي للمستخدمين |
| `published` | الاستطلاع مباشر ويقبل الردود |
| `closed` | الاستطلاع لم يعد يقبل الردود |

تقوم انتقالات الحالة بتحديث الطوابع الزمنية للبيانات التعريفية:

- ضبط الحالة على 3  يضبط 4
- ضبط الحالة على 5 مجموعات 6

## بنية بيانات المسح

تستخدم الاستطلاعات تعريف السؤال المستند إلى JSON والمخزن في العمود "7". وهذا يسمح بهياكل مسح مرنة دون تغييرات في المخطط.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: 'global' | 'item';
  itemId?: string;          // Required when type is 'item'
  status?: 'draft' | 'published' | 'closed';
  surveyJson: object;       // Question definitions
}
```

### هيكل الاستجابة للمسح

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;          // Authenticated user ID
  itemId?: string;          // Item ID for item-specific surveys
  data: object;             // Response data matching surveyJson
  ipAddress?: string;       // For rate limiting
  userAgent?: string;       // For analytics
}
```

## إدارة المشرف

توفر صفحات استطلاع المشرف واجهة إدارة دورة حياة كاملة:

### طرق الإدارة

| الطريق | الوصف |
|-------|------------|
| `/admin/surveys` | قائمة الاستطلاع مع علامات تبويب الحالة |
| `/admin/surveys/create` | نموذج إنشاء استطلاع جديد |
| `/admin/surveys/[slug]/edit` | تحرير الاستطلاع الموجود |
| `/admin/surveys/[slug]/preview` | معاينة الاستبيان قبل النشر |
| 4ـ | عرض وتحليل الردود |

### قدرات المشرف

- **إنشاء استطلاعات** بالعنوان والوصف والنوع والسؤال JSON
- **تحرير الاستطلاعات** في حالة المسودة أو المنشورة
- **معاينة** قبل النشر للتأكد من المظهر
- **نشر/إغلاق** الاستطلاعات للتحكم في جمع الردود
- **عرض الردود** مع التصفية وترقيم الصفحات
- **حذف الاستطلاعات** (فقط في حالة عدم جمع أي ردود)

تدعم الطريقة 5 الاستعلام الفعال مع:

- **عد الردود** عبر SQL JOINs (استعلام واحد، لا يوجد N+1)
- **حالة الإكمال** لكل مستخدم (تُظهر ما إذا كان المستخدم الحالي قد استجاب بالفعل)
- **ترقيم الصفحات** مع معلمات الصفحة/الحد
- **التصفية** حسب الحالة والنوع

## معالجة الأخطاء

تتضمن الخدمة معالجة قوية للأخطاء لمشكلات قاعدة البيانات الشائعة:

| حالة الخطأ | السلوك |
|----------------|---------|
| لم يتم العثور على الجدول | رسالة واضحة: "تشغيل عمليات ترحيل قاعدة البيانات" |
| تم رفض الاتصال | "فشل الاتصال بقاعدة البيانات" |
| DATABASE_URL مفقود | "لم يتم تكوين قاعدة البيانات" |
| لم يتم العثور على الاستطلاع | خطأ في النمط 404 |
| لم يتم نشر الاستطلاع | "الاستطلاع [الحالة] ولا يقبل الردود" |
| الحذف مع الردود | "لا يمكن حذف الاستطلاع الذي يحتوي على استجابات N" |

## أعلام مميزة

يتم التحكم في الاستطلاعات من خلال نظام أعلام الميزات. يتم تمكين العلامة `surveys` تلقائيًا عند تكوين `DATABASE_URL` :

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## الاستخدام من جانب العميل

تستخدم مكونات العميل مجمّع عميل API بدلاً من الخدمة مباشرةً:

```typescript
// Use in client components
import { surveyApiClient } from '@/lib/api/survey-api.client';

// Fetch surveys
const surveys = await surveyApiClient.getMany({ status: 'published' });

// Submit response
await surveyApiClient.submitResponse({
  surveyId: 'survey-uuid',
  data: { rating: 5, feedback: 'Great!' },
});
```

## اختبار E2E

تتم تغطية الاستطلاعات بواسطة ملفات اختبار E2E متعددة:

- `e2e/tests/admin/surveys.spec.ts` -- سير عمل الإدارة الإدارية
- `e2e/tests/public/surveys.spec.ts` -- عرض وتقديم الاستطلاع العام
- `e2e/page-objects/admin/surveys.page.ts` -- كائن صفحة استطلاع المسؤول

## الملفات ذات الصلة

- `lib/services/survey.service.ts` -- خدمة منطق الأعمال
- 4 - تعريفات الجدول 5 و 6
- `lib/db/queries/` -- مسح استعلامات قاعدة البيانات
- `lib/types/survey.ts` -- تعريفات أنواع TypeScript
- 9 - - غلاف واجهة برمجة التطبيقات (API) من جانب العميل
- `app/[locale]/admin/surveys/` -- صفحات الإدارة
- `components/admin/` -- مكونات واجهة المستخدم الإدارية
- `e2e/tests/admin/surveys.spec.ts` -- اختبارات المشرف E2E
- `e2e/tests/public/surveys.spec.ts` -- اختبارات E2E العامة
