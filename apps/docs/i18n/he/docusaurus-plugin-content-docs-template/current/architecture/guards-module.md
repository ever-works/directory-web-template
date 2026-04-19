---
id: guards-module
title: מודול שומרים
sidebar_label: מודול שומרים
sidebar_position: 58
---

# מודול שומרים

מודול השומרים (`template/lib/guards/`) מספק מערכת בקרת גישה מבוססת תוכנית. הוא מגדיר אילו תוכניות מנוי יכולות לגשת לאילו תכונות, אוכף מגבלות מספריות לכל תוכנית, ומספק גם פונקציות של שמירה בצד השרת וגם בונה תוצאות ידידותי ל-React לשימוש בצד הלקוח.

## סקירה כללית של אדריכלות

```mermaid
graph TD
    A[User Plan] --> B[createPlanGuard]
    B --> C{canAccess?}
    C -->|Yes| D[Allow Feature]
    C -->|No| E[PlanGuardError]

    F[FEATURES] --> G[FEATURE_ACCESS Matrix]
    G --> C

    H[PLAN_LEVELS] --> I[planMeetsRequirement]
    I --> C

    J[PLAN_LIMITS] --> K[getFeatureLimit / isWithinLimit]

    L[createPlanGuardResult] --> M[React Hook Helper]
```

## קבצי מקור

|קובץ|תיאור|
|------|-------------|
|`lib/guards/index.ts`|יצוא חבית|
|`lib/guards/plan-features.guard.ts`|יישום שמירה מלא|

## היררכיית תוכניות

התוכניות מסודרות לפי רמה, כאשר רמות גבוהות יותר כוללות את כל התכונות של רמות נמוכות יותר כאשר מוגדרות עם `minPlan`:

```typescript
const PLAN_LEVELS: Record<string, number> = {
  free: 1,
  standard: 2,
  premium: 3,
};
```

### `getPlanLevel(plan: string): number`

מחזירה את הרמה המספרית עבור מחרוזת תוכנית. מחזיר `0` עבור תוכניות לא ידועות.

### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

בודק אם רמת התוכנית של משתמש גדולה או שווה לרמת התוכנית הנדרשת.

```typescript
planMeetsRequirement('premium', 'standard'); // true
planMeetsRequirement('free', 'standard');    // false
```

## הגדרות תכונה

כל התכונות הזמינות מוכרזות כקבועים:

```typescript
const FEATURES = {
  // Submission Features
  SUBMIT_PRODUCT: 'submit_product',
  EXTENDED_DESCRIPTION: 'extended_description',
  UNLIMITED_DESCRIPTION: 'unlimited_description',
  UPLOAD_IMAGES: 'upload_images',
  UPLOAD_VIDEO: 'upload_video',
  VERIFIED_BADGE: 'verified_badge',
  SPONSORED_BADGE: 'sponsored_badge',

  // Review & Priority
  PRIORITY_REVIEW: 'priority_review',
  INSTANT_REVIEW: 'instant_review',

  // Visibility & Placement
  SEARCH_VISIBILITY: 'search_visibility',
  CATEGORY_PLACEMENT: 'category_placement',
  SPONSORED_POSITION: 'sponsored_position',
  HOMEPAGE_FEATURED: 'homepage_featured',
  NEWSLETTER_MENTION: 'newsletter_mention',

  // Statistics & Analytics
  VIEW_STATISTICS: 'view_statistics',
  ADVANCED_ANALYTICS: 'advanced_analytics',

  // Support
  EMAIL_SUPPORT: 'email_support',
  PRIORITY_EMAIL_SUPPORT: 'priority_email_support',
  PHONE_SUPPORT: 'phone_support',

  // Social & Marketing
  SOCIAL_SHARING: 'social_sharing',
  LEARN_MORE_BUTTON: 'learn_more_button',

  // Modifications
  FREE_MODIFICATIONS: 'free_modifications',

  // Submissions
  UNLIMITED_SUBMISSIONS: 'unlimited_submissions',
} as const;

type Feature = (typeof FEATURES)[keyof typeof FEATURES];
```

## מטריצת גישה לתכונה

הרשומה `FEATURE_ACCESS` ממפה כל תכונה לכלל הגישה שלה:

```typescript
type FeatureAccess =
  | PaymentPlan             // Only that specific plan
  | PaymentPlan[]           // Any of these plans
  | 'all'                   // All plans have access
  | { minPlan: PaymentPlan }; // That plan and above
```

### סיכום כללי גישה

|תכונה|כלל גישה|
|---------|------------|
|`submit_product`|`'all'`|
|`extended_description`|`{ minPlan: 'standard' }`|
|`unlimited_description`|`'premium'`|
|`upload_images`|`'all'`|
|`upload_video`|`'premium'`|
|`verified_badge`|`{ minPlan: 'standard' }`|
|`sponsored_badge`|`'premium'`|
|`priority_review`|`{ minPlan: 'standard' }`|
|`instant_review`|`'premium'`|
|`search_visibility`|`'all'`|
|`category_placement`|`'all'`|
|`sponsored_position`|`'premium'`|
|`homepage_featured`|`'premium'`|
|`newsletter_mention`|`'premium'`|
|`view_statistics`|`{ minPlan: 'standard' }`|
|`advanced_analytics`|`'premium'`|
|`email_support`|`'all'`|
|`priority_email_support`|`{ minPlan: 'standard' }`|
|`phone_support`|`'premium'`|
|`social_sharing`|`{ minPlan: 'standard' }`|
|`learn_more_button`|`'premium'`|
|`free_modifications`|`{ minPlan: 'standard' }`|
|`unlimited_submissions`|`'premium'`|

## גבולות תוכנית

מגבלות מספריות לתכונות עם הגבלות כמות. `null` מציין ללא הגבלה.

```typescript
const PLAN_LIMITS: Record<PaymentPlan, FeatureLimits> = {
  free: {
    max_images: 1,
    max_description_words: 200,
    max_submissions: 1,
    review_days: 7,
    free_modification_days: 0,
  },
  standard: {
    max_images: 5,
    max_description_words: 500,
    max_submissions: 10,
    review_days: 3,
    free_modification_days: 30,
  },
  premium: {
    max_images: null,            // unlimited
    max_description_words: null, // unlimited
    max_submissions: null,       // unlimited
    review_days: 1,
    free_modification_days: 365,
  },
};
```

## גישה לפונקציות בדיקת

### `canAccessFeature(feature: Feature, userPlan: string): boolean`

בדיקת גישת ליבה שמעריכה את כלל הגישה לתכונה:

```typescript
import { canAccessFeature, FEATURES } from '@/lib/guards';

canAccessFeature(FEATURES.UPLOAD_VIDEO, 'premium');   // true
canAccessFeature(FEATURES.UPLOAD_VIDEO, 'standard');  // false
canAccessFeature(FEATURES.UPLOAD_IMAGES, 'free');     // true ('all')
canAccessFeature(FEATURES.VERIFIED_BADGE, 'standard'); // true (minPlan: standard)
canAccessFeature(FEATURES.VERIFIED_BADGE, 'free');     // false
```

### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

מחזירה את ערך הגבול עבור תוכנית:

```typescript
import { getFeatureLimit } from '@/lib/guards';

getFeatureLimit('max_images', 'free');     // 1
getFeatureLimit('max_images', 'premium');  // null (unlimited)
getFeatureLimit('review_days', 'standard'); // 3
```

### `isWithinLimit(limitName, value, userPlan): boolean`

בודק אם ערך נמצא במגבלה של התוכנית:

```typescript
import { isWithinLimit } from '@/lib/guards';

isWithinLimit('max_images', 3, 'free');     // false (limit: 1)
isWithinLimit('max_images', 3, 'standard'); // true (limit: 5)
isWithinLimit('max_images', 100, 'premium'); // true (unlimited)
```

### `getAccessibleFeatures(userPlan: string): Feature[]`

מחזירה את כל התכונות הנגישות לפי תוכנית נתונה.

### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

מחזירה את התוכנית הנמוכה ביותר שיכולה לגשת לתכונה.

## מפעל משמר תוכנית

### `createPlanGuard(userPlan: string)`

יוצר מופע שומר עם שיטות קשורות לתוכנית ספציפית:

```typescript
import { createPlanGuard, FEATURES } from '@/lib/guards';

const guard = createPlanGuard('standard');

// Check access
guard.canAccess(FEATURES.VERIFIED_BADGE); // true
guard.canAccess(FEATURES.PHONE_SUPPORT);  // false

// Require access (throws PlanGuardError)
guard.requireFeature(FEATURES.VERIFIED_BADGE); // OK
guard.requireFeature(FEATURES.PHONE_SUPPORT);  // throws!

// Limits
guard.getLimit('max_images');             // 5
guard.isWithinLimit('max_images', 3);     // true
guard.requireWithinLimit('max_images', 3); // OK
guard.requireWithinLimit('max_images', 10); // throws!

// Info
guard.getAccessibleFeatures();  // Feature[]
guard.getPlan();                // 'standard'
guard.getPlanLevel();           // 2
```

### `PlanGuardError`

שגיאה מותאמת אישית שנגרמה על ידי `requireFeature`:

```typescript
class PlanGuardError extends Error {
  readonly feature: Feature;
  readonly userPlan: string;
  readonly requiredPlan: PaymentPlan;
}
```

### דוגמה לטיפול בשגיאות

```typescript
import { createPlanGuard, PlanGuardError, FEATURES } from '@/lib/guards';

try {
  const guard = createPlanGuard(userPlan);
  guard.requireFeature(FEATURES.UPLOAD_VIDEO);
  // Proceed with video upload
} catch (error) {
  if (error instanceof PlanGuardError) {
    return NextResponse.json({
      error: `Upgrade to ${error.requiredPlan} to access this feature`,
      requiredPlan: error.requiredPlan,
    }, { status: 403 });
  }
  throw error;
}
```

## React Hook Helper

### `PlanGuardResult` ממשק

```typescript
interface PlanGuardResult {
  canAccess: (feature: Feature) => boolean;
  getLimit: <K extends keyof FeatureLimits>(limitName: K) => FeatureLimits[K];
  isWithinLimit: (limitName: keyof FeatureLimits, value: number) => boolean;
  accessibleFeatures: Feature[];
}
```

### `createPlanGuardResult(userPlan: string): PlanGuardResult`

יוצר אובייקט רגיל המתאים לשימוש בווים ורכיבים של React:

```typescript
import { createPlanGuardResult, FEATURES } from '@/lib/guards';

// In a custom hook
function usePlanGuard(plan: string) {
  return useMemo(() => createPlanGuardResult(plan), [plan]);
}

// In a component
function SubmissionForm({ userPlan }) {
  const guard = usePlanGuard(userPlan);

  return (
    <form>
      <ImageUploader
        maxImages={guard.getLimit('max_images') ?? Infinity}
        disabled={!guard.canAccess(FEATURES.UPLOAD_IMAGES)}
      />
      {guard.canAccess(FEATURES.UPLOAD_VIDEO) && <VideoUploader />}
    </form>
  );
}
```
