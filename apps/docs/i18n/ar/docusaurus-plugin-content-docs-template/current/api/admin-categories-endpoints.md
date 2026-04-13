---
id: admin-categories-endpoints
title: فئات المشرف نقاط نهاية واجهة برمجة التطبيقات
sidebar_label: فئات المشرف
sidebar_position: 30
---

# فئات المشرف نقاط نهاية واجهة برمجة التطبيقات

توفر واجهة برمجة تطبيقات فئات المسؤول عمليات CRUD كاملة لإدارة فئات المحتوى، بما في ذلك إعادة الترتيب والمزامنة المستندة إلى Git مع مستودع بيانات بعيد. تتطلب جميع نقاط النهاية مصادقة المسؤول عبر المصادقة المستندة إلى الجلسة.

## ملخص الطريق

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|`GET`|`/api/admin/categories`|المشرف|فئات القائمة (مرقّمة الصفحات)|
|`POST`|`/api/admin/categories`|المشرف|إنشاء فئة جديدة|
|`GET`|`/api/admin/categories/all`|المشرف|الحصول على جميع الفئات (من ذاكرة التخزين المؤقت للمحتوى)|
|`GET`|`/api/admin/categories/{id}`|المشرف|احصل على فئة واحدة حسب المعرف|
|`PUT`|`/api/admin/categories/{id}`|المشرف|تحديث فئة|
|`DELETE`|`/api/admin/categories/{id}`|المشرف|حذف فئة بشكل ناعم أو صعب|
|`PUT`|`/api/admin/categories/reorder`|المشرف|إعادة ترتيب الفئات حسب مجموعة المعرفات|
|`GET`|`/api/admin/categories/git`|المشرف|احصل على حالة وفئات Git repo|
|`POST`|`/api/admin/categories/git`|المشرف|قم بإنشاء فئة عبر التزام Git|

## المصادقة

تتحقق جميع نقاط نهاية إدارة الفئات من وجود جلسة نشطة تتمتع بامتيازات المسؤول:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
```

## نقاط النهاية

### احصل على `/api/admin/categories`

إرجاع قائمة مقسمة إلى صفحات من الفئات مع التصفية والفرز الاختياريين.

**معلمات الاستعلام:**

|المعلمة|اكتب|الافتراضي|الوصف|
|-----------|------|---------|-------------|
|`page`|عدد صحيح| `1` |رقم الصفحة (الحد الأدنى: 1)|
|`limit`|عدد صحيح| `10` |العناصر لكل صفحة (1--100)|
|`includeInactive`|سلسلة|`"false"`|تضمين الفئات غير النشطة|
|`sortBy`|سلسلة|`"name"`|حقل الفرز: `"name"` أو `"id"`|
|`sortOrder`|سلسلة|`"asc"`|اتجاه الفرز: `"asc"` أو `"desc"`|

**الرد (200):**

```json
{
  "success": true,
  "categories": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### نشر `/api/admin/categories`

ينشئ فئة جديدة. يعد الحقل `id` اختياريًا وسيتم إنشاؤه تلقائيًا من الاسم إذا لم يتم توفيره. يبطل ذاكرة التخزين المؤقت للمحتوى عند النجاح.

**نص الطلب:**

```json
{
  "id": "productivity",
  "name": "Productivity"
}
```

|الميدان|اكتب|مطلوب|الوصف|
|-------|------|----------|-------------|
|`id`|سلسلة|لا|سبيكة صديقة لعنوان URL (`^[a-z0-9-]+$`). يتم إنشاؤها تلقائيًا في حالة حذفها.|
|`name`|سلسلة|نعم|اسم العرض (2-100 حرف)|

**الرد (201):**

```json
{
  "success": true,
  "category": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 0,
    "createdAt": "2024-01-20T15:30:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  },
  "message": "Category created successfully"
}
```

### احصل على `/api/admin/categories/all`

إرجاع جميع الفئات من ذاكرة التخزين المؤقت للمحتوى لمنطقة معينة. مفيد للقوائم المنسدلة والمحددات الإدارية.

**معلمات الاستعلام:**

|المعلمة|اكتب|الافتراضي|الوصف|
|-----------|------|---------|-------------|
|`locale`|سلسلة|`"en"`|رمز اللغة لاسترجاع المحتوى|

**الرد (200):**

```json
{
  "success": true,
  "data": [
    { "id": "productivity", "name": "Productivity", "isActive": true, "itemCount": 15 }
  ]
}
```

### احصل على `/api/admin/categories/{id}`

استرداد فئة واحدة بواسطة معرفها الفريد.

**الرد (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 15,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### ضع `/api/admin/categories/{id}`

يقوم بتحديث اسم الفئة الموجودة. يبطل ذاكرة التخزين المؤقت للمحتوى عند النجاح.

**نص الطلب:**

```json
{ "name": "Productivity Tools" }
```

**الرد (200):**

```json
{
  "success": true,
  "data": { "id": "productivity", "name": "Productivity Tools", "isActive": true },
  "message": "Category updated successfully"
}
```

### احذف `/api/admin/categories/{id}`

يحذف فئة. افتراضيًا، يتم تنفيذ عملية الحذف الناعم (إلغاء التنشيط). استخدم معلمة الاستعلام `hard=true` للحذف الدائم. يبطل ذاكرة التخزين المؤقت للمحتوى عند النجاح.

**معلمات الاستعلام:**

|المعلمة|اكتب|الافتراضي|الوصف|
|-----------|------|---------|-------------|
|`hard`|سلسلة|`"false"`|اضبط على `"true"` للحذف الدائم|

**الرد (200):**

```json
{
  "success": true,
  "message": "Category deactivated successfully"
}
```

### ضع `/api/admin/categories/reorder`

إعادة ترتيب الفئات بناءً على مجموعة من معرفات الفئات. يحدد موضع كل معرف في الصفيف ترتيب العرض الجديد الخاص به.

**نص الطلب:**

```json
{ "categoryIds": ["productivity", "design", "development", "marketing"] }
```

**قواعد التحقق:**
- `categoryIds` يجب أن يكون مصفوفة غير فارغة
- يجب أن تكون كافة القيم سلاسل

**الرد (200):**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

### احصل على `/api/admin/categories/git`

جلب حالة وفئات مستودع Git من مستودع بيانات GitHub الذي تم تكوينه. يتطلب `DATA_REPOSITORY` و`GITHUB_TOKEN` متغيرات البيئة.

**الرد (200):**

```json
{
  "success": true,
  "status": {
    "repository": "ever-co/awesome-time-tracking-data",
    "branch": "main",
    "lastCommit": "abc123def456",
    "lastCommitDate": "2024-01-20T10:30:00.000Z",
    "isUpToDate": true
  },
  "categories": [],
  "message": "Git repository status retrieved successfully"
}
```

### نشر `/api/admin/categories/git`

ينشئ فئة جديدة ويلزمها مباشرة بمستودع بيانات GitHub. يتطلب `DATA_REPOSITORY` و`GH_TOKEN` متغيرات البيئة.

**نص الطلب:**

```json
{ "id": "productivity", "name": "Productivity" }
```

كل من `id` و`name` مطلوبان للإنشاء المستند إلى Git.

**الرد (200):**

```json
{
  "success": true,
  "category": { "id": "productivity", "name": "Productivity" },
  "message": "Category created and committed to Git repository"
}
```

## رموز الخطأ

|الحالة|خطأ|السبب|
|--------|-------|-------|
| `400` |معلمات ترقيم الصفحات غير صالحة|الصفحة < 1 أو الحد الخارجي 1-100|
| `400` |اسم الفئة مطلوب|مفقود `name` في طلب الإنشاء|
| `400` |يجب أن تكون معرفات الفئة عبارة عن صفيف|حمولة إعادة الطلب غير صالحة|
| `401` |غير مصرح به. مطلوب وصول المشرف.|جلسة مفقودة أو غير إدارية|
| `404` |لم يتم العثور على الفئة|معرف الفئة غير صالح|
| `409` |الفئة بهذا الاسم موجودة بالفعل|اسم مكرر عند الإنشاء/التحديث|
| `500` |DATA_REPOSITORY لم يتم تكوينه|env var مفقود لنقاط نهاية Git|
| `500` |لم يتم تكوين رمز GitHub|مفقود `GITHUB_TOKEN` أو `GH_TOKEN`|

## إبطال ذاكرة التخزين المؤقت

جميع عمليات الكتابة (الإنشاء والتحديث والحذف وإعادة الترتيب) تستدعي `invalidateContentCaches()` لضمان ظهور التغييرات على الفور عبر التطبيق.

## الوثائق ذات الصلة

- [نظرة عامة على نقاط نهاية المشرف](./admin-endpoints.md)
- [فئة نقاط النهاية العامة](./category-endpoints.md)
- [أنماط الاستجابة](./response-patterns.md)
- [التحقق من صحة الطلب](./request-validation.md)
