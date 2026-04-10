---
id: quick-reference
title: Référence rapide
sidebar_label: Référence rapide
sidebar_position: 6
---

# Référence rapide

Commandes, modèles et conventions essentiels pour le développement Ever Works.

## Commandes essentielles

### Développement

```bash
# Démarrer le serveur de développement (depuis la racine du monorepo)
pnpm run dev

# Démarrer uniquement l'application web
pnpm run --filter @ever-works/web dev

# Construire pour la production
pnpm run build

# Démarrer le serveur de production
pnpm start

# Exécuter le linter
pnpm run lint

# Vérification des types TypeScript
pnpm tsc --noEmit
```

### Base de données

```bash
# Générer le schéma/migrations (depuis apps/web/)
pnpm db:generate

# Exécuter les migrations
pnpm db:migrate

# Alimenter la base de données
pnpm db:seed

# Ouvrir Drizzle Studio
pnpm db:studio
```

### Documentation API

```bash
# Générer la documentation (depuis apps/web/)
pnpm generate-docs
```

## Structure des fichiers

```
directory-web-template/
├── apps/
│   ├── web/                    # Application Next.js principale
│   │   ├── app/                # App Router (pages, API routes)
│   │   │   ├── [locale]/       # Pages localisées
│   │   │   └── api/            # Handlers de routes API
│   │   ├── components/         # Composants React
│   │   ├── lib/                # Logique métier
│   │   │   ├── db/             # Schéma Drizzle & utilitaires
│   │   │   ├── repositories/   # Couche d'accès aux données
│   │   │   └── services/       # Logique métier
│   │   ├── hooks/              # Hooks React personnalisés
│   │   └── messages/           # Traductions i18n
│   ├── docs/                   # Site de documentation Docusaurus
│   └── web-e2e/                # Tests de bout en bout Playwright
├── docs/                       # Contenu de documentation Markdown
└── packages/                   # Configurations partagées
```

## Variables d'environnement courantes

```bash
# Requis
AUTH_SECRET=                    # openssl rand -base64 32
COOKIE_SECRET=                  # openssl rand -base64 32
DATABASE_URL=                   # URL de connexion à la base de données
DATA_REPOSITORY=                # URL du dépôt de contenu Git

# Authentification OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Paiement
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Optionnel
SENTRY_DSN=                     # Rapport d'erreurs
NEXT_PUBLIC_POSTHOG_KEY=        # Analytique
```

## Conventions de nommage

| Élément                 | Convention         | Exemple                        |
| ----------------------- | ------------------ | ------------------------------ |
| Composants React        | PascalCase         | `ItemCard.tsx`                 |
| Routes API              | kebab-case         | `route.ts` dans `api/items/`   |
| Types TypeScript        | PascalCase         | `ItemType`, `UserRole`         |
| Variables d'env         | SCREAMING_SNAKE    | `AUTH_SECRET`                  |
| Fichiers de messages i18n | kebab-case       | `common.json`, `navigation.json` |

## Points de terminaison API courants

| Méthode | Point de terminaison           | Description                    |
| ------- | ------------------------------ | ------------------------------ |
| GET     | `/api/items`                   | Lister les éléments            |
| POST    | `/api/items`                   | Créer un élément               |
| GET     | `/api/items/:id`               | Obtenir un élément             |
| PUT     | `/api/items/:id`               | Mettre à jour un élément       |
| DELETE  | `/api/items/:id`               | Supprimer un élément           |
| POST    | `/api/sync`                    | Déclencher la synchronisation du contenu |
| GET     | `/api/health`                  | Vérification de l'état         |

## Patrons de code courants

### Route API

```typescript
// apps/web/app/api/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { itemService } from '@/lib/services/item-service';

export async function GET(request: NextRequest) {
    const items = await itemService.getAll();
    return NextResponse.json(items);
}
```

### Composant serveur

```typescript
// apps/web/app/[locale]/items/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function ItemsPage() {
    const t = await getTranslations('items');
    return <h1>{t('title')}</h1>;
}
```

## Résolution des problèmes courants

| Problème                          | Solution                                          |
| --------------------------------- | ------------------------------------------------- |
| `pnpm: command not found`         | `npm install -g pnpm`                             |
| Échec des migrations de base de données | Vérifier `DATABASE_URL` dans `.env.local`  |
| Erreur 401 sur les routes API     | Vérifier `AUTH_SECRET` et la session             |
| Contenu non synchronisé           | Vérifier `GH_TOKEN` et `DATA_REPOSITORY`          |
| Erreurs de build TypeScript       | Exécuter `pnpm tsc --noEmit` pour voir les détails |
