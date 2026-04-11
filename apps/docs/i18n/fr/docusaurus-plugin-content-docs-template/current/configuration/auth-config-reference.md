---
id: auth-config-reference
title: Référence de configuration Auth.js
sidebar_label: Référence config Auth
sidebar_position: 11
---

# Référence de configuration Auth.js

Cette page documente la configuration NextAuth (Auth.js) définie dans `auth.config.ts`. Ce fichier configure les fournisseurs d'authentification, la stratégie de session et la gestion des erreurs pour le template.

## Vue d'ensemble

Le template prend en charge plusieurs stratégies d'authentification via une configuration unifiée :

- **NextAuth (Auth.js)** — Authentification basée sur OAuth et les identifiants
- **Supabase Auth** — Authentification native Supabase
- **Les deux** — Mode double fournisseur pour une flexibilité maximale

Le fichier `auth.config.ts` configure spécifiquement le côté NextAuth de ce système.

## Fichier de configuration

Le `auth.config.ts` racine exporte un objet `NextAuthConfig` :

```ts
import { NextAuthConfig } from "next-auth";
import { createNextAuthProviders } from "./lib/auth/providers";

const configureProviders = () => {
  // Essaie de configurer les fournisseurs OAuth
  // Se replie sur identifiants uniquement en cas d'échec
  return createNextAuthProviders({
    google: { enabled: Boolean(process.env.GOOGLE_CLIENT_ID) },
    github: { enabled: Boolean(process.env.GITHUB_CLIENT_ID) },
    facebook: { enabled: Boolean(process.env.FB_CLIENT_ID) },
    twitter: { enabled: Boolean(process.env.X_CLIENT_ID) },
    credentials: { enabled: true },
  });
};

export default {
  trustHost: true,
  providers: configureProviders(),
  // ...
} satisfies NextAuthConfig;
```

## Fournisseurs OAuth supportés

| Fournisseur | Variable ID client | Variable secret client |
|-------------|-------------------|------------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |

Les fournisseurs s'activent automatiquement lorsque l'ID client et le secret sont définis.

## Variables de configuration

| Variable | Requis | Description |
|----------|--------|-------------|
| `AUTH_SECRET` | **Oui** | Secret de chiffrement NextAuth |
| `COOKIE_SECRET` | **Oui** | Secret de chiffrement des cookies |
| `COOKIE_DOMAIN` | Non | Domaine des cookies |
| `COOKIE_SECURE` | Non | Drapeau de cookie sécurisé (vrai en prod) |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Non | TTL du token d'accès (défaut : `15m`) |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Non | TTL du token de rafraîchissement (défaut : `7d`) |
