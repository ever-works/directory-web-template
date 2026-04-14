---
id: mail-factory
title: مصنع البريد
sidebar_label: مصنع البريد
sidebar_position: 33
---

# مصنع البريد

يستخدم القالب نمط المصنع لتسليم البريد الإلكتروني، ويدعم مقدمي خدمات متعددين (Resend، Novu) مع رجوع تلقائي إلى موفر وهمي أثناء التطوير أو عند فقدان بيانات الاعتماد.

## هيكل الملف

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

## واجهة المزود

يقوم كل مزود بريد إلكتروني بتنفيذ واجهة `EmailProvider`:

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

## نمط المصنع (`factory.ts`)

يحدد `EmailProviderFactory` الموفر المناسب بناءً على التكوين. إذا كان مفتاح API الخاص بالموفر المحدد مفقودًا أو فارغًا، فسيتم الرجوع إلى الموفر الوهمي:

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

## تطبيقات الموفر

### MockEmailProvider

يسجل رسائل البريد الإلكتروني إلى وحدة التحكم. يُستخدم أثناء التطوير أو عندما لا يتم تكوين أي مفاتيح API:

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

يرسل رسائل البريد الإلكتروني عبر Resend API:

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

يرسل رسائل البريد الإلكتروني من خلال البنية التحتية لإشعارات Novu باستخدام مشغلات سير العمل:

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

## فئة خدمة البريد الإلكتروني

تتضمن فئة `EmailService` الموفر الذي تم إنشاؤه في المصنع وتوفر طرق بريد إلكتروني خاصة بالمجال. يتضمن التحقق من التوفر حتى يمكن أن يتدهور التطبيق بأمان عندما لا يتم تكوين البريد الإلكتروني:

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

## وظائف المساعد المصدرة

تقوم الوحدة بتصدير وظائف المستوى الأعلى التي تتعامل مع إنشاء الخدمة وإدارة الأخطاء تلقائيًا. هذه هي الطريقة الموصى بها لإرسال رسائل البريد الإلكتروني عبر التطبيق:

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

يلتقط المجمع `tryEmailOperation` أخطاء التوفر ويعيد نتيجة منظمة بدلاً من الرمي:

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## التكوين

يتم تجميع تكوين الخدمة من تكوين محتوى التطبيق ومتغيرات البيئة:

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

مصادر التكوين (حسب الأولوية):

1. **تكوين المحتوى** (`config.mail.provider`، `config.mail.default_from`) - من نظام إدارة المحتوى المستند إلى Git
2. **متغيرات البيئة** (`EMAIL_PROVIDER`، `EMAIL_FROM`) - من خدمة التكوين
3. **الإعدادات الاحتياطية الافتراضية** - موفر إعادة الإرسال، `info@ever.works`

## قوالب البريد الإلكتروني

يتم تصدير جميع القوالب من `lib/mail/templates/index.ts`:

|القالب|وظيفة|الغرض|
|----------|----------|---------|
|تم إنشاء الحساب|`getAccountCreatedTemplate`|ترحيب البريد الإلكتروني بعد التسجيل|
|التحقق من البريد الإلكتروني|`getEmailVerificationTemplate`|رابط التحقق من البريد الإلكتروني|
|تغيير كلمة المرور|`getPasswordChangeConfirmationTemplate`|يؤكد تم تغيير كلمة المرور|
|نجاح الدفع|`getPaymentSuccessTemplate`|إيصال الدفع|
|فشل الدفع|`getPaymentFailedTemplate`|إشعار فشل الدفع|
|أحداث الاشتراك|`getNewSubscriptionTemplate`، `getUpdatedSubscriptionTemplate`، `getCancelledSubscriptionTemplate`|دورة حياة الاشتراك|
|تذكير بالتجديد|`getRenewalReminderTemplate`|إشعار التجديد القادم|
|النشرة الإخبارية مرحبا بكم|`getWelcomeEmailTemplate`|تأكيد الاشتراك في النشرة الإخبارية|
|إلغاء الاشتراك في النشرة الإخبارية|`getUnsubscribeEmailTemplate`|تأكيد إلغاء الاشتراك|
|النشرة الإخبارية العادية|`getRegularNewsletterTemplate`|إرسال محتوى النشرة الإخبارية|

## متغيرات البيئة

|متغير|مطلوب|الوصف|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|لا|اسم الموفر: `resend` أو `novu` (الافتراضي: `resend`)|
|`EMAIL_FROM`|لا|عنوان المرسل الافتراضي|
|`RESEND_API_KEY`|لإعادة الإرسال|إعادة إرسال مفتاح API|
|`NOVU_API_KEY`|لنوفو|مفتاح نوفو API|
|`NOVU_TEMPLATE_ID`|لا|معرف سير عمل Novu (الافتراضي: `email-default`)|
|`NOVU_BACKEND_URL`|لا|عنوان URL الخلفي المخصص لـ Novu|

## الملفات ذات الصلة

- `lib/mail/factory.ts` - مصنع الموفر
- `lib/mail/index.ts` - خدمة البريد الإلكتروني والوظائف المصدرة
- `lib/mail/templates/` - جميع مولدات قوالب البريد الإلكتروني
- `lib/newsletter/` - أدوات مساعدة للبريد الإلكتروني خاصة بالرسائل الإخبارية
