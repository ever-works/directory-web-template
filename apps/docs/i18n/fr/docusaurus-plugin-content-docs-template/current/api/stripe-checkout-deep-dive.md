---
id: stripe-checkout-deep-dive
title: "Analyse Approfondie Stripe Checkout"
sidebar_label: "Stripe Checkout"
sidebar_position: 1
---

# Analyse Approfondie Stripe Checkout

Cette page couvre l'intégralité du flux de paiement Stripe Checkout, notamment la création de session, la résolution des identifiants de prix, la gestion des devises, les URL de redirection, les flux de succès/annulation et la propagation des métadonnées.

## Aperçu

L'intégration Stripe Checkout fournit une API côté serveur qui crée des sessions Stripe Checkout pour les paiements uniques et les abonnements. Le flux authentifie l'utilisateur, résout ou crée un client Stripe, construit les éléments de ligne avec prise en charge optionnelle des périodes d'essai, et retourne une URL de paiement hébergée.

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| `POST` | `/api/stripe/checkout` | Session requise | Créer une nouvelle session de paiement |
| `GET` | `/api/stripe/checkout` | Session requise | Récupérer une session de paiement existante |

## Création d'une session de paiement (POST)

### Corps de la requête

```typescript
interface CreateCheckoutRequest {
  priceId: string;                          // Identifiant de prix Stripe (ex. "price_1234567890abcdef")
  mode?: 'one_time' | 'subscription';       // Par défaut : "one_time"
  trialPeriodDays?: number;                 // Jours d'essai (mode abonnement uniquement, défaut : 0)
  billingInterval?: 'month' | 'year';       // Intervalle de facturation (défaut : "month")
  trialAmountId?: string;                   // Identifiant de prix pour les frais d'installation d'essai
  isAuthorizedTrialAmount?: boolean;        // Si le montant d'essai est autorisé
  successUrl: string;                       // URL de redirection après succès
  cancelUrl: string;                        // URL de redirection après annulation
  metadata?: Record<string, string>;        // Métadonnées personnalisées (planId, planName, etc.)
}
```

### Exemple de requête

```bash
curl -X POST /api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "mode": "subscription",
    "trialPeriodDays": 14,
    "billingInterval": "month",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": {
      "planId": "pro_plan",
      "planName": "Pro Plan"
    }
  }'
```

### Réponse de succès (200)

```json
{
  "data": {
    "id": "cs_test_1234567890abcdef",
    "url": "https://checkout.stripe.com/pay/cs_test_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Correspondance des modes

L'API fait correspondre les modes entrants au type `Mode` attendu par Stripe :

```typescript
const stripeMode: 'payment' | 'setup' | 'subscription' =
  mode === 'one_time' ? 'payment'
    : mode === 'subscription' ? 'subscription'
    : 'setup';
```

- `one_time` correspond au mode `payment` de Stripe
- `subscription` correspond au mode `subscription` de Stripe
- Toute autre valeur correspond au mode `setup`

## Résolution du client

Avant de créer une session de paiement, l'API résout ou crée un client Stripe :

```typescript
const stripeCustomerId = await stripeProvider.getCustomerId(session.user);
```

La méthode `getCustomerId` suit une résolution en trois étapes :

1. **Vérification des métadonnées** -- Recherche `stripe_customer_id` dans les métadonnées utilisateur
2. **Consultation de la base de données** -- Interroge la table `PaymentAccount` pour un enregistrement existant
3. **Création** -- Crée un nouveau client Stripe et synchronise avec la base de données

Si la création du client échoue, le point de terminaison retourne une erreur `400`.

## Configuration de la période d'essai

Les essais nécessitent que deux conditions soient remplies :

```typescript
const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;
```

Lorsqu'un essai est activé, `trialAmountId` est requis. Cela permet de facturer des frais d'installation pendant la période d'essai. L'assistant `buildCheckoutLineItems` construit les éléments de ligne incluant à la fois le prix de l'abonnement et le montant d'essai optionnel.

Si `hasTrial` est `true` mais que `trialAmountId` est manquant, le point de terminaison retourne :

```json
{
  "error": "Invalid trial configuration",
  "message": "trialAmountId is required when trial is enabled"
}
```

## Configuration spécifique aux abonnements

Lorsque le mode est `subscription`, une configuration supplémentaire est appliquée via `applySubscriptionConfig` :

```typescript
if (stripeMode === 'subscription') {
  applySubscriptionConfig(checkoutParams, {
    userId: session.user.id || '',
    planId: metadata.planId,
    planName: metadata.planName,
    billingInterval,
    trialPeriodDays: hasTrial ? trialPeriodDays : 0
  });
}
```

Cela attache les métadonnées d'abonnement incluant `userId`, `planId`, `planName` et l'intervalle de facturation aux `subscription_data` de la session de paiement.

## Propagation des métadonnées

Les métadonnées de la requête sont fusionnées avec les données de session utilisateur :

```typescript
metadata: {
  ...metadata,
  ...session.user
}
```

Cela garantit que les informations d'identité utilisateur (ID, e-mail, nom) sont toujours attachées à la session de paiement pour la réconciliation dans les gestionnaires de webhooks.

## Récupération d'une session de paiement (GET)

### Paramètres de requête

| Paramètre | Requis | Description |
|-----------|--------|-------------|
| `session_id` | Oui | Identifiant de session Stripe Checkout |

### Exemple de requête

```bash
curl -X GET "/api/stripe/checkout?session_id=cs_test_1234567890abcdef" \
  -H "Cookie: session=..."
```

### Réponse de succès (200)

```json
{
  "session": { "...objet complet de la session Stripe Checkout..." },
  "status": "complete",
  "customer": "cus_1234567890abcdef",
  "subscription": "sub_1234567890abcdef"
}
```

La session est récupérée avec les données `line_items` et `subscription` développées :

```typescript
const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## Prise en charge multi-devises

La gestion des devises est configurée via `stripe.config.ts`. L'objet `STRIPE_CONFIG` associe les plans à des identifiants de prix spécifiques à chaque devise :

```typescript
export const STRIPE_CONFIG: Record<PlanName, PlanConfig> = {
  premium: {
    usd: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'USD', symbol: '$' },
    eur: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'EUR', symbol: '€' },
    // ... gbp, cad
  },
  standard: { /* ... */ },
  free: { productId: undefined }
};
```

Utilisez `getStripePriceConfig(plan, currency, interval)` pour résoudre l'identifiant de prix correct pour un plan, une devise et un intervalle de facturation donnés.

## Tarification dynamique

Lorsque `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true`, le point de terminaison `/api/stripe/products` récupère les produits et les prix directement depuis l'API Stripe avec un délai d'expiration du cache de 5 minutes. Les produits doivent avoir les clés de métadonnées suivantes définies dans le tableau de bord Stripe :

- `plan` -- Type de plan (`free`, `standard`, `premium`)
- `type` -- Type de produit (`subscription`, `sponsor_ad`)
- `features` -- Tableau JSON de chaînes de fonctionnalités
- `annualDiscount` -- Pourcentage de remise annuelle

## Exigences de configuration

| Variable | Requis | Description |
|----------|--------|-------------|
| `STRIPE_SECRET_KEY` | Oui | Clé API secrète Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Oui | Clé publiable Stripe |
| `STRIPE_WEBHOOK_SECRET` | Oui | Secret de signature du webhook |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | Non | Activer la tarification dynamique |
| `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD` | Conditionnel | Identifiants de prix par plan/devise |

## Gestion des erreurs

| Statut | Erreur | Cause |
|--------|--------|-------|
| 400 | `Failed to create customer` | Résolution/création du client échouée |
| 400 | `Invalid trial configuration` | Essai activé sans `trialAmountId` |
| 400 | `Session ID is required` | Requête GET sans paramètre `session_id` |
| 401 | `Unauthorized` | Aucune session authentifiée |
| 500 | `Failed to create checkout session` | Erreur API Stripe ou erreur interne |

En mode développement, les réponses d'erreur incluent un champ `details` avec la trace de la pile.

## Considérations de sécurité

- Tous les points de terminaison de paiement nécessitent une session authentifiée via `auth()`
- La clé secrète Stripe n'est jamais exposée au client
- Les métadonnées sont fusionnées côté serveur ; les clients ne peuvent pas usurper l'identité utilisateur
- Les sessions de paiement sont limitées au client Stripe de l'utilisateur authentifié
- Les messages d'erreur sont assainis via `safeErrorMessage` pour éviter les fuites d'informations en production

## Pages connexes

- [Analyse Approfondie des Abonnements Stripe](./stripe-subscription-deep-dive.md)
- [Analyse Approfondie des Webhooks Stripe](./stripe-webhook-deep-dive.md)
- [Analyse Approfondie des Méthodes de Paiement Stripe](./stripe-payment-methods-deep-dive.md)
- [Architecture du Fournisseur de Paiement](./payment-provider-architecture.md)
