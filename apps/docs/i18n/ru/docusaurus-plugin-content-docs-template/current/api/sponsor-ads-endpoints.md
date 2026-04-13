---
id: sponsor-ads-endpoints
title: "Конечные точки API спонсорской рекламы"
sidebar_label: "Спонсорские объявления"
sidebar_position: 16
---

# Конечные точки API спонсорской рекламы

API спонсорской рекламы управляет полным жизненным циклом спонсируемой рекламы: созданием, оплатой, продлением, отменой и статистикой. Он интегрируется с несколькими поставщиками платежей (Stripe, LemonSqueezy, Polar) для выставления счетов.

**Исходные файлы:**
- `template/app/api/sponsor-ads/route.ts`
- `template/app/api/sponsor-ads/checkout/route.ts`
- `template/app/api/sponsor-ads/user/route.ts`
- `template/app/api/sponsor-ads/user/[id]/route.ts`
- `template/app/api/sponsor-ads/user/[id]/cancel/route.ts`
- `template/app/api/sponsor-ads/user/[id]/renew/route.ts`
- `template/app/api/sponsor-ads/user/stats/route.ts`

## Сводка конечных точек

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|ПОЛУЧИТЬ|`/api/sponsor-ads`|Нет|Получите активную спонсорскую рекламу (публичную)|
|ПОСТ|`/api/sponsor-ads/checkout`|Сессия|Создать сеанс оформления заказа|
|ПОЛУЧИТЬ|`/api/sponsor-ads/user`|Сессия|Получение списка спонсорских объявлений пользователя|
|ПОСТ|`/api/sponsor-ads/user`|Сессия|Подать новое объявление спонсора|
|ПОЛУЧИТЬ|`/api/sponsor-ads/user/{id}`|Сессия|Получить рекламу от одного спонсора|
|ПОСТ|`/api/sponsor-ads/user/{id}/cancel`|Сессия|Отменить рекламу спонсора|
|ПОСТ|`/api/sponsor-ads/user/{id}/renew`|Сессия|Продлить спонсорскую рекламу|
|ПОЛУЧИТЬ|`/api/sponsor-ads/user/stats`|Сессия|Получить статистику рекламы пользователя|

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

## ПОСТ `/api/sponsor-ads/checkout`

Создает сеанс оплаты для одобренного спонсорского объявления. Поддерживает поставщиков Stripe, LemonSqueezy и Polar.

### Тело запроса

|Поле|Тип|Требуется|Описание|
|-------|------|----------|-------------|
|`sponsorAdId`|строка|**Да**|Идентификатор одобренного спонсорского объявления|
|`successUrl`|строка|Нет|URL-адрес перенаправления после успешной оплаты|
|`cancelUrl`|строка|Нет|URL-адрес перенаправления после отмены платежа|

### Безопасность: предотвращение открытого перенаправления

URL-адреса перенаправления проверяются на соответствие источнику приложения, чтобы предотвратить атаки с открытым перенаправлением:

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

Недействительные URL-адреса автоматически заменяются безопасными значениями по умолчанию.

### Ответ: 200

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

### Реакции на ошибки

|Статус|Описание|
|--------|-------------|
| 400 |Отсутствует идентификатор спонсорского объявления, объявление не в статусе `pending_payment` или отсутствует конфигурация цены.|
| 401 |Не аутентифицирован|
| 403 |Пользователь не является владельцем этого спонсорского объявления|
| 404 |Спонсорское объявление не найдено|

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

## ПОСТ `/api/sponsor-ads/user`

Создает новое объявление спонсора. Объявление начинается в состоянии ожидания и ожидает одобрения администратора.

### Тело запроса

|Поле|Тип|Требуется|Описание|
|-------|------|----------|-------------|
|`itemSlug`|строка|**Да**|Ссылка на предмет, спонсируемый|
|`itemName`|строка|**Да**|Отображаемое имя элемента|
|`itemIconUrl`|строка|Нет|URL-адрес значка|
|`itemCategory`|строка|Нет|Категория товара|
|`itemDescription`|строка|Нет|Описание (максимум 500 символов)|
|`interval`|`"weekly"` или `"monthly"`|**Да**|Интервал подписки|

### Ответ: 201 Создано

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

### 400 – двойная отправка

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

## ПОСТ `/api/sponsor-ads/user/{id}/cancel`

Отменяет спонсорскую рекламу. Отменить можно только объявления со статусом `pending_payment`, `pending` или `active`.

### Тело запроса

|Поле|Тип|Требуется|Описание|
|-------|------|----------|-------------|
|`cancelReason`|строка|Нет|Причина отмены (максимум 500 символов)|

### Ответ: 200

```json
{
  "success": true,
  "data": { "id": "sp_123", "status": "cancelled" },
  "message": "Sponsor ad cancelled successfully"
}
```

### Реакции на ошибки

|Статус|Описание|
|--------|-------------|
| 400 |Невозможно отменить объявление с текущим статусом|
| 403 |Пользователь не является владельцем этого спонсорского объявления|
| 404 |Спонсорское объявление не найдено|

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

## ПОЛУЧИТЬ `/api/sponsor-ads/user/stats`

Возвращает статистику спонсорских объявлений аутентифицированного пользователя, включая разбивку по статусу, распределение по интервалам и показатели дохода.

### Ответ: 200

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

Значения дохода указаны в **дополнительных валютных единицах** (например, в центах за доллар США).

---

## Payment Provider Configuration

The active payment provider is determined by `NEXT_PUBLIC_PAYMENT_PROVIDER` (defaults to `"stripe"`). Each provider requires its own set of price/variant ID environment variables:

| Provider | Weekly Price Env Var | Monthly Price Env Var |
|----------|---------------------|-----------------------|
| Stripe | `STRIPE_SPONSOR_WEEKLY_PRICE_ID` | `STRIPE_SPONSOR_MONTHLY_PRICE_ID` |
| LemonSqueezy | `LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID` | `LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID` |
| Polar | `POLAR_SPONSOR_WEEKLY_PRICE_ID` | `POLAR_SPONSOR_MONTHLY_PRICE_ID` |

---

## Связанные исходные файлы

|Файл|Цель|
|------|---------|
|`template/app/api/sponsor-ads/route.ts`|Конечная точка публичной активной рекламы|
|`template/app/api/sponsor-ads/checkout/route.ts`|Создание сеанса оформления заказа|
|`template/app/api/sponsor-ads/user/route.ts`|Список и создание пользовательских объявлений|
|`template/app/api/sponsor-ads/user/[id]/route.ts`|Получение одного объявления|
|`template/app/api/sponsor-ads/user/[id]/cancel/route.ts`|Отмена объявления|
|`template/app/api/sponsor-ads/user/[id]/renew/route.ts`|Продление объявления|
|`template/app/api/sponsor-ads/user/stats/route.ts`|Статистика пользователей|
|`template/lib/services/sponsor-ad.service.ts`|Уровень бизнес-логики|
|`template/lib/validations/sponsor-ad.ts`|Схемы проверки Zod|
|`template/lib/payment/config/payment-provider-manager.ts`|Фабрика платежных провайдеров|
