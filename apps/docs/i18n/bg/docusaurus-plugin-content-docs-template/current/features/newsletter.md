---
id: newsletter
title: Система за бюлетин
sidebar_label: Бюлетин
sidebar_position: 5
---

# Система за бюлетин

Шаблонът Ever Works включва система за абонамент за бюлетин с интеграция на имейл, множество източници на абонамент и статистика на администратора.

## Конфигурация

Разположена на `lib/newsletter/config.ts` , системата за бюлетин осигурява централизирана конфигурация:

```typescript
const NEWSLETTER_CONFIG = {
  DEFAULT_PROVIDER: "resend",
  DEFAULT_FROM: "onboarding@resend.dev",
  DEFAULT_COMPANY_NAME: "Ever Works",

  SOURCES: {
    FOOTER: "footer",       // Footer subscription form
    POPUP: "popup",         // Popup/modal subscription
    SIGNUP: "signup",       // Account registration
  },
};
```

### Настройка на имейл доставчик

Бюлетинът използва същия имейл доставчик като системата за уведомяване:

```typescript
interface EmailConfig {
  provider: string;        // "resend" or "novu"
  defaultFrom: string;     // Sender email address
  domain: string;          // App domain
  apiKeys: {
    resend: string;        // RESEND_API_KEY
    novu: string;          // NOVU_API_KEY
  };
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}
```

Конфигурацията се разрешава от конфигурацията на сайта с резервни варианти към променливи на средата:

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## Управление на абонаменти

### Валидиране

Имейл адресите се валидират и нормализират с помощта на Zod схеми:

```typescript
import { emailSchema, newsletterSubscriptionSchema } from '@/lib/newsletter/config';

// Simple email validation
const result = emailSchema.parse({ email: "user@example.com" });

// Full subscription validation (includes source)
const subscription = newsletterSubscriptionSchema.parse({
  email: "user@example.com",
  source: "footer",
});
```

Имейлите автоматично се изписват с малки букви и се изрязват по време на проверката.

### Източници на абонамент

Всеки абонамент записва къде потребителят се е регистрирал:

| Източник | Местоположение | Описание |
|--------|----------|-------------|
| `footer` | Долен колонтитул на сайта | Винаги видим формуляр за абонамент |
| `popup` | Модален/изскачащ | Задействана подкана за абонамент |
| `signup` | Регистрация | Включване по време на създаване на акаунт |

### Статистика

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## API крайни точки

| Метод | Крайна точка | Описание |
|--------|----------|-------------|
| ПУБЛИКАЦИЯ | `/api/newsletter` | Абонирайте се за бюлетин |
| ИЗТРИВАНЕ | `/api/newsletter` | Отписване от бюлетин |
| ВЗЕМЕТЕ | `/api/newsletter/stats` | Вземете статистически данни за абонамента (admin) |

## Съобщения за грешка

Системата предоставя последователни, удобни за потребителя съобщения за грешки:

| Код | Съобщение |
|------|---------|
| `INVALID_EMAIL` | Моля, въведете валиден имейл адрес |
| `ALREADY_SUBSCRIBED` | Имейлът вече е абониран за бюлетина |
| `NOT_SUBSCRIBED` | Имейлът не е абониран за бюлетина |
| `SUBSCRIPTION_FAILED` | Неуспешно създаване на абонамент. Моля, опитайте отново. |

## Помощни функции

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
