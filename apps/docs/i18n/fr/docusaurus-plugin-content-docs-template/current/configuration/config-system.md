---
id: config-system
title: Système de configuration
sidebar_label: Système de config
sidebar_position: 0
---

# Système de configuration

Le template Ever Works utilise un système de configuration centralisé et typé, construit sur des schémas de validation Zod. Toutes les variables d'environnement sont validées au démarrage de l'application, fournissant un retour immédiat sur les configurations manquantes ou invalides. Le système prend en charge les secrets uniquement serveur et les variables publiques sûres côté client.

## Architecture

```
lib/config/
  config-service.ts        # Singleton ConfigService centralisé
  client.ts                # Configuration côté client (NEXT_PUBLIC_*)
  env.ts                   # Schéma env hérité (config API)
  server-config.ts         # Helpers serveur dépréciés (utiliser ConfigService)
  feature-flags.ts         # Drapeaux de disponibilité des fonctionnalités
  index.ts                 # Export barrel
  types.ts                 # Définitions de types TypeScript
  schemas/
    index.ts               # Export barrel des schémas
    core.schema.ts         # URLs, infos site, base de données, contenu
    auth.schema.ts         # Secrets auth, fournisseurs OAuth, JWT, cookies
    email.schema.ts        # SMTP, Resend, configuration Novu
    payment.schema.ts      # Stripe, LemonSqueezy, Polar, tarification
    analytics.schema.ts    # PostHog, Sentry, Vercel Analytics, Recaptcha
    integrations.schema.ts # Trigger.dev, Twenty CRM, Cron
  billing/
    index.ts               # Export barrel facturation
    stripe.config.ts       # Configuration spécifique Stripe
    lemonsqueezy.config.ts # Configuration LemonSqueezy
    polar.config.ts        # Configuration Polar
    solidgate.config.ts    # Configuration Solidgate
    types.ts               # Types facturation
  utils/
    env-parser.ts          # Utilitaires de parsing des variables d'environnement
    validation-logger.ts   # Formatage et journalisation des résultats de validation
```

## Singleton ConfigService

Le cœur du système de configuration est la classe `ConfigService` dans `lib/config/config-service.ts`. Elle :

1. Collecte toutes les variables d'environnement via des fonctions de collecte
2. Les valide contre un schéma Zod combiné
3. Stocke la configuration validée en tant que singleton
4. Fournit des getters typés pour chaque section de configuration

```typescript
import { configService } from '@/lib/config';

// Accéder à des sections spécifiques
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### Exports de section

Pour le tree-shaking et la commodité, des sections individuelles sont également exportées :

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// Accès direct sans préfixe ConfigService
const dbUrl = coreConfig.DATABASE_URL;
```

### Application serveur uniquement

Le module `ConfigService` importe `'server-only'`, ce qui signifie :

- Il ne peut être utilisé que dans les Composants Serveur, les routes API et le code côté serveur
- Tenter de l'importer dans un Composant Client produira une erreur de construction
- Cela empêche l'exposition accidentelle de secrets comme les clés API

## Configuration client (`lib/config/client.ts`)

La configuration sûre côté client se trouve dans un module séparé qui ne lit que les variables `NEXT_PUBLIC_*` :

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// Image de marque du site
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // Liens réseaux sociaux
siteConfig.attribution // Attribution "Construit avec"

// Tarification
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// Environnement
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

Ce module peut être importé dans n'importe quel composant, y compris le code côté client.
