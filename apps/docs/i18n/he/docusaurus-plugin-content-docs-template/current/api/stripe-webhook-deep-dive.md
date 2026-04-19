---
id: stripe-webhook-deep-dive
title: Stripe Webhook Deep Dive
sidebar_label: Stripe Webhooks
sidebar_position: 4
---

# Stripe Webhook Deep Dive

דף זה מכסה טיפול באירועי webhook, אימות חתימה, סוגי אירועים נתמכים, הודעות דוא"ל ודפוסי טיפול בשגיאות.

## סקירה כללית

נקודת הקצה של Stripe webhook מעבדת אירועים נכנסים מ-Stripe, מאמתת את האותנטיות שלהם באמצעות אימות חתימה, ממפה אותם לסוגי אירועים פנימיים ושולחת אותם למטפלים מיוחדים. כל מטפל מעדכן את מסד הנתונים באמצעות `WebhookSubscriptionService` ושולח אימיילים עסקיים.

## טבלת מסלולים

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|`POST`|`/api/stripe/webhook`|חתימת פס|עיבוד אירועי Stripe webhook נכנסים|

## אימות חתימה

כל חיבור אינטרנט נכנס חייב לכלול כותרת `stripe-signature`. הספק מאמת זאת באמצעות שיטת `constructEvent` של Stripe:

```typescript
const event = this.stripe.webhooks.constructEvent(
  payload,
  signature,
  this.webhookSecret
);
```

אם החתימה חסרה, נקודת הקצה מחזירה `400`:

```json
{ "error": "No signature provided" }
```

אם החתימה לא חוקית, הקריאה `constructEvent` זורקת ונקודת הקצה מחזירה:

```json
{ "error": "Webhook processing failed" }
```

## מיפוי סוגי אירועים

סוגי אירועי פס ממופים לערכים פנימיים של `WebhookEventType`:

|אירוע פסים|סוג פנימי|מטפל|
|-------------|---------------|---------|
|`customer.subscription.created`|`SUBSCRIPTION_CREATED`|`handleSubscriptionCreated`|
|`customer.subscription.updated`|`SUBSCRIPTION_UPDATED`|`handleSubscriptionUpdated`|
|`customer.subscription.deleted`|`SUBSCRIPTION_CANCELLED`|`handleSubscriptionCancelled`|
|`invoice.payment_succeeded`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`handleSubscriptionPaymentSucceeded`|
|`invoice.payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|`handleSubscriptionPaymentFailed`|
|`payment_intent.succeeded`|`PAYMENT_SUCCEEDED`|`handlePaymentSucceeded`|
|`payment_intent.payment_failed`|`PAYMENT_FAILED`|`handlePaymentFailed`|
|`customer.subscription.trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|`handleSubscriptionTrialEnding`|
|`billing_portal.session.updated`|`BILLING_PORTAL_SESSION_UPDATED`|נרשם בלבד|

## זרימת עיבוד Webhook

```
Stripe sends POST -> Read raw body -> Extract stripe-signature header
  -> stripeProvider.handleWebhook(body, signature)
    -> stripe.webhooks.constructEvent() (signature verification)
    -> Map event type to internal type
    -> Return { received: true, type, id, data }
  -> Switch on webhookResult.type
    -> Call appropriate handler
    -> Handler updates DB + sends email
  -> Return { received: true }
```

## מטפלי אירועים

### מנוי נוצר

מטפל ביצירת מנוי חדש:

1. בודק אם המנוי הוא מודעת חסות (טיפול מיוחד)
2. מתקשר ל`webhookSubscriptionService.handleSubscriptionCreated(data)` כדי לעדכן את מסד הנתונים
3. מחלץ מידע על התוכנית (שם, סכום, תקופת חיוב)
4. שולח הודעת קבלת פנים עם פרטי מנוי ותכונות

### מנוי עודכן

מטפל בשינויי מנוי (שדרוגי תוכנית, שדרוג לאחור וכו'):

1. מעדכן את מסד הנתונים באמצעות `webhookSubscriptionService.handleSubscriptionUpdated(data)`
2. מחלץ מידע מעודכן על התוכנית
3. שולח הודעת עדכון באימייל

### המנוי בוטל

מטפל בביטולי מנויים:

1. בדיקת מנויי מודעות נותנות חסות
2. מעדכן את מסד הנתונים באמצעות `webhookSubscriptionService.handleSubscriptionCancelled(data)`
3. שולח דוא"ל ביטול עם סיבת הביטול וכתובת האתר להפעלה מחדש

### התשלום הצליח (חד פעמי)

מטפל בתשלומים חד פעמיים מוצלחים:

1. מחלץ פרטי לקוח ופרטי תשלום
2. פורמט הסכום ושיטת התשלום
3. שולח הודעת אימייל לאישור תשלום עם כתובת קבלה

### התשלום נכשל

מטפל בתשלומים חד פעמיים שנכשלו:

1. מחלץ מידע שגיאה מ-`last_payment_error`
2. בונה כתובות URL של ניסיון חוזר ועדכון אמצעי תשלום
3. שולח הודעת אימייל על כשל בתשלום

### תשלום המנוי הצליח

מטפל בתשלומי מנוי חוזרים ומוצלחים:

1. מעדכן את מסד הנתונים באמצעות `webhookSubscriptionService.handleSubscriptionPaymentSucceeded(data)`
2. מחלץ פרטי חשבונית ומינוי
3. שולח אימייל קבלה על תשלום מנוי

### תשלום המנוי נכשל

מטפל בתשלומי מנוי חוזרים שנכשלו:

1. מעדכן את מסד הנתונים באמצעות `webhookSubscriptionService.handleSubscriptionPaymentFailed(data)`
2. שולח הודעת כשל עם כתובות URL של ניסיון חוזר ועדכון תשלום

### ניסיון סיום

מטפל בהודעות סיום תקופת ניסיון מ-Stripe:

1. מעדכן את מסד הנתונים באמצעות `webhookSubscriptionService.handleSubscriptionTrialEnding(data)`
2. שולח אימייל תזכורת לסיום ניסיון

## הודעות אימייל

כל מטפל משתמש ב-`paymentEmailService` כדי לשלוח דוא"ל עסקה. תצורת הדוא"ל נטענת בצורה מאובטחת באמצעות `getEmailConfig()`:

```typescript
function createEmailData(baseData: any, emailConfig: ReturnType<typeof getEmailConfig>) {
  return {
    ...baseData,
    companyName: emailConfig.companyName,
    companyUrl: emailConfig.companyUrl,
    supportEmail: emailConfig.supportEmail
  };
}
```

|אירוע|תבנית אימייל|
|-------|---------------|
|נוצר מנוי|`sendNewSubscriptionEmail`|
|המנוי עודכן|`sendUpdatedSubscriptionEmail`|
|המנוי בוטל|`sendCancelledSubscriptionEmail`|
|התשלום הצליח|`sendPaymentSuccessEmail`|
|התשלום נכשל|`sendPaymentFailedEmail`|
|תשלום המנוי הצליח|`sendSubscriptionPaymentSuccessEmail`|
|תשלום המנוי נכשל|`sendSubscriptionPaymentFailedEmail`|
|משפט מסתיים|`sendUpdatedSubscriptionEmail`|

## טיפול במודעות חסות

ה-webhook כולל טיפול מיוחד בהרשמות למודעות חסות. אלה מזוהים על ידי בדיקת מטא נתונים:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const metadata = data.metadata as Record<string, string> | undefined;
  return metadata?.type === 'sponsor_ad';
}
```

מופעלת אירועי חסות של מודעות:
- **הפעלה**: מאשרת תשלום ומגדירה את המודעה לבדיקת מנהל
- **ביטול**: משבית את מודעת החסות
- **חידוש**: מאריך את תאריך הסיום של מודעת החסות

## תכונות התוכנית

הפונקציה `getSubscriptionFeatures` ממפה את שמות התוכניות לרשימות תכונה המשמשות בדוא"ל קבלת פנים:

```typescript
const features: Record<string, string[]> = {
  'Free Plan': ['Access to basic features', 'Email support', 'Limited storage'],
  'Standard Plan': ['All advanced features', 'Priority support', 'Unlimited storage', ...],
  'Premium Plan': ['All Pro features', 'Dedicated support', 'Custom features', ...]
};
```

## טיפול בשגיאות

נקודת הסיום של webhook עוקבת אחר דפוס גמיש:

- כל מטפל בודד עטוף בבלוק נסיון/תפוס משלו
- כשלים במטפל נרשמים אך אינם גורמים ל-webhook להחזיר שגיאה
- ה-try/catch החיצוני תופס שגיאות אימות חתימה וניתוח
- מחזירה `400` עבור כל הכישלונות ברמת ה-webhook כדי לומר ל-Stripe לא לנסות שוב על שגיאות קבועות

```typescript
try {
  // ... signature verification and event dispatch
  return NextResponse.json({ received: true });
} catch (error) {
  console.error('Webhook error:', error);
  return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
}
```

## דרישות תצורה

|משתנה|חובה|תיאור|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|כן|מפתח API סודי של Stripe|
|`STRIPE_WEBHOOK_SECRET`|כן|סוד חתימת Webhook (מלוח המחוונים של Stripe)|

כדי להגדיר את ה-webhook ב-Stripe Dashboard:

1. נווט אל מפתחים > Webhooks
2. הוסף כתובת אתר של נקודת קצה: `https://yourdomain.com/api/stripe/webhook`
3. בחר את האירועים המפורטים בטבלת מיפוי האירועים למעלה
4. העתק את סוד החתימה אל `STRIPE_WEBHOOK_SECRET`

## שיקולי אבטחה

- אימות חתימה הוא חובה; בקשות ללא חתימות תקפות נדחות
- גוף הבקשה הגולמי משמש לאימות חתימה (לא מנותח JSON)
- סודות Webhook לעולם לא צריכים להיות מחויבים לבקרת גרסאות
- נקודת הקצה אינה דורשת אימות הפעלה (סטריפ קורא לה ישירות)
- נתונים רגישים בהודעות שגיאה עוברים חיטוי עבור סביבות ייצור

## דפים קשורים

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Stripe Subscription Deep Dive](./stripe-subscription-deep-dive.md)
- [Stripe Payment Methods Deep Dive](./stripe-payment-methods-deep-dive.md)
- [ארכיטקטורת ספק תשלומים](./payment-provider-architecture.md)
