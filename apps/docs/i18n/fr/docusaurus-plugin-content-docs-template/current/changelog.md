---
id: changelog
title: Journal des modifications et versionnement
sidebar_label: Journal des modifications
---

# Journal des modifications et versionnement

Cette page explique comment le Modèle de site Ever Works gère le versionnement, les releases et les chemins de mise à niveau.

## Versionnement sémantique

Le modèle suit le [Versionnement Sémantique (SemVer)](https://semver.org/). Les numéros de version utilisent le format **MAJEUR.MINEUR.PATCH** :

| Composant    | Quand incrémenter                                               |
| ------------ | --------------------------------------------------------------- |
| **MAJEUR**   | Changements majeurs nécessitant des étapes de migration         |
| **MINEUR**   | Nouvelles fonctionnalités ajoutées de manière rétrocompatible  |
| **PATCH**    | Corrections de bugs rétrocompatibles et améliorations mineures |

Les versions pré-release peuvent utiliser des suffixes comme `-alpha.1`, `-beta.2` ou `-rc.1` pour les tests anticipés.

## Migrations de base de données

Le modèle utilise **Drizzle ORM** avec PostgreSQL. Les changements de schéma de base de données sont gérés via Drizzle Kit :

```bash
# Générer les fichiers de migration à partir des changements de schéma
pnpm db:generate

# Appliquer les migrations à la base de données
pnpm db:migrate

# Ouvrir Drizzle Studio pour la gestion visuelle de la base de données
pnpm db:studio
```

Les fichiers de migration sont stockés dans le répertoire `lib/db/migrations/`. Chaque migration est un fichier SQL généré à partir des changements des définitions de schéma Drizzle dans `lib/db/schema/`.

## Mise à niveau du modèle

Lors de la mise à niveau vers une version plus récente :

```bash
cd directory-web-template

# Récupérer les derniers changements
git pull origin main

# Installer les dépendances mises à jour
pnpm install

# Appliquer les migrations de base de données
pnpm db:migrate

# Vérifier la construction
pnpm build
```

### Gérer les conflits lors des mises à niveau

Si vous avez personnalisé le modèle, vous pouvez rencontrer des conflits de fusion lors de la récupération des mises à jour. L'approche recommandée :

1. **Conservez les personnalisations dans des fichiers séparés** si possible (composants personnalisés, nouvelles routes, services supplémentaires).
2. **Utilisez le CMS basé sur Git** pour les changements de contenu plutôt que de modifier les fichiers principaux.
3. **Examinez les notes de release** avant de mettre à niveau pour comprendre quels fichiers ont changé.
4. **Testez minutieusement** après avoir résolu les conflits en exécutant `pnpm lint`, `pnpm tsc --noEmit` et `pnpm build`.

## Suivre les releases

### Releases GitHub

Les releases sont publiées sur GitHub à [github.com/ever-works/directory-web-template/releases](https://github.com/ever-works/directory-web-template/releases).

Chaque release inclut :

- Un tag de version (ex : `v0.1.0`)
- Des notes de release décrivant les changements, nouvelles fonctionnalités, corrections de bugs et changements majeurs
- Des liens vers les pull requests et issues pertinentes
