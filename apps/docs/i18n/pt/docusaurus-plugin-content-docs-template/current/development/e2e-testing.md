---
id: e2e-testing
title: "Testes E2E com Playwright"
sidebar_label: "Testes E2E"
sidebar_position: 4
---

# Testes E2E com Playwright

O template Ever Works inclui um conjunto abrangente de testes end-to-end construído com [Playwright](https://playwright.dev/). Os testes E2E ficam em um pacote de workspace dedicado (`@ever-works/web-e2e`) em `apps/web-e2e/` dentro do monorepo Turborepo. O conjunto cobre fluxos de trabalho de administrador, funcionalidades de cliente, páginas públicas, fluxos de autenticação, endpoints de API, internacionalização e testes de fumaça.

## Visão Geral do Conjunto de Testes

O conjunto E2E contém **62 arquivos de especificação** organizados em 7 categorias de testes:

| Categoria | Arquivos de Spec | Descrição |
|----------|-----------|-------------|
| **Admin** | 21 | Dashboard, itens (CRUD, filtro, revisão), categorias, clientes, coleções, comentários, empresas, exportação de dados, itens em destaque, notificações, relatórios, funções, configurações, patrocínios, pesquisas, tags, usuários, ações em massa |
| **Cliente** | 7 | Dashboard, favoritos (lista + alternância), perfil, configurações, envios, submit-and-manage, lixeira |
| **Público** | 18 | Descobrir, categorias, coleções, tags, detalhe do item, busca, ordenação, avaliação por estrelas, botão de compartilhamento, alternância de visualização, scroll-to-top, newsletter, preços, páginas legais, seletor de idioma, modal de login, páginas de erro, validação de formulário, pesquisas, votos e comentários |
| **Auth** | 3 | Registrar, entrar, sair |
| **API** | 4 | Verificação de integridade, API de itens, API de comentários, API de favoritos |
| **i18n** | 2 | Alternância de idioma, teste de profundidade de idioma |
| **Fumaça** | 2 | Verificação de integridade, navegação |

## Estrutura do Projeto

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

## Configuração

A configuração do Playwright está em `apps/web-e2e/playwright.config.ts`:

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

### Detalhes Principais da Configuração

- **Três projetos de navegador**: Chromium, Firefox, WebKit
- **Otimizações para CI**: 2 workers, 2 retries, rastreamento na primeira nova tentativa, vídeo na primeira nova tentativa
- **Otimizações locais**: 1 worker, sem retries, manter rastreamento em caso de falha, sem vídeo
- **Servidor Web**: Inicia automaticamente o servidor de desenvolvimento localmente ou faz build para CI

## Fixtures de Autenticação

O conjunto de testes usa fixtures personalizados do Playwright para lidar com autenticação. Definidos em `apps/web-e2e/fixtures/auth.fixture.ts`:

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

Isso fornece quatro fixtures:
- `adminContext` / `adminPage` -- Contexto de navegador admin pré-autenticado
- `clientContext` / `clientPage` -- Contexto de navegador cliente pré-autenticado

Arquivos de estado de autenticação são gerados durante a configuração global e armazenados em `apps/web-e2e/auth-states/`.

## Modelo de Objetos de Página

Todas as interações de página são encapsuladas em objetos de página que estendem `base.page.ts`:

### Objetos de Página Admin (17)

| Objeto de Página | Arquivo | Cobre |
|------------|------|--------|
| `DashboardPage` | `admin/dashboard.page.ts` | Navegação do dashboard e estatísticas |
| `ItemsPage` | `admin/items.page.ts` | Listagem e ações de itens |
| `ItemFormPage` | `admin/item-form.page.ts` | Criação de item em múltiplas etapas |
| `CategoriesPage` | N/A (coberto em specs) | CRUD de categorias |
| `ClientsPage` | `admin/clients.page.ts` | Busca e gerenciamento de clientes |
| `CollectionsPage` | `admin/collections.page.ts` | Gerenciamento de coleções |
| `CommentsPage` | `admin/comments.page.ts` | Moderação de comentários |
| `CompaniesPage` | `admin/companies.page.ts` | CRUD de empresas |
| `DataExportPage` | `admin/data-export.page.ts` | Operações de exportação |
| `FeaturedItemsPage` | `admin/featured-items.page.ts` | Curadoria de itens em destaque |
| `NotificationsPage` | `admin/notifications.page.ts` | Sistema de notificações |
| `ReportsPage` | `admin/reports.page.ts` | Revisão de relatórios |
| `RolesPage` | `admin/roles.page.ts` | Gerenciamento de funções |
| `SettingsPage` | `admin/settings.page.ts` | Configuração de ajustes |
| `SponsorshipsPage` | `admin/sponsorships.page.ts` | Gerenciamento de patrocinadores |
| `SurveysPage` | `admin/surveys.page.ts` | Gerenciamento de pesquisas |
| `TagsPage` | `admin/tags.page.ts` | Gerenciamento de tags |
| `BulkActionsPage` | `admin/bulk-actions.page.ts` | Operações de múltipla seleção |

### Objetos de Página Cliente (6)

`dashboard.page.ts`, `profile.page.ts`, `settings.page.ts`, `submissions.page.ts`, `submit.page.ts`, `trash.page.ts`

### Objetos de Página Pública (13)

`discover.page.ts`, `item-detail.page.ts`, `search-bar.page.ts`, `sort-menu.page.ts`, `view-toggle.page.ts`, `star-rating.page.ts`, `share-button.page.ts`, `scroll-to-top.page.ts`, `newsletter.page.ts`, `language-switcher.page.ts`, `profile-dropdown.page.ts`, `public-pages.page.ts`, `theme-toggle.page.ts`

## Auxiliares de Dados de Teste

Localizados em `apps/web-e2e/helpers/test-data.ts`:

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
