---
id: sponsor-ads-endpoints
title: "נקודות קצה של Sponsor Ads API"
sidebar_label: "מודעות חסות"
sidebar_position: 16
---

# נקודות קצה של Sponsor Ads API

ה- Sponsor Ads API מנהל את מחזור החיים המלא של פרסומות ממומנות: יצירה, ביצוע תשלום, חידוש, ביטול וסטטיסטיקה. הוא משתלב עם מספר ספקי תשלומים (Stripe, LemonSqueezy, Polar) לצורך חיוב.

**קבצי מקור:**
- `template/app/api/sponsor-ads/route.ts`
- `template/app/api/sponsor-ads/checkout/route.ts`
- `template/app/api/sponsor-ads/user/route.ts`
- `template/app/api/sponsor-ads/user/[id]/route.ts`
- `template/app/api/sponsor-ads/user/[id]/cancel/route.ts`
- `template/app/api/sponsor-ads/user/[id]/renew/route.ts`
- `template/app/api/sponsor-ads/user/stats/route.ts`

## סיכום נקודות קצה

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|קבל|`/api/sponsor-ads`|אין|קבל מודעות חסות פעילות (ציבורי)|
|פוסט|`/api/sponsor-ads/checkout`|מושב|צור סשן קופה|
|קבל|`/api/sponsor-ads/user`|מושב|רשום את מודעות החסות של המשתמש|
|פוסט|`/api/sponsor-ads/user`|מושב|שלח מודעת חסות חדשה|
|קבל|`/api/sponsor-ads/user/{id}`|מושב|קבל מודעת חסות יחידה|
|פוסט|`/api/sponsor-ads/user/{id}/cancel`|מושב|בטל מודעת חסות|
|פוסט|`/api/sponsor-ads/user/{id}/renew`|מושב|חידוש מודעת חסות|
|קבל|`/api/sponsor-ads/user/stats`|מושב|קבל סטטיסטיקות מודעות של המשתמש|

---

## GET `/api/sponsor-ads`

Returns active sponsor ads with associated item data for public display. **No authentication required.**

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Max ads to return (1-50) |

### Response: 200

```json
{
  "success": true,
  "data": [
    {
      "sponsor": {
        "id": "sp_123",
        "itemSlug": "featured-tool",
        "status": "active",
        "interval": "monthly"
      },
      "item": {
        "name": "Featured Tool",
        "slug": "featured-tool",
        "description": "A great tool",
        "icon_url": "https://example.com/icon.png",
        "category": "productivity"
      }
    }
  ]
}
```

---

## פרסם `/api/sponsor-ads/checkout`

יוצר הפעלת תשלום עבור מודעת חסות מאושרת. תומך בספקי Stripe, LemonSqueezy ו-Polar.

### גוף הבקשה

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`sponsorAdId`|מחרוזת|**כן**|מזהה מודעת החסות המאושרת|
|`successUrl`|מחרוזת|לא|כתובת אתר להפניה מחדש לאחר תשלום מוצלח|
|`cancelUrl`|מחרוזת|לא|כתובת אתר להפניה מחדש לאחר תשלום שבוטל|

### אבטחה: מניעת הפניה פתוחה

כתובות אתרים להפניה מחדש מאומתות כנגד מקור האפליקציה כדי למנוע התקפות הפניה פתוחות:

```ts
function validateRedirectUrl(url, allowedOrigin) {
  const urlObj = new URL(url, allowedOrigin);
  const allowedUrlObj = new URL(allowedOrigin);
  // Only allow same protocol, hostname, and port
  return urlObj.protocol === allowedUrlObj.protocol &&
    urlObj.hostname === allowedUrlObj.hostname &&
    urlObj.port === allowedUrlObj.port;
}
```

כתובות אתרים לא חוקיות מוחלפות בשקט בברירות מחדל בטוחות.

### תגובות: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_live_abc123",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_abc123",
    "provider": "stripe"
  },
  "message": "Checkout session created successfully"
}
```

### תגובות שגיאה

|סטטוס|תיאור|
|--------|-------------|
| 400 |חסר מזהה מודעת חסות, מודעה לא בסטטוס `pending_payment`, או חסרה תצורת מחיר|
| 401 |לא מאומת|
| 403 |המשתמש אינו הבעלים של מודעת החסות הזו|
| 404 |מודעת חסות לא נמצאה|

---

## GET `/api/sponsor-ads/user`

Returns a paginated list of sponsor ads belonging to the authenticated user.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 10 | Items per page |
| `status` | string | No | -- | Filter: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| `interval` | string | No | -- | Filter by billing interval |
| `search` | string | No | -- | Text search filter |

Query parameters are validated using the `querySponsorAdsSchema` Zod schema.

### Response: 200

```json
{
  "success": true,
  "data": [
    {
      "id": "sp_123",
      "itemSlug": "my-tool",
      "status": "active",
      "interval": "monthly"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## פרסם `/api/sponsor-ads/user`

יוצר הגשת מודעת חסות חדשה. המודעה מתחילה במצב ממתין וממתין לאישור מנהל המערכת.

### גוף הבקשה

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`itemSlug`|מחרוזת|**כן**|שבלול של הפריט לתת חסות|
|`itemName`|מחרוזת|**כן**|שם התצוגה של הפריט|
|`itemIconUrl`|מחרוזת|לא|כתובת אתר של סמל|
|`itemCategory`|מחרוזת|לא|קטגוריית פריטים|
|`itemDescription`|מחרוזת|לא|תיאור (מקסימום 500 תווים)|
|`interval`|`"weekly"` או `"monthly"`|**כן**|מרווח מנוי|

### תגובה: 201 נוצר

```json
{
  "success": true,
  "data": {
    "id": "sp_new123",
    "status": "pending",
    "interval": "monthly"
  },
  "message": "Sponsor ad submission created successfully. Pending admin approval."
}
```

### 400 - הגשה כפולה

```json
{
  "success": false,
  "error": "You already have an active sponsor ad"
}
```

---

## GET `/api/sponsor-ads/user/{id}`

Retrieves a single sponsor ad owned by the authenticated user. Returns 404 if the ad does not exist or belongs to another user (to prevent information leakage).

---

## פרסם `/api/sponsor-ads/user/{id}/cancel`

מבטל מודעת חסות. ניתן לבטל רק מודעות בעלות הסטטוס `pending_payment`, `pending`, או `active`.

### גוף הבקשה

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`cancelReason`|מחרוזת|לא|סיבת הביטול (מקסימום 500 תווים)|

### תגובות: 200

```json
{
  "success": true,
  "data": { "id": "sp_123", "status": "cancelled" },
  "message": "Sponsor ad cancelled successfully"
}
```

### תגובות שגיאה

|סטטוס|תיאור|
|--------|-------------|
| 400 |לא ניתן לבטל מודעה עם הסטטוס הנוכחי|
| 403 |המשתמש אינו הבעלים של מודעת החסות הזו|
| 404 |מודעת חסות לא נמצאה|

---

## POST `/api/sponsor-ads/user/{id}/renew`

Creates a checkout session to renew an active or expired sponsor ad. Only ads with status `active` or `expired` can be renewed.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `successUrl` | string | No | Redirect URL after payment |
| `cancelUrl` | string | No | Redirect URL on cancellation |

### Response: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_renewal_abc",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_renewal_abc",
    "provider": "stripe"
  },
  "message": "Renewal checkout session created successfully"
}
```

---

## קבל `/api/sponsor-ads/user/stats`

מחזיר נתונים סטטיסטיים עבור מודעות החסות של המשתמש המאומת, כולל פירוט סטטוס, חלוקת מרווחים ומדדי הכנסה.

### תגובות: 200

```json
{
  "success": true,
  "stats": {
    "overview": {
      "total": 15,
      "pendingPayment": 2,
      "pending": 3,
      "active": 5,
      "rejected": 1,
      "expired": 3,
      "cancelled": 1
    },
    "byInterval": {
      "weekly": 8,
      "monthly": 7
    },
    "revenue": {
      "totalRevenue": 45000,
      "weeklyRevenue": 20000,
      "monthlyRevenue": 25000
    }
  }
}
```

ערכי ההכנסה הם ב-**יחידות מטבע מינוריות** (לדוגמה, סנטים לדולר ארה"ב).

---

## Payment Provider Configuration

The active payment provider is determined by `NEXT_PUBLIC_PAYMENT_PROVIDER` (defaults to `"stripe"`). Each provider requires its own set of price/variant ID environment variables:

| Provider | Weekly Price Env Var | Monthly Price Env Var |
|----------|---------------------|-----------------------|
| Stripe | `STRIPE_SPONSOR_WEEKLY_PRICE_ID` | `STRIPE_SPONSOR_MONTHLY_PRICE_ID` |
| LemonSqueezy | `LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID` | `LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID` |
| Polar | `POLAR_SPONSOR_WEEKLY_PRICE_ID` | `POLAR_SPONSOR_MONTHLY_PRICE_ID` |

---

## קבצי מקור קשורים

|קובץ|מטרה|
|------|---------|
|`template/app/api/sponsor-ads/route.ts`|נקודת קצה של מודעות פעילות ציבורית|
|`template/app/api/sponsor-ads/checkout/route.ts`|יצירת סשן בקופה|
|`template/app/api/sponsor-ads/user/route.ts`|רשימת מודעות ויצירה של משתמשים|
|`template/app/api/sponsor-ads/user/[id]/route.ts`|אחזור מודעה בודדת|
|`template/app/api/sponsor-ads/user/[id]/cancel/route.ts`|ביטול מודעה|
|`template/app/api/sponsor-ads/user/[id]/renew/route.ts`|חידוש מודעה|
|`template/app/api/sponsor-ads/user/stats/route.ts`|סטטיסטיקות משתמשים|
|`template/lib/services/sponsor-ad.service.ts`|שכבת היגיון עסקי|
|`template/lib/validations/sponsor-ad.ts`|סכימות אימות Zod|
|`template/lib/payment/config/payment-provider-manager.ts`|מפעל ספק תשלומים|
