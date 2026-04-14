---
id: overview
title: Общ преглед на API маршрутите
sidebar_label: Преглед
sidebar_position: 0
---

# Общ преглед на API маршрутите

Шаблонът излага приблизително 151 манипулатора на API маршрути, организирани в 29 групи маршрути в директорията `app/api/`. Всички маршрути използват Next.js App Router конвенцията с `route.ts` файлове, експортиращи манипулатори на HTTP методи (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

## Групи маршрути

|Група|Пътека|Описание|Прибл. Маршрути|
|-------|------|-------------|---------------|
|**админ**|`/api/admin/*`|CRUD операции на административния панел| ~60 |
|**авторизация**|`/api/auth/*`|Манипулатори на NextAuth + управление на пароли| 2 |
|**категории**|`/api/categories/*`|Заявки за обществени категории| 1 |
|**клиент**|`/api/client/*`|Клиентско табло и управление на елементи| ~7 |
|**колекции**|`/api/collections/*`|Заявки за публична колекция| 1 |
|**конфигурация**|`/api/config/*`|Конфигурация на флаг на функция| 1 |
|**cron**|`/api/cron/*`|Планирани фонови задачи| 3 |
|**настоящ потребител**|`/api/current-user`|Текуща информация за удостоверен потребител| 1 |
|**екстракт**|`/api/extract`|Извличане на URL метаданни| 1 |
|**любими**|`/api/favorites/*`|Любими артикули на потребителя| 2 |
|**представени артикули**|`/api/featured-items`|Списъци с представени артикули| 1 |
|**геокод**|`/api/geocode`|Геокодиране на адреси| 1 |
|**здраве**|`/api/health/*`|Проверки на здравето на системата| 1 |
|**вътрешен**|`/api/internal/*`|Вътрешни операции (DB init)| 1 |
|**артикули**|`/api/items/*`|Публични крайни точки на елемент (коментари, гласове, изгледи)| ~12 |
|**лимонено изцеден**|`/api/lemonsqueezy/*`|Интегриране на плащане с Lemon Squeezy| 7 |
|**местоположение**|`/api/location/*`|Търсене на местоположение и данни| 4 |
|**плащане**|`/api/payment/*`|Генерично управление на плащания/абонаменти| 3 |
|**полярен**|`/api/polar/*`|Интегриране на плащанията на Polar| 5 |
|**справка**|`/api/reference`|Крайна точка на референтни данни| 1 |
|**доклади**|`/api/reports`|Публично представяне на отчет| 1 |
|**solidgate**|`/api/solidgate/*`|Solidgate интеграция на плащане| 2 |
|**спонсор-реклами**|`/api/sponsor-ads/*`|Управление на реклами на спонсори| 7 |
|**райе**|`/api/stripe/*`|Интегриране на плащанията в Stripe| ~17 |
|**проучвания**|`/api/surveys/*`|Проучване CRUD и отговори| 4 |
|**потребител**|`/api/user/*`|Потребителски профил и абонамент| 5 |
|**verify-recaptcha**|`/api/verify-recaptcha`|reCAPTCHA проверка| 1 |
|**версия**|`/api/version/*`|Информация за версията на приложението| 2 |

## Архитектурни модели

### Структура на манипулатора на маршрута

Обработчиците на маршрути следват последователен модел на тънък манипулатор:

```typescript
// app/api/admin/items/route.ts
import { withAdminAuth } from '@/lib/auth/admin-guard';

export const GET = withAdminAuth(async (request: NextRequest) => {
  // 1. Parse and validate input (query params, body)
  // 2. Call service or repository
  // 3. Return JSON response
  return NextResponse.json({ success: true, data: result });
});
```

### Модели за удостоверяване

Маршрутите използват различни нива на удостоверяване:

|Ниво|Метод|Използване|
|-------|--------|-------|
|**Публичен**|Няма проверка за автентичност|Списъци с артикули, проверки на състоянието, информация за версията|
|**Удостоверен**|`auth()` или `getCachedSession()`|Потребителски профил, любими, клиентски крайни точки|
|**Администратор**|`withAdminAuth()` или `checkAdminAuth()`|Всички `/api/admin/*` маршрути|
|**Крон**|`CRON_SECRET` проверка на заглавката|`/api/cron/*` маршрути|

### Обработка на грешки

API маршрутите използват последователен формат на отговор за грешка:

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: 'Human-readable error message' }
```

HTTP кодовете за състояние следват REST конвенциите:

|Статус|Използване|
|--------|-------|
| `200` |Успешно ВЗЕМИ, ПОСТАВИ, КЪРПИ|
| `201` |Успешно POST (ресурсът е създаден)|
| `400` |Невалиден текст или параметри на заявката|
| `401` |Липсващо или невалидно удостоверяване|
| `403` |Удостоверени, но недостатъчни разрешения|
| `404` |Ресурсът не е намерен|
| `409` |Конфликт (дублиращ се ресурс)|
| `500` |Вътрешна грешка на сървъра|

### Пагинация

Крайните точки на списъка обикновено поддържат страниране на базата на курсор или отместване:

```
GET /api/admin/items?page=1&limit=20&sort=createdAt&order=desc
```

Общи параметри на заявката:

|Параметър|Тип|По подразбиране|Описание|
|-----------|------|---------|-------------|
|`page`|номер| `1` |Номер на страница (базиран на 1)|
|`limit`|номер| `20` |Елементи на страница|
|`sort`|низ|`createdAt`|Поле за сортиране|
|`order`|низ|`desc`|Посока на сортиране (`asc` или `desc`)|
|`search`|низ| - |Заявка за търсене в пълен текст|

### Плик за отговор

Странираните отговори включват метаданни:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

## Структура на директорията

```
app/api/
  admin/               # Admin-only endpoints (19 resource groups)
  auth/                # NextAuth + password management
  categories/          # Public category data
  client/              # Client-facing dashboard + items
  collections/         # Public collection data
  config/              # Feature configuration
  cron/                # Scheduled jobs (sync, subscriptions)
  current-user/        # Current user session info
  extract/             # URL metadata extraction
  favorites/           # Favorite item management
  featured-items/      # Featured item listings
  geocode/             # Geocoding service
  health/              # Health checks (database)
  internal/            # Internal operations
  items/               # Public item interactions
  lemonsqueezy/        # Lemon Squeezy payments
  location/            # Location data (countries, cities)
  payment/             # Generic payment management
  polar/               # Polar payments
  reference/           # Reference data
  reports/             # Content reports
  solidgate/           # Solidgate payments
  sponsor-ads/         # Sponsor advertisement management
  stripe/              # Stripe payments
  surveys/             # Survey management
  user/                # User profile endpoints
  verify-recaptcha/    # reCAPTCHA verification
  version/             # App version info
```
