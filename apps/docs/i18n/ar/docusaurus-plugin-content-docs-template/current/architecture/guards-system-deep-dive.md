---
id: guards-system-deep-dive
title: "الغوص العميق في نظام الحراس"
sidebar_label: "الغوص العميق في نظام الحراس"
sidebar_position: 47
---

# الغوص العميق في نظام الحراس

## نظرة عامة

يطبق نظام الحراس التحكم في الوصول إلى الميزات المستند إلى خطة الاشتراك. وهي تحدد ميزات تعيين مصفوفة ميزات مركزية لخطط الاشتراك (مجانية، قياسية، متميزة)، وتوفر حدودًا رقمية لكل خطة، وتوفر واجهات برمجة التطبيقات (APIs) الوظيفية والمستندة إلى الفئة للتحقق من الوصول وإنفاذه. يدعم النظام التنفيذ من جانب الخادم من خلال رمي الحراس والاستخدام من جانب العميل من خلال كائنات النتائج المتوافقة مع React.

## الهندسة المعمارية

وحدة الحراس موجودة في `lib/guards/` مع ملفين:

- **`lib/guards/plan-features.guard.ts`** - التنفيذ الأساسي الذي يحتوي على جميع تعريفات الميزات، ومصفوفة الوصول، وحدود الخطة، ووظائف التحقق من الوصول، ومصنع الحماية.
- **`lib/guards/index.ts`** - تصدير البرميل الذي يعيد تصدير كل شيء من ملف الحماية.

يعتمد نظام الحماية على `PaymentPlan` من `@/lib/constants` لتعريفات نوع الخطة ويتم استهلاكه بواسطة مسارات API والخدمات وخطافات React لبوابة الميزات.

```
lib/guards/
  |-- index.ts                  (barrel export)
  |-- plan-features.guard.ts    (core implementation)
      |-- PLAN_LEVELS           (hierarchy: FREE=1, STANDARD=2, PREMIUM=3)
      |-- FEATURES              (feature constants)
      |-- FEATURE_ACCESS        (feature -> plan mapping matrix)
      |-- PLAN_LIMITS           (numeric limits per plan)
      |-- canAccessFeature()    (check function)
      |-- createPlanGuard()     (guard factory)
      |-- createPlanGuardResult() (React hook helper)
      |-- PlanGuardError        (typed error class)
```

## مرجع واجهة برمجة التطبيقات

### الثوابت

#### `FEATURES`

كائن يحتوي على كافة ثوابت سلسلة الميزات:

|الفئة|الميزات|
|----------|----------|
|تقديم|`SUBMIT_PRODUCT`، `EXTENDED_DESCRIPTION`، `UNLIMITED_DESCRIPTION`، `UPLOAD_IMAGES`، `UPLOAD_VIDEO`، `VERIFIED_BADGE`، `SPONSORED_BADGE`|
|مراجعة|`PRIORITY_REVIEW`، `INSTANT_REVIEW`|
|الرؤية|`SEARCH_VISIBILITY`، `CATEGORY_PLACEMENT`، `SPONSORED_POSITION`، `HOMEPAGE_FEATURED`، `NEWSLETTER_MENTION`|
|التحليلات|`VIEW_STATISTICS`، `ADVANCED_ANALYTICS`|
|الدعم|`EMAIL_SUPPORT`، `PRIORITY_EMAIL_SUPPORT`، `PHONE_SUPPORT`|
|اجتماعي|`SOCIAL_SHARING`، `LEARN_MORE_BUTTON`|
|أخرى|`FREE_MODIFICATIONS`، `UNLIMITED_SUBMISSIONS`|

#### `PLAN_LEVELS: Record<string, number>`

قيم التسلسل الهرمي للخطة: `FREE = 1`، `STANDARD = 2`، `PREMIUM = 3`.

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

تقوم مصفوفة الوصول بتعيين كل ميزة إلى خططها المسموح بها. أنواع الوصول:
- `'all'` - يمكن الوصول إلى جميع الخطط
- `PaymentPlan` - تلك الخطة المحددة فقط
- `PaymentPlan[]` - الخطط المدرجة فقط
- `{ minPlan: PaymentPlan }` - تلك الخطة وما فوق

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

الحدود الرقمية لكل خطة:

|الحد|مجاني|قياسي|قسط|
|-------|------|----------|---------|
|`max_images`| 1 | 5 |غير محدود|
|`max_description_words`| 200 | 500 |غير محدود|
|`max_submissions`| 1 | 10 |غير محدود|
|`review_days`| 7 | 3 | 1 |
|`free_modification_days`| 0 | 30 | 365 |

### أنواع

#### `Feature`

```typescript
type Feature = (typeof FEATURES)[keyof typeof FEATURES];
// Union of all feature string values
```

#### `PlanGuardResult`

```typescript
interface PlanGuardResult {
  canAccess: (feature: Feature) => boolean;
  getLimit: <K extends keyof FeatureLimits>(limitName: K) => FeatureLimits[K];
  isWithinLimit: (limitName: keyof FeatureLimits, value: number) => boolean;
  accessibleFeatures: Feature[];
}
```

### وظائف

#### `canAccessFeature(feature: Feature, userPlan: string): boolean`

للتحقق مما إذا كانت الخطة تتمتع بإمكانية الوصول إلى الميزة بناءً على مصفوفة الوصول.

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

إرجاع الحد الرقمي لمفتاح حد ميزة معينة. إرجاع `null` لعدد غير محدود.

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

يتحقق مما إذا كانت القيمة ضمن حدود الخطة. يُرجع `true` إذا كان الحد هو `null` (غير محدود).

#### `getAccessibleFeatures(userPlan: string): Feature[]`

إرجاع مجموعة من جميع الميزات التي يمكن الوصول إليها من خلال الخطة المحددة.

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

إرجاع أقل خطة يمكنها الوصول إلى الميزة. مفيد لمطالبات الترقية.

#### `getPlanLevel(plan: string): number`

إرجاع مستوى التسلسل الهرمي الرقمي للخطة (0 إذا كان غير معروف).

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

يتحقق مما إذا كانت خطة المستخدم تلبي أو تتجاوز مستوى الخطة المطلوبة.

#### `createPlanGuard(userPlan: string)`

وظيفة المصنع التي تقوم بإرجاع كائن حماية مرتبط بخطة مستخدم محددة:

```typescript
const guard = createPlanGuard('standard');
guard.canAccess(feature)          // boolean check
guard.requireFeature(feature)     // throws PlanGuardError if denied
guard.getLimit(limitName)         // get numeric limit
guard.isWithinLimit(name, value)  // check within limit
guard.requireWithinLimit(name, v) // throws if exceeded
guard.getAccessibleFeatures()     // all accessible features
guard.getPlan()                   // current plan string
guard.getPlanLevel()              // current plan level number
```

#### `createPlanGuardResult(userPlan: string): PlanGuardResult`

ينشئ كائن نتيجة مناسبًا لخطافات React، ويجري حسابًا مسبقًا لقائمة الميزات التي يمكن الوصول إليها.

### فئات الخطأ

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

تم طرحه بواسطة `requireFeature()` عند رفض الوصول. يحتوي على كافة المعلومات اللازمة لإظهار مطالبة الترقية.

## تفاصيل التنفيذ

**دقة الوصول**: `canAccessFeature()` تقوم بتقييم نوع الوصول بالترتيب: `'all'` -> مطابقة سلسلة الخطة الفردية -> المصفوفة تتضمن الاختيار -> `{ minPlan }` مقارنة التسلسل الهرمي. ترجع الميزات غير المعروفة `false` مع تحذير وحدة التحكم.

**المقارنة القائمة على التسلسل الهرمي**: `planMeetsRequirement()` تقارن المستويات الرقمية من `PLAN_LEVELS`، مما يسمح بفصل الميزات عن طريق "هذه الخطة وما فوقها" دون إدراج كل خطة بشكل صريح.

**Null for Unlimited**: تستخدم الحدود `null` لتمثيل قيم غير محدودة. `isWithinLimit()` دوائر قصيرة إلى `true` عندما يكون الحد `null`.

**النموذج الأولي آمن للتلوث**: تأتي مفاتيح الميزات من الكائن الثابت `FEATURES` ولا يتم اشتقاقها أبدًا من مدخلات المستخدم.

## التكوين

يتم تكوين قواعد الوصول إلى الميزات عن طريق تعديل `FEATURE_ACCESS` و`PLAN_LIMITS` الكائنات في `plan-features.guard.ts`. لإضافة ميزة جديدة:

1. أضف ثابتًا إلى `FEATURES`
2. أضف قاعدة وصول إلى `FEATURE_ACCESS`
3. قم بإضافة حدود رقمية بشكل اختياري إلى `PLAN_LIMITS` (إذا كانت الميزة تحتوي على قيود الكمية)

## أمثلة الاستخدام

```typescript
// Simple feature check in an API route
import { canAccessFeature, FEATURES } from '@/lib/guards';

export async function POST(request: Request) {
  const userPlan = await getUserPlan(session);

  if (!canAccessFeature(FEATURES.UPLOAD_VIDEO, userPlan)) {
    return Response.json(
      { error: 'Video upload requires Premium plan' },
      { status: 403 }
    );
  }
  // ... handle upload
}

// Using the guard factory in a service
import { createPlanGuard, FEATURES } from '@/lib/guards';

async function submitProduct(data: ProductData, userPlan: string) {
  const guard = createPlanGuard(userPlan);

  // This throws PlanGuardError if not allowed
  guard.requireFeature(FEATURES.SUBMIT_PRODUCT);

  // Check numeric limits
  guard.requireWithinLimit('max_images', data.images.length);
  guard.requireWithinLimit('max_description_words', countWords(data.description));

  // Proceed with submission
  return await saveProduct(data);
}

// React hook usage
import { createPlanGuardResult, FEATURES } from '@/lib/guards';

function SubmissionForm({ userPlan }: { userPlan: string }) {
  const guard = createPlanGuardResult(userPlan);
  const imageLimit = guard.getLimit('max_images');

  return (
    <form>
      {guard.canAccess(FEATURES.UPLOAD_VIDEO) && <VideoUploader />}
      <ImageUploader maxImages={imageLimit ?? Infinity} />
      {!guard.canAccess(FEATURES.VERIFIED_BADGE) && (
        <UpgradePrompt feature="Verified Badge" />
      )}
    </form>
  );
}

// Get minimum plan for upgrade messaging
import { getMinimumPlanForFeature, FEATURES } from '@/lib/guards';

const requiredPlan = getMinimumPlanForFeature(FEATURES.ADVANCED_ANALYTICS);
// Returns PaymentPlan.PREMIUM
```

## أفضل الممارسات

- استخدم دائمًا الثوابت `FEATURES` بدلاً من السلاسل الأولية للحصول على أمان النوع والإكمال التلقائي.
- استخدم `createPlanGuard()` مع `requireFeature()` في مسارات وخدمات API للتنفيذ من جانب الخادم الذي يؤدي إلى حدوث أخطاء.
- استخدم `createPlanGuardResult()` في مكونات React لبوابة واجهة المستخدم من جانب العميل دون استثناءات.
- عند إضافة ميزات جديدة، ابدأ بإضافة الثابت `FEATURES` والمصفوفة `FEATURE_ACCESS` قبل كتابة أي منطق بوابة.
- التقط `PlanGuardError` على مستوى مسار واجهة برمجة التطبيقات (API) وقم بترجمتها إلى استجابة 403 مع معلومات الترقية (`requiredPlan`).

## الوحدات ذات الصلة

- [نظام إدارة التكوين](./config-manager-system) - علامات الميزات للميزات المعتمدة على قاعدة البيانات
- [نظام عميل الاستعلام](./query-client-system) - جلب بيانات الاشتراك التي تغذي حراس الخطة
