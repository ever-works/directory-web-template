---
id: feature-config
title: "הגדרת תכונות"
sidebar_label: "הגדרת תכונות"
sidebar_position: 3
---

# הגדרת תכונות

התבנית משתמשת במערכת דגלי תכונות כדי להפעיל או לבטל פונקציונליות בצורה אלגנטית בהתאם להגדרות המערכת. זה מאפשר לאפליקציה לעבוד ללא מסד נתונים (ומגישה תוכן סטטי בלבד) תוך הפעלה הדרגתית של תכונות ככל שהתשתית הופכת לזמינה.

## מודול דגלי תכונות

דגלי התכונות מוגדרים ב-`lib/config/feature-flags.ts`.

### ממשק FeatureFlags

```ts
interface FeatureFlags {
  /** פונקציונליות דירוגים וביקורות של משתמשים */
  ratings: boolean;
  /** תגובות משתמשים על פריטים */
  comments: boolean;
  /** אוסף פריטים מועדפים של משתמש */
  favorites: boolean;
  /** הצגת פריטים מומלצים מנוהלים על ידי מנהל */
  featuredItems: boolean;
  /** סקרי משתמשים ואיסוף משוב */
  surveys: boolean;
}
```

### כיצד נקבעים הדגלים

כל התכונות הנוכחיות תלויות בזמינות מסד הנתונים. תכונה מופעלת כאשר `DATABASE_URL` מוגדר:

```ts
export function getFeatureFlags(): FeatureFlags {
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

עיצוב זה מאפשר לתבנית לגשת לתוכן מ-CMS מבוסס-Git ללא כל מסד נתונים, בעוד שתכונות האינטראקטיביות התלויות במסד נתונים (דירוגים, תגובות, מועדפים) מושבתות אוטומטית.

### פונקציות עזר

המודול מספק מספר פונקציות עזר:

```ts
// בדיקת תכונה בודדת
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // עיבוד רכיב תגובות
}

// קבלת כל התכונות המופעלות
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();

// קבלת כל התכונות המושבתות (שימושי לניפוי שגיאות)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// בדיקה שהכל מוכן
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('הפלטפורמה המלאה פועלת');
}
```

### עיון מלא ב-API

| פונקציה | מחזירה | תיאור |
|----------|---------|-------------|
| `getFeatureFlags()` | `FeatureFlags` | כל הדגלים כאובייקט בוליאני |
| `isFeatureEnabled(name)` | `boolean` | בדיקת תכונה בודדת לפי שם |
| `getEnabledFeatures()` | `string[]` | מערך של שמות תכונות מופעלות |
| `getDisabledFeatures()` | `string[]` | מערך של שמות תכונות מושבתות |
| `areAllFeaturesEnabled()` | `boolean` | `true` אם כל תכונה מופעלת |

## עיבוד התלוי בתכונות

### ברכיבי שרת

```tsx
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export default function ItemDetailPage({ item }) {
  const showComments = isFeatureEnabled('comments');
  const showRatings = isFeatureEnabled('ratings');

  return (
    <div>
      <ItemDetail item={item} />
      {showRatings && <RatingSection itemId={item.id} />}
      {showComments && <CommentsSection itemId={item.id} />}
    </div>
  );
}
```

### במסלולי API

```ts
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'תכונת התגובות אינה זמינה' },
      { status: 503 }
    );
  }
  // טיפול ביצירת תגובה...
}
```

## הגדרת האתר (siteConfig)

מעבר לדגלי תכונות, התבנית מספקת אובייקט `siteConfig` ב-`lib/config.ts` להתאמת מיתוג ומטא-נתונים. ניתן לשנות כל ערך דרך משתני סביבה:

```ts
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://demo.ever.works',
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',
  // ...
} as const;
```

### התאמה אישית דרך משתני סביבה

| משתנה | ברירת מחדל | מטרה |
|----------|---------|---------|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | שם האתר במטא-נתונים ובתמונות OG |
| `NEXT_PUBLIC_SITE_TAGLINE` | ברירת מחדל של התבנית | סלוגן דף הבית |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | כתובת URL מלאה של האתר (ללא לוכסן בסוף) |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | נתיב לוגו יחסי ל-`/public` |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | שם ארגון Schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | ברירת מחדל של התבנית | תיאור מטא SEO |
| `NEXT_PUBLIC_SITE_KEYWORDS` | ברירות מחדל של התבנית | מילות מפתח SEO מופרדות בפסיקים |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | קישור "נבנה עם" בכותרת התחתית |

### אימות

הפונקציה `validateSiteConfig()` בודקת משתנים חסרים הקריטיים לייצור:

```ts
import { validateSiteConfig } from '@/lib/config';

// מחזיר true אם כל המשתנים הנדרשים מוגדרים, אחרת false עם אזהרות
const isValid = validateSiteConfig();
```

## ConfigManager (הגדרת YAML)

מחלקת `ConfigManager` ב-`lib/config-manager.ts` מנהלת את קובץ `config.yml` ממאגר CMS מבוסס-Git. היא מטפלת בקריאה, כתיבה וקומיט של שינויי הגדרות.

### קריאת הגדרות

```ts
import { configManager } from '@/lib/config-manager';

// קבלת ההגדרה המלאה
const config = configManager.getConfig();

// קבלת מפתח ספציפי
const pagination = configManager.getPaginationConfig();
```

### כתיבת הגדרות

כל הכתיבות מתחייבות ונשלחות אוטומטית למאגר Git:

```ts
// עדכון עימוד
await configManager.updatePagination('infinite', 24);

// עדכון כל מפתח ברמה העליונה
await configManager.updateKey('pagination', { type: 'standard', itemsPerPage: 20 });
```

### אבטחה

ConfigManager כולל הגנה מפני זיהום Prototype:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

## קבצים קשורים

| נתיב | תיאור |
|------|-------------|
| `lib/config/feature-flags.ts` | הגדרות דגלי תכונות ופונקציות עזר |
| `lib/config.ts` | siteConfig בטוח ללקוח וייצוא מחדש של טיפוסים |
| `lib/config-manager.ts` | קורא/כותב הגדרות YAML עם אינטגרציית Git |
| `lib/config/index.ts` | ייצוא Barrel עבור מודול ההגדרות |
| `lib/config/config-service.ts` | ConfigService Singleton בצד השרת |
| `lib/config/types.ts` | הגדרות טיפוסי TypeScript עבור הגדרות |
| `.env.example` | רשימה מלאה של אפשרויות משתני סביבה |
