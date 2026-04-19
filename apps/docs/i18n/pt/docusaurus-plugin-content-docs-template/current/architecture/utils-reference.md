---
id: utils-reference
title: "Referência de utilitários"
sidebar_label: "Referência de utilitários"
sidebar_position: 24
---

# Referência de utilitários

O modelo fornece funções utilitárias em dois diretórios: `utils/` para auxiliares de uso geral e `lib/utils/` para utilitários integrados à estrutura. Esta referência documenta cada módulo utilitário, suas exportações e padrões de uso.

## Estrutura de diretório

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

## Utilitários de data (`utils/date.ts`)

### formatoData

Formata uma data com mês, dia e ano longos.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### formatoDataHora

Formata uma data com mês, dia, ano, hora e minuto longos.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### formatoDateShort

Formatos com mês curto. Retorna `'-'` para valores nulos/indefinidos.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## Paginação (`utils/pagination.ts`)

### clampAndScrollToTop

Fixa um número de página em um intervalo válido e rola a janela para o topo.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|Parâmetro|Tipo|Descrição|
|---|---|---|
|`newPage`|`number`|Número da página solicitada|
|`total`|`number`|Número total de páginas|
|`setPage`|`(page: number) => void`|Função setter de estado|

Comportamento: Fixa no intervalo `[1, total]`, manipula `NaN` padronizando 1 e executa rolagem suave para o topo.

## Utilitários de botão de perfil (`utils/profile-button.utils.ts`)

### formatoDisplayName

Formata de forma inteligente os nomes de exibição com base no comprimento:

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### obterIniciais

Extrai iniciais de um nome:

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### getProfilePath

Cria um caminho de perfil seguro para URL:

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### getThemeColors

Retorna as cores atuais do tema para sobreposições de UI:

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## Fusão de nomes de classe (`lib/utils/index.ts`)

### cn

Combina classes CSS do Tailwind com resolução de conflitos:

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

Usa `clsx` para classes condicionais e `tailwind-merge` para resolução de conflitos.

## Tratamento de erros de API (`lib/utils/api-error.ts`)

### safeErrorResponse

Cria respostas de erro que evitam o vazamento de informações na produção:

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|Meio Ambiente|A resposta contém|
|---|---|
|Desenvolvimento|Real `error.message`|
|Produção|Somente `fallbackMessage` genérico|

Os detalhes completos dos erros são sempre registrados no servidor, independentemente do ambiente.

### mensagem de erro segura

Extrai uma string de mensagem de erro segura sem criar uma resposta:

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## Validação de e-mail (`lib/utils/email-validation.ts`)

### isValidE-mail

Validação de e-mail segura para ReDoS usando análise manual (sem regex vulnerável):

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

Regras de validação:
- Comprimento entre 5 e 254 caracteres
- Parte local: 1-64 caracteres, alfanuméricos + caracteres especiais permitidos
- Domínio: estrutura válida com pelo menos um ponto
- Cada rótulo de domínio: 1 a 63 caracteres, começa/termina com alfanumérico

### isValidEmailRegex

Validação alternativa baseada em regex (também segura para ReDoS):

```typescript
isValidEmailRegex('user@example.com')  // true
```

## Formatação de moeda (`lib/utils/currency-format.ts`)

### formatoMoeda

Formata valores de unidades menores (centavos) para strings de moeda localizadas:

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### formatoMoedaValor

Formata valores de unidades principais (dólares) para strings de moeda localizadas:

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### getCurrencySymbol

Retorna o símbolo de um código de moeda:

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

Suporta 22 moedas, incluindo USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW e muito mais.

## Utilitários Slug (`lib/utils/slug.ts`)

### slugificar

Converte texto em slugs compatíveis com URL:

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### deslugificar

Converte slugs de volta em texto legível:

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## Utilitários de URL (`lib/utils/url-cleaner.ts`)

### limparUrl

Limpa e normaliza strings de URL:

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

Valida que uma URL é absoluta com protocolo e nome de host:

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### getBaseUrl

Retorna o URL base do aplicativo normalizado com cadeia de fallback:

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### construirUrl

Constrói URLs completos a partir de segmentos de caminho:

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## Limitação de taxa (`lib/utils/rate-limit.ts`)

### limite de taxa

Limitador de taxa na memória para endpoints de API:

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

Tipo de retorno:

```typescript
interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;  // Seconds until reset (only when limited)
}
```

### resetRateLimit/getRateLimitStatus

```typescript
resetRateLimit('api:192.168.1.1');     // Clear rate limit for key

const status = getRateLimitStatus('api:192.168.1.1', 100);
// { remaining: 95, resetTime: 1706000000000 }
```

A loja é limpa automaticamente a cada 5 minutos.

## Validação de paginação (`lib/utils/pagination-validation.ts`)

### validarPaginationParams

Validação de parâmetros de paginação do lado do servidor para rotas de API:

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

Regras de validação:
- `page`: Deve ser um número inteiro positivo (padrão: 1)
- `limit`: Deve estar entre 1 e 100 (padrão: 10)

## Detecção de bot (`lib/utils/bot-detection.ts`)

### isBot

Detecta bots por string User-Agent:

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

Categorias detectadas: motores de busca, rastreadores de mídia social, ferramentas de desempenho, estruturas de automação, clientes HTTP.

## Itens em destaque (`lib/utils/featured-items.ts`)

### sortItemsWithFeatured

Coloca os itens em destaque no início de uma lista, classificados por ordem de destaque:

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

Remove itens em destaque expirados com base na data `featuredUntil`.

### isFeaturedItemExpiring

Verifica se um item em destaque expira em 7 dias.

## URL do servidor (`lib/utils/server-url.ts`)

### getFrontendUrl

Resolve o URL de frontend do contexto de solicitação atual:

```typescript
const url = await getFrontendUrl();
```

Ordem de resolução:
1. `window.location.origin` (lado do cliente)
2. `x-forwarded-host` / `host` cabeçalhos (lado do servidor, validados em relação à configuração)
3. Configurado substituto `WEB_URL`

## Tabela Resumo

|Módulo|Principais exportações|Categoria|
|---|---|---|
|`utils/date`|`formatDate`, `formatDateTime`, `formatDateShort`|Formatação|
|`utils/pagination`|`clampAndScrollToTop`|Ajudantes de IU|
|`utils/profile-button.utils`|`formatDisplayName`, `getInitials`, `getProfilePath`|Ajudantes de IU|
|`lib/utils/index`|`cn`|Estilo|
|`lib/utils/api-error`|`safeErrorResponse`, `safeErrorMessage`|Tratamento de erros|
|`lib/utils/bot-detection`|`isBot`|Segurança|
|`lib/utils/currency-format`|`formatCurrency`, `formatCurrencyAmount`, `getCurrencySymbol`|Formatação|
|`lib/utils/email-validation`|`isValidEmail`, `isValidEmailRegex`|Validação|
|`lib/utils/featured-items`|`sortItemsWithFeatured`, `filterActiveFeaturedItems`|Dados|
|`lib/utils/pagination-validation`|`validatePaginationParams`|Validação|
|`lib/utils/rate-limit`|`ratelimit`, `resetRateLimit`|Segurança|
|`lib/utils/server-url`|`getFrontendUrl`|Infraestrutura|
|`lib/utils/slug`|`slugify`, `deslugify`|Formatação|
|`lib/utils/url-cleaner`|`cleanUrl`, `getBaseUrl`, `buildUrl`|Infraestrutura|
