---
id: e2e-testing
title: E2E Testing with Playwright
sidebar_label: E2E Testing
sidebar_position: 4
---

# E2E Testing with Playwright

The Ever Works template includes a comprehensive end-to-end testing suite built with [Playwright](https://playwright.dev/). The suite covers admin workflows, client features, public pages, authentication flows, API endpoints, internationalization, and smoke tests.

## Test Suite Overview

The E2E suite contains **62 spec files** organized across 7 test categories:

| Category | Spec Files | Description |
|----------|-----------|-------------|
| **Admin** | 21 | Dashboard, items (CRUD, filter, review), categories, clients, collections, comments, companies, data export, featured items, notifications, reports, roles, settings, sponsorships, surveys, tags, users, bulk actions |
| **Client** | 7 | Dashboard, favorites (list + toggle), profile, settings, submissions, submit-and-manage, trash |
| **Public** | 18 | Discover, categories, collections, tags, item detail, search, sort, star rating, share button, view toggle, scroll-to-top, newsletter, pricing, legal pages, language switcher, login modal, error pages, form validation, surveys, votes-and-comments |
| **Auth** | 3 | Register, sign-in, sign-out |
| **API** | 4 | Health check, items API, comments API, favorites API |
| **i18n** | 2 | Locale switching, locale depth testing |
| **Smoke** | 2 | Health check, navigation |

## Project Structure

```
e2e/
  playwright.config.ts          # Playwright configuration
  global-setup.ts               # Pre-test authentication setup
  global-teardown.ts            # Post-test cleanup
  fixtures/
    auth.fixture.ts             # Custom test fixtures (adminPage, clientPage)
    index.ts                    # Fixture barrel export
  helpers/
    test-data.ts                # Test data generators and constants
  page-objects/
    base.page.ts                # Base page object class
    admin/                      # 17 admin page objects
    client/                     # 6 client page objects
    auth/                       # Sign-in page object
    public/                     # 13 public page objects
  tests/
    admin/                      # 21 admin spec files
    client/                     # 7 client spec files
    public/                     # 18 public spec files
    auth/                       # 3 auth spec files
    api/                        # 4 API spec files
    i18n/                       # 2 i18n spec files
    smoke/                      # 2 smoke spec files
```

## Configuration

The Playwright config is at `e2e/playwright.config.ts`:

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

### Key Configuration Details

- **Three browser projects**: Chromium, Firefox, WebKit
- **CI optimizations**: 2 workers, 2 retries, trace on first retry, video on first retry
- **Local optimizations**: 1 worker, no retries, retain trace on failure, no video
- **Web server**: Automatically starts dev server locally or builds for CI

## Authentication Fixtures

The test suite uses custom Playwright fixtures to handle authentication. Defined in `e2e/fixtures/auth.fixture.ts`:

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

This provides four fixtures:
- `adminContext` / `adminPage` -- Pre-authenticated admin browser context
- `clientContext` / `clientPage` -- Pre-authenticated client browser context

Auth state files are generated during global setup and stored in `e2e/auth-states/`.

## Page Object Model

All page interactions are encapsulated in page objects extending `base.page.ts`:

### Admin Page Objects (17)

| Page Object | File | Covers |
|------------|------|--------|
| `DashboardPage` | `admin/dashboard.page.ts` | Dashboard navigation and stats |
| `ItemsPage` | `admin/items.page.ts` | Item listing and actions |
| `ItemFormPage` | `admin/item-form.page.ts` | Multi-step item creation |
| `CategoriesPage` | N/A (covered in specs) | Category CRUD |
| `ClientsPage` | `admin/clients.page.ts` | Client search and management |
| `CollectionsPage` | `admin/collections.page.ts` | Collection management |
| `CommentsPage` | `admin/comments.page.ts` | Comment moderation |
| `CompaniesPage` | `admin/companies.page.ts` | Company CRUD |
| `DataExportPage` | `admin/data-export.page.ts` | Export operations |
| `FeaturedItemsPage` | `admin/featured-items.page.ts` | Featured item curation |
| `NotificationsPage` | `admin/notifications.page.ts` | Notification system |
| `ReportsPage` | `admin/reports.page.ts` | Report review |
| `RolesPage` | `admin/roles.page.ts` | Role management |
| `SettingsPage` | `admin/settings.page.ts` | Settings configuration |
| `SponsorshipsPage` | `admin/sponsorships.page.ts` | Sponsor management |
| `SurveysPage` | `admin/surveys.page.ts` | Survey management |
| `TagsPage` | `admin/tags.page.ts` | Tag management |
| `BulkActionsPage` | `admin/bulk-actions.page.ts` | Multi-select operations |

### Client Page Objects (6)

`dashboard.page.ts`, `profile.page.ts`, `settings.page.ts`, `submissions.page.ts`, `submit.page.ts`, `trash.page.ts`

### Public Page Objects (13)

`discover.page.ts`, `item-detail.page.ts`, `search-bar.page.ts`, `sort-menu.page.ts`, `view-toggle.page.ts`, `star-rating.page.ts`, `share-button.page.ts`, `scroll-to-top.page.ts`, `newsletter.page.ts`, `language-switcher.page.ts`, `profile-dropdown.page.ts`, `public-pages.page.ts`, `theme-toggle.page.ts`

## Test Data Helpers

Located in `e2e/helpers/test-data.ts`:

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

## Running Tests

```bash
# Run all tests (starts dev server automatically)
cd template && npx playwright test

# Run specific category
npx playwright test tests/admin/
npx playwright test tests/client/
npx playwright test tests/public/

# Run a single spec file
npx playwright test tests/admin/items-crud.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Run with UI mode (interactive)
npx playwright test --ui

# Run with headed browser (visible)
npx playwright test --headed

# View last test report
npx playwright show-report
```

### Environment Requirements

Required environment variables for test execution:

```bash
SEED_ADMIN_EMAIL=admin@changeme.com
SEED_ADMIN_PASSWORD=changeme_password
BASE_URL=http://localhost:3000        # Optional, defaults to localhost:3000
```

## CI Integration

The configuration supports CI environments with:

- HTML + GitHub reporters for CI, HTML + list for local
- Automatic trace collection on first retry
- Video recording on first retry
- 2 parallel workers to balance speed and stability
- 5-minute build timeout for web server startup
- Output artifacts in `e2e/test-results/` and `e2e/playwright-report/`

## Related Files

- `e2e/playwright.config.ts` -- Main configuration
- `e2e/fixtures/auth.fixture.ts` -- Authentication fixtures
- `e2e/helpers/test-data.ts` -- Test data and route constants
- `e2e/global-setup.ts` -- Pre-test setup (authentication state)
- `e2e/global-teardown.ts` -- Post-test cleanup
- `e2e/page-objects/` -- All page object classes
- `e2e/tests/` -- All spec files
