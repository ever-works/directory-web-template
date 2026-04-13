---
id: stripe-payment-methods-deep-dive
title: Задълбочено потапяне в методите на плащане на Stripe
sidebar_label: Методи на плащане Stripe
sidebar_position: 3
---

# Задълбочено потапяне в методите на плащане на Stripe

Тази страница обхваща списък с начини на плащане, намерения за настройка за запазване на карти, управление на метода по подразбиране и валидиране на карта.

## Преглед

Системата за методи на плащане предоставя две ключови възможности: изброяване на запазени методи на плащане на потребител със състояние по подразбиране и създаване на намерения за настройка, които позволяват на потребителите да запазват нови методи на плащане за бъдеща употреба без незабавно таксуване.

## Таблица с маршрути

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|`GET`|`/api/stripe/payment-methods/list`|Изисква се сесия|Избройте всички методи на плащане за потребителя|
|`POST`|`/api/stripe/setup-intent`|Изисква се сесия|Създайте намерение за настройка за запазване на нов метод на плащане|

## Обявяване на методи на плащане (GET)

### Как работи

Крайната точка на списъка изпълнява следните стъпки:

1. Удостоверява потребителя чрез `auth()`
2. Разрешава клиентския идентификатор на Stripe на потребителя чрез `getUserStripeCustomerId()`
3. Извлича клиента, за да определи метода на плащане по подразбиране
4. Изброява всички методи на плащане тип `card` (до 100)
5. Форматира и сортира резултатите (първо по подразбиране, след това по дата на създаване)

### Ключова реализация

```typescript
// Retrieve customer for default payment method detection
const customer = await stripe.customers.retrieve(stripeCustomerId);
const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

// List all card-type payment methods
const paymentMethods = await stripe.paymentMethods.list({
  customer: stripeCustomerId,
  type: 'card',
  limit: 100
});

// Format with default status
const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
  id: pm.id,
  type: pm.type,
  card: pm.card ? {
    brand: pm.card.brand,
    last4: pm.card.last4,
    funding: pm.card.funding,
    country: pm.card.country
  } : null,
  billing_details: pm.billing_details,
  created: pm.created,
  metadata: pm.metadata,
  is_default: pm.id === defaultPaymentMethodId
}));

// Sort: default first, then by newest
formattedPaymentMethods.sort((a, b) => {
  if (a.is_default && !b.is_default) return -1;
  if (!a.is_default && b.is_default) return 1;
  return b.created - a.created;
});
```

### Успешен отговор (200)

```typescript
interface PaymentMethodListResponse {
  success: boolean;
  data: PaymentMethodItem[];
  meta: {
    total: number;
    default_payment_method: string | null;
    customer_id: string;
  };
  message?: string;  // Present when no payment methods found
}

interface PaymentMethodItem {
  id: string;                    // "pm_1234567890abcdef"
  type: string;                  // "card"
  card: {
    brand: string;               // "visa", "mastercard", "amex", "discover"
    last4: string;               // "4242"
    funding: string;             // "credit", "debit", "prepaid", "unknown"
    country: string;             // "US"
  } | null;
  billing_details: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: {
      line1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
  };
  created: number;               // Unix timestamp
  metadata: Record<string, string>;
  is_default: boolean;
}
```

### Пример: Потребител с методи на плащане

```json
{
  "success": true,
  "data": [
    {
      "id": "pm_1234567890abcdef",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "funding": "credit",
        "country": "US"
      },
      "billing_details": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": null,
        "address": null
      },
      "created": 1640995200,
      "metadata": {},
      "is_default": true
    }
  ],
  "meta": {
    "total": 1,
    "default_payment_method": "pm_1234567890abcdef",
    "customer_id": "cus_1234567890abcdef"
  }
}
```

### Пример: Няма методи на плащане

```json
{
  "success": true,
  "data": [],
  "message": "No payment methods found"
}
```

## Създаване на намерение за настройка (POST)

Намеренията за настройка позволяват на потребителите да запазят метод на плащане за бъдеща употреба, без да бъдат таксувани незабавно. Това се използва, когато потребител иска да добави карта, преди да се абонира, или да управлява множество методи на плащане.

### Как работи

```typescript
async createSetupIntent(user: User | null): Promise<SetupIntent> {
  const customerId = user?.user_metadata?.customerId;
  const setupIntent = await this.stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card']
  });

  return { ...setupIntent, clientSecret: setupIntent.client_secret! };
}
```

### Успешен отговор (200)

```typescript
interface SetupIntentResponse {
  id: string;                    // "seti_1234567890abcdef"
  client_secret: string;         // "seti_1234567890abcdef_secret_xyz"
  status: string;                // "requires_payment_method"
  usage: string;                 // "off_session"
  customer: string;              // "cus_1234567890abcdef"
  created: number;               // Unix timestamp
}
```

### Използване на интерфейса

От страна на клиента `client_secret` се използва за потвърждаване на намерението за настройка със Stripe.js:

```typescript
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});
```

## Управление на начина на плащане по подразбиране

Методът на плащане по подразбиране се определя от `invoice_settings.default_payment_method` на клиента на Stripe. Когато създавате абонамент, методът на плащане автоматично се задава като стандартен:

```typescript
// During subscription creation
await this.stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId
  }
});
```

Флагът `is_default` в отговора на списъка с методи за плащане позволява на интерфейса да показва значката на картата по подразбиране.

## Обработка на грешки

|Статус|Грешка|причина|
|--------|-------|-------|
| 401 |`Unauthorized`|Няма удостоверена сесия|
| 404 |`Customer not found`|Клиентът на Stripe беше изтрит|
| 400 |Грешка в лентата|Невалидна заявка към Stripe API|
| 500 |`Failed to list payment methods`|Вътрешна грешка|
| 500 |`Failed to create setup intent`|Създаването на намерение за настройка не бе успешно|

Специфичните за Stripe грешки се откриват и обработват:

```typescript
if (error instanceof Stripe.errors.StripeError) {
  const msg = safeErrorMessage(error, 'Stripe request failed');
  return NextResponse.json({ success: false, error: msg }, { status: 400 });
}
```

## Съображения за сигурност

- Всички крайни точки изискват удостоверени сесии
- Крайната точка на списъка връща само начини на плащане, принадлежащи на клиента Stripe на удостоверения потребител
- Номерата на картите никога не се съхраняват или връщат - само последните 4 цифри и марката са изложени
- `client_secret` от намеренията за настройка трябва да се предават само на SDK за интерфейс на Stripe.js
- Идентификационните номера на клиенти се разрешават от страна на сървъра и не могат да бъдат заменени от клиентски заявки

## Изисквания за конфигурация

|Променлива|Задължително|Описание|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|да|Stripe таен API ключ|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|да|За инициализация на интерфейс Stripe.js|

## Свързани страници

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Задълбочено гмуркане на абонамента на Stripe](./stripe-subscription-deep-dive.md)
- [Дълбоко гмуркане на Stripe Webhook](./stripe-webhook-deep-dive.md)
- [Архитектура на доставчика на плащания](./payment-provider-architecture.md)
