---
id: architecture
title: Présentation de l'architecture
sidebar_label: Aperçu
sidebar_position: 0
---

# Présentation de l'architecture

Cette page fournit une carte de haut niveau de l'architecture du modèle Ever Works. Utilisez-le comme point de départ avant de plonger dans les pages détaillées qui suivent.

## Fondation technologique

Le modèle est une application **Next.js 16** utilisant **App Router** avec **React 19**. Il produit une sortie `standalone` pour les déploiements conteneurisés et applique plusieurs optimisations au niveau du framework dans `next.config.ts` :

|Couche|Technologie|Objectif|
|---|---|---|
|**Cadre**|Next.js 16 (routeur d'application)|Rendu serveur et client, routage, routes API|
|**interface utilisateur**|React 19, HeroUI, Radix UI, Tailwind CSS 4|Bibliothèque de composants, primitives, style|
|**Base de données**|Drizzle ORM + PostgreSQL (ou SQLite localement)|Gestion des schémas, migrations, requêtes|
|**Authentification**|NextAuth.js v5 (bêta)|Authentification multi-fournisseurs avec mise en cache de session|
|**Internationalisation**|prochain-intl|Routage et groupes de messages tenant compte des paramètres régionaux|
|**Paiements**|Rayé, polaire, LemonSqueezy, Solidgate|Flux d'abonnement et de paiement unique|
|**Contenu**|CMS basé sur Git (`.content/` répertoire)|Contenu Markdown/YAML cloné à partir d'un référentiel de données|
|**Surveillance**|Sentry, PostHog, Vercel Analytics|Suivi des erreurs, analyse des produits, performances|
|**Courriel**|Renvoyer|Envoi d'e-mails transactionnels|
|**Texte enrichi**|Astuce|Éditeur WYSIWYG pour le contenu administratif|

## Structure du projet

Le modèle suit une organisation en couches basée sur les fonctionnalités. Voici les annuaires de niveau supérieur et leurs responsabilités :

```text
template/
  app/              # Next.js App Router -- routes and layouts
    [locale]/       # Locale-prefixed pages (i18n)
      admin/        # Admin dashboard pages
      auth/         # Authentication flows
      dashboard/    # Client dashboard
      items/        # Item detail pages
      categories/   # Category browsing
      ...
    api/            # API route handlers
  components/       # Shared React components (UI, layout, features)
  lib/              # Core logic -- the heart of the application
    auth/           # Authentication providers, guards, session caching
    db/             # Drizzle schema, migrations, seed, queries
    middleware/     # Permission checks and middleware utilities
    repositories/  # Data-access layer (database queries)
    services/      # Business logic services
    payment/       # Payment provider integrations
    mail/           # Email templates and sending
    analytics/     # Analytics tracking layer
    config/        # Centralized configuration service
    validations/   # Zod schemas for input validation
    utils/         # General utility functions
    ...
  hooks/            # Custom React hooks (React Query wrappers, UI logic)
  constants/        # Application-wide constants
  types/            # Shared TypeScript type definitions
  i18n/             # Internationalization setup and locale request config
  messages/         # Translation message files (JSON per locale)
  e2e/              # Playwright end-to-end tests
  scripts/          # Build, seed, migration, and utility scripts
  public/           # Static assets
```

Pour une présentation complète du répertoire, consultez la page [Structure du projet](/architecture/project-structure).

## Architecture en couches

La base de code impose une séparation claire des préoccupations sur trois niveaux :

### Couche de présentation

Les composants React dans `components/` et les fichiers de page dans `app/[locale]/` gèrent le rendu et l'interaction de l'utilisateur. Les composants du serveur récupèrent les données directement ; Les composants clients utilisent les hooks React Query de `hooks/` pour l'état côté client.

### Couche de logique métier

Les services dans `lib/services/` contiennent les règles métier de base. Le modèle est livré avec plus de 30 fichiers de service couvrant l'analyse, les abonnements, la modération, la synchronisation CRM, le géocodage, les notifications, etc. Les services sont appelés par les gestionnaires de routes API et les composants du serveur, mais jamais directement par le code de l'interface utilisateur dans le navigateur.

### Couche d'accès aux données

Les référentiels dans `lib/repositories/` encapsulent toutes les requêtes de base de données à l'aide de Drizzle ORM. Chaque entité de domaine (articles, catégories, collections, utilisateurs, rôles, balises, annonces de sponsor) possède son propre fichier de référentiel. Cela maintient les détails au niveau SQL hors de la couche de service.

Pour un examen plus approfondi du flux de données entre ces couches, consultez [Data Flow](/architecture/data-flow).

## Routeur et routage d'application Next.js

Toutes les routes destinées aux utilisateurs se trouvent sous `app/[locale]/`, ce qui permet d'utiliser des URL avec préfixe local via `next-intl`. L'application utilise plusieurs fonctionnalités d'App Router :

- **Mise en page** -- fichiers `layout.tsx` imbriqués pour l'administrateur, le tableau de bord client et les espaces publics.
- **Groupes de routes** : le groupe `(listing)` gère la liste du répertoire principal et la navigation par balises sans affecter la structure de l'URL.
- **Routages dynamiques** -- `[page]`, `[...tag]` et segments nommés pour les éléments, catégories et collections.
- **Réécritures** - définies dans `next.config.ts` pour rediriger les chemins de catégorie nus vers leur vue de découverte paginée.

Voir [Routing](/architecture/routing) pour la carte d'itinéraire complète.

## Système d'authentification

L'authentification est basée sur **NextAuth.js v5** avec un système de configuration de fournisseur dans `lib/auth/`. Le fichier `auth.config.ts` à la racine du projet orchestre :

- **Fournisseurs OAuth** : Google et GitHub, configurés via des variables d'environnement et activés/désactivés dynamiquement.
- **Fournisseur d'informations d'identification** -- authentification par e-mail/mot de passe avec hachage bcrypt.
- **Adaptateur Supabase** - stockage de session facultatif basé sur Supabase.
- **Mise en cache de session** -- `lib/auth/cached-session.ts` réduit les recherches de session redondantes.
- **Système de garde** -- `lib/auth/guards.ts` et `lib/guards/` appliquent un accès basé sur les rôles au niveau de la route.

Pour plus de détails sur le système de garde et les autorisations basées sur les rôles, voir [Guards System](/architecture/guards-system) et [Permissions System](/architecture/permissions-system).

## Drizzle ORM et base de données

La couche de base de données utilise **Drizzle ORM** avec le schéma défini dans `lib/db/schema.ts`. Aspects clés :

- **Les migrations** sont générées avec `drizzle-kit generate` et appliquées avec `drizzle-kit migrate`.
- Les scripts **Seding** dans `lib/db/seed.ts` et `scripts/cli-seed.ts` remplissent les données initiales, y compris les rôles.
- **Configuration** réside dans `drizzle.config.ts` à la racine du projet.
- PostgreSQL est requis pour la production ; SQLite est pris en charge pour le développement local.

Voir [Modèles de référentiel](/architecture/repository-patterns) pour savoir comment la couche d'accès aux données est structurée.

## Chaîne de middleware

Le modèle utilise le middleware Next.js (via le plugin `next-intl` appliqué dans `next.config.ts`) combiné à des vérifications d'autorisation personnalisées dans `lib/middleware/permission-check.ts`. Le pipeline middleware gère :

- Détection et routage des paramètres régionaux
- Vérification de l'état d'authentification
- Protection des routes basée sur les rôles
- En-têtes de sécurité (HSTS, CSP, X-Frame-Options, etc. - configurés dans `next.config.ts`)

Pour une analyse détaillée, voir [Middleware](/architecture/middleware) et [Middleware Deep Dive](/architecture/middleware-deep-dive).

## Configuration et sécurité

Le fichier `next.config.ts` définit plusieurs valeurs par défaut en matière de sécurité et de performances :

- **Sortie autonome** pour les déploiements compatibles Docker.
- **En-têtes de sécurité**, notamment Content-Security-Policy, HSTS, X-Content-Type-Options et X-Frame-Options.
- **Optimisation de l'image** avec prise en charge des modèles à distance et politiques de sécurité SVG.
- **Intégration Sentry** appliquée en tant que wrapper de configuration le plus externe pour le suivi des erreurs.
- **Optimisation du package** pour HeroUI et Lucide React afin de réduire la taille du package.

## Pages d'architecture détaillée

Explorez ces pages pour une couverture plus approfondie des systèmes individuels :

|Pages|Ce que cela couvre|
|---|---|
|[Pile technologique](/architecture/tech-stack)|Inventaire complet des dépendances et détails de la version|
|[Structure du projet](/architecture/structure-du-projet)|Procédure pas à pas répertoire par répertoire|
|[Flux de données](/architecture/flux de données)|Cycle de vie des requêtes du navigateur à la base de données|
|[Routage](/architecture/routage)|Structure du routeur d'applications et modèles d'URL|
|[Modèles de composants](/architecture/component-patterns)|Composants serveur ou client, modèles de composition|
|[Gestion de l'état](/architecture/gestion de l'état)|React Query, Zustand et état du serveur|
|[Couche API](/architecture/api-layer)|Conception de l'API REST et modèles de gestionnaire de routage|
|[Middleware](/architecture/middleware)|Pipeline middleware et traitement des requêtes|
|[Système de gardes](/architecture/guards-system)|Contrôle d'accès basé sur les rôles au niveau de l'itinéraire|
|[Système d'autorisations](/architecture/permissions-system)|Définitions d'autorisations précises|
|[Modèles de référentiel](/architecture/repository-patterns)|Conventions de la couche d'accès aux données|
|[Modèles de validation](/architecture/validation-patterns)|Schémas Zod et validation des entrées|
|[Système de thèmes](/architecture/theme-system)|Architecture thématique et gestion des couleurs|
|[Système de couleurs](/architecture/système de couleurs)|Pipeline de génération de couleurs dynamique|
|[Système SEO](/architecture/seo-system)|Métadonnées, plans de site et données structurées|
|[Bibliothèque de paiement](/architecture/payment-library)|Intégration de paiement multi-fournisseurs|
|[Bibliothèque de contenu](/architecture/content-library)|Pipeline de contenu CMS basé sur Git|
|[Système d'édition](/architecture/éditeur-système)|Intégration de l'éditeur de texte enrichi Tiptap|
|[Modèles de mappeur](/architecture/mapper-patterns)|Transformation des données entre les couches|
|[Limites d'erreur](/architecture/erreur-limites)|Gestion des erreurs et récupération|
|[Couche d'analyse](/architecture/couche d'analyse)|Pipeline de suivi et d’analyse des événements|
|[Système Swagger](/architecture/système-swagger)|Génération de documentation OpenAPI|

## Où aller ensuite

- **Nouveau dans le projet ?** Commencez par [Getting Started](/getting-started) pour installer et exécuter le modèle.
- **Prêt à personnaliser ?** Accédez à la section [Guides](/guides) pour des didacticiels étape par étape.
- **Vous voulez l'inventaire technologique complet ?** Voir [Tech Stack](/architecture/tech-stack).

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
