---
id: sentry-logs
title: Configuration des logs Sentry
sidebar_label: Logs Sentry
sidebar_position: 7
---

# Configuration des logs Sentry

Ce document explique comment configurer et utiliser Sentry Logs dans le dépôt Template et le dépôt Ever Works.

## Vue d'ensemble

Sentry Logs fournit une gestion centralisée des journaux, vous permettant de capturer, transférer et analyser les journaux d'application dans l'Explorateur de logs de Sentry. Tous les journaux sont automatiquement transférés vers Sentry lorsqu'ils sont activés, offrant une vue unifiée du comportement de l'application dans différents environnements.

## Fonctionnalités

- Transfert automatique des journaux vers Sentry
- Prise en charge de tous les niveaux de journaux (debug, info, warn, error)
- Journalisation contextuelle avec balisage automatique
- Configuration spécifique à l'environnement
- Journalisation structurée avec prise en charge des métadonnées
- Intégration avec l'utilitaire de journalisation existant

## Configuration

### Variables d'environnement

Ajoutez ces variables à votre fichier `.env.local` pour le développement local :

```env
# Configuration Sentry (Requise pour les Logs)
NEXT_PUBLIC_SENTRY_DSN=https://votre-dsn@sentry.io/votre-project-id
SENTRY_ORG=votre-nom-organisation
SENTRY_PROJECT=votre-nom-projet
SENTRY_AUTH_TOKEN=votre-auth-token

# Activer Sentry en développement (optionnel, par défaut uniquement en production)
SENTRY_ENABLE_DEV=true

# Mode débogage Sentry (optionnel)
SENTRY_DEBUG=false

# Configuration des Logs Sentry
SENTRY_LOGS_ENABLED=true  # Activer/désactiver les Logs Sentry (défaut : true)
SENTRY_LOGS_LEVEL=info    # Niveau de log minimum à capturer (défaut : info)
```

### Configuration par environnement

#### Développement local

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=debug  # Capturer tous les journaux en développement
```

#### Développement / Staging

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=info
```

#### Production

```env
# SENTRY_ENABLE_DEV n'est pas défini (Sentry activé automatiquement)
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=warn  # Capturer uniquement les avertissements et les erreurs
```

## Utilisation

### Journalisation de base

```typescript
import { logger } from '@/lib/logger';

// Niveaux de journalisation disponibles
logger.debug('Message de débogage', { context: 'valeur' });
logger.info('Opération réussie', { userId: '123' });
logger.warn('Avertissement', { details: '...' });
logger.error('Une erreur est survenue', { error: err });
```

### Journalisation avec contexte

```typescript
// Ajouter du contexte à tous les journaux
logger.info('Synchronisation du contenu démarrée', {
  repository: process.env.DATA_REPOSITORY,
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV,
});
```

## Intégration avec les Cron Jobs

Les tâches cron utilisent automatiquement le logger avec un contexte riche :

```typescript
// Dans /api/cron/sync
logger.info('[Cron] Démarrage de la synchronisation du dépôt');
// ...
logger.info('[Cron] Synchronisation terminée', { duration: `${ms}ms` });
```

## Vérification dans Sentry

1. Rendez-vous sur [sentry.io](https://sentry.io)
2. Sélectionnez votre projet
3. Naviguez vers **Explore > Logs**
4. Filtrez par niveau, timestamp ou attributs personnalisés

## Résolution des problèmes

| Symptôme | Solution |
|---------|----------|
| Aucun journal dans Sentry | Vérifier que `SENTRY_LOGS_ENABLED=true` et que `NEXT_PUBLIC_SENTRY_DSN` est défini |
| Journaux absents en développement | Définir `SENTRY_ENABLE_DEV=true` |
| Trop de journaux | Augmenter le niveau avec `SENTRY_LOGS_LEVEL=warn` |
| Erreur d'authentification | Vérifier `SENTRY_AUTH_TOKEN` dans les paramètres de l'organisation |
