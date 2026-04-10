---
id: e2e-testing
title: Test E2E con Playwright
sidebar_label: Test E2E
sidebar_position: 4
---

# Test E2E con Playwright

Il template Ever Works include una suite di test end-to-end completa costruita con [Playwright](https://playwright.dev/). I test E2E risiedono in un pacchetto workspace dedicato (`@ever-works/web-e2e`) in `apps/web-e2e/`.

## Panoramica della suite di test

La suite E2E contiene **62 file spec** organizzati in 7 categorie di test:

| Categoria | File spec | Descrizione |
|----------|-----------|-------------|
| **Admin** | 21 | Dashboard, elementi, categorie, client, collezioni, commenti, aziende, esportazione dati, elementi in evidenza, notifiche, rapporti, ruoli, impostazioni, sponsorizzazioni, sondaggi, tag, utenti, azioni in blocco |
| **Client** | 7 | Dashboard, preferiti, profilo, impostazioni, invii, invia e gestisci, cestino |
| **Pubblico** | 18 | Scopri, categorie, collezioni, tag, dettaglio elemento, ricerca, ordinamento, valutazione a stelle, pulsante condivisione, cambio visualizzazione, scorri in alto, newsletter, prezzi, pagine legali |
| **Auth** | 3 | Registrazione, accesso, disconnessione |
| **API** | 4 | Health check, API elementi, API commenti, API preferiti |
| **i18n** | 2 | Cambio locale, test profondità locale |
| **Smoke** | 2 | Health check, navigazione |

## Struttura del progetto

```
apps/web-e2e/
  playwright.config.ts
  global-setup.ts
  global-teardown.ts
  fixtures/
    auth.fixture.ts
  helpers/
    test-data.ts
  page-objects/
    base.page.ts
    admin/
    client/
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

## Configurazione

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

### Dettagli chiave della configurazione

- **Tre progetti browser**: Chromium, Firefox, WebKit
- **Ottimizzazioni CI**: 2 worker, 2 tentativi, trace al primo retry
- **Ottimizzazioni locali**: 1 worker, nessun retry, trace conservato in caso di fallimento

## Fixture di autenticazione

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

Fornisce quattro fixture:
- `adminContext` / `adminPage` – Contesto browser admin pre-autenticato
- `clientContext` / `clientPage` – Contesto browser client pre-autenticato

## Helper per i dati di test

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
