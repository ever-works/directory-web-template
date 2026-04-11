---
id: test-data
title: Dati di Test & Fixture
sidebar_label: Dati di Test & Fixture
sidebar_position: 6
---

# Dati di Test & Fixture

Il template Ever Works fornisce diversi meccanismi per generare e gestire i dati di test nei contesti di sviluppo, seeding e test E2E.

## Dati di test E2E (`e2e/helpers/test-data.ts`)

```typescript
export const TEST_DATA = {
  get ADMIN_EMAIL()    { return requireEnv('SEED_ADMIN_EMAIL'); },
  get ADMIN_PASSWORD() { return requireEnv('SEED_ADMIN_PASSWORD'); },
  CLIENT_PASSWORD: 'TestClient123!',
  generateClientEmail: () =>
    `e2e-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
  generateItemName: () =>
    `E2E Test Item ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  generateItemUrl: () =>
    `https://e2e-test-${Date.now()}.example.com`,
};
```

### Decisioni di design chiave

- **Credenziali admin dall'ambiente** – Lette dalle variabili d'ambiente
- **Dati client univoci** – Email e nomi elemento includono timestamp
- **Valutazione lazy** – Le credenziali admin usano funzioni getter

## Fixture di autenticazione E2E

```typescript
import { test, expect } from '@/e2e/fixtures';

test('admin can view dashboard', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.getByRole('heading')).toContainText('Dashboard');
});
```

## Seeding del database

### Script seed (`lib/db/seed.ts`)

- **Utente admin** – Creato da `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`
- **Utenti fake** – Generati in base a `SEED_FAKE_USER_COUNT` (default: 10)
- **Dati demo** – Quando `NEXT_PUBLIC_DEMO=true`

## Strategie di coerenza dei dati

| Aspetto | Sviluppo | Testing (E2E) | Produzione |
|---------|------------|---------------|------------|
| Database | SQLite o Postgres | Come sviluppo | Postgres |
| Contenuti | Clonati da `DATA_REPOSITORY` | Contenuti esistenti | CMS Git-based |
| Utenti | Admin seedato + utenti fake | Come sviluppo + utenti E2E | Utenti reali |

## Best Practice

1. **Eseguire sempre il seed prima dei test** – `pnpm db:seed` prima dei test E2E
2. **Usare generatori di dati univoci** – Non hardcodare nomi o email nei test
3. **Controllare le variabili d'ambiente** – `requireEnv()` fornisce messaggi di errore chiari
4. **Mantenere le fixture minimali** – I file auth state contengono solo i cookie necessari
5. **Evitare dipendenze tra test** – Ogni file spec deve essere eseguibile indipendentemente

## Variabili d'ambiente per i test

```bash
SEED_ADMIN_EMAIL=admin@changeme.com
SEED_ADMIN_PASSWORD=changeme_password
BASE_URL=http://localhost:3000
SEED_FAKE_USER_COUNT=10
NEXT_PUBLIC_DEMO=true
```
