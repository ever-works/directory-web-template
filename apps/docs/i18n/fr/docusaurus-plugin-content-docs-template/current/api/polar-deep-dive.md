---
id: polar-deep-dive
title: "Analyse Approfondie Polar"
sidebar_label: "Polar"
sidebar_position: 6
---

# Analyse Approfondie Polar

Cette page couvre l'intégration complète de Polar, notamment la création de sessions de paiement, la gestion des abonnements, le portail client et le traitement des webhooks.

## Aperçu

Polar est une plateforme de paiement moderne conçue pour les logiciels et les produits numériques. L'intégration prend en charge les paiements uniques et les abonnements via le système de paiement de Polar, avec une gestion du cycle de vie pilotée par les webhooks. Polar utilise des produits limités à l'organisation et le SDK `@polar-sh/sdk` pour les interactions API.

## Résumé des Routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| `POST` | `/api/polar/checkout` | Session requise | Créer une session de paiement (abonnement ou paiement unique) |
| `GET` | `/api/polar/checkout` | Session requise | Récupérer le statut d'une session de paiement |
| `POST` | `/api/polar/webhook` | Signature requise | Traiter les événements webhook entrants |

## Création de Paiement (POST)

### Corps de la Requête

```typescript
interface PolarCheckoutRequest {
  productId: string;                        // ID du produit Polar
  mode?: 'one_time' | 'subscription';       // Par défaut : "subscription"
  successUrl: string;                       // URL de redirection après succès
  cancelUrl: string;                        // URL de redirection après annulation
  metadata?: {
    planId?: string;
    planName?: string;
    billingInterval?: string;
    [key: string]: any;
  };
}
```

### Exemple de Requête

```bash
curl -X POST /api/polar/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "productId": "prod_1234567890abcdef",
    "mode": "subscription",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### Fonctionnement

La route de paiement gère deux flux :

**Mode Abonnement :**
1. Authentifie l'utilisateur et résout le client Polar
2. Assainit les métadonnées (supprime les valeurs `undefined` — Polar les rejette)
3. Appelle `polarProvider.createSubscription()` qui crée une session de paiement
4. Retourne l'URL de paiement depuis le résultat de l'abonnement

**Mode Paiement Unique :**
1. Authentifie l'utilisateur et résout le client Polar
2. Utilise directement le SDK Polar pour créer un paiement
3. Retourne l'URL de paiement

### Assainissement des Métadonnées

Polar exige que toutes les valeurs de métadonnées ne soient ni null ni undefined :

```typescript
const sanitizedMetadata: Record<string, any> = {
  userId: session.user.id || ''
};
if (metadata.planId) sanitizedMetadata.planId = metadata.planId;
if (metadata.planName) sanitizedMetadata.planName = metadata.planName;
// N'inclure que les valeurs définies
Object.entries(metadata).forEach(([key, value]) => {
  if (value !== undefined && value !== null) {
    sanitizedMetadata[key] = value;
  }
});
```

### Réponse de Succès (200)

```json
{
  "data": {
    "id": "checkout_1234567890abcdef",
    "url": "https://polar.sh/checkout/checkout_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Récupération d'une Session de Paiement (GET)

### Paramètres de Requête

| Paramètre | Requis | Description |
|-----------|--------|-------------|
| `checkout_id` | Oui | ID de la session de paiement Polar |

### Réponse de Succès (200)

```json
{
  "checkout": { "...objet checkout Polar complet..." },
  "status": "complete",
  "customer": "customer_1234567890abcdef",
  "subscription": "subscription_1234567890abcdef"
}
```

## Gestion des Abonnements

### Création d'Abonnements

La méthode `PolarProvider.createSubscription()` crée un paiement pour l'abonnement :

```typescript
const checkout = await this.polar.checkouts.create({
  products: [priceId],
  organizationId: this.organizationId,
  customerId: customerId,
  successUrl: metadata?.successUrl,
  metadata: sanitizedMetadata
});
```

### Annulation d'Abonnements

Polar prend en charge deux stratégies d'annulation :

```typescript
// Annuler en fin de période (annulation douce)
await cancelSubscriptionAtPeriodEnd({ polar, subscriptionId });

// Annuler immédiatement (annulation immédiate)
await cancelSubscriptionImmediately({ polar, subscriptionId });
```

Le fournisseur valide l'état de l'abonnement avant l'annulation :

```typescript
const validateResult = validateSubscriptionId(subscriptionId);
if (!validateResult.isValid) {
  throw new PolarFatalError(validateResult.error);
}
```

### Réactivation des Abonnements

Les abonnements planifiés pour annulation peuvent être réactivés :

```typescript
if (isScheduledForCancellation(subscription)) {
  const result = await reactivatePolarSubscription({
    polar, subscriptionId, subscription
  });
}
```

### Mise à Jour des Abonnements

Les changements de plan sont gérés via `polar.subscriptions.update()` :

```typescript
const updated = await this.polar.subscriptions.update({
  id: subscriptionId,
  productId: newProductId
});
```

## Traitement des Webhooks

### Vérification de Signature

Polar utilise la fonction `validateEvent` du SDK `@polar-sh/sdk/webhooks` pour la vérification. Le webhook nécessite trois en-têtes :

| En-tête | Description |
|---------|-------------|
| `webhook-signature` | Signature HMAC SHA256 (format : `v1,<hex_signature>`) |
| `webhook-timestamp` | Horodatage Unix de l'événement |
| `webhook-id` | ID unique de livraison du webhook |

```typescript
const webhookResult = await polarProvider.handleWebhook(
  body,           // JSON parsé
  signatureHeader, // Signature complète "v1,..."
  bodyText,        // Corps brut pour la vérification
  timestampHeader,
  webhookIdHeader
);
```

### Types d'Événements

| Événement Polar | Correspondance Interne |
|-----------------|----------------------|
| `checkout.succeeded` | Paiement réussi |
| `checkout.failed` | Paiement échoué |
| `subscription.created` | Abonnement créé |
| `subscription.updated` | Abonnement mis à jour |
| `subscription.canceled` | Abonnement annulé |
| `invoice.paid` | Paiement d'abonnement réussi |
| `invoice.payment_failed` | Paiement d'abonnement échoué |

### Routeur Webhook

Les événements sont distribués via un module de routeur dédié :

```typescript
await routeWebhookEvent(webhookResult.type, webhookResult.data);
```

Le routeur associe les types d'événements à des fonctions de gestionnaire qui mettent à jour la base de données via `WebhookSubscriptionService` et envoient des notifications par e-mail.

### Validation du Payload

Le point de terminaison webhook valide la structure du payload avant traitement :

```typescript
if (!validateWebhookPayload(body)) {
  return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
}
```

## Gestion des Clients

Le fournisseur suit le patron de résolution standard en trois étapes :

1. Vérifier les métadonnées utilisateur pour l'ID client Polar
2. Interroger la table de base de données `PaymentAccount`
3. Créer un nouveau client via le SDK Polar

```typescript
const customer = await this.polar.customers.create({
  organizationId: this.organizationId,
  email: params.email,
  name: params.name,
  metadata: params.metadata
});
```

## Gestion des Erreurs

| Statut | Erreur | Cause |
|--------|--------|-------|
| 400 | `Product ID is required` | `productId` manquant dans la requête |
| 400 | `Checkout ID is required` | Requête GET sans `checkout_id` |
| 400 | `No signature provided` | En-tête de signature manquant dans le webhook |
| 401 | `Unauthorized` | Aucune session authentifiée |
| 500 | `Failed to create checkout` | URL de paiement indisponible |
| 500 | `Configuration error` | Fournisseur Polar non configuré |
| 503 | Configuration de paiement incomplète | L'organisation n'a pas terminé la configuration de paiement dans Polar |

Le point de terminaison de paiement inclut une détection spéciale pour les erreurs de configuration de paiement :

```typescript
if (error.message.includes('Payments are currently unavailable') ||
    error.message.includes('needs to complete their payment setup')) {
  statusCode = 503;
  fallbackMessage = 'Polar payment setup incomplete...';
}
```

## Configuration Requise

| Variable | Requis | Description |
|----------|--------|-------------|
| `POLAR_ACCESS_TOKEN` | Oui | Jeton d'accès API Polar |
| `POLAR_WEBHOOK_SECRET` | Oui | Secret de signature webhook |
| `POLAR_ORGANIZATION_ID` | Oui | ID d'organisation Polar |

## Considérations de Sécurité

- Les signatures webhook sont vérifiées en utilisant la fonction `validateEvent` du SDK officiel
- Le texte brut du corps est préservé pour la vérification des signatures (la re-sérialisation JSON pourrait modifier le corps)
- Trois en-têtes séparés sont vérifiés : signature, horodatage et ID webhook
- Les métadonnées sont assainies côté serveur pour empêcher l'injection de valeurs undefined
- Les réponses d'erreur utilisent `safeErrorResponse` pour éviter les fuites d'informations

## Pages Associées

- [Analyse Approfondie LemonSqueezy](./lemonsqueezy-deep-dive.md)
- [Analyse Approfondie Solidgate](./solidgate-deep-dive.md)
- [Analyse Approfondie Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Architecture des Fournisseurs de Paiement](./payment-provider-architecture.md)
