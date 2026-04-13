---
id: sponsor-ads-endpoints
title: "Крайни точки на API за спонсориране на реклами"
sidebar_label: "Спонсор реклами"
sidebar_position: 16
---

# Крайни точки на API за спонсориране на реклами

Sponsor Ads API управлява пълния жизнен цикъл на спонсорираните реклами: създаване, плащане, подновяване, анулиране и статистика. Той се интегрира с множество доставчици на плащания (Stripe, LemonSqueezy, Polar) за фактуриране.

**Изходни файлове:**
- `template/app/api/sponsor-ads/route.ts`
- `template/app/api/sponsor-ads/checkout/route.ts`
- `template/app/api/sponsor-ads/user/route.ts`
- `template/app/api/sponsor-ads/user/[id]/route.ts`
- `template/app/api/sponsor-ads/user/[id]/cancel/route.ts`
- `template/app/api/sponsor-ads/user/[id]/renew/route.ts`
- `template/app/api/sponsor-ads/user/stats/route.ts`

## Крайна точка Резюме

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|ВЗЕМЕТЕ|`/api/sponsor-ads`|Няма|Вземете активни реклами на спонсори (обществени)|
|ПУБЛИКУВАНЕ|`/api/sponsor-ads/checkout`|Сесия|Създайте сесия за плащане|
|ВЗЕМЕТЕ|`/api/sponsor-ads/user`|Сесия|Избройте рекламите на спонсори на потребителя|
|ПУБЛИКУВАНЕ|`/api/sponsor-ads/user`|Сесия|Изпратете нова реклама на спонсор|
|ВЗЕМЕТЕ|`/api/sponsor-ads/user/{id}`|Сесия|Вземете единична спонсорска реклама|
|ПУБЛИКУВАНЕ|`/api/sponsor-ads/user/{id}/cancel`|Сесия|Отменете реклама на спонсор|
|ПУБЛИКУВАНЕ|`/api/sponsor-ads/user/{id}/renew`|Сесия|Подновете реклама на спонсор|
|ВЗЕМЕТЕ|`/api/sponsor-ads/user/stats`|Сесия|Вземете статистика за рекламите на потребителя|

---

## GET `/api/sponsor-ads`

Returns active sponsor ads with associated item data for public display. **No authentication required.**

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Max ads to return (1-50) |

### Response: 200

```json
{
  "success": true,
  "data": [
    {
      "sponsor": {
        "id": "sp_123",
        "itemSlug": "featured-tool",
        "status": "active",
        "interval": "monthly"
      },
      "item": {
        "name": "Featured Tool",
        "slug": "featured-tool",
        "description": "A great tool",
        "icon_url": "https://example.com/icon.png",
        "category": "productivity"
      }
    }
  ]
}
```

---

## ПУБЛИКУВАНЕ `/api/sponsor-ads/checkout`

Създава сесия за проверка на плащане за одобрена реклама на спонсор. Поддържа доставчици на Stripe, LemonSqueezy и Polar.

### Тяло на заявката

|Поле|Тип|Задължително|Описание|
|-------|------|----------|-------------|
|`sponsorAdId`|низ|**Да**|ID на одобрената спонсорска реклама|
|`successUrl`|низ|не|URL за пренасочване след успешно плащане|
|`cancelUrl`|низ|не|URL за пренасочване след отменено плащане|

### Сигурност: Отворете предотвратяване на пренасочване

URL адресите за пренасочване се проверяват спрямо произхода на приложението, за да се предотвратят отворени атаки за пренасочване:

```ts
function validateRedirectUrl(url, allowedOrigin) {
  const urlObj = new URL(url, allowedOrigin);
  const allowedUrlObj = new URL(allowedOrigin);
  // Only allow same protocol, hostname, and port
  return urlObj.protocol === allowedUrlObj.protocol &&
    urlObj.hostname === allowedUrlObj.hostname &&
    urlObj.port === allowedUrlObj.port;
}
```

Невалидните URL адреси се заменят тихо с безопасни настройки по подразбиране.

### Отговор: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_live_abc123",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_abc123",
    "provider": "stripe"
  },
  "message": "Checkout session created successfully"
}
```

### Отговори за грешки

|Статус|Описание|
|--------|-------------|
| 400 |Липсващ идентификатор на реклама на спонсор, реклама не е в статус `pending_payment` или липсва конфигурация на цената|
| 401 |Не е удостоверено|
| 403 |Потребителят не притежава тази реклама на спонсор|
| 404 |Рекламата на спонсор не е намерена|

---

## GET `/api/sponsor-ads/user`

Returns a paginated list of sponsor ads belonging to the authenticated user.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 10 | Items per page |
| `status` | string | No | -- | Filter: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| `interval` | string | No | -- | Filter by billing interval |
| `search` | string | No | -- | Text search filter |

Query parameters are validated using the `querySponsorAdsSchema` Zod schema.

### Response: 200

```json
{
  "success": true,
  "data": [
    {
      "id": "sp_123",
      "itemSlug": "my-tool",
      "status": "active",
      "interval": "monthly"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## ПУБЛИКУВАНЕ `/api/sponsor-ads/user`

Създава ново изпращане на реклама за спонсор. Рекламата започва в чакащо състояние, чакащо одобрение от администратора.

### Тяло на заявката

|Поле|Тип|Задължително|Описание|
|-------|------|----------|-------------|
|`itemSlug`|низ|**Да**|Прехвърляне на артикула към спонсор|
|`itemName`|низ|**Да**|Екранно име на артикула|
|`itemIconUrl`|низ|не|URL адрес на икона|
|`itemCategory`|низ|не|Категория артикул|
|`itemDescription`|низ|не|Описание (макс. 500 знака)|
|`interval`|`"weekly"` или `"monthly"`|**Да**|Интервал на абонамента|

### Отговор: 201 Създаден

```json
{
  "success": true,
  "data": {
    "id": "sp_new123",
    "status": "pending",
    "interval": "monthly"
  },
  "message": "Sponsor ad submission created successfully. Pending admin approval."
}
```

### 400 -- Дублиране на подаване

```json
{
  "success": false,
  "error": "You already have an active sponsor ad"
}
```

---

## GET `/api/sponsor-ads/user/{id}`

Retrieves a single sponsor ad owned by the authenticated user. Returns 404 if the ad does not exist or belongs to another user (to prevent information leakage).

---

## ПУБЛИКУВАНЕ `/api/sponsor-ads/user/{id}/cancel`

Анулира реклама на спонсор. Само реклами със статус `pending_payment`, `pending` или `active` могат да бъдат анулирани.

### Тяло на заявката

|Поле|Тип|Задължително|Описание|
|-------|------|----------|-------------|
|`cancelReason`|низ|не|Причина за анулиране (макс. 500 знака)|

### Отговор: 200

```json
{
  "success": true,
  "data": { "id": "sp_123", "status": "cancelled" },
  "message": "Sponsor ad cancelled successfully"
}
```

### Отговори за грешки

|Статус|Описание|
|--------|-------------|
| 400 |Не може да се анулира обява с текущо състояние|
| 403 |Потребителят не притежава тази реклама на спонсор|
| 404 |Рекламата на спонсор не е намерена|

---

## POST `/api/sponsor-ads/user/{id}/renew`

Creates a checkout session to renew an active or expired sponsor ad. Only ads with status `active` or `expired` can be renewed.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `successUrl` | string | No | Redirect URL after payment |
| `cancelUrl` | string | No | Redirect URL on cancellation |

### Response: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_renewal_abc",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_renewal_abc",
    "provider": "stripe"
  },
  "message": "Renewal checkout session created successfully"
}
```

---

## ВЗЕМЕТЕ `/api/sponsor-ads/user/stats`

Връща статистически данни за спонсорираните реклами на удостоверения потребител, включително разбивка на състоянието, интервално разпределение и показатели за приходи.

### Отговор: 200

```json
{
  "success": true,
  "stats": {
    "overview": {
      "total": 15,
      "pendingPayment": 2,
      "pending": 3,
      "active": 5,
      "rejected": 1,
      "expired": 3,
      "cancelled": 1
    },
    "byInterval": {
      "weekly": 8,
      "monthly": 7
    },
    "revenue": {
      "totalRevenue": 45000,
      "weeklyRevenue": 20000,
      "monthlyRevenue": 25000
    }
  }
}
```

Стойностите на приходите са във **малки валутни единици** (например центове за USD).

---

## Payment Provider Configuration

The active payment provider is determined by `NEXT_PUBLIC_PAYMENT_PROVIDER` (defaults to `"stripe"`). Each provider requires its own set of price/variant ID environment variables:

| Provider | Weekly Price Env Var | Monthly Price Env Var |
|----------|---------------------|-----------------------|
| Stripe | `STRIPE_SPONSOR_WEEKLY_PRICE_ID` | `STRIPE_SPONSOR_MONTHLY_PRICE_ID` |
| LemonSqueezy | `LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID` | `LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID` |
| Polar | `POLAR_SPONSOR_WEEKLY_PRICE_ID` | `POLAR_SPONSOR_MONTHLY_PRICE_ID` |

---

## Свързани изходни файлове

|Файл|Цел|
|------|---------|
|`template/app/api/sponsor-ads/route.ts`|Крайна точка на публичните активни реклами|
|`template/app/api/sponsor-ads/checkout/route.ts`|Създаване на сесия за плащане|
|`template/app/api/sponsor-ads/user/route.ts`|Списък с потребителски реклами и създаване|
|`template/app/api/sponsor-ads/user/[id]/route.ts`|Извличане на единична реклама|
|`template/app/api/sponsor-ads/user/[id]/cancel/route.ts`|Анулиране на реклама|
|`template/app/api/sponsor-ads/user/[id]/renew/route.ts`|Подновяване на рекламата|
|`template/app/api/sponsor-ads/user/stats/route.ts`|Потребителска статистика|
|`template/lib/services/sponsor-ad.service.ts`|Слой на бизнес логиката|
|`template/lib/validations/sponsor-ad.ts`|Схеми за валидиране на Zod|
|`template/lib/payment/config/payment-provider-manager.ts`|Фабрика за доставчик на плащания|
