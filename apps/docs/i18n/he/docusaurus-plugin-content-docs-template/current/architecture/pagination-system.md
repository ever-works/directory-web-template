---
id: pagination-system
title: "מערכת עימוד"
sidebar_label: "מערכת עימוד"
sidebar_position: 45
---

# מערכת עימוד

## סקירה כללית

מערכת העימוד מספקת חישוב עימוד בצד השרת וכלי עזר לניווט בצד הלקוח. הוא מורכב משני מודולים קטנים וממוקדים: `lib/paginate.ts` לחישוב מטא-נתונים של עמודים (מספרי עמודים, קיזוזים) ו-`utils/pagination.ts` להידוק בטוח של מספרי עמודים והפעלת התנהגות גלילה למעלה בשינויי עמודים.

## אדריכלות

מערכת העימוד היא קלת משקל בכוונה ומפוצלת על פני שתי שכבות:

- **`lib/paginate.ts`** (שרת/משותף) -- פונקציות טהורות למתמטיקה של עימוד. משמש בנתיבי API, רכיבי שרת והיגיון של שליפת נתונים כדי לחשב איזו פרוסת נתונים להחזיר.
- **`utils/pagination.ts`** (Client) -- עוזר ממשק משתמש שמצמיד מספרי עמודים לטווחים חוקיים וגולל את העמוד למעלה. משמש על ידי רכיבי עימוד ותצוגות רשימה.

שני המודולים נצרכים על ידי רכיבי ממשק המשתמש העימוד ודפי רישום התוכן. ה-`ConfigManager` מספק את הערך `itemsPerPage` המוזן לחישובים אלה.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## הפניה ל-API

### ייצוא מ-`lib/paginate.ts`

#### `PER_PAGE: number`

פריטי ברירת מחדל לכל עמוד קבוע. ערך: `12`.

#### `totalPages(size: number, perPage?: number): number`

מחשב את המספר הכולל של עמודים עבור גודל אוסף נתון. משתמש ב-`Math.ceil()` כדי להבטיח שהדף החלקי האחרון נכלל.

**פרמטרים:**
- `size` -- מספר כולל של פריטים באוסף
- `perPage` -- פריטים בעמוד (ברירת המחדל היא `PER_PAGE`)

**החזרות:** ספירת דפים כוללת (מינימום 1 עבור אוספים לא ריקים)

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

מחשב מטא נתונים של עימוד מפרמטר דף גולמי (שעשוי להגיע כמחרוזת מפרמטרים של שאילתת כתובת URL).

**פרמטרים:**
- `rawPage` -- מספר העמוד המבוקש (ברירת המחדל הוא `1`). מקבל הן `number` והן `string`.
- `perPage` -- פריטים בעמוד (ברירת המחדל היא `PER_PAGE`)

**מחזירה:**
- `page` -- מספר העמוד המנתח כמספר שלם
- `start` -- היסט המדד המבוסס על אפס עבור חיתוך מערך הנתונים

### ייצוא מ-`utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

מנווט בבטחה לדף חדש על ידי הצמדת הערך לטווח החוקי `[1, total]`, עדכון מצב העמוד וגלילה של החלון לראשו עם אנימציה חלקה.

**פרמטרים:**
- `newPage` -- מספר העמוד המבוקש (יכול להיות מחוץ לטווח)
- `total` -- מספר כולל של עמודים
- `setPage` -- פונקציית קביעת מצב תגובה עבור הדף הנוכחי

**התנהגות:**
- מהדק את ערכי `NaN` לעמוד 1
- מהדק ערכים מתחת ל-1 לעמוד 1
- מהדק ערכים מעל `total` ל-`total`
- מתקשר `window.scrollTo({ top: 0, behavior: 'smooth' })` (בטוח עבור SSR; בודק `typeof window`)

## פרטי יישום

**ניתוח מחרוזות**: `paginateMeta` מקבל `string | number` עבור הפרמטר `rawPage` מכיוון שפרמטרים של שאילתת כתובת URL מגיעים כמחרוזות. הוא משתמש ב-`parseInt()` להמרה.

**היסט מבוסס אפס**: הערך `start` המוחזר על ידי `paginateMeta` מחושב כ-`(page - 1) * perPage`, ומספק אינדקס מבוסס אפס המתאים לסעיפים `Array.slice()` או SQL `OFFSET`.

**בטיחות SSR**: `clampAndScrollToTop` בודק `typeof window !== 'undefined'` לפני שמתקשרים ל-`window.scrollTo()`, מה שהופך את זה לבטוח להתקשר בהקשרי עיבוד בצד השרת.

**טיפול NaN**: `clampAndScrollToTop` ממיר את הקלט עם `Number()` ונופל חזרה לעמוד 1 אם התוצאה היא `NaN`.

## תצורה

גודל העמוד המוגדר כברירת מחדל (`PER_PAGE = 12`) הוא קבוע ב-`lib/paginate.ts`. ניתן לעקוף את גודל העמוד של זמן הריצה באמצעות `ConfigManager`:

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

ה-`ConfigManager` תומך בשני סוגי עימוד:
- `'standard'` -- ניווט עמוד אחר עמוד מסורתי
- `'infinite'` -- גלילה אינסופית / תבנית טען-עוד

## דוגמאות לשימוש

```typescript
// Server-side: compute pagination for an API response
import { totalPages, paginateMeta, PER_PAGE } from '@/lib/paginate';

function getItemsPage(items: Item[], rawPage: string | number) {
  const { page, start } = paginateMeta(rawPage);
  const pageItems = items.slice(start, start + PER_PAGE);
  const total = totalPages(items.length);

  return {
    items: pageItems,
    pagination: {
      page,
      totalPages: total,
      totalItems: items.length,
      perPage: PER_PAGE,
    },
  };
}

// Client-side: handle page change in a React component
import { clampAndScrollToTop } from '@/utils/pagination';
import { totalPages } from '@/lib/paginate';

function PaginatedList({ items }: { items: Item[] }) {
  const [page, setPage] = useState(1);
  const total = totalPages(items.length);

  return (
    <>
      <ItemGrid items={getPageSlice(items, page)} />
      <PaginationControls
        currentPage={page}
        totalPages={total}
        onPageChange={(newPage) => clampAndScrollToTop(newPage, total, setPage)}
      />
    </>
  );
}

// Using custom page size from ConfigManager
import { configManager } from '@/lib/config-manager';
import { totalPages, paginateMeta } from '@/lib/paginate';

const { itemsPerPage } = configManager.getPaginationConfig();
const { page, start } = paginateMeta(rawPage, itemsPerPage);
const total = totalPages(items.length, itemsPerPage);
```

## שיטות עבודה מומלצות

- השתמש תמיד ב-`paginateMeta()` כדי לנתח פרמטרים של עמודים ממחרוזות שאילתת כתובת URL כדי לטפל בבטחה בכפייה מסוג ובברירות מחדל.
- העבר את העקיפה `perPage` מ-`ConfigManager` במקום להסתמך על הקבוע הקשיח `PER_PAGE` כאשר ייתכן שהמנהל שינה את גודל העמוד.
- השתמש ב-`clampAndScrollToTop()` בכל הניווט בצד הלקוח כדי למנוע מספרי עמודים מחוץ לטווח ולספק UX עקבי.
- עבור יישומי גלילה אינסופיים, השתמש בהיסט `start` מ-`paginateMeta()` כדי לחשב את פרוסת הפריטים הבאה לצירוף.
- שקול את העימוד `type` מ-`ConfigManager` (`'standard'` לעומת `'infinite'`) בעת בחירת רכיב ממשק המשתמש העימוד לעיבוד.

## מודולים קשורים

- [Config Manager System](./config-manager-system) -- מספק תצורת עימוד בזמן ריצה (`type`, `itemsPerPage`)
- [ספריית תוכן](/template/architecture/content-library) -- משתמש בעימוד עבור דפי רישום תוכן
