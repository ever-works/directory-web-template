---
id: architecture
title: Przegląd architektury
sidebar_label: Przegląd
sidebar_position: 0
---

# Przegląd architektury

Ta strona zawiera ogólną mapę architektury szablonów Ever Works. Użyj go jako punktu wyjścia przed zagłębieniem się w szczegółowe strony, które znajdziesz poniżej.

## Fundacja Technologiczna

Szablon to aplikacja **Next.js 16** korzystająca z **App Router** i **React 19**. Generuje dane wyjściowe `standalone` dla wdrożeń kontenerowych i stosuje kilka optymalizacji na poziomie frameworka w `next.config.ts`:

|Warstwa|Technologia|Cel|
|---|---|---|
|**Ramy**|Next.js 16 (router aplikacji)|Renderowanie serwerów i klientów, routing, trasy API|
|**interfejs**|React 19, HeroUI, Radix UI, Tailwind CSS 4|Biblioteka komponentów, prymitywy, stylizacja|
|**Baza danych**|Drizzle ORM + PostgreSQL (lub lokalnie SQLite)|Zarządzanie schematami, migracje, zapytania|
|**Uwierzytelnianie**|DalejAuth.js v5 (beta)|Uwierzytelnianie wielu dostawców z buforowaniem sesji|
|**Internacjonalizacja**|następny-międzynarodowy|Routing uwzględniający ustawienia regionalne i pakiety komunikatów|
|**Płatności**|Stripe, Polar, LemonSqueezy, Solidgate|Subskrypcja i przepływy płatności jednorazowych|
|**Treść**|CMS oparty na Git (`.content/` katalog)|Treść Markdown/YAML sklonowana z repozytorium danych|
|**Monitorowanie**|Sentry, PostHog i Vercel Analytics|Śledzenie błędów, analityka produktu, wydajność|
|**E-mail**|Wyślij ponownie|Dostawa e-maili transakcyjnych|
|**Tekst bogaty**|Dotknij|Edytor WYSIWYG dla treści administracyjnych|

## Struktura projektu

Szablon ma strukturę warstwową opartą na funkcjach. Oto katalogi najwyższego poziomu i ich obowiązki:

```text
template/
  app/              # Next.js App Router -- routes and layouts
    [locale]/       # Locale-prefixed pages (i18n)
      admin/        # Admin dashboard pages
      auth/         # Authentication flows
      dashboard/    # Client dashboard
      items/        # Item detail pages
      categories/   # Category browsing
      ...
    api/            # API route handlers
  components/       # Shared React components (UI, layout, features)
  lib/              # Core logic -- the heart of the application
    auth/           # Authentication providers, guards, session caching
    db/             # Drizzle schema, migrations, seed, queries
    middleware/     # Permission checks and middleware utilities
    repositories/  # Data-access layer (database queries)
    services/      # Business logic services
    payment/       # Payment provider integrations
    mail/           # Email templates and sending
    analytics/     # Analytics tracking layer
    config/        # Centralized configuration service
    validations/   # Zod schemas for input validation
    utils/         # General utility functions
    ...
  hooks/            # Custom React hooks (React Query wrappers, UI logic)
  constants/        # Application-wide constants
  types/            # Shared TypeScript type definitions
  i18n/             # Internationalization setup and locale request config
  messages/         # Translation message files (JSON per locale)
  e2e/              # Playwright end-to-end tests
  scripts/          # Build, seed, migration, and utility scripts
  public/           # Static assets
```

Pełny opis katalogu znajdziesz na stronie [Struktura projektu](/architecture/project-structure).

## Architektura warstwowa

Baza kodu wymusza wyraźny podział problemów na trzy warstwy:

### Warstwa prezentacji

Komponenty React w `components/` i pliki stron w `app/[locale]/` obsługują renderowanie i interakcję z użytkownikiem. Składniki serwera pobierają dane bezpośrednio; Komponenty klienckie korzystają z haków React Query z `hooks/` dla stanu po stronie klienta.

### Warstwa logiki biznesowej

Usługi w `lib/services/` zawierają podstawowe zasady biznesowe. Szablon zawiera ponad 30 plików usług obejmujących analitykę, subskrypcje, moderację, synchronizację CRM, geokodowanie, powiadomienia i nie tylko. Usługi są wywoływane przez procedury obsługi tras API i komponenty serwera, ale nigdy bezpośrednio przez kod interfejsu użytkownika w przeglądarce.

### Warstwa dostępu do danych

Repozytoria w `lib/repositories/` hermetyzują wszystkie zapytania do baz danych przy użyciu Drizzle ORM. Każda jednostka domeny (elementy, kategorie, kolekcje, użytkownicy, role, tagi, reklamy sponsorów) ma swój własny plik repozytorium. Dzięki temu szczegóły na poziomie SQL pozostają poza warstwą usług.

Aby głębiej przyjrzeć się przepływowi danych między tymi warstwami, zobacz [Przepływ danych](/architecture/data-flow).

## Router i routing aplikacji Next.js

Wszystkie trasy dostępne dla użytkowników znajdują się pod `app/[locale]/`, co umożliwia natychmiastowe korzystanie z adresów URL z prefiksem regionalnym za pośrednictwem `next-intl`. Aplikacja wykorzystuje kilka funkcji App Router:

- **Układy** -- zagnieżdżone pliki `layout.tsx` dla administratora, panelu klienta i obszarów publicznych.
- **Grupy tras** — grupa `(listing)` obsługuje listę głównych katalogów i przeglądanie tagów bez wpływu na strukturę adresu URL.
- **Trasy dynamiczne** -- `[page]`, `[...tag]` oraz nazwane segmenty dla elementów, kategorii i kolekcji.
- **Przepisuje** — zdefiniowano w `next.config.ts`, aby przekierowywać ścieżki kategorii do ich widoku odkrywania podzielonego na strony.

Pełną mapę tras znajdziesz w [Routing](/architecture/routing).

## System uwierzytelniania

Uwierzytelnianie opiera się na **NextAuth.js v5** z systemem konfiguracji dostawcy w `lib/auth/`. Plik `auth.config.ts` w katalogu głównym projektu organizuje:

- **Dostawcy OAuth** – Google i GitHub, konfigurowani za pomocą zmiennych środowiskowych i dynamicznie włączani/wyłączani.
- **Dostawca danych uwierzytelniających** — uwierzytelnianie e-mailem/hasłem za pomocą skrótu bcrypt.
- **Adapter Supabase** – opcjonalny magazyn sesji wspierany przez Supabase.
- **Buforowanie sesji** -- `lib/auth/cached-session.ts` ogranicza zbędne wyszukiwanie sesji.
- **System ochrony** -- `lib/auth/guards.ts` i `lib/guards/` wymuszają dostęp oparty na rolach na poziomie trasy.

Szczegółowe informacje na temat systemu strażników i uprawnień opartych na rolach znajdziesz w [System strażników](/architecture/guards-system) i [System uprawnień](/architecture/permissions-system).

## Skrop ORM i bazę danych

Warstwa bazy danych wykorzystuje **Drizzle ORM** ze schematem zdefiniowanym w `lib/db/schema.ts`. Kluczowe aspekty:

- **Migracje** są generowane za pomocą `drizzle-kit generate` i stosowane za pomocą `drizzle-kit migrate`.
- **Skrypty inicjujące** w `lib/db/seed.ts` i `scripts/cli-seed.ts` wypełniają dane początkowe, w tym role.
- **Konfiguracja** znajduje się w `drizzle.config.ts` w katalogu głównym projektu.
- Do produkcji wymagany jest PostgreSQL; SQLite jest obsługiwany w przypadku rozwoju lokalnego.

Zobacz [Wzorce repozytorium](/architecture/repository-patterns), aby dowiedzieć się, jak zorganizowana jest warstwa dostępu do danych.

## Łańcuch oprogramowania pośredniego

Szablon wykorzystuje oprogramowanie pośrednie Next.js (poprzez wtyczkę `next-intl` zastosowaną w `next.config.ts`) w połączeniu z niestandardową kontrolą uprawnień w `lib/middleware/permission-check.ts`. Potok oprogramowania pośredniego obsługuje:

- Wykrywanie ustawień regionalnych i routing
- Weryfikacja stanu uwierzytelnienia
- Ochrona tras oparta na rolach
- Nagłówki zabezpieczeń (HSTS, CSP, X-Frame-Options i inne — skonfigurowane w `next.config.ts`)

Szczegółowe informacje można znaleźć w artykułach [Middleware](/architecture/middleware) i [Middleware Deep Dive](/architecture/middleware-deep-dive).

## Konfiguracja i bezpieczeństwo

Plik `next.config.ts` ustawia kilka domyślnych ustawień bezpieczeństwa i wydajności:

- **Samodzielne dane wyjściowe** do wdrożeń przyjaznych platformie Docker.
- **Nagłówki zabezpieczeń**, w tym Content-Security-Policy, HSTS, X-Content-Type-Options i X-Frame-Options.
- **Optymalizacja obrazu** ze zdalną obsługą wzorców i zasadami bezpieczeństwa SVG.
- **Integracja Sentry** zastosowana jako najbardziej zewnętrzne opakowanie konfiguracji do śledzenia błędów.
- **Optymalizacja pakietu** dla HeroUI i Lucide React w celu zmniejszenia rozmiaru pakietu.

## Szczegółowe strony poświęcone architekturze

Przeglądaj te strony, aby uzyskać głębsze omówienie poszczególnych systemów:

|Strona|Co obejmuje|
|---|---|
|[Stos technologii](/architektura/stos technologii)|Pełny spis zależności i szczegóły wersji|
|[Struktura projektu](/architektura/struktura-projektu)|Przewodnik po katalogu|
|[Przepływ danych](/architektura/przepływ danych)|Cykl życia żądania od przeglądarki do bazy danych|
|[Routing](/architektura/routing)|Struktura routera aplikacji i wzorce adresów URL|
|[Wzorce komponentów](/architecture/component-patterns)|Komponenty serwera a klienta, wzorce kompozycji|
|[Zarządzanie stanem](/architektura/zarządzanie stanem)|Reaguj na zapytanie, Zustand i stan serwera|
|[Warstwa API](/architektura/warstwa API)|Projektowanie interfejsu API REST i wzorce obsługi tras|
|[Oprogramowanie pośrednie](/architektura/oprogramowanie pośrednie)|Potok oprogramowania pośredniczącego i przetwarzanie żądań|
|[System strażników](/architektura/system strażników)|Kontrola dostępu oparta na rolach na poziomie trasy|
|[System uprawnień](/architektura/system uprawnień)|Szczegółowe definicje uprawnień|
|[Wzorce repozytorium](/architecture/repository-patterns)|Konwencje warstwy dostępu do danych|
|[Wzorce walidacji](/architecture/validation-patterns)|Schematy Zoda i walidacja danych wejściowych|
|[System motywów](/architektura/system motywów)|Architektura motywów i zarządzanie kolorami|
|[System kolorów](/architektura/system-kolorów)|Potok dynamicznego generowania kolorów|
|[System SEO](/architektura/system SEO)|Metadane, mapy witryn i dane strukturalne|
|[Biblioteka płatności](/architecture/payment-library)|Integracja płatności wielu dostawców|
|[Biblioteka treści](/architecture/content-library)|Potok treści CMS oparty na Git|
|[System edytora](/architektura/system edytora)|Integracja edytora tekstu sformatowanego Tiptap|
|[Wzorce mapowania](/architecture/mapper-patterns)|Transformacja danych pomiędzy warstwami|
|[Granice błędów](/architektura/ograniczenia błędów)|Obsługa błędów i odzyskiwanie|
|[Warstwa analityczna](/architektura/warstwa analityczna)|Śledzenie zdarzeń i potok analiz|
|[System Swagger](/architektura/system Swagger)|Generowanie dokumentacji OpenAPI|

## Gdzie iść dalej

- **Jesteś nowy w projekcie?** Zacznij od [Pierwsze kroki](/getting-started), aby zainstalować i uruchomić szablon.
- **Chcesz dostosować?** Przejdź do sekcji [Przewodniki](/guides), gdzie znajdziesz szczegółowe samouczki.
- **Chcesz mieć pełen asortyment technologii?** Zobacz [Stos technologii](/architecture/tech-stack).

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
