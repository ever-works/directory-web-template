---
id: utils-reference
title: "Informacje o narzędziach"
sidebar_label: "Odniesienia do narzędzi"
sidebar_position: 24
---

# Informacje o narzędziach

Szablon udostępnia funkcje narzędziowe w dwóch katalogach: `utils/` dla pomocników ogólnego przeznaczenia i `lib/utils/` dla narzędzi zintegrowanych ze strukturą. Ten dokument dokumentuje każdy moduł narzędziowy, jego eksport i wzorce użycia.

## Struktura katalogów

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

## Narzędzia daty (`utils/date.ts`)

### formatData

Formatuje datę za pomocą długiego miesiąca, dnia i roku.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### formatDataGodzina

Formatuje datę za pomocą długiego miesiąca, dnia, roku, godziny i minut.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### formatDataKrótka

Formaty z krótkim miesiącem. Zwraca `'-'` dla wartości null/niezdefiniowanych.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## Paginacja (`utils/pagination.ts`)

### zacisk i przewiń do góry

Ogranicza numer strony do prawidłowego zakresu i przewija okno do góry.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|Parametr|Wpisz|Opis|
|---|---|---|
|`newPage`|`number`|Żądany numer strony|
|`total`|`number`|Łączna liczba stron|
|`setPage`|`(page: number) => void`|Funkcja ustawiania stanu|

Zachowanie: Zaciska się do zakresu `[1, total]`, obsługuje `NaN` z domyślną wartością 1 i wykonuje płynne przewijanie do góry.

## Narzędzia przycisków profilu (`utils/profile-button.utils.ts`)

### formatNazwaWyświetlana

Inteligentnie formatuje wyświetlane nazwy na podstawie długości:

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### pobierzInicjały

Wyodrębnia inicjały z imienia:

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### pobierz ścieżkę profilu

Tworzy ścieżkę profilu bezpieczną dla adresu URL:

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### pobierzThemeColors

Zwraca bieżące kolory motywu dla nakładek interfejsu użytkownika:

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## Połączenie nazw klas (`lib/utils/index.ts`)

### cn

Łączy klasy CSS Tailwind z rozwiązywaniem konfliktów:

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

Używa `clsx` do klas warunkowych i `tailwind-merge` do rozwiązywania konfliktów.

## Obsługa błędów API (`lib/utils/api-error.ts`)

### bezpieczna odpowiedź na błąd

Tworzy odpowiedzi na błędy, które zapobiegają wyciekom informacji w produkcji:

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|Środowisko|Odpowiedź zawiera|
|---|---|
|Rozwój|Rzeczywisty `error.message`|
|Produkcja|Tylko ogólny `fallbackMessage`|

Pełne szczegóły błędu są zawsze rejestrowane po stronie serwera, niezależnie od środowiska.

### bezpieczny komunikat o błędzie

Wyodrębnia bezpieczny ciąg komunikatu o błędzie bez tworzenia odpowiedzi:

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## Weryfikacja adresu e-mail (`lib/utils/email-validation.ts`)

### jest prawidłowy adres e-mail

Weryfikacja wiadomości e-mail bezpieczna dla ReDoS przy użyciu ręcznego analizowania (bez podatnych na ataki wyrażeń regularnych):

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

Zasady walidacji:
- Długość od 5 do 254 znaków
- Część lokalna: 1-64 znaki, alfanumeryczne + dozwolone znaki specjalne
- Dziedzina: prawidłowa struktura z co najmniej jedną kropką
- Każda etykieta domeny: 1–63 znaki, zaczyna się/kończy znakami alfanumerycznymi

### isValidEmailRegex

Alternatywna walidacja oparta na wyrażeniach regularnych (również bezpieczna dla ReDoS):

```typescript
isValidEmailRegex('user@example.com')  // true
```

## Formatowanie waluty (`lib/utils/currency-format.ts`)

### formatWaluta

Formatuje kwoty jednostek pomocniczych (centy) na zlokalizowane ciągi walutowe:

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### formatWalutaKwota

Formatuje kwoty jednostek głównych (dolarów) na zlokalizowane ciągi walutowe:

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### pobierz symbol waluty

Zwraca symbol kodu waluty:

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

Obsługuje 22 waluty, w tym USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW i inne.

## Narzędzia Slug (`lib/utils/slug.ts`)

### osłabnąć

Konwertuje tekst na ślimaki przyjazne dla adresów URL:

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### odwodnić

Konwertuje ślimaki z powrotem na czytelny tekst:

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## Narzędzia URL (`lib/utils/url-cleaner.ts`)

### czystyUrl

Czyści i normalizuje ciągi adresów URL:

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

Sprawdza, czy adres URL jest absolutny wraz z protokołem i nazwą hosta:

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### pobierzBaseUrl

Zwraca znormalizowany podstawowy adres URL aplikacji z łańcuchem zastępczym:

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### buildUrl

Konstruuje pełne adresy URL z segmentów ścieżki:

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## Ograniczanie szybkości (`lib/utils/rate-limit.ts`)

### limit szybkości

Ogranicznik szybkości w pamięci dla punktów końcowych API:

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

Typ zwrotu:

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

Sklep jest czyszczony automatycznie co 5 minut.

## Walidacja paginacji (`lib/utils/pagination-validation.ts`)

### validPaginationParams

Weryfikacja parametrów paginacji po stronie serwera dla tras API:

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

Zasady walidacji:
- `page`: Musi być dodatnią liczbą całkowitą (domyślnie: 1)
- `limit`: Musi należeć do zakresu od 1 do 100 (domyślnie: 10)

## Wykrywanie botów (`lib/utils/bot-detection.ts`)

### jestBot

Wykrywa boty według ciągu User-Agent:

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

Wykryte kategorie: wyszukiwarki, roboty społecznościowe, narzędzia wydajnościowe, frameworki automatyzacji, klienci HTTP.

## Polecane pozycje (`lib/utils/featured-items.ts`)

### sortuj elementy z wyróżnionymi

Umieszcza wyróżnione elementy na początku listy, posortowane według kolejności wyróżnionych:

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

Usuwa wygasłe polecane elementy na podstawie daty `featuredUntil`.

### isFeaturedItemWygasa

Sprawdza, czy polecany przedmiot wygasa w ciągu 7 dni.

## Adres URL serwera (`lib/utils/server-url.ts`)

### pobierzFrontendUrl

Rozwiązuje adres URL frontendu na podstawie bieżącego kontekstu żądania:

```typescript
const url = await getFrontendUrl();
```

Kolejność rozstrzygania:
1. `window.location.origin` (po stronie klienta)
2. Nagłówki `x-forwarded-host` / `host` (po stronie serwera, sprawdzone względem konfiguracji)
3. Skonfigurowano rezerwę `WEB_URL`

## Tabela podsumowująca

|Moduł|Kluczowy eksport|Kategoria|
|---|---|---|
|`utils/date`|`formatDate`, `formatDateTime`, `formatDateShort`|Formatowanie|
|`utils/pagination`|`clampAndScrollToTop`|Pomocnicy interfejsu użytkownika|
|`utils/profile-button.utils`|`formatDisplayName`, `getInitials`, `getProfilePath`|Pomocnicy interfejsu użytkownika|
|`lib/utils/index`|`cn`|Stylizacja|
|`lib/utils/api-error`|`safeErrorResponse`, `safeErrorMessage`|Obsługa błędów|
|`lib/utils/bot-detection`|`isBot`|Bezpieczeństwo|
|`lib/utils/currency-format`|`formatCurrency`, `formatCurrencyAmount`, `getCurrencySymbol`|Formatowanie|
|`lib/utils/email-validation`|`isValidEmail`, `isValidEmailRegex`|Walidacja|
|`lib/utils/featured-items`|`sortItemsWithFeatured`, `filterActiveFeaturedItems`|Dane|
|`lib/utils/pagination-validation`|`validatePaginationParams`|Walidacja|
|`lib/utils/rate-limit`|`ratelimit`, `resetRateLimit`|Bezpieczeństwo|
|`lib/utils/server-url`|`getFrontendUrl`|Infrastruktura|
|`lib/utils/slug`|`slugify`, `deslugify`|Formatowanie|
|`lib/utils/url-cleaner`|`cleanUrl`, `getBaseUrl`, `buildUrl`|Infrastruktura|
