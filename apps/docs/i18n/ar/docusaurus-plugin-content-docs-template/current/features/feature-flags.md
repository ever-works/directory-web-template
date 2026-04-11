---
id: feature-flags
title: ميزة نظام الأعلام
sidebar_label: أعلام مميزة
sidebar_position: 9
---

# ميزة نظام الأعلام

يستخدم قالب Ever Works نظام علامات الميزات للتعامل بأمان مع التبعيات المفقودة، وخاصة توفر قاعدة البيانات. يتم تعطيل الميزات التي تعتمد على قاعدة البيانات تلقائيًا عند عدم تكوين `DATABASE_URL` ، مما يسمح للقالب بالعمل في وضع محتوى ثابت.

## التكوين

توفر وحدة إشارات الميزات، الموجودة في `lib/config/feature-flags.ts` ، دقة إشارة من جانب الخادم.

### تعريفات العلم

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### منطق القرار

تعتمد جميع العلامات الحالية على توفر قاعدة البيانات:

```typescript
function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

## واجهة برمجة التطبيقات من جانب الخادم

### getFeatureFlags

إرجاع كافة الأعلام ككائن:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

### تم تمكين الميزة

التحقق من علامة واحدة:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

### الحصول على ميزات معطلة

إرجاع مصفوفة من أسماء الميزات المعطلة، المفيدة لتصحيح الأخطاء:

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### الحصول على الميزات الممكّنة

إرجاع مجموعة من أسماء الميزات الممكّنة:

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### تم تمكين كافة الميزات

التحقق السريع من توفر جميع الميزات:

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## الخطافات من جانب العميل

### استخدام ميزة العلامة

تحقق من علامة ميزة واحدة على العميل:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### استخدامFeatureFlags

الحصول على جميع أعلام الميزات:

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### useFeatureFlagsWithSimulation

خطاف ممتد يدعم وضع محاكاة المسؤول لاختبار الميزات:

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

يتم استخدام هذا الخطاف بواسطة نظام المفضلة لتمكين/تعطيل الميزات قيد التطوير بشكل مشروط.

## أمثلة التكامل

### عرض المكونات الشرطية

```typescript
function ItemDetailPage({ item }) {
  const flags = getFeatureFlags();

  return (
    <div>
      <ItemDetails item={item} />
      {flags.comments && <CommentsSection itemId={item.id} />}
      {flags.ratings && <RatingWidget itemId={item.id} />}
      {flags.favorites && <FavoriteButton item={item} />}
    </div>
  );
}
```

### ميزة البوابات على مستوى الخطاف

تتحقق العديد من الخطافات من علامات الميزات داخليًا. على سبيل المثال، يتم جلب `useFavorites` فقط عند تمكين ميزة المفضلة:

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### مسارات واجهة برمجة التطبيقات المشروطة

يمكن أيضًا التحقق من علامات الميزات في مسارات واجهة برمجة التطبيقات (API) لإرجاع الاستجابات المناسبة:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export async function GET() {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // ... handle request
}
```

## إضافة علامة ميزة جديدة

1. **أضف العلامة إلى الواجهة** في `lib/config/feature-flags.ts` :

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **ضبط منطق الدقة** في 0:

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **استخدم في المكونات والخطافات** عبر `isFeatureEnabled('newFeature')` أو الخطافات من جانب العميل.

## فلسفة التصميم

نظام علامة الميزة بسيط عن قصد:
- **لا توجد تبعية لخدمة خارجية** - يتم حل العلامات من متغيرات البيئة
- **لا يوجد أي حمل إضافي لوقت التشغيل** - يتم حساب العلامات مرة واحدة لكل طلب/عرض
- **تدهور جميل** - تؤدي قاعدة البيانات المفقودة إلى تعطيل الميزات المعتمدة على قاعدة البيانات دون أخطاء
- **مناسب للمطورين** - مسح التسمية وأنواع TypeScript والوظائف المساعدة
