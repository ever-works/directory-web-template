---
id: geocode-endpoints
title: "התייחסות ל-Geocode API"
sidebar_label: "קוד גיאוגרפי"
sidebar_position: 50
---

# התייחסות ל-Geocode API

## סקירה כללית

נקודות הקצה Geocode מספקות יכולות קידוד גיאוגרפי קדימה (כתובת לקואורדינטות) וקידוד גיאוגרפי הפוך (קואורדינטות לכתובת). התוצאות נשמרות במטמון למשך 15 דקות כדי לצמצם קריאות API חיצוניות. נקודות קצה אלה דורשות אימות מנהל כדי למנוע שימוש לרעה בעלויות של שירותי הקידוד הגיאוגרפי של Mapbox/Google.

## נקודות קצה

### POST /api/geocode

ממיר כתובת לקואורדינטות (קידוד גיאוגרפי קדימה) או קואורדינטות לכתובת (קידוד גיאוגרפי הפוך). גוף הבקשה קובע איזו פעולה מבוצעת על סמך האם מסופקים שדות `address` או `latitude`/`longitude`.

#### קידוד גיאוגרפי קדימה (כתובת לקואורדינטות)

**בקשה**
```typescript
{
  address: string;          // 1-500 characters, required
  options?: {
    countryCodes?: string[];  // ISO 3166-1 alpha-2 codes, e.g. ["US", "CA"]
    language?: string;        // ISO 639-1 language code, e.g. "en"
    proximity?: {
      latitude: number;       // -90 to 90
      longitude: number;      // -180 to 180
    };
  };
}
```

**תגובה**
```typescript
{
  success: true;
  data: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
    confidence: number;       // 0 to 1
  };
}
```

**דוגמה**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
    options: {
      countryCodes: ['US'],
      language: 'en'
    }
  })
});
const data = await response.json();
```

#### קידוד גיאוגרפי הפוך (קואורדינטות לכתובת)

**בקשה**
```typescript
{
  latitude: number;         // -90 to 90, required
  longitude: number;        // -180 to 180, required
  options?: {
    language?: string;        // ISO 639-1 language code
  };
}
```

**תגובה**
```typescript
{
  success: true;
  data: {
    formattedAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
  };
}
```

**דוגמה**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 37.4224764,
    longitude: -122.0842499,
    options: { language: 'en' }
  })
});
const data = await response.json();
```

### קבל /api/geocode

מחזירה את הסטטוס של שירות הקידוד הגיאוגרפי כולל אילו ספקים מוגדרים וסטטיסטיקות מטמון.

**בקשה**

אין צורך בגוף בקשה. אימות באמצעות קובץ Cookie של הפעלה.

**תגובה**
```typescript
{
  success: true;
  data: {
    enabled: boolean;         // Whether location features are enabled
    configured: boolean;      // Whether any geocoding provider is configured
    providers: {
      mapbox: boolean;
      google: boolean;
    };
    cache: {
      size: number;           // Current cache size
      maxSize: number;        // Maximum cache size (1000)
      ttlMs: number;          // Cache TTL in milliseconds (900000 = 15 min)
    };
  };
}
```

**דוגמה**
```typescript
const response = await fetch('/api/geocode');
const status = await response.json();
// status.data.providers.mapbox === true
```

## אימות

- **GET /api/geocode**: דורש הפעלה מאומתת (כל משתמש).
- **POST /api/geocode**: דורש הפעלה מאומתת עם **תפקיד אדמין**. משתמשים שאינם מנהלי מערכת מקבלים תגובה `403 Forbidden`. הגבלה זו מונעת שימוש לרעה בעלויות API.

## תגובות שגיאה

|סטטוס|תיאור|
|--------|-------------|
| 400 |נתוני בקשה לא חוקיים -- כתובת שגויה, קואורדינטות לא חוקיות או כשל באימות הסכימה|
| 401 |לא מורשה -- אין הפעלה מאומתת|
| 403 |אסור -- נדרשת גישת מנהל (POST בלבד)|
| 404 |לא נמצאו תוצאות קידוד גיאוגרפי עבור הכתובת או הקואורדינטות הנתונות|
| 503 |תכונות המיקום מושבתות בהגדרות, או ששירות הקידוד הגיאוגרפי אינו מוגדר|

## הגבלת תעריפים

התוצאות נשמרות ל-15 דקות (TTL 900,000ms) עם גודל מטמון מקסימלי של 1,000 ערכים. כל בקשות הקידוד הגיאוגרפי נרשמות ביומן ביקורת למטרות מעקב עלויות.

## נקודות קצה קשורות

- [נקודות קצה של מיקום](./location-endpoints) -- חיפוש מיקום, ערים, מדינות וקואורדינטות
