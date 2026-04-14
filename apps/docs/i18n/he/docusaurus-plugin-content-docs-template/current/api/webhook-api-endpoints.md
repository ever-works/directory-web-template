---
id: webhook-api-endpoints
title: Webhook API Endpoints
sidebar_label: Webhooks
sidebar_position: 27
---

# Webhook API Endpoints

התבנית תומכת במטפלי תשלומים באינטרנט עבור ארבעה ספקים: Stripe, LemonSqueezy, Polar ו-Solidgate. כל נקודת קצה webhook מעבדת אירועים נכנסים מספק התשלומים המתאים לה, מטפלת בניהול מחזור חיים של מנויים, הודעות תשלום ומשלוח דוא"ל. כל נקודות הקצה מאמתות חתימות בקשות לצורך אבטחה.

## סקירה כללית

|נקודת קצה|ספק|כותרת חתימה|תיאור|
|---|---|---|---|
|`/api/stripe/webhook`|פס|`stripe-signature`|עיבוד אירועי תשלום ומנוי ב-Stripe|
|`/api/lemonsqueezy/webhook`|LemonSqueezy|`x-signature`|עבד אירועי תשלום LemonSqueezy|
|`/api/polar/webhook`|פולאר|`webhook-signature`|עיבוד אירועי תשלום Polar|
|`/api/solidgate/webhook`|סולידגייט|`x-signature`|עיבוד אירועי תשלום של Solidgate|

כל נקודות הקצה של webhook מקבלים רק בקשות POST ומחזירות `{"received": true}` עם הצלחה.

## אדריכלות משותפת

כל ארבעת המטפלים ב-webhook עוקבים אחר אותו דפוס כללי:

1. קרא את גוף הבקשה הגולמי כטקסט (דרוש לאימות חתימה)
2. חלץ את החתימה מכותרות ספציפיות לספק
3. העבר את הגוף והחתימה לשיטת `handleWebhook()` של הספק לאימות וניתוח
4. נתב את האירוע המנתח למטפל המתאים בהתבסס על `WebhookEventType`
5. ביצוע היגיון עסקי (עדכוני מסד נתונים, הודעות דוא"ל)
6. החזר `{"received": true}` כדי לאשר את ה-webhook

### סוגי אירועים נפוצים

ה-`WebhookEventType` enum מ-`lib/payment/types/payment-types` מתקן אירועים בין ספקים:

|סוג אירוע|תיאור|
|---|---|
|`SUBSCRIPTION_CREATED`|מנוי חדש הופעל|
|`SUBSCRIPTION_UPDATED`|תוכנית המנוי או הפרטים השתנו|
|`SUBSCRIPTION_CANCELLED`|המנוי בוטל|
|`PAYMENT_SUCCEEDED`|הושלם תשלום חד פעמי|
|`PAYMENT_FAILED`|ניסיון התשלום נכשל|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|הושלם תשלום מנוי חוזר|
|`SUBSCRIPTION_PAYMENT_FAILED`|תשלום מנוי חוזר נכשל|
|`SUBSCRIPTION_TRIAL_ENDING`|תקופת הניסיון עומדת להסתיים|
|`REFUND_SUCCEEDED`|ההחזר עובד|
|`BILLING_PORTAL_SESSION_UPDATED`|הפעלת פורטל החיובים השתנתה (סטריפ בלבד)|

## Stripe Webhook

```
POST /api/stripe/webhook
```

מעבד אירועי Stripe webhook עם אימות חתימה באמצעות הכותרת `stripe-signature`. זהו מטפל ה-webhook השלם ביותר עם התכונה, כולל הודעות דוא"ל עבור כל סוגי האירועים וטיפול במנויי פרסומות חסות.

**כותרת חובה:**

|כותרת|תיאור|
|---|---|
|`stripe-signature`|חתימת Stripe webhook (`t=...,v1=...` פורמט)|

**אירועים נתמכים:**

|אירוע פסים|סוג ממופה|פעולות|
|---|---|---|
|`customer.subscription.created`|`SUBSCRIPTION_CREATED`|עדכון מסד הנתונים, דוא"ל ברוכים הבאים|
|`customer.subscription.updated`|`SUBSCRIPTION_UPDATED`|עדכון מסד נתונים, עדכון מייל|
|`customer.subscription.deleted`|`SUBSCRIPTION_CANCELLED`|עדכון מסד הנתונים, דוא"ל ביטול|
|`invoice.payment_succeeded`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|עדכון מסד נתונים, מייל קבלה|
|`invoice.payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|עדכון מסד הנתונים, נסה שוב באימייל|
|`payment_intent.succeeded`|`PAYMENT_SUCCEEDED`|מייל אישור|
|`payment_intent.payment_failed`|`PAYMENT_FAILED`|הודעת אימייל על כשל|
|`customer.subscription.trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|אימייל לסיום ניסיון|
|`billing_portal.session.updated`|`BILLING_PORTAL_SESSION_UPDATED`|רישום בלבד|

**טיפול במודעות חסות:**

Stripe webhooks מזהים מינויים למודעות חסות דרך `metadata.type === "sponsor_ad"` בנתוני המנוי. כאשר מזוהים, מטפלים ייעודיים מפעילים, מבטלים או מחדשים מודעות נותנות חסות במקום לעבד מנויים רגילים.

**תגובות שגיאה:**

|סטטוס|מצב|
|---|---|
| 400 |חסרה כותרת `stripe-signature`|
| 400 |Webhook לא עובד (חתימה לא חוקית)|
| 400 |עיבוד Webhook נכשל|

**מקור:** `template/app/api/stripe/webhook/route.ts`

## LemonSqueezy Webhook

```
POST /api/lemonsqueezy/webhook
```

מעבד אירועי LemonSqueezy webhook עם אימות חתימה באמצעות הכותרת `x-signature`. משתמש בפונקציית מיפוי אירועים כדי לתרגם שמות אירועים ספציפיים ל-LemonSqueezy ל-`WebhookEventType` הגנרי.

**כותרת חובה:**

|כותרת|תיאור|
|---|---|
|`x-signature`|חתימת Webhook של LemonSqueezy|

**מיפוי אירועים:**

|אירוע LemonSqueezy|סוג ממופה|
|---|---|
|`subscription_created`|`SUBSCRIPTION_CREATED`|
|`subscription_updated`|`SUBSCRIPTION_UPDATED`|
|`subscription_cancelled`|`SUBSCRIPTION_CANCELLED`|
|`subscription_payment_success`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|
|`subscription_payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|
|`subscription_trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|
|`order_created`|`PAYMENT_SUCCEEDED`|
|`order_refunded`|`REFUND_SUCCEEDED`|

**טיפול במודעות חסות:**

LemonSqueezy משתמש ב-`custom_data.type === "sponsor_ad"` או `meta.custom_data.type === "sponsor_ad"` כדי לזהות מנויים למודעות נותנות חסות.

**מקור:** `template/app/api/lemonsqueezy/webhook/route.ts`

## Polar Webhook

```
POST /api/polar/webhook
```

מעבד אירועי Polar webhook עם אימות חתימה מרובת כותרות. Polar משתמשת בשלוש כותרות לאימות אבטחה ומאצילה ניתוב אירועים למודול נתב נפרד.

**כותרות נדרשות:**

|כותרת|תיאור|
|---|---|
|`webhook-signature`|חתימת HMAC SHA256 (פורמט `v1,<hex_signature>`)|
|`webhook-timestamp`|חותמת זמן של יוניקס של אירוע ה-webhook|
|`webhook-id`|מזהה ייחודי עבור משלוח ה-webhook|

**אירועים נתמכים:**

|אירוע קוטב|תיאור|
|---|---|
|`checkout.succeeded`|התשלום הושלם|
|`checkout.failed`|התשלום נכשל|
|`subscription.created`|נוצר מנוי|
|`subscription.updated`|המנוי עודכן|
|`subscription.canceled`|המנוי בוטל|
|`invoice.paid`|תשלום החשבונית הושלם|
|`invoice.payment_failed`|תשלום החשבונית נכשל|

**עיבוד:**

בניגוד לספקים האחרים, מטפל ה-webhook של Polar משתמש בפונקציה נפרדת `routeWebhookEvent()` ממודול `router` ומכלי שירות `validateWebhookPayload()` לאימות מבנה מטען לפני אימות חתימה.

**מקור:** `template/app/api/polar/webhook/route.ts`

## Solidgate Webhook

```
POST /api/solidgate/webhook
```

מעבד אירועי סוlidgate webhook עם אימות חתימה. כולל הגנה על אי-פוטנציה בזיכרון כדי למנוע עיבוד כפול של אותו אירוע webhook.

**כותרת חובה:**

|כותרת|תיאור|
|---|---|
|`x-signature` או `solidgate-signature`|חתימת ה-Solidgate Webhook|

**אידפוטנטיות:**

המטפל שומר על זיכרון `Set` של מזהי webhook מעובדים. כפולות webhooks חוזרים `{"received": true}` ללא עיבוד מחדש. תוקפם של מזהי Webhook יפוג מהמטמון לאחר 24 שעות.

**הערה:** מטמון האידמפוטנציה בזיכרון אינו נמשך בכל פניות לפונקציות ללא שרת. בסביבות ללא שרתים של ייצור, יש להחליף את זה ב-Redis או בפתרון מגוב מסד נתונים.

**אירועים נתמכים:**

המטפל מקבל הן את הקבועים הגנריים `WebhookEventType` והן את שמות האירועים המבוססים על מחרוזות (למשל, הן `WebhookEventType.PAYMENT_SUCCEEDED` והן `"payment_succeeded"`).

|אירוע|פעולות|
|---|---|
|`payment_succeeded`|שיא תשלום|
|`payment_failed`|כשל שיא|
|`subscription_created`|צור מנוי|
|`subscription_updated`|עדכן מנוי|
|`subscription_cancelled`|בטל מנוי|
|`subscription_payment_succeeded`|שיא תשלום מנוי|
|`subscription_payment_failed`|שיא תשלום מנוי|
|`subscription_trial_ending`|טפל בסיום ניסיון|
|`refund_processed`|החזר יומן|

**קבל נקודת קצה:**

Solidgate גם חושפת מטפל GET שמחזיר הודעת מידע על נקודת הקצה של webhook:

```json
{
  "message": "Solidgate webhook endpoint",
  "instructions": "This endpoint accepts POST requests from Solidgate webhooks",
  "method": "POST"
}
```

**מקור:** `template/app/api/solidgate/webhook/route.ts`

## הודעות אימייל

המטפל של Stripe webhook שולח את הודעות האימייל המקיפות ביותר. כל הספקים מאצילים ל-`WebhookSubscriptionService` עבור פעולות מסד נתונים, אך תבניות הדוא"ל משתנות בהתאם לספק.

|סוג דוא"ל|טריגר|
|---|---|
|ברוכים הבאים / מנוי חדש|נוצר מנוי|
|עדכון מנוי|תוכנית המנוי השתנתה|
|אישור ביטול|המנוי בוטל|
|קבלה על תשלום|מנוי או תשלום חד פעמי הצליח|
|התשלום נכשל / נסה שוב|ניסיון התשלום נכשל|
|ניסיון סיום|תקופת הניסיון עומדת להסתיים|

תצורת הדוא"ל נטענת מ-`lib/config/server-config` דרך `getEmailConfig()` וכוללת את שם החברה, כתובת האתר של החברה וכתובת האימייל לתמיכה.

## פרטי יישום מרכזיים

- **אימות חתימה:** כל הספקים מאמתים חתימות Webhook לפני עיבוד אירועים. חתימות לא חוקיות מביאות לתגובה של 400.
- **ניתוח גוף גולמי:** Webhooks קוראים את גוף הבקשה כטקסט באמצעות `request.text()` במקום `request.json()` מכיוון שאימות חתימה דורש את המטען הגולמי והלא שונה.
- **WebhookSubscriptionService:** המחלקה המשותפת `WebhookSubscriptionService` מטפלת בפעולות מסד נתונים עבור אירועי מחזור חיים של מנוי בכל הספקים.
- **זיהוי מודעות חסות:** Stripe ו-LemonSqueezy webhooks מזהים מינויים של מודעות חסות באמצעות מטא נתונים ומנתבים אותם למטפלים נפרדים לצורך הפעלה, ביטול וחידוש של מודעות.
- **טיפול בשגיאות חינני:** כשלי שליחת דואר אלקטרוני נתפסים ונרשמים אך אינם גורמים ל-webhook להחזיר שגיאה. ה-webhook תמיד מאשר קבלה כדי למנוע ניסיונות חוזרים של ספק.
