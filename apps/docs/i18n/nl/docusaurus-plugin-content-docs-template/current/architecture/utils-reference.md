---
id: utils-reference
title: "Hulpprogramma's Referentie"
sidebar_label: "Utils-referentie"
sidebar_position: 24
---

# Hulpprogramma's Referentie

De sjabloon biedt hulpprogrammafuncties in twee mappen: `utils/` voor algemene helpers en `lib/utils/` voor in het raamwerk geïntegreerde hulpprogramma's. Deze referentie documenteert elke nutsmodule, de exporten en gebruikspatronen.

## Directorystructuur

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

## Datumhulpprogramma's (`utils/date.ts`)

### formaatDatum

Formatteert een datum met een lange maand, dag en jaar.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### formaatDatumTijd

Formatteert een datum met lange maand, dag, jaar, uur en minuut.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### formaatDatumKort

Formaten met korte maand. Retourneert `'-'` voor null/ongedefinieerde waarden.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## Paginering (`utils/pagination.ts`)

### klemAndScrollToTop

Klemt een paginanummer binnen een geldig bereik en schuift het venster naar boven.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|Parameter|Typ|Beschrijving|
|---|---|---|
|`newPage`|`number`|Gevraagd paginanummer|
|`total`|`number`|Totaal aantal pagina's|
|`setPage`|`(page: number) => void`|Functie van staatszetter|

Gedrag: Klemt vast op het bereik `[1, total]`, handelt `NaN` af met standaard 1 en scrollt soepel naar boven.

## Profielknop Hulpprogramma's (`utils/profile-button.utils.ts`)

### formaatDisplayName

Intelligente opmaak van weergavenamen op basis van lengte:

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### krijgInitialen

Haalt initialen uit een naam:

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### getProfilePath

Bouwt een URL-veilig profielpad:

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### krijg ThemaKleuren

Retourneert de huidige themakleuren voor UI-overlays:

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## Fusie van klassenaam (`lib/utils/index.ts`)

### cn

Combineert Tailwind CSS-klassen met conflictoplossing:

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

Gebruikt `clsx` voor voorwaardelijke klassen en `tailwind-merge` voor conflictoplossing.

## API-foutafhandeling (`lib/utils/api-error.ts`)

### safeErrorResponse

Creëert foutreacties die het lekken van informatie in de productie voorkomen:

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|Milieu|Reactie bevat|
|---|---|
|Ontwikkeling|Werkelijke `error.message`|
|Productie|Alleen generiek `fallbackMessage`|

Volledige foutdetails worden altijd op de server vastgelegd, ongeacht de omgeving.

### safeErrorbericht

Extraheert een veilige foutmeldingsreeks zonder een antwoord te creëren:

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## E-mailvalidatie (`lib/utils/email-validation.ts`)

### isGeldigE-mail

ReDoS-veilige e-mailvalidatie met handmatige parsering (geen kwetsbare regex):

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

Validatieregels:
- Lengte tussen 5 en 254 tekens
- Lokaal deel: 1-64 tekens, alfanumeriek + toegestane speciale tekens
- Domein: geldige structuur met minimaal één punt
- Elk domeinlabel: 1-63 tekens, begint/eindigt met alfanumeriek

### isGeldigeE-mailRegex

Alternatieve regex-gebaseerde validatie (ook ReDoS-veilig):

```typescript
isValidEmailRegex('user@example.com')  // true
```

## Valutanotatie (`lib/utils/currency-format.ts`)

### formaatValuta

Formatteert bedragen in kleine eenheden (centen) naar gelokaliseerde valutareeksen:

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### formaatValutaBedrag

Formatteert bedragen in grote eenheden (dollars) naar gelokaliseerde valutareeksen:

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### getValutasymbool

Retourneert het symbool voor een valutacode:

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

Ondersteunt 22 valuta's, waaronder USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW en meer.

## Slug-hulpprogramma's (`lib/utils/slug.ts`)

### sluimeren

Converteert tekst naar URL-vriendelijke slugs:

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### ontslakken

Converteert slugs terug naar leesbare tekst:

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## URL-hulpprogramma's (`lib/utils/url-cleaner.ts`)

### schoneUrl

Reinigt en normaliseert URL-reeksen:

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

Valideert dat een URL absoluut is met protocol en hostnaam:

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### getBaseUrl

Retourneert de genormaliseerde applicatiebasis-URL met reserveketen:

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### buildUrl

Creëert volledige URL's uit padsegmenten:

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## Tariefbeperking (`lib/utils/rate-limit.ts`)

### tarieflimiet

Snelheidsbegrenzer in het geheugen voor API-eindpunten:

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

Retourtype:

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

De winkel wordt elke 5 minuten automatisch schoongemaakt.

## Pagineringvalidatie (`lib/utils/pagination-validation.ts`)

### validatePaginationParams

Validatie van pagineringsparameters aan de serverzijde voor API-routes:

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

Validatieregels:
- `page`: Moet een positief geheel getal zijn (standaard: 1)
- `limit`: Moet tussen 1 en 100 liggen (standaard: 10)

## Botdetectie (`lib/utils/bot-detection.ts`)

### isBot

Detecteert bots op basis van een User-Agent-reeks:

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

Gedetecteerde categorieën: zoekmachines, crawlers van sociale media, prestatietools, automatiseringsframeworks, HTTP-clients.

## Uitgelichte items (`lib/utils/featured-items.ts`)

### sortItemsWithFeatured

Plaatst aanbevolen items aan het begin van een lijst, gesorteerd op aanbevolen volgorde:

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

Verwijdert verlopen aanbevolen items op basis van `featuredUntil` datum.

### isFeaturedItemVerloopt

Controleert of een uitgelicht item binnen 7 dagen verloopt.

## Server-URL (`lib/utils/server-url.ts`)

### getFrontendUrl

Lost de frontend-URL op uit de huidige verzoekcontext:

```typescript
const url = await getFrontendUrl();
```

Resolutievolgorde:
1. `window.location.origin` (clientzijde)
2. `x-forwarded-host` / `host` headers (serverzijde, gevalideerd volgens configuratie)
3. `WEB_URL` fallback geconfigureerd

## Overzichtstabel

|Module|Belangrijkste exporten|Categorie|
|---|---|---|
|`utils/date`|`formatDate`, `formatDateTime`, `formatDateShort`|Opmaak|
|`utils/pagination`|`clampAndScrollToTop`|UI-helpers|
|`utils/profile-button.utils`|`formatDisplayName`, `getInitials`, `getProfilePath`|UI-helpers|
|`lib/utils/index`|`cn`|Styling|
|`lib/utils/api-error`|`safeErrorResponse`, `safeErrorMessage`|Foutafhandeling|
|`lib/utils/bot-detection`|`isBot`|Beveiliging|
|`lib/utils/currency-format`|`formatCurrency`, `formatCurrencyAmount`, `getCurrencySymbol`|Opmaak|
|`lib/utils/email-validation`|`isValidEmail`, `isValidEmailRegex`|Validatie|
|`lib/utils/featured-items`|`sortItemsWithFeatured`, `filterActiveFeaturedItems`|Gegevens|
|`lib/utils/pagination-validation`|`validatePaginationParams`|Validatie|
|`lib/utils/rate-limit`|`ratelimit`, `resetRateLimit`|Beveiliging|
|`lib/utils/server-url`|`getFrontendUrl`|Infrastructuur|
|`lib/utils/slug`|`slugify`, `deslugify`|Opmaak|
|`lib/utils/url-cleaner`|`cleanUrl`, `getBaseUrl`, `buildUrl`|Infrastructuur|
