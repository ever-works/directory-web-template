---
id: stripe-payment-methods-deep-dive
title: Подробное описание способов оплаты Stripe
sidebar_label: Способы оплаты полосы
sidebar_position: 3
---

# Подробное описание способов оплаты Stripe

На этой странице описан список способов оплаты, настройки сохранения карт, управление методами по умолчанию и проверка карты.

## Обзор

Система способов оплаты предоставляет две ключевые возможности: список сохраненных пользователем способов оплаты со статусом по умолчанию и создание намерений настройки, которые позволяют пользователям сохранять новые способы оплаты для использования в будущем без немедленной оплаты.

## Таблица маршрутов

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|`GET`|`/api/stripe/payment-methods/list`|Требуется сеанс|Перечислите все способы оплаты для пользователя|
|`POST`|`/api/stripe/setup-intent`|Требуется сеанс|Создайте намерение настройки для сохранения нового способа оплаты.|

## Список способов оплаты (GET)

### Как это работает

Конечная точка списка выполняет следующие шаги:

1. Аутентифицирует пользователя через `auth()`
2. Разрешает идентификатор клиента Stripe пользователя через `getUserStripeCustomerId()`.
3. Возвращает клиента для определения способа оплаты по умолчанию.
4. Перечисляет все способы оплаты типа `card` (до 100).
5. Форматирует и сортирует результаты (сначала по умолчанию, затем по дате создания)

### Ключевая реализация

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

### Успешный ответ (200)

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

### Пример: Пользователь со способами оплаты

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

### Пример: нет способов оплаты

```json
{
  "success": true,
  "data": [],
  "message": "No payment methods found"
}
```

## Создание намерения установки (POST)

Намерения настройки позволяют пользователям сохранять способ оплаты для использования в будущем без немедленной оплаты. Это используется, когда пользователь хочет добавить карту перед подпиской или управлять несколькими способами оплаты.

### Как это работает

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

### Успешный ответ (200)

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

### Использование внешнего интерфейса

На стороне клиента `client_secret` используется для подтверждения намерения установки с помощью Stripe.js:

```typescript
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});
```

## Управление способами оплаты по умолчанию

Способ оплаты по умолчанию определяется `invoice_settings.default_payment_method` клиента Stripe. При создании подписки способ оплаты автоматически устанавливается по умолчанию:

```typescript
// During subscription creation
await this.stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId
  }
});
```

Флаг `is_default` в ответе списка способов оплаты позволяет интерфейсу отображать значок карты по умолчанию.

## Обработка ошибок

|Статус|Ошибка|Причина|
|--------|-------|-------|
| 401 |`Unauthorized`|Нет аутентифицированного сеанса|
| 404 |`Customer not found`|Клиент Stripe удален.|
| 400 |Ошибка полосы|Неверный запрос к Stripe API|
| 500 |`Failed to list payment methods`|Внутренняя ошибка|
| 500 |`Failed to create setup intent`|Не удалось создать намерение установки.|

Ошибки, специфичные для полосы, обнаруживаются и обрабатываются:

```typescript
if (error instanceof Stripe.errors.StripeError) {
  const msg = safeErrorMessage(error, 'Stripe request failed');
  return NextResponse.json({ success: false, error: msg }, { status: 400 });
}
```

## Вопросы безопасности

- Все конечные точки требуют аутентифицированных сеансов
- Конечная точка списка возвращает только способы оплаты, принадлежащие клиенту Stripe аутентифицированного пользователя.
- Номера карт никогда не сохраняются и не возвращаются — доступны только последние 4 цифры и марка.
- `client_secret` из намерений установки следует передавать только в SDK внешнего интерфейса Stripe.js.
- Идентификаторы клиентов определяются на стороне сервера и не могут быть переопределены запросами клиентов.

## Требования к конфигурации

|Переменная|Требуется|Описание|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|Да|Секретный API-ключ Stripe|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|Да|Для инициализации внешнего интерфейса Stripe.js|

## Похожие страницы

- [Подробное описание Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Подробный обзор подписки Stripe](./stripe-subscription-deep-dive.md)
- [Подробное описание Stripe Webhook](./stripe-webhook-deep-dive.md)
- [Архитектура платежного провайдера](./pay-provider-architecture.md)
