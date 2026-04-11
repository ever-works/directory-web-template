---
id: setup-guide
title: Guide de configuration de l'authentification
sidebar_label: Guide de configuration
sidebar_position: 2
---

# Guide de configuration de l'authentification

Ce guide explique comment configurer correctement l'authentification dans votre application Ever Works.

## Variables d'environnement requises

Ajoutez ces variables à votre fichier `.env.local` :

```env
# ============================================
# AUTHENTIFICATION & SÉCURITÉ
# ============================================

## Next Auth
AUTH_SECRET="votre-secret-généré"
NEXTAUTH_SECRET="idem-que-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Générer un secret sécurisé

Exécutez cette commande pour générer un secret sécurisé :

```bash
openssl rand -base64 32
```

Ou utilisez la CLI NextAuth :

```bash
npx auth secret
```

## Configuration des fournisseurs OAuth

Pour activer les fournisseurs OAuth, ajoutez leurs identifiants dans votre `.env.local` :

```env
## Fournisseurs OAuth
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret

GITHUB_CLIENT_ID=votre_github_client_id
GITHUB_CLIENT_SECRET=votre_github_client_secret

FACEBOOK_CLIENT_ID=votre_facebook_client_id
FACEBOOK_CLIENT_SECRET=votre_facebook_client_secret

TWITTER_CLIENT_ID=votre_twitter_client_id
TWITTER_CLIENT_SECRET=votre_twitter_client_secret
```

### Obtenir les identifiants OAuth

#### Google OAuth

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez-en un existant
3. Activez l'API Google+
4. Allez dans Identifiants → Créer des identifiants → ID client OAuth 2.0
5. Ajoutez l'URI de redirection autorisé : `http://localhost:3000/api/auth/callback/google`
6. Copiez l'ID client et le Secret client

#### GitHub OAuth

1. Allez dans [Paramètres développeur GitHub](https://github.com/settings/developers)
2. Cliquez sur "Nouvelle application OAuth"
3. Définissez l'URL de callback d'autorisation : `http://localhost:3000/api/auth/callback/github`
4. Copiez l'ID client et générez le Secret client

#### Facebook OAuth

1. Allez sur [Facebook Developers](https://developers.facebook.com/)
2. Créez une nouvelle application
3. Ajoutez le produit "Facebook Login"
4. Configurez l'URI de redirection OAuth valide : `http://localhost:3000/api/auth/callback/facebook`

## Mode identifiants (e-mail/mot de passe)

L'authentification par identifiants est activée par défaut. Configurez-la dans `apps/web/.content/config.yml` :

```yaml
auth:
  credentials: true  # Activer l'authentification par e-mail/mot de passe
  google: true       # Activer Google OAuth
  github: true       # Activer GitHub OAuth
```

## Protection des routes

Les routes protégées utilisent le middleware Next.js. Consultez `apps/web/middleware.ts` pour configurer quelles routes nécessitent une authentification.

## Prochaines étapes

- [Fournisseurs](/authentication/providers) — Configurer plus de fournisseurs OAuth
- [Gestion de session](/authentication/session-management) — Paramètres de session
- [RBAC](/authentication/rbac) — Contrôle d'accès basé sur les rôles
