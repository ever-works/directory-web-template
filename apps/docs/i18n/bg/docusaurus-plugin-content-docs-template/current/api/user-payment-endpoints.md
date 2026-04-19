---
id: user-payment-endpoints
title: "Справка за API за потребителски плащания"
sidebar_label: "Потребителски плащания"
sidebar_position: 55
---

# Справка за API за потребителски плащания

## Преглед

Крайните точки за потребителско плащане управляват валутните предпочитания, хронологията на плащанията, състоянието на плана и подробностите за абонамента за удостоверени потребители. Откриването на валута използва CDN/прокси хедъри (Cloudflare, Vercel, CloudFront, Fastly), за да определи автоматично валутата на потребителя. Данните за плащане и абонамент се извличат от Stripe.

## Крайни точки

### ВЗЕМЕТЕ /api/потребител/валута

Открива и връща валутните предпочитания на потребителя въз основа на HTTP заглавки от CDN/прокси доставчици. Винаги връща `200 OK` с елегантна деградация -- връща се обратно към USD, ако откриването е неуспешно.

**Заявка**

|Параметър|Тип|в|Описание|
|-----------|--------|-------|-------------|
|доставчик|низ|заявка|Доставчик на откриване: `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` (по подразбиране: `"smart"`)|

**Отговор**
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

### PUT /api/потребител/валута

Актуализира предпочитанията за валута и държава на удостоверения потребител. Изисква валидна сесия.

**Заявка**
```typescript
{
  currency: string;       // ISO 4217 code, exactly 3 characters, required
  country?: string | null; // ISO 3166-1 alpha-2, exactly 2 characters, optional
}
```

**Отговор**
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

### ВЗЕМЕТЕ /api/user/payments

Извлича изчерпателна история на плащанията за удостоверения потребител от Stripe. Връща фактури с подробности за плана, интервали на фактуриране и връзки към фактури, сортирани по дата (първо най-новите).

**Заявка**

Не са необходими параметри. Удостоверяване чрез сесийна бисквитка.

**Отговор**
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

### GET /api/user/plan-status

Връща текущия план на потребителя с пълни подробности за изтичане, включително ефективен план (до какво потребителят действително има достъп), периоди на предупреждение и състояние на достъп до функцията.

**Заявка**

Не са необходими параметри. Удостоверяване чрез сесийна бисквитка.

**Отговор**
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

### ВЗЕМЕТЕ /api/user/subscription

Извлича изчерпателна информация за абонамента, включително подробности за текущия активен абонамент и пълна хронология на абонамента от Stripe.

**Заявка**

Не са необходими параметри. Удостоверяване чрез сесийна бисквитка.

**Отговор**
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

## Удостоверяване

- **GET /api/user/currency**: Публично (не се изисква удостоверяване) -- открива валута от заглавки.
- **PUT /api/user/currency**: Изисква удостоверена сесия.
- **GET /api/user/payments**: Изисква удостоверена сесия.
- **GET /api/user/plan-status**: Изисква удостоверена сесия.
- **GET /api/user/subscription**: Изисква удостоверена сесия.

## Отговори за грешки

|Статус|Описание|
|--------|-------------|
| 400 |Невалиден код на валута, невалиден формат на кода на държавата или неправилно форматиран JSON полезен файл|
| 401 |Неоторизиран -- няма удостоверена сесия|
| 500 |Вътрешна грешка на сървъра -- неуспех на Stripe API или грешка в базата данни|

## Ограничаване на скоростта

Няма изрично ограничаване на скоростта. Крайната точка за откриване на валута винаги връща `200 OK` за грациозна деградация. Данните за плащане и абонамент се извличат директно от Stripe с ограничение от 100 записа на заявка.

## Свързани крайни точки

- [Конфигуриране на крайни точки на функции](./config-feature-endpoints) -- Проверете наличността на функции въз основа на план
