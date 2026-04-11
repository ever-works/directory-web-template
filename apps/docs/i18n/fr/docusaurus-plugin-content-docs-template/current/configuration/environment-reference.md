---
id: environment-reference
title: Référence complète des variables d'environnement
sidebar_label: Référence environnement
sidebar_position: 1
---

# Référence complète des variables d'environnement

Cette page fournit une référence complète de toutes les variables d'environnement utilisées par le template Ever Works. Les variables sont organisées par catégorie avec leurs types, valeurs par défaut et si elles sont requises.

Copiez `.env.example` vers `.env.local` et remplissez les valeurs pour votre déploiement.

## Contenu et dépôt de données

| Variable | Type | Requis | Défaut | Description |
|----------|------|--------|--------|-------------|
| `DATA_REPOSITORY` | string (URL) | **Oui** | -- | URL du dépôt Git pour les données de contenu |
| `GH_TOKEN` | string | Non | -- | Token d'accès personnel GitHub (pour dépôts privés) |
| `GITHUB_TOKEN` | string | Non | -- | Variable de token GitHub alternative |
| `GITHUB_BRANCH` | string | Non | `master` | Branche Git depuis laquelle cloner le contenu |

## Base de données

| Variable | Type | Requis | Défaut | Description |
|----------|------|--------|--------|-------------|
| `DATABASE_URL` | string | Recommandé | -- | Chaîne de connexion à la base de données (SQLite ou Postgres) |

Lorsque `DATABASE_URL` n'est pas défini, les fonctionnalités dépendant de la base de données (notes, commentaires, favoris, enquêtes, éléments mis en avant) sont automatiquement désactivées via le système de feature flags.

## Authentification

| Variable | Type | Requis | Défaut | Description |
|----------|------|--------|--------|-------------|
| `AUTH_SECRET` | string | **Oui** | -- | Secret NextAuth (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **Oui** | -- | Secret de chiffrement des cookies |
| `COOKIE_DOMAIN` | string | Non | -- | Domaine des cookies (ex. `localhost`) |
| `COOKIE_SECURE` | boolean | Non | `true` | Drapeau de cookie sécurisé |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | Non | `15m` | TTL du token d'accès |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | Non | `7d` | TTL du token de rafraîchissement |

### Fournisseurs OAuth

| Variable | Type | Requis | Description |
|----------|------|--------|-------------|
| `GOOGLE_CLIENT_ID` | string | Non | ID client OAuth Google |
| `GOOGLE_CLIENT_SECRET` | string | Non | Secret client OAuth Google |
| `GITHUB_CLIENT_ID` | string | Non | ID client OAuth GitHub |
| `GITHUB_CLIENT_SECRET` | string | Non | Secret client OAuth GitHub |
| `MICROSOFT_CLIENT_ID` | string | Non | ID client OAuth Microsoft |
| `MICROSOFT_CLIENT_SECRET` | string | Non | Secret client OAuth Microsoft |
| `FB_CLIENT_ID` | string | Non | ID client OAuth Facebook |
| `FB_CLIENT_SECRET` | string | Non | Secret client OAuth Facebook |
| `X_CLIENT_ID` | string | Non | ID client OAuth X (Twitter) |
| `X_CLIENT_SECRET` | string | Non | Secret client OAuth X (Twitter) |
| `LINKEDIN_CLIENT_ID` | string | Non | ID client OAuth LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | string | Non | Secret client OAuth LinkedIn |

Les fournisseurs OAuth s'activent automatiquement lorsque l'ID client et le secret sont définis.

## Site et image de marque (sûr côté client)

Toutes les variables `NEXT_PUBLIC_*` sont exposées au navigateur.

| Variable | Type | Défaut | Description |
|----------|------|--------|-------------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | URL de l'application répertoire |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | URL publique du site de l'entreprise |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | URL de base de l'API |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | Nom du site pour les métadonnées |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | Slogan du site |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | Nom de marque pour schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (voir .env.example) | Description SEO (moins de 160 caractères) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | Mots-clés SEO séparés par des virgules |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | Chemin du logo (relatif à /public) |

### Thème de l'image OG

| Variable | Type | Défaut | Description |
|----------|------|--------|-------------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | Couleur de départ du dégradé OG |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | Couleur de fin du dégradé OG |

### Liens réseaux sociaux

| Variable | Type | Défaut | Description |
|----------|------|--------|-------------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | Lien GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | Lien X (Twitter) |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (voir .env.example) | Lien LinkedIn |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (voir .env.example) | Lien Facebook |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | Lien blog |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | Email de contact |

### Attribution

| Variable | Type | Défaut | Description |
|----------|------|--------|-------------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | URL du lien "Construit avec" |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | Texte du lien "Construit avec" |
