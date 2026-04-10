---
id: environment-variables
title: Variables d'environnement
sidebar_label: Variables d'environnement
sidebar_position: 5
---

# Variables d'environnement

Configurez votre déploiement Ever Works avec les bonnes variables d'environnement.

## Variables requises

### Paramètres de l'application

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
NEXT_PUBLIC_API_BASE_URL=https://votre-domaine.com
```

### Configuration de la base de données

```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

### Authentification

```bash
# Secret NextAuth (générer avec : openssl rand -base64 32)
AUTH_SECRET=votre-clé-secrète
COOKIE_SECRET=votre-secret-cookie
COOKIE_DOMAIN=votredomaine.com
COOKIE_SECURE=true
```

### CMS basé sur Git

```bash
DATA_REPOSITORY=https://github.com/votre/awesome-data
GH_TOKEN=votre-token-github  # Pour les dépôts privés
```

## Variables optionnelles

### Configuration email

```bash
# Paramètres SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre@email.com
SMTP_PASSWORD=votre-mot-de-passe-app

# Resend (alternatif)
RESEND_API_KEY=re_votre_cle
```

### Fournisseurs OAuth

```bash
GOOGLE_CLIENT_ID=votre-id-client-google
GOOGLE_CLIENT_SECRET=votre-secret-google

GITHUB_CLIENT_ID=votre-id-github
GITHUB_CLIENT_SECRET=votre-secret-github
```

### Paiements

```bash
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Analytics

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

## Gestion des secrets sur Vercel

N'exposez jamais de variables sensibles dans votre code source. Sur Vercel :

1. Allez dans les **Paramètres** du projet
2. Cliquez sur **Environment Variables**
3. Ajoutez chaque variable avec son niveau d'environnement (Production / Preview / Development)
