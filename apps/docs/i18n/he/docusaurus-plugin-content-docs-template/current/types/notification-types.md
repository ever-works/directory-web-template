---
id: notification-types
title: הגדרות סוג הודעה
sidebar_label: סוגי התראות
sidebar_position: 14
---

# הגדרות סוג הודעה

**מקור:** `lib/services/email-notification.service.ts`, `lib/payment/services/payment-email.service.ts`, `lib/payment/types/payment-types.ts`

ההתראות בתבנית מבוססות בעיקר על דואר אלקטרוני, מופעלות על ידי אירועי מערכת כגון השלמות תשלומים, שינויים בהרשמה וביקורות הגשה.

## ממשקים

### `EmailNotificationData`

מטען הליבה לשליחת הודעות דוא"ל של מנהל מערכת.

```typescript
interface EmailNotificationData {
  to: string;                  // Recipient email address
  title: string;               // Email subject / notification title
  message: string;             // Body text content
  actionUrl?: string;          // Optional CTA link
  actionText?: string;         // Optional CTA button label
  notificationType: string;    // Category identifier for template selection
  timestamp: string;           // ISO 8601 timestamp
}
```

|שדה|חובה|תיאור|
|-------|----------|-------------|
|`to`|כן|כתובת אימייל של הנמען|
|`title`|כן|שורת נושא וכותרת פנימית|
|`message`|כן|גוף הודעות ראשי|
|`actionUrl`|לא|קישור לכפתור הקריאה לפעולה|
|`actionText`|לא|תווית טקסט עבור לחצן הקריאה לפעולה|
|`notificationType`|כן|משמש לבחירת גרסת תבנית הדוא"ל|
|`timestamp`|כן|מתי התרחש האירוע המפעיל|

### `WebhookEventType`

אירועים שהתקבלו מ-webhooks של ספקי תשלומים שמפעילים התראות.

```typescript
enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
  // ... additional billing portal events
}
```

### `WebhookResult`

תוצאה סטנדרטית מעיבוד אירוע webhook.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## קטגוריות התראות

התבנית מפעילה התראות עבור קטגוריות אירועים אלה:

|קטגוריה|הפעלת אירועים|
|----------|---------------|
|**תשלום**|`payment_succeeded`, `payment_failed`, `refund_succeeded`|
|**מינוי**|`subscription_created`, `subscription_cancelled`, `subscription_trial_ending`|
|**חשבונית**|`invoice_paid`, `invoice_payment_failed`|
|**הגשה**|הפריט אושר, הפריט נדחה, הגשה חדשה התקבלה|
|**חשבון**|הסיסמה שונתה, האימייל אומת|

## שילוב שירותי דואר אלקטרוני

הודעות נשלחות דרך הכיתה `EmailNotificationService`:

```typescript
import { EmailNotificationService } from '@/lib/services/email-notification.service';
import type { EmailNotificationData } from '@/lib/services/email-notification.service';

const notification: EmailNotificationData = {
  to: 'admin@example.com',
  title: 'New Submission Received',
  message: 'A new item "Acme Corp" has been submitted for review.',
  actionUrl: '/admin/items/pending',
  actionText: 'Review Now',
  notificationType: 'submission',
  timestamp: new Date().toISOString(),
};

const result = await EmailNotificationService.sendAdminNotification(notification);
```

השירות בודק את זמינות ספק הדוא"ל לפני השליחה ומחזיר תוצאה `skipped` אם לא הוגדר ספק, ומונע שגיאות זמן ריצה בסביבות ללא הגדרת דואר אלקטרוני.

## תצורת ספק דואר אלקטרוני

מסירת ההודעות תלויה בתצורת הדוא"ל ב-`lib/config/schemas/email.schema.ts`:

|ספק|חובה Env Var|מופעל אוטומטי|
|----------|-----------------|--------------|
|שלח שוב|`RESEND_API_KEY`|כאשר מפתח קיים|
|נובו|`NOVU_API_KEY`|כאשר מפתח קיים|
|SMTP|`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`|כאשר שלושתם נוכחים|

## דוגמה לשימוש

```typescript
// In a webhook handler
import { WebhookEventType } from '@/lib/payment/types/payment-types';

async function handleWebhook(event: WebhookResult) {
  if (event.type === WebhookEventType.SUBSCRIPTION_CANCELLED) {
    await EmailNotificationService.sendAdminNotification({
      to: adminEmail,
      title: 'Subscription Cancelled',
      message: `Customer ${event.data.customerId} cancelled their subscription.`,
      notificationType: 'subscription',
      timestamp: new Date().toISOString(),
    });
  }
}
```

## סוגים קשורים

- [סוגי תשלום](./payment-types.md) -- `WebhookEventType` וספידי תשלום
- [סוגי מנוי](./subscription-types.md) -- אירועי מחזור חיים של מנוי
- [Config Types](./config-types.md) -- `EmailConfig` להגדרות הספק
