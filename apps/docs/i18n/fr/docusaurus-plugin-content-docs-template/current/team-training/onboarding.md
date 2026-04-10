---
id: onboarding
title: Guide d'intégration
sidebar_label: Intégration
sidebar_position: 2
---

# Guide d'intégration

Bienvenue dans Ever Works ! Ce guide vous aidera à configurer votre environnement de développement et à effectuer votre première contribution.

## Objectifs

À la fin de ce module, vous aurez :

- Un environnement de développement entièrement configuré
- Une compréhension de la structure du projet
- L'application lancée en local
- Effectué votre premier changement de code
- Compris le flux de travail de développement

**Durée estimée** : 1-2 jours

---

## Étape 1 : Configuration de l'environnement

### 1.1 Installer les outils requis

Suivez le [Guide d'installation](/getting-started/installation) détaillé pour installer :

- Node.js 20.19.0+
- pnpm ([installer](https://pnpm.io/installation))
- PostgreSQL 14+
- Git
- VS Code (recommandé)

### 1.2 Cloner le dépôt

```bash
# Cloner le dépôt
git clone https://github.com/ever-co/ever-works.git
cd ever-works

# Installer les dépendances (pnpm est le gestionnaire de paquets du monorepo)
pnpm install
```

### 1.3 Configurer les variables d'environnement

Suivez le [Guide de configuration de l'environnement](/getting-started/environment-setup) pour configurer votre fichier `apps/web/.env.local`.

**Liste de vérification rapide** :

- [ ] Connexion à la base de données configurée
- [ ] Secrets d'authentification définis
- [ ] Clés du fournisseur de paiement ajoutées (optionnel pour le développement)
- [ ] Service email configuré (optionnel pour le développement)

---

## Étape 2 : Configuration de la base de données

### 2.1 Démarrer PostgreSQL

```bash
# Avec Docker (recommandé)
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=everworks \
  -p 5432:5432 \
  -d postgres:14

# Ou utilisez votre installation PostgreSQL locale
```

### 2.2 Exécuter les migrations

```bash
# Exécuter les commandes de base de données depuis le répertoire de l'app
cd apps/web

# Générer les fichiers de migration
pnpm db:generate

# Appliquer les migrations
pnpm db:migrate

# (Optionnel) Ensemencer la base de données avec des données de test
pnpm db:seed
```

---

## Étape 3 : Lancer l'application

```bash
# À partir de la racine du monorepo
pnpm run dev

# Ou uniquement l'application web
pnpm run --filter @ever-works/web dev
```

Visitez [http://localhost:3000](http://localhost:3000) pour voir l'application.

---

## Étape 4 : Comprendre la structure du projet

```
apps/
├── web/                    # Application principale Next.js
│   ├── app/               # Routes Next.js App Router
│   │   ├── [locale]/      # Pages localisées
│   │   └── api/           # Endpoints API
│   ├── components/        # Composants React
│   ├── lib/               # Logique métier
│   │   ├── db/            # Schéma Drizzle et helpers
│   │   ├── repositories/  # Couche d'accès aux données
│   │   └── services/      # Logique métier
│   └── hooks/             # Hooks React personnalisés
└── docs/                  # Site de documentation (Docusaurus)
```

---

## Étape 5 : Effectuer votre premier changement

1. Créez une nouvelle branche :

```bash
git checkout -b feature/votre-fonctionnalite
```

2. Effectuez vos modifications

3. Vérifiez avec les tests :

```bash
pnpm lint
pnpm tsc --noEmit
```

4. Committez et poussez :

```bash
git add .
git commit -m "feat: votre description"
git push origin feature/votre-fonctionnalite
```

---

## Ressources utiles

- [Documentation de l'architecture](/architecture)
- [Guide de configuration](/configuration/config-system)
- [Référence API](/api)
- [Flux de travail de développement](/development/local-setup)
