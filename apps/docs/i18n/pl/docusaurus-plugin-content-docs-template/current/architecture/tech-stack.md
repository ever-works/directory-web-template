---
id: tech-stack
title: Stos technologii
sidebar_label: Stos technologii
sidebar_position: 2
---

# Stos technologii

Dokument ten zawiera kompleksowy przegląd wszystkich technologii stosowanych w Ever Works.

## Wymagania systemowe

- **Node.js**: 20.19.0 lub nowszy
- **PostgreSQL**: 14.0 lub nowszy
- **Menedżer pakietów**: npm, pnpm, przędza lub bułka

## Technologie frontendowe {#frontend}

### Podstawowe ramy

- **[Next.js 15.4.7](https://nextjs.org/)** - Framework React z App Router
  - Renderowanie po stronie serwera (SSR)
  - Generowanie witryn statycznych (SSG)
  - Przyrostowa regeneracja statyczna (ISR)
  - Akcje serwera dla mutacji
  - Wbudowana optymalizacja
  - Routing oparty na plikach z dynamicznymi segmentami `[locale]`

- **[React 19.1.0](https://react.dev/)** - Biblioteka interfejsu użytkownika
  - Najnowsze funkcje i ulepszenia
  - Współbieżne renderowanie
  - Automatyczne dozowanie
  - Zawieszenie pobierania danych
  - Domyślnie składniki serwera

### Bezpieczeństwo języka i typu

- **[TypeScript 5.x](https://www.typescriptlang.org/)** - Statyczne sprawdzanie typu
  - Włączono tryb ścisły
  - Skonfigurowano mapowanie ścieżki (`@/` alias)
  - Niestandardowe definicje typów
  - Wnioskowanie o pełnym typie

### Stylizacja i interfejs użytkownika

- **[Tailwind CSS 3.4](https://tailwindcss.com/)** — Framework CSS zorientowany na użyteczność
  - Niestandardowy system projektowania
  - Obsługa trybu ciemnego
  - Responsywne narzędzia do projektowania
  - Kompilacja JIT
  - Dynamiczny system kolorów (50-950 odcieni)

- **[HeroUI React 2.6](https://www.heroui.com/)** - Komponenty Modern React
  - Dostępne komponenty
  - Konfigurowalne motywy
  - Obsługa TypeScriptu
  - Możliwość potrząsania drzewem

- **[Radix UI](https://www.radix-ui.com/)** — Komponenty dostępne bez stylu
  - Bezgłowe prymitywne interfejsy użytkownika
  - Pełna nawigacja za pomocą klawiatury
  - Zgodny z ARIA
  - Możliwość komponowania

- **[Framer Motion 12.x](https://www.framer.com/motion/)** - Biblioteka animacji
  - Animacje deklaratywne
  - Wsparcie gestów
  - Animacje układu
  - Animacje SVG

### Edycja tekstu sformatowanego

- **[TipTap](https://tiptap.dev/)** - Bezgłowy edytor tekstu sformatowanego
  - Rozszerzalna architektura
  - Obsługa przecen
  - Gotowa do wspólnego edytowania
  - Niestandardowe rozszerzenia

### Zarządzanie Państwem

- **[Zustand 5](https://zustand-demo.pmnd.rs/)** - Lekkie zarządzanie stanem
  - Proste API
  - Obsługa TypeScriptu
  - Minimalna płyta kotłowa
  - Integracja DevTools
  - Obsługa oprogramowania pośredniego

- **[TanStack React Query 5](https://tanstack.com/query/)** - Zarządzanie stanem serwera
  - Buforowanie i synchronizacja
  - Aktualizacje w tle
  - Optymistyczne aktualizacje
  - Obsługa błędów
  - Nieskończone zapytania

### Wizualizacja danych

- **[Tabela TanStack](https://tanstack.com/table/)** - Biblioteka tabel bezgłowych
  - Sortowanie, filtrowanie, paginacja
  - Zmiana rozmiaru kolumny
  - Wybór wiersza
  - Obsługa TypeScriptu

- **[TanStack Virtual](https://tanstack.com/virtual/)** - Biblioteka wirtualizacji
  - Wirtualne przewijanie
  - Optymalizacja wydajności
  - Dynamiczne wysokości rzędów

### Obsługa formularzy

- **[Formularz React Hook 7](https://react-hook-form.com/)** — Formularze wydajnościowe
  - Minimalne ponowne renderowanie
  - Wbudowana walidacja
  - Obsługa TypeScriptu
  - Łatwa integracja
  - Obsługa tablic pól

- **[Zod 4](https://zod.dev/)** - Walidacja schematu
  - Najpierw TypeScript
  - Walidacja czasu wykonania
  - Wpisz wnioskowanie
  - Obsługa błędów
  - Niestandardowe walidatory

## Technologie zaplecza

### Baza danych i ORM

- **[PostgreSQL 14+](https://www.postgresql.org/)** - Relacyjna baza danych
  - Zgodność z ACID
  - Zaawansowane funkcje (JSONB, wyszukiwanie pełnotekstowe)
  - Doskonała wydajność
  - Obsługa JSON-a
  - Wyzwalacze i procedury składowane

- **[Drizzle ORM 0.40.0](https://orm.drizzle.team/)** — TypeScript ORM
  - Zapytania bezpieczne dla typu
  - Minimalne koszty ogólne
  - Składnia podobna do SQL
  - System migracji
  - Zapytania dotyczące relacji
  - Przygotowane oświadczenia

- **[Supabase](https://supabase.com/)** — Backend jako usługa (opcjonalnie)
  - Hostowany PostgreSQL
  - Subskrypcje w czasie rzeczywistym
  - Bezpieczeństwo na poziomie wiersza
  - Wbudowane uwierzytelnianie
  - Wiadra do przechowywania
  - Funkcje krawędziowe

### Uwierzytelnianie

- **[NextAuth.js 5.0 (beta)](https://authjs.dev/)** - Biblioteka uwierzytelniania
  - Wielu dostawców OAuth (Google, GitHub, Facebook, Twitter)
  - Sesje JWT i bazy danych
  - Obsługa TypeScriptu
  - Najlepsze praktyki w zakresie bezpieczeństwa
  - Uwierzytelnianie oparte na poświadczeniach
  - Zarządzanie sesją

- **[Supabase Auth](https://supabase.com/auth)** - Alternatywne rozwiązanie do uwierzytelniania
  - Wbudowane zarządzanie użytkownikami
  - Dostawcy usług socjalnych
  - Weryfikacja e-mailowa
  - Resetowanie hasła
  - Magiczne linki
  - Autoryzacja telefoniczna

### Architektura podwójnego uwierzytelniania

Ever Works obsługuje **zarówno NextAuth.js, jak i Supabase Auth** jednocześnie:

- NextAuth dla tradycyjnych przepływów OAuth
- Supabase Auth dla funkcji czasu rzeczywistego
- Ujednolicone zarządzanie sesjami
- Bezproblemowe przełączanie dostawców

## Zarządzanie treścią

### CMS oparty na Git

- **[isomorphic-git](https://isomorphic-git.org/)** - Operacje Git w JavaScript
  - Repozytoria klonowania
  - Wyciągnij zmiany
  - Zatwierdź pliki
  - Zarządzanie oddziałem

- **[js-yaml](https://github.com/nodeca/js-yaml)** - Parser YAML
  - Analizuj pliki YAML
  - Wygeneruj YAML
  - Walidacja schematu
  - Obsługa błędów

### Przetwarzanie plików

- **[szara materia](https://github.com/jonschlinkert/gray-matter)** - Parser Frontmatter
  - Analizuj pliki przecen
  - Wyodrębnij metadane
  - Obsługa wielu formatów

## Internacjonalizacja

- **[next-intl 3.26](https://next-intl-docs.vercel.app/)** - i18n dla Next.js
  - Obsługa routera aplikacji
  - Tłumaczenia bezpieczne dla typów
  - Pluralizacja
  - Formatowanie daty/liczby

### Obsługiwane języki

Ever Works obsługuje **ponad 13 języków** od razu po wyjęciu z pudełka:

- 🇬🇧 angielski (en)
- 🇫🇷 francuski (fr)
- 🇪🇸 hiszpański (es)
- 🇨🇳 chiński (zh)
- 🇩🇪 niemiecki (de)
- 🇸🇦 Arabski (ar) - z obsługą RTL
- 🇮🇹 włoski (it)
- 🇵🇹 portugalski (pt)
- 🇯🇵 japoński (ja)
- 🇰🇷 koreański (ko)
- 🇷🇺 rosyjski (ru)
- 🇳🇱 holenderski (nl)
- 🇵🇱 polski (pl)

[Dowiedz się więcej o internacjonalizacji →](/internacjonalizacja)

## Analityka i monitorowanie

### Analityka

- **[PostHog](https://posthog.com/)** - Analityka produktów
  - Śledzenie zdarzeń
  - Identyfikacja użytkownika
  - Flagi funkcyjne
  - Nagranie sesji

### Śledzenie błędów

- **[Sentry 9.38](https://sentry.io/)** - Monitorowanie błędów
  - Śledzenie błędów
  - Monitorowanie wydajności
  - Śledzenie wydań
  - Informacje zwrotne od użytkowników

### Wydajność

- **[Vercel Analytics](https://vercel.com/analytics)** — Podstawowe informacje o sieci
  - Podstawowe wskaźniki sieciowe
  - Prawdziwe monitorowanie użytkowników
  - Informacje o wydajności

## Przetwarzanie płatności

### Dostawcy płatności

- **[Pasek](https://stripe.com/)** - Kompleksowa platforma płatnicza
  - Płatności jednorazowe
  - Powtarzające się subskrypcje
  - Wiele metod płatności (karty, Apple Pay, Google Pay)
  - Wiele walut
  - Zaawansowana analityka i raportowanie
  - Portalu klienta
  - Fakturowanie
  - Haki internetowe

- **[LemonSqueezy](https://lemonsqueezy.com/)** - Sprzedawca platformy płytowej
  - Automatyczne przestrzeganie przepisów podatkowych
  - Płatności globalne (ponad 135 krajów)
  - Subskrypcje
  - Zapobieganie oszustwom
  - Uproszczona konfiguracja
  - Wsparcie programu partnerskiego

[Dowiedz się więcej o integracji płatności →](/payment)

### Pakiety SDK płatności

- **[@stripe/stripe-js 7.3.0](https://github.com/stripe/stripe-js)** — SDK klienta Stripe
- **[stripe 18.1.0](https://github.com/stripe/stripe-node)** - SDK serwera Stripe
- **[@lemonsqueezy/lemonsqueezy.js 3.0.0](https://github.com/lmsqueezy/lemonsqueezy.js)** — pakiet SDK LemonSqueezy

## Integracja z CRM-em

- **[Dwadzieścia CRM](https://twenty.com/)** - CRM typu open source
  - Zarządzanie relacjami z klientami
  - Synchronizacja kontaktów
  - Śledzenie aktywności
  - Pola niestandardowe
  - Integracja API
  - Hostowane samodzielnie lub w chmurze

### Funkcje CRM

- Automatyczne tworzenie kontaktów na podstawie rejestracji użytkowników
- Synchronizuj działania i interakcje użytkowników
- Śledź subskrypcje i płatności
- Niestandardowe mapowanie pól
- Synchronizacja oparta na webhooku

## Usługi e-mailowe

- **[Wyślij ponownie 4](https://resend.com/)** - API poczty e-mail
  - E-maile transakcyjne
  - Obsługa szablonów
  - Śledzenie dostawy
  - Przyjazny dla programistów

- **[listopad 2.6](https://novu.co/)** - Infrastruktura powiadamiania
  - Powiadomienia wielokanałowe
  - Zarządzanie szablonami
  - Automatyzacja przepływu pracy
  - Analityka

## System ankiet

- **[SurveyJS](https://surveyjs.io/)** - Kreator ankiet i formularzy
  - Wiele typów pytań (wielokrotny wybór, tekst, ocena, matryca)
  - Logika warunkowa
  - Podgląd ankiety
  - Analityka odpowiedzi
  - Eksportuj do CSV/Excel
  - Odpowiedzi anonimowe lub uwierzytelnione
  - Niestandardowe motywy

[Dowiedz się więcej o ankietach →](/guides/survey-system)

## Bezpieczeństwo

### Bezpieczeństwo uwierzytelniania

- **[bcryptjs 3](https://github.com/dcodeIO/bcrypt.js)** - Mieszanie hasła
  - Bezpieczne przechowywanie haseł
  - Generacja soli
  - Ochrona przed atakiem czasowym

- **[jose 6](https://github.com/panva/jose)** - Operacje JWT
  - Generowanie tokena
  - Weryfikacja tokena
  - Obsługa szyfrowania

### Walidacja danych wejściowych

- **[Reaguj Google reCAPTCHA 3](https://github.com/dozoisch/react-google-recaptcha)** — Ochrona przed botami
  - Ochrona formy
  - Niewidoczne reCAPTCHA
  - Weryfikacja oparta na wynikach

## Narzędzia programistyczne

### Jakość kodu

- **[ESLint 9](https://eslint.org/)** - Linter JavaScript
  - Zasady jakości kodu
  - Konfiguracje niestandardowe
  - Obsługa TypeScriptu
  - Zasady Next.js

- **[Ładniejsza 3.5](https://prettier.io/)** - Formater kodu
  - Spójne formatowanie
  - Integracja redaktora
  - Niestandardowe zasady

### Narzędzia do budowania

- **[PostCSS 8](https://postcss.org/)** - Procesor CSS
  - Przetwarzanie CSS Tailwind
  - Autoprefiks
  - Optymalizacja CSS

- **[Webpack 5](https://webpack.js.org/)** - Pakiet modułów (przez Next.js)
  - Podział kodu
  - Drżenie drzewa
  - Optymalizacja zasobów

## Wdrożenie i infrastruktura

### Platformy hostingowe

- **[Vercel](https://vercel.com/)** - Polecana platforma
  - Optymalizacja Next.js
  - Funkcje krawędziowe
  - Globalny CDN
  - Automatyczne wdrożenia

- **[Netlify](https://netlify.com/)** - Platforma alternatywna
  - Hosting strony statycznej
  - Funkcje bezserwerowe
  - Obsługa formularzy

### Hosting baz danych

- **[Supabase](https://supabase.com/)** - Zarządzany PostgreSQL
  - Automatyczne kopie zapasowe
  - Pula połączeń
  - Funkcje czasu rzeczywistego

- **[PlanetScale](https://planetscale.com/)** - MySQL bezserwerowy
  - Rozgałęzianie przepływu pracy
  - Automatyczne skalowanie
  - Zarządzanie schematami

- **[Neon](https://neon.tech/)** - PostgreSQL bez serwera
  - Natychmiastowe rozgałęzianie
  - Automatyczne skalowanie
  - Odzyskiwanie w określonym momencie

## Zarządzanie pakietami

- **[pnpm](https://pnpm.io/)** - Szybki menedżer pakietów oszczędzający miejsce na dysku
  - Szybsze instalacje
  - Wspólne zależności
  - Ścisłe rozpoznawanie zależności

- **[npm](https://npmjs.com/)** - Domyślny menedżer pakietów Node.js
  - Szeroko wspierane
  - Duży ekosystem
  - Audyt bezpieczeństwa

## Wymagania wersji

### Node.js

- **Minimalnie**: Node.js 20.19.0
- **Zalecane**: Najnowsza wersja LTS
- **Menedżer pakietów**: npm 10+, przędza 1.13+ lub pnpm 8+

### Obsługa przeglądarki

- **Nowoczesne przeglądarki**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Urządzenia mobilne**: iOS Safari 14+, Chrome Mobile 90+
- **Brak obsługi IE**: Tylko nowoczesne funkcje

## Rozważania dotyczące wydajności

### Rozmiar pakietu

- **Pakiet podstawowy**: ~200 KB spakowany gzimem
- **Podział kodu**: oparty na trasach i komponentach
- **Trzęsienie drzew**: Eliminacja nieużywanego kodu
- **Import dynamiczny**: Leniwe ładowanie komponentów niekrytycznych

### Wydajność w czasie wykonywania

- **Reaguj 19**: Współbieżne funkcje dla lepszego UX
- **Next.js 15**: Zoptymalizowane renderowanie i buforowanie
- **Optymalizacja obrazu**: obsługa WebP/AVIF z leniwym ładowaniem
- **Optymalizacja czcionek**: Czcionki hostowane samodzielnie z możliwością wstępnego załadowania

### Wydajność bazy danych

- **Bule połączeń**: Wydajne połączenia z bazami danych
- **Optymalizacja zapytań**: Zapytania indeksowane i wydajne łączenia
- **Buforowanie**: buforowanie na poziomie aplikacji i na poziomie bazy danych

## Stos zabezpieczeń

### Bezpieczeństwo aplikacji

- **HTTPS**: Wymuszone w produkcji
- **Ochrona CSRF**: Wbudowana w NextAuth.js
- **Ochrona XSS**: Odkażanie treści
- **Wstrzykiwanie SQL**: Zapytania parametryczne poprzez Drizzle

### Bezpieczeństwo infrastruktury

- **Zmienne środowiskowe**: Bezpieczne zarządzanie sekretami
- **Ograniczenie szybkości**: Ochrona punktu końcowego API
- **Weryfikacja danych wejściowych**: Weryfikacja schematu ZOD
- **Bezpieczeństwo przesyłania plików**: Ograniczenia dotyczące typu i rozmiaru

## Stos monitorowania

### Monitorowanie aplikacji

- **Śledzenie błędów**: Sentry do monitorowania błędów
- **Wydajność**: śledzenie podstawowych wskaźników internetowych
- **Analytics**: PostHog dla zachowań użytkowników
- **Czas działania**: Zewnętrzne usługi monitorowania

### Monitorowanie infrastruktury

- **Baza danych**: Monitorowanie połączeń i zapytań
- **API**: śledzenie czasu reakcji i poziomu błędów
- **CDN**: Współczynnik trafień i wydajność pamięci podręcznej
- **Wdrożenie**: Monitorowanie kompilacji i wdrażania

## Rozważania na przyszłość

### Planowane aktualizacje

- **Reaguj 19**: Przyjęcie wersji stabilnej
- **Next.js 16**: Jeśli jest dostępny
- **TypeScript 5.x**: Najnowsze funkcje
- **Node.js 22**: aktualizacja LTS

### Potencjalne dodatki

- **GraphQL**: Dla złożonych wymagań dotyczących danych
- **WebSockets**: Funkcje działające w czasie rzeczywistym
- **PWA**: Funkcje progresywnych aplikacji internetowych
- **Przetwarzanie brzegowe**: Zwiększona wydajność

## Matryca decyzji dotyczących technologii

|Wymaganie|Wybór technologii|Uzasadnienie|
|-------------|-------------------|-----------|
|**Ramy**|Następny.js 15|Najlepszy w swojej klasie framework React z App Router|
|**Baza danych**|PostgreSQL + Mżawka|Bezpieczne dla typu, wydajne i skalowalne|
|**Autoryzacja**|NextAuth.js + Supabase|Elastyczność dwóch dostawców|
|**Stylizacja**|Tailwind CSS + HeroUI|Szybki rozwój, spójny design|
|**Stan**|Zustand + Zareaguj na zapytanie|Prosty stan klienta + potężny stan serwera|
|**Formularze**|Reaguj na formę haka + Zod|Wydajność + bezpieczeństwo typu|
|**i18n**|następny-międzynarodowy|Najlepsza obsługa routera aplikacji Next.js|
|**Płatność**|Stripe + LemonSqueezy|Elastyczność + globalna zgodność|
|**E-mail**|Wyślij ponownie + nowe|Przyjazny dla programistów + wielokanałowy|
|**Analiza**|PostHog + Wartownik|Informacje o produkcie + śledzenie błędów|

## Następne kroki

- [Przegląd architektury](./overview) — poznaj architekturę systemu
- [Funkcje platformy](./features) — poznaj wszystkie funkcje platformy
- [Konfiguracja programistyczna](/development/local-setup) – Skonfiguruj swoje środowisko

## Zasoby

### Oficjalna dokumentacja

- [Dokumentacja Next.js](https://nextjs.org/docs)
- [Dokumentacja reakcji](https://react.dev/)
- [Podręcznik TypeScriptu](https://www.typescriptlang.org/docs/)
- [Dokumenty CSS Tailwinda](https://tailwindcss.com/docs)
- [Dokumentacja Drizzle ORM](https://orm.drizzle.team/docs/overview)

### Zasoby społeczności

- [Następny.js GitHub](https://github.com/vercel/next.js)
- [Zareaguj na GitHubie](https://github.com/facebook/react)
- [Tailwind GitHub](https://github.com/tailwindlabs/tailwindcss)
- [Społeczność Ever Works](https://github.com/ever-co/ever-works)
