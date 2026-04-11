---
id: featured-items
title: מערכת פריטים מומלצים
sidebar_label: פריטים נבחרים
sidebar_position: 2
---

# מערכת פריטים מומלצים

מערכת הפריטים המומלצים מאפשרת למנהלי מערכת להדגיש פריטים ספציפיים באתר עם הזמנה אישית, תאריכי תפוגה ובקרות הפעלה.

## מודל נתונים

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  itemDescription?: string;
  featuredOrder: number;        // Display position
  featuredUntil?: string;       // Expiration date (ISO string)
  isActive: boolean;
  featuredBy: string;           // Admin user ID
  featuredAt: string;           // When it was featured
  createdAt: string;
  updatedAt: string;
}
```

## ניהול אדמין

### useAdminFeaturedItems Hook

```typescript
import { useAdminFeaturedItems } from '@/hooks/use-admin-featured-items';

const {
  // Data
  featuredItems,        // FeaturedItem[]
  allItems,             // ItemData[] (for picker)
  filteredItems,        // FeaturedItem[] (after local search/filter)

  // State
  isLoading, isSubmitting,
  currentPage, totalPages, totalItems,
  searchTerm, showActiveOnly,

  // Actions
  setSearchTerm,        // (term: string) => void
  setShowActiveOnly,    // (active: boolean) => void
  addFeaturedItem,      // (data) => Promise<boolean>
  updateFeaturedItem,   // (id, data) => Promise<boolean>
  removeFeaturedItem,   // (id) => Promise<boolean>
  reorderItems,         // (orderedIds: string[]) => Promise<boolean>
  refetch, refreshData,
} = useAdminFeaturedItems({ page: 1, limit: 20 });
```

### תגובת API

ממשק API של פריטים מוצגים מחזיר תוצאות מעומדות עם מטא נתונים של ניווט:

```typescript
interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## הזמנה

פריטים מומלצים תומכים בסידור מחדש של גרירה ושחרור באמצעות הפונקציה `reorderItems` , המקבלת מערך של מזהים בסדר התצוגה הרצוי:

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

השדה `featuredOrder` קובע את מיקום התצוגה בחזית.

## תפוגה

ניתן להציג פריטים עם תאריך תפוגה אופציונלי ( `featuredUntil` ). כאשר מוגדר:
- הפריט אינו נכלל באופן אוטומטי מהתצוגה לאחר תאריך התפוגה
- מנהל מערכת יכול לראות פריטים שפג תוקפם על ידי החלפת מסנן `showActiveOnly` - הסרה ידנית נתמכת גם באמצעות `removeFeaturedItem` ## תצוגה בצד הלקוח

### useFeaturedItemsClient Hook

הקרס הפונה לציבור מביא פריטים מוצגים פעילים לתצוגה:

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### useFeatureItemsSection Hook

וו ברמה גבוהה יותר המספק היגיון תצוגה ברמת המקטע:

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## דגל תכונה

פריטים מומלצים מכבדים את דגל התכונה `featuredItems` :

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

התכונה מושבתת אוטומטית כאשר `DATABASE_URL` אינו מוגדר.

## נקודות קצה של ממשק API

| שיטה | נקודת קצה | תיאור |
|--------|--------|----------------|
| קבל | `/api/admin/featured-items` | רשימת פריטים מוצגים (בעמודים) |
| פוסט | `/api/admin/featured-items` | הוסף פריט מומלץ |
| PUT | `/api/admin/featured-items/:id` | עדכן את הגדרות הפריטים המוצגים |
| מחק | `/api/admin/featured-items/:id` | הסר מהמומלץ |
| PUT | `/api/admin/featured-items/reorder` | סדר מחדש פריטים נבחרים |
| קבל | `/api/featured-items` | ציבורי: קבל פריטים מוצגים פעילים |
