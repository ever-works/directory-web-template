---
id: test-data
title: Testdata & Fixtures
sidebar_label: Testdata & Fixtures
sidebar_position: 6
---

# Testdata & Fixtures

Het Ever Works-sjabloon biedt verschillende mechanismen voor het genereren en beheren van testgegevens in ontwikkelings-, seeding- en E2E-testcontexten.

## E2E-testdata (`e2e/helpers/test-data.ts`)

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

### Belangrijke ontwerpbeslissingen

- **Admin-inloggegevens uit omgeving** – Worden gelezen uit omgevingsvariabelen
- **Unieke clientgegevens** – E-mails en itemnamen bevatten tijdstempels om conflicten te voorkomen
- **Lazy evaluatie** – Admin-inloggegevens gebruiken getter-functies

## E2E Auth State Fixtures

```
e2e/auth-states/
  admin.json    # Geserialiseerde admin sessie
  client.json   # Geserialiseerde client sessie
```

```typescript
import { test, expect } from '@/e2e/fixtures';

test('admin can view dashboard', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.getByRole('heading')).toContainText('Dashboard');
});
```

## Database Seeding

### Seed Script (`lib/db/seed.ts`)

- **Admin gebruiker** – Aangemaakt vanuit `SEED_ADMIN_EMAIL` en `SEED_ADMIN_PASSWORD`
- **Nep gebruikers** – Gegenereerd op basis van `SEED_FAKE_USER_COUNT` (standaard: 10)
- **Demogegevens** – Wanneer `NEXT_PUBLIC_DEMO=true`

## Gegevensconsistentiestrategieën

| Aandachtspunt | Ontwikkeling | Testen (E2E) | Productie |
|---------|------------|---------------|------------|
| Database | SQLite of Postgres | Zelfde als ontwikkeling | Postgres |
| Inhoud | Geklond van `DATA_REPOSITORY` | Bestaande inhoud | Git-gebaseerd CMS |
| Gebruikers | Geseed admin + nep gebruikers | Zelfde + E2E gebruikers | Echte gebruikers |

## Best Practices

1. **Altijd seeden vóór testen** – `pnpm db:seed` uitvoeren voor E2E-tests
2. **Unieke datageneratoren gebruiken** – Nooit itemnamen of e-mails hardcoderen
3. **Omgevingsvariabelen controleren** – `requireEnv()` biedt duidelijke foutmeldingen
4. **Fixtures minimaal houden** – Auth state-bestanden bevatten alleen noodzakelijke cookies
5. **Cross-test afhankelijkheden vermijden** – Elk specificatiebestand moet onafhankelijk uitvoerbaar zijn

## Omgevingsvariabelen voor testen

```bash
SEED_ADMIN_EMAIL=admin@changeme.com
SEED_ADMIN_PASSWORD=changeme_password
BASE_URL=http://localhost:3000
SEED_FAKE_USER_COUNT=10
NEXT_PUBLIC_DEMO=true
```
