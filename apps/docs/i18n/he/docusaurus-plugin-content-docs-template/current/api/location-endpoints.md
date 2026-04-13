---
id: location-endpoints
title: "הפניה ל-API של מיקום"
sidebar_label: "מיקום"
sidebar_position: 51
---

# הפניה ל-API של מיקום

## סקירה כללית

נקודות הקצה של המיקום מספקות גישה לאינדקס המיקום המרחבי עבור פריטים בספרייה. הם תומכים בחיפוש פריטים לפי עיר, מדינה, חיפוש קרבה מבוסס רדיוס, ואחזור נתוני קואורדינטות לעיבוד מפות. כל נקודות הקצה של המיקום דורשות שתכונת המיקום תהיה מופעלת בהגדרות המערכת.

## נקודות קצה

### GET /api/location/cities

מחזירה רשימה של שמות ערים נפרדים מאינדקס המיקום.

**בקשה**

אין צורך בפרמטרים.

**תגובה**
```typescript
{
  success: true;
  data: string[];   // Array of city names, e.g. ["San Francisco", "London", "Tokyo"]
}
```

**דוגמה**
```typescript
const response = await fetch('/api/location/cities');
const { data: cities } = await response.json();
// cities = ["San Francisco", "New York", "London", ...]
```

### GET /api/location/countries

מחזירה רשימה של שמות ארצות נפרדים מאינדקס המיקום.

**בקשה**

אין צורך בפרמטרים.

**תגובה**
```typescript
{
  success: true;
  data: string[];   // Array of country names, e.g. ["United States", "United Kingdom"]
}
```

**דוגמה**
```typescript
const response = await fetch('/api/location/countries');
const { data: countries } = await response.json();
```

### GET /api/location/coordinates

מחזירה קואורדינטות עבור כל הפריטים שנוספו לאינדקס, עם סינון אופציונלי לפי עיר או מדינה. משמש לעיבוד סמני מפה. פריטים מרוחקים אינם נכללים באופן אוטומטי.

**בקשה**

|פרמטר|הקלד|ב|תיאור|
|-----------|--------|-------|-------------|
|עיר|מחרוזת|שאילתה|סינון לפי שם עיר (לא תלוי רישיות)|
|מדינה|מחרוזת|שאילתה|סינון לפי שם מדינה (לא תלוי רישיות)|

**תגובה**
```typescript
{
  success: true;
  data: Array<{
    slug: string;        // Item slug identifier
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
  }>;
}
```

**דוגמה**
```typescript
const response = await fetch('/api/location/coordinates?country=United States');
const { data: coordinates } = await response.json();
// coordinates[0] = { slug: "my-item", latitude: 37.77, longitude: -122.41, city: "San Francisco", country: "United States" }
```

### קבל /api/location/search

חיפוש פריטים לפי מיקום גיאוגרפי באמצעות קרבה מבוססת רדיוס, שם עיר או שם מדינה. החזרת שבלולים תואמים של פריט ומידע אופציונלי על מרחק.

**בקשה**

|פרמטר|הקלד|ב|תיאור|
|-----------|--------|-------|-------------|
|near_lat|מספר|שאילתה|קו רוחב לחיפוש רדיוס|
|ליד_lng|מספר|שאילתה|קו אורך לחיפוש רדיוס|
|רדיוס|מספר|שאילתה|רדיוס בק"מ (ברירת מחדל: 50)|
|עיר|מחרוזת|שאילתה|סנן לפי שם עיר|
|מדינה|מחרוזת|שאילתה|סנן לפי שם מדינה|

נדרש לפחות פרמטר חיפוש אחד: `near_lat` + `near_lng`, `city`, או `country`.

**תגובה**
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Array of matching item slugs
    distances: Record<string, number>;  // Slug-to-distance-km map (radius search only)
  };
}
```

**דוגמה**
```typescript
// Radius search: items within 25km of San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }

// City search
const cityResponse = await fetch('/api/location/search?city=London');
const cityData = await cityResponse.json();
// cityData.data.slugs = ["item-c", "item-d"]
```

## אימות

כל נקודות הקצה של המיקום הן **ציבוריות** -- אין צורך באימות. עם זאת, תכונת המיקום חייבת להיות מופעלת בהגדרות המערכת. אם תכונות המיקום מושבתות, כל נקודות הקצה מחזירות `404` עם `"Location features are disabled"`.

## תגובות שגיאה

|סטטוס|תיאור|
|--------|-------------|
| 400 |קואורדינטות לא חוקיות, רדיוס לא חוקי או חסרים פרמטרי חיפוש נדרשים|
| 404 |תכונות המיקום מושבתות בהגדרות המערכת|
| 500 |שגיאת שרת פנימית -- כשל בשאילתת מסד הנתונים|

## הגבלת תעריפים

לא חלה הגבלת שיעור מפורשת על נקודות קצה אלו. פריטים מרוחקים/וירטואלים אינם נכללים אוטומטית מתוצאות קואורדינטות.

## נקודות קצה קשורות

- [Geocode Endpoints](./geocode-endpoints) -- קידוד גיאוגרפי קדימה ואחורה (מנהל מערכת בלבד)
