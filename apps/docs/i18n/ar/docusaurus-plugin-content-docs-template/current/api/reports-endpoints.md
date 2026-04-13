---
id: reports-endpoints
title: تقارير نقاط النهاية
sidebar_label: التقارير
sidebar_position: 20
---

# تقارير نقاط النهاية

يسمح نظام التقارير للمستخدمين المعتمدين بالإبلاغ عن المحتوى غير المناسب ويوفر للمسؤولين أدوات لمراجعة التقارير والإشراف عليها وحلها. تدعم التقارير أنواع المحتوى بما في ذلك العناصر والتعليقات، مع ميزة منع التكرارات المضمنة.

## نظرة عامة

|نقطة النهاية|الطريقة|مصادقة|الوصف|
|---|---|---|---|
|`/api/reports`|بريد|المستخدم|إرسال تقرير المحتوى|
|`/api/admin/reports`|احصل على|المشرف|قائمة التقارير مع التصفية|
|`/api/admin/reports/stats`|احصل على|المشرف|الحصول على إحصائيات التقرير|
|`/api/admin/reports/[id]`|احصل على|المشرف|احصل على تقرير واحد|
|`/api/admin/reports/[id]`|وضع|المشرف|تحديث حالة التقرير وحله|

## نقاط النهاية العامة

### تقديم تقرير

```
POST /api/reports
```

يمكن للمستخدمين المعتمدين الإبلاغ عن العناصر أو التعليقات الخاصة بالمحتوى غير المناسب. يمكن لكل مستخدم الإبلاغ عن نفس المحتوى مرة واحدة فقط (منع التكرار عبر فحص `hasUserReportedContent`). يُمنع المستخدمون المحظورون (المعلقون أو المحظورون) من تقديم التقارير.

**المصادقة:** مطلوبة (على أساس الجلسة)

**نص الطلب:**

```json
{
  "contentType": "item",
  "contentId": "awesome-productivity-tool",
  "reason": "spam",
  "details": "This tool is promoting malicious software"
}
```

|الميدان|اكتب|مطلوب|الوصف|
|---|---|---|---|
|`contentType`|سلسلة|نعم|نوع المحتوى: `"item"` أو `"comment"`|
|`contentId`|سلسلة|نعم|معرف أو سبيكة المحتوى الذي يتم الإبلاغ عنه|
|`reason`|سلسلة|نعم|واحد من: `"spam"`، `"harassment"`، `"inappropriate"`، `"other"`|
|`details`|سلسلة|لا|سياق إضافي حول التقرير|

**رد النجاح (200):**

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "report": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "awesome-productivity-tool",
    "reason": "spam",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

** ردود الأخطاء: **

|الحالة|الحالة|
|---|---|
| 400 |نوع محتوى غير صالح، أو معرف محتوى مفقود، أو سبب غير صالح|
| 401 |لم تتم مصادقة المستخدم|
| 403 |مطلوب ملف تعريف العميل، أو سيتم تعليق/حظر المستخدم|
| 404 |لم يتم العثور على ملف تعريف العميل|
| 409 |لقد أبلغ المستخدم بالفعل عن هذا المحتوى|
| 500 |خطأ داخلي في الخادم|

**المصدر:** `template/app/api/reports/route.ts`

## نقاط نهاية المشرف

تتطلب جميع نقاط النهاية الإدارية أن يكون `session.user.isAdmin` صحيحًا.

### قائمة التقارير

```
GET /api/admin/reports
```

إرجاع قائمة مقسمة إلى صفحات لتقارير المحتوى مع معلومات المراسل. يدعم التصفية حسب الحالة ونوع المحتوى والسبب، بالإضافة إلى البحث النصي عبر معرف المحتوى والتفاصيل واسم المراسل/البريد الإلكتروني.

**معلمات الاستعلام:**

|المعلمة|اكتب|الافتراضي|الوصف|
|---|---|---|---|
|`page`|عدد صحيح| 1 |رقم الصفحة (الحد الأدنى 1)|
|`limit`|عدد صحيح| 10 |النتائج لكل صفحة (1-100)|
|`search`|سلسلة| - |ابحث عبر معرف المحتوى والتفاصيل واسم المراسل/البريد الإلكتروني|
|`status`|سلسلة| - |عامل التصفية: `"pending"`، `"reviewed"`، `"resolved"`، `"dismissed"`|
|`contentType`|سلسلة| - |عامل التصفية: `"item"`، `"comment"`|
|`reason`|سلسلة| - |عامل التصفية: `"spam"`، `"harassment"`، `"inappropriate"`، `"other"`|

**رد النجاح (200):**

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "rpt_abc123",
        "contentType": "item",
        "contentId": "some-item-slug",
        "reason": "spam",
        "status": "pending",
        "details": "Suspicious content",
        "reportedBy": "client_456",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

**المصدر:** `template/app/api/admin/reports/route.ts`

### الحصول على إحصائيات التقرير

```
GET /api/admin/reports/stats
```

إرجاع إحصائيات مجمعة حول التقارير بما في ذلك الأعداد حسب الحالة ونوع المحتوى والسبب.

**رد النجاح (200):**

```json
{
  "success": true,
  "data": {
    "total": 156,
    "pendingCount": 23,
    "resolvedCount": 120,
    "byStatus": {
      "pending": 23,
      "reviewed": 10,
      "resolved": 120,
      "dismissed": 3
    },
    "byContentType": {
      "item": 100,
      "comment": 56
    },
    "byReason": {
      "spam": 80,
      "inappropriate": 45,
      "harassment": 20,
      "other": 11
    }
  }
}
```

**المصدر:** `template/app/api/admin/reports/stats/route.ts`

### الحصول على تقرير عن طريق الهوية

```
GET /api/admin/reports/[id]
```

استرداد تقرير واحد يحتوي على تفاصيل كاملة بما في ذلك معلومات المراسل والمراجع.

** معلمات المسار: **

|المعلمة|اكتب|الوصف|
|---|---|---|
|`id`|سلسلة|معرف التقرير|

**رد النجاح (200):**

```json
{
  "success": true,
  "data": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "some-item-slug",
    "reason": "spam",
    "status": "reviewed",
    "details": "Suspicious content",
    "reportedBy": "client_456",
    "reviewedBy": "admin_789",
    "reviewNote": "Confirmed as spam",
    "resolution": "content_removed",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-21T09:00:00.000Z"
  }
}
```

|الحالة|الحالة|
|---|---|
| 403 |ليس المشرف|
| 404 |لم يتم العثور على التقرير|

**المصدر:** `template/app/api/admin/reports/[id]/route.ts`

### تحديث التقرير

```
PUT /api/admin/reports/[id]
```

يقوم بتحديث حالة التقرير وحله ومذكرة المراجعة. عند تعيين القرار، يقوم النظام تلقائيًا بتنفيذ إجراء الإشراف المقابل (إزالة المحتوى، أو تحذير المستخدم، أو التعليق، أو الحظر).

**نص الطلب:**

```json
{
  "status": "resolved",
  "resolution": "content_removed",
  "reviewNote": "Confirmed spam content, removed from listing"
}
```

|الميدان|اكتب|مطلوب|الوصف|
|---|---|---|---|
|`status`|سلسلة|لا|`"pending"`، `"reviewed"`، `"resolved"`، `"dismissed"`|
|`resolution`|سلسلة|لا|`"content_removed"`، `"user_warned"`، `"user_suspended"`، `"user_banned"`، `"no_action"`|
|`reviewNote`|سلسلة|لا|ملاحظات المشرف حول المراجعة|

**إجراءات الإشراف حسب القرار:**

يتم تشغيل الإجراءات التلقائية التالية بناءً على قيمة الدقة:

|القرار|العمل|
|---|---|
|`content_removed`|يستدعي `removeContent()` لإزالة العنصر أو التعليق الذي تم الإبلاغ عنه|
|`user_warned`|يستدعي `warnUser()` لإصدار تحذير لمالك المحتوى|
|`user_suspended`|يستدعي `suspendUser()` لتعليق حساب مالك المحتوى|
|`user_banned`|يستدعي `banUser()` لحظر مالك المحتوى نهائيًا|
|`no_action`|لم يتم اتخاذ أي إجراء الاعتدال|

**رد النجاح (200):**

```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "id": "rpt_abc123",
    "status": "resolved",
    "resolution": "content_removed",
    "reviewNote": "Confirmed spam content"
  },
  "moderationResult": {
    "success": true,
    "message": "Content removed successfully"
  }
}
```

|الحالة|الحالة|
|---|---|
| 400 |الحالة أو قيمة القرار غير صالحة؛ لم يتم العثور على مالك المحتوى للإجراءات على مستوى المستخدم|
| 403 |ليس المشرف|
| 404 |لم يتم العثور على التقرير|

**المصدر:** `template/app/api/admin/reports/[id]/route.ts`

## نموذج البيانات

تستخدم التقارير التعدادات التالية المحددة في `lib/db/schema`:

- **نوع محتوى التقرير:** `"item"`، `"comment"`
- **سبب التقرير:** `"spam"`، `"harassment"`، `"inappropriate"`، `"other"`
- **حالة التقرير:** `"pending"`، `"reviewed"`، `"resolved"`، `"dismissed"`
- **قرار التقرير:** `"content_removed"`، `"user_warned"`، `"user_suspended"`، `"user_banned"`، `"no_action"`

## التكامل مع الاعتدال

عندما يتم حل تقرير باستخدام دقة على مستوى المستخدم (`user_warned`، `user_suspended`، `user_banned`)، فإن النظام:

1. يبحث عن مالك المحتوى عبر `getContentOwner()`
2. ينفذ وظيفة الإشراف المناسبة من `lib/services/moderation.service`
3. يستخدم `reviewNote` كسبب لإجراء الإشراف
4. يسجل معرف المسؤول كمراجع

إذا فشل إجراء الإشراف، يظل تحديث التقرير ناجحًا ولكن يتم تسجيل الفشل. يشير الحقل `moderationResult` في الاستجابة إلى ما إذا كان الإجراء قد نجح.
