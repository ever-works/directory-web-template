---
id: component-patterns
title: Architecture et modèles de composants
sidebar_label: Modèles de composants
sidebar_position: 7
---

# Architecture et modèles de composants

Le modèle Ever Works organise ses composants React à l'aide d'une structure de répertoires basée sur les fonctionnalités, avec une séparation claire entre les composants de fonctionnalités, les composants partagés et les primitives de base de l'interface utilisateur.

## Organisation du répertoire

Le répertoire `components/` suit une organisation axée sur les fonctionnalités dans laquelle chaque domaine principal possède son propre sous-répertoire, ainsi que des composants partagés et au niveau de l'interface utilisateur.

```
components/
├── admin/              # Admin panel feature components
├── auth/               # Authentication feature components
├── billing/            # Billing and payment components
├── collections/        # Collection display components
├── context/            # React context providers
├── dashboard/          # Dashboard feature components
├── directory/          # Directory listing components
├── favorites/          # Favorites feature components
├── featured-items/     # Featured items display
├── filters/            # Search and filter components
├── footer/             # Footer components
├── header/             # Header and navigation
├── home-two/           # Alternate homepage layout
├── icons/              # Custom icon components
├── item-detail/        # Item detail page components
├── layout/             # Layout wrapper components
├── layouts/            # Layout variant components
├── maps/               # Map integration components
├── newsletter/         # Newsletter components
├── payment/            # Payment flow components
├── pricing/            # Pricing display components
├── profile/            # User profile components
├── profile-button/     # Profile button dropdown
├── providers/          # Provider wrapper components
├── settings/           # Settings panel components
├── shared/             # Shared reusable components
├── shared-card/        # Shared card components
├── sponsor-ads/        # Sponsor ad components
├── sponsorships/       # Sponsorship management components
├── submissions/        # Submission form components
├── submit/             # Item submit components
├── surveys/            # Survey components
├── tracking/           # Analytics tracking components
├── ui/                 # Base UI primitives
└── version/            # Version display components
```

## Composants basés sur les fonctionnalités

Chaque répertoire de fonctionnalités contient tous les composants liés à ce domaine. Cela maintient le code associé au même emplacement et facilite la recherche de composants pour une fonctionnalité donnée.

### administrateur/

Contient tous les composants du panneau d'administration, y compris les tables de données, les formulaires, les modaux et les interfaces de gestion. Il s'agit de composants clients qui utilisent des hooks spécifiques à l'administrateur de `hooks/use-admin-*.ts`.

### authentification/

Composants d'authentification, notamment les formulaires de connexion, les formulaires d'inscription, les flux de réinitialisation de mot de passe, les boutons OAuth et les écrans de vérification des e-mails.

### facturation/

Composants de gestion de facturation et d'abonnement, notamment la sélection du forfait, les formulaires de mode de paiement, l'affichage des factures et les indicateurs d'état de l'abonnement.

### filtres/

Composants de recherche et de filtrage utilisés dans les pages de liste. Ceux-ci interagissent avec les paramètres de recherche d’URL et l’état du filtre Zustand pour fournir un filtrage en temps réel.

### prix/

Composants de la page de tarification, notamment les cartes de comparaison des forfaits, les matrices de fonctionnalités et l'intégration du paiement.

## Composants partagés

### partagé/

Le répertoire `shared/` contient des composants réutilisables utilisés dans plusieurs fonctionnalités. Il s'agit d'éléments de base indépendants du domaine qui combinent les primitives de l'interface utilisateur en modèles fonctionnels.

### carte-partagée/

Composants de carte partagés utilisés pour afficher des éléments, des collections et d'autres contenus dans des présentations de cartes dans l'application.

## Composants de niveau racine

Plusieurs fichiers de composants autonomes existent à la racine de `components/` :

|Composant|Objectif|
|-----------|---------|
|`categories-grid.tsx`|Affichage de la grille pour les catégories|
|`custom-hero.tsx`|Section héros personnalisable|
|`error-boundary.tsx`|Limite d'erreur avec l'interface utilisateur de secours|
|`error-provider.tsx`|Fournisseur de contexte d'erreur|
|`favorite-button.tsx`|Bouton bascule favori|
|`hero.tsx`|Section héros par défaut|
|`item.tsx`|Composant de la fiche article|
|`items-categories.tsx`|Articles organisés par catégories|
|`item-skeleton.tsx`|Chargement du squelette pour les éléments|
|`item-tags.tsx`|Affichage des balises pour les articles|
|`language-switcher.tsx`|Composant de commutation de paramètres régionaux|
|`layout-switcher.tsx`|Basculement de disposition grille/liste|
|`report-button.tsx`|Bouton de rapport de contenu|
|`sort-menu.tsx`|Liste déroulante des options de tri|
|`tags-cards.tsx`|Affichage de la carte d'étiquette|
|`tags-items.tsx`|Affichage des articles par balise|
|`theme-toggler.tsx`|Basculer le thème clair/sombre|
|`universal-pagination.tsx`|Composant de pagination réutilisable|
|`view-toggle.tsx`|Basculer le mode d'affichage|

## Primitives d'interface utilisateur (composants/ui/)

Le répertoire `ui/` contient les composants d'interface utilisateur de niveau de base qui constituent la base du système de conception. Ceux-ci sont construits sur HeroUI (anciennement NextUI) et Tailwind CSS.

Les primitives clés de l'interface utilisateur incluent :

|Composant|Descriptif|
|-----------|-------------|
|`button.tsx`|Bouton avec variantes (primaire, secondaire, fantôme, etc.)|
|`card.tsx`|Conteneur de cartes avec sections d'en-tête, de corps et de pied de page|
|`input.tsx`|Saisie de texte avec prise en charge de la validation|
|`label.tsx`|Composant d'étiquette de formulaire|
|`modal.tsx`|Dialogue modal avec superposition|
|`select.tsx`|Sélectionnez la liste déroulante avec capacité de recherche|
|`pagination.tsx`|Composant de navigation de page|
|`badge.tsx`|Composant de badge de statut|
|`accordion.tsx`|Sections de contenu extensibles|
|`alert.tsx`|Bannière d'alerte/notification|
|`breadcrumb.tsx`|Fil d'Ariane|
|`loading-spinner.tsx`|Indicateur de chargement|
|`password-strength.tsx`|Compteur de force de mot de passe|
|`rating.tsx`|Affichage/saisie du nombre d'étoiles|
|`infinity-scroll.tsx`|Wrapper de défilement infini|
|`searchable-select.tsx`|Sélectionner avec filtrage de recherche|
|`animations.tsx`|Composants de l'utilitaire d'animation|
|`auth-illustrations.tsx`|Illustrations de la page d'authentification|

## Composants serveur vs client

Le modèle suit les conventions Next.js pour la séparation des composants serveur et client :

### Composants du serveur

Les composants du serveur sont ceux par défaut dans App Router. Ils sont utilisés pour :
- Mises en page et wrappers
- Récupération de données au niveau de la page
- Rendu de contenu statique
- Contenu critique pour le référencement

Les composants du serveur résident principalement dans les fichiers de page et de mise en page `app/[locale]/`. Ils peuvent importer directement des fonctions de requête de base de données et des méthodes de référentiel.

### Composants clients

Les composants clients sont marqués `'use client'` et sont utilisés pour :
- Éléments d'interface utilisateur interactifs (formulaires, boutons, bascules)
- Composants qui utilisent des hooks React (useState, useEffect, hooks personnalisés)
- Composants qui utilisent les API du navigateur
- Composants qui dépendent de React Query ou Zustand

La plupart des composants du répertoire `components/` sont des composants clients car ils gèrent l'interaction et l'état de l'utilisateur.

## Fournisseurs de contexte

### composants/contexte/

Fournisseurs de contexte React pour partager l'état entre les arborescences de composants :
- Contexte d'erreur pour l'état limite d'erreur
- Contexte d'indicateur de fonctionnalité pour le contrôle des fonctionnalités d'exécution

### composants/fournisseurs/

Composants du wrapper de fournisseur qui composent plusieurs fournisseurs :
- Fournisseur de client de requête (TanStack Query)
- Fournisseur de thème
- Fournisseur de session (NextAuth)
- Fournisseur de pain grillé

Le wrapper des fournisseurs racine à `app/[locale]/providers.tsx` compose tous les fournisseurs nécessaires pour l'application.

## Conventions des composants

1. **Nom de fichier** : les composants utilisent des noms de fichiers kebab-case (par exemple, `favorite-button.tsx`)
2. **Modèle d'exportation** : les composants utilisent des exportations nommées, des fichiers barils (`index.ts`) dans les répertoires de fonctionnalités
3. **Colocalisation des hooks** : les hooks spécifiques aux fonctionnalités se trouvent dans le répertoire `hooks/` de niveau supérieur, et non dans les répertoires de composants.
4. **Style** : les composants utilisent les classes utilitaires CSS Tailwind ; certains utilisent des modules SCSS pour un style complexe
5. **Types** : les types d'accessoires de composants sont définis en ligne ou dans des fichiers de types adjacents dans le répertoire `types/`.
6. **Icônes** : Les icônes personnalisées sont centralisées dans `components/icons/` ; les icônes standard utilisent `lucide-react`
