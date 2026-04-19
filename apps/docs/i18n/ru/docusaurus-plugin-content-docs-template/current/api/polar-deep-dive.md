---
id: polar-deep-dive
title: Полярное глубокое погружение
sidebar_label: Полярный
sidebar_position: 6
---

# Полярное глубокое погружение

На этой странице описана полная интеграция с Polar, включая создание оформления заказа, управление подписками, клиентский портал и обработку веб-перехватчиков.

## Обзор

Polar — современная платежная платформа, предназначенная для программного обеспечения и цифровых продуктов. Интеграция поддерживает как разовые платежи, так и подписки через систему оплаты Polar с управлением жизненным циклом на основе веб-перехватчиков. Polar использует продукты для организаций и `@polar-sh/sdk` для взаимодействия через API.

## Таблица маршрутов

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|`POST`|`/api/polar/checkout`|Требуется сеанс|Создать сеанс оформления заказа (по подписке или разово)|
|`GET`|`/api/polar/checkout`|Требуется сеанс|Получить статус сеанса оформления заказа|
|`POST`|`/api/polar/webhook`|Требуется подпись|Обработка входящих событий вебхука|

## Создание оформления заказа (POST)

### Тело запроса

```typescript
interface PolarCheckoutRequest {
  productId: string;                        // Polar product ID
  mode?: 'one_time' | 'subscription';       // Defaults to "subscription"
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: {
    planId?: string;
    planName?: string;
    billingInterval?: string;
    [key: string]: any;
  };
}
```

### Пример запроса

```bash
curl -X POST /api/polar/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "productId": "prod_1234567890abcdef",
    "mode": "subscription",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### Как это работает

Маршрут оформления заказа обрабатывает два потока:

**Режим подписки:**
1. Аутентифицирует пользователя и определяет клиента Polar
2. Обеззараживает метаданные (удаляет значения `undefined` — Polar их отклоняет)
3. Вызывает `polarProvider.createSubscription()`, который создает сеанс оформления заказа.
4. Возвращает URL-адрес оформления заказа из результата подписки.

**Режим единовременной оплаты:**
1. Аутентифицирует пользователя и определяет клиента Polar
2. Использует Polar SDK напрямую для создания оформления заказа.
3. Возвращает URL-адрес оформления заказа

### Очистка метаданных

Polar требует, чтобы все значения метаданных были ненулевыми и неопределенными:

```typescript
const sanitizedMetadata: Record<string, any> = {
  userId: session.user.id || ''
};
if (metadata.planId) sanitizedMetadata.planId = metadata.planId;
if (metadata.planName) sanitizedMetadata.planName = metadata.planName;
// Only include defined values
Object.entries(metadata).forEach(([key, value]) => {
  if (value !== undefined && value !== null) {
    sanitizedMetadata[key] = value;
  }
});
```

### Успешный ответ (200)

```json
{
  "data": {
    "id": "checkout_1234567890abcdef",
    "url": "https://polar.sh/checkout/checkout_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Получение сеанса оформления заказа (GET)

### Параметры запроса

|Параметр|Требуется|Описание|
|-----------|----------|-------------|
|`checkout_id`|Да|Идентификатор сеанса оформления заказа Polar|

### Успешный ответ (200)

```json
{
  "checkout": { "...full Polar checkout object..." },
  "status": "complete",
  "customer": "customer_1234567890abcdef",
  "subscription": "subscription_1234567890abcdef"
}
```

## Управление подпиской

### Создание подписок

Метод `PolarProvider.createSubscription()` создает оформление подписки:

```typescript
const checkout = await this.polar.checkouts.create({
  products: [priceId],
  organizationId: this.organizationId,
  customerId: customerId,
  successUrl: metadata?.successUrl,
  metadata: sanitizedMetadata
});
```

### Отмена подписок

Polar поддерживает две стратегии отмены:

```typescript
// Cancel at period end (soft cancel)
await cancelSubscriptionAtPeriodEnd({ polar, subscriptionId });

// Cancel immediately (hard cancel)
await cancelSubscriptionImmediately({ polar, subscriptionId });
```

Поставщик проверяет состояние подписки перед отменой:

```typescript
const validateResult = validateSubscriptionId(subscriptionId);
if (!validateResult.isValid) {
  throw new PolarFatalError(validateResult.error);
}
```

### Повторная активация подписок

Подписки, запланированные к отмене, можно повторно активировать:

```typescript
if (isScheduledForCancellation(subscription)) {
  const result = await reactivatePolarSubscription({
    polar, subscriptionId, subscription
  });
}
```

### Обновление подписок

Изменения плана обрабатываются через `polar.subscriptions.update()`:

```typescript
const updated = await this.polar.subscriptions.update({
  id: subscriptionId,
  productId: newProductId
});
```

## Обработка вебхука

### Проверка подписи

Polar использует функцию `@polar-sh/sdk/webhooks` `validateEvent` для проверки. Вебхук требует трех заголовков:

|Заголовок|Описание|
|--------|-------------|
|`webhook-signature`|Подпись HMAC SHA256 (формат: `v1,<hex_signature>`)|
|`webhook-timestamp`|Unix-временная метка события|
|`webhook-id`|Уникальный идентификатор доставки вебхука|

```typescript
const webhookResult = await polarProvider.handleWebhook(
  body,           // Parsed JSON
  signatureHeader, // Full "v1,..." signature
  bodyText,        // Raw body for verification
  timestampHeader,
  webhookIdHeader
);
```

### Типы событий

|Полярное событие|Внутреннее картографирование|
|-------------|-----------------|
|`checkout.succeeded`|Платеж прошел успешно|
|`checkout.failed`|Платеж не выполнен|
|`subscription.created`|Подписка создана|
|`subscription.updated`|Подписка обновлена|
|`subscription.canceled`|Подписка отменена|
|`invoice.paid`|Оплата подписки прошла успешно|
|`invoice.payment_failed`|Оплата подписки не удалась|

### Вебхук-маршрутизатор

События отправляются через специальный модуль маршрутизатора:

```typescript
await routeWebhookEvent(webhookResult.type, webhookResult.data);
```

Маршрутизатор сопоставляет типы событий функциям-обработчикам, которые обновляют базу данных через `WebhookSubscriptionService` и отправляют уведомления по электронной почте.

### Проверка полезной нагрузки

Конечная точка веб-перехватчика проверяет структуру полезных данных перед обработкой:

```typescript
if (!validateWebhookPayload(body)) {
  return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
}
```

## Управление клиентами

Поставщик следует стандартному трехэтапному шаблону разрешения:

1. Проверьте метаданные пользователя для идентификатора клиента Polar.
2. Запросить таблицу базы данных `PaymentAccount`
3. Создайте нового клиента с помощью Polar SDK

```typescript
const customer = await this.polar.customers.create({
  organizationId: this.organizationId,
  email: params.email,
  name: params.name,
  metadata: params.metadata
});
```

## Обработка ошибок

|Статус|Ошибка|Причина|
|--------|-------|-------|
| 400 |`Product ID is required`|В запросе отсутствует `productId`|
| 400 |`Checkout ID is required`|GET-запрос отсутствует `checkout_id`|
| 400 |`No signature provided`|В Webhook отсутствует заголовок подписи|
| 401 |`Unauthorized`|Нет аутентифицированного сеанса|
| 500 |`Failed to create checkout`|URL-адрес оформления заказа недоступен.|
| 500 |`Configuration error`|Поставщик Polar не настроен|
| 503 |Настройка платежа не завершена|Организация не завершила настройку оплаты в Polar|

Конечная точка оформления заказа включает в себя специальное обнаружение ошибок настройки платежа:

```typescript
if (error.message.includes('Payments are currently unavailable') ||
    error.message.includes('needs to complete their payment setup')) {
  statusCode = 503;
  fallbackMessage = 'Polar payment setup incomplete...';
}
```

## Требования к конфигурации

|Переменная|Требуется|Описание|
|----------|----------|-------------|
|`POLAR_ACCESS_TOKEN`|Да|Токен доступа к API Polar|
|`POLAR_WEBHOOK_SECRET`|Да|Секрет подписи вебхука|
|`POLAR_ORGANIZATION_ID`|Да|Идентификатор полярной организации|

## Вопросы безопасности

- Подписи вебхуков проверяются с помощью функции `validateEvent` из официального SDK.
- Необработанный основной текст сохраняется для проверки подписи (повторная сериализация JSON может изменить тело).
- Проверяются три отдельных заголовка: подпись, временная метка и идентификатор веб-перехватчика.
- Метаданные очищаются на стороне сервера, чтобы предотвратить внедрение неопределенных значений.
- В ответах об ошибках используется `safeErrorResponse` для предотвращения утечки информации.

## Похожие страницы

- [Глубокий обзор LemonSqueezy](./lemonsqueezy-deep-dive.md)
- [Подробное описание Solidgate](./solidgate-deep-dive.md)
- [Подробное описание Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Архитектура платежного провайдера](./pay-provider-architecture.md)
