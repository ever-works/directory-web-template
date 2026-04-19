---
id: overview
title: Обзор API-маршрутов
sidebar_label: Обзор
sidebar_position: 0
---

# Обзор API-маршрутов

Шаблон предоставляет около 151 обработчика маршрутов API, организованных в 29 групп маршрутов в каталоге `app/api/`. Все маршруты используют соглашение Next.js App Router с файлами `route.ts`, экспортирующими обработчики методов HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

## Группы маршрутов

|Группа|Путь|Описание|Прибл. Маршруты|
|-------|------|-------------|---------------|
|**админ**|`/api/admin/*`|Операции CRUD в панели администратора| ~60 |
|**авторизация**|`/api/auth/*`|NextAuth обработчики + управление паролями| 2 |
|**категории**|`/api/categories/*`|Запросы общедоступных категорий| 1 |
|**клиент**|`/api/client/*`|Панель управления клиентом и управление товарами| ~7 |
|**коллекции**|`/api/collections/*`|Запросы на публичные коллекции| 1 |
|**конфигурация**|`/api/config/*`|Конфигурация флага функции| 1 |
|**крон**|`/api/cron/*`|Запланированные фоновые задания| 3 |
|**текущий пользователь**|`/api/current-user`|Информация о текущем аутентифицированном пользователе| 1 |
|**выдержка**|`/api/extract`|Извлечение метаданных URL-адреса| 1 |
|**избранное**|`/api/favorites/*`|Любимые предметы пользователя| 2 |
|**рекомендуемые товары**|`/api/featured-items`|Списки избранных товаров| 1 |
|**геокод**|`/api/geocode`|Геокодирование адреса| 1 |
|**здоровье**|`/api/health/*`|Проверка работоспособности системы| 1 |
|**внутренний**|`/api/internal/*`|Внутренние операции (инициализация БД)| 1 |
|**предметы**|`/api/items/*`|Конечные точки общедоступных элементов (комментарии, голоса, просмотры)| ~12 |
|**лимонный**|`/api/lemonsqueezy/*`|Интеграция платежей Lemon Squeezy| 7 |
|**местоположение**|`/api/location/*`|Поиск местоположения и данные| 4 |
|**оплата**|`/api/payment/*`|Общее управление платежами/подписками| 3 |
|**полярный**|`/api/polar/*`|Интеграция платежей Polar| 5 |
|**ссылка**|`/api/reference`|Конечная точка справочных данных| 1 |
|**отчеты**|`/api/reports`|Подача публичного отчета| 1 |
|**сплошные ворота**|`/api/solidgate/*`|Интеграция платежей Solidgate| 2 |
|**спонсорская реклама**|`/api/sponsor-ads/*`|Управление рекламой спонсоров| 7 |
|**полоска**|`/api/stripe/*`|Интеграция платежей Stripe| ~17 |
|**опросы**|`/api/surveys/*`|Опрос CRUD и ответы| 4 |
|**пользователь**|`/api/user/*`|Профиль пользователя и подписка| 5 |
|**проверка-рекапча**|`/api/verify-recaptcha`|проверка reCAPTCHA| 1 |
|**версия**|`/api/version/*`|Информация о версии приложения| 2 |

## Архитектурные шаблоны

### Структура обработчика маршрута

Обработчики маршрутов следуют последовательному шаблону «тонких обработчиков»:

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

### Шаблоны аутентификации

Маршруты используют разные уровни аутентификации:

|Уровень|Метод|Использование|
|-------|--------|-------|
|**Общедоступный**|Нет проверки подлинности|Списки элементов, проверки работоспособности, информация о версии|
|**Аутентифицирован**|`auth()` или `getCachedSession()`|Профиль пользователя, избранное, конечные точки клиента|
|**Администратор**|`withAdminAuth()` или `checkAdminAuth()`|Все маршруты `/api/admin/*`|
|**Крон**|`CRON_SECRET` проверка заголовка|`/api/cron/*` маршруты|

### Обработка ошибок

Маршруты API используют единый формат ответа об ошибке:

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: 'Human-readable error message' }
```

Коды состояния HTTP соответствуют соглашениям REST:

|Статус|Использование|
|--------|-------|
| `200` |Успешный GET, PUT, PATCH|
| `201` |Успешный POST (ресурс создан)|
| `400` |Неверное тело или параметры запроса.|
| `401` |Отсутствует или недействительна аутентификация|
| `403` |Проверено, но недостаточно разрешений|
| `404` |Ресурс не найден|
| `409` |Конфликт (дубликат ресурса)|
| `500` |Внутренняя ошибка сервера|

### Пагинация

Конечные точки списка обычно поддерживают нумерацию страниц на основе курсора или смещения:

```
GET /api/admin/items?page=1&limit=20&sort=createdAt&order=desc
```

Общие параметры запроса:

|Параметр|Тип|По умолчанию|Описание|
|-----------|------|---------|-------------|
|`page`|номер| `1` |Номер страницы (на основе 1)|
|`limit`|номер| `20` |Элементов на странице|
|`sort`|строка|`createdAt`|Поле сортировки|
|`order`|строка|`desc`|Направление сортировки (`asc` или `desc`)|
|`search`|строка| - |Полнотекстовый поисковый запрос|

### Конверт ответа

Ответы с разбивкой на страницы включают метаданные:

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

## Структура каталогов

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
