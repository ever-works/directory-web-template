---
id: utils-reference
title: "Referenz zu Dienstprogrammen"
sidebar_label: "Utils-Referenz"
sidebar_position: 24
---

# Referenz zu Dienstprogrammen

Die Vorlage stellt Dienstprogrammfunktionen in zwei Verzeichnissen bereit: `utils/` für allgemeine Hilfsprogramme und `lib/utils/` für in das Framework integrierte Dienstprogramme. Diese Referenz dokumentiert jedes Dienstprogrammmodul, seine Exporte und Nutzungsmuster.

## Verzeichnisstruktur

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

## Datum Dienstprogramme (`utils/date.ts`)

### FormatDatum

Formatiert ein Datum mit langem Monat, Tag und Jahr.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### formatDateTime

Formatiert ein Datum mit langem Monat, Tag, Jahr, Stunde und Minute.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### formatDateShort

Formate mit kurzem Monat. Gibt `'-'` für null/undefinierte Werte zurück.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## Paginierung (`utils/pagination.ts`)

### clampAndScrollToTop

Begrenzt eine Seitenzahl auf den gültigen Bereich und scrollt das Fenster nach oben.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|Parameter|Typ|Beschreibung|
|---|---|---|
|`newPage`|`number`|Angeforderte Seitenzahl|
|`total`|`number`|Gesamtzahl der Seiten|
|`setPage`|`(page: number) => void`|State-Setter-Funktion|

Verhalten: Klemmt den Bereich `[1, total]`, verarbeitet `NaN` standardmäßig auf 1 und führt einen reibungslosen Bildlauf nach oben durch.

## Profilschaltflächen-Dienstprogramme (`utils/profile-button.utils.ts`)

### formatDisplayName

Formatiert Anzeigenamen intelligent basierend auf der Länge:

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### getInitials

Extrahiert Initialen aus einem Namen:

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### getProfilePath

Erstellt einen URL-sicheren Profilpfad:

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### getThemeColors

Gibt aktuelle Designfarben für UI-Overlays zurück:

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## Zusammenlegung des Klassennamens (`lib/utils/index.ts`)

### cn

Kombiniert Tailwind-CSS-Klassen mit Konfliktlösung:

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

Verwendet `clsx` für bedingte Klassen und `tailwind-merge` für die Konfliktlösung.

## API-Fehlerbehandlung (`lib/utils/api-error.ts`)

### SafeErrorResponse

Erstellt Fehlerreaktionen, die Informationslecks in der Produktion verhindern:

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|Umwelt|Antwort enthält|
|---|---|
|Entwicklung|Tatsächlich `error.message`|
|Produktion|Nur generisch `fallbackMessage`|

Vollständige Fehlerdetails werden immer serverseitig protokolliert, unabhängig von der Umgebung.

### SafeErrorMessage

Extrahiert eine sichere Fehlermeldungszeichenfolge, ohne eine Antwort zu erstellen:

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## E-Mail-Validierung (`lib/utils/email-validation.ts`)

### isValidEmail

ReDoS-sichere E-Mail-Validierung durch manuelles Parsen (keine anfällige Regex):

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

Validierungsregeln:
- Länge zwischen 5 und 254 Zeichen
- Lokaler Teil: 1-64 Zeichen, alphanumerisch + erlaubte Sonderzeichen
- Domäne: gültige Struktur mit mindestens einem Punkt
- Jedes Domain-Label: 1–63 Zeichen, beginnt/endet mit alphanumerischen Zeichen

### isValidEmailRegex

Alternative Regex-basierte Validierung (auch ReDoS-sicher):

```typescript
isValidEmailRegex('user@example.com')  // true
```

## Währungsformatierung (`lib/utils/currency-format.ts`)

### FormatWährung

Formatiert Beträge kleinerer Einheiten (Cent) in lokalisierte Währungszeichenfolgen:

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### formatCurrencyAmount

Formatiert Beträge in Haupteinheiten (Dollar) in lokalisierte Währungszeichenfolgen:

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### getCurrencySymbol

Gibt das Symbol für einen Währungscode zurück:

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

Unterstützt 22 Währungen, darunter USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW und mehr.

## Slug Utilities (`lib/utils/slug.ts`)

### träge machen

Konvertiert Text in URL-freundliche Slugs:

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### deslugifizieren

Wandelt Slugs wieder in lesbaren Text um:

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## URL-Dienstprogramme (`lib/utils/url-cleaner.ts`)

### cleanUrl

Bereinigt und normalisiert URL-Strings:

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

Überprüft, ob eine URL mit Protokoll und Hostnamen absolut ist:

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### getBaseUrl

Gibt die normalisierte Anwendungsbasis-URL mit Fallback-Kette zurück:

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### buildUrl

Konstruiert vollständige URLs aus Pfadsegmenten:

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## Ratenbegrenzung (`lib/utils/rate-limit.ts`)

### Ratelimit

In-Memory-Ratenbegrenzer für API-Endpunkte:

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

Rückgabetyp:

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

Der Laden wird automatisch alle 5 Minuten gereinigt.

## Paginierungsvalidierung (`lib/utils/pagination-validation.ts`)

### validierenPaginationParams

Serverseitige Paginierungsparametervalidierung für API-Routen:

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

Validierungsregeln:
- `page`: Muss eine positive Ganzzahl sein (Standard: 1)
- `limit`: Muss zwischen 1 und 100 liegen (Standard: 10)

## Bot-Erkennung (`lib/utils/bot-detection.ts`)

### isBot

Erkennt Bots anhand der User-Agent-Zeichenfolge:

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

Erkannte Kategorien: Suchmaschinen, Social-Media-Crawler, Leistungstools, Automatisierungs-Frameworks, HTTP-Clients.

## Empfohlene Artikel (`lib/utils/featured-items.ts`)

### sortItemsWithFeatured

Platziert hervorgehobene Elemente am Anfang einer Liste, sortiert nach der hervorgehobenen Reihenfolge:

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

Entfernt abgelaufene ausgewählte Artikel basierend auf dem `featuredUntil` Datum.

### isFeaturedItemExpiring

Überprüft, ob ein vorgestellter Artikel innerhalb von 7 Tagen abläuft.

## Server-URL (`lib/utils/server-url.ts`)

### getFrontendUrl

Löst die Frontend-URL aus dem aktuellen Anfragekontext auf:

```typescript
const url = await getFrontendUrl();
```

Auflösungsreihenfolge:
1. `window.location.origin` (clientseitig)
2. `x-forwarded-host` / `host` Header (serverseitig, validiert anhand der Konfiguration)
3. `WEB_URL` Fallback konfiguriert

## Übersichtstabelle

|Modul|Wichtige Exporte|Kategorie|
|---|---|---|
|`utils/date`|`formatDate`, `formatDateTime`, `formatDateShort`|Formatierung|
|`utils/pagination`|`clampAndScrollToTop`|UI-Helfer|
|`utils/profile-button.utils`|`formatDisplayName`, `getInitials`, `getProfilePath`|UI-Helfer|
|`lib/utils/index`|`cn`|Styling|
|`lib/utils/api-error`|`safeErrorResponse`, `safeErrorMessage`|Fehlerbehandlung|
|`lib/utils/bot-detection`|`isBot`|Sicherheit|
|`lib/utils/currency-format`|`formatCurrency`, `formatCurrencyAmount`, `getCurrencySymbol`|Formatierung|
|`lib/utils/email-validation`|`isValidEmail`, `isValidEmailRegex`|Validierung|
|`lib/utils/featured-items`|`sortItemsWithFeatured`, `filterActiveFeaturedItems`|Daten|
|`lib/utils/pagination-validation`|`validatePaginationParams`|Validierung|
|`lib/utils/rate-limit`|`ratelimit`, `resetRateLimit`|Sicherheit|
|`lib/utils/server-url`|`getFrontendUrl`|Infrastruktur|
|`lib/utils/slug`|`slugify`, `deslugify`|Formatierung|
|`lib/utils/url-cleaner`|`cleanUrl`, `getBaseUrl`, `buildUrl`|Infrastruktur|
