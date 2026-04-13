---
id: stripe-checkout-deep-dive
title: Stripe Checkout Deep Dive
sidebar_label: Stripe Checkout
sidebar_position: 1
---

# Stripe Checkout Deep Dive

Тази страница обхваща пълния поток на плащане на Stripe, включително създаване на сесия, разрешаване на идентификатор на цена, обработка на валута, URL адреси за пренасочване, потоци успех/отказ и разпространение на метаданни.

## Преглед

Интеграцията на Stripe Checkout предоставя API от страна на сървъра, който създава Stripe Checkout сесии както за еднократни плащания, така и за абонаменти. Потокът удостоверява потребителя, разрешава или създава клиент на Stripe, изгражда редови елементи с незадължителна пробна поддръжка и връща хостван URL адрес за плащане.

## Таблица с маршрути

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|`POST`|`/api/stripe/checkout`|Изисква се сесия|Създайте нова сесия за плащане|
|`GET`|`/api/stripe/checkout`|Изисква се сесия|Извличане на съществуваща сесия за плащане|

## Създаване на сесия за плащане (POST)

### Тяло на заявката

```typescript
interface CreateCheckoutRequest {
  priceId: string;                          // Stripe price ID (e.g., "price_1234567890abcdef")
  mode?: 'one_time' | 'subscription';       // Defaults to "one_time"
  trialPeriodDays?: number;                 // Trial days (subscription mode only, default: 0)
  billingInterval?: 'month' | 'year';       // Billing interval (default: "month")
  trialAmountId?: string;                   // Price ID for trial setup fee
  isAuthorizedTrialAmount?: boolean;        // Whether trial amount is authorized
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: Record<string, string>;        // Custom metadata (planId, planName, etc.)
}
```

### Примерна заявка

```bash
curl -X POST /api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "mode": "subscription",
    "trialPeriodDays": 14,
    "billingInterval": "month",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": {
      "planId": "pro_plan",
      "planName": "Pro Plan"
    }
  }'
```

### Успешен отговор (200)

```json
{
  "data": {
    "id": "cs_test_1234567890abcdef",
    "url": "https://checkout.stripe.com/pay/cs_test_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Картографиране на режима

API картографира входящите режими към очаквания тип `Mode` на Stripe:

```typescript
const stripeMode: 'payment' | 'setup' | 'subscription' =
  mode === 'one_time' ? 'payment'
    : mode === 'subscription' ? 'subscription'
    : 'setup';
```

- `one_time` преобразува в режим Stripe `payment`
- `subscription` преобразува в режим Stripe `subscription`
- Всяка друга стойност се преобразува в режим `setup`

## Резолюция на клиента

Преди да създаде сесия за плащане, API разрешава или създава клиент на Stripe:

```typescript
const stripeCustomerId = await stripeProvider.getCustomerId(session.user);
```

Методът `getCustomerId` следва резолюция в три стъпки:

1. **Проверка на метаданни** -- Търси `stripe_customer_id` в метаданните на потребителя
2. **Търсене в база данни** -- Запитва таблицата `PaymentAccount` за съществуващ запис
3. **Създаване на нов** -- Създава нов клиент на Stripe и се синхронизира с базата данни

Ако създаването на клиент е неуспешно, крайната точка връща `400` грешка.

## Пробна конфигурация

Изпитванията изискват да бъдат изпълнени две условия:

```typescript
const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;
```

Когато пробният период е активиран, се изисква `trialAmountId`. Това позволява да се начисли такса за настройка по време на пробния период. Помощникът `buildCheckoutLineItems` конструира редове, които включват както цената на абонамента, така и незадължителната пробна сума.

Ако `hasTrial` е вярно, но `trialAmountId` липсва, крайната точка връща:

```json
{
  "error": "Invalid trial configuration",
  "message": "trialAmountId is required when trial is enabled"
}
```

## Специфична за абонамент конфигурация

Когато режимът е `subscription`, се прилага допълнителна конфигурация чрез `applySubscriptionConfig`:

```typescript
if (stripeMode === 'subscription') {
  applySubscriptionConfig(checkoutParams, {
    userId: session.user.id || '',
    planId: metadata.planId,
    planName: metadata.planName,
    billingInterval,
    trialPeriodDays: hasTrial ? trialPeriodDays : 0
  });
}
```

Това прикачва метаданни за абонамент, включително `userId`, `planId`, `planName`, и интервал на таксуване към `subscription_data` на сесията за плащане.

## Разпространение на метаданни

Метаданните от заявката се обединяват с потребителските данни на сесията:

```typescript
metadata: {
  ...metadata,
  ...session.user
}
```

Това гарантира, че информацията за идентичност на потребителя (ID, имейл, име) винаги е прикачена към сесията за плащане за съгласуване в манипулаторите на webhook.

## Извличане на сесия за плащане (GET)

### Параметри на заявката

|Параметър|Задължително|Описание|
|-----------|----------|-------------|
|`session_id`|да|Идентификационен номер на сесията за плащане на лента|

### Примерна заявка

```bash
curl -X GET "/api/stripe/checkout?session_id=cs_test_1234567890abcdef" \
  -H "Cookie: session=..."
```

### Успешен отговор (200)

```json
{
  "session": { "...full Stripe checkout session object..." },
  "status": "complete",
  "customer": "cus_1234567890abcdef",
  "subscription": "sub_1234567890abcdef"
}
```

Сесията се извлича с разширени данни `line_items` и `subscription`:

```typescript
const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## Поддръжка на няколко валути

Обработката на валутата се конфигурира чрез `stripe.config.ts`. Обектът `STRIPE_CONFIG` съпоставя планове с идентификационни номера на цени, специфични за валутата:

```typescript
export const STRIPE_CONFIG: Record<PlanName, PlanConfig> = {
  premium: {
    usd: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'USD', symbol: '$' },
    eur: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'EUR', symbol: '$' },
    // ... gbp, cad
  },
  standard: { /* ... */ },
  free: { productId: undefined }
};
```

Използвайте `getStripePriceConfig(plan, currency, interval)`, за да разрешите правилния идентификатор на цената за даден план, валута и интервал на фактуриране.

## Динамично ценообразуване

Когато `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true`, крайната точка `/api/stripe/products` извлича продукти и цени директно от Stripe API с 5-минутен TTL кеш. Продуктите трябва да имат следните ключове за метаданни, зададени в таблото за управление на Stripe:

- `plan` -- Тип план (`free`, `standard`, `premium`)
- `type` -- Тип продукт (`subscription`, `sponsor_ad`)
- `features` -- JSON масив от функционални низове
- `annualDiscount` -- Годишен процент отстъпка

## Изисквания за конфигурация

|Променлива|Задължително|Описание|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|да|Stripe таен API ключ|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|да|Ключ за публикуване на лента|
|`STRIPE_WEBHOOK_SECRET`|да|Тайно подписване на уеб кукичка|
|`NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING`|не|Активиране на динамично ценообразуване|
|`NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD`|Условно|Ценови идентификатори за план/валута|

## Обработка на грешки

|Статус|Грешка|причина|
|--------|-------|-------|
| 400 |`Failed to create customer`|Неуспешно разрешаване/създаване на клиента|
| 400 |`Invalid trial configuration`|Пробният период е активиран без `trialAmountId`|
| 400 |`Session ID is required`|Липсва GET заявка `session_id` param|
| 401 |`Unauthorized`|Няма удостоверена сесия|
| 500 |`Failed to create checkout session`|Грешка в API на Stripe или вътрешна грешка|

В режим на разработка отговорите за грешка включват поле `details` с трасирането на стека.

## Съображения за сигурност

- Всички крайни точки за плащане изискват удостоверена сесия чрез `auth()`
- Тайният ключ Stripe никога не се разкрива на клиента
- Метаданните се обединяват от страна на сървъра; клиентите не могат да подправят самоличността на потребителя
- Сесиите за плащане са обхванати от Stripe клиента на удостоверения потребител
- Съобщенията за грешки се дезинфекцират чрез `safeErrorMessage`, за да се предотврати изтичане на информация в производството

## Свързани страници

- [Задълбочено гмуркане на абонамента на Stripe](./stripe-subscription-deep-dive.md)
- [Дълбоко гмуркане на Stripe Webhook](./stripe-webhook-deep-dive.md)
- [Задълбочено потапяне в методите на плащане на Stripe](./stripe-payment-methods-deep-dive.md)
- [Архитектура на доставчика на плащания](./payment-provider-architecture.md)
