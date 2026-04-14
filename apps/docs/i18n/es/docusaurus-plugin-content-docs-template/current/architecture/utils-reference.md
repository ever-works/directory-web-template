---
id: utils-reference
title: "Referencia de servicios públicos"
sidebar_label: "Referencia de utilidades"
sidebar_position: 24
---

# Referencia de servicios públicos

La plantilla proporciona funciones de utilidad en dos directorios: `utils/` para ayudas de propósito general y `lib/utils/` para utilidades integradas en el marco. Esta referencia documenta cada módulo de utilidad, sus exportaciones y patrones de uso.

## Estructura del directorio

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

## Utilidades de fecha (`utils/date.ts`)

### formatoFecha

Formatea una fecha con mes, día y año largos.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### formatoFechaHora

Formatea una fecha con mes, día, año, hora y minuto largos.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### formatoFechaCorto

Formatos con mes corto. Devuelve `'-'` para valores nulos/indefinidos.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## Paginación (`utils/pagination.ts`)

### abrazadera y desplazamiento hacia arriba

Fija un número de página en un rango válido y desplaza la ventana hacia arriba.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|Parámetro|Tipo|Descripción|
|---|---|---|
|`newPage`|`number`|Número de página solicitado|
|`total`|`number`|Número total de páginas|
|`setPage`|`(page: number) => void`|Función de establecimiento de estado|

Comportamiento: Se fija en el rango `[1, total]`, maneja `NaN` de forma predeterminada en 1 y realiza un desplazamiento suave hacia arriba.

## Utilidades del botón de perfil (`utils/profile-button.utils.ts`)

### formatoNombre de visualización

Formatea de forma inteligente los nombres para mostrar según su longitud:

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### obtenerIniciales

Extrae iniciales de un nombre:

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### obtener ruta de perfil

Crea una ruta de perfil segura para URL:

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### getThemeColors

Devuelve los colores del tema actual para las superposiciones de la interfaz de usuario:

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## Fusión de nombre de clase (`lib/utils/index.ts`)

### cn

Combina clases de Tailwind CSS con resolución de conflictos:

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

Utiliza `clsx` para clases condicionales y `tailwind-merge` para resolución de conflictos.

## Manejo de errores de API (`lib/utils/api-error.ts`)

### respuesta de error segura

Crea respuestas de error que evitan la fuga de información en producción:

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|Medio ambiente|La respuesta contiene|
|---|---|
|Desarrollo|Real `error.message`|
|Producción|Genérico `fallbackMessage` únicamente|

Los detalles completos del error siempre se registran en el lado del servidor, independientemente del entorno.

### mensaje de error seguro

Extrae una cadena de mensaje de error seguro sin crear una respuesta:

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## Validación de correo electrónico (`lib/utils/email-validation.ts`)

### escorreo electrónico válido

Validación de correo electrónico segura para ReDoS mediante análisis manual (sin expresiones regulares vulnerables):

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

Reglas de validación:
- Longitud entre 5 y 254 caracteres
- Parte local: 1-64 caracteres, alfanuméricos + caracteres especiales permitidos
- Dominio: estructura válida con al menos un punto.
- Cada etiqueta de dominio: 1-63 caracteres, comienza/termina con alfanumérico

### esValidEmailRegex

Validación alternativa basada en expresiones regulares (también segura para ReDoS):

```typescript
isValidEmailRegex('user@example.com')  // true
```

## Formato de moneda (`lib/utils/currency-format.ts`)

### formatoMoneda

Da formato a importes de unidades menores (céntimos) en cadenas de moneda localizadas:

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### formatoMonedaMonto

Da formato a importes de unidades principales (dólares) en cadenas de moneda localizadas:

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### obtener símbolo de moneda

Devuelve el símbolo de un código de moneda:

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

Admite 22 monedas, incluidas USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW y más.

## Utilidades Slug (`lib/utils/slug.ts`)

### slugificar

Convierte texto en slugs compatibles con URL:

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### deslugificar

Convierte slugs nuevamente en texto legible:

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## Utilidades de URL (`lib/utils/url-cleaner.ts`)

### URL limpia

Limpia y normaliza cadenas de URL:

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### esValidAbsoluteUrl

Valida que una URL sea absoluta con protocolo y nombre de host:

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### getBaseUrl

Devuelve la URL base de la aplicación normalizada con cadena alternativa:

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### URL de compilación

Construye URL completas a partir de segmentos de ruta:

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## Limitación de velocidad (`lib/utils/rate-limit.ts`)

### límite de velocidad

Limitador de velocidad en memoria para puntos finales API:

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

Tipo de devolución:

```typescript
interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;  // Seconds until reset (only when limited)
}
```

### restablecerRateLimit / getRateLimitStatus

```typescript
resetRateLimit('api:192.168.1.1');     // Clear rate limit for key

const status = getRateLimitStatus('api:192.168.1.1', 100);
// { remaining: 95, resetTime: 1706000000000 }
```

La tienda se limpia automáticamente cada 5 minutos.

## Validación de paginación (`lib/utils/pagination-validation.ts`)

### validarPaginationParams

Validación de parámetros de paginación del lado del servidor para rutas API:

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

Reglas de validación:
- `page`: debe ser un número entero positivo (predeterminado: 1)
- `limit`: debe estar entre 1 y 100 (predeterminado: 10)

## Detección de robots (`lib/utils/bot-detection.ts`)

### esBot

Detecta bots por cadena de usuario-agente:

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

Categorías detectadas: motores de búsqueda, rastreadores de redes sociales, herramientas de rendimiento, marcos de automatización, clientes HTTP.

## Artículos destacados (`lib/utils/featured-items.ts`)

### ordenar artículos con destacados

Coloca los elementos destacados al principio de una lista, ordenados por orden de presentación:

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

Elimina los elementos destacados caducados según la fecha `featuredUntil`.

### isFeaturedItemExpiring

Comprueba si un artículo destacado caduca dentro de los 7 días.

## URL del servidor (`lib/utils/server-url.ts`)

### getFrontendUrl

Resuelve la URL del frontend desde el contexto de solicitud actual:

```typescript
const url = await getFrontendUrl();
```

Orden de resolución:
1. `window.location.origin` (lado del cliente)
2. `x-forwarded-host` / `host` encabezados (del lado del servidor, validados contra la configuración)
3. Reserva `WEB_URL` configurada

## Tabla resumen

|Módulo|Exportaciones clave|categoría|
|---|---|---|
|`utils/date`|`formatDate`, `formatDateTime`, `formatDateShort`|Formato|
|`utils/pagination`|`clampAndScrollToTop`|Ayudantes de interfaz de usuario|
|`utils/profile-button.utils`|`formatDisplayName`, `getInitials`, `getProfilePath`|Ayudantes de interfaz de usuario|
|`lib/utils/index`|`cn`|Estilo|
|`lib/utils/api-error`|`safeErrorResponse`, `safeErrorMessage`|Manejo de errores|
|`lib/utils/bot-detection`|`isBot`|Seguridad|
|`lib/utils/currency-format`|`formatCurrency`, `formatCurrencyAmount`, `getCurrencySymbol`|Formato|
|`lib/utils/email-validation`|`isValidEmail`, `isValidEmailRegex`|Validación|
|`lib/utils/featured-items`|`sortItemsWithFeatured`, `filterActiveFeaturedItems`|Datos|
|`lib/utils/pagination-validation`|`validatePaginationParams`|Validación|
|`lib/utils/rate-limit`|`ratelimit`, `resetRateLimit`|Seguridad|
|`lib/utils/server-url`|`getFrontendUrl`|Infraestructura|
|`lib/utils/slug`|`slugify`, `deslugify`|Formato|
|`lib/utils/url-cleaner`|`cleanUrl`, `getBaseUrl`, `buildUrl`|Infraestructura|
