---
id: engagement-endpoints
title: "نقاط نهاية واجهة برمجة تطبيقات المشاركة"
sidebar_label: "المشاركة"
sidebar_position: 12
---

# نقاط نهاية واجهة برمجة تطبيقات المشاركة

توفر واجهة برمجة التطبيقات Engagement نقاط نهاية لاسترداد مقاييس المشاركة (المشاهدات والأصوات والتقييمات والمفضلات والتعليقات) وحساب درجات شعبية العناصر. تعمل نقاط النهاية هذه على تشغيل ميزات الفرز والتصنيف والتحليلات الخاصة بالقالب.

**الملفات المصدرية:**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## ملخص نقطة النهاية

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|احصل على|`/api/items/engagement`|لا شيء|جلب مقاييس المشاركة لعناصر متعددة|
|احصل على|`/api/items/popularity-scores`|لا شيء|الحصول على العناصر مرتبة حسب درجة الشعبية المحسوبة|

تستخدم كلا نقطتي النهاية `dynamic = 'force-dynamic'` لضمان الحصول على بيانات جديدة عند كل طلب.

---

## GET `/api/items/engagement`

Fetches engagement metrics for multiple items identified by their slugs. Returns a map of slug to metrics.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `slugs` | string | **Yes** | -- | Comma-separated list of item slugs |

### Constraints

- The `slugs` parameter is **required**. Omitting it returns a 400 error.
- Maximum of **200 slugs** per request. Exceeding this limit returns a 400 error.

### How It Works

```ts
const slugsParam = searchParams.get('slugs');
const slugs = slugsParam
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (slugs.length > 200) {
  return NextResponse.json(
    { error: 'Too many slugs. Maximum 200 allowed per request.' },
    { status: 400 }
  );
}

const metricsMap = await getEngagementMetricsPerItem(slugs);
```

### Response Shape

#### 200 -- Metrics Retrieved

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1250,
      "votes": 45,
      "avgRating": 4.2,
      "favorites": 89,
      "comments": 12
    },
    "another-item": {
      "views": 320,
      "votes": 8,
      "avgRating": 3.7,
      "favorites": 15,
      "comments": 3
    }
  }
}
```

#### 200 -- Empty (no slugs provided after parsing)

```json
{
  "metrics": {}
}
```

#### 400 -- Missing Slugs

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 -- Too Many Slugs

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

#### 500 -- Server Error

```json
{
  "error": "Failed to fetch engagement metrics"
}
```

### Usage Example

```ts
const slugs = ['tool-a', 'tool-b', 'tool-c'].join(',');
const res = await fetch(`/api/items/engagement?slugs=${slugs}`);
const { metrics } = await res.json();

// Access individual item metrics
const toolAViews = metrics['tool-a']?.views ?? 0;
```

---

## احصل على `/api/items/popularity-scores`

نقطة نهاية التصحيح/التحليلات التي تقوم بإرجاع العناصر مرتبة حسب نقاط شعبيتها المحسوبة. تستخدم خوارزمية التسجيل المقياس اللوغاريتمي وتأخذ في الاعتبار إشارات المشاركة المتعددة بالإضافة إلى الحداثة.

### معلمات الاستعلام

|المعلمة|اكتب|مطلوب|الافتراضي|الوصف|
|-----------|------|----------|---------|-------------|
|`limit`|عدد صحيح|لا| `20` |عدد العناصر المراد إرجاعها (الحد الأقصى 100)|
|`locale`|سلسلة|لا|`"en"`|لغة لجلب بيانات العنصر|

### خوارزمية التسجيل

يتم حساب درجة الشعبية كمجموع المكونات المرجحة:

|مكون|الوزن|صيغة|
|-----------|--------|---------|
|دفعة مميزة| +10,000 |مكافأة ثابتة للعناصر المميزة|
|وجهات النظر|1000x|`log10(views + 1) * 1000`|
|الأصوات|1200x|`log10(max(votes, 0) + 1) * 1200`|
|متوسط التقييم|500x|`avgRating * 500`|
|المفضلة|1,100x|`log10(favorites + 1) * 1100`|
|التعليقات|1000x|`log10(comments + 1) * 1000`|
|الحداثة (أقل من 30 يومًا)|ما يصل إلى +1000|الاضمحلال الخطي على مدى 30 يوما|
|الحداثة (30-90 يومًا)|ما يصل إلى +500|الاضمحلال الخطي خلال الـ 60 يومًا القادمة|
|الحداثة (90-180 يومًا)|ما يصل إلى +250|الاضمحلال الخطي خلال الـ 90 يومًا القادمة|

تتلقى العناصر التي لا تحتوي على بيانات المشاركة درجة احتياطية إرشادية بناءً على عدد العلامات وطول الاسم ووجود الرمز ووجود الرمز الترويجي.

### شكل الاستجابة

#### 200--تم استرجاع النتائج

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Rated Tool",
      "slug": "top-rated-tool",
      "featured": true,
      "score": 15230,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 3100,
        "votes": 1200,
        "rating": 430,
        "favorites": 200,
        "comments": 150,
        "recency": 150
      },
      "engagement": {
        "views": 1250,
        "votes": 45,
        "avgRating": 4.2,
        "favorites": 89,
        "comments": 12
      },
      "ageInDays": 15
    }
  ]
}
```

### مثال الاستخدام

```ts
// Fetch top 10 most popular items
const res = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await res.json();

items.forEach(item => {
  console.log(`#${item.rank} ${item.name} - Score: ${item.score}`);
});
```

### ملاحظات

- تتطابق خوارزمية التسجيل مع منطق فرز الإنتاج في `sort-utils.ts`.
- يمنع القياس اللوغاريتمي العناصر ذات عدد مرات المشاهدة العالية للغاية من السيطرة على الترتيب.
- تضمن مكافأة الحداثة حصول العناصر المضافة حديثًا على تعزيز رؤية مؤقت.
- يتم فرز العناصر حسب النتيجة تنازليا. يتم قطع العلاقات أبجديًا بالاسم.

### ملفات المصدر ذات الصلة

|ملف|الغرض|
|------|---------|
|`template/app/api/items/engagement/route.ts`|نقطة نهاية مقاييس المشاركة|
|`template/app/api/items/popularity-scores/route.ts`|نقطة النهاية لتسجيل الشعبية|
|`template/lib/db/queries/engagement.queries.ts`|استعلامات قاعدة البيانات لبيانات المشاركة|
|`template/lib/content.ts`|`getCachedItems` لبيانات العنصر|
