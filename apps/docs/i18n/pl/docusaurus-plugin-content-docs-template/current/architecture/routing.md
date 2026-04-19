---
id: routing
title: Architektura routingu
sidebar_label: Trasowanie
sidebar_position: 6
---

# Architektura routingu

Szablon Ever Works korzysta z routera aplikacji Next.js z internacjonalizacją za pośrednictwem `next-intl`, zapewniając trasy z prefiksem ustawień regionalnych, grupy tras dla organizacji logicznej i kompleksową warstwę API.

## Router aplikacji z segmentem ustawień regionalnych

Wszystkie strony skierowane do użytkownika są zagnieżdżone w dynamicznym segmencie `[locale]`, umożliwiając obsługę wielu języków dla 6 ustawień regionalnych: `en`, `fr`, `es`, `de`, `ar` i `zh`.

```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale layout (wraps all localized pages)
│   ├── providers.tsx   # Client providers for the locale subtree
│   ├── globals.css     # Global styles
│   └── ...pages        # All localized pages
├── api/                # API routes (not locale-prefixed)
├── layout.tsx          # Root layout (HTML, fonts, metadata)
└── not-found.tsx       # 404 page
```

Adresy URL mają wzór `/{locale}/path`, na przykład:
- `/en/pricing` — Strona z cenami w języku angielskim
- `/fr/admin/items` — francuska strona elementów administracyjnych
- `/de/categories` -- Strona z kategoriami w języku niemieckim

## Konfiguracja Next.js

`next.config.ts` konfiguruje kilka zachowań routingu:

### Przepisuje

```typescript
async rewrites() {
  return [
    {
      source: "/:path",
      destination: "/:path/discover/1",
    },
    {
      source: "/:path/discover",
      destination: "/:path/discover/1",
    },
  ];
}
```

Te zmiany przekierowują ścieżkę głównych ustawień regionalnych i `/discover` na pierwszą stronę listy odkrywania (`/discover/1`), zapewniając czysty domyślny adres URL.

### Nagłówki zabezpieczeń

Wszystkie trasy otrzymują nagłówki zabezpieczeń, w tym:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` z maksymalnym wiekiem 2 lat
- `Content-Security-Policy` z restrykcyjnymi ustawieniami domyślnymi
- `Referrer-Policy: strict-origin-when-cross-origin`

### wtyczka next-intl

Wtyczka `next-intl` jest stosowana do konfiguracji Next.js, wskazując na `./i18n/request.ts` w celu rozwiązania ustawień regionalnych:

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## Grupy tras

Katalog `[locale]` wykorzystuje kilka logicznych grup do organizowania stron:

### (lista) -- Strony z listami głównymi

Grupa tras `(listing)` to grupa ujęta w nawiasy (bez segmentu adresu URL), która otacza strony z listami głównych katalogów we wspólnym układzie.

### admin/ -- Panel administracyjny

Sekcja administracyjna zapewnia kompletny interfejs zaplecza:

```
[locale]/admin/
├── auth/               # Admin sign-in
├── categories/         # Category CRUD
├── clients/            # Client management
├── collections/        # Collection CRUD
├── comments/           # Comment moderation
├── companies/          # Company management
├── featured-items/     # Featured item management
├── items/              # Item review and management
├── reports/            # Report review
├── roles/              # Role and permission management
├── settings/           # Site settings
├── sponsorships/       # Sponsorship management
├── surveys/            # Survey builder
├── tags/               # Tag management
├── users/              # User management
├── layout.tsx          # Admin layout (sidebar, navigation)
├── layout-client.tsx   # Client-side admin layout logic
└── page.tsx            # Admin dashboard
```

### auth/ -- Strony uwierzytelniania

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### klient/ -- Panel Klienta

Sekcja klienta udostępnia funkcje uwierzytelnionego użytkownika umożliwiające zarządzanie własnymi zgłoszeniami i kontem.

### dashboard/ -- Panel użytkownika

Ogólny panel użytkownika z przeglądem konta, aktywnością i ustawieniami.

## Trasy API (29 grup)

Trasy API znajdują się poza segmentem `[locale]` pod adresem `app/api/` i nie mają prefiksu regionalnego. Służą jako backend do pobierania danych po stronie klienta.

|Grupa tras|Cel|Kluczowe punkty końcowe|
|-------------|---------|---------------|
|`admin/`|Operacje administracyjne|Elementy, użytkownicy, kategorie, ustawienia|
|`auth/`|Uwierzytelnianie|Sesja, wywołania zwrotne OAuth|
|`categories/`|Dane kategorii|Lista, szukaj|
|`client/`|Operacje klienta|Profil, zgłoszenia, dashboard|
|`collections/`|Dane zbiorcze|Lista, szczegół|
|`config/`|Konfiguracja witryny|Flagi funkcji, ustawienia|
|`cron/`|Zaplanowane zadania|Sprawdzanie subskrypcji, sprzątanie|
|`current-user/`|Aktualne informacje o użytkowniku|Profil, dane sesji|
|`extract/`|Ekstrakcja adresu URL|Ekstrakcja metadanych z adresów URL|
|`favorites/`|Ulubione|Dodaj, usuń, wypisz|
|`featured-items/`|Polecane przedmioty|Lista aktywnych polecanych elementów|
|`geocode/`|Geokodowanie|Wyszukiwanie adresów, odwrotne geokodowanie|
|`health/`|Kontrola stanu zdrowia|Stan bazy danych i usługi|
|`internal/`|Operacje wewnętrzne|Punkty końcowe na poziomie systemu|
|`items/`|Dane przedmiotu|Lista, szczegóły, wyszukiwanie|
|`lemonsqueezy/`|Wyciskacz cytrynowy|Obsługa webhooka|
|`location/`|Dane lokalizacyjne|Przedmioty w pobliżu, wyszukiwanie lokalizacji|
|`payment/`|Operacje płatnicze|Zamówienie, metody płatności|
|`polar/`|Polarny|Obsługa webhooka|
|`reference/`|Dane referencyjne|Wyliczenia, wartości wyszukiwania|
|`reports/`|Raporty dotyczące treści|Przesyłaj, przeglądaj raporty|
|`solidgate/`|Solidgate|Obsługa webhooka|
|`sponsor-ads/`|Reklamy sponsorskie|CRUD, aktywacja|
|`stripe/`|Pasek|Obsługa webhooka, realizacja transakcji|
|`surveys/`|Ankiety|Lista, odpowiedź, wyniki|
|`user/`|Operacje użytkownika|Profil, ustawienia|
|`verify-recaptcha/`|reCAPTCHA|Weryfikacja tokena|
|`version/`|Informacje o wersji|Informacje o wersji aplikacji i kompilacji|

## Oprogramowanie pośrednie

Aplikacja wykorzystuje oprogramowanie pośrednie `next-intl` do wykrywania ustawień regionalnych i routingu. Oprogramowanie pośrednie obsługuje:

1. **Wykrywanie ustawień regionalnych**: Określa ustawienia regionalne użytkownika na podstawie ścieżki URL, plików cookie lub nagłówka `Accept-Language`
2. **Przekierowania regionalne**: przekierowuje żądania bez prefiksu ustawień regionalnych do odpowiednich ustawień regionalnych
3. **Domyślne ustawienia regionalne**: Powrót do języka angielskiego (`en`), jeśli nie wykryto preferencji ustawień regionalnych

Oprogramowanie pośrednie jest konfigurowane w katalogu `i18n/` z regułami routingu ustawień regionalnych zdefiniowanymi w `i18n/routing.ts` i obsługą żądań w `i18n/request.ts`.

## Generacja statyczna i trasy dynamiczne

Szablon wykorzystuje kilka strategii pobierania danych:

- **Generowanie statyczne**: Strony takie jak polityka prywatności, warunki korzystania z usług i informacje są generowane statycznie
- **Renderowanie dynamiczne**: strony administracyjne, pulpity nawigacyjne i strony uwierzytelnione renderują się dynamicznie
- **ISR (przyrostowa regeneracja statyczna)**: strony z listami kategorii i tagów korzystają z ISR z ponowną walidacją
- **Generowanie mapy witryny**: `app/sitemap.ts` dynamicznie generuje mapę witryny na podstawie danych dotyczących treści

`staticPageGenerationTimeout` jest ustawiony na 180 sekund w `next.config.ts`, aby pomieścić duże repozytoria treści podczas kompilacji.
