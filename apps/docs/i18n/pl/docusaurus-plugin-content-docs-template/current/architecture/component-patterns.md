---
id: component-patterns
title: Architektura i wzorce komponentów
sidebar_label: Wzory komponentów
sidebar_position: 7
---

# Architektura i wzorce komponentów

Szablon Ever Works organizuje komponenty React przy użyciu struktury katalogów opartej na funkcjach, z wyraźnym oddzieleniem komponentów funkcji, komponentów współdzielonych i podstawowych elementów interfejsu użytkownika.

## Organizacja katalogu

Katalog `components/` opiera się na organizacji skupiającej się przede wszystkim na funkcjach, w której każda główna domena ma swój własny podkatalog wraz z komponentami współdzielonymi i na poziomie interfejsu użytkownika.

```
components/
├── admin/              # Admin panel feature components
├── auth/               # Authentication feature components
├── billing/            # Billing and payment components
├── collections/        # Collection display components
├── context/            # React context providers
├── dashboard/          # Dashboard feature components
├── directory/          # Directory listing components
├── favorites/          # Favorites feature components
├── featured-items/     # Featured items display
├── filters/            # Search and filter components
├── footer/             # Footer components
├── header/             # Header and navigation
├── home-two/           # Alternate homepage layout
├── icons/              # Custom icon components
├── item-detail/        # Item detail page components
├── layout/             # Layout wrapper components
├── layouts/            # Layout variant components
├── maps/               # Map integration components
├── newsletter/         # Newsletter components
├── payment/            # Payment flow components
├── pricing/            # Pricing display components
├── profile/            # User profile components
├── profile-button/     # Profile button dropdown
├── providers/          # Provider wrapper components
├── settings/           # Settings panel components
├── shared/             # Shared reusable components
├── shared-card/        # Shared card components
├── sponsor-ads/        # Sponsor ad components
├── sponsorships/       # Sponsorship management components
├── submissions/        # Submission form components
├── submit/             # Item submit components
├── surveys/            # Survey components
├── tracking/           # Analytics tracking components
├── ui/                 # Base UI primitives
└── version/            # Version display components
```

## Komponenty oparte na funkcjach

Każdy katalog funkcji zawiera wszystkie komponenty powiązane z tą domeną. Dzięki temu powiązany kod jest umieszczony w jednym miejscu i ułatwia znalezienie komponentów dla danej funkcji.

### administrator/

Zawiera wszystkie komponenty panelu administracyjnego, w tym tabele danych, formularze, moduły i interfejsy zarządzania. Są to komponenty klienta, które korzystają z haków specyficznych dla administratora z `hooks/use-admin-*.ts`.

### autoryzacja/

Składniki uwierzytelniania, w tym formularze logowania, formularze rejestracji, procesy resetowania hasła, przyciski OAuth i ekrany weryfikacji poczty elektronicznej.

### rozliczenia/

Komponenty do zarządzania rozliczeniami i subskrypcjami, w tym wybór planu, formularze metod płatności, wyświetlanie faktur i wskaźniki stanu subskrypcji.

### filtry/

Komponenty wyszukiwania i filtrowania używane na stronach z listami. Współdziałają one z parametrami wyszukiwania adresów URL i stanem filtra Zustand, zapewniając filtrowanie w czasie rzeczywistym.

### ceny/

Składniki strony z cenami, w tym karty porównawcze planów, matryce funkcji i integracja z kasą.

## Wspólne komponenty

### udostępniony/

Katalog `shared/` zawiera komponenty wielokrotnego użytku, wykorzystywane w wielu funkcjach. Są to niezależne od domeny elementy konstrukcyjne, które łączą elementy podstawowe interfejsu użytkownika we wzorce funkcjonalne.

### karta wspólna/

Udostępnione komponenty kart używane do wyświetlania elementów, kolekcji i innej zawartości w układach kart w całej aplikacji.

## Komponenty na poziomie głównym

W katalogu głównym `components/` istnieje kilka samodzielnych plików składowych:

|Komponent|Cel|
|-----------|---------|
|`categories-grid.tsx`|Wyświetlanie siatki dla kategorii|
|`custom-hero.tsx`|Konfigurowalna sekcja bohatera|
|`error-boundary.tsx`|Granica błędu z zastępczym interfejsem użytkownika|
|`error-provider.tsx`|Dostawca kontekstu błędu|
|`favorite-button.tsx`|Ulubiony przycisk przełączający|
|`hero.tsx`|Domyślna sekcja bohatera|
|`item.tsx`|Komponent karty przedmiotu|
|`items-categories.tsx`|Elementy uporządkowane według kategorii|
|`item-skeleton.tsx`|Ładowanie szkieletu przedmiotów|
|`item-tags.tsx`|Wyświetlanie tagów dla przedmiotów|
|`language-switcher.tsx`|Komponent przełączający ustawienia regionalne|
|`layout-switcher.tsx`|Przełącznik układu siatki/listy|
|`report-button.tsx`|Przycisk raportu o zawartości|
|`sort-menu.tsx`|Lista opcji sortowania|
|`tags-cards.tsx`|Wyświetlanie karty identyfikacyjnej|
|`tags-items.tsx`|Elementy według wyświetlania tagów|
|`theme-toggler.tsx`|Przełączanie motywu jasny/ciemny|
|`universal-pagination.tsx`|Komponent paginacji wielokrotnego użytku|
|`view-toggle.tsx`|Przełącznik trybu widoku|

## Elementy podstawowe interfejsu użytkownika (komponenty/ui/)

Katalog `ui/` zawiera podstawowe komponenty interfejsu użytkownika, które stanowią podstawę systemu projektowania. Są one zbudowane na bazie HeroUI (dawniej NextUI) i CSS Tailwind.

Kluczowe elementy podstawowe interfejsu użytkownika obejmują:

|Komponent|Opis|
|-----------|-------------|
|`button.tsx`|Przycisk z wariantami (główny, dodatkowy, duch itp.)|
|`card.tsx`|Pojemnik na karty z sekcjami nagłówka, treści i stopki|
|`input.tsx`|Wprowadzanie tekstu z obsługą sprawdzania poprawności|
|`label.tsx`|Składnik etykiety formularza|
|`modal.tsx`|Modalne okno dialogowe z nakładką|
|`select.tsx`|Wybierz menu rozwijane z możliwością wyszukiwania|
|`pagination.tsx`|Element nawigacji strony|
|`badge.tsx`|Komponent plakietki statusu|
|`accordion.tsx`|Rozszerzalne sekcje treści|
|`alert.tsx`|Baner alertu/powiadomienia|
|`breadcrumb.tsx`|Nawigacja nawigacyjna|
|`loading-spinner.tsx`|Wskaźnik ładowania|
|`password-strength.tsx`|Miernik siły hasła|
|`rating.tsx`|Wyświetlanie/wprowadzanie ocen w gwiazdkach|
|`infinity-scroll.tsx`|Nieskończone opakowanie przewijania|
|`searchable-select.tsx`|Wybierz z filtrowaniem wyszukiwania|
|`animations.tsx`|Elementy narzędziowe animacji|
|`auth-illustrations.tsx`|Ilustracje stron uwierzytelniających|

## Komponenty serwera a klienta

Szablon jest zgodny z konwencjami Next.js dotyczącymi separacji komponentów serwera i klienta:

### Komponenty Serwera

Składniki serwera są domyślne w routerze aplikacji. Są używane do:
- Układy stron i opakowania
- Pobieranie danych na poziomie strony
- Statyczne renderowanie treści
- Treść krytyczna dla SEO

Komponenty serwera znajdują się głównie w plikach stron i układów `app/[locale]/`. Mogą bezpośrednio importować funkcje zapytań do baz danych i metody repozytorium.

### Komponenty klienta

Komponenty klienta są oznaczone `'use client'` i służą do:
- Interaktywne elementy interfejsu użytkownika (formularze, przyciski, przełączniki)
- Komponenty korzystające z haków React (useState, useEffect, niestandardowe haki)
- Komponenty korzystające z interfejsów API przeglądarki
- Komponenty zależne od React Query lub Zustand

Większość komponentów w katalogu `components/` to komponenty klienckie, ponieważ obsługują interakcję z użytkownikiem i stan.

## Dostawcy kontekstu

### komponenty/kontekst/

Dostawcy kontekstu Reaguj w celu udostępniania stanu w drzewach komponentów:
- Kontekst błędu dla stanu granicznego błędu
- Kontekst flagi funkcji dla bramkowania funkcji w czasie wykonywania

### komponenty/dostawcy/

Komponenty opakowania dostawcy, które tworzą wielu dostawców:
- Dostawca klienta zapytania (zapytanie TanStack)
- Dostawca motywów
- Dostawca sesji (NextAuth)
- Dostawca tostów

Opakowanie dostawców głównych w `app/[locale]/providers.tsx` tworzy wszystkich niezbędnych dostawców dla aplikacji.

## Konwencje składowe

1. **Nazewnictwo plików**: Komponenty używają nazw plików typu kebab (np. `favorite-button.tsx`)
2. **Wzorzec eksportu**: Komponenty korzystają z nazwanych eksportów, plików beczkowych (`index.ts`) w katalogach funkcji
3. **Kolokacja haków**: Haki specyficzne dla funkcji znajdują się w katalogu najwyższego poziomu `hooks/`, a nie w katalogach komponentów
4. **Stylizacja**: Komponenty korzystają z klas narzędzi CSS Tailwind; niektórzy używają modułów SCSS do skomplikowanych stylizacji
5. **Typy**: Typy właściwości komponentów są zdefiniowane w tekście lub w sąsiadujących plikach typów w katalogu `types/`
6. **Ikony**: Ikony niestandardowe znajdują się w `components/icons/`; standardowe ikony używają `lucide-react`
