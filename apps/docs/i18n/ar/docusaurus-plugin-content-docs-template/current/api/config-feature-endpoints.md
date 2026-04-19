---
id: config-feature-endpoints
title: "مرجع API للتكوين والميزات"
sidebar_label: "التكوين والميزات"
sidebar_position: 53
---

# مرجع API للتكوين والميزات

## نظرة عامة

تعرض نقطة نهاية ميزات التكوين علامات توفر الميزات الحالية للتطبيق. تشير هذه العلامات إلى الميزات النشطة المعتمدة على قاعدة البيانات، مما يسمح للواجهة الأمامية بالتدهور بسلاسة عند عدم توفر الميزات. هذه نقطة نهاية عامة ومخزنة مؤقتًا مصممة للاستهلاك عالي التردد.

## نقاط النهاية

### احصل على /api/config/features

إرجاع توفر الميزة الحالي بناءً على تكوين النظام وتوافر قاعدة البيانات.

**طلب**

لا توجد معلمات أو هيئة مطلوبة.

** الرد **
```typescript
{
  ratings: boolean;         // Whether the ratings feature is available
  comments: boolean;        // Whether the comments feature is available
  favorites: boolean;       // Whether the favorites feature is available
  featuredItems: boolean;   // Whether the featured items feature is available
  surveys: boolean;         // Whether the surveys feature is available
}
```

**مثال**
```typescript
const response = await fetch('/api/config/features');
const features = await response.json();

if (features.ratings) {
  // Render rating component
}

if (!features.surveys) {
  // Hide survey section
}
```

## المصادقة

نقطة النهاية هذه **عامة** -- لا يلزم المصادقة. لقد تم تصميمه ليتم استهلاكه بواسطة الواجهة الأمامية عند التحميل الأولي للصفحة لتحديد ميزات واجهة المستخدم التي يجب عرضها.

## ردود الأخطاء

|الحالة|الوصف|
|--------|-------------|
| 200 |تم استرداد إشارات الميزات بنجاح|
| 500 |خطأ داخلي - يُرجع جميع العلامات كـ `false` للأمان باستخدام رأس `no-cache`|

في حالة حدوث خطأ، تقوم نقطة النهاية بإرجاع جميع الميزات كـ `false` لضمان فشل التطبيق بأمان بدلاً من الكشف عن الوظائف المعطلة.

## الحد من المعدل

يتم تخزين الاستجابات مؤقتًا بالعناوين التالية:
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- تم تخزينه مؤقتًا بشكل فعال لمدة 5 دقائق على مستوى CDN مع نافذة قديمة مدتها 10 دقائق أثناء إعادة التحقق.

تستخدم استجابات الأخطاء `Cache-Control: no-cache` لمنع التخزين المؤقت للحالة المتدهورة.

## نقاط النهاية ذات الصلة

- [نقاط النهاية الصحية](./health-endpoints) - التحقق من صحة اتصال قاعدة البيانات
