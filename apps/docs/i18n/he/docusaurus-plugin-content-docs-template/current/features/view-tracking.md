---
id: view-tracking
title: הצג מעקב ומעורבות
sidebar_label: הצג מעקב
sidebar_position: 35
---

# הצג מעקב ומעורבות

התבנית כוללת מערכת מעקב צפיות מודעת לפרטיות המתעדת צפיות יומיות ייחודיות לכל פריט. זה מעניק ספירת צפיות בדפי פריט, ניתוח לוח מחוונים, דירוג פריטים מגמתיים וציון פופולריות.

## סקירה כללית של אדריכלות

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## צינור עיבוד

כאשר משתמש מבקר בדף פרטי פריט, הרכיב `ItemViewTracker` מפעיל בקשת POST. השרת מעבד אותו באמצעות צינור רב-שלבי:

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

### פורמט תגובה

```json
{ "success": true, "counted": true }
```

| תגובה | המשמעות |
|--------|--------|
| `counted: true` | תצוגה חדשה נרשמה |
| `counted: false` | שכפול להיום (אותו צופה + פריט + תאריך) |
| `counted: false, reason: "bot"` | זוהה סוכן משתמש בוט |
| `counted: false, reason: "owner"` | משתמש מאומת צופה בפריט שלו |

## עוקב בצד הלקוח

ה- `ItemViewTracker` הוא רכיב לקוח שמפעיל בקשת POST יחידה בטעינה:

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

הגשש משתמש בגישת המאמץ הטוב ביותר: מתעלמים מכשלים בשקט, כך שמעקב צפייה לעולם לא משבש את חווית המשתמש.

## זיהוי בוטים

המודול `lib/utils/bot-detection.ts` שומר רשימה של דפוסי משתמש-סוכנים ידועים של בוט כולל סורקים של מנועי חיפוש, כלי ניטור ולקוחות אוטומטיים. כאשר בוט מזוהה, נקודת הקצה מחזירה תגובה מוצלחת עם `counted: false` מבלי לגעת במסד הנתונים.

## זיהוי צופה

צפיות מיוחסות למזהה צופה המאוחסן בקובץ Cookie של צד ראשון מסוג HTTP בלבד:

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### מאפייני פרטיות

- **ללא נתונים אישיים** - קובץ ה-cookie מכיל רק UUID אקראי, לא את זהות המשתמש.
- **HTTP בלבד** - JavaScript אינו יכול לקרוא את קובץ ה-cookie, מה שמונע פליטת מעקב מבוסס XSS.
- **רפיון באותו אתר** -- העוגייה לא נשלחת בבקשות צולבות מקורות.
- **דגל מאובטח** - נאכף בייצור כדי לדרוש HTTPS.
- **אין שירותי צד שלישי** - כל נתוני המעקב נשארים במסד הנתונים שלך.

## מניעת כפילות יומית

לוגיקת ההקלטה הליבה משתמשת ב- `ON CONFLICT DO NOTHING` של PostgreSQL:

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

לטבלה `itemViews` יש מגבלה ייחודית על `(itemId, viewerId, viewedDateUtc)` . התצוגה הראשונה של היום עבור זוג צופה-פריטים מכניסה שורה ומחזירה `true` . צפיות עוקבות באותו היום מדלגות בשקט. התאריך מחושב כ-UTC `YYYY-MM-DD` למניעת כפילויות עקבית ללא קשר לאזור זמן.

## אי הכללת בעלים

כאשר משתמש מאומת מציג את הפריט שלו, התצוגה לא נספרת:

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

זה מונע מבעלי פריטים להגדיל באופן מלאכותי את ספירת הצפיות שלהם.

## שאילתות צבירה

הקובץ `item-view.queries.ts` מייצא מספר פונקציות לניתוח:

| פונקציה | סוג החזרה | תיאור |
|--------|-------------|--------|
| `getTotalViewsCount(slugs)` | `number` | סך כל הצפיות בכל הזמנים על פני שבלולים של פריט |
| `getRecentViewsCount(slugs, days)` | `number` | צפיות בתוך חלון הזזה (ברירת מחדל 7 ימים) |
| `getDailyViewsData(slugs, days)` | `Map<string, number>` | מפה עם מפתח תאריך עבור תרשימי ניצוץ |
| `getViewsPerItem(slugs)` | `Map<string, number>` | סה"כ צפיות לכל פריט לדירוג |

## שילוב אנליטיקס

### ציון פופולריות

ספירת הצפיות נקלטת באלגוריתם ניקוד הפופולריות הלוגריתמי המשמש את מערכת הכרטיסים המשותפים:

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

זה מבטיח פריטים עם צפיות רבות מדורגים גבוה יותר במצב מיון "פופולרי" תוך מניעת ציוני בריחה מפריטים ויראליים.

### לוח מחוונים ללקוח

לוח המחוונים של הלקוח ב- `/client/dashboard` מציג:
- סך כל הצפיות בכל הפריטים שנשלחו
- צפיות ב-7 הימים האחרונים עם מחווני מגמה
- תרשים צפיות יומי באמצעות `getDailyViewsData` ### לוח המחוונים לניהול

לוח המחוונים לניהול משתמש ב- `GET /api/admin/dashboard/stats` עבור מדדי תצוגה ברחבי האתר. נקודת הקצה הגיאוגרפית מספקת הפצה גיאוגרפית של תצוגות.

## טיפול בשגיאות

שגיאות מעקב צפייה מטופלות בשקט בייצור:

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

מצב פיתוח רושם שגיאות עבור ניפוי באגים. הייצור מדכא את פלט הקונסולה כדי למנוע רעש.

## תצורה

מעקב אחר צפייה פועל באופן אוטומטי ללא משתני סביבה נדרשים. המערכת משפילה בחן:

- **ללא מסד נתונים** -- נקודת הקצה מחזירה 503 והלקוח מתעלם מהכשל.
- **מצב הדמיית מסד נתונים** - כאשר מופעל, התצוגות עוקבות אחר נתונים מדומים.
- **דגלי תכונה** - ספירת הצפיות מוצגת בהתאם להגדרות התבנית.

## נגישות

- ה- `ItemViewTracker` אינו מציג רכיבי DOM, מה שמבטיח אפס השפעה על פריסת העמוד וקוראי המסך.
- ספירת צפיות המוצגת בכרטיסים משתמשת בתכונות `aria-label` להקשר של קורא מסך.
- תרשימי תצוגת לוח המחוונים כוללים כותרות תיאוריות וטקסט סיכום.

## תיעוד קשור

- [רכיבי לוח מחוונים](/docs/template/components/dashboard-components) -- הצג תצוגת סטטיסטיקה
- [רכיבי כרטיסים משותפים](/docs/template/components/shared-card-components) -- ניקוד פופולריות
- [Admin Analytics](/docs/template/features/admin-analytics) -- מדדי תצוגה ברחבי האתר
- [הצבעות והערות](/docs/template/features/voting-comments) -- תכונות מעורבות אחרות
