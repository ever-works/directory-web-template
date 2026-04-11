---
id: favorites-system
title: نظام المفضلة
sidebar_label: المفضلة
sidebar_position: 33
---

# نظام المفضلة

تتيح ميزة المفضلة للمستخدمين المعتمدين وضع إشارة مرجعية على عناصر الدليل للوصول السريع. يتضمن صفحة مفضلة مخصصة، وتحديثات متفائلة لواجهة المستخدم، وواجهة برمجة تطبيقات REST كاملة مدعومة بواسطة PostgreSQL، والتكامل مع علامات الميزات للعرض الشرطي.

## نظرة عامة على الهندسة المعمارية

```
hooks/
  use-favorites.ts           # React Query hook with optimistic mutations

components/favorites/
  favorites-client.tsx       # Full favorites page with grid, sorting, pagination

app/api/favorites/
  route.ts                   # GET (list) and POST (add) endpoints
  [itemSlug]/route.ts        # DELETE endpoint for removing a favorite

lib/db/schema.ts             # favorites table definition
```

## مخطط قاعدة البيانات

يخزن الجدول `favorites` علاقات الإشارات المرجعية بين المستخدمين والعناصر:

```ts
export const favorites = pgTable('favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemSlug: text('item_slug').notNull(),
  itemName: text('item_name').notNull(),
  itemIconUrl: text('item_icon_url'),
  itemCategory: text('item_category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  userItemIndex: uniqueIndex('user_item_favorite_unique_idx').on(table.userId, table.itemSlug),
  userIdIndex: index('favorites_user_id_idx').on(table.userId),
  itemSlugIndex: index('favorites_item_slug_idx').on(table.itemSlug),
  createdAtIndex: index('favorites_created_at_idx').on(table.createdAt),
}));
```

### قرارات التصميم

- **بيانات التعريف غير الطبيعية** - يتم تخزين `itemName` ، `itemIconUrl` ، و `itemCategory` جنبًا إلى جنب مع الوصلة الثابتة بحيث يتم عرض قائمة المفضلة دون الانضمام إلى جدول العناصر.
- **قيد فريد مركب** - يمنع الفهرس `(userId, itemSlug)` تكرار المفضلة على مستوى قاعدة البيانات.
- **عمليات البحث المفهرسة** - تعمل الفهارس المنفصلة على 4 و5 و6 على تحسين أنماط الاستعلام الشائعة للإدراج والعد والترتيب الزمني.

## خطاف استخدام المفضلة

واجهة برمجة التطبيقات الأساسية من جانب العميل مع دعم كامل للتحديث المتفائل:

```ts
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  createdAt: string;
  updatedAt: string;
}

interface AddFavoriteRequest {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}
```

### قيمة الإرجاع

| عقار | اكتب | الوصف |
|----------|------|-------------|
| `favorites` | `Favorite[]` | القائمة الحالية لمفضلات المستخدم |
| `isLoading` | `boolean` | صحيح أثناء الجلب الأولي |
| 4ـ | 5 ــ | جلب خطأ إن وجد |
| 6ـ | `() => void` | إعادة جلب المفضلة يدوياً |
| 8ـ | `(slug: string) => boolean` | تحقق مما إذا تم وضع إشارة مرجعية على العنصر |
| `toggleFavorite` | `(data: AddFavoriteRequest) => void` | إضافة أو إزالة بناءً على الحالة الحالية |
| ‹‹١٢› | 13 ــ | أضف المفضلة صراحة |
| 14 ــ | `(slug: string) => void` | إزالة المفضلة صراحة |
| 16 ــ | `boolean` | صحيح أثناء إضافة طفرة في الرحلة |
| 18 ــ | 19 ــ | صحيح أثناء إزالة الطفرة في الرحلة |

### تدفق التحديث المتفائل

تتبع كل من إضافة الطفرات وإزالتها نمط التحديث المتفائل لـ React Query:

1. ** `onMutate` ** -- إلغاء الاستعلامات على متن الطائرة، والتقاط لقطة للحالة السابقة، وتطبيق التغيير المتفائل على الفور. قم بإضافة طفرات لإنشاء مفضلة مؤقتة بمعرف يبدأ بـ 21.
2. ** `onError` ** -- ارجع إلى اللقطة إذا فشل استدعاء واجهة برمجة التطبيقات (API)، واعرض رسالة خطأ.
3. ** `onSuccess` ** -- استبدل الإدخال المتفائل بالبيانات المؤكدة من الخادم. تحل طفرة الإضافة محل الإدخال المؤقت بذكاء عن طريق المطابقة على 24، مما يمنع التكرارات.

تم حذف الإبطال 25 عمدًا لتجنب عمليات إعادة الجلب غير الضرورية. يوفر التحديث المتفائل بالإضافة إلى تحديث ذاكرة التخزين المؤقت 26 تناسقًا كافيًا.

### ميزة تكامل العلم

يتم تمكين الاستعلام فقط عند استيفاء الشرطين:

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

عند تعطيل علامة الميزة 0 أو عدم مصادقة المستخدم، يقوم الخطاف بإرجاع مصفوفة فارغة دون تقديم أي طلبات للشبكة.

### الاستخدام

```tsx
import { useFavorites } from '@/hooks/use-favorites';

function ItemCard({ item }) {
  const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();

  return (
    <button
      onClick={() => toggleFavorite({
        itemSlug: item.slug,
        itemName: item.name,
        itemIconUrl: item.icon,
        itemCategory: item.category,
      })}
      disabled={isAdding || isRemoving}
    >
      {isFavorited(item.slug) ? 'Unfavorite' : 'Favorite'}
    </button>
  );
}
```

## نقاط نهاية واجهة برمجة التطبيقات

### الحصول على /api/المفضلة

إرجاع كافة المفضلة للمستخدم المصادق عليه، مرتبة حسب تاريخ الإنشاء.

### POST /api/favorites

لإضافة عنصر إلى المفضلة. يتم التحقق من الصحة باستخدام Zod والتحقق من التكرارات (إرجاع 409 عند التعارض).

| المجال | مطلوب | الوصف |
|-------|----------|-------------|
| `itemSlug` | نعم | معرف العنصر الفريد |
| `itemName` | نعم | اسم العرض لقائمة المفضلة |
| `itemIconUrl` | لا | عنوان URL للرمز للعرض |
| `itemCategory` | لا | تسمية الفئة |

### حذف /api/favorites/[itemSlug]

إزالة عنصر معين من مفضلات المستخدم بواسطة سبيكة. إرجاع 404 إذا لم يتم العثور عليه.

## صفحة المفضلة

يعرض المكون `FavoritesClient` صفحة المفضلة كاملة:

1. **بوابة المصادقة** - مطالبة بتسجيل الدخول للمستخدمين غير المصادقين.
2. ** هيكل التحميل ** - عنصر نائب للشبكة مكون من 8 بطاقات أثناء الجلب الأولي.
3. **حالة الخطأ** - رسالة خطأ تحتوي على زر إعادة المحاولة.
4. **الحالة الفارغة** - رسالة تحتوي على قسم احتياطي "العناصر الشائعة".
5. **شبكة المفضلة** - العناصر المعروضة مع الفرز، وترقيم الصفحات، وتبديل التخطيط.

### خيارات الفرز

| القيمة | التسمية |
|-------|-------|
| 5 ــ | الشعبية |
| 6ـ | الاسم من الألف إلى الياء |
| `name-desc` | الاسم Z-A |
| 8ـ | الأقدم |

### تكامل التخطيط

تتكامل الصفحة مع `useLayoutTheme()` لتبديل عرض الشبكة/القائمة/البطاقة. يظهر الرقم 10 و11 أعلى العناصر. يقوم ترقيم الصفحات من جانب العميل بتقسيم المفضلة إلى صفحات مكونة من 12 صفحة، مع تغيير الرقم 12 في الصفحة.

## المزامنة عبر الأجهزة

يتم تخزين المفضلة على جانب الخادم في PostgreSQL، بحيث تتم مزامنتها تلقائيًا عبر الأجهزة عند مصادقة المستخدم. تعمل ذاكرة التخزين المؤقت React Query مع وقت قديم مدته 5 دقائق على موازنة الحداثة مع الأداء. تتوفر المزامنة اليدوية عبر الوظيفة .

## إمكانية الوصول

- يتم تعطيل زر التبديل المفضل أثناء الطفرات المعلقة لمنع الإجراءات المزدوجة.
- توفر إشعارات التوست تعليقات لكل من العمليات الناجحة والفاشلة.
- تستخدم شبكة صفحة المفضلة نفس مكونات البطاقة التي يمكن الوصول إليها مثل القائمة الرئيسية.
- تتضمن الحالات الفارغة وحالات الخطأ عناصر قابلة للتنفيذ للتنقل عبر لوحة المفاتيح.

## الوثائق ذات الصلة

- [إشارات الميزات](/docs/template/configuration/feature-config) -- تمكين/تعطيل ميزة المفضلة
- [مكونات البطاقة المشتركة](/docs/template/components/shared-card-components) -- عرض البطاقة في شبكة المفضلة
- [موفري السياق](/docs/template/components/context-providers) -- تكامل سمة التخطيط
- [مكونات لوحة المعلومات](/docs/template/components/dashboard-components) -- الأعداد المفضلة في التحليلات
