---
id: stripe-checkout-deep-dive
title: Подробное описание Stripe Checkout
sidebar_label: Полоса
sidebar_position: 1
---

# Подробное описание Stripe Checkout

На этой странице описан весь процесс оформления заказа Stripe, включая создание сеанса, разрешение идентификатора цены, обработку валюты, URL-адреса перенаправления, потоки успеха/отмены и распространение метаданных.

## Обзор

Интеграция проверки Stripe предоставляет серверный API, который создает сеансы проверки Stripe как для разовых платежей, так и для подписок. Поток аутентифицирует пользователя, определяет или создает клиента Stripe, создает позиции с дополнительной пробной поддержкой и возвращает размещенный URL-адрес оформления заказа.

## Таблица маршрутов

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|`POST`|`/api/stripe/checkout`|Требуется сеанс|Создать новый сеанс оформления заказа|
|`GET`|`/api/stripe/checkout`|Требуется сеанс|Получить существующий сеанс оформления заказа|

## Создание сеанса оформления заказа (POST)

### Тело запроса

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

### Пример запроса

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

### Успешный ответ (200)

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

## Сопоставление режимов

API сопоставляет входящие режимы с ожидаемым типом `Mode` Stripe:

```typescript
const stripeMode: 'payment' | 'setup' | 'subscription' =
  mode === 'one_time' ? 'payment'
    : mode === 'subscription' ? 'subscription'
    : 'setup';
```

- `one_time` сопоставляется с режимом Stripe `payment`
- `subscription` сопоставляется с режимом Stripe `subscription`
- Любое другое значение отображается в режиме `setup`.

## Разрешение клиентов

Перед созданием сеанса оформления заказа API разрешает или создает клиента Stripe:

```typescript
const stripeCustomerId = await stripeProvider.getCustomerId(session.user);
```

Метод `getCustomerId` предполагает трехэтапное решение:

1. **Проверка метаданных** – ищет `stripe_customer_id` в метаданных пользователя.
2. **Поиск в базе данных** – запрашивает таблицу `PaymentAccount` на наличие существующей записи.
3. **Создать новый** – создает нового клиента Stripe и синхронизирует его с базой данных.

Если создать клиента не удается, конечная точка возвращает ошибку `400`.

## Пробная конфигурация

Для испытаний необходимо соблюдение двух условий:

```typescript
const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;
```

Если пробная версия включена, требуется `trialAmountId`. Это позволяет взимать плату за установку в течение пробного периода. Помощник `buildCheckoutLineItems` создает позиции, которые включают в себя как цену подписки, так и необязательную пробную сумму.

Если `hasTrial` истинно, но `trialAmountId` отсутствует, конечная точка возвращает:

```json
{
  "error": "Invalid trial configuration",
  "message": "trialAmountId is required when trial is enabled"
}
```

## Конфигурация для конкретной подписки

Если выбран режим `subscription`, дополнительная конфигурация применяется через `applySubscriptionConfig`:

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

Это прикрепляет метаданные подписки, включая `userId`, `planId`, `planName` и интервал выставления счетов, к `subscription_data` сеанса оформления заказа.

## Распространение метаданных

Метаданные запроса объединяются с данными пользователя сеанса:

```typescript
metadata: {
  ...metadata,
  ...session.user
}
```

Это гарантирует, что идентификационная информация пользователя (идентификатор, адрес электронной почты, имя) всегда прикрепляется к сеансу оформления заказа для сверки в обработчиках веб-перехватчиков.

## Получение сеанса оформления заказа (GET)

### Параметры запроса

|Параметр|Требуется|Описание|
|-----------|----------|-------------|
|`session_id`|Да|Идентификатор сеанса оформления заказа Stripe|

### Пример запроса

```bash
curl -X GET "/api/stripe/checkout?session_id=cs_test_1234567890abcdef" \
  -H "Cookie: session=..."
```

### Успешный ответ (200)

```json
{
  "session": { "...full Stripe checkout session object..." },
  "status": "complete",
  "customer": "cus_1234567890abcdef",
  "subscription": "sub_1234567890abcdef"
}
```

Сеанс извлекается с расширенными данными `line_items` и `subscription`:

```typescript
const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## Мультивалютная поддержка

Обработка валюты настраивается через `stripe.config.ts`. Объект `STRIPE_CONFIG` сопоставляет планы с идентификаторами цен для конкретной валюты:

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

Используйте `getStripePriceConfig(plan, currency, interval)`, чтобы определить правильный идентификатор цены для данного плана, валюты и интервала выставления счетов.

## Динамическое ценообразование

Когда `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true`, конечная точка `/api/stripe/products` получает продукты и цены непосредственно из Stripe API с 5-минутным TTL кэша. Продукты должны иметь следующие ключи метаданных, установленные на панели инструментов Stripe:

- `plan` -- Тип плана (`free`, `standard`, `premium`)
- `type` -- Тип продукта (`subscription`, `sponsor_ad`)
- `features` -- Массив строк функций в формате JSON.
- `annualDiscount` -- Годовой процент скидки

## Требования к конфигурации

|Переменная|Требуется|Описание|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|Да|Секретный API-ключ Stripe|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|Да|Публикуемый ключ Stripe|
|`STRIPE_WEBHOOK_SECRET`|Да|Секрет подписи вебхука|
|`NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING`|Нет|Включить динамическое ценообразование|
|`NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD`|Условный|Идентификаторы цен для каждого плана/валюты|

## Обработка ошибок

|Статус|Ошибка|Причина|
|--------|-------|-------|
| 400 |`Failed to create customer`|Не удалось разрешить/создать клиента.|
| 400 |`Invalid trial configuration`|Пробная версия включена без `trialAmountId`|
| 400 |`Session ID is required`|В запросе GET отсутствует параметр `session_id`|
| 401 |`Unauthorized`|Нет аутентифицированного сеанса|
| 500 |`Failed to create checkout session`|Ошибка Stripe API или внутренняя ошибка|

В режиме разработки ответы об ошибках включают поле `details` со трассировкой стека.

## Вопросы безопасности

- Для всех конечных точек оформления заказа требуется сеанс с аутентификацией через `auth()`.
- Секретный ключ Stripe никогда не предоставляется клиенту.
- Метаданные объединяются на стороне сервера; клиенты не могут подделать личность пользователя
- Сеансы оформления заказа ограничены клиентом Stripe аутентифицированного пользователя.
- Сообщения об ошибках обрабатываются с помощью `safeErrorMessage`, чтобы предотвратить утечку информации в рабочей среде.

## Похожие страницы

- [Подробный обзор подписки Stripe](./stripe-subscription-deep-dive.md)
- [Подробное описание Stripe Webhook](./stripe-webhook-deep-dive.md)
- [Подробное описание способов оплаты Stripe](./stripe-pay-methods-deep-dive.md)
- [Архитектура платежного провайдера](./pay-provider-architecture.md)
