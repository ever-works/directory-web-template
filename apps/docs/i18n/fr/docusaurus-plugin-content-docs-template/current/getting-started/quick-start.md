# Démarrage rapide

Mettez votre site d'annuaire en ligne en moins de 10 minutes ! Ce guide suppose que vous avez déjà effectué l'[installation](./installation).

## Étape 1 : Configuration de base

### Configurer les paramètres du site

Éditez `apps/web/.content/config.yml` (ce fichier sera créé après la première synchronisation) :

```yaml
# Paramètres de base du site
company_name: 'Votre Entreprise'
item_name: 'Outil'
items_name: 'Outils'
copyright_year: 2024

# Activer les fonctionnalités
content_table: true
auth:
    credentials: true
    google: true
    github: true

# Paramètres de paiement
payment:
    provider: 'stripe'
pricing:
    free: 0
    pro: 10
    sponsor: 20
```

### Configurer le dépôt de données

1. **Forker le dépôt de données** :
    - Visitez [awesome-data](https://github.com/ever-works/awesome-data)
    - Cliquez sur "Fork" pour créer votre copie

2. **Mettre à jour les variables d'environnement** :

    ```bash
    # Dans apps/web/.env.local
    DATA_REPOSITORY="https://github.com/VOTRE_NOM/awesome-data"
    GH_TOKEN="votre_token_github"
    ```

3. **Générer un token GitHub** :
    - Allez dans Paramètres GitHub → Paramètres développeur → Tokens d'accès personnel
    - Créez un token avec les permissions `repo`
    - Ajoutez-le dans `apps/web/.env.local`

## Étape 2 : Démarrer l'application

Depuis la racine du monorepo :

```bash
pnpm run dev
```

Ou pour démarrer uniquement l'application web :

```bash
pnpm run --filter @ever-works/web dev
```

Visitez [http://localhost:3000](http://localhost:3000) pour voir votre site !

## Étape 3 : Ajouter votre premier élément

### Méthode 1 : Édition directe de fichier

1. Naviguez vers votre dépôt de données forké
2. Créez un nouveau fichier dans le dossier `items/` : `mon-super-outil.yml`
3. Ajoutez le contenu :

```yaml
id: 'mon-super-outil'
name: 'Mon Super Outil'
slug: 'mon-super-outil'
description: 'Un outil fantastique pour augmenter la productivité'
website: 'https://exemple.com'
category: 'Productivité'
tags: ['productivité', 'automatisation']
```

4. Committez et poussez dans votre dépôt
5. Déclenchez une synchronisation via `http://localhost:3000/api/sync`

### Méthode 2 : Interface d'administration

1. Naviguez vers `http://localhost:3000/admin`
2. Connectez-vous avec vos identifiants administrateur
3. Cliquez sur **Éléments** → **Ajouter un élément**
4. Remplissez le formulaire et sauvegardez

## Étape 4 : Personnaliser l'apparence

### Changer le thème

Mettez à jour votre configuration pour sélectionner un thème :

```yaml
# Dans .content/config.yml
theme: 'moderne'  # Options : 'classique', 'moderne', 'minimal', 'sombre'
```

### Personnaliser les couleurs

```yaml
colors:
    primary: '#3B82F6'
    secondary: '#8B5CF6'
```

## Étape 5 : Configurer l'authentification

Si vous utilisez des connexions sociales, mettez à jour votre `.env.local` :

```bash
# Google OAuth
GOOGLE_CLIENT_ID="votre-client-id"
GOOGLE_CLIENT_SECRET="votre-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="votre-client-id"
GITHUB_CLIENT_SECRET="votre-client-secret"
```

## Vérification

Après la configuration, vérifiez que :

1. ✅ La page d'accueil affiche votre contenu
2. ✅ La connexion OAuth fonctionne
3. ✅ Le tableau de bord d'administration est accessible
4. ✅ Les éléments apparaissent dans los listes

## Prochaines étapes

- [Premier déploiement](/getting-started/first-deployment) — Déployez en production
- [Configuration de l'authentification](/authentication/overview) — Configurez tous les fournisseurs
- [Intégration de paiement](/payment/overview) — Configurez les abonnements
