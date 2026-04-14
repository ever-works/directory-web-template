---
id: config-feature-endpoints
title: "עיון ב-API של תצורה ותכונות דגלים"
sidebar_label: "תצורה ותכונות"
sidebar_position: 53
---

# עיון ב-API של תצורה ותכונות דגלים

## סקירה כללית

נקודת הקצה Config Features חושפת את דגלי זמינות התכונות הנוכחיות עבור היישום. דגלים אלו מציינים אילו תכונות תלויות מסד נתונים פעילות, מה שמאפשר ל-frontend להתדרדר בחן כאשר תכונות אינן זמינות. זוהי נקודת קצה ציבורית, שמורה במטמון, המיועדת לצריכה בתדר גבוה.

## נקודות קצה

### GET /api/config/features

מחזירה את זמינות התכונה הנוכחית בהתבסס על תצורת המערכת וזמינות מסד הנתונים.

**בקשה**

אין צורך בפרמטרים או בגוף.

**תגובה**
```typescript
{
  ratings: boolean;         // Whether the ratings feature is available
  comments: boolean;        // Whether the comments feature is available
  favorites: boolean;       // Whether the favorites feature is available
  featuredItems: boolean;   // Whether the featured items feature is available
  surveys: boolean;         // Whether the surveys feature is available
}
```

**דוגמה**
```typescript
const response = await fetch('/api/config/features');
const features = await response.json();

if (features.ratings) {
  // Render rating component
}

if (!features.surveys) {
  // Hide survey section
}
```

## אימות

נקודת קצה זו היא **ציבורי** -- אין צורך באימות. הוא נועד להיות נצרך על ידי ה-frontend בעת טעינת העמוד הראשונית כדי לקבוע אילו תכונות ממשק משתמש יש להציג.

## תגובות שגיאה

|סטטוס|תיאור|
|--------|-------------|
| 200 |דגלי תכונה אוחזרו בהצלחה|
| 500 |שגיאה פנימית -- מחזירה את כל הדגלים כ-`false` לבטיחות עם הכותרת `no-cache`|

במקרה של שגיאה, נקודת הקצה מחזירה את כל התכונות כ-`false` כדי להבטיח שהיישום נכשל בבטחה במקום לחשוף פונקציונליות פגומה.

## הגבלת תעריפים

התגובות מאוחסנות במטמון עם הכותרות הבאות:
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- נשמר ביעילות מטמון למשך 5 דקות ברמת ה-CDN עם חלון של 10 דקות ישן בזמן אימות מחדש.

תגובות שגיאה משתמשות ב-@@TOK000@@@ כדי למנוע אחסון במטמון של מצב פגום.

## נקודות קצה קשורות

- [נקודות קצה בריאות](./health-endpoints) -- בדיקת תקינות קישוריות מסד נתונים
