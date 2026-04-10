---
id: e2e-testing
title: "Testy E2E z Playwright"
sidebar_label: "Testy E2E"
sidebar_position: 4
---

# Testy E2E z Playwright

Szablon Ever Works zawiera kompleksowy zestaw testów end-to-end zbudowanych z [Playwright](https://playwright.dev/). Testy E2E znajdują się w dedykowanym pakiecie workspace (`@ever-works/web-e2e`) w `apps/web-e2e/` w monorepozytorium Turborepo. Zestaw obejmuje przepływy pracy administratora, funkcje klientów, strony publiczne, przepływy uwierzytelniania, endpointy API, internacjonalizację i testy dymne.

## Przegląd Zestawu Testów

Zestaw E2E zawiera **62 pliki specyfikacji** podzielone na 7 kategorii testów:

| Kategoria | Pliki Spec | Opis |
|----------|-----------|-------------|
| **Admin** | 21 | Dashboard, pozycje (CRUD, filtrowanie, przegląd), kategorie, klienci, kolekcje, komentarze, firmy, eksport danych, wyróżnione pozycje, powiadomienia, raporty, role, ustawienia, sponsorstwa, ankiety, tagi, użytkownicy, akcje masowe |
| **Klient** | 7 | Dashboard, ulubione (lista + przełączanie), profil, ustawienia, zgłoszenia, submit-and-manage, kosz |
| **Publiczne** | 18 | Odkrywaj, kategorie, kolekcje, tagi, szczegóły pozycji, wyszukiwanie, sortowanie, ocena gwiazdkowa, przycisk udostępniania, przełączanie widoku, scroll-to-top, newsletter, cennik, strony prawne, przełącznik języka, modal logowania, strony błędów, walidacja formularza, ankiety, głosowania i komentarze |
| **Auth** | 3 | Rejestracja, logowanie, wylogowanie |
| **API** | 4 | Sprawdzenie stanu, API pozycji, API komentarzy, API ulubionych |
| **i18n** | 2 | Przełączanie lokalizacji, testowanie głębokości lokalizacji |
| **Dymne** | 2 | Sprawdzenie stanu, nawigacja |

## Struktura Projektu

```
apps/web-e2e/                     # @ever-works/web-e2e workspace package
  package.json                    # Workspace package manifest
  playwright.config.ts            # Playwright configuration
  global-setup.ts                 # Pre-test authentication setup
  global-teardown.ts              # Post-test cleanup
  fixtures/
    auth.fixture.ts               # Custom test fixtures (adminPage, clientPage)
    index.ts                      # Fixture barrel export
  helpers/
    test-data.ts                  # Test data generators and constants
  page-objects/
    base.page.ts                  # Base page object class
    admin/                        # 17 admin page objects
    client/                       # 6 client page objects
    auth/                         # Sign-in page object
    public/                       # 13 public page objects
  tests/
    admin/                        # 21 admin spec files
    client/                       # 7 client spec files
    public/                       # 18 public spec files
    auth/                         # 3 auth spec files
    api/                          # 4 API spec files
    i18n/                         # 2 i18n spec files
    smoke/                        # 2 smoke spec files
```

## Konfiguracja

Konfiguracja Playwright znajduje się w `apps/web-e2e/playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  workers: isCI ? 2 : 1,
  retries: isCI ? 2 : 0,
  timeout: 60_000,
  expect: { timeout: 30_000 },

  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  use: {
    baseURL,                    // from BASE_URL env var or localhost:3000
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isCI ? 'on-first-retry' : 'off',
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: isCI ? 'pnpm build && pnpm start' : 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: isCI ? 300_000 : 120_000,
  },
});
```

### Kluczowe Szczegóły Konfiguracji

- **Trzy projekty przeglądarek**: Chromium, Firefox, WebKit
- **Optymalizacje CI**: 2 workery, 2 ponowne próby, śledzenie przy pierwszej próbie, wideo przy pierwszej próbie
- **Optymalizacje lokalne**: 1 worker, bez powtórzeń, zachowanie śledzenia przy niepowodzeniu, bez wideo
- **Serwer Web**: Automatycznie uruchamia serwer deweloperski lokalnie lub buduje dla CI

## Fixtures Uwierzytelniania

Zestaw testów używa niestandardowych fixtures Playwright do obsługi uwierzytelniania. Zdefiniowane w `apps/web-e2e/fixtures/auth.fixture.ts`:

```typescript
export const test = base.extend<AuthFixtures>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: requireAuthState(ADMIN_STATE_PATH)
    });
    await use(context);
    await context.close();
  },
  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
    await page.close();
  },
  clientContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: requireAuthState(CLIENT_STATE_PATH)
    });
    await use(context);
    await context.close();
  },
  clientPage: async ({ clientContext }, use) => {
    const page = await clientContext.newPage();
    await use(page);
    await page.close();
  },
});
```

To zapewnia cztery fixtures:
- `adminContext` / `adminPage` -- Wstępnie uwierzytelniony kontekst przeglądarki administratora
- `clientContext` / `clientPage` -- Wstępnie uwierzytelniony kontekst przeglądarki klienta

Pliki stanu uwierzytelniania są generowane podczas globalnej konfiguracji i przechowywane w `apps/web-e2e/auth-states/`.

## Model Obiektów Strony

Wszystkie interakcje ze stroną są hermetyzowane w obiektach strony rozszerzających `base.page.ts`:

### Obiekty Strony Admin (17)

| Obiekt Strony | Plik | Zakres |
|------------|------|--------|
| `DashboardPage` | `admin/dashboard.page.ts` | Nawigacja dashboardu i statystyki |
| `ItemsPage` | `admin/items.page.ts` | Lista pozycji i akcje |
| `ItemFormPage` | `admin/item-form.page.ts` | Wieloetapowe tworzenie pozycji |
| `CategoriesPage` | N/A (objęte w specach) | CRUD kategorii |
| `ClientsPage` | `admin/clients.page.ts` | Wyszukiwanie i zarządzanie klientami |
| `CollectionsPage` | `admin/collections.page.ts` | Zarządzanie kolekcjami |
| `CommentsPage` | `admin/comments.page.ts` | Moderacja komentarzy |
| `CompaniesPage` | `admin/companies.page.ts` | CRUD firm |
| `DataExportPage` | `admin/data-export.page.ts` | Operacje eksportu |
| `FeaturedItemsPage` | `admin/featured-items.page.ts` | Kuracja wyróżnionych pozycji |
| `NotificationsPage` | `admin/notifications.page.ts` | System powiadomień |
| `ReportsPage` | `admin/reports.page.ts` | Przegląd raportów |
| `RolesPage` | `admin/roles.page.ts` | Zarządzanie rolami |
| `SettingsPage` | `admin/settings.page.ts` | Konfiguracja ustawień |
| `SponsorshipsPage` | `admin/sponsorships.page.ts` | Zarządzanie sponsorami |
| `SurveysPage` | `admin/surveys.page.ts` | Zarządzanie ankietami |
| `TagsPage` | `admin/tags.page.ts` | Zarządzanie tagami |
| `BulkActionsPage` | `admin/bulk-actions.page.ts` | Operacje wielokrotnego wyboru |

### Obiekty Strony Klienta (6)

`dashboard.page.ts`, `profile.page.ts`, `settings.page.ts`, `submissions.page.ts`, `submit.page.ts`, `trash.page.ts`

### Publiczne Obiekty Strony (13)

`discover.page.ts`, `item-detail.page.ts`, `search-bar.page.ts`, `sort-menu.page.ts`, `view-toggle.page.ts`, `star-rating.page.ts`, `share-button.page.ts`, `scroll-to-top.page.ts`, `newsletter.page.ts`, `language-switcher.page.ts`, `profile-dropdown.page.ts`, `public-pages.page.ts`, `theme-toggle.page.ts`

## Pomocniki Danych Testowych

Zlokalizowane w `apps/web-e2e/helpers/test-data.ts`:

```typescript
export const TEST_DATA = {
  get ADMIN_EMAIL()    { return requireEnv('SEED_ADMIN_EMAIL'); },
  get ADMIN_PASSWORD() { return requireEnv('SEED_ADMIN_PASSWORD'); },
  CLIENT_PASSWORD: 'TestClient123!',
  generateClientEmail: () => `e2e-client-${Date.now()}-${random}@test.local`,
  generateItemName:    () => `E2E Test Item ${Date.now()}-${random}`,
  generateItemUrl:     () => `https://e2e-test-${Date.now()}.example.com`,
};

export const PUBLIC_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/discover/1', name: 'Discover Page 1' },
  { path: '/categories', name: 'Categories' },
  // ... 12 public routes total
];
```
