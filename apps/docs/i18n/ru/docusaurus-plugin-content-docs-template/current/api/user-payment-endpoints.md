---
id: user-payment-endpoints
title: "Справочник по API платежей пользователей"
sidebar_label: "Платежи пользователей"
sidebar_position: 55
---

# Справочник по API платежей пользователей

## Обзор

Конечные точки пользовательских платежей управляют настройками валюты, историей платежей, статусом плана и сведениями о подписке для прошедших проверку подлинности пользователей. При обнаружении валюты используются заголовки CDN/прокси (Cloudflare, Vercel, CloudFront, Fastly) для автоматического определения валюты пользователя. Данные об оплате и подписке получены из Stripe.

## Конечные точки

### ПОЛУЧИТЬ /api/пользователь/валюту

Обнаруживает и возвращает предпочтения пользователя в отношении валюты на основе заголовков HTTP от поставщиков CDN/прокси. Всегда возвращает `200 OK` с постепенной деградацией — возвращается к доллару США, если обнаружение не удалось.

**Запрос**

|Параметр|Тип|В|Описание|
|-----------|--------|-------|-------------|
|поставщик|строка|запрос|Поставщик обнаружения: `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` (по умолчанию: `"smart"`)|

**Ответ**
```typescript
{
  currency: string;     // ISO 4217 code, e.g. "USD", "EUR", "GBP"
  country: string | null; // ISO 3166-1 alpha-2, e.g. "US", "FR", or null if detection failed
  detected: boolean;    // true if detected from headers, false if using fallback
}
```

**Пример**
```typescript
const response = await fetch('/api/user/currency?provider=smart');
const { currency, country, detected } = await response.json();
// { currency: "EUR", country: "FR", detected: true }
```

### PUT /api/пользователь/валюта

Обновляет настройки валюты и страны аутентифицированного пользователя. Требуется действительный сеанс.

**Запрос**
```typescript
{
  currency: string;       // ISO 4217 code, exactly 3 characters, required
  country?: string | null; // ISO 3166-1 alpha-2, exactly 2 characters, optional
}
```

**Ответ**
```typescript
{
  currency: string;       // Updated currency code
  country: string | null; // Updated country code or null
}
```

**Пример**
```typescript
const response = await fetch('/api/user/currency', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency: 'EUR', country: 'FR' })
});
const data = await response.json();
```

### ПОЛУЧИТЕ /api/пользователь/платежи

Получает полную историю платежей для аутентифицированного пользователя из Stripe. Возвращает счета с подробностями плана, интервалами выставления счетов и ссылками на счета, отсортированные по дате (сначала самые новые).

**Запрос**

Никаких параметров не требуется. Аутентификация через сеансовый cookie.

**Ответ**
```typescript
Array<{
  id: string;                // Stripe invoice ID
  date: string;              // ISO 8601 date
  amount: number;            // In major currency units (e.g. 29.99)
  currency: string;          // Uppercase currency code
  plan: string;              // Plan display name
  planId: string;            // Plan identifier
  status: "Paid" | "Pending" | "Draft" | "Unknown";
  billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  paymentProvider: "stripe";
  subscriptionId: string;    // Associated subscription ID
  description: string;       // e.g. "Premium Plan - monthly billing"
  invoiceUrl: string | null; // Hosted invoice URL
  invoicePdf: string | null; // Invoice PDF download URL
  invoiceNumber: string | null;
  period_end: string | null;   // Billing period end (ISO 8601)
  period_start: string | null; // Billing period start (ISO 8601)
}>
```

**Пример**
```typescript
const response = await fetch('/api/user/payments');
const payments = await response.json();
// payments[0] = { id: "in_123...", amount: 29.99, status: "Paid", ... }
```

### ПОЛУЧИТЬ /api/user/plan-status

Возвращает текущий план пользователя с полной информацией об истечении срока действия, включая действующий план (к чему пользователь фактически имеет доступ), периоды предупреждения и состояние доступа к функциям.

**Запрос**

Никаких параметров не требуется. Аутентификация через сеансовый cookie.

**Ответ**
```typescript
{
  success: true;
  data: {
    planId: "free" | "standard" | "premium";
    effectivePlan: "free" | "standard" | "premium"; // May differ if expired
    isExpired: boolean;
    expiresAt: string | null;          // ISO 8601 date
    daysUntilExpiration: number | null; // Negative if already expired
    isInWarningPeriod: boolean;        // true if expires within 7 days
    canAccessPlanFeatures: boolean;
    warningMessage: string | null;     // User-facing warning text
    status: string | null;             // Raw subscription status
  };
}
```

**Пример**
```typescript
const response = await fetch('/api/user/plan-status');
const { data } = await response.json();

if (data.isInWarningPeriod) {
  showWarning(data.warningMessage);
}

if (!data.canAccessPlanFeatures) {
  redirectToUpgrade();
}
```

### ПОЛУЧИТЬ /api/пользователь/подписку

Получает полную информацию о подписке, включая сведения о текущей активной подписке и полную историю подписок из Stripe.

**Запрос**

Никаких параметров не требуется. Аутентификация через сеансовый cookie.

**Ответ**
```typescript
{
  hasActiveSubscription: boolean;
  message?: string;                    // Only when no Stripe customer found
  currentSubscription?: {
    id: string;                        // Stripe subscription ID
    planId: string;                    // Stripe price ID
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
    startDate: string;                 // ISO 8601
    endDate: string;
    nextBillingDate: string;
    paymentProvider: "stripe";
    subscriptionId: string;
    amount: number;                    // Major currency units
    currency: string;                  // Uppercase
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
    currentPeriodEnd: string;
    currentPeriodStart: string;
  };
  subscriptionHistory: Array<{
    id: string;
    planId: string;
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
    startDate: string;
    endDate: string;
    cancelledAt?: string;
    cancelReason?: string;
    amount: number;
    currency: string;
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  }>;
}
```

**Пример**
```typescript
const response = await fetch('/api/user/subscription');
const { hasActiveSubscription, currentSubscription } = await response.json();

if (hasActiveSubscription && currentSubscription) {
  console.log(`Plan: ${currentSubscription.planName}, Status: ${currentSubscription.status}`);
}
```

## Аутентификация

- **GET /api/user/currency**: общедоступный (авторизация не требуется) — определяет валюту по заголовкам.
- **PUT /api/user/currency**: требуется сеанс с аутентификацией.
- **GET /api/user/pays**: требуется сеанс с аутентификацией.
- **GET /api/user/plan-status**: требуется сеанс с аутентификацией.
- **GET /api/user/subscription**: требуется сеанс с аутентификацией.

## Реакции на ошибки

|Статус|Описание|
|--------|-------------|
| 400 |Неверный код валюты, неверный формат кода страны или неправильный формат полезных данных JSON.|
| 401 |Неавторизованный – нет аутентифицированного сеанса|
| 500 |Внутренняя ошибка сервера – сбой API Stripe или ошибка базы данных.|

## Ограничение скорости

Нет явного ограничения скорости. Конечная точка обнаружения валюты всегда возвращает `200 OK` для постепенного снижения производительности. Данные об оплате и подписке извлекаются непосредственно из Stripe с ограничением в 100 записей на запрос.

## Связанные конечные точки

- [Конечные точки функции конфигурации](./config-feature-endpoints) — проверка доступности функции в соответствии с планом.
