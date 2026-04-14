---
id: admin-endpoints
title: نقاط نهاية واجهة برمجة تطبيقات المشرف
sidebar_label: نقاط نهاية المشرف
sidebar_position: 1
---

# نقاط نهاية واجهة برمجة تطبيقات المشرف

تحتوي واجهة برمجة تطبيقات المشرف على ما يقرب من 60 معالج مسار عبر 19 مجموعة موارد. جميع نقاط النهاية الإدارية محمية بواسطة البرنامج الوسيط `withAdminAuth`، الذي يتحقق من المصادقة وتعيين دور المسؤول عبر استعلام قاعدة البيانات.

## المصادقة

تتطلب كل نقطة نهاية إدارية ما يلي:

1. جلسة JWT صالحة (تم التحقق منها عبر `auth()`)
2. دور مسؤول في الجدول `user_roles` (تم التحقق منه عبر `isAdmin()` من `lib/db/roles.ts`)

تتلقى الطلبات غير المصادق عليها استجابة `401`. تتلقى الطلبات التي تمت مصادقتها ولكنها غير إدارية استجابة `403`.

## مجموعات الموارد

### الفئات (`/api/admin/categories`)

إدارة فئات المحتوى باستخدام الثبات القائم على Git.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/categories`|قائمة الفئات مع ترقيم الصفحات|
|`POST`|`/api/admin/categories`|إنشاء فئة جديدة|
|`GET`|`/api/admin/categories/all`|الحصول على جميع الفئات (بدون ترقيم الصفحات)|
|`POST`|`/api/admin/categories/git`|مزامنة الفئات مع مستودع Git|
|`POST`|`/api/admin/categories/reorder`|إعادة ترتيب مواضع الفئات|
|`GET`|`/api/admin/categories/[id]`|الحصول على الفئة حسب المعرف|
|`PUT`|`/api/admin/categories/[id]`|تحديث الفئة|
|`DELETE`|`/api/admin/categories/[id]`|حذف الفئة|

### العملاء (`/api/admin/clients`)

إدارة حسابات المستخدمين وملفاتهم الشخصية.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/clients`|قائمة ملفات تعريف العميل مع ترقيم الصفحات|
|`POST`|`/api/admin/clients/advanced-search`|بحث متقدم عن العميل باستخدام المرشحات|
|`POST`|`/api/admin/clients/bulk`|عمليات بالجملة على العملاء|
|`GET`|`/api/admin/clients/dashboard`|إحصائيات لوحة تحكم العميل|
|`GET`|`/api/admin/clients/stats`|إحصائيات إجمالية للعملاء|
|`GET`|`/api/admin/clients/[clientId]`|الحصول على تفاصيل الملف الشخصي للعميل|
|`PUT`|`/api/admin/clients/[clientId]`|تحديث الملف الشخصي للعميل|
|`DELETE`|`/api/admin/clients/[clientId]`|حذف حساب العميل|

### المجموعات (`/api/admin/collections`)

إدارة مجموعات العناصر المنسقة.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/collections`|قائمة كافة المجموعات|
|`POST`|`/api/admin/collections`|إنشاء مجموعة جديدة|
|`GET`|`/api/admin/collections/[id]`|الحصول على تفاصيل المجموعة|
|`PUT`|`/api/admin/collections/[id]`|تحديث المجموعة|
|`DELETE`|`/api/admin/collections/[id]`|حذف المجموعة|
|`GET`|`/api/admin/collections/[id]/items`|قائمة العناصر في المجموعة|
|`PUT`|`/api/admin/collections/[id]/items`|تحديث عناصر المجموعة|

### التعليقات (`/api/admin/comments`)

تعليقات المستخدم المعتدلة.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/comments`|قائمة التعليقات مع مرشحات الاعتدال|
|`GET`|`/api/admin/comments/[id]`|الحصول على تفاصيل التعليق|
|`PUT`|`/api/admin/comments/[id]`|تحديث التعليق (موافقة/رفض)|
|`DELETE`|`/api/admin/comments/[id]`|حذف التعليق|

### الشركات (`/api/admin/companies`)

إدارة ملفات تعريف الشركة المرتبطة بالعناصر.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/companies`|قائمة الشركات|
|`POST`|`/api/admin/companies`|إنشاء شركة|
|`GET`|`/api/admin/companies/[id]`|الحصول على تفاصيل الشركة|
|`PUT`|`/api/admin/companies/[id]`|تحديث الشركة|
|`DELETE`|`/api/admin/companies/[id]`|حذف الشركة|

### لوحة التحكم (`/api/admin/dashboard`)

تحليلات لوحة القيادة المجمعة.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/dashboard/stats`|إحصائيات ملخص لوحة المعلومات|

### العناصر المميزة (`/api/admin/featured-items`)

إدارة أبرز العناصر المميزة.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/featured-items`|قائمة العناصر المميزة|
|`POST`|`/api/admin/featured-items`|قم بتمييز عنصر ما|
|`GET`|`/api/admin/featured-items/[id]`|احصل على تفاصيل العنصر المميز|
|`PUT`|`/api/admin/featured-items/[id]`|تحديث إعدادات العناصر المميزة|
|`DELETE`|`/api/admin/featured-items/[id]`|إزالة من المميز|

### التحليلات الجغرافية (`/api/admin/geo-analytics`)

التحليلات الجغرافية وبيانات توزيع الزوار.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/geo-analytics`|الحصول على بيانات التحليلات الجغرافية|

### العناصر (`/api/admin/items`)

إدارة محتوى المادة بالكامل.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/items`|قائمة العناصر مع المرشحات وترقيم الصفحات|
|`POST`|`/api/admin/items`|إنشاء عنصر جديد|
|`POST`|`/api/admin/items/bulk`|عمليات العناصر المجمعة (الموافقة والرفض والحذف)|
|`GET`|`/api/admin/items/stats`|إحصائيات إجمالية للعنصر|
|`GET`|`/api/admin/items/[id]`|الحصول على تفاصيل البند|
|`PUT`|`/api/admin/items/[id]`|تحديث العنصر|
|`DELETE`|`/api/admin/items/[id]`|حذف العنصر|
|`GET`|`/api/admin/items/[id]/history`|الحصول على سجل تدقيق العنصر|
|`POST`|`/api/admin/items/[id]/review`|إرسال مراجعة العنصر (الموافقة/الرفض)|

### فهرس الموقع (`/api/admin/location-index`)

إدارة فهرسة البحث عن الموقع الجغرافي.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`POST`|`/api/admin/location-index`|إعادة بناء فهرس البحث عن الموقع|

### التنقل (`/api/admin/navigation`)

تكوين التنقل الإداري.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/navigation`|الحصول على هيكل التنقل|
|`PUT`|`/api/admin/navigation`|تحديث الملاحة|

### الإخطارات (`/api/admin/notifications`)

إدارة إشعارات المشرف.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/notifications`|قائمة إشعارات المشرف|
|`POST`|`/api/admin/notifications/mark-all-read`|وضع علامة على جميع الإخطارات كمقروءة|
|`POST`|`/api/admin/notifications/[id]/read`|وضع علامة على إشعار واحد كمقروء|

### التقارير (`/api/admin/reports`)

إدارة تقرير المحتوى والإشراف عليه.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/reports`|قائمة تقارير المحتوى|
|`GET`|`/api/admin/reports/stats`|إحصائيات التقرير|
|`GET`|`/api/admin/reports/[id]`|الحصول على تفاصيل التقرير|
|`PUT`|`/api/admin/reports/[id]`|تحديث حالة التقرير (الحل، الرفض)|

### الأدوار (`/api/admin/roles`)

إدارة الأدوار والأذونات لـ RBAC.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/roles`|قائمة الأدوار مع ترقيم الصفحات|
|`POST`|`/api/admin/roles`|إنشاء دور جديد|
|`GET`|`/api/admin/roles/active`|احصل على الأدوار النشطة فقط|
|`GET`|`/api/admin/roles/stats`|إحصائيات الدور|
|`GET`|`/api/admin/roles/[id]`|احصل على تفاصيل الدور|
|`PUT`|`/api/admin/roles/[id]`|تحديث الدور|
|`DELETE`|`/api/admin/roles/[id]`|حذف الدور (حذف بسيط)|
|`GET`|`/api/admin/roles/[id]/permissions`|الحصول على أذونات الدور|
|`PUT`|`/api/admin/roles/[id]/permissions`|تحديث أذونات الدور|

### الإعدادات (`/api/admin/settings`)

إدارة إعدادات التطبيق.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/settings`|الحصول على كافة الإعدادات|
|`PUT`|`/api/admin/settings`|تحديث الإعدادات|
|`GET`|`/api/admin/settings/map-status`|الحصول على حالة ميزة الخريطة|

### إعلانات الراعي (`/api/admin/sponsor-ads`)

الإشراف على إعلان الراعي.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/sponsor-ads`|قائمة إعلانات الراعي|
|`GET`|`/api/admin/sponsor-ads/[id]`|احصل على تفاصيل الإعلان|
|`PUT`|`/api/admin/sponsor-ads/[id]`|تحديث الإعلان|
|`POST`|`/api/admin/sponsor-ads/[id]/approve`|الموافقة على إعلان الراعي|
|`POST`|`/api/admin/sponsor-ads/[id]/reject`|رفض إعلان الراعي|
|`POST`|`/api/admin/sponsor-ads/[id]/cancel`|إلغاء إعلان الراعي|

### العلامات (`/api/admin/tags`)

إدارة علامات المحتوى.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/tags`|قائمة العلامات مع ترقيم الصفحات|
|`POST`|`/api/admin/tags`|إنشاء علامة جديدة|
|`GET`|`/api/admin/tags/all`|الحصول على جميع العلامات (بدون ترقيم الصفحات)|
|`GET`|`/api/admin/tags/[id]`|الحصول على تفاصيل العلامة|
|`PUT`|`/api/admin/tags/[id]`|تحديث العلامة|
|`DELETE`|`/api/admin/tags/[id]`|حذف العلامة|

### عشرون إدارة علاقات العملاء (`/api/admin/twenty-crm`)

تكوين واختبار تكامل CRM.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/twenty-crm/config`|احصل على تكوين CRM|
|`PUT`|`/api/admin/twenty-crm/config`|تحديث تكوين إدارة علاقات العملاء|
|`POST`|`/api/admin/twenty-crm/test-connection`|اختبار اتصال CRM|

### المستخدمون (`/api/admin/users`)

إدارة المستخدم المشرف.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/admin/users`|قائمة المستخدمين مع ترقيم الصفحات|
|`POST`|`/api/admin/users`|إنشاء مستخدم جديد|
|`GET`|`/api/admin/users/stats`|إحصائيات المستخدم|
|`GET`|`/api/admin/users/check-email`|التحقق من توفر البريد الإلكتروني|
|`GET`|`/api/admin/users/check-username`|التحقق من توفر اسم المستخدم|
|`GET`|`/api/admin/users/[id]`|الحصول على تفاصيل المستخدم|
|`PUT`|`/api/admin/users/[id]`|تحديث المستخدم|
|`DELETE`|`/api/admin/users/[id]`|حذف المستخدم|

## الأنماط الشائعة

### العمليات السائبة

تدعم العديد من الموارد العمليات المجمعة عبر POST مع مجموعة من المعرفات:

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### نقاط النهاية الإحصائية

تشتمل معظم مجموعات الموارد على `/stats` نقطة نهاية تُرجع الأعداد المجمعة:

```json
GET /api/admin/items/stats
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100
  }
}
```

### تاريخ التدقيق

تدعم العناصر تتبع سجل التدقيق عبر نقطة النهاية `/[id]/history`، وتسجيل من أجرى التغييرات ومتى.
