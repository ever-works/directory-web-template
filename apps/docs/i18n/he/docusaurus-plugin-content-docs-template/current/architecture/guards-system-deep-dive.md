---
id: guards-system-deep-dive
title: "Guards System Deep Dive"
sidebar_label: "Guards System Deep Dive"
sidebar_position: 47
---

# Guards System Deep Dive

## סקירה כללית

מערכת ה-Guards מיישמת בקרת גישה מבוססת תוכנית מנויים. הוא מגדיר מטריצת תכונה מרכזית למיפוי תכונות לתוכניות מנוי (חינם, סטנדרטי, פרימיום), מספק מגבלות מספריות לכל תוכנית, ומציע ממשקי API פונקציונליים ומבוססי כיתה לבדיקה ואכיפת גישה. המערכת תומכת באכיפה בצד השרת באמצעות משמרות זריקה ושימוש בצד הלקוח באמצעות אובייקטי תוצאה תואמי React.

## אדריכלות

מודול השומרים גר ב-`lib/guards/` עם שני קבצים:

- **`lib/guards/plan-features.guard.ts`** -- יישום הליבה המכיל את כל הגדרות התכונות, מטריצת הגישה, מגבלות התוכנית, פונקציות בדיקת הגישה ומפעל השמירה.
- **`lib/guards/index.ts`** -- ייצוא חבית שמייצא מחדש הכל מקובץ השמירה.

מערכת השמירה תלויה ב-`PaymentPlan` מ-`@/lib/constants` עבור הגדרות סוג התוכנית והיא נצרכת על ידי מסלולי API, שירותים ו-React Hooks עבור שער תכונות.

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

## הפניה ל-API

### קבועים

#### `FEATURES`

אובייקט המכיל את כל קבועי מחרוזת התכונות:

|קטגוריה|תכונות|
|----------|----------|
|הגשה|`SUBMIT_PRODUCT`, `EXTENDED_DESCRIPTION`, `UNLIMITED_DESCRIPTION`, `UPLOAD_IMAGES`, `UPLOAD_VIDEO`, `VERIFIED_BADGE`, `SPONSORED_BADGE`|
|סקירה|`PRIORITY_REVIEW`, `INSTANT_REVIEW`|
|נראות|`SEARCH_VISIBILITY`, `CATEGORY_PLACEMENT`, `SPONSORED_POSITION`, `HOMEPAGE_FEATURED`, `NEWSLETTER_MENTION`|
|אנליטיקס|`VIEW_STATISTICS`, `ADVANCED_ANALYTICS`|
|תמיכה|`EMAIL_SUPPORT`, `PRIORITY_EMAIL_SUPPORT`, `PHONE_SUPPORT`|
|חברתי|`SOCIAL_SHARING`, `LEARN_MORE_BUTTON`|
|אחר|`FREE_MODIFICATIONS`, `UNLIMITED_SUBMISSIONS`|

#### `PLAN_LEVELS: Record<string, number>`

ערכי היררכיה של תוכנית: `FREE = 1`, `STANDARD = 2`, `PREMIUM = 3`.

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

מטריצת הגישה ממפה כל תכונה לתוכניות המותרות לה. סוגי גישה:
- `'all'` -- כל התוכניות יכולות לגשת
- `PaymentPlan` -- רק התוכנית הספציפית הזו
- `PaymentPlan[]` -- רק תוכניות רשומות
- `{ minPlan: PaymentPlan }` -- התוכנית הזו ומעלה

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

מגבלות מספריות לכל תוכנית:

|הגבלה|חינם|סטנדרטי|פרימיום|
|-------|------|----------|---------|
|`max_images`| 1 | 5 |בלתי מוגבל|
|`max_description_words`| 200 | 500 |בלתי מוגבל|
|`max_submissions`| 1 | 10 |בלתי מוגבל|
|`review_days`| 7 | 3 | 1 |
|`free_modification_days`| 0 | 30 | 365 |

### סוגים

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

### פונקציות

#### `canAccessFeature(feature: Feature, userPlan: string): boolean`

בודק אם לתוכנית יש גישה לתכונה המבוססת על מטריצת הגישה.

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

מחזירה את המגבלה המספרית עבור מפתח מגבלת תכונה ספציפי. מחזיר `null` ללא הגבלה.

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

בודק אם ערך נמצא במגבלה של התוכנית. מחזירה `true` אם המגבלה היא `null` (ללא הגבלה).

#### `getAccessibleFeatures(userPlan: string): Feature[]`

מחזירה מערך של כל התכונות הנגישות על ידי התוכנית הנתונה.

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

מחזירה את התוכנית הנמוכה ביותר שיכולה לגשת לתכונה. שימושי עבור הנחיות לשדרוג.

#### `getPlanLevel(plan: string): number`

מחזירה את רמת ההיררכיה המספרית עבור תוכנית (0 אם לא ידוע).

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

בודק אם התוכנית של המשתמש עומדת ברמת התוכנית הנדרשת או חורגת ממנה.

#### `createPlanGuard(userPlan: string)`

פונקציית מפעל שמחזירה אובייקט שומר המחובר לתוכנית משתמש ספציפית:

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

יוצר אובייקט תוצאה המתאים ל-React hooks, ומחשב מראש את רשימת התכונות הנגישות.

### שיעורי שגיאה

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

נזרק על ידי `requireFeature()` כאשר הגישה נדחתה. מכיל את כל המידע הדרוש להצגת בקשת שדרוג.

## פרטי יישום

**רזולוציית גישה**: `canAccessFeature()` מעריך את סוג הגישה לפי הסדר: `'all'` -> התאמת מחרוזת תוכנית יחידה -> מערך כולל בדיקה -> `{ minPlan }` השוואת היררכיה. תכונות לא ידועות מחזירות `false` עם אזהרת מסוף.

**השוואה מבוססת היררכיה**: `planMeetsRequirement()` משווה רמות מספריות מ-`PLAN_LEVELS`, ומאפשרת להגדיר תכונות באמצעות "תוכנית זו ומעלה" מבלי לפרט כל תוכנית במפורש.

**Null עבור בלתי מוגבל**: מגבלות משתמשות ב-`null` כדי לייצג ערכים בלתי מוגבלים. `isWithinLimit()` מקצר ל-`true` כשהמגבלה היא `null`.

**בטוח אבטיפוס לזיהום**: מפתחות תכונה מגיעים מהאובייקט הקבוע `FEATURES` ולעולם אינם נגזרים מקלט המשתמש.

## תצורה

כללי גישה לתכונות מוגדרים על ידי שינוי האובייקטים `FEATURE_ACCESS` ו-`PLAN_LIMITS` ב-`plan-features.guard.ts`. כדי להוסיף תכונה חדשה:

1. הוסף קבוע ל-`FEATURES`
2. הוסף כלל גישה ל-`FEATURE_ACCESS`
3. אפשר להוסיף מגבלות מספריות ל-`PLAN_LIMITS` (אם לתכונה יש הגבלות כמות)

## דוגמאות לשימוש

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

## שיטות עבודה מומלצות

- השתמש תמיד בקבועים `FEATURES` במקום מחרוזות גולמיות כדי לקבל בטיחות סוג והשלמה אוטומטית.
- השתמש ב-`createPlanGuard()` עם `requireFeature()` בנתיבי API ובשירותים עבור אכיפה בצד השרת שמזרקת שגיאות.
- השתמש ב-`createPlanGuardResult()` ברכיבי React עבור כניסת ממשק משתמש בצד הלקוח ללא יוצאים מן הכלל.
- בעת הוספת תכונות חדשות, התחל בהוספה למטריצת `FEATURES` ול-`FEATURE_ACCESS` לפני כתיבת היגיון שער כלשהו.
- תפוס `PlanGuardError` ברמת נתיב ה-API ותרגם אותו לתגובת 403 עם מידע שדרוג (`requiredPlan`).

## מודולים קשורים

- [Config Manager System](./config-manager-system) -- דגלי תכונות עבור תכונות תלויות מסד נתונים
- [מערכת שאילתה לקוח](./query-client-system) -- שליפת נתוני מנוי המוזנים לשומרי התוכנית
