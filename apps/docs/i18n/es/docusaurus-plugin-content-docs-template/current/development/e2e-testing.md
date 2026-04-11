---
id: e2e-testing
title: "Pruebas E2E con Playwright"
sidebar_label: "Pruebas E2E"
sidebar_position: 4
---

# Pruebas E2E con Playwright

El template Ever Works incluye un conjunto completo de pruebas end-to-end construido con [Playwright](https://playwright.dev/). Las pruebas E2E se encuentran en un paquete de workspace dedicado (`@ever-works/web-e2e`) en `apps/web-e2e/` dentro del monorepo Turborepo. El conjunto cubre flujos de trabajo de administrador, funciones de cliente, páginas públicas, flujos de autenticación, endpoints de API, internacionalización y pruebas de humo.

## Descripción General del Conjunto de Pruebas

El conjunto E2E contiene **62 archivos de especificación** organizados en 7 categorías de pruebas:

| Categoría | Archivos Spec | Descripción |
|----------|-----------|-------------|
| **Admin** | 21 | Dashboard, elementos (CRUD, filtro, revisión), categorías, clientes, colecciones, comentarios, empresas, exportación de datos, elementos destacados, notificaciones, informes, roles, configuración, patrocinios, encuestas, etiquetas, usuarios, acciones masivas |
| **Cliente** | 7 | Dashboard, favoritos (lista + alternancia), perfil, configuración, envíos, submit-and-manage, papelera |
| **Público** | 18 | Descubrir, categorías, colecciones, etiquetas, detalle de elemento, búsqueda, ordenación, calificación por estrellas, botón de compartir, alternancia de vista, scroll-to-top, newsletter, precios, páginas legales, selector de idioma, modal de inicio de sesión, páginas de error, validación de formularios, encuestas, votos y comentarios |
| **Auth** | 3 | Registro, inicio de sesión, cierre de sesión |
| **API** | 4 | Verificación de estado, API de elementos, API de comentarios, API de favoritos |
| **i18n** | 2 | Cambio de idioma, prueba de profundidad de idioma |
| **Humo** | 2 | Verificación de estado, navegación |

## Estructura del Proyecto

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

## Configuración

La configuración de Playwright está en `apps/web-e2e/playwright.config.ts`:

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

### Detalles Clave de Configuración

- **Tres proyectos de navegador**: Chromium, Firefox, WebKit
- **Optimizaciones CI**: 2 workers, 2 reintentos, traza en primer reintento, video en primer reintento
- **Optimizaciones locales**: 1 worker, sin reintentos, retener traza en caso de fallo, sin video
- **Servidor Web**: Inicia automáticamente el servidor de desarrollo localmente o construye para CI

## Fixtures de Autenticación

El conjunto de pruebas usa fixtures personalizados de Playwright para gestionar la autenticación. Definidos en `apps/web-e2e/fixtures/auth.fixture.ts`:

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

Esto proporciona cuatro fixtures:
- `adminContext` / `adminPage` -- Contexto de navegador admin pre-autenticado
- `clientContext` / `clientPage` -- Contexto de navegador cliente pre-autenticado

Los archivos de estado de autenticación se generan durante la configuración global y se almacenan en `apps/web-e2e/auth-states/`.

## Modelo de Objetos de Página

Todas las interacciones de página están encapsuladas en objetos de página que extienden `base.page.ts`:

### Objetos de Página Admin (17)

| Objeto de Página | Archivo | Cubre |
|------------|------|--------|
| `DashboardPage` | `admin/dashboard.page.ts` | Navegación del dashboard y estadísticas |
| `ItemsPage` | `admin/items.page.ts` | Listado y acciones de elementos |
| `ItemFormPage` | `admin/item-form.page.ts` | Creación de elementos en múltiples pasos |
| `CategoriesPage` | N/A (cubierto en specs) | CRUD de categorías |
| `ClientsPage` | `admin/clients.page.ts` | Búsqueda y gestión de clientes |
| `CollectionsPage` | `admin/collections.page.ts` | Gestión de colecciones |
| `CommentsPage` | `admin/comments.page.ts` | Moderación de comentarios |
| `CompaniesPage` | `admin/companies.page.ts` | CRUD de empresas |
| `DataExportPage` | `admin/data-export.page.ts` | Operaciones de exportación |
| `FeaturedItemsPage` | `admin/featured-items.page.ts` | Curación de elementos destacados |
| `NotificationsPage` | `admin/notifications.page.ts` | Sistema de notificaciones |
| `ReportsPage` | `admin/reports.page.ts` | Revisión de informes |
| `RolesPage` | `admin/roles.page.ts` | Gestión de roles |
| `SettingsPage` | `admin/settings.page.ts` | Configuración de ajustes |
| `SponsorshipsPage` | `admin/sponsorships.page.ts` | Gestión de patrocinadores |
| `SurveysPage` | `admin/surveys.page.ts` | Gestión de encuestas |
| `TagsPage` | `admin/tags.page.ts` | Gestión de etiquetas |
| `BulkActionsPage` | `admin/bulk-actions.page.ts` | Operaciones de selección múltiple |

### Objetos de Página Cliente (6)

`dashboard.page.ts`, `profile.page.ts`, `settings.page.ts`, `submissions.page.ts`, `submit.page.ts`, `trash.page.ts`

### Objetos de Página Pública (13)

`discover.page.ts`, `item-detail.page.ts`, `search-bar.page.ts`, `sort-menu.page.ts`, `view-toggle.page.ts`, `star-rating.page.ts`, `share-button.page.ts`, `scroll-to-top.page.ts`, `newsletter.page.ts`, `language-switcher.page.ts`, `profile-dropdown.page.ts`, `public-pages.page.ts`, `theme-toggle.page.ts`

## Helpers de Datos de Prueba

Ubicados en `apps/web-e2e/helpers/test-data.ts`:

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
