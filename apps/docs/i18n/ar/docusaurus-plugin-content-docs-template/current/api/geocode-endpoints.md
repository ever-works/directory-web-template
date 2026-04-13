---
id: geocode-endpoints
title: "مرجع API للرمز الجغرافي"
sidebar_label: "الرمز الجغرافي"
sidebar_position: 50
---

# مرجع API للرمز الجغرافي

## نظرة عامة

توفر نقاط نهاية الكود الجغرافي إمكانات الترميز الجغرافي الأمامي (عنوان الإحداثيات) والتكويد الجغرافي العكسي (إحداثيات العنوان). يتم تخزين النتائج مؤقتًا لمدة 15 دقيقة لتقليل استدعاءات واجهة برمجة التطبيقات الخارجية. تتطلب نقاط النهاية هذه مصادقة المسؤول لمنع إساءة استخدام تكلفة خدمات الترميز الجغرافي Mapbox/Google الأساسية.

## نقاط النهاية

### ما بعد /api/الرمز الجغرافي

يحول عنوانًا إلى إحداثيات (ترميز جغرافي أمامي) أو إحداثيات إلى عنوان (ترميز جغرافي عكسي). يحدد نص الطلب العملية التي سيتم تنفيذها بناءً على ما إذا كان يتم توفير الحقول `address` أو `latitude`/`longitude`.

#### إعادة توجيه الترميز الجغرافي (عنوان الإحداثيات)

**طلب**
```typescript
{
  address: string;          // 1-500 characters, required
  options?: {
    countryCodes?: string[];  // ISO 3166-1 alpha-2 codes, e.g. ["US", "CA"]
    language?: string;        // ISO 639-1 language code, e.g. "en"
    proximity?: {
      latitude: number;       // -90 to 90
      longitude: number;      // -180 to 180
    };
  };
}
```

** الرد **
```typescript
{
  success: true;
  data: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
    confidence: number;       // 0 to 1
  };
}
```

**مثال**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
    options: {
      countryCodes: ['US'],
      language: 'en'
    }
  })
});
const data = await response.json();
```

#### عكس الترميز الجغرافي (إحداثيات العنوان)

**طلب**
```typescript
{
  latitude: number;         // -90 to 90, required
  longitude: number;        // -180 to 180, required
  options?: {
    language?: string;        // ISO 639-1 language code
  };
}
```

** الرد **
```typescript
{
  success: true;
  data: {
    formattedAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
  };
}
```

**مثال**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 37.4224764,
    longitude: -122.0842499,
    options: { language: 'en' }
  })
});
const data = await response.json();
```

### احصل على /api/geocode

إرجاع حالة خدمة الترميز الجغرافي بما في ذلك الموفرون الذين تم تكوينهم وإحصائيات ذاكرة التخزين المؤقت.

**طلب**

لا توجد هيئة طلب مطلوبة. المصادقة عبر ملف تعريف الارتباط للجلسة.

** الرد **
```typescript
{
  success: true;
  data: {
    enabled: boolean;         // Whether location features are enabled
    configured: boolean;      // Whether any geocoding provider is configured
    providers: {
      mapbox: boolean;
      google: boolean;
    };
    cache: {
      size: number;           // Current cache size
      maxSize: number;        // Maximum cache size (1000)
      ttlMs: number;          // Cache TTL in milliseconds (900000 = 15 min)
    };
  };
}
```

**مثال**
```typescript
const response = await fetch('/api/geocode');
const status = await response.json();
// status.data.providers.mapbox === true
```

## المصادقة

- **الحصول على /api/geocode**: يتطلب جلسة مصادق عليها (أي مستخدم).
- **POST /api/geocode**: يتطلب جلسة مصادق عليها مع **دور المسؤول**. يتلقى المستخدمون غير الإداريين استجابة `403 Forbidden`. يمنع هذا التقييد إساءة استخدام تكلفة واجهة برمجة التطبيقات (API).

## ردود الأخطاء

|الحالة|الوصف|
|--------|-------------|
| 400 |بيانات الطلب غير صالحة - عنوان مكتوب بشكل غير صحيح، أو إحداثيات غير صالحة، أو فشل التحقق من صحة المخطط|
| 401 |غير مصرح به - لا توجد جلسة مصادق عليها|
| 403 |محظور - مطلوب وصول المسؤول (POST فقط)|
| 404 |لم يتم العثور على نتائج الترميز الجغرافي للعنوان أو الإحداثيات المحددة|
| 503 |تم تعطيل ميزات الموقع في الإعدادات، أو لم يتم تكوين خدمة الترميز الجغرافي|

## الحد من المعدل

يتم تخزين النتائج مؤقتًا لمدة 15 دقيقة (TTL 900,000 مللي ثانية) مع الحد الأقصى لحجم ذاكرة التخزين المؤقت وهو 1,000 إدخال. يتم تسجيل جميع طلبات الترميز الجغرافي لأغراض تتبع التكلفة.

## نقاط النهاية ذات الصلة

- [نقاط نهاية الموقع](./location-endpoints) - البحث عن الموقع والمدن والبلدان والإحداثيات
