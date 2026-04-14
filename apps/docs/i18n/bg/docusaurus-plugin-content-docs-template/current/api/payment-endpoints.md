---
id: payment-endpoints
title: Крайни точки на API за плащане
sidebar_label: Крайни точки за плащане
sidebar_position: 3
---

# Крайни точки на API за плащане

Шаблонът поддържа четири доставчика на плащания: **Stripe**, **Lemon Squeezy**, **Polar** и **Solidgate**. Всеки доставчик има свой собствен набор от API маршрути за плащане, управление на абонаменти и обработка на webhook. Обща група `/api/payment` предоставя заявки за абонамент, независими от доставчика.

## Ивица (`/api/stripe`)

Stripe е най-пълната интеграция с функции със 17 манипулатора на маршрути, обхващащи плащане, абонаменти, методи на плащане, намерения за настройка и продукти.

### Плащане

|Метод|Пътека|Описание|
|--------|------|-------------|
|`POST`|`/api/stripe/checkout`|Създайте Stripe Checkout сесия|

### Абонаменти

|Метод|Пътека|Описание|
|--------|------|-------------|
|`GET`|`/api/stripe/subscription`|Вземете активен абонамент на текущия потребител|
|`POST`|`/api/stripe/subscription`|Създайте нов абонамент|
|`GET`|`/api/stripe/subscriptions`|Избройте всички потребителски абонаменти|
|`POST`|`/api/stripe/subscription/[subscriptionId]/cancel`|Отказ от абонамент|
|`POST`|`/api/stripe/subscription/[subscriptionId]/reactivate`|Повторно активиране на анулиран абонамент|
|`POST`|`/api/stripe/subscription/[subscriptionId]/update`|Актуализиране на абонамент (промяна на план)|
|`POST`|`/api/stripe/subscription/portal`|Създайте сесия на Stripe портал за клиенти|

### Начини на плащане

|Метод|Пътека|Описание|
|--------|------|-------------|
|`GET`|`/api/stripe/payment-methods/list`|Избройте запазени методи на плащане|
|`POST`|`/api/stripe/payment-methods/create`|Добавете нов метод на плащане|
|`PUT`|`/api/stripe/payment-methods/update`|Актуализирайте метода на плащане по подразбиране|
|`DELETE`|`/api/stripe/payment-methods/delete`|Премахнете метод на плащане|
|`GET`|`/api/stripe/payment-methods/[id]`|Получете подробности за начина на плащане|

### Намерения за настройка

|Метод|Пътека|Описание|
|--------|------|-------------|
|`POST`|`/api/stripe/setup-intent`|Създайте намерение за настройка за запазване на метода на плащане|
|`GET`|`/api/stripe/setup-intent/[id]`|Получете състояние на намерение за настройка|

### Намерения за плащане

|Метод|Пътека|Описание|
|--------|------|-------------|
|`POST`|`/api/stripe/payment-intent`|Създайте намерение за еднократно плащане|

### Продукти

|Метод|Пътека|Описание|
|--------|------|-------------|
|`GET`|`/api/stripe/products`|Избройте наличните продукти/цени на Stripe|

### Уеб кукичка

|Метод|Пътека|Описание|
|--------|------|-------------|
|`POST`|`/api/stripe/webhook`|Манипулатор на събития Stripe webhook|

Манипулаторът за уеб кукичка Stripe обработва събития като:
- `checkout.session.completed` - Завършване на плащането
- `customer.subscription.created` - Нов абонамент
- `customer.subscription.updated` - Промени в абонамента
- `customer.subscription.deleted` - Анулиране на абонамент
- `invoice.payment_succeeded` - Успешно плащане
- `invoice.payment_failed` - Неуспешно плащане

## Lemon Squeezy (`/api/lemonsqueezy`)

Lemon Squeezy предоставя по-прост модел на абонамент със 7 крайни точки.

|Метод|Пътека|Описание|
|--------|------|-------------|
|`POST`|`/api/lemonsqueezy/checkout`|Създайте каса Lemon Squeezy|
|`GET`|`/api/lemonsqueezy/list`|Списък на потребителските абонаменти|
|`POST`|`/api/lemonsqueezy/cancel`|Отказ от абонамент|
|`POST`|`/api/lemonsqueezy/reactivate`|Повторно активиране на анулиран абонамент|
|`POST`|`/api/lemonsqueezy/update`|Актуализирайте подробностите за абонамента|
|`POST`|`/api/lemonsqueezy/update-plan`|Промяна на абонаментен план|
|`POST`|`/api/lemonsqueezy/webhook`|Обработчик на уеб кукичка Lemon Squeezy|

### Събития за уеб кукичка

Уеб кукичката Lemon Squeezy обработва:
- `subscription_created` - Нов абонамент
- `subscription_updated` - Промени в плана
- `subscription_cancelled` - Анулиране
- `subscription_payment_success` - Потвърждение на плащането
- `subscription_payment_failed` - Неуспешно плащане

## Полярно (`/api/polar`)

Polar предоставя 5 крайни точки за плащане и управление на абонаменти.

|Метод|Пътека|Описание|
|--------|------|-------------|
|`POST`|`/api/polar/checkout`|Създайте сесия за плащане на Polar|
|`POST`|`/api/polar/subscription/[subscriptionId]/cancel`|Отказ от абонамент|
|`POST`|`/api/polar/subscription/[subscriptionId]/reactivate`|Реактивирайте абонамента|
|`POST`|`/api/polar/subscription/portal`|Достъп до портала за абонамент|
|`POST`|`/api/polar/webhook`|Манипулатор на Polar webhook|

## Solidgate (`/api/solidgate`)

Solidgate е най-минималната интеграция с 2 крайни точки.

|Метод|Пътека|Описание|
|--------|------|-------------|
|`POST`|`/api/solidgate/checkout`|Създайте Solidgate каса|
|`POST`|`/api/solidgate/webhook`|Обработчик на уеб кукичка на Solidgate|

## Общо плащане (`/api/payment`)

Независими от доставчика крайни точки за плащане за управление на абонаменти, независимо от основния доставчик на плащане.

|Метод|Пътека|Описание|
|--------|------|-------------|
|`GET`|`/api/payment/[subscriptionId]`|Вземете подробности за абонамента по ID|
|`GET`|`/api/payment/account`|Вземете платежна сметка за текущия потребител|
|`GET`|`/api/payment/account/[userId]`|Вземете сметка за плащане за конкретен потребител (администратор)|

## Сигурност на Webhook

Всички крайни точки на webhook изпълняват специфична за доставчика проверка на подписа:

### Ивица

Stripe webhooks проверяват заглавката `stripe-signature` с помощта на променливата на средата `STRIPE_WEBHOOK_SECRET` и метода `stripe.webhooks.constructEvent()`.

### Lemon Squeezy

Lemon Squeezy webhooks проверяват заглавката `x-signature` с помощта на HMAC-SHA256 с `LEMONSQUEEZY_WEBHOOK_SECRET`.

### Полярен

Polar webhooks проверяват подписите на заявките с помощта на `POLAR_WEBHOOK_SECRET`.

### Solidgate

Solidgate webhooks използват вградената проверка на подписа на техния SDK с `SOLIDGATE_SECRET_KEY`.

## Променливи на средата

### Ивица

|Променлива|Описание|
|----------|-------------|
|`STRIPE_SECRET_KEY`|Stripe API таен ключ|
|`STRIPE_PUBLISHABLE_KEY`|Ключ за публикуване на лента (от страна на клиента)|
|`STRIPE_WEBHOOK_SECRET`|Тайно подписване на уеб кукичка|

### Lemon Squeezy

|Променлива|Описание|
|----------|-------------|
|`LEMONSQUEEZY_API_KEY`|Lemon Squeezy API ключ|
|`LEMONSQUEEZY_STORE_ID`|Идентификатор на магазина|
|`LEMONSQUEEZY_WEBHOOK_SECRET`|Тайно подписване на уеб кукичка|

### Полярен

|Променлива|Описание|
|----------|-------------|
|`POLAR_ACCESS_TOKEN`|Polar API токен за достъп|
|`POLAR_WEBHOOK_SECRET`|Тайно подписване на уеб кукичка|
|`POLAR_ORGANIZATION_ID`|Идентификатор на организацията|

### Solidgate

|Променлива|Описание|
|----------|-------------|
|`SOLIDGATE_MERCHANT_ID`|Идентификатор на търговеца|
|`SOLIDGATE_SECRET_KEY`|API таен ключ|

## Изисквания за удостоверяване

|Тип крайна точка|Изисква се удостоверяване|
|--------------|---------------|
|Създаване на касата|Да (удостоверен потребител)|
|Управление на абонамента|Да (собственик на абонамент)|
|Управление на метода на плащане|Да (клиент на Stripe)|
|Списък с продукти|Обществено (продукти Stripe)|
|Манипулатори на уеб кукички|Проверка на подпис (без сесия)|
|Общи заявки за плащане|Да (собственик на акаунт или администратор)|
