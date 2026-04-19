---
id: engagement-endpoints
title: "Engagement API Endpoints"
sidebar_label: "אירוסין"
sidebar_position: 12
---

# Engagement API Endpoints

ה-API של Engagement מספק נקודות קצה לאחזור מדדי מעורבות (צפיות, הצבעות, דירוגים, מועדפים, הערות) ומחשוב ציוני פופולריות לפריטים. נקודות קצה אלו מפעילות את תכונות המיון, הדירוג והניתוח של התבנית.

**קבצי מקור:**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## סיכום נקודות קצה

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|קבל|`/api/items/engagement`|אין|אחזר מדדי מעורבות עבור פריטים מרובים|
|קבל|`/api/items/popularity-scores`|אין|קבל פריטים ממוינים לפי ציון פופולריות מחושב|

שתי נקודות הקצה משתמשות ב-`dynamic = 'force-dynamic'` כדי להבטיח נתונים טריים בכל בקשה.

---

## GET `/api/items/engagement`

Fetches engagement metrics for multiple items identified by their slugs. Returns a map of slug to metrics.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `slugs` | string | **Yes** | -- | Comma-separated list of item slugs |

### Constraints

- The `slugs` parameter is **required**. Omitting it returns a 400 error.
- Maximum of **200 slugs** per request. Exceeding this limit returns a 400 error.

### How It Works

```ts
const slugsParam = searchParams.get('slugs');
const slugs = slugsParam
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (slugs.length > 200) {
  return NextResponse.json(
    { error: 'Too many slugs. Maximum 200 allowed per request.' },
    { status: 400 }
  );
}

const metricsMap = await getEngagementMetricsPerItem(slugs);
```

### Response Shape

#### 200 -- Metrics Retrieved

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1250,
      "votes": 45,
      "avgRating": 4.2,
      "favorites": 89,
      "comments": 12
    },
    "another-item": {
      "views": 320,
      "votes": 8,
      "avgRating": 3.7,
      "favorites": 15,
      "comments": 3
    }
  }
}
```

#### 200 -- Empty (no slugs provided after parsing)

```json
{
  "metrics": {}
}
```

#### 400 -- Missing Slugs

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 -- Too Many Slugs

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

#### 500 -- Server Error

```json
{
  "error": "Failed to fetch engagement metrics"
}
```

### Usage Example

```ts
const slugs = ['tool-a', 'tool-b', 'tool-c'].join(',');
const res = await fetch(`/api/items/engagement?slugs=${slugs}`);
const { metrics } = await res.json();

// Access individual item metrics
const toolAViews = metrics['tool-a']?.views ?? 0;
```

---

## קבל `/api/items/popularity-scores`

נקודת קצה באגים/ניתוח שמחזירה פריטים ממוינים לפי ציון הפופולריות המחושב שלהם. אלגוריתם הניקוד משתמש בקנה מידה לוגריתמי ולוקח בחשבון מספר אותות מעורבות בתוספת עדכניות.

### פרמטרי שאילתה

|פרמטר|הקלד|חובה|ברירת מחדל|תיאור|
|-----------|------|----------|---------|-------------|
|`limit`|מספר שלם|לא| `20` |מספר פריטים להחזרה (מקסימום 100)|
|`locale`|מחרוזת|לא|`"en"`|מקום לאחזור נתוני פריט|

### אלגוריתם ניקוד

ציון הפופולריות מחושב כסכום של רכיבים משוקללים:

|רכיב|משקל|נוסחה|
|-----------|--------|---------|
|דחיפה מומלצת| +10,000 |בונוס שטוח עבור פריטים נבחרים|
|צפיות|פי 1,000|`log10(views + 1) * 1000`|
|הצבעות|פי 1,200|`log10(max(votes, 0) + 1) * 1200`|
|דירוג ממוצע|פי 500|`avgRating * 500`|
|מועדפים|פי 1,100|`log10(favorites + 1) * 1100`|
|הערות|פי 1,000|`log10(comments + 1) * 1000`|
|עדכניות (מתחת ל-30 יום)|עד +1,000|דעיכה לינארית במשך 30 יום|
|עדכניות (30-90 ימים)|עד +500|דעיכה לינארית במהלך 60 הימים הבאים|
|עדכניות (90-180 ימים)|עד +250|דעיכה לינארית במהלך 90 הימים הבאים|

פריטים ללא נתוני מעורבות מקבלים ציון נפילה היוריסטי המבוסס על ספירת תגים, אורך שמות, נוכחות אייקונים וקיום קוד פרומו.

### צורת תגובה

#### 200 -- ציונים אוחזרו

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Rated Tool",
      "slug": "top-rated-tool",
      "featured": true,
      "score": 15230,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 3100,
        "votes": 1200,
        "rating": 430,
        "favorites": 200,
        "comments": 150,
        "recency": 150
      },
      "engagement": {
        "views": 1250,
        "votes": 45,
        "avgRating": 4.2,
        "favorites": 89,
        "comments": 12
      },
      "ageInDays": 15
    }
  ]
}
```

### דוגמה לשימוש

```ts
// Fetch top 10 most popular items
const res = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await res.json();

items.forEach(item => {
  console.log(`#${item.rank} ${item.name} - Score: ${item.score}`);
});
```

### הערות

- אלגוריתם הניקוד תואם את היגיון מיון הייצור ב-`sort-utils.ts`.
- קנה מידה לוגריתמי מונע מפריטים עם ספירת צפיות גבוהה במיוחד לשלוט בדירוג.
- בונוס העדכניות מבטיח שפריטים חדשים שנוספו מקבלים חיזוק נראות זמני.
- פריטים ממוינים לפי ניקוד יורד; הקשרים נשברים בסדר אלפביתי לפי השם.

### קבצי מקור קשורים

|קובץ|מטרה|
|------|---------|
|`template/app/api/items/engagement/route.ts`|נקודת קצה של מדדי מעורבות|
|`template/app/api/items/popularity-scores/route.ts`|נקודת קצה של ניקוד פופולריות|
|`template/lib/db/queries/engagement.queries.ts`|שאילתות מסד נתונים לנתוני מעורבות|
|`template/lib/content.ts`|`getCachedItems` עבור נתוני פריט|
