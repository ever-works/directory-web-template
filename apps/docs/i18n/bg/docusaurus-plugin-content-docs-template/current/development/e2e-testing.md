---
id: e2e-testing
title: "E2E Тестване с Playwright"
sidebar_label: "E2E Тестване"
sidebar_position: 4
---

# E2E Тестване с Playwright

Шаблонът Ever Works включва изчерпващ набор от end-to-end тестове, изграден с [Playwright](https://playwright.dev/). E2E тестовете се намират в специален пакет на работното пространство (`@ever-works/web-e2e`) в `apps/web-e2e/` в монорепозиторито Turborepo. Наборът обхваща работни потоци на администратора, функции на клиента, публични страници, потоци за удостоверяване, крайни точки на API, интернационализация и димни тестове.

## Преглед на Набора от Тестове

E2E наборът съдържа **62 файла с спецификации**, организирани в 7 категории тестове:

| Категория | Spec Файлове | Описание |
|----------|-----------|-------------|
| **Admin** | 21 | Табло, позиции (CRUD, филтър, преглед), категории, клиенти, колекции, коментари, компании, експорт на данни, препоръчани позиции, известия, доклади, роли, настройки, спонсорства, анкети, тагове, потребители, масови действия |
| **Клиент** | 7 | Табло, любими (списък + превключване), профил, настройки, изпращания, submit-and-manage, кош |
| **Публично** | 18 | Открий, категории, колекции, тагове, детайли на позиция, търсене, сортиране, оценка със звезди, бутон за споделяне, превключване на изглед, превъртане нагоре, бюлетин, цени, правни страници, превключвател на езика, модал за вход, грешни страници, валидиране на форми, анкети, гласове и коментари |
| **Auth** | 3 | Регистрация, влизане, излизане |
| **API** | 4 | Проверка на здравето, API на позиции, API на коментари, API на любими |
| **i18n** | 2 | Превключване на локал, тестване на дълбочината на локала |
| **Дим** | 2 | Проверка на здравето, навигация |

## Структура на Проекта

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

## Конфигурация

Конфигурацията на Playwright е в `apps/web-e2e/playwright.config.ts`:

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

### Ключови Детайли за Конфигурацията

- **Три проекта за браузъри**: Chromium, Firefox, WebKit
- **Оптимизации за CI**: 2 работника, 2 повторни опита, трасиране при първия опит, видео при първия опит
- **Локални оптимизации**: 1 работник, без повторения, запазване на трасирането при неуспех, без видео
- **Уеб сървър**: Автоматично стартира сървър за разработка локално или изгражда за CI

## Fixtures за Удостоверяване

Наборът от тестове използва персонализирани Playwright fixtures за обработка на удостоверяването. Дефинирани в `apps/web-e2e/fixtures/auth.fixture.ts`:

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

Това осигурява четири fixtures:
- `adminContext` / `adminPage` -- Предварително удостоверен контекст на браузъра на администратора
- `clientContext` / `clientPage` -- Предварително удостоверен контекст на браузъра на клиента

Файловете за удостоверяване се генерират по време на глобалната настройка и се съхраняват в `apps/web-e2e/auth-states/`.

## Модел на Обекти на Страница

Всички взаимодействия със страницата са капсулирани в обекти на страница, разширяващи `base.page.ts`:

### Обекти на Страница Admin (17)

| Обект на Страница | Файл | Обхваща |
|------------|------|--------|
| `DashboardPage` | `admin/dashboard.page.ts` | Навигация в таблото и статистики |
| `ItemsPage` | `admin/items.page.ts` | Списък на позиции и действия |
| `ItemFormPage` | `admin/item-form.page.ts` | Многоетапно създаване на позиции |
| `CategoriesPage` | N/A (обхванато в specs) | CRUD на категории |
| `ClientsPage` | `admin/clients.page.ts` | Търсене и управление на клиенти |
| `CollectionsPage` | `admin/collections.page.ts` | Управление на колекции |
| `CommentsPage` | `admin/comments.page.ts` | Модерация на коментари |
| `CompaniesPage` | `admin/companies.page.ts` | CRUD на компании |
| `DataExportPage` | `admin/data-export.page.ts` | Операции по екпортиране |
| `FeaturedItemsPage` | `admin/featured-items.page.ts` | Курация на препоръчани позиции |
| `NotificationsPage` | `admin/notifications.page.ts` | Система за известия |
| `ReportsPage` | `admin/reports.page.ts` | Преглед на доклади |
| `RolesPage` | `admin/roles.page.ts` | Управление на роли |
| `SettingsPage` | `admin/settings.page.ts` | Конфигурация на настройките |
| `SponsorshipsPage` | `admin/sponsorships.page.ts` | Управление на спонсори |
| `SurveysPage` | `admin/surveys.page.ts` | Управление на анкети |
| `TagsPage` | `admin/tags.page.ts` | Управление на тагове |
| `BulkActionsPage` | `admin/bulk-actions.page.ts` | Операции с множествен избор |

### Обекти на Страница Клиент (6)

`dashboard.page.ts`, `profile.page.ts`, `settings.page.ts`, `submissions.page.ts`, `submit.page.ts`, `trash.page.ts`

### Публични Обекти на Страница (13)

`discover.page.ts`, `item-detail.page.ts`, `search-bar.page.ts`, `sort-menu.page.ts`, `view-toggle.page.ts`, `star-rating.page.ts`, `share-button.page.ts`, `scroll-to-top.page.ts`, `newsletter.page.ts`, `language-switcher.page.ts`, `profile-dropdown.page.ts`, `public-pages.page.ts`, `theme-toggle.page.ts`

## Помощници за Тестови Данни

Намират се в `apps/web-e2e/helpers/test-data.ts`:

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
