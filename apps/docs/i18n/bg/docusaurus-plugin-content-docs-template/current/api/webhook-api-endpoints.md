---
id: webhook-api-endpoints
title: Крайни точки на API на Webhook
sidebar_label: Уеб кукички
sidebar_position: 27
---

# Крайни точки на API на Webhook

Шаблонът поддържа манипулатори на уебкукички за плащане за четири доставчика: Stripe, LemonSqueezy, Polar и Solidgate. Всяка крайна точка на webhook обработва входящи събития от съответния доставчик на плащания, като управлява управлението на жизнения цикъл на абонамента, известия за плащане и доставка на имейл. Всички крайни точки проверяват подписите на заявките за сигурност.

## Преглед

|Крайна точка|Доставчик|Заглавие на подписа|Описание|
|---|---|---|---|
|`/api/stripe/webhook`|Ивица|`stripe-signature`|Обработвайте събития за плащане и абонамент на Stripe|
|`/api/lemonsqueezy/webhook`|LemonSqueezy|`x-signature`|Обработвайте събития за плащане на LemonSqueezy|
|`/api/polar/webhook`|Полярен|`webhook-signature`|Обработвайте събития за плащане на Polar|
|`/api/solidgate/webhook`|Solidgate|`x-signature`|Обработвайте събития за плащане на Solidgate|

Всички крайни точки на webhook приемат само POST заявки и връщат `{"received": true}` при успех.

## Споделена архитектура

И четирите манипулатора на webhook следват същия общ модел:

1. Прочетете основния текст на заявката като текст (необходим за проверка на подписа)
2. Извличане на подписа от специфични за доставчика заглавки
3. Предайте тялото и подписа към метода `handleWebhook()` на доставчика за проверка и анализ
4. Насочете анализираното събитие към подходящия манипулатор въз основа на `WebhookEventType`
5. Изпълнение на бизнес логика (актуализации на база данни, известия по имейл)
6. Върнете `{"received": true}`, за да потвърдите уебкукичката

### Често срещани типове събития

`WebhookEventType` enum от `lib/payment/types/payment-types` стандартизира събития между доставчици:

|Тип събитие|Описание|
|---|---|
|`SUBSCRIPTION_CREATED`|Нов абонамент е активиран|
|`SUBSCRIPTION_UPDATED`|Абонаментният план или подробностите са променени|
|`SUBSCRIPTION_CANCELLED`|Абонаментът е анулиран|
|`PAYMENT_SUCCEEDED`|Еднократното плащане е извършено|
|`PAYMENT_FAILED`|Неуспешен опит за плащане|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|Плащането на периодичния абонамент е завършено|
|`SUBSCRIPTION_PAYMENT_FAILED`|Неуспешно повтарящо се плащане на абонамент|
|`SUBSCRIPTION_TRIAL_ENDING`|Пробният период изтича|
|`REFUND_SUCCEEDED`|Възстановяването е обработено|
|`BILLING_PORTAL_SESSION_UPDATED`|Сесията на портала за таксуване е променена (само Stripe)|

## Stripe Webhook

```
POST /api/stripe/webhook
```

Обработва Stripe webhook събития с проверка на подписа чрез заглавката `stripe-signature`. Това е най-пълният с функции манипулатор на webhook, включително известия по имейл за всички типове събития и обработка на абонаменти за реклами на спонсори.

**Задължителен колонтитул:**

|Заглавка|Описание|
|---|---|
|`stripe-signature`|Подпис на лента за уебкукичка (`t=...,v1=...` формат)|

**Поддържани събития:**

|Страйп събитие|Картографиран тип|Действия|
|---|---|---|
|`customer.subscription.created`|`SUBSCRIPTION_CREATED`|Актуализация на базата данни, имейл за добре дошли|
|`customer.subscription.updated`|`SUBSCRIPTION_UPDATED`|Актуализация на база данни, актуализиране на имейл|
|`customer.subscription.deleted`|`SUBSCRIPTION_CANCELLED`|Актуализация на база данни, имейл за анулиране|
|`invoice.payment_succeeded`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|Актуализация на база данни, имейл за получаване|
|`invoice.payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|Актуализация на базата данни, повторете имейл|
|`payment_intent.succeeded`|`PAYMENT_SUCCEEDED`|Имейл за потвърждение|
|`payment_intent.payment_failed`|`PAYMENT_FAILED`|Имейл за известие за грешка|
|`customer.subscription.trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|Имейл за приключване на пробния период|
|`billing_portal.session.updated`|`BILLING_PORTAL_SESSION_UPDATED`|Само регистриране|

**Обработка на реклами от спонсори:**

Stripe webhooks откриват абонаменти за реклами на спонсори чрез `metadata.type === "sponsor_ad"` в данните за абонамента. Когато бъдат открити, специални манипулатори активират, анулират или подновяват реклами на спонсори, вместо да обработват редовни абонаменти.

**Отговори за грешка:**

|Статус|Състояние|
|---|---|
| 400 |Липсва заглавка `stripe-signature`|
| 400 |Webhook не е обработен (невалиден подпис)|
| 400 |Обработката на уеб кукичката е неуспешна|

**Източник:** `template/app/api/stripe/webhook/route.ts`

## LemonSqueezy Webhook

```
POST /api/lemonsqueezy/webhook
```

Обработва LemonSqueezy webhook събития с проверка на подписа чрез заглавката `x-signature`. Използва функция за картографиране на събития, за да преведе специфични за LemonSqueezy имена на събития в общия `WebhookEventType`.

**Задължителен колонтитул:**

|Заглавка|Описание|
|---|---|
|`x-signature`|Подпис на LemonSqueezy webhook|

**Картиране на събития:**

|Събитие LemonSqueezy|Картографиран тип|
|---|---|
|`subscription_created`|`SUBSCRIPTION_CREATED`|
|`subscription_updated`|`SUBSCRIPTION_UPDATED`|
|`subscription_cancelled`|`SUBSCRIPTION_CANCELLED`|
|`subscription_payment_success`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|
|`subscription_payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|
|`subscription_trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|
|`order_created`|`PAYMENT_SUCCEEDED`|
|`order_refunded`|`REFUND_SUCCEEDED`|

**Обработка на реклами от спонсори:**

LemonSqueezy използва `custom_data.type === "sponsor_ad"` или `meta.custom_data.type === "sponsor_ad"` за идентифициране на абонаменти за реклами на спонсори.

**Източник:** `template/app/api/lemonsqueezy/webhook/route.ts`

## Polar Webhook

```
POST /api/polar/webhook
```

Обработва Polar webhook събития с проверка на подписа с множество заглавки. Polar използва три заглавки за проверка на сигурността и делегира маршрутизиране на събития към отделен рутер модул.

**Задължителни заглавки:**

|Заглавка|Описание|
|---|---|
|`webhook-signature`|HMAC SHA256 подпис (`v1,<hex_signature>` формат)|
|`webhook-timestamp`|Времево клеймо на Unix на събитието webhook|
|`webhook-id`|Уникален идентификатор за доставка на webhook|

**Поддържани събития:**

|Полярно събитие|Описание|
|---|---|
|`checkout.succeeded`|Плащането приключи|
|`checkout.failed`|Плащането не бе успешно|
|`subscription.created`|Абонаментът е създаден|
|`subscription.updated`|Абонаментът е актуализиран|
|`subscription.canceled`|Абонаментът е анулиран|
|`invoice.paid`|Плащането на фактурата е извършено|
|`invoice.payment_failed`|Неуспешно плащане на фактура|

**Обработва се:**

За разлика от другите доставчици, манипулаторът на webhook на Polar използва отделна `routeWebhookEvent()` функция от `router` модул и `validateWebhookPayload()` помощна програма за валидиране на структурата на полезния товар преди проверка на подписа.

**Източник:** `template/app/api/polar/webhook/route.ts`

## Solidgate Webhook

```
POST /api/solidgate/webhook
```

Обработва Solidgate webhook събития с проверка на подписа. Включва защита от идемпотентност в паметта за предотвратяване на дублиращата се обработка на едно и също събитие уебкукичка.

**Задължителен колонтитул:**

|Заглавка|Описание|
|---|---|
|`x-signature` или `solidgate-signature`|Подпис на уеб кукичката на Solidgate|

**Идемпотентност:**

Манипулаторът поддържа `Set` в паметта на обработените идентификатори на уеб кукички. Дублираните уебкукички връщат `{"received": true}` без повторна обработка. Идентификаторите на Webhook изтичат от кеша след 24 часа.

**Забележка:** Кешът за идемпотентност в паметта не се запазва при извиквания на функции без сървър. В производствени среди без сървър това трябва да се замени с Redis или решение, поддържано от база данни.

**Поддържани събития:**

Манипулаторът приема както общите `WebhookEventType` константи, така и базирани на низове имена на събития (напр. както `WebhookEventType.PAYMENT_SUCCEEDED`, така и `"payment_succeeded"`).

|Събитие|Действия|
|---|---|
|`payment_succeeded`|Рекордно плащане|
|`payment_failed`|Неуспешен запис|
|`subscription_created`|Създаване на абонамент|
|`subscription_updated`|Актуализиране на абонамента|
|`subscription_cancelled`|Отказ от абонамент|
|`subscription_payment_succeeded`|Рекордно плащане на абонамент|
|`subscription_payment_failed`|Неуспешно плащане на абонамент за запис|
|`subscription_trial_ending`|Справяне с края на пробния период|
|`refund_processed`|Вход за възстановяване|

**ВЗЕМЕТЕ крайна точка:**

Solidgate също така разкрива GET манипулатор, който връща информационно съобщение за крайната точка на webhook:

```json
{
  "message": "Solidgate webhook endpoint",
  "instructions": "This endpoint accepts POST requests from Solidgate webhooks",
  "method": "POST"
}
```

**Източник:** `template/app/api/solidgate/webhook/route.ts`

## Известия по имейл

Манипулаторът на webhook Stripe изпраща най-изчерпателните имейл известия. Всички доставчици делегират на `WebhookSubscriptionService` операции с бази данни, но имейл шаблоните варират според доставчика.

|Тип имейл|Тригер|
|---|---|
|Добре дошли/Нов абонамент|Абонаментът е създаден|
|Актуализация на абонамента|Променен абонаментен план|
|Потвърждение за анулиране|Абонаментът е анулиран|
|Разписка за плащане|Абонаментът или еднократното плащане са успешни|
|Неуспешно плащане / Опитайте отново|Неуспешен опит за плащане|
|Край на пробния период|Пробният период изтича|

Имейл конфигурацията се зарежда от `lib/config/server-config` чрез `getEmailConfig()` и включва име на фирма, URL адрес на компанията и имейл адрес за поддръжка.

## Ключови подробности за внедряването

- **Проверка на подписа:** Всички доставчици проверяват подписите на webhook преди обработка на събития. Невалидните подписи водят до отговор 400.
- **Разбор на необработено тяло:** Webhooks четат тялото на заявката като текст, използвайки `request.text()` вместо `request.json()`, тъй като проверката на подписа изисква необработения, немодифициран полезен товар.
- **WebhookSubscriptionService:** Споделеният `WebhookSubscriptionService` клас обработва операции с база данни за събития от жизнения цикъл на абонамента във всички доставчици.
- **Откриване на спонсорски реклами:** Stripe и LemonSqueezy webhooks откриват абонаменти за спонсорски реклами чрез метаданни и ги насочват към отделни манипулатори за активиране, анулиране и подновяване на реклами.
- **Грациозно обработване на грешки:** Грешките при изпращане на имейли се улавят и регистрират, но не карат уебкукичката да връща грешка. Уеб кукичката винаги потвърждава получаването, за да предотврати повторни опити на доставчика.
