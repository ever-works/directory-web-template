---
id: view-tracking
title: عرض التتبع والمشاركة
sidebar_label: عرض التتبع
sidebar_position: 35
---

# عرض التتبع والمشاركة

يتضمن القالب نظام تتبع عرض يراعي الخصوصية ويسجل طرق عرض يومية فريدة لكل عنصر. فهو يدعم عدد مرات المشاهدة على صفحات العناصر، وتحليلات لوحة المعلومات، وتصنيفات العناصر الشائعة، وتسجيل الشعبية.

## نظرة عامة على الهندسة المعمارية

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## معالجة خط الأنابيب

عندما يقوم مستخدم بزيارة صفحة تفاصيل العنصر، يقوم المكون "0" بإطلاق طلب POST. يقوم الخادم بمعالجتها من خلال خط أنابيب متعدد المراحل:

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

### تنسيق الاستجابة

```json
{ "success": true, "counted": true }
```

| الرد | معنى |
|----------|--------|
| `counted: true` | تم تسجيل منظر جديد |
| `counted: false` | مكررة لهذا اليوم (نفس العارض + العنصر + التاريخ) |
| `counted: false, reason: "bot"` | تم اكتشاف وكيل مستخدم الروبوت |
| `counted: false, reason: "owner"` | مستخدم مصادق عليه يعرض العنصر الخاص به |

## تعقب من جانب العميل

4 هو مكون العميل الذي يطلق طلب POST واحد على التحميل:

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

يستخدم المتتبع أسلوب بذل أفضل الجهود: يتم تجاهل حالات الفشل بصمت، لذا لا يؤدي تتبع العرض إلى تعطيل تجربة المستخدم أبدًا.

## كشف الروبوتات

تحتفظ الوحدة 0 بقائمة من أنماط وكيل مستخدم الروبوت المعروفة، بما في ذلك برامج زحف محركات البحث وأدوات المراقبة والعملاء الآليين. عند اكتشاف روبوت، تقوم نقطة النهاية بإرجاع استجابة ناجحة بـ `counted: false` دون لمس قاعدة البيانات.

## تعريف المشاهد

تُنسب المشاهدات إلى معرف العارض المخزن في ملف تعريف ارتباط HTTP للطرف الأول فقط:

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### خصائص الخصوصية

- **لا توجد بيانات شخصية** - يحتوي ملف تعريف الارتباط على UUID عشوائي فقط، وليس على هوية المستخدم.
- **HTTP فقط** - لا يمكن لجافا سكريبت قراءة ملف تعريف الارتباط، مما يمنع عملية التتبع المستندة إلى XSS.
- **التراخي في نفس الموقع** - لا يتم إرسال ملف تعريف الارتباط بناءً على طلبات عبر الأصل.
- **العلامة الآمنة** - يتم فرضها في الإنتاج للمطالبة بـ HTTPS.
- **لا توجد خدمات تابعة لجهات خارجية** - تظل جميع بيانات التتبع في قاعدة بياناتك.

## إلغاء البيانات المكررة يوميًا

يستخدم منطق التسجيل الأساسي PostgreSQL `ON CONFLICT DO NOTHING` :

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

يحتوي الجدول `itemViews` على قيد فريد على `(itemId, viewerId, viewedDateUtc)` . يؤدي العرض الأول لليوم لزوج عنصر العارض إلى إدراج صف وإرجاع `true` . يتم تخطي المشاهدات اللاحقة في نفس اليوم بصمت. يتم حساب التاريخ على أنه UTC -3 لإلغاء البيانات المكررة بشكل متسق بغض النظر عن المنطقة الزمنية.

## استبعاد المالك

عندما يقوم مستخدم مصادق عليه بعرض العنصر الخاص به، لا يتم احتساب المشاهدة:

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

وهذا يمنع مالكي العناصر من زيادة عدد مرات المشاهدة بشكل مصطنع.

## استعلامات التجميع

يقوم الملف 0 بتصدير عدة وظائف للتحليلات:

| وظيفة | نوع الإرجاع | الوصف |
|----------|------------|-------------|
| `getTotalViewsCount(slugs)` | `number` | إجمالي مرات المشاهدة في جميع الأوقات عبر البزاقات الثابتة للعناصر |
| `getRecentViewsCount(slugs, days)` | 4ـ | المشاهدات ضمن نافذة منزلقة (افتراضي 7 أيام) |
| 5 ــ | 6ـ | خريطة ذات مفاتيح التاريخ للمخططات المؤشرة |
| `getViewsPerItem(slugs)` | 8ـ | إجمالي عدد المشاهدات لكل عنصر للتصنيفات |

## التكامل التحليلي

### نقاط الشعبية

يتم تغذية أعداد العرض في خوارزمية تسجيل الشعبية اللوغاريتمية التي يستخدمها نظام البطاقة المشتركة:

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

وهذا يضمن حصول العناصر ذات المشاهدات المتعددة على مرتبة أعلى في وضع الفرز "الشائع" مع منع النتائج الهاربة من العناصر واسعة الانتشار.

### لوحة تحكم العميل

تعرض لوحة معلومات العميل عند 0:
- إجمالي المشاهدات عبر جميع العناصر المقدمة
- المشاهدات في آخر 7 أيام مع مؤشرات الاتجاه
- رسم بياني للمشاهدات اليومية عبر `getDailyViewsData` ### لوحة تحكم المشرف

تستخدم لوحة معلومات المسؤول 2 لمقاييس العرض على مستوى الموقع. توفر نقطة نهاية التحليلات الجغرافية التوزيع الجغرافي لطرق العرض.

## معالجة الأخطاء

تتم معالجة أخطاء التتبع بصمت في الإنتاج:

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

يسجل وضع التطوير أخطاء التصحيح. يمنع الإنتاج إخراج وحدة التحكم لتجنب الضوضاء.

## التكوين

يعمل تتبع العرض تلقائيًا بدون أي متغيرات بيئة مطلوبة. النظام يتحلل بأمان:

- **لا توجد قاعدة بيانات** - تقوم نقطة النهاية بإرجاع 503 ويتجاهل العميل الفشل.
- **وضع محاكاة قاعدة البيانات** -- عند تمكينه، يتم تعقب المشاهدات مقابل البيانات التي تمت محاكاتها.
- **أعلام الميزات** - يتم عرض عدد المشاهدات بشكل مشروط بناءً على إعدادات القالب.

## إمكانية الوصول

- لا يعرض الرمز `ItemViewTracker` أي عناصر DOM، مما يضمن عدم وجود أي تأثير على تخطيط الصفحة وبرامج قراءة الشاشة.
- تستخدم أعداد المشاهدات المعروضة في البطاقات سمات `aria-label` لسياق قارئ الشاشة.
- تشتمل مخططات عرض لوحة المعلومات على عناوين وصفية ونص ملخص.

## الوثائق ذات الصلة

- [مكونات لوحة المعلومات](/docs/template/components/dashboard-components) -- عرض عرض الإحصائيات
- [مكونات البطاقة المشتركة](/docs/template/components/shared-card-components) -- نقاط الشعبية
- [تحليلات المشرف](/docs/template/features/admin-analytics) -- مقاييس العرض على مستوى الموقع
- [التصويت والتعليقات](/docs/template/features/voting-comments) -- ميزات المشاركة الأخرى
