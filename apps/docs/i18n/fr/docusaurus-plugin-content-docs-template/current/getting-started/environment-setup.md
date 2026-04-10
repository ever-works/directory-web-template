# Configuration de l'environnement

Ce guide couvre la configuration complète de l'environnement pour Ever Works, y compris tous les services et intégrations optionnels.

## Structure du fichier d'environnement

Créez un fichier `.env.local` dans `apps/web/` avec la structure suivante :

```bash
# ============================================
# CONFIGURATION DE BASE
# ============================================
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ============================================
# AUTHENTIFICATION & SÉCURITÉ
# ============================================
AUTH_SECRET="votre-secret-généré"
NEXTAUTH_SECRET="idem-que-auth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Sécurité des cookies
COOKIE_SECRET="votre-secret-cookie-sécurisé"
COOKIE_DOMAIN="localhost"
COOKIE_SECURE=false
COOKIE_SAME_SITE="lax"

# ============================================
# BASE DE DONNÉES
# ============================================
DATABASE_URL="postgresql://utilisateur:mot_de_passe@localhost:5432/everworks"

# ============================================
# INTÉGRATION GITHUB
# ============================================
GH_TOKEN="github_pat_votre_token_ici"
DATA_REPOSITORY="https://github.com/votre-nom/awesome-data"

# ============================================
# FOURNISSEURS OAUTH
# ============================================
# Google
GOOGLE_CLIENT_ID="votre-google-client-id"
GOOGLE_CLIENT_SECRET="votre-google-client-secret"

# GitHub
GITHUB_CLIENT_ID="votre-github-client-id"
GITHUB_CLIENT_SECRET="votre-github-client-secret"

# Facebook
FACEBOOK_CLIENT_ID="votre-facebook-app-id"
FACEBOOK_CLIENT_SECRET="votre-facebook-app-secret"

# Twitter/X
TWITTER_CLIENT_ID="votre-twitter-client-id"
TWITTER_CLIENT_SECRET="votre-twitter-client-secret"

# Microsoft
MICROSOFT_CLIENT_ID="votre-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="votre-microsoft-client-secret"

# ============================================
# TRAITEMENT DES PAIEMENTS
# ============================================
# Stripe
STRIPE_SECRET_KEY="sk_test_votre_clé_secrète_stripe"
STRIPE_PUBLISHABLE_KEY="pk_test_votre_clé_publique_stripe"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_votre_clé_publique_stripe"
STRIPE_WEBHOOK_SECRET="whsec_votre_secret_webhook"
```

## Variables requises

Ces variables doivent être définies pour que l'application démarre :

| Variable          | Description                                         | Exemple                           |
| ----------------- | --------------------------------------------------- | --------------------------------- |
| `AUTH_SECRET`     | Secret JWT pour NextAuth.js                         | `openssl rand -base64 32`         |
| `COOKIE_SECRET`   | Secret pour le chiffrement des cookies              | `openssl rand -base64 32`         |
| `DATABASE_URL`    | Chaîne de connexion à la base de données            | `file:./dev.db` pour SQLite       |
| `DATA_REPOSITORY` | URL du dépôt de contenu Git                        | `https://github.com/org/data`     |

## Génération des secrets

Générez des secrets cryptographiquement sécurisés :

```bash
# Secret d'authentification
openssl rand -base64 32

# Secret des cookies
openssl rand -base64 32
```

## Fournisseurs d'authentification

### Configuration Google OAuth

1. Rendez-vous sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez-en un existant
3. Activez l'API Google+
4. Créez des identifiants OAuth 2.0
5. Ajoutez `http://localhost:3000/api/auth/callback/google` comme URI de redirection autorisée

### Configuration GitHub OAuth

1. Rendez-vous dans **Paramètres GitHub** → **Paramètres développeur** → **Applications OAuth**
2. Créez une nouvelle application OAuth
3. Définissez l'URL de callback : `http://localhost:3000/api/auth/callback/github`

## Configuration de la base de données

### SQLite (développement local)
```bash
DATABASE_URL="file:./dev.db"
```

### PostgreSQL (recommandé pour la production)
```bash
DATABASE_URL="postgresql://utilisateur:mot_de_passe@hôte:5432/nom_bd"
```

### Supabase
```bash
DATABASE_URL="postgresql://postgres:[MOT-DE-PASSE]@db.[REF].supabase.co:5432/postgres"
```

## Dépôt de contenu

Le dépôt de données est un dépôt Git contenant votre contenu d'annuaire au format YAML. Définissez :

```bash
DATA_REPOSITORY="https://github.com/votre-org/votre-repo-données"
GH_TOKEN="votre_token_d_accès_personnel_github"
```

Le script `scripts/clone.cjs` clone ce dépôt dans `.content/` au démarrage.

## Validation de la configuration

Le script `scripts/check-env.js` valide votre configuration :

```bash
cd apps/web
node scripts/check-env.js
```

Il vérifiera que toutes les variables requises sont définies et avertira des variables optionnelles manquantes.

## Prochaines étapes

- [Démarrage rapide](/getting-started/quick-start) — Démarrer l'application
- [Intégration de paiement](/payment/overview) — Configurer Stripe, Polar, LemonSqueezy
