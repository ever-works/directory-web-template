---
id: mail-factory
title: Пощенска фабрика
sidebar_label: Пощенска фабрика
sidebar_position: 33
---

# Пощенска фабрика

Шаблонът използва фабричен модел за доставка на имейли, като поддържа множество доставчици (Повторно изпращане, Novu) с автоматично връщане към фалшив доставчик по време на разработка или когато липсват идентификационни данни.

## Файлова структура

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

## Интерфейс на доставчика

Всеки доставчик на имейл прилага интерфейса `EmailProvider`:

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

## Фабричен модел (`factory.ts`)

`EmailProviderFactory` избира подходящия доставчик въз основа на конфигурацията. Ако API ключът на посочения доставчик липсва или е празен, той се връща към макетния доставчик:

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

## Реализации на доставчика

### MockEmailProvider

Регистрира имейли в конзолата. Използва се по време на разработка или когато не са конфигурирани API ключове:

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

Изпраща имейли чрез API за повторно изпращане:

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

Изпраща имейли през инфраструктурата за уведомяване на Novu, използвайки задействания на работния процес:

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

## Клас EmailService

Класът `EmailService` обвива фабрично създадения доставчик и предоставя специфични за домейна методи за имейл. Включва проверка за наличност, така че приложението да може елегантно да се деградира, когато имейлът не е конфигуриран:

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

## Експортирани помощни функции

Модулът експортира функции от най-високо ниво, които управляват автоматично създаването на услуга и управлението на грешки. Това са препоръчителните начини за изпращане на имейли в цялото приложение:

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

Обвивката `tryEmailOperation` улавя грешки в наличността и връща структуриран резултат, вместо да хвърля:

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## Конфигурация

Конфигурацията на услугата се сглобява от конфигурацията на съдържанието на приложението и променливите на средата:

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

Източници на конфигурация (по приоритетен ред):

1. **Конфигурация на съдържание** (`config.mail.provider`, `config.mail.default_from`) - от базираната на Git CMS
2. **Променливи на средата** (`EMAIL_PROVIDER`, `EMAIL_FROM`) - от услугата за конфигурация
3. **Резервни настройки по подразбиране** - Повторно изпращане на доставчик, `info@ever.works`

## Шаблони за имейли

Всички шаблони се експортират от `lib/mail/templates/index.ts`:

|Шаблон|функция|Цел|
|----------|----------|---------|
|Акаунтът е създаден|`getAccountCreatedTemplate`|Добре дошъл имейл след регистрация|
|Проверка на имейл|`getEmailVerificationTemplate`|Имейл с връзка за потвърждение|
|Промяна на парола|`getPasswordChangeConfirmationTemplate`|Потвърждава промяната на паролата|
|Успешно плащане|`getPaymentSuccessTemplate`|Разписка за плащане|
|Неуспешно плащане|`getPaymentFailedTemplate`|Известие за неуспешно плащане|
|Абонаментни събития|`getNewSubscriptionTemplate`, `getUpdatedSubscriptionTemplate`, `getCancelledSubscriptionTemplate`|Жизнен цикъл на абонамента|
|Напомняне за подновяване|`getRenewalReminderTemplate`|Известие за предстоящо подновяване|
|Бюлетин Добре дошли|`getWelcomeEmailTemplate`|Потвърждение за регистрация за бюлетин|
|Отписване от бюлетин|`getUnsubscribeEmailTemplate`|Потвърждение за отписване|
|Редовен бюлетин|`getRegularNewsletterTemplate`|Изпращане на съдържание на бюлетин|

## Променливи на средата

|Променлива|Задължително|Описание|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|не|Име на доставчик: `resend` или `novu` (по подразбиране: `resend`)|
|`EMAIL_FROM`|не|Адрес на изпращача по подразбиране|
|`RESEND_API_KEY`|За повторно изпращане|Повторно изпращане на API ключ|
|`NOVU_API_KEY`|За Нова|Novu API ключ|
|`NOVU_TEMPLATE_ID`|не|ID на работния процес на Novu (по подразбиране: `email-default`)|
|`NOVU_BACKEND_URL`|не|Персонализиран URL адрес на бекенда на Novu|

## Свързани файлове

- `lib/mail/factory.ts` - Фабрика на доставчика
- `lib/mail/index.ts` - EmailService и експортирани функции
- `lib/mail/templates/` - Всички генератори на имейл шаблони
- `lib/newsletter/` - Помощни програми за електронна поща, специфични за бюлетин
