---
id: admin-analytics-endpoints
title: Admin Analytics נקודות קצה
sidebar_label: Admin Analytics
sidebar_position: 22
---

# Admin Analytics נקודות קצה

ממשק ה-API של admin analytics מספק נתוני ניתוח גיאוגרפיים עבור לוח המחוונים של הניהול, כולל נתונים סטטיסטיים של כיסוי, פירוט הפצה ונתוני הדמיה של מפות. כל נקודות הקצה דורשות אימות מנהל.

## סקירה כללית

|נקודת קצה|שיטה|Auth|תיאור|
|---|---|---|---|
|`/api/admin/geo-analytics`|קבל|מנהל מערכת|קבל נתוני ניתוח גיאוגרפיים|

## קבל אנליטיקה גיאוגרפית

```
GET /api/admin/geo-analytics
```

מחזיר ניתוח תפוצה גיאוגרפי מקיף, כולל נתונים סטטיסטיים של כיסוי, התפלגות מדינה/עיר/אזור שירות, קואורדינטות מיקום עבור סמני מפה ונתוני מפות חום. נקודת קצה זו אוספת נתונים הן מאינדקס המיקום והן ממאגר הפריטים.

**אימות:** נדרש מנהל מערכת (דרך `checkAdminAuth()`)

**מטמון:** מושבת -- משתמש ב-`force-dynamic`, `revalidate: 0`, ו-`force-no-store` כדי להבטיח נתונים עדכניים עבור לוח המחוונים לניהול.

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalIndexed": 450,
      "totalItems": 500,
      "itemsWithLocation": 420,
      "itemsRemote": 30,
      "coveragePercent": 84.0,
      "indexHealth": {
        "synced": true,
        "indexCount": 390,
        "expectedCount": 390
      },
      "citiesCount": 85,
      "countriesCount": 25,
      "remoteCount": 30,
      "lastIndexedAt": "2024-01-20T10:30:00.000Z",
      "lastRebuildAt": "2024-01-15T08:00:00.000Z"
    },
    "distributions": {
      "byCountry": [
        { "name": "United States", "count": 150 },
        { "name": "United Kingdom", "count": 80 },
        { "name": "Germany", "count": 45 }
      ],
      "byCity": [
        { "name": "San Francisco", "count": 35 },
        { "name": "London", "count": 28 },
        { "name": "Berlin", "count": 20 }
      ],
      "byServiceArea": [
        { "area": "North America", "count": 200 },
        { "area": "Europe", "count": 180 }
      ]
    },
    "locations": [
      {
        "itemSlug": "example-tool",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "city": "San Francisco",
        "country": "United States",
        "isRemote": false
      }
    ],
    "heatmapData": [
      { "lat": 37.7749, "lng": -122.4194 },
      { "lat": 51.5074, "lng": -0.1278 }
    ]
  }
}
```

### שדות תגובה

#### אובייקט סטטיסטיקה

|שדה|הקלד|תיאור|
|---|---|---|
|`totalIndexed`|מספר שלם|סך כל הכניסות באינדקס המיקום|
|`totalItems`|מספר שלם|סך כל הפריטים במאגר|
|`itemsWithLocation`|מספר שלם|פריטים בעלי נתוני מיקום או מסומנים כמרוחקים|
|`itemsRemote`|מספר שלם|פריטים מסומנים כמרוחקים/מבוזרים|
|`coveragePercent`|מספר|אחוז הפריטים עם נתוני מיקום (מעוגל לעשרוני אחד)|
|`indexHealth.synced`|בוליאני|האם ספירת המדדים תואמת את הספירה הצפויה|
|`indexHealth.indexCount`|מספר שלם|ערכים שאינם מרוחקים באינדקס|
|`indexHealth.expectedCount`|מספר שלם|ערכים צפויים שאינם מרוחקים על סמך נתוני מקור|
|`citiesCount`|מספר שלם|מספר הערים הנבדלות באינדקס|
|`countriesCount`|מספר שלם|מספר המדינות הנבדלות במדד|
|`remoteCount`|מספר שלם|מספר הערכים המרוחקים באינדקס|
|`lastIndexedAt`|מחרוזת או ריק|חותמת זמן ISO של עדכון האינדקס האחרון|
|`lastRebuildAt`|מחרוזת או ריק|חותמת זמן ISO של הבנייה מחדש המלאה האחרונה|

#### חפץ הפצות

|שדה|תיאור|
|---|---|
|`byCountry`|מערך שמות מדינות עם ספירות, ממוין לפי ספירה יורדת|
|`byCity`|20 הערים המובילות עם ספירות, ממוינות לפי ספירה יורדת|
|`byServiceArea`|אזורי שירות עם ספירות, ממוינים לפי ספירה יורדת|

#### מערך מיקומים

כל אובייקט מיקום מספק נתונים עבור סמני מפה. פריטים מרוחקים בקואורדינטות `(0, 0)` מסוננים כדי למנוע תצוגות מפות מטעות.

#### נתוני מפת חום

מערך של זוגות קווי רוחב/אורך עבור ערכים שאינם מרוחקים בלבד, מתאים לעיבוד מפות חום בצפיפות.

### מקורות נתונים

נקודת הקצה אוספת נתונים משלוש שאילתות מקבילות:

1. **שירות אינדקס מיקום** (`getLocationIndexService().getIndexStats()`) -- מספק סטטיסטיקות אינדקס
2. **כניסות אינדקס מיקום** (`getAllLocationEntries()`) -- מספק את כל המיקומים שצורפו לאינדקס לחישובי הפצה
3. **מאגר פריטים** (`itemRepository.findAll()`) -- מספק נתוני פריט מקור לחישובי כיסוי

### חישוב כיסוי

אחוז הכיסוי מחושב כך:

```
coveragePercent = round((itemsWithLocation / totalItems) * 100, 1)
```

פריט נספר כ"בעל מיקום" אם יש לו קואורדינטת קו רוחב או מסומן כמרוחק (`is_remote: true`).

### אינדקס בריאות

תקינות האינדקס משווה את מספר הערכים שאינם מרוחקים באינדקס המיקום מול הספירה הצפויה הנגזרת מנתוני המקור:

```
expectedCount = itemsWithLocation - itemsRemote
indexCount = totalIndexed - remoteCount
synced = (indexCount === expectedCount)
```

כאשר `synced` הוא שקר, מנהלי מערכת צריכים לשקול לבנות מחדש את אינדקס המיקום באמצעות נקודת הקצה `/api/admin/location-index`.

|סטטוס|מצב|
|---|---|
| 401 |לא מאומת כמנהל|
| 500 |שגיאת שרת פנימית|

**מקור:** `template/app/api/admin/geo-analytics/route.ts`
