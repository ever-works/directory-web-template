---
id: contributing
title: Guide de contribution
sidebar_label: Contribuer
---

# Guide de contribution

Merci de votre intérêt à contribuer au Directoire Web Template. Ce guide couvre tout ce que vous devez savoir pour effectuer des contributions significatives.

## Dépôt

Le code source de la Template est hébergé sur [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template).

Pour les contributions à la Plateforme Ever Works, consultez le [dépôt de la Plateforme](https://github.com/ever-works/ever-works) et son guide de contribution sur [docs.ever.works](https://docs.ever.works).

## Prérequis

Avant de commencer, assurez-vous d'avoir installé les éléments suivants :

- **Node.js** >= 20.19.0 (LTS recommandé)
- **pnpm** >= 10.x (strictement appliqué ; n'utilisez pas npm ou yarn)
- **Git** >= 2.30
- **PostgreSQL** (pour la base de données ; Supabase propose une option hébergée)

### Installation de pnpm

```bash
# Via corepack (recommandé, fourni avec Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate

# Ou via npm (amorçage unique)
npm install -g pnpm
```

**Important :** Le dépôt utilise des champs `packageManager` et des fichiers de verrouillage spécifiques à pnpm. L'exécution de `npm install` ou `yarn install` échouera ou produira des arborescences de dépendances incorrectes.

## Configuration du développement

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# Copiez le fichier d'environnement et configurez-le
cp apps/web/.env.example apps/web/.env.local
# Éditez apps/web/.env.local avec vos valeurs

pnpm dev        # Serveur de développement Next.js sur le port 3000
```

## Standards de code

### TypeScript

La Template utilise TypeScript partout. N'introduisez pas de fichiers `.js` simples. Suivez les pratiques TypeScript strictes :

- Activez et respectez les paramètres du mode `strict` dans `tsconfig.json`
- Préférez les types de retour explicites sur les fonctions exportées
- Utilisez des types d'union discriminés plutôt que les types `any`

### Style de code

La Template utilise Prettier pour le formatage automatique. La configuration est définie dans `package.json` :

- Tabulations pour l'indentation
- Largeur de tabulation de 4 espaces
- Largeur d'impression de 120 caractères
- Pas de point-virgule
- Guillemets simples

Exécutez le linting avant de soumettre :

```bash
pnpm lint
```

## Flux de travail Git

1. **Forkez** le dépôt sur GitHub
2. **Créez** une branche de fonctionnalité depuis `main` : `git checkout -b feature/ma-fonctionnalite`
3. **Faites** des commits avec des messages clairs
4. **Exécutez** `pnpm lint` et `pnpm tsc --noEmit` avant de pousser
5. **Ouvrez** une Pull Request avec une description claire

## Tests

Il n'y a actuellement pas de suite Jest/Vitest. Les « tests » principaux sont :

```bash
pnpm lint              # Linting ESLint
pnpm tsc --noEmit      # Vérification de types TypeScript
pnpm build             # Build de production
```

Pour les changements importants, exécutez également les tests E2E :

```bash
cd apps/web-e2e
pnpm test
```

## Signalement des problèmes

- Utilisez les [Issues GitHub](https://github.com/ever-works/directory-web-template/issues)
- Utilisez le modèle approprié (bug, fonctionnalité, documentation)
- Fournissez des informations système et des étapes de reproduction
