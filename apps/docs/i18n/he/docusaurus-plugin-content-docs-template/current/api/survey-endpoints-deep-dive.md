---
id: survey-endpoints-deep-dive
title: "סקרים API הפניה"
sidebar_label: "סקרים (צלילה עמוקה)"
sidebar_position: 56
---

# סקרים API הפניה

## סקירה כללית

ה-API של Surveys מספק פעולות CRUD מלאות עבור סקרים ותשובותיהם. סקרים יכולים להיות גלובליים או ספציפיים לפריט, ולתמוך במצבי טיוטה/פורסם/סגור. יצירה, עדכונים ומחיקה של סקרים דורשים אימות מנהל, בעוד שמשתמשים ציבוריים יכולים לצפות בסקרים שפורסמו ולהגיש תשובות.

## נקודות קצה

### GET /API/סקרים

אחזר סקרים עם מסננים אופציונליים ועימוד. בודק את זמינות מסד הנתונים לפני העיבוד.

**בקשה**

|פרמטר|הקלד|ב|תיאור|
| --------- | ------- | ----- | --------------------------------------------------------- |
|סוג|מחרוזת|שאילתה|סינון לפי סוג: `"global"` או `"item"`|
|מזהה פריט|מחרוזת|שאילתה|סנן לפי מזהה פריט|
|סטטוס|מחרוזת|שאילתה|סינון לפי סטטוס: `"draft"`, `"published"`, או `"closed"`|
|עמוד|מספר שלם|שאילתה|מספר עמוד (ברירת מחדל: 1, מינימום: 1)|
|הגבלה|מספר שלם|שאילתה|פריטים בעמוד (ברירת מחדל: 10, דקות: 1, מקסימום: 100)|

**תגובה**

```typescript
{
  success: true;
  data: {
    surveys: Array<Survey>;
    total: number;
    totalPages: number;
    page: number;
  }
}
```

**דוגמה**

```typescript
const response = await fetch(
  "/api/surveys?type=global&status=published&page=1&limit=10",
);
const { data } = await response.json();
// data.surveys = [{ id: "...", title: "User Satisfaction", type: "global", ... }]
```

### POST /api/סקרים

צור סקר חדש. דורש אימות מנהל.

**בקשה**

```typescript
{
  title: string;              // Required
  description?: string;
  type: "global" | "item";    // Required
  itemId?: string;            // Required if type is "item"
  status?: "draft" | "published" | "closed";
  surveyJson: object;         // Required -- SurveyJS-compatible JSON definition
}
```

**תגובה**

```typescript
{
  success: true;
  data: Survey; // The created survey object
}
```

**דוגמה**

```typescript
const response = await fetch("/api/surveys", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "User Satisfaction Survey",
    type: "global",
    status: "draft",
    surveyJson: {
      pages: [
        {
          elements: [
            {
              type: "rating",
              name: "satisfaction",
              title: "How satisfied are you?",
            },
          ],
        },
      ],
    },
  }),
});
const { data: survey } = await response.json();
```

### קבל `/api/surveys/{surveyId}`

אחזר סקר ספציפי לפי תעודה מזהה או שבלול. סקרים שלא פורסמו גלויים רק למנהלים.

**בקשה**

|פרמטר|הקלד|ב|תיאור|
| --------- | ------ | ---- | ---------------------------- |
|surveyId|מחרוזת|נתיב|מזהה סקר או שבלול (חובה)|

**תגובה**

```typescript
{
  success: true;
  data: Survey;
}
```

**דוגמה**

```typescript
const response = await fetch("/api/surveys/user-satisfaction-2024");
const { data: survey } = await response.json();
```

### PUT `/api/surveys/{surveyId}`

עדכן סקר לפי תעודת זהות או שבלול. דורש אימות מנהל.

**בקשה**

```typescript
{
  title?: string;
  description?: string;
  status?: "draft" | "published" | "closed";
  surveyJson?: object;
}
```

**תגובה**

```typescript
{
  success: true;
  data: Survey;
  message: "Survey updated successfully";
}
```

**דוגמה**

```typescript
const response = await fetch("/api/surveys/abc-123", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "published" }),
});
```

### מחק `/api/surveys/{surveyId}`

מחיקת סקר לפי תעודת זהות או שבלול. דורש אימות מנהל.

**בקשה**

|פרמטר|הקלד|ב|תיאור|
| --------- | ------ | ---- | ---------------------------- |
|surveyId|מחרוזת|נתיב|מזהה סקר או שבלול (חובה)|

**תגובה**

```typescript
{
  success: true;
  data: null;
  message: "Survey deleted successfully";
}
```

### קבל `/api/surveys/{surveyId}/responses`

אחזר תשובות מעומדות עבור סקר ספציפי. דורש אימות מנהל.

**בקשה**

|פרמטר|הקלד|ב|תיאור|
| --------- | ------ | ----- | ----------------------------- |
|surveyId|מחרוזת|נתיב|מזהה סקר (חובה)|
|מזהה פריט|מחרוזת|שאילתה|סנן לפי מזהה פריט|
|מזהה משתמש|מחרוזת|שאילתה|סנן לפי מזהה משתמש|
|תאריך התחלה|מחרוזת|שאילתה|סינון מתאריך (פורמט ISO)|
|תאריך סיום|מחרוזת|שאילתה|סינון עד היום (פורמט ISO)|
|עמוד|מספר|שאילתה|מספר עמוד|
|הגבלה|מספר|שאילתה|פריטים לכל עמוד|

**תגובה**

```typescript
{
  success: true;
  data: {
    responses: Array<{
      id: string;
      surveyId: string;
      userId: string | null;
      itemId: string | null;
      data: object; // Survey answer data
      completedAt: string; // ISO 8601
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    totalPages: number;
  }
}
```

### פרסם `/api/surveys/{surveyId}/responses`

שלח תגובה לסקר שפורסם. האימות הוא אופציונלי -- הגשות אנונימיות מותרות.

**בקשה**

```typescript
{
  surveyId: string; // Must match the path parameter
  data: object; // Required -- survey answer data
}
```

**תגובה**

```typescript
{
  success: true;
  data: {
    id: string;
    surveyId: string;
    userId: string | null; // Set if user is authenticated
    itemId: string | null;
    data: object;
    completedAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    updatedAt: string;
  }
  message: "Response submitted successfully";
}
```

**דוגמה**

```typescript
const response = await fetch("/api/surveys/abc-123/responses", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    surveyId: "abc-123",
    data: { satisfaction: 5, feedback: "Great product!" },
  }),
});
```

### קבל `/api/surveys/responses/{responseId}`

אחזר תגובת סקר ספציפית לפי תעודת זהות. דורש אימות מנהל.

**בקשה**

|פרמטר|הקלד|ב|תיאור|
| ---------- | ------ | ---- | ---------------------- |
|responseId|מחרוזת|נתיב|מזהה תגובה (חובה)|

**תגובה**

```typescript
{
  success: true;
  data: SurveyResponse;
}
```

## אימות

|נקודת קצה|אישור נדרש|
| ----------------------------------------- | -------------------------------------------- |
|GET /API/סקרים|ציבורי (בסיס הנתונים חייב להיות זמין)|
|POST /api/סקרים|אדמין בלבד|
|`GET /api/surveys/{surveyId}`|ציבורי לפרסום; מנהל מערכת לטיוטה/סגור|
|`PUT /api/surveys/{surveyId}`|אדמין בלבד|
|`DELETE /api/surveys/{surveyId}`|אדמין בלבד|
|`GET /api/surveys/{surveyId}/responses`|אדמין בלבד|
|`POST /api/surveys/{surveyId}/responses`|ציבורי (אישור אופציונלי למעקב אחר משתמשים)|
|`GET /api/surveys/responses/{responseId}`|אדמין בלבד|

## תגובות שגיאה

|סטטוס|תיאור|
| ------ | ----------------------------------------------------------------------- |
| 400    |גוף בקשה לא חוקי -- חסר שדה חובה `data` או JSON פגום|
| 401    |לא מורשה -- נדרש אימות מנהל|
| 404    |הסקר או התגובה לא נמצאו|
| 500    |שגיאת שרת פנימית -- כשל במסד הנתונים|
| 503    |מסד הנתונים אינו זמין או שהסכימה לא אותחלה|

## הגבלת תעריפים

אין הגבלת תעריפים מפורשת. הגשת תגובות לוכדות כתובת IP וסוכן משתמש למטרות ביקורת. נקודת הקצה GET /api/surveys בודקת את זמינות מסד הנתונים לפני העיבוד ומחזירה `503` אם לא ניתן להגיע למסד הנתונים.

## נקודות קצה קשורות

- [Config Feature Endpoints](./config-feature-endpoints) -- בדוק אם תכונת הסקרים מופעלת
