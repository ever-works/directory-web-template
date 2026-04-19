---
id: newsletter-library
title: Библиотека информационных бюллетеней
sidebar_label: Библиотека информационных бюллетеней
sidebar_position: 35
---

# Библиотека информационных бюллетеней

Библиотека информационных бюллетеней предоставляет функции настройки, проверки и служебные функции для управления подписками на информационные бюллетени по электронной почте. Он создан на базе [Mail Factory](./mail-factory.md) для доставки электронной почты.

## Структура файла

```
lib/newsletter/
  config.ts     # Configuration, types, Zod schemas, email config creation
  utils.ts      # Email sending, subscription validation, logging, templates
```

## Конфигурация (`config.ts`)

### Константы информационного бюллетеня

Объект `NEWSLETTER_CONFIG` централизует все константы, связанные с информационным бюллетенем:

```ts
export const NEWSLETTER_CONFIG = {
  DEFAULT_PROVIDER: "resend",
  DEFAULT_FROM: "onboarding@resend.dev",
  DEFAULT_COMPANY_NAME: "Ever Works",

  SOURCES: {
    FOOTER: "footer",
    POPUP: "popup",
    SIGNUP: "signup",
  } as const,

  ERRORS: {
    INVALID_EMAIL: "Please enter a valid email address",
    ALREADY_SUBSCRIBED: "Email is already subscribed to the newsletter",
    NOT_SUBSCRIBED: "Email is not subscribed to the newsletter",
    SUBSCRIPTION_FAILED: "Failed to create subscription. Please try again.",
    UNSUBSCRIPTION_FAILED: "Failed to unsubscribe. Please try again.",
    EMAIL_SEND_FAILED: "Failed to send email. Please try again.",
    STATS_FAILED: "Failed to get newsletter statistics",
  } as const,

  SUCCESS: {
    SUBSCRIBED: "Successfully subscribed to newsletter",
    UNSUBSCRIBED: "Successfully unsubscribed from newsletter",
  } as const,
} as const;
```

### Типы

```ts
// Source of the subscription action
type NewsletterSource = "footer" | "popup" | "signup";

// Email provider configuration
interface EmailConfig {
  provider: string;
  defaultFrom: string;
  domain: string;
  apiKeys: { resend: string; novu: string };
  novu?: { templateId?: string; backendUrl?: string };
}

// Action result for subscribe/unsubscribe operations
interface NewsletterActionResult {
  success?: boolean;
  error?: string;
  email?: string;
}

// Newsletter statistics
interface NewsletterStats {
  totalActive: number;
  recentSubscriptions: number;
}
```

### Схемы проверки

Две схемы Zod обрабатывают проверку электронной почты для операций информационного бюллетеня:

```ts
import { z } from "zod";

// Basic email validation
export const emailSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
});

// Full subscription schema with source tracking
export const newsletterSubscriptionSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
  source: z
    .enum(["footer", "popup", "signup"])
    .default("footer"),
});
```

### Создание конфигурации

```ts
import { createEmailConfig, getCompanyName } from '@/lib/newsletter/config';

// Build email config from app settings and environment
const config = await createEmailConfig();
// => { provider: "resend", defaultFrom: "...", domain: "...", apiKeys: {...} }

// Get company name with fallback
const name = await getCompanyName();
// => "Ever Works" or value from content config
```

## Утилиты (`utils.ts`)

### Безопасная отправка электронных писем

Функция `sendEmailSafely` оборачивает отправку электронной почты комплексной обработкой ошибок:

```ts
import { sendEmailSafely, createEmailService } from '@/lib/newsletter/utils';

const { service, config } = await createEmailService();

const result = await sendEmailSafely(
  service,
  config,
  { subject: "Welcome!", html: "<p>Hi</p>", text: "Hi" },
  "user@example.com",
  "welcome"
);

if (result.success) {
  // Email sent
} else {
  console.log(result.error);
}
```

### Проверка подписки

Проверьте, можно ли подписаться на электронное письмо или отписаться:

```ts
import { canSubscribe, canUnsubscribe } from '@/lib/newsletter/utils';

// Check if email is not already active
const subCheck = await canSubscribe("user@example.com");
if (!subCheck.canSubscribe) {
  console.log(subCheck.error); // "Email is already subscribed..."
}

// Check if email is currently active
const unsubCheck = await canUnsubscribe("user@example.com");
if (!unsubCheck.canUnsubscribe) {
  console.log(unsubCheck.error); // "Email is not subscribed..."
}
```

Базовая функция `validateSubscriptionStatus` запрашивает базу данных:

```ts
const validation = await validateSubscriptionStatus(email, shouldBeActive);
// => { isValid: boolean, error?: string, subscription?: any }
```

### Ведение журнала и мониторинг

```ts
import { logNewsletterActivity, trackNewsletterMetric } from '@/lib/newsletter/utils';

// Log activity for monitoring
logNewsletterActivity("subscribe", "user@example.com", "footer");
// Output: Newsletter Activity: { timestamp, action, email, source }

// Track metrics (wraps logNewsletterActivity)
trackNewsletterMetric("subscription", "user@example.com", "popup");
```

### Утилиты шаблонов

```ts
import { getTemplateWithCompany } from '@/lib/newsletter/utils';

// Automatically injects the company name into a template function
const template = await getTemplateWithCompany(
  (email, companyName) => ({
    subject: `Welcome to ${companyName}`,
    html: `<p>Thanks for subscribing, ${email}!</p>`,
    text: `Thanks for subscribing, ${email}!`,
  }),
  "user@example.com"
);
```

### Стандартизированные ответы

```ts
import { createErrorResponse, createSuccessResponse } from '@/lib/newsletter/utils';

const error = createErrorResponse("Invalid email", "bad@", "subscribe");
// => { error: "Invalid email", email: "bad@", context: "subscribe" }

const success = createSuccessResponse("user@example.com", "subscribe");
// => { success: true, email: "user@example.com", context: "subscribe" }
```

## Процесс интеграции

Типичная схема подписки на рассылку:

1. **Подтвердите ввод**, используя `newsletterSubscriptionSchema`
2. **Проверьте соответствие** с помощью `canSubscribe`
3. **Создать запись в базе данных** через хранилище информационных бюллетеней.
4. **Отправьте приветственное письмо**, используя `sendEmailSafely`
5. **Записывайте действия** с помощью `logNewsletterActivity`
6. **Верните результат**, используя `createSuccessResponse` или `createErrorResponse`

```ts
// Simplified server action example
async function subscribeToNewsletter(formData: FormData) {
  const parsed = newsletterSubscriptionSchema.safeParse({
    email: formData.get('email'),
    source: formData.get('source'),
  });
  if (!parsed.success) {
    return createErrorResponse(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL);
  }

  const { email, source } = parsed.data;
  const eligibility = await canSubscribe(email);
  if (!eligibility.canSubscribe) {
    return createErrorResponse(eligibility.error || "Cannot subscribe");
  }

  // Create subscription in database...
  // Send welcome email...

  logNewsletterActivity("subscribe", email, source);
  return createSuccessResponse(email, "subscribe");
}
```

## Связанные файлы

- `lib/newsletter/config.ts` — Конфигурация, типы и схемы проверки.
- `lib/newsletter/utils.ts` — утилиты электронной почты, проверки, ведения журнала и шаблонов.
- `lib/mail/` - Фабрика и сервис провайдера электронной почты
- `lib/mail/templates/newsletter-*.ts` - Шаблоны электронных рассылок
- `lib/db/queries.ts` - Запросы к базе данных для записей о подписке.
