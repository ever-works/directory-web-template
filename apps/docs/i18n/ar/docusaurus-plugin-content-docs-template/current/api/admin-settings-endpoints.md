---
id: admin-settings-endpoints
title: إعدادات المشرف نقاط النهاية
sidebar_label: إعدادات المشرف
sidebar_position: 23
---

# إعدادات المشرف نقاط النهاية

توفر واجهة برمجة تطبيقات إعدادات المسؤول نقاط نهاية لقراءة وتعديل تكوين الموقع المخزن في `config.yml`. يتضمن ذلك الإعدادات العامة وحالة موفر الخريطة. تتطلب كافة نقاط النهاية مصادقة المسؤول.

## نظرة عامة

|نقطة النهاية|الطريقة|مصادقة|الوصف|
|---|---|---|---|
|`/api/admin/settings`|احصل على|المشرف|الحصول على كافة الإعدادات|
|`/api/admin/settings`|التصحيح|المشرف|تحديث إعداد معين|
|`/api/admin/settings/map-status`|احصل على|المشرف|احصل على حالة تكوين موفر الخريطة|

## احصل على الإعدادات

```
GET /api/admin/settings
```

يسترد قسم `settings` الكامل من ملف `config.yml` الخاص بالموقع.

**المصادقة:** مطلوب مشرف (عبر `getCachedApiSession`)

**رد النجاح (200):**

```json
{
  "settings": {
    "theme": "light",
    "itemsPerPage": 20,
    "enableComments": true,
    "enableVoting": true,
    "enableNewsletter": true,
    "mapProvider": "mapbox",
    "defaultLanguage": "en"
  }
}
```

يعتمد الشكل الدقيق للكائن `settings` على تكوين الموقع `config.yml`. تقوم نقطة النهاية بإرجاع كل ما تم تخزينه تحت المفتاح `settings`.

|الحالة|الحالة|
|---|---|
| 401 |لم يتم المصادقة عليه كمسؤول|
| 500 |فشل في قراءة التكوين|

**المصدر:** `template/app/api/admin/settings/route.ts`

## تحديث الإعداد

```
PATCH /api/admin/settings
```

يقوم بتحديث قيمة إعداد واحدة ضمن قسم `settings` في `config.yml`. يتم تحديد نطاق المفتاح تلقائيًا إلى مساحة الاسم `settings` (على سبيل المثال، توفير تحديثات المفتاح `"theme"` `settings.theme` في ملف التكوين).

**المصادقة:** مطلوب المشرف

**نص الطلب:**

```json
{
  "key": "itemsPerPage",
  "value": 30
}
```

|الميدان|اكتب|مطلوب|الوصف|
|---|---|---|---|
|`key`|سلسلة|نعم|مفتاح الإعداد للتحديث (نسبة إلى `settings.`)|
|`value`|أي|نعم|القيمة الجديدة للإعداد|

**رد النجاح (200):**

```json
{
  "success": true,
  "key": "itemsPerPage",
  "value": 30
}
```

يستمر التحديث عبر `configManager.updateNestedKey()`، والذي يعدل الملف `config.yml` الأساسي. يتم بادئة المفتاح تلقائيًا بـ `settings.` قبل تمريره إلى مدير التكوين.

** ردود الأخطاء: **

|الحالة|الحالة|
|---|---|
| 400 |الحقل `key` مفقود في نص الطلب|
| 401 |لم يتم المصادقة عليه كمسؤول|
| 500 |فشل في كتابة التكوين|

**المصدر:** `template/app/api/admin/settings/route.ts`

## حالة موفر الخريطة

### الحصول على حالة الخريطة

```
GET /api/admin/settings/map-status
```

إرجاع حالة التكوين لموفري الخرائط المدعومين دون الكشف عن مفاتيح واجهة برمجة التطبيقات الفعلية. يتيح ذلك للوحة تحكم المسؤول إظهار موفري الخرائط المتاحين للاستخدام.

**المصادقة:** مطلوب المشرف

**رد النجاح (200):**

```json
{
  "status": {
    "mapbox": {
      "isConfigured": true,
      "isPreviewAvailable": true,
      "name": "Mapbox"
    },
    "google": {
      "isConfigured": false,
      "isPreviewAvailable": false,
      "name": "Google Maps"
    }
  }
}
```

|الميدان|اكتب|الوصف|
|---|---|---|
|`mapbox.isConfigured`|منطقية|ما إذا كان قد تم تعيين `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|
|`mapbox.isPreviewAvailable`|منطقية|تمامًا مثل `isConfigured` - تتطلب المعاينة الرمز المميز|
|`google.isConfigured`|منطقية|ما إذا كان قد تم تعيين `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|
|`google.isPreviewAvailable`|منطقية|نفس `isConfigured`|

تتحقق نقطة النهاية من وجود متغيرات البيئة:

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` لـ Mapbox
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` لخرائط جوجل

لا يتم عرض أي قيم أساسية فعلية في الاستجابة.

|الحالة|الحالة|
|---|---|
| 401 |لم يتم المصادقة عليه كمسؤول|
| 500 |خطأ داخلي في الخادم|

**المصدر:** `template/app/api/admin/settings/map-status/route.ts`

## هندسة التكوين

تم بناء نظام الإعدادات على `configManager` المفرد من `lib/config-manager`:

- **التخزين:** يتم تخزين الإعدادات في ملف تكوين YAML (`config.yml`)
- **الوصول:** يقرأ أسلوب `configManager.getConfig()` التكوين الكامل
- ** التحديثات: ** تقوم طريقة `configManager.updateNestedKey()` بتعديل مفاتيح متداخلة محددة
- **التخزين المؤقت:** يتم تخزين الجلسات مؤقتًا عبر `getCachedApiSession()` لتحسين الأداء

يتم تحديد نطاق كافة تحديثات الإعدادات ضمن مساحة الاسم `settings` في ملف التكوين. وهذا يمنع التعديل غير المقصود لمفاتيح التكوين ذات المستوى الأعلى من خلال واجهة برمجة التطبيقات للإعدادات.
