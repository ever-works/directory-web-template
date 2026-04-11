---
id: providers
title: Fournisseurs d'authentification
sidebar_label: Fournisseurs
sidebar_position: 2
---

# Fournisseurs d'authentification

Le modèle prend en charge plusieurs fournisseurs d'authentification via NextAuth.js (Auth.js v5), avec un adaptateur Supabase optionnel pour les sessions en base de données. Les fournisseurs sont configurés dynamiquement en fonction des variables d'environnement, avec un repli intelligent vers l'authentification par identifiants uniquement lorsque la configuration OAuth est incomplète.

## Architecture des fournisseurs

La configuration des fournisseurs d'authentification suit un modèle de configuration en couches :

```
auth.config.ts                  # Configuration NextAuth de niveau supérieur
  -> lib/auth/providers.ts      # Usine de fournisseurs OAuth
  -> lib/auth/credentials.ts    # Fournisseur email/mot de passe
  -> lib/auth/error-handler.ts  # Validation env + cartographie des erreurs
  -> lib/auth/config.ts         # Résolution du type de fournisseur (next-auth | supabase | les deux)
```

## Fournisseurs OAuth pris en charge

### Google

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | ID client Google OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | Secret client Google OAuth 2.0 |

Configurez Google OAuth sur la [Google Cloud Console](https://console.cloud.google.com/). Définissez l'URI de redirection autorisée sur `{APP_URL}/api/auth/callback/google`.

### GitHub

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | ID client de l'application OAuth GitHub |
| `GITHUB_CLIENT_SECRET` | Secret client de l'application OAuth GitHub |

Créez une application OAuth GitHub sur [github.com/settings/developers](https://github.com/settings/developers). Définissez l'URL de callback d'autorisation sur `{APP_URL}/api/auth/callback/github`.

### Facebook

| Variable | Description |
|----------|-------------|
| `FB_CLIENT_ID` | ID de l'application Facebook |
| `FB_CLIENT_SECRET` | Secret de l'application Facebook |

Configurez un produit Facebook Login dans le [Portail développeur Meta](https://developers.facebook.com/). L'URI de redirection OAuth valide est `{APP_URL}/api/auth/callback/facebook`.

### Twitter / X

| Variable | Description |
|----------|-------------|
| `TWITTER_CLIENT_ID` | ID client de l'application Twitter/X |
| `TWITTER_CLIENT_SECRET` | Secret client de l'application Twitter/X |

Créez une application sur le [Portail développeur Twitter](https://developer.twitter.com/). Définissez l'URL de callback sur `{APP_URL}/api/auth/callback/twitter`.

### Microsoft

| Variable | Description |
|----------|-------------|
| `MICROSOFT_CLIENT_ID` | ID client de l'application Microsoft Azure |
| `MICROSOFT_CLIENT_SECRET` | Secret client Microsoft Azure |

Enregistrez une application dans [Microsoft Azure](https://portal.azure.com/). Ajoutez `{APP_URL}/api/auth/callback/microsoft-entra-id` comme URI de redirection.

## Mode identifiants (e-mail/mot de passe)

Activé par défaut lorsqu'aucun OAuth n'est configuré. Pour activer l'authentification par identifiants :

```bash
# Dans apps/web/.content/config.yml
auth:
  credentials: true
```

## Comportement de repli

Si aucune variable d'environnement OAuth n'est définie, le système active automatiquement le mode identifiants uniquement. Cela garantit que l'application fonctionne toujours, même sans configuration OAuth.

## Détection dynamique des fournisseurs

```typescript
// La détection automatique permet uniquement les fournisseurs avec des identifiants valides
const providers = configureOAuthProviders();
// -> Retourne uniquement les fournisseurs avec CLIENT_ID et CLIENT_SECRET définis
```
