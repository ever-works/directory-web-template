---
id: stripe-webhook-deep-dive
title: Дълбоко гмуркане на Stripe Webhook
sidebar_label: Stripe Webhooks
sidebar_position: 4
---

# Дълбоко гмуркане на Stripe Webhook

Тази страница обхваща обработката на събития на webhook, проверка на подпис, поддържани типове събития, известия по имейл и модели за обработка на грешки.

## Преглед

Крайната точка на webhook на Stripe обработва входящи събития от Stripe, проверява тяхната автентичност чрез проверка на подписа, съпоставя ги с типове вътрешни събития и ги изпраща на специализирани манипулатори. Всеки манипулатор актуализира базата данни чрез `WebhookSubscriptionService` и изпраща транзакционни имейли.

## Таблица с маршрути

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|`POST`|`/api/stripe/webhook`|Подпис на ивици|Обработка на входящи събития на Stripe webhook|

## Проверка на подписа

Всяка входяща уебкукичка трябва да включва заглавка `stripe-signature`. Доставчикът го проверява с помощта на метода `constructEvent` на Stripe:

```typescript
const event = this.stripe.webhooks.constructEvent(
  payload,
  signature,
  this.webhookSecret
);
```

Ако подписът липсва, крайната точка връща `400`:

```json
{ "error": "No signature provided" }
```

Ако подписът е невалиден, извикването `constructEvent` се хвърля и крайната точка се връща:

```json
{ "error": "Webhook processing failed" }
```

## Съпоставяне на типа събитие

Типовете събития Stripe се съпоставят с вътрешни `WebhookEventType` стойности:

|Страйп събитие|Вътрешен тип|Манипулатор|
|-------------|---------------|---------|
|`customer.subscription.created`|`SUBSCRIPTION_CREATED`|`handleSubscriptionCreated`|
|`customer.subscription.updated`|`SUBSCRIPTION_UPDATED`|`handleSubscriptionUpdated`|
|`customer.subscription.deleted`|`SUBSCRIPTION_CANCELLED`|`handleSubscriptionCancelled`|
|`invoice.payment_succeeded`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`handleSubscriptionPaymentSucceeded`|
|`invoice.payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|`handleSubscriptionPaymentFailed`|
|`payment_intent.succeeded`|`PAYMENT_SUCCEEDED`|`handlePaymentSucceeded`|
|`payment_intent.payment_failed`|`PAYMENT_FAILED`|`handlePaymentFailed`|
|`customer.subscription.trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|`handleSubscriptionTrialEnding`|
|`billing_portal.session.updated`|`BILLING_PORTAL_SESSION_UPDATED`|Само регистрирани|

## Поток на обработка на уеб кукичка

```
Stripe sends POST -> Read raw body -> Extract stripe-signature header
  -> stripeProvider.handleWebhook(body, signature)
    -> stripe.webhooks.constructEvent() (signature verification)
    -> Map event type to internal type
    -> Return { received: true, type, id, data }
  -> Switch on webhookResult.type
    -> Call appropriate handler
    -> Handler updates DB + sends email
  -> Return { received: true }
```

## Обработчици на събития

### Абонаментът е създаден

Обработва създаването на нов абонамент:

1. Проверява дали абонаментът е реклама на спонсор (специална обработка)
2. Извиква `webhookSubscriptionService.handleSubscriptionCreated(data)` за актуализиране на базата данни
3. Извлича информация за плана (име, сума, период на фактуриране)
4. Изпраща имейл за добре дошли с подробности за абонамента и функции

### Абонаментът е актуализиран

Обработва промени в абонамента (надграждане на планове, понижаване и т.н.):

1. Актуализира базата данни чрез `webhookSubscriptionService.handleSubscriptionUpdated(data)`
2. Извлича актуализирана информация за плана
3. Изпраща имейл с известие за актуализация

### Абонаментът е анулиран

Обработва анулирания на абонамент:

1. Проверява за абонаменти за спонсорски реклами
2. Актуализира базата данни чрез `webhookSubscriptionService.handleSubscriptionCancelled(data)`
3. Изпраща имейл за анулиране с причината за анулиране и URL адрес за повторно активиране

### Плащането е успешно (еднократно)

Обработва успешни еднократни плащания:

1. Извлича информация за клиента и данни за плащане
2. Форматира сумата и начина на плащане
3. Изпраща имейл за потвърждение на плащането с URL адрес на разписка

### Неуспешно плащане

Обработва неуспешни еднократни плащания:

1. Извлича информация за грешка от `last_payment_error`
2. Конструира URL адреси за повторен опит и актуализиране на начин на плащане
3. Изпраща имейл с известие за неуспешно плащане

### Плащането на абонамента е успешно

Обработва успешни повтарящи се абонаментни плащания:

1. Актуализира базата данни чрез `webhookSubscriptionService.handleSubscriptionPaymentSucceeded(data)`
2. Извлича данни за фактура и абонамент
3. Изпраща имейл с разписка за плащане на абонамент

### Неуспешно плащане на абонамент

Обработва неуспешни повтарящи се абонаментни плащания:

1. Актуализира базата данни чрез `webhookSubscriptionService.handleSubscriptionPaymentFailed(data)`
2. Изпраща известие за неуспех с URL адреси за повторен опит и актуализация на плащането

### Край на пробния период

Обработва известия за приключване на 3-дневен пробен период от Stripe:

1. Актуализира базата данни чрез `webhookSubscriptionService.handleSubscriptionTrialEnding(data)`
2. Изпраща имейл с напомняне за края на пробния период

## Известия по имейл

Всеки манипулатор използва `paymentEmailService` за изпращане на транзакционни имейли. Имейл конфигурацията се зарежда сигурно чрез `getEmailConfig()`:

```typescript
function createEmailData(baseData: any, emailConfig: ReturnType<typeof getEmailConfig>) {
  return {
    ...baseData,
    companyName: emailConfig.companyName,
    companyUrl: emailConfig.companyUrl,
    supportEmail: emailConfig.supportEmail
  };
}
```

|Събитие|Шаблон за имейл|
|-------|---------------|
|Абонаментът е създаден|`sendNewSubscriptionEmail`|
|Абонаментът е актуализиран|`sendUpdatedSubscriptionEmail`|
|Абонаментът е анулиран|`sendCancelledSubscriptionEmail`|
|Плащането е успешно|`sendPaymentSuccessEmail`|
|Неуспешно плащане|`sendPaymentFailedEmail`|
|Успешно плащане на абонамента|`sendSubscriptionPaymentSuccessEmail`|
|Плащането на абонамента е неуспешно|`sendSubscriptionPaymentFailedEmail`|
|Край на пробния период|`sendUpdatedSubscriptionEmail`|

## Спонсориране на реклами

Уеб кукичката включва специална обработка за абонаменти за спонсорски реклами. Те се идентифицират чрез проверка на метаданни:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const metadata = data.metadata as Record<string, string> | undefined;
  return metadata?.type === 'sponsor_ad';
}
```

Спонсорирани рекламни събития задействат:
- **Активиране**: Потвърждава плащането и задава рекламата да чака преглед от администратор
- **Анулиране**: Деактивира рекламата на спонсора
- **Подновяване**: Удължава крайната дата на рекламата на спонсора

## Характеристики на плана

Функцията `getSubscriptionFeatures` картографира имената на плановете към списъци с функции, използвани в имейли за добре дошли:

```typescript
const features: Record<string, string[]> = {
  'Free Plan': ['Access to basic features', 'Email support', 'Limited storage'],
  'Standard Plan': ['All advanced features', 'Priority support', 'Unlimited storage', ...],
  'Premium Plan': ['All Pro features', 'Dedicated support', 'Custom features', ...]
};
```

## Обработка на грешки

Крайната точка на webhook следва устойчив модел:

- Всеки отделен манипулатор е обвит в свой собствен блок try/catch
- Грешките на манипулатора се регистрират, но не карат уебкукичката да връща грешка
- Външният try/catch улавя грешки при проверката на подписа и анализирането
- Връща `400` за всички грешки на ниво webhook, за да каже на Stripe да не опитва отново при постоянни грешки

```typescript
try {
  // ... signature verification and event dispatch
  return NextResponse.json({ received: true });
} catch (error) {
  console.error('Webhook error:', error);
  return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
}
```

## Изисквания за конфигурация

|Променлива|Задължително|Описание|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|да|Stripe таен API ключ|
|`STRIPE_WEBHOOK_SECRET`|да|Тайно подписване на Webhook (от Stripe Dashboard)|

За да конфигурирате webhook в Stripe Dashboard:

1. Отидете до Разработчици > Уебкукички
2. Добавете URL адрес на крайна точка: `https://yourdomain.com/api/stripe/webhook`
3. Изберете събитията, изброени в таблицата за съпоставяне на събития по-горе
4. Копирайте тайната за подписване на `STRIPE_WEBHOOK_SECRET`

## Съображения за сигурност

- Задължителна е проверката на подписа; заявки без валидни подписи се отхвърлят
- Основният текст на заявката се използва за проверка на подписа (не се анализира JSON)
- Тайните на Webhook никога не трябва да се ангажират с контрола на версиите
- Крайната точка не изисква удостоверяване на сесия (Stripe го извиква директно)
- Чувствителните данни в съобщенията за грешки се дезинфекцират за производствени среди

## Свързани страници

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Задълбочено гмуркане на абонамента на Stripe](./stripe-subscription-deep-dive.md)
- [Задълбочено потапяне в методите на плащане на Stripe](./stripe-payment-methods-deep-dive.md)
- [Архитектура на доставчика на плащания](./payment-provider-architecture.md)
