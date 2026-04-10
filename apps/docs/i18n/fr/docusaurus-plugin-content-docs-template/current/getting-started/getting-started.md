---
id: getting-started
title: Démarrer avec le modèle
sidebar_label: Aperçu
sidebar_position: 0
---

# Démarrer avec le modèle

Bienvenue dans le Modèle de site Ever Works. Cette section vous guide à travers chaque étape nécessaire pour passer d'un simple clone à une application fonctionnelle — en local et en production.

## Qu'est-ce que le modèle Ever Works ?

Le modèle Ever Works est un **site d'annuaire Next.js** complet, organisé en **monorepo Turborepo** avec des espaces de travail pnpm. Il est construit avec TypeScript, React 19 et l'App Router. Il est livré avec l'authentification, les paiements, un tableau de bord d'administration, l'internationalisation, un CMS basé sur Git et bien plus encore. Le monorepo contient l'application web principale (`apps/web/`), une suite de tests de bout en bout (`apps/web-e2e/`) et un site de documentation (`apps/docs/`). Le modèle est conçu pour que vous puissiez le cloner, le pointer vers votre propre dépôt de données et disposer d'un site d'annuaire prêt pour la production sans tout écrire de zéro.

Informations clés du manifeste du projet :

| Détail                     | Valeur                                                      |
| -------------------------- | ----------------------------------------------------------- |
| **Nom du paquet**          | `directory-web-template` (racine du monorepo)              |
| **Licence**                | AGPL-3.0                                                    |
| **Prérequis Node.js**      | >= 20.19.0                                                  |
| **Gestionnaire de paquets**| pnpm avec Turborepo (lockfile : `pnpm-lock.yaml`)           |
| **Framework**              | Next.js avec React 19                                       |
| **ORM de base de données** | Drizzle ORM avec PostgreSQL (ou SQLite pour le dev local)   |
| **Authentification**       | NextAuth.js v5 (beta) avec plusieurs fournisseurs           |

## Ce que vous allez apprendre

Cette section de démarrage est organisée en quatre guides séquentiels plus une carte de référence. À la fin, vous serez capable de :

1. **Installer le modèle** et toutes ses dépendances sur votre machine.
2. **Configurer votre environnement** avec les secrets requis, la connexion à la base de données et le dépôt de contenu.
3. **Exécuter l'application en local** et vérifier que le serveur de développement, la base de données et le pipeline de contenu fonctionnent tous.
4. **Déployer en production** sur Vercel, Docker ou un serveur auto-hébergé.
5. **Rechercher des commandes rapidement** en utilisant l'aide-mémoire de référence rapide.

## Plan de la section

Parcourez les guides dans l'ordre. Chacun s'appuie sur l'étape précédente.

### 1. Installation

Configurez Node.js (>= 20.19.0), pnpm et clonez le monorepo. Le guide d'installation couvre les prérequis système, l'installation des dépendances et l'orientation initiale de la structure du projet.

**Lire ensuite :** [Installation](/getting-started/installation)

### 2. Configuration de l'environnement

Créez votre fichier `apps/web/.env.local` et configurez chaque variable requise et optionnelle. Le modèle est livré avec un utilitaire `scripts/check-env.js` qui valide votre configuration avant que le serveur de développement ne démarre, vous savez donc immédiatement si quelque chose manque.

Sujets abordés :

- Variables principales (`AUTH_SECRET`, `COOKIE_SECRET`, `DATABASE_URL`)
- Dépôt de contenu (`DATA_REPOSITORY` et le pipeline `scripts/clone.cjs`)
- Fournisseurs d'authentification (Google, GitHub, identifiants)
- Intégrations de paiement (Stripe, Polar, LemonSqueezy, Solidgate)
- Services d'e-mail, d'analytique et de monitoring

**Lire ensuite :** [Configuration de l'environnement](/getting-started/environment-setup)

### 3. Démarrage rapide

Une fois votre environnement configuré, le guide de démarrage rapide met l'application en marche en moins de dix minutes. Vous démarrerez le serveur de développement, alimenterez la base de données et explorerez le site sur `http://localhost:3000`.

**Lire ensuite :** [Démarrage rapide](/getting-started/quick-start)

### 4. Premier déploiement

Prenez votre configuration vérifiée localement et déployez-la dans un environnement live. Le guide de déploiement couvre Vercel (recommandé), les builds Docker autonomes et l'hébergement manuel. Il comprend une liste de contrôle pré-déploiement pour ne rien oublier.

**Lire ensuite :** [Premier déploiement](/getting-started/first-deployment)

### 5. Référence rapide

Un aide-mémoire d'une page des commandes les plus courantes, des chemins de fichiers et des conventions. Gardez-le ouvert dans un onglet pendant le développement.

**Lire ensuite :** [Référence rapide](/getting-started/quick-reference)

## Prérequis

Avant de commencer, assurez-vous que ce qui suit est installé et fonctionne sur votre machine :

| Outil         | Version minimale | Remarques                                              |
| ------------- | ---------------- | ------------------------------------------------------ |
| **Node.js**   | 20.19.0          | Utilisez nvm ou fnm pour gérer les versions            |
| **pnpm**      | 9.x              | `npm install -g pnpm`                                  |
| **Git**       | Toute version récente | Requis pour le clonage et le pipeline de contenu  |
| **PostgreSQL**| 14+ (optionnel)  | SQLite fonctionne pour le développement local          |

Si vous rencontrez des problèmes pendant la configuration, consultez la [section dépannage](/advanced-guide/troubleshooting) ou ouvrez une issue sur GitHub.
