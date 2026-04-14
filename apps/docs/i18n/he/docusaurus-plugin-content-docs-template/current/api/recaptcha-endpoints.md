---
id: recaptcha-endpoints
title: "ReCAPTCHA API Reference"
sidebar_label: "ReCAPTCHA"
sidebar_position: 57
---

# ReCAPTCHA API Reference

## סקירה כללית

נקודת הקצה של ReCAPTCHA מספקת אימות בצד השרת של אסימוני ReCAPTCHA v3 של Google. הוא פועל כפרוקסי מאובטח בין הלקוח לממשק ה-API לאימות של גוגל, שומר על המפתח הסודי בצד השרת. במצב פיתוח, ניתן לעקוף את האימות כאשר המפתח הסודי אינו מוגדר.

## נקודות קצה

### POST /api/verify-recaptcha

מאמת אסימון ReCAPTCHA v3 של Google על ידי תקשורת עם נקודת הקצה `siteverify` של Google. מחזירה את תוצאת האימות כולל ציון הבוט/אנושי.

**בקשה**
```typescript
{
  token: string;   // ReCAPTCHA token from client-side grecaptcha.execute()
}
```

**תגובה**
```typescript
{
  success: boolean;           // Whether verification passed
  score?: number;             // 0.0 (bot) to 1.0 (human)
  action?: string;            // Action name from the ReCAPTCHA challenge
  hostname?: string;          // Hostname where verification occurred
  challenge_ts?: string;      // ISO 8601 timestamp of the challenge
  error_codes?: string[];     // Error codes from Google's API (if any)
}
```

**דוגמה**
```typescript
// Client-side: get token
const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });

// Server verification
const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const result = await response.json();

if (result.success && result.score > 0.5) {
  // Proceed with form submission
} else {
  // Block suspected bot activity
}
```

### התנהגות מצב פיתוח

כאשר `RECAPTCHA_SECRET_KEY` אינו מוגדר ו-`NODE_ENV` הוא `"development"`, נקודת הקצה עוקפת את האימות של Google ומחזירה:

```typescript
{
  success: true,
  score: 1.0,
  action: "bypass"
}
```

אזהרה נרשמת בקונסולה המציינת שהאימות בעקוף.

## אימות

נקודת קצה זו היא **ציבורי** -- אין צורך באימות. הוא נועד להיקרא מזרימות הגשת טפסים בצד הלקוח לפני או במהלך עיבוד הטפסים.

## תגובות שגיאה

|סטטוס|תיאור|
|--------|-------------|
| 400 |חסר או ריק `token` בגוף הבקשה|
| 500 |`RECAPTCHA_SECRET_KEY` לא מוגדר (ייצור בלבד), בקשת Google API נכשלה, או שגיאת זמן ריצה בלתי צפויה|

## הגבלת תעריפים

לא חלה הגבלת תעריף ברמת היישום. ל-ReCAPTCHA API של גוגל יש מגבלות תעריפים משלו. נקודת הקצה משתמשת בפורמט `application/x-www-form-urlencoded` בעת תקשורת עם ה-API של Google.

## נקודות קצה קשורות

זוהי נקודת קצה אבטחה עצמאית. זה בדרך כלל מופעל לפני הגשת טופס או פעולות רגישות לאורך כל הבקשה.
