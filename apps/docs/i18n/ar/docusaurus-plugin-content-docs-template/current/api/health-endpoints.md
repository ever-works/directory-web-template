---
id: health-endpoints
title: "مرجع API للصحة"
sidebar_label: "الصحة"
sidebar_position: 52
---

# مرجع API للصحة

## نظرة عامة

توفر نقطة النهاية الصحية فحصًا بسيطًا لاتصال قاعدة البيانات لأغراض المراقبة والبنية التحتية. يقوم بتنفيذ استعلام بسيط للتحقق من أن اتصال قاعدة البيانات نشط وسريع الاستجابة، ويعيد معلومات الحالة مع الطوابع الزمنية.

## نقاط النهاية

### الحصول على /api/health/database

إجراء فحص أساسي لسلامة قاعدة البيانات عن طريق تنفيذ استعلام `SELECT 1` للتحقق من اتصال قاعدة البيانات.

**طلب**

لا توجد معلمات أو هيئة مطلوبة.

** الرد **
```typescript
// Healthy response
{
  status: "healthy";
  database: "connected";
  timestamp: string;        // ISO 8601 format, e.g. "2024-01-15T10:30:00.000Z"
  result: object;           // Raw query result from SELECT 1
}

// Unhealthy response (status 500)
{
  status: "unhealthy";
  database: "disconnected";
  error: "Database connection check failed";
  timestamp: string;
}
```

**مثال**
```typescript
const response = await fetch('/api/health/database');
const health = await response.json();

if (health.status === 'healthy') {
  console.log('Database is connected at', health.timestamp);
} else {
  console.error('Database is disconnected:', health.error);
}
```

## المصادقة

نقطة النهاية هذه **عامة** -- لا يلزم المصادقة. وهو مخصص للاستخدام من خلال موازنات التحميل، وأجهزة مراقبة وقت التشغيل، وفحوصات صحة النشر.

## ردود الأخطاء

|الحالة|الوصف|
|--------|-------------|
| 200 |اتصال قاعدة البيانات صحي|
| 500 |فشل الاتصال بقاعدة البيانات - يتم إرجاع الحالة `"unhealthy"` مع تفاصيل الخطأ|

## الحد من المعدل

لا يتم تطبيق حد صريح للسعر. نقطة النهاية هذه خفيفة الوزن ومناسبة للاستقصاء المتكرر بواسطة أنظمة المراقبة.

## نقاط النهاية ذات الصلة

- [نقاط نهاية ميزة التكوين](./config-feature-endpoints) - علامات توفر الميزة (تعتمد أيضًا على قاعدة البيانات)
- [نقاط نهاية مزامنة الإصدار](./version-sync-endpoints) - إصدار النظام وحالة المزامنة
