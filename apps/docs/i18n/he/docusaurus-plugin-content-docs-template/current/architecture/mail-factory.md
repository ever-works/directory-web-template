---
id: mail-factory
title: Mail Factory
sidebar_label: Mail Factory
sidebar_position: 33
---

# Mail Factory

התבנית משתמשת בדפוס היצרן למשלוח דוא"ל, תומכת במספר ספקים (שלח מחדש, Novu) עם חזרה אוטומטית לספק מדומה במהלך הפיתוח או כאשר חסרים אישורים.

## מבנה הקובץ

```
lib/mail/
  index.ts                    # EmailService class, exported helper functions
  factory.ts                  # EmailProviderFactory - provider selection logic
  mock.ts                     # MockEmailProvider - logs to console
  resend.ts                   # ResendProvider - Resend API integration
  novu.ts                     # NovuProvider - Novu notification integration
  templates/
    index.ts                  # Re-exports all templates
    account-created.ts        # Account creation email
    admin-notification.ts     # Admin notification emails
    email-verification.ts     # Email verification link
    newsletter-welcome.ts     # Newsletter welcome email
    newsletter-unsubscribe.ts # Newsletter unsubscribe confirmation
    newsletter-regular.ts     # Regular newsletter dispatch
    password-change-confirmation.ts  # Password change confirmation
    payment-success.ts        # Payment success notification
    payment-failed.ts         # Payment failure notification
    submission-decision.ts    # Item submission approval/rejection
    subscription-events.ts    # Subscription lifecycle events
    subscription-expired.ts   # Subscription expiration notice
    subscription-renewal-reminder.ts # Renewal reminder
```

## Provider Interface

כל ספק דוא"ל מיישם את הממשק `EmailProvider`:

```ts
export interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<any>;
  getName(): string;
}
```

## תבנית מפעל (`factory.ts`)

ה-`EmailProviderFactory` בוחר את הספק המתאים על סמך התצורה. אם מפתח ה-API של הספק שצוין חסר או ריק, הוא חוזר לספק המדומה:

```ts
export class EmailProviderFactory {
  static createProvider(config: EmailServiceConfig): EmailProvider {
    const provider = config.provider.toLowerCase();

    switch (provider) {
      case "resend":
        if (!config.apiKeys.resend || config.apiKeys.resend.trim() === '') {
          console.warn('Resend API key is missing. Using mock email provider.');
          return new MockEmailProvider();
        }
        return new ResendProvider(config.apiKeys.resend, config.defaultFrom);

      case "novu":
        if (!config.apiKeys.novu || config.apiKeys.novu.trim() === '') {
          console.warn('Novu API key is missing. Using mock email provider.');
          return new MockEmailProvider();
        }
        return new NovuProvider(config.apiKeys.novu, config.defaultFrom, config.novu);

      default:
        console.warn(`Unknown email provider. Using mock email provider.`);
        return new MockEmailProvider();
    }
  }
}
```

## Provider Implementations

### MockEmailProvider

רושם מיילים לקונסולה. משמש במהלך הפיתוח או כאשר אין מפתחות API מוגדרים:

```ts
export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log("Sending email:", message);
    return Promise.resolve();
  }
  getName(): string { return "mock"; }
}
```

### ResendProvider

שולח אימיילים דרך ממשק ה-API:

```ts
export class ResendProvider implements EmailProvider {
  private resend: Resend;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.resend = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async sendEmail(message: EmailMessage): Promise<CreateEmailResponse> {
    return this.resend.emails.send({
      from: message.from || this.defaultFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
```

### NovuProvider

שולח מיילים דרך תשתית ההתראות של Novu באמצעות טריגרים של זרימת עבודה:

```ts
export class NovuProvider implements EmailProvider {
  private novu: Novu;
  private defaultFrom: string;
  private templateId: string;

  constructor(apiKey: string, defaultFrom: string, config?: EmailNovuConfig) {
    this.novu = new Novu({
      secretKey: apiKey,
      serverURL: config?.backendUrl,
    });
    this.defaultFrom = defaultFrom;
    this.templateId = config?.templateId || "email-default";
  }

  async sendEmail(message: EmailMessage) {
    const email = Array.isArray(message.to) ? message.to[0] : message.to;
    return this.novu.trigger({
      to: { subscriberId: email, email },
      workflowId: this.templateId,
      payload: {
        subject: message.subject,
        body: message.html,
        preheader: message.text,
        from: message.from || this.defaultFrom,
      },
    });
  }
}
```

## EmailService Class

הכיתה `EmailService` עוטפת את הספק שנוצר על ידי המפעל ומספקת שיטות דוא"ל ספציפיות לדומיין. זה כולל בדיקת זמינות כדי שהאפליקציה תוכל לדרדר בחן כאשר האימייל אינו מוגדר:

```ts
export class EmailService {
  private provider: EmailProvider | null = null;
  private isAvailable: boolean = false;

  constructor(config: EmailServiceConfig) {
    const hasApiKey = Object.values(config.apiKeys).some(
      key => key && key.trim() !== ''
    );
    if (hasApiKey) {
      this.provider = EmailProviderFactory.createProvider(config);
      this.isAvailable = true;
    }
  }

  public isServiceAvailable(): boolean {
    return this.isAvailable && this.provider !== null;
  }

  // Domain-specific methods
  async sendVerificationEmail(email: string, token: string): Promise<any>
  async sendPasswordResetEmail(email: string, token: string): Promise<any>
  async sendTwoFactorTokenEmail(email: string, token: string): Promise<any>
  async sendPasswordChangeConfirmationEmail(email: string, ...): Promise<any>
  async sendAccountCreatedEmail(userName: string, email: string, ...): Promise<any>
  async sendNewsletterSubscriptionEmail(email: string): Promise<any>
  async sendNewsletterUnsubscriptionEmail(email: string): Promise<any>
  async sendCustomEmail(message: EmailMessage): Promise<any>
}
```

## ייצוא פונקציות עוזר

המודול מייצא פונקציות ברמה העליונה המטפלות ביצירת שירות וניהול שגיאות באופן אוטומטי. אלו הן הדרך המומלצת לשליחת אימיילים לאורך היישום:

```ts
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTwoFactorTokenEmail,
  sendPasswordChangeConfirmationEmail,
  sendAccountCreatedEmail,
  sendNewsletterSubscriptionEmail,
  sendNewsletterUnsubscriptionEmail,
} from '@/lib/mail';

// Each function handles service unavailability gracefully
const result = await sendVerificationEmail('user@example.com', verificationToken);

// Returns either the provider result or a skipped result
if ('skipped' in result) {
  console.log(result.reason); // "Email service not configured"
}
```

העטיפה `tryEmailOperation` תופסת שגיאות זמינות ומחזירה תוצאה מובנית במקום לזרוק:

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## תצורה

תצורת השירות מורכבת מתצורת התוכן ומשתני הסביבה של האפליקציה:

```ts
export interface EmailServiceConfig {
  provider: string;         // "resend" | "novu"
  defaultFrom: string;      // e.g., "info@ever.works"
  apiKeys: Record<string, string>;
  domain: string;           // App URL for link generation
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}
```

מקורות תצורה (בסדר עדיפות):

1. **תצורת תוכן** (`config.mail.provider`, `config.mail.default_from`) - מה-CMS מבוסס Git
2. **משתני סביבה** (`EMAIL_PROVIDER`, `EMAIL_FROM`) - משירות התצורה
3. **ברירות מחדל** - שלח שוב ספק, `info@ever.works`

## תבניות דואר אלקטרוני

כל התבניות מיוצאות מ-`lib/mail/templates/index.ts`:

|תבנית|פונקציה|מטרה|
|----------|----------|---------|
|חשבון נוצר|`getAccountCreatedTemplate`|דוא"ל ברוכים הבאים לאחר ההרשמה|
|אימות דוא"ל|`getEmailVerificationTemplate`|דוא"ל קישור אימות|
|שינוי סיסמה|`getPasswordChangeConfirmationTemplate`|מאשר שהסיסמה שונתה|
|הצלחה בתשלום|`getPaymentSuccessTemplate`|קבלה על תשלום|
|התשלום נכשל|`getPaymentFailedTemplate`|הודעת כשל בתשלום|
|אירועי מנוי|`getNewSubscriptionTemplate`, `getUpdatedSubscriptionTemplate`, `getCancelledSubscriptionTemplate`|מחזור חיים של מנוי|
|תזכורת לחידוש|`getRenewalReminderTemplate`|הודעת חידוש קרובה|
|ניוזלטר ברוך הבא|`getWelcomeEmailTemplate`|אישור הרשמה לניוזלטר|
|ביטול הרשמה לניוזלטר|`getUnsubscribeEmailTemplate`|אישור ביטול הרשמה|
|ניוזלטר רגיל|`getRegularNewsletterTemplate`|שליחת תוכן ניוזלטר|

## משתני סביבה

|משתנה|חובה|תיאור|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|לא|שם הספק: `resend` או `novu` (ברירת מחדל: `resend`)|
|`EMAIL_FROM`|לא|כתובת השולח המוגדרת כברירת מחדל|
|`RESEND_API_KEY`|לשליחה חוזרת|שלח מחדש מפתח API|
|`NOVU_API_KEY`|עבור נובו|מפתח API של Novu|
|`NOVU_TEMPLATE_ID`|לא|מזהה זרימת עבודה של Novu (ברירת מחדל: `email-default`)|
|`NOVU_BACKEND_URL`|לא|כתובת אתר קצה מותאמת אישית של Novu|

## קבצים קשורים

- `lib/mail/factory.ts` - מפעל הספק
- `lib/mail/index.ts` - EmailService ופונקציות מיוצאות
- `lib/mail/templates/` - כל מחוללי תבניות הדוא"ל
- `lib/newsletter/` - כלי עזר ספציפיים לניוזלטר
