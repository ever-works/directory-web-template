---
id: utils-reference
title: "Référence des utilitaires"
sidebar_label: "Référence des utilitaires"
sidebar_position: 24
---

# Référence des utilitaires

Le modèle fournit des fonctions utilitaires dans deux répertoires : `utils/` pour les assistants à usage général et `lib/utils/` pour les utilitaires intégrés au framework. Cette référence documente chaque module utilitaire, ses exportations et ses modèles d'utilisation.

## Structure du répertoire

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

## Utilitaires de dates (`utils/date.ts`)

### formatDate

Formate une date avec un mois, un jour et une année longs.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### formatDateHeure

Formate une date avec un mois, un jour, une année, une heure et une minute longs.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### formatDateCourt

Formats avec mois court. Renvoie `'-'` pour les valeurs nulles/non définies.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## Pagination (`utils/pagination.ts`)

### clampAndScrollToTop

Fixe un numéro de page à une plage valide et fait défiler la fenêtre vers le haut.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|Paramètre|Tapez|Descriptif|
|---|---|---|
|`newPage`|`number`|Numéro de page demandé|
|`total`|`number`|Nombre total de pages|
|`setPage`|`(page: number) => void`|Fonction de définition d'état|

Comportement : se fixe à la plage `[1, total]`, gère `NaN` par défaut sur 1 et effectue un défilement fluide vers le haut.

## Utilitaires du bouton de profil (`utils/profile-button.utils.ts`)

### formatNomAffichage

Formate intelligemment les noms d'affichage en fonction de la longueur :

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### obtenirInitiales

Extrait les initiales d'un nom :

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### obtenirProfilePath

Crée un chemin de profil sécurisé pour les URL :

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### getThemeColors

Renvoie les couleurs du thème actuel pour les superpositions de l'interface utilisateur :

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## Fusion de noms de classe (`lib/utils/index.ts`)

### CN

Combine les classes CSS Tailwind avec la résolution des conflits :

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

Utilise `clsx` pour les classes conditionnelles et `tailwind-merge` pour la résolution des conflits.

## Gestion des erreurs API (`lib/utils/api-error.ts`)

### réponse d'erreur sûre

Crée des réponses d'erreur qui empêchent les fuites d'informations en production :

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|Environnement|La réponse contient|
|---|---|
|Développement|Réel `error.message`|
|Fabrication|Générique `fallbackMessage` uniquement|

Les détails complets de l’erreur sont toujours enregistrés côté serveur, quel que soit l’environnement.

### message d'erreur sécurisé

Extrait une chaîne de message d'erreur sécurisée sans créer de réponse :

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## Validation par e-mail (`lib/utils/email-validation.ts`)

### estValideEmail

Validation des e-mails sécurisée ReDoS à l'aide d'une analyse manuelle (pas d'expression régulière vulnérable) :

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

Règles de validation :
- Longueur comprise entre 5 et 254 caractères
- Partie locale : 1 à 64 caractères, alphanumériques + caractères spéciaux autorisés
- Domaine : structure valide avec au moins un point
- Chaque étiquette de domaine : 1 à 63 caractères, commence/se termine par un caractère alphanumérique

### isValidEmailRegex

Validation alternative basée sur les regex (également sécurisée pour ReDoS) :

```typescript
isValidEmailRegex('user@example.com')  // true
```

## Formatage de la devise (`lib/utils/currency-format.ts`)

### formatDevise

Formate les montants en unités mineures (cents) en chaînes de devises localisées :

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### formatDeviseMontant

Formate les montants en unités principales (dollars) en chaînes de devises localisées :

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### getCurrencySymbol

Renvoie le symbole d'un code de devise :

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

Prend en charge 22 devises, dont USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW, etc.

## Utilitaires Slug (`lib/utils/slug.ts`)

### slugifier

Convertit le texte en slugs adaptés aux URL :

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### déslugifier

Convertit les slugs en texte lisible :

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## Utilitaires URL (`lib/utils/url-cleaner.ts`)

### URL propre

Nettoie et normalise les chaînes d'URL :

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

Valide qu'une URL est absolue avec le protocole et le nom d'hôte :

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### obtenirBaseUrl

Renvoie l'URL de base de l'application normalisée avec la chaîne de secours :

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### buildUrl

Construit des URL complètes à partir de segments de chemin :

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## Limitation de débit (`lib/utils/rate-limit.ts`)

### limite de débit

Limiteur de débit en mémoire pour les points de terminaison de l'API :

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

Type de retour :

```typescript
interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;  // Seconds until reset (only when limited)
}
```

### réinitialiserRateLimit / getRateLimitStatus

```typescript
resetRateLimit('api:192.168.1.1');     // Clear rate limit for key

const status = getRateLimitStatus('api:192.168.1.1', 100);
// { remaining: 95, resetTime: 1706000000000 }
```

Le magasin est automatiquement nettoyé toutes les 5 minutes.

## Validation de la pagination (`lib/utils/pagination-validation.ts`)

### validatePaginationParams

Validation des paramètres de pagination côté serveur pour les routes API :

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

Règles de validation :
- `page` : doit être un entier positif (par défaut : 1)
- `limit` : doit être compris entre 1 et 100 (par défaut : 10)

## Détection de robots (`lib/utils/bot-detection.ts`)

### estBot

Détecte les robots par chaîne User-Agent :

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

Catégories détectées : moteurs de recherche, robots d'exploration des réseaux sociaux, outils de performance, frameworks d'automatisation, clients HTTP.

## Articles en vedette (`lib/utils/featured-items.ts`)

### sortItemsWithFeatured

Place les éléments en vedette au début d'une liste, triés par ordre de présentation :

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

Supprime les éléments en vedette expirés en fonction de la date `featuredUntil`.

### isFeaturedItemExpiring

Vérifie si un article en vedette expire dans les 7 jours.

## URL du serveur (`lib/utils/server-url.ts`)

### getFrontendUrl

Résout l'URL du frontend à partir du contexte de requête actuel :

```typescript
const url = await getFrontendUrl();
```

Ordre de résolution :
1. `window.location.origin` (côté client)
2. `x-forwarded-host` / `host` en-têtes (côté serveur, validés par rapport à la configuration)
3. Configuré `WEB_URL` secours

## Tableau récapitulatif

|Module|Exportations clés|Catégorie|
|---|---|---|
|`utils/date`|`formatDate`, `formatDateTime`, `formatDateShort`|Formatage|
|`utils/pagination`|`clampAndScrollToTop`|Aides à l'interface utilisateur|
|`utils/profile-button.utils`|`formatDisplayName`, `getInitials`, `getProfilePath`|Aides à l'interface utilisateur|
|`lib/utils/index`|`cn`|Stylisme|
|`lib/utils/api-error`|`safeErrorResponse`, `safeErrorMessage`|Gestion des erreurs|
|`lib/utils/bot-detection`|`isBot`|Sécurité|
|`lib/utils/currency-format`|`formatCurrency`, `formatCurrencyAmount`, `getCurrencySymbol`|Formatage|
|`lib/utils/email-validation`|`isValidEmail`, `isValidEmailRegex`|Validation|
|`lib/utils/featured-items`|`sortItemsWithFeatured`, `filterActiveFeaturedItems`|Données|
|`lib/utils/pagination-validation`|`validatePaginationParams`|Validation|
|`lib/utils/rate-limit`|`ratelimit`, `resetRateLimit`|Sécurité|
|`lib/utils/server-url`|`getFrontendUrl`|Infrastructures|
|`lib/utils/slug`|`slugify`, `deslugify`|Formatage|
|`lib/utils/url-cleaner`|`cleanUrl`, `getBaseUrl`, `buildUrl`|Infrastructures|
