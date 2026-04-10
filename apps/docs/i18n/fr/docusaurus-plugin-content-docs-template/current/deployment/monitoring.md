---
id: monitoring
title: Monitoring et analytics
sidebar_label: Monitoring
sidebar_position: 6
---

# Monitoring et analytics

Surveillez les performances, les erreurs et le comportement des utilisateurs de votre déploiement Ever Works.

## Suivi des exceptions

Ever Works fournit un suivi des exceptions flexible vous permettant de choisir entre **PostHog**, **Sentry**, ou **les deux** pour la surveillance des erreurs.

### Options de configuration

| Mode | Description |
|------|-------------|
| `posthog` | Suivi léger des exceptions intégré à vos analytics |
| `sentry` | Monitoring complet des erreurs et des performances |
| `both` | Utiliser les deux services simultanément |
| `none` | Désactiver le suivi des exceptions |

### Variables d'environnement

```bash
# Configuration du suivi des exceptions
EXCEPTION_TRACKING_PROVIDER=both  # Options : "sentry", "posthog", "both", "none"

POSTHOG_EXCEPTION_TRACKING=true
SENTRY_EXCEPTION_TRACKING=true

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=votre-cle-posthog
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
POSTHOG_DEBUG=false
POSTHOG_SESSION_RECORDING_ENABLED=true

# Sentry
NEXT_PUBLIC_SENTRY_DSN=votre-dsn-sentry
SENTRY_ORG=votre-organisation
SENTRY_PROJECT=votre-projet
SENTRY_ENABLE_DEV=false
```

## Vercel Analytics

Si vous déployez sur Vercel, activez Vercel Analytics depuis le tableau de bord du projet :

```bash
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=votre-id-analytics
```

## Dashboard de monitoring recommandé

| Outil | Usage | Lien |
|-------|-------|------|
| **Sentry** | Suivi des erreurs, alertes | [sentry.io](https://sentry.io) |
| **PostHog** | Analytics produit, enregistrements de session | [posthog.com](https://posthog.com) |
| **Vercel Analytics** | Core Web Vitals, performance | [vercel.com/analytics](https://vercel.com/analytics) |

## Alertes

Configurez des alertes Sentry pour être notifié lorsque de nouvelles erreurs apparaissent en production :

1. Dans Sentry, allez dans **Alerts** → **Create Alert**
2. Sélectionnez **Issues** comme type d'alerte
3. Définissez les conditions (ex. première occurrence d'une nouvelle erreur)
4. Configurez les canaux de notification (email, Slack, PagerDuty)
