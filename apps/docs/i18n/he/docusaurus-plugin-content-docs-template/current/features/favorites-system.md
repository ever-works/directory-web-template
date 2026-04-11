---
id: favorites-system
title: מערכת מועדפים
sidebar_label: מועדפים
sidebar_position: 33
---

# מערכת מועדפים

תכונת המועדפים מאפשרת למשתמשים מאומתים לסמן פריטי ספרייה לסימניות לגישה מהירה. הוא כולל עמוד מועדפים ייעודי, עדכוני ממשק משתמש אופטימיים, ממשק API מלא של REST המגובה על ידי PostgreSQL, ושילוב עם דגלי תכונה לעיבוד מותנה.

## סקירה כללית של אדריכלות

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

## סכימת מסד נתונים

הטבלה `favorites` מאחסנת קשרי סימניות בין משתמשים ופריטים:

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

### החלטות עיצוב

- **מטא-נתונים לא מנורמלים** -- `itemName` , `itemIconUrl` ו- `itemCategory` מאוחסנים לצד הקלקול כך שרשימת המועדפים תוצג מבלי להצטרף לטבלת הפריטים.
- **אילוץ ייחודי מורכב** -- האינדקס `(userId, itemSlug)` מונע מועדפים כפולים ברמת מסד הנתונים.
- **חיפושים באינדקס** -- אינדקסים נפרדים ב- `userId` , `itemSlug` ו- `createdAt` מייעלים דפוסי שאילתות נפוצים לרישום, ספירה וסדר כרונולוגי.

## השתמש ב-Favorites Hook

ה-API הראשי בצד הלקוח עם תמיכה מלאה בעדכונים אופטימיים:

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

### ערך החזרה

| נכס | הקלד | תיאור |
|--------|------|--------|
| `favorites` | `Favorite[]` | רשימה נוכחית של מועדפי משתמשים |
| `isLoading` | `boolean` | נכון במהלך השליפה הראשונית |
| `error` | `Error \| null` | שגיאת אחזור אם ישנה |
| `refetch` | `() => void` | אחזר מחדש ידנית מועדפים |
| `isFavorited` | `(slug: string) => boolean` | בדוק אם פריט מסומן |
| `toggleFavorite` | `(data: AddFavoriteRequest) => void` | הוספה או הסרה על סמך המצב הנוכחי |
| `addFavorite` | `(data: AddFavoriteRequest) => void` | הוסף מועדף במפורש |
| `removeFavorite` | `(slug: string) => void` | הסר מועדף במפורש |
| `isAdding` | `boolean` | נכון בעוד מוטציית הוספה נמצאת בטיסה |
| `isRemoving` | `boolean` | נכון כאשר מוטציית הסרה נמצאת בטיסה |

### זרימת עדכון אופטימית

גם הוספה וגם הסרה של מוטציות עקוב אחר דפוס העדכון האופטימי של React Query:

1. ** `onMutate` ** -- בטל שאילתות בטיסה, צלם מצב קודם, החל את השינוי האופטימי באופן מיידי. הוסף מוטציות צור מועדף זמני עם מזהה `temp-` הקידומת.
2. ** `onError` ** -- חזור לתמונת המצב אם קריאת ה-API נכשלת, הצג טוסט שגיאה.
3. ** `onSuccess` ** -- החלף את הערך האופטימי בנתונים שאושרו על ידי השרת. מוטציית ההוספה מחליפה באופן מושכל את הכניסה הזמנית על ידי התאמה על `itemSlug` , ומונעת כפילויות.

פסילת `onSettled` מושמטת בכוונה כדי למנוע אחזורים מיותרים. העדכון האופטימי בתוספת עדכון המטמון `onSuccess` מספקים עקביות מספקת.

### שילוב דגל תכונה

השאילתה מופעלת רק כאשר שני התנאים מתקיימים:

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

כאשר דגל התכונה `favorites` מושבת או שהמשתמש אינו מאומת, ה-hook מחזיר מערך ריק מבלי לבצע בקשות רשת.

### שימוש

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

## נקודות קצה של ממשק API

### קבל /api/favorites

מחזיר את כל המועדפים עבור המשתמש המאומת, לפי תאריך היצירה.

### POST /api/favorites

מוסיף פריט למועדפים. מאמת עם Zod ובודק כפילויות (מחזיר 409 בקונפליקט).

| שדה | חובה | תיאור |
|-------|--------|--------|
| `itemSlug` | כן | מזהה פריט ייחודי |
| `itemName` | כן | שם תצוגה עבור רשימת המועדפים |
| `itemIconUrl` | לא | כתובת אתר של סמל לעיבוד |
| `itemCategory` | לא | תווית קטגוריה |

### מחק /api/favorites/[itemSlug]

מסיר פריט ספציפי מהמועדפים של המשתמש על ידי slug. מחזיר 404 אם לא נמצא.

## דף מועדפים

הרכיב `FavoritesClient` מציג את דף המועדפים המלא:

1. **שער אימות** -- בקשת כניסה למשתמשים לא מאומתים.
2. **שלד טוען** -- מציין רשת של 8 כרטיסים במהלך השליפה הראשונית.
3. **מצב שגיאה** -- הודעת שגיאה עם לחצן ניסיון חוזר.
4. **מצב ריק** -- הודעה עם קטע "פריטים פופולריים" חזרה.
5. **רשת מועדפים** -- פריטים המוצגים עם מיון, עימוד ומעבר פריסה.

### אפשרויות מיון

| ערך | תווית |
|-------|-------|
| `popularity` | פופולריות |
| `name-asc` | שם א-ז |
| `name-desc` | שם ז-א |
| `date-asc` | הוותיק ביותר |

### שילוב פריסה

העמוד משתלב עם `useLayoutTheme()` עבור החלפת תצוגת רשת/רשימה/כרטיס. `ViewToggle` ו `SortMenu` מופיעים מעל הפריטים. עימוד בצד הלקוח מחלק את המועדפים לדפים של 12, עם `clampAndScrollToTop` בשינוי עמוד.

## סנכרון בין מכשירים

המועדפים מאוחסנים בצד השרת ב-PostgreSQL, כך שהם מסתנכרנים אוטומטית בין מכשירים כאשר המשתמש מאומת. מטמון ה-React Query עם זמן ישן של 5 דקות מאזן בין רעננות לביצועים. סנכרון ידני זמין באמצעות הפונקציה `refetch` .

## נגישות

- כפתור ההחלפה המועדף מושבת במהלך מוטציות ממתינות כדי למנוע פעולות כפולות.
- הודעות טוסט מספקות משוב עבור פעולות מוצלחות ונכשלות כאחד.
- רשת דפי המועדפים משתמשת באותם רכיבי כרטיסים נגישים כמו הרשימה הראשית.
- מצבי ריק ושגיאה כוללים רכיבים הניתנים לפעולה עבור ניווט במקלדת.

## תיעוד קשור

- [דגלי תכונה](/docs/template/configuration/feature-config) -- הפעלה/השבתה של תכונת המועדפים
- [רכיבי כרטיסים משותפים](/docs/template/components/shared-card-components) -- עיבוד כרטיסים ברשת המועדפים
- [ספקי הקשר](/docs/template/components/context-providers) -- שילוב ערכת נושא של פריסה
- [רכיבי לוח מחוונים](/docs/template/components/dashboard-components) -- ספירות מועדפות בניתוח
