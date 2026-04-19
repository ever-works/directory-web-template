---
id: stripe-subscription-deep-dive
title: "Analyse Approfondie Abonnements Stripe"
sidebar_label: "Abonnements Stripe"
sidebar_position: 2
---

# Analyse Approfondie Abonnements Stripe

Cette page couvre toutes les routes de gestion des abonnements : création, mise à jour, annulation, ainsi que les méthodes du fournisseur avec des exemples de requêtes/réponses.

## Aperçu

L'API d'abonnement fournit une gestion complète du cycle de vie des abonnements Stripe. Elle prend en charge la création d'abonnements avec des méthodes de paiement et des périodes d'essai, la mise à jour des plans ou des paramètres d'annulation, et l'annulation des abonnements soit immédiatement soit à la fin de la période de facturation.

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| `POST` | `/api/stripe/subscription` | Session requise | Créer un nouvel abonnement |
| `PUT` | `/api/stripe/subscription` | Session requise | Mettre à jour un abonnement existant |
| `DELETE` | `/api/stripe/subscription` | Session requise | Annuler un abonnement |

## Création d'un abonnement (POST)

### Corps de la requête

```typescript
interface CreateSubscriptionRequest {
  priceId: string;            // Identifiant de prix Stripe
  paymentMethodId: string;    // Identifiant de méthode de paiement Stripe
  trialPeriodDays?: number;   // Période d'essai optionnelle en jours
}
```

### Exemple de requête

```bash
curl -X POST /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "paymentMethodId": "pm_1234567890abcdef",
    "trialPeriodDays": 14
  }'
```

### Fonctionnement

Le gestionnaire de route effectue ces étapes :

1. Authentifie l'utilisateur via `auth()`
2. Résout ou crée un client Stripe via `stripeProvider.getCustomerId()`
3. Appelle `stripeProvider.createSubscription()` avec l'identifiant client, le prix, la méthode de paiement, les jours d'essai et les métadonnées

### Implémentation du fournisseur

Dans `StripeProvider.createSubscription()` :

```typescript
// Attacher la méthode de paiement au client
if (paymentMethodId) {
  await this.stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });
  // Définir comme méthode de paiement par défaut
  await this.stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

// Créer l'abonnement
const subscriptionParams: Stripe.SubscriptionCreateParams = {
  customer: customerId,
  items: [{ price: priceId }],
  default_payment_method: paymentMethodId,
  expand: ['latest_invoice'],
  metadata,
  collection_method: 'charge_automatically'
};

// Sans essai : facturer immédiatement
if (trialPeriodDays === 0) {
  subscriptionParams.off_session = true;
  subscriptionParams.payment_settings = {
    save_default_payment_method: 'on_subscription'
  };
} else {
  subscriptionParams.trial_period_days = trialPeriodDays;
}
```

### Réponse de succès (200)

```typescript
interface SubscriptionInfo {
  id: string;                    // "sub_1234567890abcdef"
  customerId: string;            // "cus_1234567890abcdef"
  status: SubscriptionStatus;    // "active" | "trialing" | etc.
  currentPeriodEnd?: number;     // Horodatage Unix
  cancelAtPeriodEnd: boolean;    // false
  cancelAt: number | null;       // null
  trialEnd: number | null;       // Horodatage Unix ou null
  priceId: string;               // "price_1234567890abcdef"
  paymentIntentId?: string;      // "pi_..." si disponible
}
```

## Mise à jour d'un abonnement (PUT)

### Corps de la requête

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;          // Requis : abonnement à mettre à jour
  priceId?: string;                // Nouvel identifiant de prix (changement de plan)
  cancelAtPeriodEnd?: boolean;     // Planifier l'annulation
}
```

### Exemple de requête

```bash
curl -X PUT /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "priceId": "price_0987654321fedcba",
    "cancelAtPeriodEnd": false
  }'
```

### Implémentation du fournisseur

La méthode `updateSubscription` gère les changements de plan en remplaçant l'élément d'abonnement :

```typescript
if (priceId) {
  const existingSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
  if (existingSubscription.items.data[0]) {
    updateParams.items = [{
      id: existingSubscription.items.data[0].id,
      price: priceId
    }];
  }
}
```

Elle prend également en charge la définition de `cancel_at_period_end`, `cancel_at` et la mise à jour des métadonnées.

### Réponse de succès (200)

Retourne la même structure `SubscriptionInfo` avec les valeurs mises à jour.

## Annulation d'un abonnement (DELETE)

### Corps de la requête

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;           // Requis : abonnement à annuler
  cancelAtPeriodEnd?: boolean;      // true = annuler à la fin de la période, false = immédiatement
}
```

### Exemple de requête

```bash
curl -X DELETE /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "cancelAtPeriodEnd": true
  }'
```

### Implémentation du fournisseur

La logique d'annulation prend en charge deux stratégies :

```typescript
if (cancelAtPeriodEnd) {
  // Annulation douce : l'abonnement reste actif jusqu'à la fin de la période
  subscription = await this.stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
} else {
  // Annulation immédiate : l'abonnement se termine immédiatement
  subscription = await this.stripe.subscriptions.cancel(subscriptionId);
}
```

### Réponse de succès (200)

```json
{
  "id": "sub_1234567890abcdef",
  "customerId": "cus_1234567890abcdef",
  "status": "active",
  "cancelAtPeriodEnd": true,
  "cancelAt": null,
  "currentPeriodEnd": 1643673600,
  "trialEnd": null,
  "priceId": "price_1234567890abcdef"
}
```

## Correspondance des statuts d'abonnement

Le fournisseur associe les statuts Stripe aux valeurs internes de l'énumération `SubscriptionStatus` :

| Statut Stripe | Statut interne |
|---------------|----------------|
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |
| `trialing` | `TRIALING` |
| `active` | `ACTIVE` |
| `past_due` | `PAST_DUE` |
| `canceled` | `CANCELED` |
| `unpaid` | `UNPAID` |

## Suivi des métadonnées

Toutes les opérations d'abonnement attachent `userId` de la session aux métadonnées de l'abonnement :

```typescript
metadata: {
  userId: session.user.id
}
```

Cela permet aux gestionnaires de webhooks de réconcilier les abonnements avec les enregistrements utilisateurs internes.

## Gestion des erreurs

| Statut | Erreur | Cause |
|--------|--------|-------|
| 400 | `Failed to create customer` | Résolution du client échouée |
| 401 | `Unauthorized` | Aucune session authentifiée |
| 500 | `Failed to create subscription` | Erreur API Stripe lors de la création |
| 500 | `Failed to update subscription` | Erreur API Stripe lors de la mise à jour |
| 500 | `Failed to cancel subscription` | Erreur API Stripe lors de l'annulation |

## Considérations de sécurité

- Tous les points de terminaison d'abonnement nécessitent une authentification
- L'attachement de la méthode de paiement et la définition par défaut sont effectués côté serveur
- L'indicateur `off_session` n'est défini que pour les abonnements sans essai afin d'activer les prélèvements automatiques
- Les métadonnées d'abonnement incluent toujours l'identifiant de l'utilisateur authentifié à des fins d'audit
- En mode développement, les mises à jour d'abonnement sont journalisées avec uniquement les champs non sensibles

## Pages connexes

- [Analyse Approfondie Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Analyse Approfondie des Webhooks Stripe](./stripe-webhook-deep-dive.md)
- [Analyse Approfondie des Méthodes de Paiement Stripe](./stripe-payment-methods-deep-dive.md)
- [Architecture du Fournisseur de Paiement](./payment-provider-architecture.md)
