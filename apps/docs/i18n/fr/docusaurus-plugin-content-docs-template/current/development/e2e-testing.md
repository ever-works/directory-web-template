---
id: e2e-testing
title: Tests E2E avec Playwright
sidebar_label: Tests E2E
sidebar_position: 4
---

# Tests E2E avec Playwright

Le template Ever Works inclut une suite de tests de bout en bout complète construite avec [Playwright](https://playwright.dev/). Les tests E2E se trouvent dans un package workspace dédié (`@ever-works/web-e2e`) dans `apps/web-e2e/`.

## Vue d'ensemble de la suite de tests

La suite E2E contient **62 fichiers de spec** organisés en 7 catégories de tests :

| Catégorie | Fichiers spec | Description |
|-----------|--------------|-------------|
| **Admin** | 21 | Tableau de bord, éléments (CRUD, filtre, révision), catégories, clients, collections, commentaires, entreprises, export de données, éléments mis en avant, notifications, rapports, rôles, paramètres |
| **Client** | 7 | Tableau de bord, favoris, profil, paramètres, soumissions |
| **Public** | 18 | Découvrir, catégories, collections, tags, détail élément, recherche, tri, notes, newsletter, tarification |
| **Auth** | 3 | Inscription, connexion, déconnexion |
| **API** | 4 | Vérification d'état, API éléments, API commentaires, API favoris |
| **i18n** | 2 | Changement de locale, test de profondeur de locale |
| **Smoke** | 2 | Vérification d'état, navigation |

## Structure du projet

```
apps/web-e2e/
  playwright.config.ts          # Configuration Playwright
  global-setup.ts               # Configuration d'auth avant les tests
  global-teardown.ts            # Nettoyage après les tests
  fixtures/
    auth.fixture.ts             # Fixtures personnalisées (adminPage, clientPage)
  helpers/
    test-data.ts                # Générateurs de données de test
  page-objects/
    base.page.ts                # Classe page object de base
    admin/                      # 17 page objects admin
    client/                     # 6 page objects client
    public/                     # 13 page objects publics
  tests/
    admin/                      # 21 fichiers spec admin
    client/                     # 7 fichiers spec client
    public/                     # 18 fichiers spec public
    auth/                       # 3 fichiers spec auth
    api/                        # 4 fichiers spec API
    i18n/                       # 2 fichiers spec i18n
    smoke/                      # 2 fichiers spec smoke
```

## Configuration

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: isCI ? 2 : 1,
  retries: isCI ? 2 : 0,
  timeout: 60_000,

  use: {
    baseURL,  // depuis BASE_URL env var ou localhost:3000
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },
});
```

## Exécuter les tests

```bash
# Depuis apps/web-e2e
cd apps/web-e2e

# Tous les tests
pnpm test

# Mode UI interactif
pnpm test:ui

# Tests spécifiques
pnpm test tests/public/
pnpm test tests/admin/

# Rapport
pnpm test:report
```

## Variables d'environnement pour les tests

```bash
BASE_URL=http://localhost:3000
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=AdminPassword123!
```
