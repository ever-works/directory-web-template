---
id: utils-reference
title: "Справочник за помощни програми"
sidebar_label: "Справочник за помощни средства"
sidebar_position: 24
---

# Справочник за помощни програми

Шаблонът предоставя помощни функции в две директории: `utils/` за помощници с общо предназначение и `lib/utils/` за помощни програми, интегрирани в рамка. Тази справка документира всеки помощен модул, неговите експорти и модели на използване.

## Структура на директорията

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

## Помощни програми за дата (`utils/date.ts`)

### formatDate

Форматира дата с дълъг месец, ден и година.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### formatDateTime

Форматира дата с дълъг месец, ден, година, час и минута.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### formatDateShort

Формати с кратък месец. Връща `'-'` за нулеви/недефинирани стойности.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## Страниране (`utils/pagination.ts`)

### clampAndScrollToTop

Закрепва номер на страница към валиден диапазон и превърта прозореца до върха.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|Параметър|Тип|Описание|
|---|---|---|
|`newPage`|`number`|Искан номер на страница|
|`total`|`number`|Общ брой страници|
|`setPage`|`(page: number) => void`|Функция за създаване на състояние|

Поведение: Захваща диапазона `[1, total]`, обработва `NaN` по подразбиране на 1 и извършва плавно превъртане до върха.

## Помощни програми за бутон на профил (`utils/profile-button.utils.ts`)

### formatDisplayName

Интелигентно форматира показваните имена въз основа на дължината:

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### getInitials

Извлича инициали от име:

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### getProfilePath

Създава безопасен URL път на профил:

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### getThemeColors

Връща текущите цветове на темата за наслагвания на потребителския интерфейс:

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## Обединяване на име на клас (`lib/utils/index.ts`)

### cn

Комбинира CSS класове на Tailwind с разрешаване на конфликти:

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

Използва `clsx` за условни класове и `tailwind-merge` за разрешаване на конфликти.

## API обработка на грешки (`lib/utils/api-error.ts`)

### safeErrorResponse

Създава отговори за грешки, които предотвратяват изтичане на информация в производството:

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|Околна среда|Отговорът съдържа|
|---|---|
|развитие|Действителен `error.message`|
|производство|Само генерични `fallbackMessage`|

Пълните подробности за грешката винаги се регистрират от страната на сървъра, независимо от средата.

### safeErrorMessage

Извлича безопасен низ със съобщение за грешка, без да създава отговор:

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## Проверка на имейл (`lib/utils/email-validation.ts`)

### isValidEmail

ReDoS-безопасно валидиране на имейл чрез ръчно анализиране (без уязвим регулярен израз):

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

Правила за валидиране:
- Дължина между 5 и 254 знака
- Локална част: 1-64 знака, буквено-цифрови + позволени специални знаци
- Домейн: валидна структура с поне една точка
- Всеки етикет на домейн: 1-63 знака, започва/завършва с буквено-цифрови

### isValidEmailRegex

Алтернативно валидиране, базирано на регулярен израз (също ReDoS-безопасно):

```typescript
isValidEmailRegex('user@example.com')  // true
```

## Форматиране на валутата (`lib/utils/currency-format.ts`)

### formatCurrency

Форматира незначителни единици (центове) в локализирани валутни низове:

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### formatCurrencyAmount

Форматира основните единици (долари) в локализирани валутни низове:

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### getCurrencySymbol

Връща символа за код на валута:

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

Поддържа 22 валути, включително USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW и др.

## Slug Utilities (`lib/utils/slug.ts`)

### замърсявам

Преобразува текст в удобни за URL охлюви:

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### обеззаразявам

Преобразува охлюви обратно в четим текст:

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## URL помощни програми (`lib/utils/url-cleaner.ts`)

### cleanUrl

Почиства и нормализира URL низовете:

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

Потвърждава дали URL адресът е абсолютен с протокол и име на хост:

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### getBaseUrl

Връща нормализирания базов URL адрес на приложението с резервна верига:

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### buildUrl

Конструира пълни URL адреси от сегменти на пътя:

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## Ограничаване на скоростта (`lib/utils/rate-limit.ts`)

### ratelimit

Ограничител на скоростта в паметта за крайни точки на API:

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

Тип връщане:

```typescript
interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;  // Seconds until reset (only when limited)
}
```

### resetRateLimit / getRateLimitStatus

```typescript
resetRateLimit('api:192.168.1.1');     // Clear rate limit for key

const status = getRateLimitStatus('api:192.168.1.1', 100);
// { remaining: 95, resetTime: 1706000000000 }
```

Магазинът се почиства автоматично на всеки 5 минути.

## Валидиране на пагинация (`lib/utils/pagination-validation.ts`)

### validatePaginationParams

Валидиране на параметъра за страниране от страна на сървъра за API маршрути:

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

Правила за валидиране:
- `page`: Трябва да е положително цяло число (по подразбиране: 1)
- `limit`: Трябва да е между 1 и 100 (по подразбиране: 10)

## Откриване на бот (`lib/utils/bot-detection.ts`)

### isBot

Открива ботове по низ на User-Agent:

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

Открити категории: търсачки, обхождащи социални медии, инструменти за ефективност, рамки за автоматизация, HTTP клиенти.

## Представени артикули (`lib/utils/featured-items.ts`)

### sortItemsWithFeatured

Поставя представените елементи в началото на списък, сортирани по представен ред:

```typescript
const sorted = sortItemsWithFeatured(allItems, featuredItems);
// Featured items first (by order), then remaining items
```

### isItemFeatured / getFeaturedItemData

```typescript
const featured = isItemFeatured('my-item', featuredItems);  // boolean
const data = getFeaturedItemData('my-item', featuredItems);  // FeaturedItem | undefined
```

### filterActiveFeaturedItems

Премахва избрани елементи с изтекъл срок на валидност въз основа на дата `featuredUntil`.

### isFeaturedItemExpiring

Проверява дали представен артикул изтича в рамките на 7 дни.

## URL адрес на сървъра (`lib/utils/server-url.ts`)

### getFrontendUrl

Разрешава URL адреса на интерфейса от контекста на текущата заявка:

```typescript
const url = await getFrontendUrl();
```

Ред на разрешаване:
1. `window.location.origin` (от страна на клиента)
2. `x-forwarded-host` / `host` заглавки (от страна на сървъра, валидирани спрямо конфигурация)
3. Конфигуриран резервен `WEB_URL`

## Обобщена таблица

|Модул|Ключови износи|Категория|
|---|---|---|
|`utils/date`|`formatDate`, `formatDateTime`, `formatDateShort`|Форматиране|
|`utils/pagination`|`clampAndScrollToTop`|Помощни потребителски интерфейси|
|`utils/profile-button.utils`|`formatDisplayName`, `getInitials`, `getProfilePath`|Помощни потребителски интерфейси|
|`lib/utils/index`|`cn`|Стайлинг|
|`lib/utils/api-error`|`safeErrorResponse`, `safeErrorMessage`|Обработка на грешки|
|`lib/utils/bot-detection`|`isBot`|сигурност|
|`lib/utils/currency-format`|`formatCurrency`, `formatCurrencyAmount`, `getCurrencySymbol`|Форматиране|
|`lib/utils/email-validation`|`isValidEmail`, `isValidEmailRegex`|Валидиране|
|`lib/utils/featured-items`|`sortItemsWithFeatured`, `filterActiveFeaturedItems`|данни|
|`lib/utils/pagination-validation`|`validatePaginationParams`|Валидиране|
|`lib/utils/rate-limit`|`ratelimit`, `resetRateLimit`|сигурност|
|`lib/utils/server-url`|`getFrontendUrl`|Инфраструктура|
|`lib/utils/slug`|`slugify`, `deslugify`|Форматиране|
|`lib/utils/url-cleaner`|`cleanUrl`, `getBaseUrl`, `buildUrl`|Инфраструктура|
