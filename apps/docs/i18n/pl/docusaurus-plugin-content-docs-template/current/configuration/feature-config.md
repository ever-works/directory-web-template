---
id: feature-config
title: "Konfiguracja Funkcji"
sidebar_label: "Feature Config"
sidebar_position: 3
---

# Konfiguracja Funkcji

Szablon używa systemu flag funkcji do kontrolowanego włączania lub wyłączania funkcjonalności w oparciu o konfigurację systemu. Pozwala to aplikacji działać bez bazy danych (serwując tylko treści statyczne), jednocześnie stopniowo włączając funkcje w miarę dostępności infrastruktury.

## Moduł flag funkcji

Flagi funkcji są zdefiniowane w `lib/config/feature-flags.ts`.

### Interfejs FeatureFlags

```ts
interface FeatureFlags {
  /** Funkcjonalność ocen i recenzji użytkowników */
  ratings: boolean;
  /** Komentarze użytkowników do elementów */
  comments: boolean;
  /** Kolekcja ulubionych elementów użytkownika */
  favorites: boolean;
  /** Wyświetlanie wyróżnionych elementów zarządzanych przez administratora */
  featuredItems: boolean;
  /** Ankiety użytkowników i zbieranie opinii */
  surveys: boolean;
}
```

### Jak są określane flagi

Wszystkie aktualne funkcje zależą od dostępności bazy danych. Funkcja jest włączona, gdy `DATABASE_URL` jest skonfigurowane:

```ts
export function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

Ten projekt pozwala szablonowi serwować treści z CMS opartego na Git bez żadnej bazy danych, podczas gdy zależne od bazy danych interaktywne funkcje (oceny, komentarze, ulubione) są automatycznie wyłączane.

### Funkcje pomocnicze

Moduł udostępnia kilka funkcji helper:

```ts
// Sprawdzanie pojedynczej funkcji
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Renderuj komponent komentarzy
}

// Pobieranie wszystkich włączonych funkcji
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
// np. ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']

// Pobieranie wszystkich wyłączonych funkcji (przydatne do debugowania)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// Sprawdzanie, czy wszystko jest gotowe
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('Full platform is operational');
}
```

### Pełna dokumentacja API

| Funkcja | Zwraca | Opis |
|---------|--------|------|
| `getFeatureFlags()` | `FeatureFlags` | Wszystkie flagi jako obiekt Boolean |
| `isFeatureEnabled(name)` | `boolean` | Sprawdź pojedynczą funkcję według nazwy |
| `getEnabledFeatures()` | `string[]` | Tablica włączonych nazw funkcji |
| `getDisabledFeatures()` | `string[]` | Tablica wyłączonych nazw funkcji |
| `areAllFeaturesEnabled()` | `boolean` | Prawda, jeśli każda funkcja jest włączona |

## Renderowanie zależne od funkcji

### W komponentach serwerowych

```tsx
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export default function ItemDetailPage({ item }) {
  const showComments = isFeatureEnabled('comments');
  const showRatings = isFeatureEnabled('ratings');

  return (
    <div>
      <ItemDetail item={item} />
      {showRatings && <RatingSection itemId={item.id} />}
      {showComments && <CommentsSection itemId={item.id} />}
    </div>
  );
}
```

### W trasach API

```ts
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // Obsługa tworzenia komentarza...
}
```

## Konfiguracja witryny (siteConfig)

Poza flagami funkcji, szablon zapewnia obiekt `siteConfig` w `lib/config.ts` do dostosowania brandingu i metadanych. Każda wartość może być nadpisana przez zmienne środowiskowe:

```ts
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://demo.ever.works',
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || '...',
  keywords: process.env.NEXT_PUBLIC_SITE_KEYWORDS?.split(',').map(k => k.trim()) || [...],
  ogImage: {
    gradientStart: process.env.NEXT_PUBLIC_OG_GRADIENT_START || '#667eea',
    gradientEnd: process.env.NEXT_PUBLIC_OG_GRADIENT_END || '#764ba2'
  },
  social: {
    github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || '...',
    x: process.env.NEXT_PUBLIC_SOCIAL_X || '...',
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || '...',
    // ...
  },
  attribution: {
    url: process.env.NEXT_PUBLIC_ATTRIBUTION_URL || 'https://ever.works',
    name: process.env.NEXT_PUBLIC_ATTRIBUTION_NAME || 'Ever Works'
  }
} as const;
```

### Dostosowanie przez zmienne środowiskowe

| Zmienna | Domyślna | Cel |
|---------|----------|-----|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | Nazwa witryny w metadanych i obrazach OG |
| `NEXT_PUBLIC_SITE_TAGLINE` | Domyślna szablonu | Slogan strony głównej |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | Pełny URL witryny (bez końcowego ukośnika) |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | Ścieżka logo względna do `/public` |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | Nazwa organizacji Schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Domyślna szablonu | Meta opis SEO |
| `NEXT_PUBLIC_SITE_KEYWORDS` | Domyślne szablonu | Słowa kluczowe SEO oddzielone przecinkami |
| `NEXT_PUBLIC_OG_GRADIENT_START` | `'#667eea'` | Kolor początkowy gradientu obrazu OG |
| `NEXT_PUBLIC_OG_GRADIENT_END` | `'#764ba2'` | Kolor końcowy gradientu obrazu OG |
| `NEXT_PUBLIC_SOCIAL_GITHUB` | URL Ever Works | Link do profilu GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | URL Ever Works | Link do profilu X (Twitter) |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | Link stopki "Zbudowane z" |

### Walidacja

Funkcja `validateSiteConfig()` sprawdza brakujące zmienne krytyczne dla produkcji:

```ts
import { validateSiteConfig } from '@/lib/config';

// Zwraca true jeśli wszystkie wymagane zmienne są ustawione, false z ostrzeżeniami w przeciwnym razie
const isValid = validateSiteConfig();
```

Ostrzeżenia są logowane dla brakujących `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` i `NEXT_PUBLIC_SITE_NAME`.

## ConfigManager (Konfiguracja YAML)

Klasa `ConfigManager` w `lib/config-manager.ts` zarządza plikiem `config.yml` z repozytorium CMS opartego na Git. Obsługuje odczytywanie, zapisywanie i commitowanie zmian konfiguracji.

### Odczytywanie konfiguracji

```ts
import { configManager } from '@/lib/config-manager';

// Pobieranie całej konfiguracji
const config = configManager.getConfig();

// Pobieranie konkretnego klucza
const pagination = configManager.getPaginationConfig();
// Zwraca: { type: 'standard' | 'infinite', itemsPerPage: 12 }

// Pobieranie zagnieżdżonej wartości
const value = configManager.getNestedValue('pagination.type');
```

### Zapisywanie konfiguracji

Wszystkie zapisy są automatycznie commitowane i wysyłane do repozytorium Git:

```ts
// Aktualizacja paginacji
await configManager.updatePagination('infinite', 24);

// Aktualizacja dowolnego klucza najwyższego poziomu
await configManager.updateKey('pagination', { type: 'standard', itemsPerPage: 20 });

// Aktualizacja zagnieżdżonego klucza
await configManager.updateNestedKey('headerSettings.sticky', true);
```

### Integracja z Git

ConfigManager automatycznie:
1. Zapisuje plik YAML do katalogu zawartości
2. Ustawia w kolejce commit Git z opisową wiadomością
3. Wysyła do skonfigurowanego repozytorium GitHub
4. Serializuje operacje Git, aby zapobiec konfliktom jednoczesnego zapisu

Wiadomości commitów są kontekstowe:

```ts
// Dla zmian paginacji:
"Update pagination configuration (type: infinite, itemsPerPage: 24) - 2024-01-20T..."

// Dla nawigacji nagłówka:
"Update custom header navigation (5 items) - 2024-01-20T..."

// Dla ogólnych kluczy:
"Update config.yml: myKey - 2024-01-20T..."
```

### Bezpieczeństwo

ConfigManager zawiera ochronę przed zatruciem prototypu:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

Próby aktualizacji kluczy `__proto__`, `constructor` lub `prototype` są po cichu odrzucane.

## Powiązane pliki

| Ścieżka | Opis |
|---------|------|
| `lib/config/feature-flags.ts` | Definicje flag funkcji i funkcje pomocnicze |
| `lib/config.ts` | siteConfig bezpieczny dla klienta i ponowne eksporty typów |
| `lib/config-manager.ts` | Czytnik/zapisywacz konfiguracji YAML z integracją Git |
| `lib/config/index.ts` | Barrel export dla modułu konfiguracji |
| `lib/config/config-service.ts` | Singleton ConfigService po stronie serwera |
| `lib/config/types.ts` | Definicje typów TypeScript dla konfiguracji |
| `.env.example` | Pełna lista opcji zmiennych środowiskowych |
