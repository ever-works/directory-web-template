---
id: payment-endpoints
title: נקודות קצה של Payment API
sidebar_label: נקודות קצה לתשלום
sidebar_position: 3
---

# נקודות קצה של Payment API

התבנית תומכת בארבעה ספקי תשלום: **Stripe**, **Lemon Squeezy**, **Polar** ו**Solidgate**. לכל ספק יש קבוצה משלו של מסלולי API עבור תשלום, ניהול מנויים וטיפול ב-webhook. קבוצת `/api/payment` גנרית מספקת שאילתות מנוי ספק אגנוסטיות.

## פס (`/api/stripe`)

Stripe הוא האינטגרציה המלאה ביותר עם 17 מטפלי מסלולים המכסים את התשלום, מנויים, שיטות תשלום, כוונות הגדרה ומוצרים.

### קופה

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`POST`|`/api/stripe/checkout`|צור Stripe Checkout Session|

### מנויים

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/stripe/subscription`|קבל את המנוי הפעיל של המשתמש הנוכחי|
|`POST`|`/api/stripe/subscription`|צור מנוי חדש|
|`GET`|`/api/stripe/subscriptions`|רשום את כל מנויי המשתמשים|
|`POST`|`/api/stripe/subscription/[subscriptionId]/cancel`|בטל מנוי|
|`POST`|`/api/stripe/subscription/[subscriptionId]/reactivate`|הפעל מחדש מנוי שבוטל|
|`POST`|`/api/stripe/subscription/[subscriptionId]/update`|עדכון מנוי (שינוי תוכנית)|
|`POST`|`/api/stripe/subscription/portal`|צור סשן בפורטל לקוחות Stripe|

### דרכי תשלום

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/stripe/payment-methods/list`|רשימת אמצעי תשלום שמורים|
|`POST`|`/api/stripe/payment-methods/create`|הוסף אמצעי תשלום חדש|
|`PUT`|`/api/stripe/payment-methods/update`|עדכן את אמצעי התשלום המוגדר כברירת מחדל|
|`DELETE`|`/api/stripe/payment-methods/delete`|הסר אמצעי תשלום|
|`GET`|`/api/stripe/payment-methods/[id]`|קבל פרטי אמצעי תשלום|

### כוונות התקנה

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`POST`|`/api/stripe/setup-intent`|צור כוונת הגדרה לשמירת אמצעי תשלום|
|`GET`|`/api/stripe/setup-intent/[id]`|קבל סטטוס הגדרת כוונת|

### כוונות תשלום

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`POST`|`/api/stripe/payment-intent`|צור כוונת תשלום חד פעמית|

### מוצרים

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/stripe/products`|רשימת מוצרים/מחירים זמינים של Stripe|

### Webhook

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`POST`|`/api/stripe/webhook`|מטפל באירועי Stripe webhook|

המטפל ב-Stripe webhook מעבד אירועים כגון:
- `checkout.session.completed` - השלמת קופה
- `customer.subscription.created` - מנוי חדש
- `customer.subscription.updated` - שינויים במנוי
- `customer.subscription.deleted` - ביטול מנוי
- `invoice.payment_succeeded` - תשלום מוצלח
- `invoice.payment_failed` - תשלום נכשל

## לימון סחוט (`/api/lemonsqueezy`)

Lemon Squeezy מספק מודל מנוי פשוט יותר עם 7 נקודות קצה.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`POST`|`/api/lemonsqueezy/checkout`|צור קופה סוחטת לימון|
|`GET`|`/api/lemonsqueezy/list`|רשום את המנויים של המשתמש|
|`POST`|`/api/lemonsqueezy/cancel`|בטל מנוי|
|`POST`|`/api/lemonsqueezy/reactivate`|הפעל מחדש מנוי שבוטל|
|`POST`|`/api/lemonsqueezy/update`|עדכן את פרטי המנוי|
|`POST`|`/api/lemonsqueezy/update-plan`|שנה תוכנית מנוי|
|`POST`|`/api/lemonsqueezy/webhook`|מטפל ב-webhook של Lemon Squeezy|

### אירועי Webhook

תהליכי ההוק של Lemon Squeezy:
- `subscription_created` - מנוי חדש
- `subscription_updated` - שינויים בתוכנית
- `subscription_cancelled` - ביטול
- `subscription_payment_success` - אישור תשלום
- `subscription_payment_failed` - כשל בתשלום

## Polar (`/api/polar`)

Polar מספקת 5 נקודות קצה לניהול התשלום והמנויים.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`POST`|`/api/polar/checkout`|צור סשן קופה של Polar|
|`POST`|`/api/polar/subscription/[subscriptionId]/cancel`|בטל מנוי|
|`POST`|`/api/polar/subscription/[subscriptionId]/reactivate`|הפעל מחדש את המנוי|
|`POST`|`/api/polar/subscription/portal`|גישה לפורטל המנויים|
|`POST`|`/api/polar/webhook`|מטפל Webhook של Polar|

## Solidgate (`/api/solidgate`)

Solidgate היא האינטגרציה המינימלית ביותר עם 2 נקודות קצה.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`POST`|`/api/solidgate/checkout`|צור קופה של Solidgate|
|`POST`|`/api/solidgate/webhook`|Solidgate webhook מטפל|

## תשלום כללי (`/api/payment`)

נקודות קצה לתשלום אגנוסטיות לספק לניהול מנויים ללא קשר לספק התשלומים הבסיסי.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/payment/[subscriptionId]`|קבל פרטי מנוי לפי תעודת זהות|
|`GET`|`/api/payment/account`|קבל חשבון תשלום עבור המשתמש הנוכחי|
|`GET`|`/api/payment/account/[userId]`|קבל חשבון תשלום עבור משתמש ספציפי (אדמין)|

## Webhook Security

כל נקודות הקצה של webhook מיישמות אימות חתימה ספציפי לספק:

### פס

Stripe webhooks מאמתים את הכותרת `stripe-signature` באמצעות משתנה הסביבה `STRIPE_WEBHOOK_SECRET` ובשיטת `stripe.webhooks.constructEvent()`.

### סחיטת לימון

Lemon Squeezy webhooks מאמתים את הכותרת `x-signature` באמצעות HMAC-SHA256 עם `LEMONSQUEEZY_WEBHOOK_SECRET`.

### פולאר

Polar webhooks מאמתים חתימות של בקשות באמצעות `POLAR_WEBHOOK_SECRET`.

### סולידגייט

Solidgate webhooks משתמשים באימות החתימה המובנה של ה-SDK שלהם עם `SOLIDGATE_SECRET_KEY`.

## משתני סביבה

### פס

|משתנה|תיאור|
|----------|-------------|
|`STRIPE_SECRET_KEY`|מפתח סודי של Stripe API|
|`STRIPE_PUBLISHABLE_KEY`|מפתח בר פרסום (בצד הלקוח)|
|`STRIPE_WEBHOOK_SECRET`|סוד חתימת Webhook|

### סחיטת לימון

|משתנה|תיאור|
|----------|-------------|
|`LEMONSQUEEZY_API_KEY`|מפתח API של Lemon Squeezy|
|`LEMONSQUEEZY_STORE_ID`|מזהה חנות|
|`LEMONSQUEEZY_WEBHOOK_SECRET`|סוד חתימת Webhook|

### פולאר

|משתנה|תיאור|
|----------|-------------|
|`POLAR_ACCESS_TOKEN`|אסימון גישה של Polar API|
|`POLAR_WEBHOOK_SECRET`|סוד חתימת Webhook|
|`POLAR_ORGANIZATION_ID`|מזהה ארגון|

### סולידגייט

|משתנה|תיאור|
|----------|-------------|
|`SOLIDGATE_MERCHANT_ID`|מזהה סוחר|
|`SOLIDGATE_SECRET_KEY`|מפתח סודי של API|

## דרישות אימות

|סוג נקודת קצה|אישור נדרש|
|--------------|---------------|
|יצירת קופה|כן (משתמש מאומת)|
|ניהול מנויים|כן (בעל מנוי)|
|ניהול אמצעי תשלום|כן (לקוח פס)|
|רישום מוצר|ציבורי (מוצרי פס)|
|מטפלי Webhook|אימות חתימה (ללא הפעלה)|
|שאילתות תשלום כלליות|כן (בעל חשבון או מנהל מערכת)|
