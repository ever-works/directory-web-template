---
id: e2e-testing
title: E2E Testen met Playwright
sidebar_label: E2E Testen
sidebar_position: 4
---

# E2E Testen met Playwright

Het Ever Works-sjabloon bevat een uitgebreide end-to-end testsuite gebouwd met [Playwright](https://playwright.dev/). De E2E-tests bevinden zich in een speciaal workspace-pakket (`@ever-works/web-e2e`) op `apps/web-e2e/` binnen de Turborepo-monorepo.

## Testsuiteoverzicht

De E2E-suite bevat **62 specificatiebestanden** georganiseerd in 7 testcategorieën:

| Categorie | Specificatiebestanden | Beschrijving |
|----------|-----------|-------------|
| **Admin** | 21 | Dashboard, items (CRUD, filter, review), categorieën, clients, collecties, opmerkingen, bedrijven, gegevensexport, uitgelichte items, meldingen, rapporten, rollen, instellingen, sponsorships, enquêtes, tags, gebruikers, bulkacties |
| **Client** | 7 | Dashboard, favorieten, profiel, instellingen, inzendingen, indienen en beheren, prullenbak |
| **Openbaar** | 18 | Ontdekken, categorieën, collecties, tags, itemdetail, zoeken, sorteren, sterrenbeoordeling, deelknop, weergave wisselen, naar boven scrollen, nieuwsbrief, prijzen, rechtspagina's, taalschakelaar, inlogmodal, foutpagina's |
| **Auth** | 3 | Registreren, aanmelden, afmelden |
| **API** | 4 | Gezondheidscontrole, items-API, opmerkingen-API, favorieten-API |
| **i18n** | 2 | Locale wisseling, locale dieptetest |
| **Smoke** | 2 | Gezondheidscontrole, navigatie |

## Projectstructuur

```
apps/web-e2e/
  package.json
  playwright.config.ts
  global-setup.ts
  global-teardown.ts
  fixtures/
    auth.fixture.ts
    index.ts
  helpers/
    test-data.ts
  page-objects/
    base.page.ts
    admin/
    client/
    auth/
    public/
  tests/
    admin/
    client/
    public/
    auth/
    api/
    i18n/
    smoke/
```

## Configuratie

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: isCI ? 2 : 1,
  retries: isCI ? 2 : 0,
  timeout: 60_000,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
```

### Belangrijke configuratiedetails

- **Drie browserprojecten**: Chromium, Firefox, WebKit
- **CI-optimalisaties**: 2 workers, 2 pogingen, trace bij eerste poging
- **Lokale optimalisaties**: 1 worker, geen pogingen, trace behouden bij mislukking

## Authenticatiefixtures

```typescript
export const test = base.extend<AuthFixtures>({
  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
    await page.close();
  },
  clientPage: async ({ clientContext }, use) => {
    const page = await clientContext.newPage();
    await use(page);
    await page.close();
  },
});
```

Dit biedt vier fixtures:
- `adminContext` / `adminPage` – Vooraf geauthenticeerde admin browsersessie
- `clientContext` / `clientPage` – Vooraf geauthenticeerde client browsersessie

## Paginaobjectmodel

Alle pagina-interacties zijn ingekapseld in paginaobjecten die `base.page.ts` uitbreiden.

## Testdatahulpmiddelen

```typescript
export const TEST_DATA = {
  get ADMIN_EMAIL()    { return requireEnv('SEED_ADMIN_EMAIL'); },
  get ADMIN_PASSWORD() { return requireEnv('SEED_ADMIN_PASSWORD'); },
  CLIENT_PASSWORD: 'TestClient123!',
  generateClientEmail: () => `e2e-client-${Date.now()}-${random}@test.local`,
  generateItemName:    () => `E2E Test Item ${Date.now()}-${random}`,
  generateItemUrl:     () => `https://e2e-test-${Date.now()}.example.com`,
};
```
