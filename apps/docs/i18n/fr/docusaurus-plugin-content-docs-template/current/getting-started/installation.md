# Installation

Ce guide vous accompagne à travers la configuration d'Ever Works sur votre machine locale.

## Prérequis

Avant de commencer, assurez-vous d'avoir les éléments suivants installés :

- **Node.js >= 20.19.0** - [Télécharger ici](https://nodejs.org/)
- **pnpm** - Gestionnaire de paquets requis (installer avec `npm install -g pnpm`)
- **Git** - Pour le contrôle de version
- **PostgreSQL** (optionnel) - Pour la base de données

## Prérequis système

- **Système d'exploitation** : Windows, macOS ou Linux
- **Mémoire** : 4 Go de RAM minimum, 8 Go recommandé
- **Stockage** : 2 Go d'espace libre
- **Réseau** : Connexion Internet pour les dépendances

## Étapes d'installation

### 1. Cloner le dépôt

Le modèle est un **monorepo Turborepo** géré avec les espaces de travail pnpm. Le clonage vous donne la racine du monorepo, qui contient l'application web dans `apps/web/`, une suite de tests de bout en bout dans `apps/web-e2e/` et un site de documentation dans `apps/docs/`.

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

### 2. Installer les dépendances

Exécutez la commande d'installation depuis la **racine du monorepo**. pnpm est le gestionnaire de paquets requis :

```bash
pnpm install
```

### 3. Configuration de l'environnement

Copiez le fichier d'environnement exemple dans le répertoire de **l'application web** :

```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. Configurer les variables d'environnement

Éditez `apps/web/.env.local` avec votre configuration :

```bash
# Configuration de base
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"

# Authentification
AUTH_SECRET="votre-clé-secrète"  # Générer avec : openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Base de données (optionnel)
DATABASE_URL="postgresql://utilisateur:mot_de_passe@localhost:5432/everworks"

# Intégration GitHub (requis pour la synchronisation du contenu)
GH_TOKEN="votre-token-github"
DATA_REPOSITORY="https://github.com/ever-works/awesome-data"
```

### 5. Générer le secret d'authentification

Générez un secret sécurisé pour l'authentification :

```bash
openssl rand -base64 32
```

Copiez la sortie et définissez-la comme votre `AUTH_SECRET` dans `apps/web/.env.local`.

### 6. Configuration de la base de données (optionnel)

Si vous souhaitez utiliser une base de données, exécutez les commandes de base de données depuis le répertoire `apps/web/` :

```bash
cd apps/web

# Générer le schéma de la base de données
pnpm db:generate

# Exécuter les migrations
pnpm db:migrate

# Alimenter les données initiales
pnpm db:seed
```

### 7. Démarrer le serveur de développement

Depuis la racine du monorepo, démarrez toutes les applications (web, docs, etc.) :

```bash
pnpm run dev
```

Ou pour démarrer uniquement l'application web :

```bash
pnpm run --filter @ever-works/web dev
```

Visitez [http://localhost:3000](http://localhost:3000) pour voir votre site !

## Vérification

Après le démarrage, vérifiez que :

1. ✅ Le serveur de développement tourne sur `http://localhost:3000`
2. ✅ La page d'accueil se charge sans erreurs
3. ✅ Les migrations de base de données se sont exécutées avec succès (si configurées)

## Dépannage courant

### Erreur : "Commande pnpm introuvable"
```bash
npm install -g pnpm
```

### Erreur : "Mauvaise version de Node.js"
Utilisez nvm pour passer à la version requise :
```bash
nvm use 20
```

### Erreur de connexion à la base de données
Vérifiez que PostgreSQL est en marche et que votre `DATABASE_URL` est correcte. Pour un développement local, vous pouvez utiliser SQLite en définissant `DATABASE_URL=file:./dev.db`.

## Prochaines étapes

- [Configuration de l'environnement](/getting-started/environment-setup) — Variables d'environnement complètes
- [Démarrage rapide](/getting-started/quick-start) — Mise en route en moins de 10 minutes
