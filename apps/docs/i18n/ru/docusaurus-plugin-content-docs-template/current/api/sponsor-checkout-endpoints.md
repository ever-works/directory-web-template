---
id: sponsor-checkout-endpoints
title: "Справочник по API спонсорской рекламы и оформления заказов"
sidebar_label: "Спонсорская реклама и оформление заказа"
sidebar_position: 59
---

# Справочник по API спонсорской рекламы и оформления заказов

## Обзор

Конечные точки спонсорской рекламы управляют полным жизненным циклом размещения спонсируемой рекламы в элементах каталога. Это включает в себя просмотр активных объявлений, подачу новых запросов на спонсорство, управление рекламой, принадлежащей пользователям, обработку платежей через нескольких поставщиков (Stripe, LemonSqueezy, Polar), а также обработку отмены и продления. Поток оформления заказа поддерживает еженедельные и ежемесячные интервалы выставления счетов.

## Конечные точки

### ПОЛУЧИТЬ /api/sponsor-ads

Возвращает список активных в данный момент спонсорских объявлений с данными о связанных с ними элементах для публичного показа.

**Запрос**

|Параметр|Тип|В|Описание|
| --------- | ------- | ----- | ------------------------------------------------ |
|предел|целое число|запрос|Максимальное количество возвращаемых спонсорских объявлений (по умолчанию: 10, максимум: 50).|

**Ответ**

```typescript
{
  success: true;
  data: Array<{
    sponsor: {
      id: string;
      itemSlug: string;
      status: string;
      interval: string;
    };
    item: {
      name: string;
      slug: string;
      description: string;
      icon_url: string;
      category: string;
    } | null;
  }>;
}
```

**Пример**

```typescript
const response = await fetch("/api/sponsor-ads?limit=5");
const { data: sponsoredItems } = await response.json();
```

### ПОЛУЧИТЬ /api/sponsor-ads/user

Возвращает постраничный список спонсорских объявлений, отправленных авторизованным пользователем.

**Запрос**

|Параметр|Тип|В|Описание|
| --------- | ------- | ----- | --------------------------------------------------------------------------------------- |
|страница|целое число|запрос|Номер страницы (по умолчанию: 1)|
|предел|целое число|запрос|Элементов на странице (по умолчанию: 10)|
|статус|строка|запрос|Фильтр: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"`|
|интервал|строка|запрос|Фильтр: `"weekly"`, `"monthly"`|
|поиск|строка|запрос|Поисковый запрос|

**Ответ**

```typescript
{
  success: true;
  data: Array<SponsorAd>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

**Пример**

```typescript
const response = await fetch("/api/sponsor-ads/user?status=active&page=1");
const { data, pagination } = await response.json();
```

### POST /api/sponsor-ads/user

Создает новую отправку спонсорской рекламы для аутентифицированного пользователя. Отправка начинается в состоянии ожидания и ожидает одобрения администратора.

**Запрос**

```typescript
{
  itemSlug: string;          // Slug of the item to sponsor (required)
  itemName: string;          // Name of the item (required)
  itemIconUrl?: string;      // Icon URL
  itemCategory?: string;     // Category of the item
  itemDescription?: string;  // Description (max 500 chars)
  interval: "weekly" | "monthly"; // Billing interval (required)
}
```

**Ответ**

```typescript
{
  success: true;
  data: SponsorAd;
  message: "Sponsor ad submission created successfully. Pending admin approval.";
}
```

**Пример**

```typescript
const response = await fetch("/api/sponsor-ads/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    itemSlug: "my-awesome-tool",
    itemName: "My Awesome Tool",
    interval: "monthly",
  }),
});
```

### ПОЛУЧИТЕ /api/sponsor-ads/user/stats

Возвращает статистику спонсорской рекламы пользователя, прошедшего проверку подлинности, включая количество по статусу, интервальное распределение и показатели дохода.

**Запрос**

Никаких параметров не требуется. Аутентификация через сеансовый cookie.

**Ответ**

```typescript
{
  success: true;
  stats: {
    overview: {
      total: number;
      pendingPayment: number;
      pending: number;
      active: number;
      rejected: number;
      expired: number;
      cancelled: number;
    }
    byInterval: {
      weekly: number;
      monthly: number;
    }
    revenue: {
      totalRevenue: number; // In minor currency units (cents)
      weeklyRevenue: number;
      monthlyRevenue: number;
    }
  }
}
```

**Пример**

```typescript
const response = await fetch("/api/sponsor-ads/user/stats");
const { stats } = await response.json();
console.log(
  `Active ads: ${stats.overview.active}, Total revenue: ${stats.revenue.totalRevenue}`,
);
```

### ПОЛУЧИТЬ `/api/sponsor-ads/user/{id}`

Возвращает одно спонсорское объявление, принадлежащее авторизованному пользователю.

**Запрос**

|Параметр|Тип|В|Описание|
| --------- | ------ | ---- | ------------------------ |
|идентификатор|строка|путь|Идентификатор объявления спонсора (обязательно)|

**Ответ**

```typescript
{
  success: true;
  data: SponsorAd;
}
```

### POST/api/sponsor-ads/checkout

Создает сеанс оформления заказа для одобренного спонсорского объявления. Спонсорское объявление должно иметь статус `pending_payment` и принадлежать авторизованному пользователю.

**Запрос**

```typescript
{
  sponsorAdId: string;      // ID of the approved sponsor ad (required)
  successUrl?: string;      // Redirect URL after successful payment
  cancelUrl?: string;       // Redirect URL after cancelled payment
}
```

**Ответ**

```typescript
{
  success: true;
  data: {
    checkoutId: string; // Provider checkout session ID
    checkoutUrl: string; // URL to redirect user to for payment
    provider: string; // "stripe", "lemonsqueezy", or "polar"
  }
  message: "Checkout session created successfully";
}
```

**Пример**

```typescript
const response = await fetch("/api/sponsor-ads/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sponsorAdId: "ad-123",
    successUrl: "https://myapp.com/sponsor/success?sponsorAdId=ad-123",
    cancelUrl: "https://myapp.com/sponsor?cancelled=true",
  }),
});

const { data } = await response.json();
window.location.href = data.checkoutUrl; // Redirect to payment
```

### ПОСТ `/api/sponsor-ads/user/{id}/cancel`

Отменяет спонсорскую рекламу, принадлежащую авторизованному пользователю. Отменять рекламу можно только со статусом `pending_payment`, `pending` или `active`.

**Запрос**

```typescript
{
  cancelReason?: string;   // Optional reason for cancellation (max 500 chars)
}
```

**Ответ**

```typescript
{
  success: true;
  data: SponsorAd; // The cancelled sponsor ad
  message: "Sponsor ad cancelled successfully";
}
```

**Пример**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/cancel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cancelReason: "No longer needed" }),
});
```

### ПОСТ `/api/sponsor-ads/user/{id}/renew`

Создает сеанс оформления заказа для продления активной или истекшей спонсорской рекламы. Продлевать можно только объявления со статусом `active` или `expired`.

**Запрос**

```typescript
{
  successUrl?: string;     // Redirect URL after successful payment
  cancelUrl?: string;      // Redirect URL after cancelled payment
}
```

**Ответ**

```typescript
{
  success: true;
  data: {
    checkoutId: string;
    checkoutUrl: string;
    provider: string;
  }
  message: "Renewal checkout session created successfully";
}
```

**Пример**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/renew", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    successUrl:
      "https://myapp.com/sponsor/success?sponsorAdId=ad-123&renewal=true",
  }),
});
const { data } = await response.json();
window.location.href = data.checkoutUrl;
```

## Аутентификация

|Конечная точка|Требуется авторизация|
| ---------------------------------------- | ------------------------------------- |
|ПОЛУЧИТЬ /api/sponsor-ads|Общественный|
|ПОЛУЧИТЬ /api/sponsor-ads/user|Требуется сеанс|
|POST /api/sponsor-ads/user|Требуется сеанс|
|ПОЛУЧИТЕ /api/sponsor-ads/user/stats|Требуется сеанс|
|`GET /api/sponsor-ads/user/{id}`|Требуется сеанс (владение подтверждено)|
|POST/api/sponsor-ads/checkout|Требуется сеанс (владение подтверждено)|
|`POST /api/sponsor-ads/user/{id}/cancel`|Требуется сеанс (владение подтверждено)|
|`POST /api/sponsor-ads/user/{id}/renew`|Требуется сеанс (владение подтверждено)|

Все конечные точки, специфичные для пользователя, проверяют право собственности: попытка получить доступ к рекламному объявлению спонсора другого пользователя возвращает `404` (для GET) или `403` (для действий).

## Реакции на ошибки

|Статус|Описание|
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 400    |Неверный ввод, двойная отправка, неотменяемый/невозобновляемый статус, отсутствующая конфигурация цены или неверный формат JSON.|
| 401    |Неавторизованный – нет аутентифицированного сеанса|
| 403    |Запрещено – пользователю не принадлежит спонсорское объявление.|
| 404    |Спонсорское объявление не найдено|
| 500    |Внутренняя ошибка сервера – сбой платежной системы или ошибка базы данных.|

## Ограничение скорости

Нет явного ограничения скорости. URL-адреса перенаправления в конечных точках оформления заказа и продления проверяются на соответствие домену приложения, чтобы предотвратить открытые уязвимости перенаправления. Активный поставщик платежей определяется переменной среды `NEXT_PUBLIC_PAYMENT_PROVIDER` (по умолчанию — Stripe).

## Связанные конечные точки

- [Конечные точки пользовательских платежей](./user-pay-endpoints) – история платежей пользователей и управление подписками.
