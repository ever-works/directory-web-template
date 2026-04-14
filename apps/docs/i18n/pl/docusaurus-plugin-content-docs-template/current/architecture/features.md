---
id: features
title: Funkcje platformy
sidebar_label: Funkcje
sidebar_position: 3
---

# Funkcje platformy

Dokument ten zawiera kompleksowy przegląd wszystkich funkcji dostępnych na platformie Ever Works, uporządkowanych według obszarów funkcjonalnych.

## Uwierzytelnianie użytkowników i zarządzanie kontem

### Rejestracja użytkownika

**Opis**: Umożliwia nowym użytkownikom tworzenie kont na platformie.

**Jak to działa**:

- Użytkownicy mogą rejestrować się za pośrednictwem adresu e-mail/hasła lub dostawców OAuth (Google, GitHub, Facebook, Twitter)
- Weryfikacja e-mailem zostanie wysłana po rejestracji
- Hasło jest szyfrowane przy użyciu bcrypt przed zapisaniem
- Po pomyślnej rejestracji automatycznie tworzony jest profil klienta

**Przepływ użytkowników**:

1. Użytkownik klika „Zarejestruj się” na stronie głównej
2. Wybiera metodę rejestracji (e-mail lub OAuth)
3. Wypełnia wymagane informacje (imię i nazwisko, adres e-mail, hasło)
4. Otrzymuje e-mail weryfikacyjny
5. Klika link weryfikacyjny, aby aktywować konto
6. Przekierowano do panelu klienta

**Pliki kluczy**: `/lib/auth/index.ts`, `/app/[locale]/auth/`

[Dowiedz się więcej o konfiguracji uwierzytelniania →](/authentication/setup-guide)

---

### User Login

**Description**: Authenticates existing users to access their accounts.

**How it works**:

- Supports credential-based login (email/password)
- Supports OAuth login via multiple providers
- Creates JWT session token valid for 30 days
- Session refreshes automatically after 24 hours of activity
- Admins are redirected to admin portal; clients to client portal

**Security features**:

- Password hashing with bcrypt
- ReCAPTCHA integration for bot prevention
- Session invalidation on logout
- Automatic session expiration

**Key files**: `/lib/auth/index.ts`, `/app/[locale]/auth/signin/`

---

### Zarządzanie hasłami

**Opis**: Umożliwia użytkownikom zmianę lub resetowanie haseł.

**Cechy**:

- **Zmień hasło**: Uwierzytelnieni użytkownicy mogą zaktualizować swoje hasło w ustawieniach
- **Zapomniałem hasła**: Użytkownicy otrzymają wiadomość e-mail z linkiem resetującym
- **Token resetowania**: Token ograniczony czasowo do bezpiecznego resetowania hasła

**Jak to działa**:

1. Użytkownik prosi o zresetowanie hasła
2. System generuje bezpieczny token przechowywany w tabeli `passwordResetTokens`
3. Wysłano e-mail z linkiem resetującym zawierającym token
4. Użytkownik klika link i wprowadza nowe hasło
5. Token traci ważność po użyciu

**Pliki kluczy**: `/app/api/auth/change-password/`, `/lib/db/schema.ts`

---

## Item Listing & Discovery

### Item Browsing

**Description**: The core feature allowing users to browse and discover items on the platform.

**How it works**:

- Items are loaded from Git-based CMS (`.content` folder)
- Supports pagination with configurable page sizes
- Two view modes: "classic" grid and "alternative" layout
- Real-time filtering without page reload

**Display options**:

- Grid layout with thumbnails
- List layout with descriptions
- Sorting by popularity, date, or name

**Key files**: `/app/[locale]/(listing)/listing.tsx`, `/components/globals-client.tsx`

---

### Wyszukiwanie i filtrowanie

**Opis**: Umożliwia użytkownikom znalezienie określonych elementów przy użyciu różnych kryteriów.

**Typy filtrów**:

- **Wyszukiwanie tekstowe**: wyszukiwanie pełnotekstowe w nazwach i opisach przedmiotów
- **Filtr kategorii**: Filtruj według jednej lub wielu kategorii
- **Filtr tagów**: Filtruj według tagów przypisanych do elementów
- **Filtry łączone**: zastosuj wiele filtrów jednocześnie

**Jak to działa**:

1. Filtry są przechowywane w parametrach adresu URL w celu umożliwienia udostępniania
2. Kontekst `FilterProvider` zarządza stanem filtra
3. `FilterURLParser` synchronizuje adres URL ze stanem filtra
4. Elementy są filtrowane po stronie serwera i zwracane do klienta

**Doświadczenia użytkownika**:

- Filtry pozostają w adresie URL (można dodawać zakładki/udostępniać)
- Aktualizacja wyników w czasie rzeczywistym
- Wyczyść opcję wszystkich filtrów

**Pliki kluczy**: `/components/filter-provider.tsx`, `/components/filter-url-parser.tsx`

---

### Category Navigation

**Description**: Hierarchical organization of items into categories.

**Features**:

- Nested category structure (parent/child)
- Category pages with item listings
- Category icons and descriptions
- Breadcrumb navigation

**How it works**:

- Categories stored in `.content/categories/` as markdown files
- Support for multi-level hierarchy
- Can be enabled/disabled via admin settings
- Reorderable via admin panel

**Key files**: `/app/[locale]/categories/`, `/lib/services/category-git.service.ts`

---

### System tagów

**Opis**: Płaska taksonomia dla organizacji elementów między kategoriami.

**Cechy**:

- Wiele tagów na element
- Wyświetlanie chmury tagów
- Filtrowanie oparte na tagach
- Można włączyć/wyłączyć w ustawieniach administratora

**Jak to działa**:

- Tagi przechowywane w `.content/tags/` jako pliki przecen
- Relacja wiele do wielu z elementami
- Klikalne tagi filtrują listę elementów

**Pliki kluczy**: `/app/[locale]/tags/`, `/lib/services/tag-git.service.ts`

---

## Item Engagement Features

### Voting System

**Description**: Allows users to upvote or downvote items.

**How it works**:

1. User clicks vote button on item
2. System checks if user is authenticated
3. Checks for existing vote and updates or creates new vote
4. Vote count updates in real-time
5. Stores vote in `votes` table with timestamp

**Rules**:

- One vote per user per item
- Users can change vote direction
- Users can remove their vote
- Vote counts displayed on item cards

**Key files**: `/hooks/use-item-vote.ts`, `/app/api/items/[slug]/votes/`

---

### System ocen

**Opis**: Użytkownicy mogą oceniać elementy w skali 1-5 gwiazdek.

**Jak to działa**:

- Ocena jest częścią systemu komentarzy
- Każdy komentarz może zawierać ocenę
- Obliczana i wyświetlana średnia ocena
- Pokazany rozkład ocen (ile gwiazdek 5, 4 gwiazdek itd.)

**Wyświetlacz**:

- Ikony gwiazdek pokazujące średnią ocenę
- Liczba ocen obok gwiazdek
- Zestawienie ocen na stronie szczegółów przedmiotu

**Pliki kluczy**: `/hooks/use-item-rating.ts`, `/lib/db/schema.ts` (tabela komentarzy)

---

### Comments System

**Description**: Users can leave comments and reviews on items.

**Features**:

- Text comments with optional rating
- Edit own comments
- Delete own comments
- Admin moderation capabilities
- Threaded replies (if enabled)

**How it works**:

1. User writes comment on item detail page
2. Optionally selects star rating (1-5)
3. Comment stored in `comments` table linked to user's client profile
4. Comments displayed in chronological or relevance order
5. Admin can delete inappropriate comments

**Moderation**:

- Admin can view all comments in admin panel
- Delete functionality for inappropriate content
- Report system triggers admin notification

**Key files**: `/hooks/use-comments.ts`, `/app/api/items/[slug]/comments/`

---

### System ulubionych

**Opis**: Użytkownicy mogą zapisywać elementy na liście ulubionych, aby uzyskać szybki dostęp.

**Jak to działa**:

1. Użytkownik klika ikonę serca/ulubionych na elemencie
2. Element dodany do tabeli `favorites`
3. Ulubione dostępne z profilu użytkownika
4. Przełącz akcję (kliknij ponownie, aby usunąć)

**Cechy**:

- Lista ulubionych w portalu klienta
- Szybka, nieulubiona akcja
- Liczba ulubionych elementów (opcjonalnie)
- Eksportuj listę ulubionych

**Pliki kluczy**: `/hooks/use-favorites.ts`, `/app/api/favorites/`, `/app/[locale]/favorites/`

---

## Featured Items

**Description**: Admin-curated items displayed prominently on the homepage.

**How it works**:

1. Admin selects items to feature from admin panel
2. Sets display order for featured items
3. Featured items appear in dedicated section on homepage
4. Can set expiration date for featured status

**Features**:

- Manual ordering/ranking
- Separate from algorithmic popularity
- Highlighted display on homepage
- Configurable number of featured items

**Key files**: `/hooks/use-admin-featured-items.ts`, `/app/api/admin/featured-items/`

---

## Złożenie przedmiotu

**Opis**: Umożliwia użytkownikom przesyłanie nowych elementów na platformę.

**Jak to działa**:

1. Użytkownik przechodzi do przesłania strony
2. Wypełnia szczegóły przedmiotu (nazwa, opis, adres URL, logo)
3. Wybiera kategorię i tagi
4. Przesyła do sprawdzenia
5. Administrator otrzymuje powiadomienie o nowym przesłaniu
6. Administrator sprawdza i zatwierdza/odrzuca
7. Zatwierdzone elementy pojawiają się na platformie

**Pola formularza**:

- Nazwa przedmiotu (wymagane)
- Opis (wymagany)
- Adres URL witryny
- Przesyłanie logo/obrazu
- Wybór kategorii
- Wybór tagu
- Dodatkowe metadane

**Stany przepływu pracy**:

- Wersja robocza → Oczekująca na recenzję → Zatwierdzona/odrzucona

**Pliki kluczy**: `/app/[locale]/submit/`, `/app/api/admin/items/[id]/review/`

---

## Survey System

**Description**: Create and manage surveys for collecting user feedback.

**Types**:

- **Global surveys**: Available to all users
- **Item-specific surveys**: Attached to specific items

**Question types** (via SurveyJS):

- Multiple choice
- Text input
- Rating scales
- Matrix questions
- File upload

**Features**:

- Survey preview before publishing
- Response analytics
- Export to CSV/Excel
- Anonymous or authenticated responses

**Key files**: `/lib/services/survey.service.ts`, `/app/api/surveys/`

[Learn more about surveys →](/guides/survey-system)

---

## System subskrypcji i płatności

**Opis**: Zarabianie poprzez dostęp oparty na subskrypcji lub funkcje premium.

**Obsługiwani dostawcy**:

- **Stripe**: Pełne zarządzanie subskrypcjami, fakturowanie, portal klienta
- **LemonSqueezy**: Alternatywny procesor płatności zgodny z przepisami podatkowymi

**Jak to działa**:

1. Plany zdefiniowane u dostawcy płatności (Stripe/LemonSqueezy)
2. Użytkownicy wybierają plan na stronie z cenami
3. Przekierowano do kasy dostawcy płatności
4. Webhook obsługuje udaną płatność
5. Rekord subskrypcji utworzony w bazie danych
6. Użytkownik uzyskuje dostęp do funkcji premium

**Pliki kluczy**: `/app/api/stripe/`, `/app/api/lemonsqueezy/`

[Dowiedz się więcej o integracji płatności →](/payment)

---

## User Profile Management

**Description**: Users can manage their personal information and preferences.

**Basic Profile Information**:

- Name, email, avatar
- Bio and social links
- Notification preferences
- Privacy settings

**Features**:

- Profile editing
- Avatar upload
- Email change with verification
- Account deletion

**Key files**: `/app/[locale]/profile/`, `/app/api/profile/`

---

## System powiadomień

**Opis**: Generowane przez system powiadomienia o ważnych wydarzeniach.

**Typy powiadomień**:

- Nowe komentarze do przedmiotów użytkownika
- Aktualizacje subskrypcji
- Ogłoszenia administratora
- Zatwierdzenie/odrzucenie przedmiotu

**Kanały dostawy**:

- Powiadomienia w aplikacji
- Powiadomienia e-mailowe (poprzez Resend/Novu)
- Powiadomienia push (opcjonalnie)

**Pliki kluczy**: `/lib/services/notification.service.ts`, `/app/api/notifications/`

---

## Company Profiles

**Description**: Manage company entities associated with items.

**Features**:

- Company name, logo, description
- Link multiple items to a company
- Company detail pages
- Company directory

**Key files**: `/app/[locale]/companies/`, `/lib/services/company.service.ts`

---

## Integracja z CRM (Twenty CRM)

**Opis**: Synchronizuj dane platformy z Twenty CRM w celu zarządzania relacjami z klientami.

**Cechy**:

- Automatyczne tworzenie kontaktów na podstawie rejestracji użytkowników
- Synchronizuj działania i interakcje użytkowników
- Śledź subskrypcje i płatności
- Niestandardowe mapowanie pól
- Synchronizacja oparta na webhooku

**Pliki kluczy**: `/lib/services/crm.service.ts`, `/app/api/webhooks/crm/`

---

## Analytics & Reporting

**Description**: Track platform usage and generate reports.

**Analytics providers**:

- **PostHog**: Product analytics, feature flags, session recording
- **Sentry**: Error tracking, performance monitoring
- **Vercel Analytics**: Core Web Vitals

**Tracked events**:

- Page views
- Item interactions (views, votes, favorites)
- User registrations and logins
- Subscription events
- Error occurrences

**Key files**: `/lib/analytics/`, `/lib/error-tracking/`

---

## Internacjonalizacja (i18n)

**Opis**: Obsługa wielu języków dla platformy.

**Obsługiwane języki**: ponad 13 języków, w tym angielski, francuski, hiszpański, chiński, niemiecki, arabski (RTL) i inne.

**Cechy**:

- Automatyczne wykrywanie ustawień regionalnych
- Przełączanie ustawień regionalnych na podstawie adresu URL
- Obsługa RTL dla języka arabskiego
- Formatowanie daty/liczby według ustawień regionalnych
- Zasady pluralizacji

**Pliki kluczy**: `/messages/`, `/lib/i18n/`, `/middleware.ts`

[Dowiedz się więcej o internacjonalizacji →](/internacjonalizacja)

---

## Content Management

**Description**: Git-based CMS for managing items, categories, and tags.

**How it works**:

- Content stored in `.content` folder
- Synced from external Git repository
- Markdown files with frontmatter
- Version control via Git
- Collaborative editing

**Content types**:

- Items (`.content/items/`)
- Categories (`.content/categories/`)
- Tags (`.content/tags/`)
- Pages (`.content/pages/`)

**Key files**: `/lib/services/*-git.service.ts`, `/lib/git/`

---

## Panel administracyjny

**Opis**: Centralny hub dla administratorów do monitorowania i zarządzania platformą.

**Widżety panelu**:

- Całkowita liczba użytkowników, elementów, subskrypcji
- Kanał ostatniej aktywności
- Oczekujące zgłoszenia
- Stan zdrowia systemu
- Przegląd analityki

**Kluczowe cechy**:

- Statystyki w czasie rzeczywistym
- Szybkie działania
- Powiadomienia systemowe
- Metryki wydajności

**Kluczowe pliki**: `/app/[locale]/admin/dashboard/`

---

## User & Role Management

**Description**: Admin management of user accounts and permissions.

**User Management**:

- View all users
- Edit user profiles
- Suspend/activate accounts
- Reset passwords
- View user activity

**Role Management**:

- Admin role (full access)
- Client role (standard user)
- Custom roles (extensible)

**Key files**: `/app/[locale]/admin/users/`, `/lib/auth/roles.ts`

---

## Zarządzanie Klientami

**Opis**: Zarządzanie administracyjne profilami klientów.

**Cechy**:

- Zobacz wszystkie profile klientów
- Edytuj informacje o kliencie
- Połącz klientów z firmami
- Zobacz zgłoszenia klientów
- Zarządzaj subskrypcjami klientów

**Pliki kluczy**: `/app/[locale]/admin/clients/`, `/app/api/admin/clients/`

---

## Content Moderation

**Description**: Admin tools for reviewing and moderating user-generated content.

**Item Review**:

- Approve/reject submitted items
- Edit item details
- Feature/unfeature items
- Delete items

**Comment Moderation**:

- View all comments
- Delete inappropriate comments
- Ban users for violations

**Key files**: `/app/[locale]/admin/moderation/`, `/app/api/admin/items/[id]/review/`

---

## Zarządzanie ustawieniami

**Opis**: Opcje konfiguracji obejmujące całą platformę.

**Kategorie ustawień**:

- **Ogólne**: nazwa witryny, opis, logo
- **Funkcje**: Włącz/wyłącz funkcje (kategorie, tagi, głosowanie itp.)
- **E-mail**: konfiguracja SMTP, szablony wiadomości e-mail
- **Płatność**: Klucze API Stripe/LemonSqueezy
- **Analiza**: Konfiguracja PostHog, Sentry
- **Bezpieczeństwo**: ReCAPTCHA, ograniczenie szybkości

**Pliki kluczy**: `/app/[locale]/admin/settings/`, `/lib/config/`

---

## Data Export

**Description**: Export platform data for analysis or backup.

**Export formats**:

- CSV
- JSON
- Excel

**Exportable data**:

- Users
- Items
- Comments
- Subscriptions
- Survey responses

**Key files**: `/app/api/admin/export/`

---

## Dodatkowe funkcje

### Szablony e-maili

Konfigurowalne szablony e-maili dla:

- Powitalne e-maile
- Resetowanie hasła
- Weryfikacja e-mailowa
- Potwierdzenia subskrypcji
- Biuletyn

[Dowiedz się więcej o szablonach e-maili →](/guides/email-templates)

### System tematyczny

Wiele gotowych motywów:

- EverWorks (domyślnie)
- Korporacyjny
- Materiał
- Śmieszne

[Dowiedz się więcej o motywach →](/guides/theming)

### Dynamiczny system kolorów

Automatyczne generowanie palety kolorów (odcienie 50-950) z kolorów bazowych.

[Dowiedz się więcej o dynamicznych kolorach →](/guides/dynamic-colors)

### Testowanie responsywne

Wytyczne i najlepsze praktyki dotyczące testowania na różnych urządzeniach.

[Dowiedz się więcej o testowaniu →](/development/testing)

---

## Feature Summary

| Category | Features |
|----------|----------|
| **Authentication** | Registration, Login, OAuth, Password Reset |
| **Discovery** | Browsing, Search, Filtering, Categories, Tags |
| **Engagement** | Voting, Rating, Comments, Favorites |
| **Submission** | User submissions, Admin review, Approval workflow |
| **Monetization** | Stripe, LemonSqueezy, Subscriptions |
| **User Management** | Profiles, Notifications, Preferences |
| **Admin Tools** | Dashboard, Moderation, Settings, Export |
| **Integrations** | CRM, Analytics, Email, Surveys |
| **Customization** | Themes, Colors, i18n, Email templates |

---

## Następne kroki

- [Tech Stack](./tech-stack) — Poznaj stos technologii
- [Przegląd architektury](./overview) — poznaj architekturę

## Zasoby

- [Konfiguracja programistyczna](/development/local-setup) – Skonfiguruj swoje środowisko
- [Przewodnik po wdrażaniu](/deployment/overview) – wdrożenie w środowisku produkcyjnym
- [Dokumentacja API](/development/api-documentation) - odniesienie do API
