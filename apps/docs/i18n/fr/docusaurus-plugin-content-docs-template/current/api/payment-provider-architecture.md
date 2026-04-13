---
id: payment-provider-architecture
title: "Architecture des Fournisseurs de Paiement"
sidebar_label: "Architecture Fournisseurs"
sidebar_position: 8
---

# Architecture des Fournisseurs de Paiement

Cette page explique comment la fabrique de fournisseurs de paiement et la couche de service fonctionnent, comment basculer entre les fournisseurs, et les interfaces indépendantes du fournisseur qui unifient les quatre intégrations de paiement.

## Aperçu

Le template implémente une architecture de paiement indépendante du fournisseur en utilisant le patron Stratégie. Une fabrique crée des instances de fournisseur, une couche de service expose une API unifiée, et chaque fournisseur implémente une interface commune. Cette conception permet à l'application de prendre en charge Stripe, LemonSqueezy, Polar et Solidgate à travers un ensemble unique d'interfaces.

## Diagramme d'Architecture

```
Application Code
      |
      v
PaymentService (unified API)
      |
      v
PaymentProviderFactory.createProvider()
      |
      +---> StripeProvider
      +---> LemonSqueezyProvider
      +---> PolarProvider
      +---> SolidgateProvider
```

## Fournisseurs Pris en Charge

| Fournisseur | ID de Type | Fonctionnalités |
|-------------|-----------|-----------------|
| Stripe | `stripe` | Paiement complet, abonnements, méthodes de paiement, setup intents, remboursements |
| LemonSqueezy | `lemonsqueezy` | Paiement hébergé, abonnements, tarification par variante |
| Polar | `polar` | Paiement, abonnements, produits limités à l'organisation |
| Solidgate | `solidgate` | Paiements par API, SDK intégrable, abonnements, remboursements |

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## L'Interface du Fournisseur

Tous les fournisseurs implémentent `PaymentProviderInterface` :

```typescript
interface PaymentProviderInterface {
  // Gestion des clients
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;

  // Opérations de paiement
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Gestion des abonnements
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;

  // Webhooks
  handleWebhook(payload: any, signature: string, rawBody?: string,
    timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Remboursements
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Configuration client
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

## La Fabrique

`PaymentProviderFactory` crée des instances de fournisseur en fonction d'un identifiant de chaîne :

```typescript
export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':
        return new StripeProvider(config);
      case 'solidgate':
        return new SolidgateProvider(config);
      case 'lemonsqueezy':
        return new LemonSqueezyProvider(config as unknown as LemonSqueezyConfig);
      case 'polar':
        return new PolarProvider(config as unknown as PolarConfig);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## La Couche de Service

`PaymentService` encapsule une instance de fournisseur et expose l'API unifiée :

```typescript
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  // Délègue tous les appels au fournisseur sous-jacent
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }

  // ... toutes les autres méthodes délèguent à this.provider
}
```

### Exemple d'Utilisation

```typescript
const paymentService = new PaymentService({
  provider: 'stripe',
  config: {
    apiKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    options: {
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    }
  }
});

// Même API quel que soit le fournisseur
const intent = await paymentService.createPaymentIntent({
  amount: 29.99,
  currency: 'usd',
  customerId: 'cus_123'
});
```

## Gestion des Singletons de Fournisseur

Le template utilise des patrons singleton pour les instances de fournisseur, gérés via `@/lib/auth` :

```typescript
import { getOrCreateStripeProvider } from '@/lib/auth';
import { getOrCreateLemonsqueezyProvider } from '@/lib/auth';
import { getOrCreatePolarProvider } from '@/lib/auth';
import { getOrCreateSolidgateProvider } from '@/lib/auth';
```

Ces fonctions garantissent qu'une seule instance de fournisseur existe par runtime, évitant la réinitialisation inutile du client API.

## Définitions de Types Clés

### PaymentProviderConfig

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  secretKey?: string;
  webhookSecret?: string;
  options?: {
    publishableKey?: string;
    storeId?: string;
    organizationId?: string;
    merchantId?: string;
    apiBaseUrl?: string;
    testMode?: boolean;
    appUrl?: string;
  };
}
```

### PaymentIntent

```typescript
interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
  customerId?: string;
}
```

### SubscriptionInfo

```typescript
interface SubscriptionInfo {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd: boolean;
  cancelAt?: number | null;
  trialEnd?: number | null;
  priceId: string;
  paymentIntentId?: string;
  checkoutData?: any;
}
```

### SubscriptionStatus

```typescript
enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid'
}
```

### WebhookResult

```typescript
interface WebhookResult {
  received: boolean;
  type: string;
  id: string;
  data: any;
}
```

### WebhookEventType

```typescript
enum WebhookEventType {
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  BILLING_PORTAL_SESSION_UPDATED = 'billing_portal_session_updated',
  REFUND_SUCCEEDED = 'refund_succeeded'
}
```

## Comment Changer de Fournisseur

### Étape 1 : Configurer les Variables d'Environnement

Chaque fournisseur nécessite son propre ensemble de variables d'environnement. Configurez uniquement les variables pour le fournisseur choisi.

### Étape 2 : Mettre à Jour l'Initialisation du Fournisseur

Changez la fonction `getOrCreate*Provider` utilisée dans vos gestionnaires de routes, ou configurez `PaymentService` avec une chaîne de fournisseur différente :

```typescript
// Avant (Stripe)
const paymentService = new PaymentService({
  provider: 'stripe',
  config: { apiKey: process.env.STRIPE_SECRET_KEY!, ... }
});

// Après (Polar)
const paymentService = new PaymentService({
  provider: 'polar',
  config: { apiKey: process.env.POLAR_ACCESS_TOKEN!, ... }
});
```

### Étape 3 : Mettre à Jour les Routes Webhook

Chaque fournisseur possède sa propre route webhook (`/api/stripe/webhook`, `/api/lemonsqueezy/webhook`, etc.). Assurez-vous que seul le webhook du fournisseur actif est enregistré.

### Étape 4 : Gérer les Fonctionnalités Spécifiques au Fournisseur

Certaines fonctionnalités sont propres à chaque fournisseur :
- **Setup intents** : Uniquement Stripe et Solidgate (simulé)
- **Formulaires de paiement intégrés** : Stripe et Solidgate via React SDK
- **Tarification par variante** : LemonSqueezy uniquement
- **Produits limités à l'organisation** : Polar uniquement
- **API de remboursement directe** : Stripe et Solidgate uniquement

## Patron de Résolution des Clients

Les quatre fournisseurs suivent le même patron de résolution des clients en trois étapes :

```
1. Vérifier les métadonnées utilisateur (ex. user.user_metadata.stripe_customer_id)
   |
   v (introuvable)
2. Interroger la table de base de données PaymentAccount
   |
   v (introuvable)
3. Créer un nouveau client via l'API du fournisseur
   -> Synchroniser vers la table PaymentAccount
   -> Retourner le nouvel ID client
```

Ce patron est implémenté de manière identique dans la méthode `getCustomerId()` de chaque fournisseur, assurant un comportement cohérent quel que soit le fournisseur actif.

## Normalisation des Événements Webhook

Chaque fournisseur associe ses types d'événements natifs à l'enum commun `WebhookEventType`. Cela permet au `WebhookSubscriptionService` de gérer les événements de manière générique :

| Action | Stripe | LemonSqueezy | Polar | Solidgate |
|--------|--------|-------------|-------|-----------|
| Créer abonnement | `customer.subscription.created` | `subscription_created` | `subscription.created` | `subscription.created` |
| Annuler abonnement | `customer.subscription.deleted` | `subscription_cancelled` | `subscription.canceled` | `subscription.cancelled` |
| Paiement réussi | `payment_intent.succeeded` | `order_created` | `checkout.succeeded` | `payment.succeeded` |
| Paiement échoué | `payment_intent.payment_failed` | N/A | `checkout.failed` | `payment.failed` |

## Composants UI

Chaque fournisseur expose des composants UI via `getUIComponents()` :

```typescript
interface UIComponents {
  PaymentForm: (props: PaymentFormProps) => React.ReactElement | null;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

Cela permet au frontend d'afficher le formulaire de paiement correct, les logos et les icônes de marques de cartes sans savoir quel fournisseur est actif.

## Structure des Fichiers

```
lib/payment/
  lib/
    payment-service.ts            # Classe PaymentService
    payment-provider-factory.ts   # PaymentProviderFactory
    providers/
      stripe-provider.ts          # StripeProvider
      lemonsqueezy-provider.ts    # LemonSqueezyProvider
      polar-provider.ts           # PolarProvider
      solidgate-provider.ts       # SolidgateProvider
  types/
    payment-types.ts              # Interfaces et enums partagés
  ui/
    stripe/                       # Wrapper Stripe Elements
    solidgate/                    # Wrapper Solidgate Elements
```

## Pages Associées

- [Analyse Approfondie Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Analyse Approfondie Stripe Abonnements](./stripe-subscription-deep-dive.md)
- [Analyse Approfondie Stripe Méthodes de Paiement](./stripe-payment-methods-deep-dive.md)
- [Analyse Approfondie Stripe Webhook](./stripe-webhook-deep-dive.md)
- [Analyse Approfondie LemonSqueezy](./lemonsqueezy-deep-dive.md)
- [Analyse Approfondie Polar](./polar-deep-dive.md)
- [Analyse Approfondie Solidgate](./solidgate-deep-dive.md)
