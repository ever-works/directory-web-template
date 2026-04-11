---
id: e2e-testing
title: "اختبار E2E مع Playwright"
sidebar_label: "اختبارات E2E"
sidebar_position: 4
---

# اختبار E2E مع Playwright

يتضمن قالب Ever Works مجموعة شاملة من اختبارات end-to-end مبنية باستخدام [Playwright](https://playwright.dev/). تقع اختبارات E2E في حزمة مساحة عمل مخصصة (`@ever-works/web-e2e`) في `apps/web-e2e/` داخل monorepo الخاص بـ Turborepo. تغطي المجموعة سير عمل المسؤول ووظائف العميل والصفحات العامة وتدفقات المصادقة ونقاط نهاية API والتدويل واختبارات الدخان.

## نظرة عامة على مجموعة الاختبارات

تحتوي مجموعة E2E على **62 ملف مواصفات** منظمة عبر 7 فئات اختبار:

| الفئة | ملفات Spec | الوصف |
|----------|-----------|-------------|
| **المسؤول** | 21 | لوحة التحكم، العناصر (CRUD، التصفية، المراجعة)، الفئات، العملاء، المجموعات، التعليقات، الشركات، تصدير البيانات، العناصر المميزة، الإشعارات، التقارير، الأدوار، الإعدادات، الرعايات، الاستطلاعات، الوسوم، المستخدمون، الإجراءات الجماعية |
| **العميل** | 7 | لوحة التحكم، المفضلة (القائمة + التبديل)، الملف الشخصي، الإعدادات، التقديمات، submit-and-manage، سلة المحذوفات |
| **العام** | 18 | اكتشف، الفئات، المجموعات، الوسوم، تفاصيل العنصر، البحث، الفرز، التقييم بالنجوم، زر المشاركة، تبديل العرض، scroll-to-top، النشرة الإخبارية، الأسعار، الصفحات القانونية، محوّل اللغة، نافذة تسجيل الدخول، صفحات الخطأ، التحقق من النماذج، الاستطلاعات، الأصوات والتعليقات |
| **Auth** | 3 | التسجيل، تسجيل الدخول، تسجيل الخروج |
| **API** | 4 | فحص الصحة، API العناصر، API التعليقات، API المفضلة |
| **i18n** | 2 | تبديل اللغة، اختبار عمق اللغة |
| **دخان** | 2 | فحص الصحة، التنقل |

## هيكل المشروع

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

## التهيئة

تهيئة Playwright موجودة في `apps/web-e2e/playwright.config.ts`:

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

### تفاصيل التهيئة الرئيسية

- **ثلاثة مشاريع متصفحات**: Chromium وFirefox وWebKit
- **تحسينات CI**: 2 عمال، 2 إعادة محاولة، تتبع عند أول إعادة محاولة، فيديو عند أول إعادة محاولة
- **التحسينات المحلية**: 1 عامل، بدون إعادة محاولة، الاحتفاظ بالتتبع عند الفشل، بدون فيديو
- **خادم الويب**: يبدأ تلقائياً خادم التطوير محلياً أو يبني لـ CI

## Fixtures المصادقة

تستخدم مجموعة الاختبارات Fixtures مخصصة من Playwright للتعامل مع المصادقة. معرّفة في `apps/web-e2e/fixtures/auth.fixture.ts`:

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

يوفر هذا أربعة fixtures:
- `adminContext` / `adminPage` -- سياق متصفح المسؤول المصادق مسبقاً
- `clientContext` / `clientPage` -- سياق متصفح العميل المصادق مسبقاً

تُنشأ ملفات حالة المصادقة أثناء الإعداد العام وتُخزن في `apps/web-e2e/auth-states/`.

## نموذج كائنات الصفحة

تُغلَّف جميع تفاعلات الصفحة في كائنات الصفحة التي تمتد `base.page.ts`:

### كائنات صفحة المسؤول (17)

| كائن الصفحة | الملف | يغطي |
|------------|------|--------|
| `DashboardPage` | `admin/dashboard.page.ts` | تنقل لوحة التحكم والإحصاءات |
| `ItemsPage` | `admin/items.page.ts` | قائمة العناصر والإجراءات |
| `ItemFormPage` | `admin/item-form.page.ts` | إنشاء عنصر متعدد الخطوات |
| `CategoriesPage` | N/A (مغطى في specs) | CRUD الفئات |
| `ClientsPage` | `admin/clients.page.ts` | البحث عن العملاء وإدارتهم |
| `CollectionsPage` | `admin/collections.page.ts` | إدارة المجموعات |
| `CommentsPage` | `admin/comments.page.ts` | إشراف على التعليقات |
| `CompaniesPage` | `admin/companies.page.ts` | CRUD الشركات |
| `DataExportPage` | `admin/data-export.page.ts` | عمليات التصدير |
| `FeaturedItemsPage` | `admin/featured-items.page.ts` | تنظيم العناصر المميزة |
| `NotificationsPage` | `admin/notifications.page.ts` | نظام الإشعارات |
| `ReportsPage` | `admin/reports.page.ts` | مراجعة التقارير |
| `RolesPage` | `admin/roles.page.ts` | إدارة الأدوار |
| `SettingsPage` | `admin/settings.page.ts` | تهيئة الإعدادات |
| `SponsorshipsPage` | `admin/sponsorships.page.ts` | إدارة الرعاة |
| `SurveysPage` | `admin/surveys.page.ts` | إدارة الاستطلاعات |
| `TagsPage` | `admin/tags.page.ts` | إدارة الوسوم |
| `BulkActionsPage` | `admin/bulk-actions.page.ts` | عمليات التحديد المتعدد |

### كائنات صفحة العميل (6)

`dashboard.page.ts`، `profile.page.ts`، `settings.page.ts`، `submissions.page.ts`، `submit.page.ts`، `trash.page.ts`

### كائنات الصفحة العامة (13)

`discover.page.ts`، `item-detail.page.ts`، `search-bar.page.ts`، `sort-menu.page.ts`، `view-toggle.page.ts`، `star-rating.page.ts`، `share-button.page.ts`، `scroll-to-top.page.ts`، `newsletter.page.ts`، `language-switcher.page.ts`، `profile-dropdown.page.ts`، `public-pages.page.ts`، `theme-toggle.page.ts`

## مساعدات بيانات الاختبار

موجودة في `apps/web-e2e/helpers/test-data.ts`:

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
