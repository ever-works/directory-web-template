---
id: sponsor-checkout-endpoints
title: "חסות מודעות & Checkout API"
sidebar_label: "מודעות חסות ותשלום"
sidebar_position: 59
---

# חסות מודעות & Checkout API

## סקירה כללית

נקודות הקצה של מודעות Sponsor מנהלות את מחזור החיים המלא של מיקומי פרסומות ממומנות בפריטי ספרייה. זה כולל עיון במודעות פעילות, הגשת בקשות נותני חסות חדשות, ניהול מודעות בבעלות המשתמש, עיבוד תשלומים דרך ספקים מרובים (Stripe, LemonSqueezy, Polar) וטיפול בביטולים וחידושים. זרימת התשלום תומכת במרווחי חיוב שבועיים וחודשיים.

## נקודות קצה

### קבל /api/sponsor-ads

מחזירה רשימה של מודעות חסות פעילות כעת עם נתוני הפריטים המשויכים להן לתצוגה ציבורית.

**בקשה**

|פרמטר|הקלד|ב|תיאור|
| --------- | ------- | ----- | ------------------------------------------------ |
|הגבלה|מספר שלם|שאילתה|מקסימום מודעות חסות להחזרה (ברירת מחדל: 10, מקסימום: 50)|

**תגובה**

```typescript
{
  success: true;
  data: Array<{
    sponsor: {
      id: string;
      itemSlug: string;
      status: string;
      interval: string;
    };
    item: {
      name: string;
      slug: string;
      description: string;
      icon_url: string;
      category: string;
    } | null;
  }>;
}
```

**דוגמה**

```typescript
const response = await fetch("/api/sponsor-ads?limit=5");
const { data: sponsoredItems } = await response.json();
```

### קבל /api/sponsor-ads/user

מחזירה רשימה מעומדת של מודעות חסות שנשלחו על ידי המשתמש המאומת.

**בקשה**

|פרמטר|הקלד|ב|תיאור|
| --------- | ------- | ----- | --------------------------------------------------------------------------------------- |
|עמוד|מספר שלם|שאילתה|מספר עמוד (ברירת מחדל: 1)|
|הגבלה|מספר שלם|שאילתה|פריטים בעמוד (ברירת מחדל: 10)|
|סטטוס|מחרוזת|שאילתה|מסנן: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"`|
|מרווח|מחרוזת|שאילתה|מסנן: `"weekly"`, `"monthly"`|
|לחפש|מחרוזת|שאילתה|מונח חיפוש|

**תגובה**

```typescript
{
  success: true;
  data: Array<SponsorAd>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

**דוגמה**

```typescript
const response = await fetch("/api/sponsor-ads/user?status=active&page=1");
const { data, pagination } = await response.json();
```

### POST /api/sponsor-ads/user

יוצר הגשת מודעת חסות חדשה עבור המשתמש המאומת. ההגשה מתחילה במצב ממתין וממתין לאישור מנהל.

**בקשה**

```typescript
{
  itemSlug: string;          // Slug of the item to sponsor (required)
  itemName: string;          // Name of the item (required)
  itemIconUrl?: string;      // Icon URL
  itemCategory?: string;     // Category of the item
  itemDescription?: string;  // Description (max 500 chars)
  interval: "weekly" | "monthly"; // Billing interval (required)
}
```

**תגובה**

```typescript
{
  success: true;
  data: SponsorAd;
  message: "Sponsor ad submission created successfully. Pending admin approval.";
}
```

**דוגמה**

```typescript
const response = await fetch("/api/sponsor-ads/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    itemSlug: "my-awesome-tool",
    itemName: "My Awesome Tool",
    interval: "monthly",
  }),
});
```

### קבל /api/sponsor-ads/user/stats

מחזיר נתונים סטטיסטיים עבור מודעות החסות של המשתמש המאומת, כולל ספירות לפי סטטוס, התפלגות מרווחים ומדדי הכנסה.

**בקשה**

אין צורך בפרמטרים. אימות באמצעות קובץ Cookie של הפעלה.

**תגובה**

```typescript
{
  success: true;
  stats: {
    overview: {
      total: number;
      pendingPayment: number;
      pending: number;
      active: number;
      rejected: number;
      expired: number;
      cancelled: number;
    }
    byInterval: {
      weekly: number;
      monthly: number;
    }
    revenue: {
      totalRevenue: number; // In minor currency units (cents)
      weeklyRevenue: number;
      monthlyRevenue: number;
    }
  }
}
```

**דוגמה**

```typescript
const response = await fetch("/api/sponsor-ads/user/stats");
const { stats } = await response.json();
console.log(
  `Active ads: ${stats.overview.active}, Total revenue: ${stats.revenue.totalRevenue}`,
);
```

### קבל `/api/sponsor-ads/user/{id}`

מחזירה מודעת חסות בודדת בבעלות המשתמש המאומת.

**בקשה**

|פרמטר|הקלד|ב|תיאור|
| --------- | ------ | ---- | ------------------------ |
|מזהה|מחרוזת|נתיב|מזהה מודעת חסות (חובה)|

**תגובה**

```typescript
{
  success: true;
  data: SponsorAd;
}
```

### POST /api/sponsor-ads/checkout

יוצר הפעלת תשלום עבור מודעת חסות מאושרת. מודעת החסות חייבת להיות בסטטוס `pending_payment` ולהיות בבעלות המשתמש המאומת.

**בקשה**

```typescript
{
  sponsorAdId: string;      // ID of the approved sponsor ad (required)
  successUrl?: string;      // Redirect URL after successful payment
  cancelUrl?: string;       // Redirect URL after cancelled payment
}
```

**תגובה**

```typescript
{
  success: true;
  data: {
    checkoutId: string; // Provider checkout session ID
    checkoutUrl: string; // URL to redirect user to for payment
    provider: string; // "stripe", "lemonsqueezy", or "polar"
  }
  message: "Checkout session created successfully";
}
```

**דוגמה**

```typescript
const response = await fetch("/api/sponsor-ads/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sponsorAdId: "ad-123",
    successUrl: "https://myapp.com/sponsor/success?sponsorAdId=ad-123",
    cancelUrl: "https://myapp.com/sponsor?cancelled=true",
  }),
});

const { data } = await response.json();
window.location.href = data.checkoutUrl; // Redirect to payment
```

### פרסם `/api/sponsor-ads/user/{id}/cancel`

מבטל מודעת חסות בבעלות המשתמש המאומת. יכול לבטל מודעות רק בסטטוס `pending_payment`, `pending` או `active`.

**בקשה**

```typescript
{
  cancelReason?: string;   // Optional reason for cancellation (max 500 chars)
}
```

**תגובה**

```typescript
{
  success: true;
  data: SponsorAd; // The cancelled sponsor ad
  message: "Sponsor ad cancelled successfully";
}
```

**דוגמה**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/cancel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cancelReason: "No longer needed" }),
});
```

### פרסם `/api/sponsor-ads/user/{id}/renew`

יוצר הפעלת תשלום כדי לחדש מודעת חסות פעילה או שפג תוקפם. ניתן לחדש רק מודעות עם סטטוס `active` או `expired`.

**בקשה**

```typescript
{
  successUrl?: string;     // Redirect URL after successful payment
  cancelUrl?: string;      // Redirect URL after cancelled payment
}
```

**תגובה**

```typescript
{
  success: true;
  data: {
    checkoutId: string;
    checkoutUrl: string;
    provider: string;
  }
  message: "Renewal checkout session created successfully";
}
```

**דוגמה**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/renew", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    successUrl:
      "https://myapp.com/sponsor/success?sponsorAdId=ad-123&renewal=true",
  }),
});
const { data } = await response.json();
window.location.href = data.checkoutUrl;
```

## אימות

|נקודת קצה|אישור נדרש|
| ---------------------------------------- | ------------------------------------- |
|קבל /api/sponsor-ads|ציבורי|
|קבל /api/sponsor-ads/user|נדרשת הפעלה|
|POST /api/sponsor-ads/user|נדרשת הפעלה|
|קבל /api/sponsor-ads/user/stats|נדרשת הפעלה|
|`GET /api/sponsor-ads/user/{id}`|נדרשת הפעלה (אומתת הבעלות)|
|POST /api/sponsor-ads/checkout|נדרשת הפעלה (אומתת הבעלות)|
|`POST /api/sponsor-ads/user/{id}/cancel`|נדרשת הפעלה (אומתת הבעלות)|
|`POST /api/sponsor-ads/user/{id}/renew`|נדרשת הפעלה (אומתת הבעלות)|

כל נקודות הקצה הספציפיות למשתמש מאמתות בעלות -- ניסיון לגשת למודעת חסות של משתמש אחר מחזירה `404` (עבור GET) או `403` (עבור פעולות).

## תגובות שגיאה

|סטטוס|תיאור|
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 400    |קלט לא חוקי, הגשה כפולה, סטטוס לא ניתן לביטול/לא ניתן לחידוש, תצורת מחיר חסרה או JSON פגום|
| 401    |לא מורשה -- אין הפעלה מאומתת|
| 403    |אסור -- המשתמש אינו הבעלים של מודעת החסות|
| 404    |מודעת חסות לא נמצאה|
| 500    |שגיאת שרת פנימית -- כשל בספק התשלום או שגיאת מסד נתונים|

## הגבלת תעריפים

אין הגבלת תעריפים מפורשת. כתובות אתרים להפניה מחדש בנקודות הקצה של התשלום והחידוש מאומתות מול דומיין האפליקציה כדי למנוע פגיעויות פתוחות להפניה מחדש. ספק התשלום הפעיל נקבע על ידי משתנה הסביבה `NEXT_PUBLIC_PAYMENT_PROVIDER` (ברירת המחדל היא Stripe).

## נקודות קצה קשורות

- [User Payment Endpoints](./user-payment-endpoints) -- היסטוריית תשלומי משתמש וניהול מנויים
