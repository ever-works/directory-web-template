---
id: newsletter
title: Система информационных бюллетеней
sidebar_label: Информационный бюллетень
sidebar_position: 5
---

# Система информационных бюллетеней

Шаблон Ever Works включает систему подписки на новостную рассылку с интеграцией электронной почты, несколькими источниками подписки и статистикой администратора.

## Конфигурация

Система новостной рассылки, расположенная по адресу `lib/newsletter/config.ts` , обеспечивает централизованную настройку:

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

### Настройка поставщика электронной почты

Информационная рассылка использует того же поставщика электронной почты, что и система уведомлений:

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

Конфигурация разрешается из конфигурации сайта с откатами к переменным среды:

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## Управление подпиской

### Проверка

Адреса электронной почты проверяются и нормализуются с использованием схем Zod:

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

Во время проверки электронные письма автоматически преобразуются в нижний регистр и обрезаются.

### Источники подписки

В каждой подписке указывается, где зарегистрировался пользователь:

| Источник | Местоположение | Описание |
|--------|----------|-------------|
| `footer` | Нижний колонтитул сайта | Всегда видимая форма подписки |
| `popup` | Модальное/всплывающее окно | Запрос на подписку |
| `signup` | Регистрация | Согласие при создании учетной записи |

### Статистика

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## Конечные точки API

| Метод | Конечная точка | Описание |
|--------|----------|-------------|
| ПОСТ | `/api/newsletter` | Подписаться на рассылку новостей |
| УДАЛИТЬ | `/api/newsletter` | Отписаться от новостной рассылки |
| ПОЛУЧИТЬ | `/api/newsletter/stats` | Получить статистику подписок (админ) |

## Сообщения об ошибках

Система выдает последовательные, понятные пользователю сообщения об ошибках:

| Код | Сообщение |
|------|---------|
| `INVALID_EMAIL` | Пожалуйста, введите действительный адрес электронной почты |
| `ALREADY_SUBSCRIBED` | Электронная почта уже подписана на рассылку новостей |
| `NOT_SUBSCRIBED` | Электронная почта не подписана на рассылку новостей |
| `SUBSCRIPTION_FAILED` | Не удалось создать подписку. Пожалуйста, попробуйте еще раз. |

## Служебные функции

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
