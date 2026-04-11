---
id: provider-config
title: Configuration des fournisseurs
sidebar_label: Config fournisseurs
sidebar_position: 4
---

# Configuration des fournisseurs

Le template utilise un singleton `ConfigService` centralisé pour gérer tous les fournisseurs de services externes. Chaque fournisseur est configuré via des schémas validés par Zod avec détection automatique des fonctionnalités — les fournisseurs sont activés lorsque leurs identifiants requis sont présents.

## Architecture ConfigService

Le `ConfigService` dans `lib/config/config-service.ts` est un singleton côté serveur uniquement :

```ts
import { configService } from '@/lib/config';

const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

Le service est organisé en six sections :

| Section | Accesseur | Fichier de schéma |
|---------|-----------|-------------------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Paiement | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Intégrations | `configService.integrations` | `schemas/integrations.schema.ts` |

## Fournisseurs OAuth

Définis dans `lib/config/schemas/auth.schema.ts`. Les fournisseurs OAuth détectent automatiquement l'activation :

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

| Fournisseur | Variable ID client | Variable secret client |
|-------------|-------------------|------------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

## Backend Supabase Auth

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase |

## Fournisseurs email

| Fournisseur | Variables | Activation |
|-------------|-----------|-----------|
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Quand l'hôte et le port sont définis |
| Resend | `RESEND_API_KEY` | Quand la clé API est définie |
| Novu | `NOVU_API_KEY`, `NOVU_SUBSCRIBER_ID` | Quand les deux sont définis |

## Imports tree-shakeable

Des sections individuelles peuvent être importées directement pour un meilleur tree-shaking :

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```
