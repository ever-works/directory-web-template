---
id: sentry-config
title: Configuration du suivi des erreurs Sentry
sidebar_label: Config Sentry
sidebar_position: 10
---

# Configuration du suivi des erreurs Sentry

Cette page documente l'intégration Sentry pour le suivi des erreurs, la surveillance des performances et le replay de session dans le template.

## Vue d'ensemble

Le template utilise le SDK `@sentry/nextjs` pour capturer les erreurs et les données de performance côté serveur et client. Sentry est entièrement optionnel — si aucun DSN n'est configuré, toute l'initialisation Sentry est ignorée.

## Configuration du plugin webpack

Le fichier `sentry.config.ts` à la racine du projet configure le plugin webpack Sentry utilisé lors de la construction :

```ts
export const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || "votre-organisation",
  project: process.env.SENTRY_PROJECT || "votre-projet",

  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
};
```

### Options du plugin

| Option | Défaut | Description |
|--------|--------|-------------|
| `silent` | `true` | Supprime la sortie console du plugin webpack |
| `org` | Variable `SENTRY_ORG` | Slug de votre organisation Sentry |
| `project` | Variable `SENTRY_PROJECT` | Slug de votre projet Sentry |
| `tunnelRoute` | `"/monitoring"` | Proxifie les requêtes Sentry via votre app pour éviter les bloqueurs de publicités |
| `hideSourceMaps` | `true` | Empêche les source maps d'être accessibles publiquement en production |
| `disableLogger` | `true` | Désactive le logger Sentry pour réduire la taille du bundle |

## Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Non | DSN Sentry. Si non défini, Sentry est désactivé. |
| `SENTRY_ORG` | Non | Slug d'organisation pour les téléchargements de source maps |
| `SENTRY_PROJECT` | Non | Slug de projet pour les téléchargements de source maps |
| `SENTRY_AUTH_TOKEN` | Non | Token d'authentification pour télécharger les source maps lors des constructions |
| `SENTRY_ENABLE_DEV` | Non | Définir à `true` pour activer Sentry en développement |
| `SENTRY_DEBUG` | Non | Définir à `true` pour activer la journalisation debug Sentry |

## Configuration

Sentry est activé automatiquement en production lorsque le DSN est défini :

```env
NEXT_PUBLIC_SENTRY_DSN=https://clePubExample@o0.ingest.sentry.io/0
```

Pour activer en développement :

```env
NEXT_PUBLIC_SENTRY_DSN=https://clePubExample@o0.ingest.sentry.io/0
SENTRY_ENABLE_DEV=true
```
