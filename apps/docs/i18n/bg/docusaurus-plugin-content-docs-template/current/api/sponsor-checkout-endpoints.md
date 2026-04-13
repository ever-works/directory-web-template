---
id: sponsor-checkout-endpoints
title: "Справочник за API за реклами на спонсори и Checkout"
sidebar_label: "Спонсорирайте реклами и плащане"
sidebar_position: 59
---

# Справочник за API за реклами на спонсори и Checkout

## Преглед

Крайните точки на спонсорските реклами управляват пълния жизнен цикъл на спонсорирани рекламни разположения в елементи от директория. Това включва разглеждане на активни реклами, подаване на нови заявки за спонсорство, управление на реклами, притежавани от потребителите, обработка на плащания чрез множество доставчици (Stripe, LemonSqueezy, Polar) и обработка на анулации и подновявания. Потокът на касата поддържа седмични и месечни интервали на фактуриране.

## Крайни точки

### ВЗЕМЕТЕ /api/sponsor-ads

Връща списък с текущо активни реклами на спонсори със свързаните с тях данни за артикули за публично показване.

**Заявка**

|Параметър|Тип|в|Описание|
| --------- | ------- | ----- | ------------------------------------------------ |
|лимит|цяло число|заявка|Максимален брой спонсорирани реклами за връщане (по подразбиране: 10, максимум: 50)|

**Отговор**

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

### ВЗЕМЕТЕ /api/sponsor-ads/user

Връща списък със страници със спонсорски реклами, изпратени от удостоверения потребител.

**Заявка**

|Параметър|Тип|в|Описание|
| --------- | ------- | ----- | --------------------------------------------------------------------------------------- |
|страница|цяло число|заявка|Номер на страница (по подразбиране: 1)|
|лимит|цяло число|заявка|Елементи на страница (по подразбиране: 10)|
|състояние|низ|заявка|Филтър: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"`|
|интервал|низ|заявка|Филтър: `"weekly"`, `"monthly"`|
|търсене|низ|заявка|Термин за търсене|

**Отговор**

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

### ПУБЛИКУВАЙТЕ /api/sponsor-ads/user

Създава ново изпращане на спонсорска реклама за удостоверения потребител. Изпращането започва в чакащо състояние, чакащо одобрение от администратора.

**Заявка**

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

**Отговор**

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

### ВЗЕМЕТЕ /api/sponsor-ads/user/stats

Връща статистически данни за спонсорираните реклами на удостоверения потребител, включително броя по статус, интервално разпределение и показатели за приходи.

**Заявка**

Не са необходими параметри. Удостоверяване чрез сесийна бисквитка.

**Отговор**

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

### ВЗЕМЕТЕ `/api/sponsor-ads/user/{id}`

Връща една реклама на спонсор, притежавана от удостоверения потребител.

**Заявка**

|Параметър|Тип|в|Описание|
| --------- | ------ | ---- | ------------------------ |
|id|низ|път|ID на рекламата на спонсор (задължително)|

**Отговор**

```typescript
{
  success: true;
  data: SponsorAd;
}
```

### ПУБЛИКУВАЙТЕ /api/sponsor-ads/checkout

Създава сесия за плащане за одобрена реклама на спонсор. Рекламата на спонсора трябва да бъде в статус `pending_payment` и да е собственост на удостоверения потребител.

**Заявка**

```typescript
{
  sponsorAdId: string;      // ID of the approved sponsor ad (required)
  successUrl?: string;      // Redirect URL after successful payment
  cancelUrl?: string;       // Redirect URL after cancelled payment
}
```

**Отговор**

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

### ПУБЛИКУВАНЕ `/api/sponsor-ads/user/{id}/cancel`

Анулира реклама на спонсор, собственост на удостоверения потребител. Може да анулира само реклами със статус `pending_payment`, `pending` или `active`.

**Заявка**

```typescript
{
  cancelReason?: string;   // Optional reason for cancellation (max 500 chars)
}
```

**Отговор**

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

### ПУБЛИКУВАНЕ `/api/sponsor-ads/user/{id}/renew`

Създава сесия за плащане за подновяване на активна или изтекла реклама на спонсор. Могат да се подновяват само обяви със статус `active` или `expired`.

**Заявка**

```typescript
{
  successUrl?: string;     // Redirect URL after successful payment
  cancelUrl?: string;      // Redirect URL after cancelled payment
}
```

**Отговор**

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

## Удостоверяване

|Крайна точка|Изисква се удостоверяване|
| ---------------------------------------- | ------------------------------------- |
|ВЗЕМЕТЕ /api/sponsor-ads|Обществен|
|ВЗЕМЕТЕ /api/sponsor-ads/user|Изисква се сесия|
|ПУБЛИКУВАЙТЕ /api/sponsor-ads/user|Изисква се сесия|
|ВЗЕМЕТЕ /api/sponsor-ads/user/stats|Изисква се сесия|
|`GET /api/sponsor-ads/user/{id}`|Изисква се сесия (собствеността е потвърдена)|
|ПУБЛИКУВАЙТЕ /api/sponsor-ads/checkout|Изисква се сесия (собствеността е потвърдена)|
|`POST /api/sponsor-ads/user/{id}/cancel`|Изисква се сесия (собствеността е потвърдена)|
|`POST /api/sponsor-ads/user/{id}/renew`|Изисква се сесия (собствеността е потвърдена)|

Всички крайни точки, специфични за потребителя, потвърждават собствеността - опитът за достъп до реклама на спонсор на друг потребител връща `404` (за GET) или `403` (за действия).

## Отговори за грешки

|Статус|Описание|
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 400    |Невалидно въвеждане, дублирано подаване, неотменимо/неподновяемо състояние, липсваща конфигурация на цените или неправилно образуван JSON|
| 401    |Неоторизиран -- няма удостоверена сесия|
| 403    |Забранено -- потребителят не притежава рекламата на спонсора|
| 404    |Рекламата на спонсор не е намерена|
| 500    |Вътрешна грешка в сървъра -- грешка на доставчика на плащане или грешка в базата данни|

## Ограничаване на скоростта

Няма изрично ограничаване на скоростта. URL адресите за пренасочване в крайните точки за плащане и подновяване се валидират спрямо домейна на приложението, за да се предотвратят уязвимости при отворено пренасочване. Активният доставчик на плащания се определя от променливата на средата `NEXT_PUBLIC_PAYMENT_PROVIDER` (по подразбиране е Stripe).

## Свързани крайни точки

- [Потребителски крайни точки за плащане](./user-payment-endpoints) – История на потребителските плащания и управление на абонаментите
