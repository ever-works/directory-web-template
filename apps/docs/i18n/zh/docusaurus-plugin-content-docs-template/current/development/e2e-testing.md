---
id: e2e-testing
title: "使用 Playwright 的 E2E 测试"
sidebar_label: "E2E 测试"
sidebar_position: 4
---

# 使用 Playwright 的 E2E 测试

Ever Works 模板包含一个使用 [Playwright](https://playwright.dev/) 构建的全面端到端测试套件。E2E 测试位于 Turborepo 单仓库中 `apps/web-e2e/` 的专用工作区包（`@ever-works/web-e2e`）中。该套件涵盖管理员工作流、客户功能、公共页面、认证流程、API 端点、国际化和冒烟测试。

## 测试套件概述

E2E 套件包含 **62 个规范文件**，按 7 个测试类别组织：

| 类别 | 规范文件 | 描述 |
|----------|-----------|-------------|
| **管理员** | 21 | 仪表板、条目（CRUD、筛选、审核）、分类、客户、合集、评论、公司、数据导出、精选条目、通知、报告、角色、设置、赞助、调查、标签、用户、批量操作 |
| **客户** | 7 | 仪表板、收藏夹（列表 + 切换）、个人资料、设置、提交、提交和管理、回收站 |
| **公共** | 18 | 发现、分类、合集、标签、条目详情、搜索、排序、星级评分、分享按钮、视图切换、返回顶部、订阅、定价、法律页面、语言切换器、登录弹窗、错误页面、表单验证、调查、投票和评论 |
| **认证** | 3 | 注册、登录、退出 |
| **API** | 4 | 健康检查、条目 API、评论 API、收藏夹 API |
| **i18n** | 2 | 语言切换、语言深度测试 |
| **冒烟** | 2 | 健康检查、导航 |

## 项目结构

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

## 配置

Playwright 配置位于 `apps/web-e2e/playwright.config.ts`：

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

### 关键配置详情

- **三个浏览器项目**：Chromium、Firefox、WebKit
- **CI 优化**：2 个 worker、2 次重试、首次重试时追踪、首次重试时录视频
- **本地优化**：1 个 worker、不重试、失败时保留追踪、不录视频
- **Web 服务器**：本地自动启动开发服务器或为 CI 构建

## 认证 Fixtures

测试套件使用自定义 Playwright fixtures 处理认证。在 `apps/web-e2e/fixtures/auth.fixture.ts` 中定义：

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

这提供了四个 fixtures：
- `adminContext` / `adminPage` -- 预先认证的管理员浏览器上下文
- `clientContext` / `clientPage` -- 预先认证的客户浏览器上下文

认证状态文件在全局设置期间生成，存储在 `apps/web-e2e/auth-states/` 中。

## 页面对象模型

所有页面交互都封装在扩展 `base.page.ts` 的页面对象中：

### 管理员页面对象 (17)

| 页面对象 | 文件 | 涵盖 |
|------------|------|--------|
| `DashboardPage` | `admin/dashboard.page.ts` | 仪表板导航和统计 |
| `ItemsPage` | `admin/items.page.ts` | 条目列表和操作 |
| `ItemFormPage` | `admin/item-form.page.ts` | 多步骤条目创建 |
| `CategoriesPage` | N/A（在规范中涵盖） | 分类 CRUD |
| `ClientsPage` | `admin/clients.page.ts` | 客户搜索和管理 |
| `CollectionsPage` | `admin/collections.page.ts` | 合集管理 |
| `CommentsPage` | `admin/comments.page.ts` | 评论审核 |
| `CompaniesPage` | `admin/companies.page.ts` | 公司 CRUD |
| `DataExportPage` | `admin/data-export.page.ts` | 导出操作 |
| `FeaturedItemsPage` | `admin/featured-items.page.ts` | 精选条目管理 |
| `NotificationsPage` | `admin/notifications.page.ts` | 通知系统 |
| `ReportsPage` | `admin/reports.page.ts` | 报告审核 |
| `RolesPage` | `admin/roles.page.ts` | 角色管理 |
| `SettingsPage` | `admin/settings.page.ts` | 设置配置 |
| `SponsorshipsPage` | `admin/sponsorships.page.ts` | 赞助商管理 |
| `SurveysPage` | `admin/surveys.page.ts` | 调查管理 |
| `TagsPage` | `admin/tags.page.ts` | 标签管理 |
| `BulkActionsPage` | `admin/bulk-actions.page.ts` | 多选操作 |

### 客户页面对象 (6)

`dashboard.page.ts`、`profile.page.ts`、`settings.page.ts`、`submissions.page.ts`、`submit.page.ts`、`trash.page.ts`

### 公共页面对象 (13)

`discover.page.ts`、`item-detail.page.ts`、`search-bar.page.ts`、`sort-menu.page.ts`、`view-toggle.page.ts`、`star-rating.page.ts`、`share-button.page.ts`、`scroll-to-top.page.ts`、`newsletter.page.ts`、`language-switcher.page.ts`、`profile-dropdown.page.ts`、`public-pages.page.ts`、`theme-toggle.page.ts`

## 测试数据助手

位于 `apps/web-e2e/helpers/test-data.ts`：

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
