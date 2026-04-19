---
id: utils-reference
title: "Riferimento alle utilità"
sidebar_label: "Riferimento alle utilità"
sidebar_position: 24
---

# Riferimento alle utilità

Il modello fornisce funzioni di utilità in due directory: `utils/` per helper di uso generale e `lib/utils/` per utilità integrate nel framework. Questo riferimento documenta ogni modulo di utilità, le sue esportazioni e i modelli di utilizzo.

## Struttura delle directory

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

## Utilità data (`utils/date.ts`)

### formatoData

Formatta una data con mese, giorno e anno lunghi.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### formatDateTime

Formatta una data con mese lungo, giorno, anno, ora e minuto.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### formatoDataBreve

Formati con mese corto. Restituisce `'-'` per valori null/non definiti.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## Impaginazione (`utils/pagination.ts`)

### clampAndScrollToTop

Blocca un numero di pagina in un intervallo valido e scorre la finestra verso l'alto.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|Parametro|Digitare|Descrizione|
|---|---|---|
|`newPage`|`number`|Numero di pagina richiesta|
|`total`|`number`|Numero totale di pagine|
|`setPage`|`(page: number) => void`|Funzione di setter dello stato|

Comportamento: Blocca l'intervallo `[1, total]`, gestisce `NaN` impostando il valore predefinito su 1 ed esegue lo scorrimento fluido verso l'alto.

## Utilità pulsanti profilo (`utils/profile-button.utils.ts`)

### formatDisplayName

Formatta in modo intelligente i nomi visualizzati in base alla lunghezza:

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### getInitials

Estrae le iniziali da un nome:

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### getProfilePath

Crea un percorso del profilo sicuro per URL:

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### getThemeColors

Restituisce i colori del tema corrente per le sovrapposizioni dell'interfaccia utente:

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## Fusione nome classe (`lib/utils/index.ts`)

### cn

Combina le classi CSS Tailwind con la risoluzione dei conflitti:

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

Utilizza `clsx` per le classi condizionali e `tailwind-merge` per la risoluzione dei conflitti.

## Gestione degli errori API (`lib/utils/api-error.ts`)

### safeErrorResponse

Crea risposte di errore che impediscono la fuga di informazioni nella produzione:

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|Ambiente|La risposta contiene|
|---|---|
|Sviluppo|Effettivo `error.message`|
|Produzione|Solo generico `fallbackMessage`|

I dettagli completi dell'errore vengono sempre registrati sul lato server, indipendentemente dall'ambiente.

### safeErrorMessage

Estrae una stringa di messaggio di errore sicuro senza creare una risposta:

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## Convalida e-mail (`lib/utils/email-validation.ts`)

### èValidEmail

Convalida e-mail sicura per ReDoS mediante l'analisi manuale (nessuna regex vulnerabile):

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

Regole di convalida:
- Lunghezza compresa tra 5 e 254 caratteri
- Parte locale: 1-64 caratteri, alfanumerici + caratteri speciali consentiti
- Dominio: struttura valida con almeno un punto
- Ciascuna etichetta di dominio: 1-63 caratteri, inizia/termina con caratteri alfanumerici

### isValidEmailRegex

Convalida alternativa basata su regex (anche ReDoS-safe):

```typescript
isValidEmailRegex('user@example.com')  // true
```

## Formattazione valuta (`lib/utils/currency-format.ts`)

### formatoValuta

Formatta gli importi delle unità minori (centesimi) in stringhe di valuta localizzate:

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### formatoImportoValuta

Formatta gli importi delle unità principali (dollari) in stringhe di valuta localizzate:

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### getCurrencySymbol

Restituisce il simbolo per un codice valuta:

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

Supporta 22 valute tra cui USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW e altre.

## Utilità Slug (`lib/utils/slug.ts`)

### slugify

Converte il testo in slug compatibili con gli URL:

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### deslugify

Converte gli slug in testo leggibile:

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## Utilità URL (`lib/utils/url-cleaner.ts`)

### cleanUrl

Pulisce e normalizza le stringhe URL:

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

Convalida che un URL è assoluto con protocollo e nome host:

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### getBaseUrl

Restituisce l'URL di base dell'applicazione normalizzato con catena di fallback:

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### buildUrl

Costruisce URL completi da segmenti di percorso:

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## Limitazione della velocità (`lib/utils/rate-limit.ts`)

### limite di velocità

Limitatore di velocità in memoria per endpoint API:

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

Tipo di reso:

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

Il negozio viene pulito automaticamente ogni 5 minuti.

## Convalida impaginazione (`lib/utils/pagination-validation.ts`)

### validatePaginationParams

Convalida dei parametri di impaginazione lato server per le route API:

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

Regole di convalida:
- `page`: deve essere un numero intero positivo (impostazione predefinita: 1)
- `limit`: deve essere compreso tra 1 e 100 (impostazione predefinita: 10)

## Rilevamento bot (`lib/utils/bot-detection.ts`)

### isBot

Rileva i bot in base alla stringa User-Agent:

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

Categorie rilevate: motori di ricerca, crawler di social media, strumenti di performance, framework di automazione, client HTTP.

## Articoli in primo piano (`lib/utils/featured-items.ts`)

### sortItemsWithFeatured

Posiziona gli elementi in evidenza all'inizio di un elenco, ordinati in base all'ordine in evidenza:

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

Rimuove gli elementi in evidenza scaduti in base alla data `featuredUntil`.

### isFeaturedItemExpiring

Controlla se un articolo in evidenza scade entro 7 giorni.

## URL del server (`lib/utils/server-url.ts`)

### getFrontendUrl

Risolve l'URL del frontend dal contesto della richiesta corrente:

```typescript
const url = await getFrontendUrl();
```

Ordine di risoluzione:
1. `window.location.origin` (lato client)
2. Intestazioni `x-forwarded-host` / `host` (lato server, convalidate rispetto alla configurazione)
3. Fallback configurato `WEB_URL`

## Tabella riassuntiva

|Modulo|Principali esportazioni|Categoria|
|---|---|---|
|`utils/date`|`formatDate`, `formatDateTime`, `formatDateShort`|Formattazione|
|`utils/pagination`|`clampAndScrollToTop`|Aiutanti dell'interfaccia utente|
|`utils/profile-button.utils`|`formatDisplayName`, `getInitials`, `getProfilePath`|Aiutanti dell'interfaccia utente|
|`lib/utils/index`|`cn`|Stile|
|`lib/utils/api-error`|`safeErrorResponse`, `safeErrorMessage`|Gestione degli errori|
|`lib/utils/bot-detection`|`isBot`|Sicurezza|
|`lib/utils/currency-format`|`formatCurrency`, `formatCurrencyAmount`, `getCurrencySymbol`|Formattazione|
|`lib/utils/email-validation`|`isValidEmail`, `isValidEmailRegex`|Validazione|
|`lib/utils/featured-items`|`sortItemsWithFeatured`, `filterActiveFeaturedItems`|Dati|
|`lib/utils/pagination-validation`|`validatePaginationParams`|Validazione|
|`lib/utils/rate-limit`|`ratelimit`, `resetRateLimit`|Sicurezza|
|`lib/utils/server-url`|`getFrontendUrl`|Infrastruttura|
|`lib/utils/slug`|`slugify`, `deslugify`|Formattazione|
|`lib/utils/url-cleaner`|`cleanUrl`, `getBaseUrl`, `buildUrl`|Infrastruttura|
