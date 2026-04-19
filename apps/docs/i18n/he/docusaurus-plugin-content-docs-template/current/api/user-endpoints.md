---
id: user-endpoints
title: נקודות קצה של משתמש
sidebar_label: משתמש
sidebar_position: 21
---

# נקודות קצה של משתמש

ממשק API למשתמש מספק נקודות קצה לניהול העדפות משתמש מאומתות, פרטי מנוי, היסטוריית תשלומים והגדרות מיקום פרופיל. כל נקודות הקצה דורשות אימות מבוסס הפעלה.

## סקירה כללית

|נקודת קצה|שיטה|Auth|תיאור|
|---|---|---|---|
|`/api/user/currency`|קבל|ציבורי|זיהוי מטבע המשתמש מהכותרות|
|`/api/user/currency`|PUT|משתמש|עדכן העדפת מטבע|
|`/api/user/payments`|קבל|משתמש|קבל היסטוריית תשלומים מ-Stripe|
|`/api/user/plan-status`|קבל|משתמש|קבל סטטוס תוכנית עם פרטי תפוגה|
|`/api/user/subscription`|קבל|משתמש|קבל פרטי מנוי|
|`/api/user/profile/location`|קבל|משתמש|קבל הגדרות מיקום שמורות|
|`/api/user/profile/location`|תיקון|משתמש|עדכן את הגדרות המיקום|

## זיהוי והעדפות מטבע

### זיהוי מטבע

```
GET /api/user/currency
```

מזהה את המטבע של המשתמש על סמך כותרות HTTP מספקי CDN/פרוקסי. נקודת קצה זו משתמשת בהשפלה חיננית -- היא תמיד מחזירה 200 בסדר עם קוד מטבע חוקי, ויורדת חזרה לדולר אם הזיהוי נכשל. אין צורך באימות.

**פרמטרי שאילתה:**

|פרמטר|הקלד|ברירת מחדל|תיאור|
|---|---|---|---|
|`provider`|מחרוזת|`"smart"`|ספק זיהוי: `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"`|

**תגובת הצלחה (200):**

```json
{
  "currency": "EUR",
  "country": "FR",
  "detected": true
}
```

|שדה|הקלד|תיאור|
|---|---|---|
|`currency`|מחרוזת|קוד מטבע ISO 4217 (3 תווים), ברירת המחדל היא `"USD"`|
|`country`|מחרוזת או ריק|קוד מדינה ISO 3166-1 alpha-2, ריק אם הזיהוי נכשל|
|`detected`|בוליאני|אם הזיהוי הצליח או הערך הוא נסיגה|

כאשר הזיהוי נכשל, התגובה עדיין מחזירה 200 עם `"USD"` ו-`detected: false`.

**מקור:** `template/app/api/user/currency/route.ts`

### עדכן העדפת מטבע

```
PUT /api/user/currency
```

מעדכן את המטבע והמדינה המועדפים על המשתמש המאומת. מאומת באמצעות Zod עם הרשימה `SUPPORTED_CURRENCIES` מ-`lib/config/billing`.

**אימות:** נדרש

**גוף הבקשה:**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

|שדה|הקלד|חובה|תיאור|
|---|---|---|---|
|`currency`|מחרוזת|כן|קוד מטבע ISO 4217 (3 תווים בדיוק, אותיות רישיות)|
|`country`|מחרוזת או ריק|לא|קוד מדינה ISO 3166-1 alpha-2 (בדיוק 2 תווים)|

**תגובת הצלחה (200):**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

|סטטוס|מצב|
|---|---|
| 400 |JSON לא חוקי, קוד מטבע לא נתמך או פורמט מדינה לא חוקי|
| 401 |המשתמש לא מאומת|
| 500 |העדכון נכשל|

**מקור:** `template/app/api/user/currency/route.ts`

## היסטוריית תשלומים

### קבל היסטוריית תשלומים

```
GET /api/user/payments
```

מאחזר את היסטוריית התשלומים המלאה של המשתמש המאומת מ-Stripe. מביא חשבוניות ומנויים, מעשיר אותם במטא נתונים של התוכנית ומחזיר רשימה ממוינת של רשומות תשלום.

**אימות:** נדרש

**תגובת הצלחה (200):**

```json
[
  {
    "id": "in_1234567890abcdef",
    "date": "2024-01-15T10:30:00.000Z",
    "amount": 29.99,
    "currency": "USD",
    "plan": "Premium Plan",
    "planId": "pro",
    "status": "Paid",
    "billingInterval": "monthly",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "description": "Premium Plan - monthly billing",
    "invoiceUrl": "https://invoice.stripe.com/i/acct_123/test_abc",
    "invoicePdf": "https://pay.stripe.com/invoice/acct_123/test_abc/pdf",
    "invoiceNumber": "INV-2024-001",
    "period_end": "2024-02-15T10:30:00.000Z",
    "period_start": "2024-01-15T10:30:00.000Z"
  }
]
```

פרטי עיבוד מרכזיים:

- מסננים רק לחשבוניות `"paid"` ו-`"open"`
- ממיר סכומים מסנטים ליחידות מטבע עיקריות (מחלק ב-100)
- ממיין לפי תאריך, הכי חדש ראשון
- מפה את הסטטוס לערכים הניתנים לקריאה: `"Paid"`, `"Pending"`, `"Draft"`, `"Unknown"`
- מחזיר מערך ריק `[]` אם אין לקוח Stripe

**מקור:** `template/app/api/user/payments/route.ts`

## סטטוס תוכנית

### קבל סטטוס תוכנית

```
GET /api/user/plan-status
```

מחזיר מידע מקיף על מצב התוכנית כולל פרטי תפוגה. משמש את הקצה הקדמי להצגת אזהרות תוכנית ותכונות שער מאחורי בדיקות תוכנית.

**אימות:** נדרש

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "data": {
    "planId": "premium",
    "effectivePlan": "premium",
    "isExpired": false,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "daysUntilExpiration": 45,
    "isInWarningPeriod": false,
    "canAccessPlanFeatures": true,
    "warningMessage": null,
    "status": "active"
  }
}
```

|שדה|הקלד|תיאור|
|---|---|---|
|`planId`|מחרוזת|תוכנית המנוי של המשתמש: `"free"`, `"standard"`, `"premium"`|
|`effectivePlan`|מחרוזת|התוכנית שהמשתמש יכול לגשת אליה בפועל (עשויה להיות שונה אם פג תוקף)|
|`isExpired`|בוליאני|האם פג תוקף המנוי|
|`expiresAt`|מחרוזת או ריק|תאריך תפוגה בפורמט ISO|
|`daysUntilExpiration`|מספר שלם או ריק|ימים עד התפוגה (שלילי אם כבר פג תוקף)|
|`isInWarningPeriod`|בוליאני|נכון אם תוקף המנוי יפוג תוך 7 ימים|
|`canAccessPlanFeatures`|בוליאני|האם המשתמש יכול לגשת לתכונות התוכנית שלו|
|`warningMessage`|מחרוזת או ריק|הודעת אזהרה הפונה למשתמש אם רלוונטי|
|`status`|מחרוזת או ריק|סטטוס מנוי גולמי|

משתמש ב-`subscriptionService.getUserPlanWithExpiration()` מ-`lib/services/subscription.service`.

**מקור:** `template/app/api/user/plan-status/route.ts`

## פרטי מנוי

### קבל סטטוס מנוי

```
GET /api/user/subscription
```

מאחזר מידע מפורט על מנויים מ-Stripe כולל המנוי הפעיל הנוכחי והיסטוריית מנויים מלאה.

**אימות:** נדרש

**תגובת הצלחה (200) -- מנוי פעיל:**

```json
{
  "hasActiveSubscription": true,
  "currentSubscription": {
    "id": "sub_1234567890abcdef",
    "planId": "price_1234567890abcdef",
    "planName": "Premium Plan",
    "status": "active",
    "startDate": "2024-01-15T10:30:00.000Z",
    "endDate": "2024-02-15T10:30:00.000Z",
    "nextBillingDate": "2024-02-15T10:30:00.000Z",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "amount": 29.99,
    "currency": "USD",
    "billingInterval": "monthly"
  },
  "subscriptionHistory": [
    {
      "id": "sub_1234567890abcdef",
      "planId": "price_1234567890abcdef",
      "planName": "Premium Plan",
      "status": "active",
      "startDate": "2024-01-15T10:30:00.000Z",
      "endDate": "2024-02-15T10:30:00.000Z",
      "amount": 29.99,
      "currency": "USD",
      "billingInterval": "monthly"
    }
  ]
}
```

מנויים פעילים מזוהים על ידי `status === "active"` או `status === "trialing"`. ערכים בהיסטוריה עשויים לכלול `cancelledAt` ו-`cancelReason` עבור מנויים שבוטלו.

**מקור:** `template/app/api/user/subscription/route.ts`

## מיקום פרופיל

### קבל הגדרות מיקום

```
GET /api/user/profile/location
```

מחזירה את מיקום ברירת המחדל והעדפת הפרטיות השמורה של המשתמש המאומת.

**אימות:** נדרש (פרופיל לקוח)

**תגובת הצלחה (200):**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

**מקור:** `template/app/api/user/profile/location/route.ts`

### עדכן את הגדרות המיקום

```
PATCH /api/user/profile/location
```

מעדכן את מיקום ברירת המחדל והעדפת הפרטיות של המשתמש המאומת. מאומת באמצעות `updateLocationSchema` מ-`lib/validations/user-location`.

**גוף הבקשה:**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

|שדה|הקלד|חובה|תיאור|
|---|---|---|---|
|`defaultLatitude`|מספר או null|לא|קואורדינטת קו רוחב|
|`defaultLongitude`|מספר או null|לא|קואורדינטת קו אורך|
|`defaultCity`|מחרוזת או ריק|לא|שם העיר|
|`defaultCountry`|מחרוזת או ריק|לא|קוד מדינה|
|`locationPrivacy`|מחרוזת|לא|רמת פרטיות: `"private"`, `"city"`, `"exact"`|

יש לספק גם קו רוחב וגם קו אורך.

**מקור:** `template/app/api/user/profile/location/route.ts`
