---
id: routing
title: Architecture de routage
sidebar_label: Routage
sidebar_position: 6
---

# Architecture de routage

Le modèle Ever Works utilise le routeur d'applications Next.js avec internationalisation via `next-intl`, fournissant des routes préfixées par les paramètres régionaux, des groupes de routes pour une organisation logique et une couche API complète.

## Routeur d'application avec segment local

Toutes les pages destinées aux utilisateurs sont imbriquées sous un segment dynamique `[locale]`, permettant la prise en charge multilingue de 6 paramètres régionaux : `en`, `fr`, `es`, `de`, `ar` et `zh`.

```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale layout (wraps all localized pages)
│   ├── providers.tsx   # Client providers for the locale subtree
│   ├── globals.css     # Global styles
│   └── ...pages        # All localized pages
├── api/                # API routes (not locale-prefixed)
├── layout.tsx          # Root layout (HTML, fonts, metadata)
└── not-found.tsx       # 404 page
```

Les URL suivent le modèle `/{locale}/path`, par exemple :
- `/en/pricing` -- Page de tarification en anglais
- `/fr/admin/items` -- Page des éléments d'administration en français
- `/de/categories` -- Page des catégories en allemand

## Configuration Next.js

Le `next.config.ts` configure plusieurs comportements de routage :

### Réécritures

```typescript
async rewrites() {
  return [
    {
      source: "/:path",
      destination: "/:path/discover/1",
    },
    {
      source: "/:path/discover",
      destination: "/:path/discover/1",
    },
  ];
}
```

Ces réécritures redirigent le chemin des paramètres régionaux racine et `/discover` vers la première page de la liste de découverte (`/discover/1`), fournissant une URL par défaut propre.

### En-têtes de sécurité

Toutes les routes reçoivent des en-têtes de sécurité comprenant :
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` avec un âge maximum de 2 ans
- `Content-Security-Policy` avec valeurs par défaut restrictives
- `Referrer-Policy: strict-origin-when-cross-origin`

### Plugin suivant-intl

Le plugin `next-intl` est appliqué à la configuration Next.js, pointant vers `./i18n/request.ts` pour la résolution des paramètres régionaux :

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## Groupes de routes

Le répertoire `[locale]` utilise plusieurs regroupements logiques pour organiser les pages :

### (liste) -- Pages principales de la liste

Le groupe de routage `(listing)` est un groupe entre parenthèses (pas de segment d'URL) qui enveloppe les pages de liste du répertoire principal avec une mise en page partagée.

### admin/ -- Panneau d'administration

La section admin fournit une interface back-office complète :

```
[locale]/admin/
├── auth/               # Admin sign-in
├── categories/         # Category CRUD
├── clients/            # Client management
├── collections/        # Collection CRUD
├── comments/           # Comment moderation
├── companies/          # Company management
├── featured-items/     # Featured item management
├── items/              # Item review and management
├── reports/            # Report review
├── roles/              # Role and permission management
├── settings/           # Site settings
├── sponsorships/       # Sponsorship management
├── surveys/            # Survey builder
├── tags/               # Tag management
├── users/              # User management
├── layout.tsx          # Admin layout (sidebar, navigation)
├── layout-client.tsx   # Client-side admin layout logic
└── page.tsx            # Admin dashboard
```

### auth/ -- Pages d'authentification

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### client/ -- Tableau de bord client

La section client fournit des fonctionnalités d'utilisateur authentifié pour gérer leurs propres soumissions et leur compte.

### tableau de bord/ -- Tableau de bord utilisateur

Tableau de bord utilisateur général avec aperçu du compte, activité et paramètres.

## Routes API (29 groupes)

Les routes API se trouvent en dehors du segment `[locale]` à `app/api/` et n'ont pas de préfixe de paramètres régionaux. Ils servent de backend pour la récupération de données côté client.

|Groupe d'itinéraires|Objectif|Paramètres clés|
|-------------|---------|---------------|
|`admin/`|Opérations d'administration|Articles, utilisateurs, catégories, paramètres|
|`auth/`|Authentification|Session, rappels OAuth|
|`categories/`|Données de catégorie|Liste, recherche|
|`client/`|Opérations clients|Profil, soumissions, tableau de bord|
|`collections/`|Données de collecte|Liste, détail|
|`config/`|Configuration du site|Indicateurs de fonctionnalités, paramètres|
|`cron/`|Tâches planifiées|Vérifications d'abonnement, nettoyage|
|`current-user/`|Informations sur l'utilisateur actuel|Profil, données de session|
|`extract/`|Extraction d'URL|Extraction de métadonnées à partir d'URL|
|`favorites/`|Favoris|Ajouter, supprimer, lister|
|`featured-items/`|Articles en vedette|Répertorier les articles en vedette actifs|
|`geocode/`|Géocodage|Recherche d'adresse, géocodage inversé|
|`health/`|Bilan de santé|État de la base de données et du service|
|`internal/`|Opérations internes|Points de terminaison au niveau du système|
|`items/`|Données d'article|Liste, détail, recherche|
|`lemonsqueezy/`|CitronSqueezy|Gestionnaire de webhooks|
|`location/`|Données de localisation|Objets à proximité, recherche d'emplacement|
|`payment/`|Opérations de paiement|Caisse, modes de paiement|
|`polar/`|Polaire|Gestionnaire de webhooks|
|`reference/`|Données de référence|Énumérations, valeurs de recherche|
|`reports/`|Rapports de contenu|Soumettre, examiner les rapports|
|`solidgate/`|Porte solide|Gestionnaire de webhooks|
|`sponsor-ads/`|Annonces de sponsor|CRUD, activation|
|`stripe/`|Rayure|Gestionnaire de webhook, paiement|
|`surveys/`|Enquêtes|Liste, réponse, résultats|
|`user/`|Opérations utilisateur|Profil, paramètres|
|`verify-recaptcha/`|reCAPTCHA|Vérification des jetons|
|`version/`|Informations sur la version|Version de l'application et informations de build|

## Intergiciel

L'application utilise le middleware `next-intl` pour la détection et le routage des paramètres régionaux. Le middleware gère :

1. **Détection des paramètres régionaux** : détermine les paramètres régionaux de l'utilisateur à partir du chemin de l'URL, des cookies ou de l'en-tête `Accept-Language`.
2. **Redirections locales** : redirige les requêtes sans préfixe de paramètres régionaux vers les paramètres régionaux appropriés.
3. ** Paramètres régionaux par défaut ** : revient à l'anglais (`en`) lorsqu'aucune préférence locale n'est détectée

Le middleware est configuré dans le répertoire `i18n/` avec des règles de routage locales définies dans `i18n/routing.ts` et une gestion des requêtes dans `i18n/request.ts`.

## Génération statique et itinéraires dynamiques

Le modèle utilise plusieurs stratégies de récupération de données :

- **Génération statique** : les pages telles que la politique de confidentialité, les conditions d'utilisation et à propos sont générées de manière statique.
- **Rendu dynamique** : les pages d'administration, les tableaux de bord et les pages authentifiées s'affichent de manière dynamique
- **ISR (Incremental Static Regeneration)** : les pages de liste de catégories et de balises utilisent ISR avec revalidation
- **Génération de plan de site** : `app/sitemap.ts` génère dynamiquement le plan de site à partir des données de contenu

Le `staticPageGenerationTimeout` est défini sur 180 secondes dans `next.config.ts` pour prendre en charge de grands référentiels de contenu pendant les builds.
