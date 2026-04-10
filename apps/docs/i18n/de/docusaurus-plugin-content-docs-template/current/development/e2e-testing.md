---
id: e2e-testing
title: E2E-Tests mit Playwright
sidebar_label: E2E-Tests
sidebar_position: 4
---

# E2E-Tests mit Playwright

Die Ever Works-Vorlage enthält eine umfassende End-to-End-Test-Suite, die mit [Playwright](https://playwright.dev/) erstellt wurde. Die E2E-Tests befinden sich in einem dedizierten Workspace-Paket (`@ever-works/web-e2e`) unter `apps/web-e2e/` im Turborepo-Monorepo. Die Suite umfasst Admin-Workflows, Client-Funktionen, öffentliche Seiten, Authentifizierungs-Flows, API-Endpunkte, Internationalisierung und Smoke-Tests.

## Test-Suite Übersicht

Die E2E-Suite enthält **62 Spezifikationsdateien**, die in 7 Testkategorien organisiert sind:

| Kategorie | Spezifikationsdateien | Beschreibung |
|----------|-----------|-------------|
| **Admin** | 21 | Dashboard, Elemente (CRUD, Filter, Review), Kategorien, Clients, Sammlungen, Kommentare, Unternehmen, Datenexport, hervorgehobene Elemente, Benachrichtigungen, Berichte, Rollen, Einstellungen, Sponsorships, Umfragen, Tags, Benutzer, Massenaktionen |
| **Client** | 7 | Dashboard, Favoriten (Liste + Umschalten), Profil, Einstellungen, Einreichungen, Einreichen und Verwalten, Papierkorb |
| **Public** | 18 | Entdecken, Kategorien, Sammlungen, Tags, Elementdetails, Suche, Sortierung, Sternebewertung, Teilen-Button, Ansicht-Umschalten, Zum Anfang scrollen, Newsletter, Preise, rechtliche Seiten, Sprachauswahl, Login-Modal, Fehlerseiten, Formularvalidierung, Umfragen, Abstimmungen und Kommentare |
| **Auth** | 3 | Registrieren, Anmelden, Abmelden |
| **API** | 4 | Health Check, Elemente-API, Kommentare-API, Favoriten-API |
| **i18n** | 2 | Locale-Wechsel, Locale-Tiefentest |
| **Smoke** | 2 | Health Check, Navigation |

## Projektstruktur

```
apps/web-e2e/                     # @ever-works/web-e2e Workspace-Paket
  package.json                    # Workspace-Paket-Manifest
  playwright.config.ts            # Playwright-Konfiguration
  global-setup.ts                 # Vor-Test-Authentifizierungseinrichtung
  global-teardown.ts              # Nach-Test-Bereinigung
  fixtures/
    auth.fixture.ts               # Benutzerdefinierte Test-Fixtures (adminPage, clientPage)
    index.ts                      # Fixture-Barrel-Export
  helpers/
    test-data.ts                  # Testdatengeneratoren und Konstanten
  page-objects/
    base.page.ts                  # Basis-Seitenobjekt-Klasse
    admin/                        # 17 Admin-Seitenobjekte
    client/                       # 6 Client-Seitenobjekte
    auth/                         # Anmeldeseiten-Objekt
    public/                       # 13 öffentliche Seitenobjekte
  tests/
    admin/                        # 21 Admin-Spezifikationsdateien
    client/                       # 7 Client-Spezifikationsdateien
    public/                       # 18 öffentliche Spezifikationsdateien
    auth/                         # 3 Auth-Spezifikationsdateien
    api/                          # 4 API-Spezifikationsdateien
    i18n/                         # 2 i18n-Spezifikationsdateien
    smoke/                        # 2 Smoke-Spezifikationsdateien
```

## Konfiguration

Die Playwright-Konfiguration befindet sich in `apps/web-e2e/playwright.config.ts`:

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
    baseURL,                    // von BASE_URL-Umgebungsvariable oder localhost:3000
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

### Wichtige Konfigurationsdetails

- **Drei Browser-Projekte**: Chromium, Firefox, WebKit
- **CI-Optimierungen**: 2 Worker, 2 Wiederholungen, Trace beim ersten Retry, Video beim ersten Retry
- **Lokale Optimierungen**: 1 Worker, keine Wiederholungen, Trace bei Fehlern behalten, kein Video
- **Webserver**: Startet automatisch den Dev-Server lokal oder baut für CI

## Authentifizierungs-Fixtures

Die Test-Suite verwendet benutzerdefinierte Playwright-Fixtures zur Authentifizierungsbehandlung. Definiert in `apps/web-e2e/fixtures/auth.fixture.ts`:

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

Dies stellt vier Fixtures bereit:
- `adminContext` / `adminPage` – Vorauthentifizierter Admin-Browser-Kontext
- `clientContext` / `clientPage` – Vorauthentifizierter Client-Browser-Kontext

Auth-Zustandsdateien werden während der globalen Einrichtung generiert und in `apps/web-e2e/auth-states/` gespeichert.

## Seitenobjekt-Modell

Alle Seiteninteraktionen sind in Seitenobjekten gekapselt, die `base.page.ts` erweitern:

### Admin-Seitenobjekte (17)

| Seitenobjekt | Datei | Abdeckung |
|------------|------|--------|
| `DashboardPage` | `admin/dashboard.page.ts` | Dashboard-Navigation und Statistiken |
| `ItemsPage` | `admin/items.page.ts` | Elementliste und Aktionen |
| `ItemFormPage` | `admin/item-form.page.ts` | Mehrstufige Elementerstellung |
| `CategoriesPage` | N/A (in Specs abgedeckt) | Kategorie-CRUD |
| `ClientsPage` | `admin/clients.page.ts` | Client-Suche und -Verwaltung |
| `CollectionsPage` | `admin/collections.page.ts` | Sammlungsverwaltung |
| `CommentsPage` | `admin/comments.page.ts` | Kommentarmoderation |
| `CompaniesPage` | `admin/companies.page.ts` | Unternehmens-CRUD |
| `DataExportPage` | `admin/data-export.page.ts` | Exportoperationen |
| `FeaturedItemsPage` | `admin/featured-items.page.ts` | Kuratierung hervorgehobener Elemente |
| `NotificationsPage` | `admin/notifications.page.ts` | Benachrichtigungssystem |
| `ReportsPage` | `admin/reports.page.ts` | Berichtsprüfung |
| `RolesPage` | `admin/roles.page.ts` | Rollenverwaltung |
| `SettingsPage` | `admin/settings.page.ts` | Einstellungskonfiguration |
| `SponsorshipsPage` | `admin/sponsorships.page.ts` | Sponsor-Verwaltung |
| `SurveysPage` | `admin/surveys.page.ts` | Umfrageverwaltung |
| `TagsPage` | `admin/tags.page.ts` | Tag-Verwaltung |
| `BulkActionsPage` | `admin/bulk-actions.page.ts` | Mehrfachauswahloperationen |

### Client-Seitenobjekte (6)

`dashboard.page.ts`, `profile.page.ts`, `settings.page.ts`, `submissions.page.ts`, `submit.page.ts`, `trash.page.ts`

### Öffentliche Seitenobjekte (13)

`discover.page.ts`, `item-detail.page.ts`, `search-bar.page.ts`, `sort-menu.page.ts`, `view-toggle.page.ts`, `star-rating.page.ts`, `share-button.page.ts`, `scroll-to-top.page.ts`, `newsletter.page.ts`, `language-switcher.page.ts`, `profile-dropdown.page.ts`, `public-pages.page.ts`, `theme-toggle.page.ts`

## Testdaten-Hilfsmittel

Befindet sich in `apps/web-e2e/helpers/test-data.ts`:

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
  // ... insgesamt 12 öffentliche Routen
];
```
