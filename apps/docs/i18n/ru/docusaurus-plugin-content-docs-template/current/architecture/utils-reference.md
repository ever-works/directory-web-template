---
id: utils-reference
title: "Справочник по утилитам"
sidebar_label: "Справочник по утилитам"
sidebar_position: 24
---

# Справочник по утилитам

Шаблон предоставляет служебные функции в двух каталогах: `utils/` для помощников общего назначения и `lib/utils/` для утилит, интегрированных в платформу. В этом справочнике описывается каждый служебный модуль, его экспорт и шаблоны использования.

## Структура каталогов

```
utils/                              # General-purpose utilities
├── date.ts                         # Date formatting
├── pagination.ts                   # Pagination helpers
└── profile-button.utils.ts         # Profile UI helpers

lib/utils/                          # Framework-integrated utilities
├── index.ts                        # cn() class name merger
├── api-error.ts                    # Safe API error responses
├── bot-detection.ts                # User-Agent bot detection
├── checkout-utils.ts               # Payment checkout helpers
├── client-auth.ts                  # Client-side auth utilities
├── currency-format.ts              # Currency formatting
├── custom-navigation.ts            # Navigation helpers
├── database-check.ts               # Database connectivity check
├── email-validation.ts             # ReDoS-safe email validation
├── error-handler.ts                # Error handling utilities
├── featured-items.ts               # Featured item sorting/filtering
├── footer-utils.ts                 # Footer content utilities
├── image-domains.ts                # Image domain whitelist
├── pagination-validation.ts        # Server-side pagination validation
├── payment-provider.ts             # Payment provider detection
├── plan-expiration.utils.ts        # Plan expiration calculations
├── rate-limit.ts                   # In-memory rate limiter
├── request-body.ts                 # Request body parsing
├── server-url.ts                   # Server URL resolution
├── settings.ts                     # Settings helpers
├── slug.ts                         # URL slug utilities
├── url-cleaner.ts                  # URL cleaning and validation
├── url-filter-sync.ts              # URL/filter state synchronization
├── twenty-crm-client.utils.ts      # Twenty CRM client utils
└── twenty-crm-validation.ts        # Twenty CRM validation
```

## Утилиты работы с датами (`utils/date.ts`)

### форматдата

Форматирует дату с использованием длинного месяца, дня и года.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### форматДатаВремя

Форматирует дату с использованием длинного месяца, дня, года, часа и минуты.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### форматДатаШорт

Форматы с коротким месяцем. Возвращает `'-'` для нулевых/неопределенных значений.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## Нумерация страниц (`utils/pagination.ts`)

### зажимИПрокруткаToTop

Прижимает номер страницы к допустимому диапазону и прокручивает окно вверх.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|Параметр|Тип|Описание|
|---|---|---|
|`newPage`|`number`|Запрошенный номер страницы|
|`total`|`number`|Общее количество страниц|
|`setPage`|`(page: number) => void`|Функция установки состояния|

Поведение: ограничивается диапазоном `[1, total]`, обрабатывается `NaN` по умолчанию равным 1 и выполняется плавная прокрутка вверх.

## Утилиты кнопок профиля (`utils/profile-button.utils.ts`)

### форматDisplayName

Интеллектуальное форматирование отображаемых имен в зависимости от длины:

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### getInitials

Извлекает инициалы из имени:

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### GetProfilePath

Создает URL-безопасный путь к профилю:

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### getThemeColors

Возвращает текущие цвета темы для наложений пользовательского интерфейса:

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## Слияние имен классов (`lib/utils/index.ts`)

### CN

Сочетает CSS-классы Tailwind с разрешением конфликтов:

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

Использует `clsx` для условных классов и `tailwind-merge` для разрешения конфликтов.

## Обработка ошибок API (`lib/utils/api-error.ts`)

### безопасныйErrorResponse

Создает ответы на ошибки, которые предотвращают утечку информации в производстве:

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|Окружающая среда|Ответ содержит|
|---|---|
|Развитие|Фактический `error.message`|
|Производство|Только универсальный `fallbackMessage`|

Полная информация об ошибках всегда регистрируется на стороне сервера независимо от среды.

### SafeErrorMessage

Извлекает безопасную строку сообщения об ошибке без создания ответа:

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## Проверка электронной почты (`lib/utils/email-validation.ts`)

### isValidEmail

Безопасная для ReDoS проверка электронной почты с использованием ручного анализа (без уязвимого регулярного выражения):

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

Правила проверки:
- Длина от 5 до 254 символов.
- Локальная часть: 1–64 символа, буквенно-цифровые + разрешенные специальные символы.
- Домен: действительная структура хотя бы с одной точкой.
- Каждая метка домена: 1–63 символа, начинается/заканчивается буквенно-цифровыми буквами.

### isValidEmailRegex

Альтернативная проверка на основе регулярных выражений (также безопасная для ReDoS):

```typescript
isValidEmailRegex('user@example.com')  // true
```

## Форматирование валюты (`lib/utils/currency-format.ts`)

### форматВалюта

Форматирует суммы второстепенных единиц (центы) в строки локализованной валюты:

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### форматВалютаСумма

Форматирует суммы основных единиц (доллары) в строки локализованных валют:

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### Получить валютный символ

Возвращает символ кода валюты:

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

Поддерживает 22 валюты, включая USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW и другие.

## Утилиты Slug (`lib/utils/slug.ts`)

### слизывать

Преобразует текст в URL-адреса:

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### очищать от шлаков

Преобразует фрагменты обратно в читаемый текст:

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## URL-утилиты (`lib/utils/url-cleaner.ts`)

### чистый URL

Очищает и нормализует строки URL:

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

Проверяет, что URL-адрес является абсолютным с протоколом и именем хоста:

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### getBaseUrl

Возвращает нормализованный базовый URL-адрес приложения с резервной цепочкой:

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### построитьUrl

Создает полные URL-адреса из сегментов пути:

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## Ограничение скорости (`lib/utils/rate-limit.ts`)

### предел скорости

Ограничитель скорости в памяти для конечных точек API:

```typescript
import { ratelimit } from '@/lib/utils/rate-limit';

const result = await ratelimit(
  `api:${clientIP}`,  // Unique key
  100,                // Max requests
  60 * 1000           // Window: 1 minute
);

if (!result.success) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': String(result.retryAfter) }
  });
}
```

Тип возврата:

```typescript
interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;  // Seconds until reset (only when limited)
}
```

### сбросрейтелимит/getRateLimitStatus

```typescript
resetRateLimit('api:192.168.1.1');     // Clear rate limit for key

const status = getRateLimitStatus('api:192.168.1.1', 100);
// { remaining: 95, resetTime: 1706000000000 }
```

Магазин автоматически очищается каждые 5 минут.

## Проверка нумерации страниц (`lib/utils/pagination-validation.ts`)

### валидироватьPaginationParams

Проверка параметров пагинации на стороне сервера для маршрутов API:

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

Правила проверки:
- `page`: Должно быть положительным целым числом (по умолчанию: 1).
- `limit`: должно быть от 1 до 100 (по умолчанию: 10).

## Обнаружение ботов (`lib/utils/bot-detection.ts`)

### isBot

Обнаруживает ботов по строке User-Agent:

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

Обнаруженные категории: поисковые системы, сканеры социальных сетей, инструменты повышения производительности, платформы автоматизации, HTTP-клиенты.

## Рекомендуемые товары (`lib/utils/featured-items.ts`)

### сортировкаItemsWithFeatured

Помещает избранные элементы в начало списка, отсортированные в порядке избранных:

```typescript
const sorted = sortItemsWithFeatured(allItems, featuredItems);
// Featured items first (by order), then remaining items
```

### isItemFeatured/getFeaturedItemData

```typescript
const featured = isItemFeatured('my-item', featuredItems);  // boolean
const data = getFeaturedItemData('my-item', featuredItems);  // FeaturedItem | undefined
```

### filterActiveFeaturedItems

Удаляет избранные элементы с истекшим сроком действия на основе даты `featuredUntil`.

### isFeaturedItemExpiring

Проверяет, истекает ли срок действия избранного элемента в течение 7 дней.

## URL-адрес сервера (`lib/utils/server-url.ts`)

### getFrontendUrl

Разрешает URL-адрес внешнего интерфейса из текущего контекста запроса:

```typescript
const url = await getFrontendUrl();
```

Порядок разрешения:
1. `window.location.origin` (на стороне клиента)
2. Заголовки `x-forwarded-host` / `host` (на стороне сервера, проверено по конфигурации)
3. Настроен `WEB_URL` резервный вариант

## Сводная таблица

|Модуль|Ключевой экспорт|Категория|
|---|---|---|
|`utils/date`|`formatDate`, `formatDateTime`, `formatDateShort`|Форматирование|
|`utils/pagination`|`clampAndScrollToTop`|Помощники пользовательского интерфейса|
|`utils/profile-button.utils`|`formatDisplayName`, `getInitials`, `getProfilePath`|Помощники пользовательского интерфейса|
|`lib/utils/index`|`cn`|Стиль|
|`lib/utils/api-error`|`safeErrorResponse`, `safeErrorMessage`|Обработка ошибок|
|`lib/utils/bot-detection`|`isBot`|Безопасность|
|`lib/utils/currency-format`|`formatCurrency`, `formatCurrencyAmount`, `getCurrencySymbol`|Форматирование|
|`lib/utils/email-validation`|`isValidEmail`, `isValidEmailRegex`|Валидация|
|`lib/utils/featured-items`|`sortItemsWithFeatured`, `filterActiveFeaturedItems`|Данные|
|`lib/utils/pagination-validation`|`validatePaginationParams`|Валидация|
|`lib/utils/rate-limit`|`ratelimit`, `resetRateLimit`|Безопасность|
|`lib/utils/server-url`|`getFrontendUrl`|Инфраструктура|
|`lib/utils/slug`|`slugify`, `deslugify`|Форматирование|
|`lib/utils/url-cleaner`|`cleanUrl`, `getBaseUrl`, `buildUrl`|Инфраструктура|
