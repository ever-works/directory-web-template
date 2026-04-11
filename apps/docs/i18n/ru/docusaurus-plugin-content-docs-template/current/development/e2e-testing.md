---
id: e2e-testing
title: "E2E Тестирование с Playwright"
sidebar_label: "E2E Тесты"
sidebar_position: 4
---

# E2E Тестирование с Playwright

Шаблон Ever Works включает комплексный набор end-to-end тестов, созданный с [Playwright](https://playwright.dev/). E2E тесты находятся в выделенном пакете workspace (`@ever-works/web-e2e`) в `apps/web-e2e/` внутри монорепозитория Turborepo. Набор охватывает рабочие процессы администратора, функции клиента, публичные страницы, потоки аутентификации, эндпоинты API, интернационализацию и дымовые тесты.

## Обзор Набора Тестов

Набор E2E содержит **62 файла спецификаций**, организованных по 7 категориям тестов:

| Категория | Файлы Spec | Описание |
|----------|-----------|-------------|
| **Admin** | 21 | Дашборд, позиции (CRUD, фильтр, просмотр), категории, клиенты, коллекции, комментарии, компании, экспорт данных, избранные позиции, уведомления, отчёты, роли, настройки, спонсорства, опросы, теги, пользователи, массовые действия |
| **Клиент** | 7 | Дашборд, избранное (список + переключение), профиль, настройки, отправки, submit-and-manage, корзина |
| **Публичные** | 18 | Обзор, категории, коллекции, теги, детали позиции, поиск, сортировка, звёздный рейтинг, кнопка поделиться, переключение вида, прокрутка вверх, рассылка, цены, правовые страницы, переключатель языка, модал входа, страницы ошибок, валидация форм, опросы, голосования и комментарии |
| **Auth** | 3 | Регистрация, вход, выход |
| **API** | 4 | Проверка работоспособности, API позиций, API комментариев, API избранного |
| **i18n** | 2 | Переключение локали, тестирование глубины локали |
| **Дымовые** | 2 | Проверка работоспособности, навигация |

## Структура Проекта

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

Конфигурация Playwright находится в `apps/web-e2e/playwright.config.ts`:

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

### Ключевые Детали Конфигурации

- **Три проекта браузеров**: Chromium, Firefox, WebKit
- **Оптимизации CI**: 2 воркера, 2 повторные попытки, трассировка при первой попытке, видео при первой попытке
- **Локальные оптимизации**: 1 воркер, без повторов, сохранять трассировку при сбое, без видео
- **Веб-сервер**: Автоматически запускает сервер разработки локально или собирает для CI

## Фикстуры Аутентификации

Набор тестов использует пользовательские фикстуры Playwright для обработки аутентификации. Определены в `apps/web-e2e/fixtures/auth.fixture.ts`:

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

Это предоставляет четыре фикстуры:
- `adminContext` / `adminPage` -- Предварительно аутентифицированный контекст браузера администратора
- `clientContext` / `clientPage` -- Предварительно аутентифицированный контекст браузера клиента

Файлы состояния аутентификации генерируются во время глобальной настройки и сохраняются в `apps/web-e2e/auth-states/`.

## Модель Объектов Страниц

Все взаимодействия со страницами инкапсулированы в объектах страниц, расширяющих `base.page.ts`:

### Объекты Страниц Admin (17)

| Объект Страницы | Файл | Охватывает |
|------------|------|--------|
| `DashboardPage` | `admin/dashboard.page.ts` | Навигация дашборда и статистика |
| `ItemsPage` | `admin/items.page.ts` | Список позиций и действия |
| `ItemFormPage` | `admin/item-form.page.ts` | Многоэтапное создание позиций |
| `CategoriesPage` | N/A (охвачено в спеках) | CRUD категорий |
| `ClientsPage` | `admin/clients.page.ts` | Поиск и управление клиентами |
| `CollectionsPage` | `admin/collections.page.ts` | Управление коллекциями |
| `CommentsPage` | `admin/comments.page.ts` | Модерация комментариев |
| `CompaniesPage` | `admin/companies.page.ts` | CRUD компаний |
| `DataExportPage` | `admin/data-export.page.ts` | Операции экспорта |
| `FeaturedItemsPage` | `admin/featured-items.page.ts` | Курирование избранных позиций |
| `NotificationsPage` | `admin/notifications.page.ts` | Система уведомлений |
| `ReportsPage` | `admin/reports.page.ts` | Просмотр отчётов |
| `RolesPage` | `admin/roles.page.ts` | Управление ролями |
| `SettingsPage` | `admin/settings.page.ts` | Конфигурация настроек |
| `SponsorshipsPage` | `admin/sponsorships.page.ts` | Управление спонсорами |
| `SurveysPage` | `admin/surveys.page.ts` | Управление опросами |
| `TagsPage` | `admin/tags.page.ts` | Управление тегами |
| `BulkActionsPage` | `admin/bulk-actions.page.ts` | Операции множественного выбора |

### Объекты Страниц Клиента (6)

`dashboard.page.ts`, `profile.page.ts`, `settings.page.ts`, `submissions.page.ts`, `submit.page.ts`, `trash.page.ts`

### Публичные Объекты Страниц (13)

`discover.page.ts`, `item-detail.page.ts`, `search-bar.page.ts`, `sort-menu.page.ts`, `view-toggle.page.ts`, `star-rating.page.ts`, `share-button.page.ts`, `scroll-to-top.page.ts`, `newsletter.page.ts`, `language-switcher.page.ts`, `profile-dropdown.page.ts`, `public-pages.page.ts`, `theme-toggle.page.ts`

## Помощники Тестовых Данных

Расположены в `apps/web-e2e/helpers/test-data.ts`:

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
