---
id: survey-endpoints-deep-dive
title: "مرجع API للاستطلاعات"
sidebar_label: "المسوحات (الغوص العميق)"
sidebar_position: 56
---

# مرجع API للاستطلاعات

## نظرة عامة

توفر Surveys API عمليات CRUD كاملة للاستطلاعات وإجاباتها. يمكن أن تكون الاستطلاعات عامة أو خاصة بعنصر معين، وتدعم حالات دورة الحياة المسودة/المنشورة/المغلقة. يتطلب إنشاء الاستطلاع وتحديثه وحذفه مصادقة المسؤول، بينما يمكن للمستخدمين العموميين عرض الاستطلاعات المنشورة وإرسال الردود.

## نقاط النهاية

### الحصول على /api/surveys

استرجع الاستطلاعات باستخدام المرشحات الاختيارية وترقيم الصفحات. التحقق من توفر قاعدة البيانات قبل المعالجة.

**طلب**

|المعلمة|اكتب|في|الوصف|
| --------- | ------- | ----- | --------------------------------------------------------- |
|اكتب|سلسلة|الاستعلام|التصفية حسب النوع: `"global"` أو `"item"`|
|معرف العنصر|سلسلة|الاستعلام|التصفية حسب معرف العنصر|
|الحالة|سلسلة|الاستعلام|التصفية حسب الحالة: `"draft"` أو `"published"` أو `"closed"`|
|الصفحة|عدد صحيح|الاستعلام|رقم الصفحة (الافتراضي: 1، الحد الأدنى: 1)|
|الحد|عدد صحيح|الاستعلام|العناصر في كل صفحة (الافتراضي: 10، الحد الأدنى: 1، الحد الأقصى: 100)|

** الرد **

```typescript
{
  success: true;
  data: {
    surveys: Array<Survey>;
    total: number;
    totalPages: number;
    page: number;
  }
}
```

**مثال**

```typescript
const response = await fetch(
  "/api/surveys?type=global&status=published&page=1&limit=10",
);
const { data } = await response.json();
// data.surveys = [{ id: "...", title: "User Satisfaction", type: "global", ... }]
```

### ما بعد /api/الاستطلاعات

إنشاء استطلاع جديد. يتطلب مصادقة المسؤول.

**طلب**

```typescript
{
  title: string;              // Required
  description?: string;
  type: "global" | "item";    // Required
  itemId?: string;            // Required if type is "item"
  status?: "draft" | "published" | "closed";
  surveyJson: object;         // Required -- SurveyJS-compatible JSON definition
}
```

** الرد **

```typescript
{
  success: true;
  data: Survey; // The created survey object
}
```

**مثال**

```typescript
const response = await fetch("/api/surveys", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "User Satisfaction Survey",
    type: "global",
    status: "draft",
    surveyJson: {
      pages: [
        {
          elements: [
            {
              type: "rating",
              name: "satisfaction",
              title: "How satisfied are you?",
            },
          ],
        },
      ],
    },
  }),
});
const { data: survey } = await response.json();
```

### احصل على `/api/surveys/{surveyId}`

استرداد استبيان محدد عن طريق المعرف أو سبيكة. الاستطلاعات غير المنشورة تكون مرئية فقط للمسؤولين.

**طلب**

|المعلمة|اكتب|في|الوصف|
| --------- | ------ | ---- | ---------------------------- |
|معرف المسح|سلسلة|المسار|معرف الاستطلاع أو سبيكة (مطلوب)|

** الرد **

```typescript
{
  success: true;
  data: Survey;
}
```

**مثال**

```typescript
const response = await fetch("/api/surveys/user-satisfaction-2024");
const { data: survey } = await response.json();
```

### ضع `/api/surveys/{surveyId}`

تحديث الاستطلاع عن طريق المعرف أو سبيكة. يتطلب مصادقة المسؤول.

**طلب**

```typescript
{
  title?: string;
  description?: string;
  status?: "draft" | "published" | "closed";
  surveyJson?: object;
}
```

** الرد **

```typescript
{
  success: true;
  data: Survey;
  message: "Survey updated successfully";
}
```

**مثال**

```typescript
const response = await fetch("/api/surveys/abc-123", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "published" }),
});
```

### احذف `/api/surveys/{surveyId}`

حذف استطلاع حسب المعرف أو سبيكة. يتطلب مصادقة المسؤول.

**طلب**

|المعلمة|اكتب|في|الوصف|
| --------- | ------ | ---- | ---------------------------- |
|معرف المسح|سلسلة|المسار|معرف الاستطلاع أو سبيكة (مطلوب)|

** الرد **

```typescript
{
  success: true;
  data: null;
  message: "Survey deleted successfully";
}
```

### احصل على `/api/surveys/{surveyId}/responses`

استرداد الردود المرقّمة لاستطلاع محدد. يتطلب مصادقة المسؤول.

**طلب**

|المعلمة|اكتب|في|الوصف|
| --------- | ------ | ----- | ----------------------------- |
|معرف المسح|سلسلة|المسار|معرف الاستطلاع (مطلوب)|
|معرف العنصر|سلسلة|الاستعلام|التصفية حسب معرف العنصر|
|معرف المستخدم|سلسلة|الاستعلام|التصفية حسب معرف المستخدم|
|تاريخ البدء|سلسلة|الاستعلام|التصفية من التاريخ (تنسيق ISO)|
|تاريخ الانتهاء|سلسلة|الاستعلام|التصفية حتى الآن (تنسيق ISO)|
|الصفحة|رقم|الاستعلام|رقم الصفحة|
|الحد|رقم|الاستعلام|العناصر لكل صفحة|

** الرد **

```typescript
{
  success: true;
  data: {
    responses: Array<{
      id: string;
      surveyId: string;
      userId: string | null;
      itemId: string | null;
      data: object; // Survey answer data
      completedAt: string; // ISO 8601
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    totalPages: number;
  }
}
```

### نشر `/api/surveys/{surveyId}/responses`

أرسل ردًا على استطلاع منشور. المصادقة اختيارية - يُسمح بالإرسالات المجهولة.

**طلب**

```typescript
{
  surveyId: string; // Must match the path parameter
  data: object; // Required -- survey answer data
}
```

** الرد **

```typescript
{
  success: true;
  data: {
    id: string;
    surveyId: string;
    userId: string | null; // Set if user is authenticated
    itemId: string | null;
    data: object;
    completedAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    updatedAt: string;
  }
  message: "Response submitted successfully";
}
```

**مثال**

```typescript
const response = await fetch("/api/surveys/abc-123/responses", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    surveyId: "abc-123",
    data: { satisfaction: 5, feedback: "Great product!" },
  }),
});
```

### احصل على `/api/surveys/responses/{responseId}`

استرداد استجابة مسح محددة عن طريق معرف. يتطلب مصادقة المسؤول.

**طلب**

|المعلمة|اكتب|في|الوصف|
| ---------- | ------ | ---- | ---------------------- |
|معرف الاستجابة|سلسلة|المسار|معرف الاستجابة (مطلوب)|

** الرد **

```typescript
{
  success: true;
  data: SurveyResponse;
}
```

## المصادقة

|نقطة النهاية|المصادقة مطلوبة|
| ----------------------------------------- | -------------------------------------------- |
|الحصول على /api/surveys|عامة (يجب أن تكون قاعدة البيانات متاحة)|
|ما بعد /api/الاستطلاعات|المشرف فقط|
|`GET /api/surveys/{surveyId}`|عام للنشر؛ المشرف على المسودة/مغلق|
|`PUT /api/surveys/{surveyId}`|المشرف فقط|
|`DELETE /api/surveys/{surveyId}`|المشرف فقط|
|`GET /api/surveys/{surveyId}/responses`|المشرف فقط|
|`POST /api/surveys/{surveyId}/responses`|عام (مصادقة اختيارية لتتبع المستخدم)|
|`GET /api/surveys/responses/{responseId}`|المشرف فقط|

## ردود الأخطاء

|الحالة|الوصف|
| ------ | ----------------------------------------------------------------------- |
| 400    |نص الطلب غير صالح - لا يوجد حقل مطلوب `data` أو JSON مكتوب بشكل غير صحيح|
| 401    |غير مصرح به - مطلوب مصادقة المسؤول|
| 404    |لم يتم العثور على الاستطلاع أو الاستجابة|
| 500    |خطأ داخلي في الخادم - فشل قاعدة البيانات|
| 503    |قاعدة البيانات غير متوفرة أو لم تتم تهيئة المخطط|

## الحد من المعدل

لا يوجد حد واضح للسعر. تلتقط عمليات إرسال الاستجابة عنوان IP ووكيل المستخدم لأغراض التدقيق. تتحقق نقطة النهاية GET /api/surveys من توفر قاعدة البيانات قبل المعالجة وترجع `503` إذا كانت قاعدة البيانات غير قابلة للوصول.

## نقاط النهاية ذات الصلة

- [نقاط نهاية ميزة التكوين](./config-feature-endpoints) - التحقق من تمكين ميزة الاستطلاعات
