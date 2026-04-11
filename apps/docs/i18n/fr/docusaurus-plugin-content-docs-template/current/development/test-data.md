---
id: test-data
title: Données de test et fixtures
sidebar_label: Données de test
sidebar_position: 6
---

# Données de test et fixtures

Le template Ever Works fournit plusieurs mécanismes pour générer et gérer les données de test dans les contextes de développement, peuplement et tests E2E.

## Données de test E2E (`e2e/helpers/test-data.ts`)

La suite de tests E2E définit ses données de test via un module helper centralisé :

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

### Décisions de conception clés

- **Identifiants admin depuis l'env** — Les identifiants admin sont lus depuis les variables d'environnement, assurant que les tests utilisent les mêmes identifiants que l'utilisateur admin peuplé
- **Données client uniques** — Les emails et noms d'éléments clients incluent des horodatages et suffixes aléatoires pour éviter les collisions lors des exécutions parallèles
- **Évaluation paresseuse** — Les identifiants admin utilisent des fonctions getter qui déclenchent immédiatement si les variables env sont manquantes

### Registre des routes publiques

```typescript
export const PUBLIC_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/discover/1', name: 'Discover Page 1' },
  { path: '/categories', name: 'Categories' },
  { path: '/tags', name: 'Tags' },
  { path: '/collections', name: 'Collections' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/about', name: 'About' },
  { path: '/auth/signin', name: 'Sign In' },
  { path: '/auth/register', name: 'Register' },
];
```

## Variables d'environnement de test

```bash
# Requis pour les tests E2E
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=AdminPassword123!
BASE_URL=http://localhost:3000
```

## Fixtures d'état d'authentification

L'état d'authentification est géré via les fichiers de stockage Playwright :

```typescript
// fixtures/auth.fixture.ts
export const adminPage = test.extend({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: './auth-states/admin.json'
    });
    await use(await context.newPage());
  }
});
```

Les états d'authentification sont créés dans `global-setup.ts` avant que les tests s'exécutent.
