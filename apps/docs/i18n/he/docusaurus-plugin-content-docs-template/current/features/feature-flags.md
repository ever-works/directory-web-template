---
id: feature-flags
title: מערכת דגלים תכונה
sidebar_label: תכונה דגלים
sidebar_position: 9
---

# מערכת דגלים תכונה

התבנית Ever Works משתמשת במערכת דגלי תכונה כדי לטפל בחן בתלות חסרות, במיוחד זמינות מסד נתונים. תכונות התלויות במסד הנתונים מושבתות אוטומטית כאשר `DATABASE_URL` אינו מוגדר, מה שמאפשר לתבנית לפעול במצב תוכן סטטי.

## תצורה

ממוקם ב- `lib/config/feature-flags.ts` , מודול דגלי התכונות מספק רזולוציית דגל בצד השרת.

### הגדרות דגל

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### היגיון ברזולוציה

כל הדגלים הנוכחיים תלויים בזמינות מסד הנתונים:

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

## API בצד השרת

### getFeatureFlags

מחזיר את כל הדגלים כאובייקט:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

### isFeatureEnabled

סמן דגל בודד:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

### getDisabledFeatures

מחזירה מערך של שמות תכונות מושבתות, שימושי לניפוי באגים:

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### getEnabledFeatures

מחזירה מערך של שמות תכונה מופעלים:

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### כל התכונות מאושרות

בדיקה מהירה אם כל התכונות זמינות:

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## ווים בצד הלקוח

### useFeatureFlag

בדוק דגל תכונה יחיד בלקוח:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### השתמש בFeatureFlags

קבל את כל דגלי התכונות:

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### השתמש בתכונות דגלים עם סימולציה

וו מורחב התומך במצב הדמיית מנהל לבדיקת תכונות:

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

וו זה משמש את מערכת המועדפים כדי להפעיל/לבטל תכונות בפיתוח באופן מותנה.

## דוגמאות אינטגרציה

### עיבוד רכיב מותנה

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

### שער תכונה ברמת קרס

ווים רבים בודקים דגלים פנימיים. לדוגמה, `useFavorites` מאחזר רק כאשר תכונת המועדפים מופעלת:

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### נתיבי API מותנים

ניתן לבדוק דגלי תכונות גם בנתיבי API כדי להחזיר תגובות מתאימות:

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

## הוספת דגל תכונה חדשה

1. **הוסף את הדגל לממשק** ב- `lib/config/feature-flags.ts` :

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **הגדר את היגיון הרזולוציה** ב- `getFeatureFlags()` :

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **שימוש ברכיבים ובווים** באמצעות `isFeatureEnabled('newFeature')` או הווים בצד הלקוח.

## פילוסופיית עיצוב

מערכת דגל התכונה פשוטה בכוונה:
- **אין תלות בשירות חיצוני** - דגלים נפתרים ממשתני סביבה
- **אין תקורה של זמן ריצה** -- דגלים מחושבים פעם אחת לכל בקשה/עיבוד
- **השפלה חיננית** - מסד נתונים חסר משבית תכונות תלויות DB ללא שגיאות
- **ידידותי למפתחים** - שמות ברורים, סוגי TypeScript ופונקציות מסייעות
