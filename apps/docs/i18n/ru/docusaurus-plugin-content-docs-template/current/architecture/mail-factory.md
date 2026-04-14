---
id: mail-factory
title: Почтовая фабрика
sidebar_label: Почтовая фабрика
sidebar_position: 33
---

# Почтовая фабрика

В шаблоне используется фабричный шаблон для доставки электронной почты, поддерживающий несколько поставщиков (Resend, Novu) с автоматическим возвратом к фиктивному поставщику во время разработки или при отсутствии учетных данных.

## Структура файла

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

## Интерфейс провайдера

Каждый провайдер электронной почты реализует интерфейс `EmailProvider`:

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

## Заводской образец (`factory.ts`)

`EmailProviderFactory` выбирает подходящего провайдера на основе конфигурации. Если ключ API указанного поставщика отсутствует или пуст, он возвращается к фиктивному поставщику:

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

## Реализации поставщика

### MockEmailProvider

Записывает электронную почту на консоль. Используется во время разработки или когда ключи API не настроены:

```ts
export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log("Sending email:", message);
    return Promise.resolve();
  }
  getName(): string { return "mock"; }
}
```

### Повторный поставщик

Отправляет электронные письма через API повторной отправки:

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

### НовуПровайдер

Отправляет электронные письма через инфраструктуру уведомлений Novu, используя триггеры рабочего процесса:

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

## Класс электронной почты

Класс `EmailService` оборачивает созданного на заводе поставщика и предоставляет методы электронной почты, специфичные для домена. Он включает проверку доступности, поэтому приложение может плавно ухудшать свою работу, если электронная почта не настроена:

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

## Экспортированные вспомогательные функции

Модуль экспортирует функции верхнего уровня, которые автоматически обрабатывают создание сервисов и управление ошибками. Рекомендуемый способ отправки электронных писем через приложение:

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

Оболочка `tryEmailOperation` перехватывает ошибки доступности и возвращает структурированный результат вместо выдачи:

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## Конфигурация

Конфигурация службы собирается из конфигурации контента приложения и переменных среды:

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

Источники конфигурации (в порядке приоритета):

1. **Конфигурация контента** (`config.mail.provider`, `config.mail.default_from`) — из CMS на базе Git.
2. **Переменные среды** (`EMAIL_PROVIDER`, `EMAIL_FROM`) — из службы конфигурации
3. **Резервные значения по умолчанию** – поставщик повторной отправки, `info@ever.works`

## Шаблоны электронной почты

Все шаблоны экспортируются из `lib/mail/templates/index.ts`:

|Шаблон|Функция|Цель|
|----------|----------|---------|
|Аккаунт создан|`getAccountCreatedTemplate`|Приветственное письмо после регистрации|
|Проверка электронной почты|`getEmailVerificationTemplate`|Электронная почта со ссылкой для подтверждения|
|Изменение пароля|`getPasswordChangeConfirmationTemplate`|Подтверждает изменение пароля|
|Успешный платеж|`getPaymentSuccessTemplate`|Квитанция об оплате|
|Платеж не выполнен|`getPaymentFailedTemplate`|Уведомление об отказе в оплате|
|События подписки|`getNewSubscriptionTemplate`, `getUpdatedSubscriptionTemplate`, `getCancelledSubscriptionTemplate`|Жизненный цикл подписки|
|Напоминание о продлении|`getRenewalReminderTemplate`|Уведомление о предстоящем продлении|
|Информационный бюллетень|`getWelcomeEmailTemplate`|Подтверждение подписки на рассылку|
|Отписаться от новостной рассылки|`getUnsubscribeEmailTemplate`|Подтверждение отмены подписки|
|Регулярный информационный бюллетень|`getRegularNewsletterTemplate`|Рассылка контента рассылки|

## Переменные среды

|Переменная|Требуется|Описание|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|Нет|Имя провайдера: `resend` или `novu` (по умолчанию: `resend`)|
|`EMAIL_FROM`|Нет|Адрес отправителя по умолчанию|
|`RESEND_API_KEY`|Для повторной отправки|Повторно отправить ключ API|
|`NOVU_API_KEY`|Для Нову|Нову API-ключ|
|`NOVU_TEMPLATE_ID`|Нет|Идентификатор рабочего процесса Novu (по умолчанию: `email-default`)|
|`NOVU_BACKEND_URL`|Нет|Пользовательский URL-адрес серверной части Novu|

## Связанные файлы

- `lib/mail/factory.ts` - Фабрика провайдера
- `lib/mail/index.ts` - EmailService и экспортированные функции
- `lib/mail/templates/` - Все генераторы шаблонов электронной почты
- `lib/newsletter/` — почтовые утилиты для рассылок
