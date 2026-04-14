---
id: items-engagement-endpoints
title: "مرجع واجهة برمجة تطبيقات مشاركة العناصر"
sidebar_label: "مشاركة العناصر"
sidebar_position: 54
---

# مرجع واجهة برمجة تطبيقات مشاركة العناصر

## نظرة عامة

توفر نقاط نهاية مشاركة العناصر إمكانية الوصول إلى مقاييس المشاركة ودرجات الشعبية لعناصر الدليل. يتضمن ذلك عدد المشاهدات والأصوات والتقييمات والمفضلة والتعليقات. بالإضافة إلى ذلك، تحسب نقطة النهاية لنقاط الشعبية التصنيف المرجح الذي يأخذ في الاعتبار مقاييس المشاركة والحالة المميزة وحداثة المحتوى.

## نقاط النهاية

### الحصول على /api/items/engagement

جلب مقاييس المشاركة لعناصر متعددة من خلال الارتباطات الثابتة الخاصة بها في طلب دفعة واحد.

**طلب**

|المعلمة|اكتب|في|الوصف|
|-----------|--------|-------|-------------|
|الرخويات|سلسلة|الاستعلام|قائمة مفصولة بفواصل من الارتباطات الثابتة للعناصر (مطلوب، الحد الأقصى 200)|

** الرد **
```typescript
{
  metrics: Record<string, {
    views: number;
    votes: number;
    avgRating: number;
    favorites: number;
    comments: number;
  }>;
}
```

**مثال**
```typescript
const response = await fetch('/api/items/engagement?slugs=item-one,item-two,item-three');
const { metrics } = await response.json();

// metrics["item-one"] = { views: 1500, votes: 42, avgRating: 4.2, favorites: 18, comments: 7 }
```

### الحصول على /api/items/popularity-scores

نقطة نهاية التصحيح التي تقوم بإرجاع العناصر التي تم فرزها حسب نقاط الشعبية المحسوبة مع تفاصيل تفصيلية لعوامل التسجيل. مفيد لفهم كيفية ترتيب خوارزمية الفرز للعناصر.

**طلب**

|المعلمة|اكتب|في|الوصف|
|-----------|--------|-------|-------------|
|الحد|رقم|الاستعلام|عدد العناصر المطلوب إرجاعها (الافتراضي: 20، الحد الأقصى: 100)|
|لغة|سلسلة|الاستعلام|رمز اللغة للعناصر (الافتراضي: "en")|

** الرد **
```typescript
{
  totalItems: number;
  showing: number;
  items: Array<{
    rank: number;
    name: string;
    slug: string;
    featured: boolean;
    score: number;               // Total computed score (rounded)
    scoreBreakdown: {
      featured: number;          // 10000 if featured, 0 otherwise
      views: number;             // log10(views + 1) * 1000
      votes: number;             // log10(votes + 1) * 1200
      rating: number;            // avgRating * 500
      favorites: number;         // log10(favorites + 1) * 1100
      comments: number;          // log10(comments + 1) * 1000
      recency: number;           // Decays over 180 days
    };
    engagement: {
      views: number;
      votes: number;
      avgRating: number;
      favorites: number;
      comments: number;
    } | null;
    ageInDays: number;
  }>;
}
```

**مثال**
```typescript
const response = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await response.json();

// items[0] = { rank: 1, name: "Top Item", score: 15234, scoreBreakdown: { ... }, ... }
```

## المصادقة

كلا نقطتي النهاية **عامة** -- لا يلزم المصادقة. تم وضع علامة عليها على أنها `force-dynamic` لضمان الحصول على بيانات جديدة عند كل طلب.

## ردود الأخطاء

|الحالة|الوصف|
|--------|-------------|
| 400 |المعلمة `slugs` مفقودة أو أكثر من 200 حلقة ثابتة متوفرة (نقطة نهاية المشاركة)|
| 500 |خطأ داخلي في الخادم - فشل استعلام قاعدة البيانات|

## الحد من المعدل

لا يوجد حد واضح للسعر. تحدد نقطة نهاية المشاركة حجم الدُفعة بـ 200 خلية ثابتة لكل طلب لمنع إساءة الاستخدام. تتجاوز كلا نقطتي النهاية التخزين المؤقت لـ Next.js عبر `export const dynamic = 'force-dynamic'`.

## نقاط النهاية ذات الصلة

- [نقاط نهاية ميزة التكوين](./config-feature-endpoints) - التحقق من تمكين ميزات التقييمات/المفضلة/التعليقات
