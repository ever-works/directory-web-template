---
id: location-endpoints
title: "مرجع واجهة برمجة التطبيقات للموقع"
sidebar_label: "الموقع"
sidebar_position: 51
---

# مرجع واجهة برمجة التطبيقات للموقع

## نظرة عامة

توفر نقاط نهاية الموقع إمكانية الوصول إلى فهرس الموقع المكاني للعناصر الموجودة في الدليل. وهي تدعم الاستعلام عن العناصر حسب المدينة والبلد والبحث القرب المستند إلى نصف القطر واسترداد بيانات الإحداثيات لعرض الخريطة. تتطلب جميع نقاط نهاية الموقع تمكين ميزة الموقع في إعدادات النظام.

## نقاط النهاية

### الحصول على /api/location/cities

إرجاع قائمة بأسماء المدن المميزة من فهرس الموقع.

**طلب**

لا توجد معلمات مطلوبة.

** الرد **
```typescript
{
  success: true;
  data: string[];   // Array of city names, e.g. ["San Francisco", "London", "Tokyo"]
}
```

**مثال**
```typescript
const response = await fetch('/api/location/cities');
const { data: cities } = await response.json();
// cities = ["San Francisco", "New York", "London", ...]
```

### الحصول على /api/location/countries

إرجاع قائمة بأسماء البلدان المميزة من فهرس المواقع.

**طلب**

لا توجد معلمات مطلوبة.

** الرد **
```typescript
{
  success: true;
  data: string[];   // Array of country names, e.g. ["United States", "United Kingdom"]
}
```

**مثال**
```typescript
const response = await fetch('/api/location/countries');
const { data: countries } = await response.json();
```

### الحصول على /api/location/الإحداثيات

إرجاع الإحداثيات لجميع العناصر المفهرسة، مع التصفية الاختيارية حسب المدينة أو البلد. تستخدم لعرض علامات الخريطة. يتم استبعاد العناصر البعيدة تلقائيًا.

**طلب**

|المعلمة|اكتب|في|الوصف|
|-----------|--------|-------|-------------|
|مدينة|سلسلة|الاستعلام|التصفية حسب اسم المدينة (حساسة لحالة الأحرف)|
|بلد|سلسلة|الاستعلام|التصفية حسب اسم البلد (حساسة لحالة الأحرف)|

** الرد **
```typescript
{
  success: true;
  data: Array<{
    slug: string;        // Item slug identifier
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
  }>;
}
```

**مثال**
```typescript
const response = await fetch('/api/location/coordinates?country=United States');
const { data: coordinates } = await response.json();
// coordinates[0] = { slug: "my-item", latitude: 37.77, longitude: -122.41, city: "San Francisco", country: "United States" }
```

### الحصول على /api/location/search

يبحث عن العناصر حسب الموقع الجغرافي باستخدام القرب المستند إلى نصف القطر أو اسم المدينة أو اسم البلد. إرجاع الارتباطات الثابتة للعناصر المطابقة ومعلومات المسافة الاختيارية.

**طلب**

|المعلمة|اكتب|في|الوصف|
|-----------|--------|-------|-------------|
|near_lat|رقم|الاستعلام|خط العرض للبحث نصف القطر|
|near_lng|رقم|الاستعلام|خط الطول للبحث نصف القطر|
|نصف القطر|رقم|الاستعلام|نصف القطر بالكيلومترات (الافتراضي: 50)|
|مدينة|سلسلة|الاستعلام|تصفية حسب اسم المدينة|
|بلد|سلسلة|الاستعلام|تصفية حسب اسم البلد|

مطلوب معلمة بحث واحدة على الأقل: `near_lat` + `near_lng`، `city`، أو `country`.

** الرد **
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Array of matching item slugs
    distances: Record<string, number>;  // Slug-to-distance-km map (radius search only)
  };
}
```

**مثال**
```typescript
// Radius search: items within 25km of San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }

// City search
const cityResponse = await fetch('/api/location/search?city=London');
const cityData = await cityResponse.json();
// cityData.data.slugs = ["item-c", "item-d"]
```

## المصادقة

جميع نقاط نهاية الموقع ** عامة ** -- لا يلزم المصادقة. ومع ذلك، يجب تمكين ميزة الموقع في إعدادات النظام. إذا تم تعطيل ميزات الموقع، فسترجع كافة نقاط النهاية `404` مع `"Location features are disabled"`.

## ردود الأخطاء

|الحالة|الوصف|
|--------|-------------|
| 400 |إحداثيات غير صالحة، أو نصف قطر غير صالح، أو معلمات البحث المطلوبة مفقودة|
| 404 |تم تعطيل ميزات الموقع في إعدادات النظام|
| 500 |خطأ داخلي في الخادم - فشل استعلام قاعدة البيانات|

## الحد من المعدل

لا يتم تطبيق أي حد واضح للمعدل على نقاط النهاية هذه. يتم استبعاد العناصر البعيدة/الافتراضية تلقائيًا من نتائج الإحداثيات.

## نقاط النهاية ذات الصلة

- [نقاط نهاية الكود الجغرافي](./geocode-endpoints) - الترميز الجغرافي الأمامي والخلفي (المسؤول فقط)
