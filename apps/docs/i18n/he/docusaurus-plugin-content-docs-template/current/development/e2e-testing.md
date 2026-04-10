---
id: e2e-testing
title: "בדיקות E2E עם Playwright"
sidebar_label: "בדיקות E2E"
sidebar_position: 4
---

# בדיקות E2E עם Playwright

תבנית Ever Works כוללת חבילת בדיקות end-to-end מקיפה שנבנתה עם [Playwright](https://playwright.dev/). בדיקות E2E נמצאות בחבילת workspace ייעודית (`@ever-works/web-e2e`) ב-`apps/web-e2e/` בתוך ה-monorepo של Turborepo. החבילה מכסה זרימות עבודה של מנהל, תכונות לקוח, דפים ציבוריים, זרימות אימות, נקודות קצה API, בינאום ובדיקות עשן.

## סקירת חבילת הבדיקות

חבילת E2E מכילה **62 קבצי spec** המאורגנים ב-7 קטגוריות בדיקות:

| קטגוריה | קבצי Spec | תיאור |
|----------|-----------|-------------|
| **מנהל** | 21 | לוח בקרה, פריטים (CRUD, סינון, סקירה), קטגוריות, לקוחות, אוספים, תגובות, חברות, ייצוא נתונים, פריטים מומלצים, התראות, דוחות, תפקידים, הגדרות, חסויות, סקרים, תגיות, משתמשים, פעולות קבוצתיות |
| **לקוח** | 7 | לוח בקרה, מועדפים (רשימה + החלפה), פרופיל, הגדרות, הגשות, submit-and-manage, פח אשפה |
| **ציבורי** | 18 | גלה, קטגוריות, אוספים, תגיות, פרטי פריט, חיפוש, מיון, דירוג כוכבים, כפתור שיתוף, החלפת תצוגה, גלול למעלה, ניוזלטר, תמחור, דפים משפטיים, מחליף שפה, חלון כניסה, דפי שגיאה, אימות טפסים, סקרים, הצבעות ותגובות |
| **Auth** | 3 | הרשמה, כניסה, יציאה |
| **API** | 4 | בדיקת תקינות, API פריטים, API תגובות, API מועדפים |
| **i18n** | 2 | החלפת לוקל, בדיקת עומק לוקל |
| **עשן** | 2 | בדיקת תקינות, ניווט |

## מבנה הפרויקט

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

## תצורה

תצורת Playwright נמצאת ב-`apps/web-e2e/playwright.config.ts`:

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

### פרטי תצורה מרכזיים

- **שלושה פרויקטי דפדפן**: Chromium, Firefox, WebKit
- **אופטימיזציות CI**: 2 workers, 2 ניסיונות חוזרים, מעקב בניסיון הראשון, וידאו בניסיון הראשון
- **אופטימיזציות מקומיות**: 1 worker, ללא ניסיונות חוזרים, שמירת מעקב בכישלון, ללא וידאו
- **שרת Web**: מפעיל אוטומטית שרת פיתוח מקומי או בונה עבור CI

## Fixtures אימות

חבילת הבדיקות משתמשת ב-fixtures מותאמים אישית של Playwright לטיפול באימות. מוגדרים ב-`apps/web-e2e/fixtures/auth.fixture.ts`:

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

זה מספק ארבעה fixtures:
- `adminContext` / `adminPage` -- הקשר דפדפן מנהל מאומת מראש
- `clientContext` / `clientPage` -- הקשר דפדפן לקוח מאומת מראש

קבצי מצב האימות נוצרים במהלך ההגדרה הגלובלית ומאוחסנים ב-`apps/web-e2e/auth-states/`.

## מודל אובייקטי דף

כל אינטראקציות הדף מוכמסות באובייקטי דף המרחיבים את `base.page.ts`:

### אובייקטי דף מנהל (17)

| אובייקט דף | קובץ | מכסה |
|------------|------|--------|
| `DashboardPage` | `admin/dashboard.page.ts` | ניווט לוח בקרה וסטטיסטיקות |
| `ItemsPage` | `admin/items.page.ts` | רשימת פריטים ופעולות |
| `ItemFormPage` | `admin/item-form.page.ts` | יצירת פריט רב-שלבית |
| `CategoriesPage` | N/A (מכוסה ב-specs) | CRUD קטגוריות |
| `ClientsPage` | `admin/clients.page.ts` | חיפוש וניהול לקוחות |
| `CollectionsPage` | `admin/collections.page.ts` | ניהול אוספים |
| `CommentsPage` | `admin/comments.page.ts` | מיתון תגובות |
| `CompaniesPage` | `admin/companies.page.ts` | CRUD חברות |
| `DataExportPage` | `admin/data-export.page.ts` | פעולות ייצוא |
| `FeaturedItemsPage` | `admin/featured-items.page.ts` | אצירת פריטים מומלצים |
| `NotificationsPage` | `admin/notifications.page.ts` | מערכת התראות |
| `ReportsPage` | `admin/reports.page.ts` | סקירת דוחות |
| `RolesPage` | `admin/roles.page.ts` | ניהול תפקידים |
| `SettingsPage` | `admin/settings.page.ts` | תצורת הגדרות |
| `SponsorshipsPage` | `admin/sponsorships.page.ts` | ניהול חסויות |
| `SurveysPage` | `admin/surveys.page.ts` | ניהול סקרים |
| `TagsPage` | `admin/tags.page.ts` | ניהול תגיות |
| `BulkActionsPage` | `admin/bulk-actions.page.ts` | פעולות בחירה מרובה |

### אובייקטי דף לקוח (6)

`dashboard.page.ts`, `profile.page.ts`, `settings.page.ts`, `submissions.page.ts`, `submit.page.ts`, `trash.page.ts`

### אובייקטי דף ציבוריים (13)

`discover.page.ts`, `item-detail.page.ts`, `search-bar.page.ts`, `sort-menu.page.ts`, `view-toggle.page.ts`, `star-rating.page.ts`, `share-button.page.ts`, `scroll-to-top.page.ts`, `newsletter.page.ts`, `language-switcher.page.ts`, `profile-dropdown.page.ts`, `public-pages.page.ts`, `theme-toggle.page.ts`

## עוזרי נתוני בדיקה

ממוקמים ב-`apps/web-e2e/helpers/test-data.ts`:

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
