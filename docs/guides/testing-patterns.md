---
id: testing-patterns
title: "Testing Patterns"
sidebar_label: "Testing Patterns"
sidebar_position: 20
---

# Testing Patterns

The template uses Playwright for end-to-end testing with a well-organized test structure that includes page objects, fixtures, and test categories covering admin, client, API, i18n, public, and smoke test scenarios.

## Test Framework

The project uses **Playwright** as its primary testing framework. Tests are located in the `e2e/` directory at the project root. There is currently no unit test framework (Jest/Vitest) configured -- the primary verification approach combines linting (`pnpm lint`), type checking (`pnpm tsc --noEmit`), and E2E testing.

## Directory Structure

```
e2e/
  fixtures/              # Shared test fixtures and extensions
  global-setup.ts        # Pre-test global setup (e.g., auth state)
  global-teardown.ts     # Post-test cleanup
  helpers/               # Test utility functions
  page-objects/          # Page Object Model implementations
    admin/               # Admin panel page objects
    auth/                # Authentication page objects
    client/              # Client dashboard page objects
    public/              # Public-facing page objects
    base.page.ts         # Base page object class
  playwright.config.ts   # Playwright configuration
  tests/                 # Test specifications
    admin/               # Admin feature tests
    api/                 # API endpoint tests
    auth/                # Authentication flow tests
    client/              # Client dashboard tests
    i18n/                # Internationalization tests
    public/              # Public page tests
    smoke/               # Smoke/health check tests
  tsconfig.json          # TypeScript config for test files
```

## Playwright Configuration

The `e2e/playwright.config.ts` file defines the test runner settings:

### Browser Projects

Tests run across three browser engines:

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
],
```

### Timeouts

- **Test timeout**: 60 seconds
- **Expect timeout**: 30 seconds
- **Navigation timeout**: 60 seconds
- **Action timeout**: 30 seconds

### CI vs Local Behavior

| Setting | CI | Local |
|---------|----|-------|
| Workers | 2 | 1 |
| Retries | 2 | 0 |
| Trace | On first retry | Retain on failure |
| Video | On first retry | Off |
| Screenshot | Only on failure | Only on failure |
| Web server | Build then start | Dev server |
| Server timeout | 5 minutes | 2 minutes |

### Web Server Integration

Playwright automatically starts the application server before tests:

```typescript
webServer: {
  command: isCI ? 'pnpm build && pnpm start' : 'pnpm dev',
  url: baseURL,
  reuseExistingServer: !isCI,
},
```

In local development, if a dev server is already running, Playwright reuses it. In CI, a fresh production build is created.

## Page Object Model

The template follows the Page Object Model (POM) pattern to encapsulate page interactions and reduce test duplication.

### Base Page

All page objects extend `BasePage`:

```typescript
export class BasePage {
  readonly page: Page;
  readonly header: Locator;
  readonly footer: Locator;
  readonly navLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header').first();
    this.footer = page.locator('footer').first();
    this.navLinks = this.header.getByRole('link');
  }

  async goto(path: string) {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async gotoLocalized(path: string, locale: string) {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    await this.page.goto(`${prefix}${path}`, { waitUntil: 'domcontentloaded' });
  }
}
```

### Specialized Page Objects

Each feature area has dedicated page objects. For example, the `SearchBar` page object:

```typescript
export class SearchBar {
  readonly page: Page;
  readonly input: Locator;
  readonly clearButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.input = page.locator('input[placeholder*="Search" i]').first();
    this.clearButton = page.locator('button', { hasText: '\u00d7' }).first();
  }

  async search(term: string) { await this.input.fill(term); }
  async clear() { await this.input.clear(); }
  async getValue(): Promise<string> { return (await this.input.inputValue()) ?? ''; }
}
```

### Available Page Objects

**Admin**: `BulkActions`, `Clients`, `Collections`, `Comments`, `Companies`, `Dashboard`, `DataExport`, `FeaturedItems`, `ItemForm`, `Items`, `Notifications`, `Reports`, `Roles`, `Settings`, `Sponsorships`, `Surveys`, `Tags`

**Auth**: `SignIn`

**Client**: `Dashboard`, `Profile`, `Settings`, `Submissions`, `Submit`, `Trash`

**Public**: `Discover`, `ItemDetail`, `LanguageSwitcher`, `Newsletter`, `ProfileDropdown`, `PublicPages`, `ScrollToTop`, `SearchBar`, `ShareButton`, `SortMenu`, `StarRating`, `ThemeToggle`, `ViewToggle`

## Test Categories

### Smoke Tests

Fast, minimal tests that verify the application starts and basic navigation works:

```typescript
// e2e/tests/smoke/health.spec.ts
test('application health check', async ({ page }) => {
  // Verify the app loads
});

// e2e/tests/smoke/navigation.spec.ts
test('basic navigation works', async ({ page }) => {
  // Verify page transitions
});
```

### API Tests

API tests use Playwright's `request` context to test endpoints directly without a browser:

```typescript
test.describe('API: Health & Version', () => {
  test('database health check returns success', async ({ request }) => {
    const response = await request.get('/api/health/database');
    expect([200, 503]).toContain(response.status());
  });

  test('version endpoint returns response', async ({ request }) => {
    const response = await request.get('/api/version');
    expect(response.status()).toBeLessThan(500);
  });

  test('config features endpoint returns response', async ({ request }) => {
    const response = await request.get('/api/config/features');
    expect(response.status()).toBeLessThan(500);
  });
});
```

### Public Page Tests

Public tests cover user-facing features without authentication. Tests gracefully skip when features are not visible (useful for different theme configurations):

```typescript
test('typing in search bar filters content', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const searchBar = new SearchBar(page);
  const isVisible = await searchBar.input.isVisible().catch(() => false);

  if (!isVisible) {
    test.skip(true, 'Search bar not visible on homepage');
    return;
  }

  await searchBar.search('test');
  await page.waitForTimeout(1_000);
  const value = await searchBar.getValue();
  expect(value).toBe('test');
});
```

### Admin Tests

Admin tests cover the full admin panel functionality including CRUD operations, bulk actions, data export, and moderation features. They test categories, clients, collections, comments, companies, dashboard, featured items, items (CRUD, filtering, review), notifications, reports, roles, settings, sponsorships, surveys, tags, and users.

### Client Tests

Client tests cover the authenticated user experience: dashboard, favorites, profile management, settings, item submissions, and trash management.

### i18n Tests

Internationalization tests verify locale switching and deep page translations work correctly across supported languages.

## Testing Patterns

### Graceful Feature Detection

Tests check for feature visibility before asserting, allowing the same test suite to run against different configurations:

```typescript
const isVisible = await element.isVisible().catch(() => false);
if (!isVisible) {
  test.skip(true, 'Feature not available in this configuration');
  return;
}
```

### Debounce Handling

When testing search or filter features that use debounced inputs, tests include appropriate wait times:

```typescript
await searchBar.search('test');
await page.waitForTimeout(1_000); // Wait for debounce
```

### Localized Navigation

The `BasePage.gotoLocalized()` method handles locale prefixes automatically:

```typescript
await basePage.gotoLocalized('/discover', 'fr');
// Navigates to /fr/discover
```

## Running Tests

```bash
# Run all E2E tests
pnpm exec playwright test --config e2e/playwright.config.ts

# Run specific test category
pnpm exec playwright test --config e2e/playwright.config.ts e2e/tests/smoke/

# Run in headed mode (see the browser)
pnpm exec playwright test --config e2e/playwright.config.ts --headed

# Run specific browser
pnpm exec playwright test --config e2e/playwright.config.ts --project chromium

# Generate HTML report
pnpm exec playwright show-report e2e/playwright-report
```

## Adding New Tests

1. Create a page object in `e2e/page-objects/` if the feature has reusable interactions.
2. Create the test file in the appropriate `e2e/tests/` subdirectory.
3. Use the `test.describe` block to group related tests.
4. Import page objects and fixtures as needed.
5. Add feature detection skips for optional UI elements.
6. Use `waitUntil: 'domcontentloaded'` for navigation to avoid waiting for external resources.

## Related Files

| File | Purpose |
|------|---------|
| `e2e/playwright.config.ts` | Playwright runner configuration |
| `e2e/page-objects/base.page.ts` | Base page object class |
| `e2e/fixtures/` | Shared test fixtures |
| `e2e/global-setup.ts` | Pre-test setup (authentication state) |
| `e2e/global-teardown.ts` | Post-test cleanup |
| `e2e/tests/` | All test specifications |
