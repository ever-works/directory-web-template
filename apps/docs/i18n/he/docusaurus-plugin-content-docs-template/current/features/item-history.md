---
id: item-history
title: היסטוריית פריטים וביקורת
sidebar_label: היסטוריית פריטים וביקורת
sidebar_position: 17
---

# היסטוריית פריטים וביקורת

תבנית Ever Works כוללת מערכת מסלול ביקורת מקיפה שעוקבת אחר כל השינויים שנעשו בפריטים לאורך מחזור החיים שלהם. כל יצירה, עדכון, שינוי סטטוס, סקירה, מחיקה ושחזור מתועדים עם מידע מפורט על שינוי, זהות מבצע וחותמות זמן.

## סקירה כללית של אדריכלות

| רכיב | נתיב | מטרה |
|---|---|---|
| `itemAuditService` | `lib/services/item-audit.service.ts` | שכבת שירות לרישום פעולות ביקורת |
| `item-audit.queries.ts` | `lib/db/queries/item-audit.queries.ts` | שאילתות מסד נתונים עבור יומן ביקורת CRUD |
| `useItemHistory` | `hooks/use-item-history.ts` | React Query וו להבאת יומני ביקורת |
| `ItemHistoryModal` | `components/admin/items/item-history-modal.tsx` | ממשק משתמש מודאלי לצפייה בהיסטוריית פריטים |

## פעולות ביקורת

המערכת עוקבת אחר שישה סוגי פעולות:

| פעולה | קבוע | תיאור |
|---|---|---|
| נוצר | `ItemAuditAction.CREATED` | הפריט נוצר |
| עודכן | `ItemAuditAction.UPDATED` | שדות הפריט שונו |
| המצב השתנה | `ItemAuditAction.STATUS_CHANGED` | סטטוס הפריט השתנה |
| נבדק | `ItemAuditAction.REVIEWED` | הפריט נבדק (אושר/נדחה) |
| נמחק | `ItemAuditAction.DELETED` | הפריט נמחק (רך או קשה) |
| שוחזר | `ItemAuditAction.RESTORED` | פריט שוחזר ממחיקה |

## שדות במעקב

שירות הביקורת עוקב אחר השדות הבאים לאיתור שינויים:

| שדה | הקלד |
|---|---|
| `name` | שם פריט |
| `description` | תיאור פריט |
| `source_url` | כתובת המקור/מוצר |
| `category` | הקצאת קטגוריה |
| `tags` | מערך תגים |
| `collections` | מטלות אוסף |
| `featured` | סטטוס מוצג |
| `icon_url` | כתובת אתר של סמל/לוגו |
| `status` | מצב פריט |

## שירות ביקורת פריטים

ה- `itemAuditService` מספק שיטות רישום ברמה גבוהה הנקראות ממסלולים ושירותי API.

### יצירת פריט רישום

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### רישום עדכוני פריטים

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### רישום ביקורות

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### מחיקה ושחזור רישום

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### עיצוב לא חוסם

כל רישום הביקורת עטוף בבלוקים של תפיסת ניסיון ולא יזרוק שגיאות שעלולות לחסום את הפעולה הראשית:

```tsx
async function logAction(params: LogActionParams): Promise<void> {
  try {
    await createItemAuditLog(createParams);
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    console.error('[ItemAuditService] Failed to log action:', error);
  }
}
```

## איתור שינוי

הפונקציה `detectChanges` משווה בין שני מצבי פריט ומחזירה הבדל מפורט:

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

פלט לדוגמה:

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

הפונקציה מטפלת בשוויון עמוק עבור מערכים (השוואה ממוינת) ומחזירה `null` אם לא מזוהים שינויים.

## שכבת מסד נתונים

### סכימת יומן ביקורת

כל ערך יומן ביקורת מכיל:

| שדה | הקלד | תיאור |
|---|---|---|
| `id` | `string` | מזהה ייחודי |
| `itemId` | `string` | שבלול/מזהה פריט |
| `itemName` | `string` | שם הפריט בזמן הפעולה |
| `action` | `ItemAuditActionValues` | סוג פעולה |
| `previousStatus` | `string \| null` | סטטוס לפני פעולה |
| `newStatus` | `string \| null` | סטטוס לאחר פעולה |
| `changes` | `JSON \| null` | פרטי שינוי ברמת השדה |
| `performedBy` | `string \| null` | מזהה משתמש שביצע את הפעולה |
| `performedByName` | `string \| null` | שם תצוגה של משתמש |
| `notes` | `string \| null` | הערות נוספות (למשל, הערות סקירה) |
| `metadata` | `JSON \| null` | נתוני הקשר נוספים |
| `createdAt` | `timestamp` | כאשר הפעולה התרחשה |

### פונקציות שאילתה

| פונקציה | תיאור |
|---|---|
| `createItemAuditLog(data)` | צור ערך חדש ביומן ביקורת |
| `getItemHistory(params)` | קבל היסטוריה מעומדת עם מידע על מבצעים |
| `getLatestItemAuditLog(itemId)` | קבל את הרשומה האחרונה ביומן |
| `getAuditLogsByAction(action, limit)` | סינון יומנים לפי סוג פעולה |
| `getAuditLogsByPerformer(userId, limit)` | סינון יומנים לפי מבצע |
| `getItemAuditStats(itemId)` | קבל פירוט ספירה לפי סוג פעולה |

### שאילתת היסטוריה מדורגת

```tsx
import { getItemHistory } from '@/lib/db/queries/item-audit.queries';

const result = await getItemHistory({
  itemId: 'my-item-slug',
  page: 1,
  limit: 20,
  actionFilter: ['updated', 'status_changed']
});

// Returns: { logs, total, page, limit, totalPages }
```

השאילתה מצטרפת לטבלה `users` כדי לכלול דוא"ל למבצעים לצד כל רשומת יומן.

## הקרס `useItemHistory`

```tsx
import { useItemHistory } from '@/hooks/use-item-history';

function ItemHistoryPanel({ itemId }) {
  const { data, isLoading, isError } = useItemHistory({
    itemId,
    page: 1,
    limit: 20,
    actionFilter: ['updated', 'reviewed'],
    enabled: true
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div>
      <p>Total entries: {data.total}</p>
      {data.logs.map(entry => (
        <div key={entry.id}>
          <span>{entry.action}</span>
          <span>{entry.performedByName}</span>
          <span>{entry.createdAt}</span>
        </div>
      ))}
    </div>
  );
}
```

### תצורת הוק

| אפשרות | ברירת מחדל | תיאור |
|---|---|---|
| `itemId` | נדרש | מזהה פריט/שבלול כדי להביא היסטוריה עבור |
| `page` | `1` | מספר עמוד |
| `limit` | `20` | פריטים בעמוד |
| `actionFilter` | `undefined` | מערך סוגי פעולות לסינון לפי |
| `enabled` | `true` | האם השאילתה פעילה |
| `staleTime` | 30 שניות | משך רעננות המטמון |

## מודל היסטוריית פריטים

הרכיב `ItemHistoryModal` מספק ממשק משתמש מלא לצפייה בהיסטוריית ביקורת פריטים:

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### תכונות מודאליות

| תכונה | תיאור |
|---|---|
| סינון פעולה | תפריט נפתח לסינון לפי סוג פעולה (נוצר, עודכן וכו') |
| ערכים מקודדים בצבע | לכל סוג פעולה יש סמל וערכת צבעים ברורים |
| שינויים הניתנים להרחבה | לחץ כדי להרחיב את פרטי השינוי ברמת השדה |
| חותמות זמן יחסיות | "לפני 2 שעות", "לפני 3 ימים" עם תאריך מלא על ריחוף |
| תצוגת מבצע | מציג שם משתמש, דואר אלקטרוני או "מערכת" עבור פעולות אוטומטיות |
| סקירת הקשר | מציג תוויות "אושר"/"נדחה" וסיבות דחייה |
| עימוד | עימוד מובנה עבור היסטוריות ארוכות |
| תמיכה במקלדת | מקש Escape סוגר את המודאל |

### ערכת צבעי פעולה

| פעולה | צבע | סמל |
|---|---|---|
| נוצר | ירוק | בנוסף |
| עודכן | כחול | עריכה2 |
| המצב השתנה | צהוב | RefreshCw |
| נבדק | סגול | CheckCircle |
| נמחק | אדום | אשפה2 |
| שוחזר | צהבהב | RotateCcw |

## קבצי מפתח

| קובץ | נתיב |
|---|---|
| שירות ביקורת | `lib/services/item-audit.service.ts` |
| שאילתות ביקורת | `lib/db/queries/item-audit.queries.ts` |
| הוק היסטוריה | `hooks/use-item-history.ts` |
| היסטוריה מודאלית | `components/admin/items/item-history-modal.tsx` |
