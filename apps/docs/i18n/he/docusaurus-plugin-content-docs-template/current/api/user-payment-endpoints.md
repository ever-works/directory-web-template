---
id: user-payment-endpoints
title: "התייחסות ל-User Payment API"
sidebar_label: "תשלומי משתמשים"
sidebar_position: 55
---

# התייחסות ל-User Payment API

## סקירה כללית

נקודות הקצה של תשלומי משתמש מנהלות העדפות מטבע, היסטוריית תשלומים, סטטוס תוכנית ופרטי מנוי עבור משתמשים מאומתים. זיהוי מטבע משתמש בכותרות CDN/פרוקסי (Cloudflare, Vercel, CloudFront, Fastly) כדי לקבוע אוטומטית את המטבע של המשתמש. נתוני התשלומים והמנויים מקורם ב-Stripe.

## נקודות קצה

### קבל /api/user/currency

מזהה ומחזיר את העדפת המטבע של המשתמש בהתבסס על כותרות HTTP מספקי CDN/פרוקסי. תמיד מחזיר `200 OK` עם השפלה חיננית -- נופל בחזרה לדולר אם הזיהוי נכשל.

**בקשה**

|פרמטר|הקלד|ב|תיאור|
|-----------|--------|-------|-------------|
|ספק|מחרוזת|שאילתה|ספק זיהוי: `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` (ברירת מחדל: @7@TO@@K0)|

**תגובה**
```typescript
{
  currency: string;     // ISO 4217 code, e.g. "USD", "EUR", "GBP"
  country: string | null; // ISO 3166-1 alpha-2, e.g. "US", "FR", or null if detection failed
  detected: boolean;    // true if detected from headers, false if using fallback
}
```

**דוגמה**
```typescript
const response = await fetch('/api/user/currency?provider=smart');
const { currency, country, detected } = await response.json();
// { currency: "EUR", country: "FR", detected: true }
```

### PUT /api/user/currency

מעדכן את העדפת המטבע והמדינה של המשתמש המאומת. דורש הפעלה חוקית.

**בקשה**
```typescript
{
  currency: string;       // ISO 4217 code, exactly 3 characters, required
  country?: string | null; // ISO 3166-1 alpha-2, exactly 2 characters, optional
}
```

**תגובה**
```typescript
{
  currency: string;       // Updated currency code
  country: string | null; // Updated country code or null
}
```

**דוגמה**
```typescript
const response = await fetch('/api/user/currency', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency: 'EUR', country: 'FR' })
});
const data = await response.json();
```

### קבל /api/user/payments

מאחזר היסטוריית תשלומים מקיפה עבור המשתמש המאומת מ-Stripe. מחזירה חשבוניות עם פרטי תוכנית, מרווחי חיוב וקישורי חשבוניות, ממוינות לפי תאריך (החדש ביותר ראשון).

**בקשה**

אין צורך בפרמטרים. אימות באמצעות קובץ Cookie של הפעלה.

**תגובה**
```typescript
Array<{
  id: string;                // Stripe invoice ID
  date: string;              // ISO 8601 date
  amount: number;            // In major currency units (e.g. 29.99)
  currency: string;          // Uppercase currency code
  plan: string;              // Plan display name
  planId: string;            // Plan identifier
  status: "Paid" | "Pending" | "Draft" | "Unknown";
  billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  paymentProvider: "stripe";
  subscriptionId: string;    // Associated subscription ID
  description: string;       // e.g. "Premium Plan - monthly billing"
  invoiceUrl: string | null; // Hosted invoice URL
  invoicePdf: string | null; // Invoice PDF download URL
  invoiceNumber: string | null;
  period_end: string | null;   // Billing period end (ISO 8601)
  period_start: string | null; // Billing period start (ISO 8601)
}>
```

**דוגמה**
```typescript
const response = await fetch('/api/user/payments');
const payments = await response.json();
// payments[0] = { id: "in_123...", amount: 29.99, status: "Paid", ... }
```

### GET /api/user/plan-status

מחזירה את התוכנית הנוכחית של המשתמש עם פרטי תפוגה מלאים, כולל תוכנית אפקטיבית (למה שהמשתמש יכול לגשת בפועל), תקופות אזהרה וסטטוס גישה לתכונה.

**בקשה**

אין צורך בפרמטרים. אימות באמצעות קובץ Cookie של הפעלה.

**תגובה**
```typescript
{
  success: true;
  data: {
    planId: "free" | "standard" | "premium";
    effectivePlan: "free" | "standard" | "premium"; // May differ if expired
    isExpired: boolean;
    expiresAt: string | null;          // ISO 8601 date
    daysUntilExpiration: number | null; // Negative if already expired
    isInWarningPeriod: boolean;        // true if expires within 7 days
    canAccessPlanFeatures: boolean;
    warningMessage: string | null;     // User-facing warning text
    status: string | null;             // Raw subscription status
  };
}
```

**דוגמה**
```typescript
const response = await fetch('/api/user/plan-status');
const { data } = await response.json();

if (data.isInWarningPeriod) {
  showWarning(data.warningMessage);
}

if (!data.canAccessPlanFeatures) {
  redirectToUpgrade();
}
```

### קבל /api/user/subscription

מאחזר מידע מנוי מקיף כולל פרטי מנוי פעילים עדכניים והיסטוריית מנויים מלאה מ-Stripe.

**בקשה**

אין צורך בפרמטרים. אימות באמצעות קובץ Cookie של הפעלה.

**תגובה**
```typescript
{
  hasActiveSubscription: boolean;
  message?: string;                    // Only when no Stripe customer found
  currentSubscription?: {
    id: string;                        // Stripe subscription ID
    planId: string;                    // Stripe price ID
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
    startDate: string;                 // ISO 8601
    endDate: string;
    nextBillingDate: string;
    paymentProvider: "stripe";
    subscriptionId: string;
    amount: number;                    // Major currency units
    currency: string;                  // Uppercase
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
    currentPeriodEnd: string;
    currentPeriodStart: string;
  };
  subscriptionHistory: Array<{
    id: string;
    planId: string;
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
    startDate: string;
    endDate: string;
    cancelledAt?: string;
    cancelReason?: string;
    amount: number;
    currency: string;
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  }>;
}
```

**דוגמה**
```typescript
const response = await fetch('/api/user/subscription');
const { hasActiveSubscription, currentSubscription } = await response.json();

if (hasActiveSubscription && currentSubscription) {
  console.log(`Plan: ${currentSubscription.planName}, Status: ${currentSubscription.status}`);
}
```

## אימות

- **GET /api/user/currency**: ציבורי (לא נדרש אישור) -- מזהה מטבע מהכותרות.
- **PUT /api/user/currency**: דורש הפעלה מאומתת.
- **קבל /api/user/payments**: דורש הפעלה מאומתת.
- **GET /api/user/plan-status**: דורש הפעלה מאומתת.
- **קבל /api/user/subscription**: דורש הפעלה מאומתת.

## תגובות שגיאה

|סטטוס|תיאור|
|--------|-------------|
| 400 |קוד מטבע לא חוקי, פורמט קוד מדינה לא חוקי או מטען JSON שגוי|
| 401 |לא מורשה -- אין הפעלה מאומתת|
| 500 |שגיאת שרת פנימית -- כשל ב-Stripe API או שגיאת מסד נתונים|

## הגבלת תעריפים

אין הגבלת תעריפים מפורשת. נקודת הסיום של זיהוי המטבע מחזירה תמיד `200 OK` עבור השפלה חיננית. נתוני תשלום ומנוי נשלפים ישירות מ-Stripe עם מגבלה של 100 רשומות לכל בקשה.

## נקודות קצה קשורות

- [Config Feature Endpoints](./config-feature-endpoints) -- בדוק את זמינות התכונה בהתבסס על תוכנית
