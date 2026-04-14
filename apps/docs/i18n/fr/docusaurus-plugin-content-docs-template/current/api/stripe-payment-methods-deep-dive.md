---
id: stripe-payment-methods-deep-dive
title: "Analyse Approfondie Méthodes de Paiement Stripe"
sidebar_label: "Méthodes de Paiement Stripe"
sidebar_position: 3
---

# Analyse Approfondie Méthodes de Paiement Stripe

Cette page couvre la liste des méthodes de paiement, les intents de configuration pour sauvegarder des cartes, la gestion des méthodes par défaut et la validation des cartes.

## Aperçu

Le système de méthodes de paiement offre deux fonctionnalités clés : lister les méthodes de paiement sauvegardées d'un utilisateur avec leur statut par défaut, et créer des intents de configuration permettant aux utilisateurs de sauvegarder de nouvelles méthodes de paiement pour un usage futur sans prélèvement immédiat.

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| `GET` | `/api/stripe/payment-methods/list` | Session requise | Lister toutes les méthodes de paiement de l'utilisateur |
| `POST` | `/api/stripe/setup-intent` | Session requise | Créer un intent de configuration pour sauvegarder une nouvelle méthode de paiement |

## Lister les méthodes de paiement (GET)

### Fonctionnement

Le point de terminaison de liste effectue ces étapes :

1. Authentifie l'utilisateur via `auth()`
2. Résout l'identifiant client Stripe de l'utilisateur via `getUserStripeCustomerId()`
3. Récupère le client pour déterminer la méthode de paiement par défaut
4. Liste toutes les méthodes de paiement de type `card` (jusqu'à 100)
5. Formate et trie les résultats (la méthode par défaut en premier, puis par date de création)

### Implémentation clé

```typescript
// Récupérer le client pour la détection de la méthode de paiement par défaut
const customer = await stripe.customers.retrieve(stripeCustomerId);
const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

// Lister toutes les méthodes de paiement de type carte
const paymentMethods = await stripe.paymentMethods.list({
  customer: stripeCustomerId,
  type: 'card',
  limit: 100
});

// Formater avec le statut par défaut
const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
  id: pm.id,
  type: pm.type,
  card: pm.card ? {
    brand: pm.card.brand,
    last4: pm.card.last4,
    funding: pm.card.funding,
    country: pm.card.country
  } : null,
  billing_details: pm.billing_details,
  created: pm.created,
  metadata: pm.metadata,
  is_default: pm.id === defaultPaymentMethodId
}));

// Trier : par défaut en premier, puis par plus récent
formattedPaymentMethods.sort((a, b) => {
  if (a.is_default && !b.is_default) return -1;
  if (!a.is_default && b.is_default) return 1;
  return b.created - a.created;
});
```

### Réponse de succès (200)

```typescript
interface PaymentMethodListResponse {
  success: boolean;
  data: PaymentMethodItem[];
  meta: {
    total: number;
    default_payment_method: string | null;
    customer_id: string;
  };
  message?: string;  // Présent quand aucune méthode de paiement n'est trouvée
}

interface PaymentMethodItem {
  id: string;                    // "pm_1234567890abcdef"
  type: string;                  // "card"
  card: {
    brand: string;               // "visa", "mastercard", "amex", "discover"
    last4: string;               // "4242"
    funding: string;             // "credit", "debit", "prepaid", "unknown"
    country: string;             // "US"
  } | null;
  billing_details: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: {
      line1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
  };
  created: number;               // Horodatage Unix
  metadata: Record<string, string>;
  is_default: boolean;
}
```

### Exemple : Utilisateur avec des méthodes de paiement

```json
{
  "success": true,
  "data": [
    {
      "id": "pm_1234567890abcdef",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "funding": "credit",
        "country": "US"
      },
      "billing_details": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": null,
        "address": null
      },
      "created": 1640995200,
      "metadata": {},
      "is_default": true
    }
  ],
  "meta": {
    "total": 1,
    "default_payment_method": "pm_1234567890abcdef",
    "customer_id": "cus_1234567890abcdef"
  }
}
```

### Exemple : Aucune méthode de paiement

```json
{
  "success": true,
  "data": [],
  "message": "No payment methods found"
}
```

## Création d'un intent de configuration (POST)

Les intents de configuration permettent aux utilisateurs de sauvegarder une méthode de paiement pour un usage futur sans être prélevés immédiatement. Cela est utilisé lorsqu'un utilisateur souhaite ajouter une carte avant de s'abonner, ou gérer plusieurs méthodes de paiement.

### Fonctionnement

```typescript
async createSetupIntent(user: User | null): Promise<SetupIntent> {
  const customerId = user?.user_metadata?.customerId;
  const setupIntent = await this.stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card']
  });

  return { ...setupIntent, clientSecret: setupIntent.client_secret! };
}
```

### Réponse de succès (200)

```typescript
interface SetupIntentResponse {
  id: string;                    // "seti_1234567890abcdef"
  client_secret: string;         // "seti_1234567890abcdef_secret_xyz"
  status: string;                // "requires_payment_method"
  usage: string;                 // "off_session"
  customer: string;              // "cus_1234567890abcdef"
  created: number;               // Horodatage Unix
}
```

### Utilisation côté client

Du côté client, le `client_secret` est utilisé pour confirmer l'intent de configuration avec Stripe.js :

```typescript
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});
```

## Gestion de la méthode de paiement par défaut

La méthode de paiement par défaut est déterminée à partir du `invoice_settings.default_payment_method` du client Stripe. Lors de la création d'un abonnement, la méthode de paiement est automatiquement définie comme méthode par défaut :

```typescript
// Lors de la création d'un abonnement
await this.stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId
  }
});
```

L'indicateur `is_default` dans la réponse de liste des méthodes de paiement permet au frontend d'afficher le badge de carte par défaut.

## Gestion des erreurs

| Statut | Erreur | Cause |
|--------|--------|-------|
| 401 | `Unauthorized` | Aucune session authentifiée |
| 404 | `Customer not found` | Le client Stripe a été supprimé |
| 400 | Erreur Stripe | Requête invalide à l'API Stripe |
| 500 | `Failed to list payment methods` | Erreur interne |
| 500 | `Failed to create setup intent` | Échec de la création de l'intent de configuration |

Les erreurs spécifiques à Stripe sont détectées et traitées :

```typescript
if (error instanceof Stripe.errors.StripeError) {
  const msg = safeErrorMessage(error, 'Stripe request failed');
  return NextResponse.json({ success: false, error: msg }, { status: 400 });
}
```

## Considérations de sécurité

- Tous les points de terminaison nécessitent des sessions authentifiées
- Le point de terminaison de liste retourne uniquement les méthodes de paiement appartenant au client Stripe de l'utilisateur authentifié
- Les numéros de carte ne sont jamais stockés ni retournés -- seuls les 4 derniers chiffres et la marque sont exposés
- Le `client_secret` des intents de configuration ne doit être transmis qu'au SDK frontend Stripe.js
- Les identifiants client sont résolus côté serveur et ne peuvent pas être remplacés par des requêtes client

## Exigences de configuration

| Variable | Requis | Description |
|----------|--------|-------------|
| `STRIPE_SECRET_KEY` | Oui | Clé API secrète Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Oui | Pour l'initialisation de Stripe.js côté client |

## Pages connexes

- [Analyse Approfondie Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Analyse Approfondie des Abonnements Stripe](./stripe-subscription-deep-dive.md)
- [Analyse Approfondie des Webhooks Stripe](./stripe-webhook-deep-dive.md)
- [Architecture du Fournisseur de Paiement](./payment-provider-architecture.md)
