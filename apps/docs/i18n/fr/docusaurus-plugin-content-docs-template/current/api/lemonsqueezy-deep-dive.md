---
id: lemonsqueezy-deep-dive
title: "Analyse Approfondie LemonSqueezy"
sidebar_label: "LemonSqueezy"
sidebar_position: 5
---

# Analyse Approfondie LemonSqueezy

Cette page couvre l'intégration complète de LemonSqueezy, notamment la création de sessions de paiement, la gestion des abonnements, le traitement des webhooks et la synchronisation des produits.

## Aperçu

LemonSqueezy est un fournisseur de paiement de type « merchant of record » qui gère la collecte des taxes, la conformité et le traitement des paiements. L'intégration utilise le flux de paiement hébergé de LemonSqueezy, le modèle de produit basé sur les variantes et le système de webhooks. Contrairement à Stripe, LemonSqueezy ne prend pas en charge les setup intents ni la gestion directe des méthodes de paiement — tout le traitement des paiements s'effectue via leur interface hébergée.

## Résumé des Routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| `POST` | `/api/lemonsqueezy/checkout` | Session requise | Créer une session de paiement depuis le corps JSON |
| `GET` | `/api/lemonsqueezy/checkout` | Non | Créer une session de paiement depuis les paramètres de requête |
| `POST` | `/api/lemonsqueezy/webhook` | Signature requise | Traiter les événements webhook entrants |

## Création de Paiement (POST)

### Corps de la Requête

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // ID de la variante de produit LemonSqueezy
  dark?: boolean;                           // Activer le mode sombre du paiement
  customPrice?: number;                     // Prix personnalisé en centimes (optionnel)
  metadata?: Record<string, string>;        // Métadonnées supplémentaires
}
```

### Exemple de Requête

```bash
curl -X POST /api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "variantId": "123456",
    "dark": true,
    "metadata": { "plan": "pro", "source": "website" }
  }'
```

### Fonctionnement

1. Authentifie l'utilisateur via `auth()`
2. Valide le corps de la requête avec `validateCheckoutRequestBody()`
3. Appelle `lemonsqueezyProvider.createCustomCheckout()` avec les métadonnées utilisateur
4. Retourne l'URL de paiement

### Implémentation du Fournisseur

La méthode `createCustomCheckout` crée un paiement LemonSqueezy avec une configuration complète :

```typescript
const { data, error } = await createCheckout(Number(this.storeId), Number(params.variantId), {
  customPrice: params.customPrice,
  productOptions: {
    redirectUrl: `${env.API_BASE_URL}/billing/success`,
    receiptButtonText: 'View Receipt',
    receiptLinkUrl: `${env.API_BASE_URL}/billing/receipt`,
    receiptThankYouNote: 'Thank you for your purchase!',
    enabledVariants: [Number(params.variantId)]
  },
  checkoutOptions: {
    embed: true,
    media: false,
    logo: false,
    dark: params.dark
  },
  checkoutData: {
    email: params.email,
    custom: params.metadata ?? {},
    variantQuantities: [{ variantId: Number(params.variantId), quantity: 1 }]
  },
  testMode: process.env.NODE_ENV === 'development',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
});
```

### Réponse de Succès (200)

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.lemonsqueezy.com/checkout/custom/abc123",
    "email": "user@example.com",
    "customPrice": 2999,
    "variantId": "123456",
    "metadata": {
      "userId": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "pro"
    }
  },
  "message": "Checkout session created successfully"
}
```

## Paiement via Paramètres de Requête (GET)

Le point de terminaison GET permet de créer des paiements via des paramètres de requête pour les scénarios de lien direct :

| Paramètre | Requis | Description |
|-----------|--------|-------------|
| `variantId` | Oui | ID de variante LemonSqueezy |
| `email` | Oui | Adresse e-mail du client |
| `customPrice` | Non | Prix personnalisé en centimes |
| `metadata` | Non | Chaîne JSON de métadonnées |

## Gestion des Abonnements

### Création d'Abonnements

Les abonnements sont créés via le flux de paiement. La méthode `createSubscription` encapsule l'API checkout de LemonSqueezy :

```typescript
const { data, error } = await createCheckout(Number(this.storeId), finalProductId, {
  checkoutOptions: {
    embed: true,
    subscriptionPreview: true
  },
  checkoutData: {
    email: email || '',
    custom: metadata ?? {}
  }
});
```

### Annulation d'Abonnements

```typescript
async cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
  const { data, error } = await cancelSubscription(Number(subscriptionId));
  return {
    id: subscriptionId,
    status: 'canceled' as SubscriptionStatus,
    // ...
  };
}
```

### Mise à Jour d'Abonnements

La méthode de mise à jour prend en charge les changements de plan, la mise en pause, la reprise et la réactivation :

```typescript
// Changement de plan via l'ID de variante
if (params.priceId) {
  updatePayload.variantId = Number(params.priceId);
}

// Mettre en pause l'abonnement
if (params.metadata?.pauseMode) {
  updatePayload.pause = {
    mode: params.metadata.pauseMode as 'void' | 'free',
    resumesAt: params.metadata.pauseUntil || null
  };
}

// Reprendre l'abonnement
if (params.metadata?.resumeAction) {
  if (currentSubscription?.status === 'paused') {
    updatePayload.pause = null;
  } else if (currentSubscription?.status === 'cancelled') {
    updatePayload.cancelled = false;
  }
}
```

## Traitement des Webhooks

### Vérification de Signature

LemonSqueezy utilise HMAC SHA-256 pour la vérification des signatures webhook. Le fournisseur vérifie les signatures en utilisant l'API Web Crypto :

```typescript
const cryptoKey = await crypto.subtle.importKey(
  'raw', encoder.encode(this.webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

if (calculatedSignature !== signature) {
  return { received: false, type: 'verification_failed', ... };
}
```

### Correspondance des Événements

| Événement LemonSqueezy | Type Interne |
|------------------------|--------------|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_payment_success` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` |
| `subscription_trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `REFUND_SUCCEEDED` |

### Structure du Gestionnaire de Webhooks

Chaque gestionnaire suit un patron cohérent :

```typescript
async function handleSubscriptionCreated(data: any) {
  if (isSponsorAdSubscription(data)) {
    await handleSponsorAdActivation(data);
    return;
  }
  try {
    const result = await webhookSubscriptionService.handleSubscriptionCreated(data);
    // ... enregistrer le résultat
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

### Détection des Annonces Sponsor

LemonSqueezy utilise `custom_data` au lieu des `metadata` de Stripe :

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const customData = data.custom_data as Record<string, string> | undefined;
  const meta = data.meta as Record<string, unknown> | undefined;
  const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
  return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Gestion des Clients

Le fournisseur suit le même patron de résolution des clients en trois étapes que les autres fournisseurs :

1. Vérifier les métadonnées utilisateur pour `lemonsqueezy_customer_id`
2. Interroger la table de base de données `PaymentAccount`
3. Créer un nouveau client via l'API LemonSqueezy

```typescript
const { data, error } = await createCustomer(Number(this.storeId), {
  email: params.email,
  name: params.name || '',
  city: params.metadata?.city || '',
  region: params.metadata?.region || '',
  country: params.metadata?.country || ''
});
```

## Gestion des Erreurs

| Statut | Code d'Erreur | Cause |
|--------|--------------|-------|
| 400 | `VALIDATION_ERROR` | Corps de la requête ou paramètres invalides |
| 401 | `Unauthorized` | Aucune session authentifiée |
| 500 | `CONFIGURATION_ERROR` | Variables d'environnement manquantes |
| 500 | `INTERNAL_ERROR` | Erreur non gérée |
| 503 | `PAYMENT_SERVICE_ERROR` | API LemonSqueezy indisponible |

## Configuration Requise

| Variable | Requis | Description |
|----------|--------|-------------|
| `LEMONSQUEEZY_API_KEY` | Oui | Clé API LemonSqueezy |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Oui | Secret de signature webhook |
| `LEMONSQUEEZY_STORE_ID` | Oui | ID numérique de la boutique |

## Limitations

- **Pas de setup intents** : LemonSqueezy ne prend pas en charge la sauvegarde des cartes sans achat. La méthode `createSetupIntent` lève une erreur.
- **Pas d'API de remboursement directe** : Les remboursements doivent être traités via le tableau de bord LemonSqueezy.
- **Tarification par variante** : Les produits utilisent des IDs de variante au lieu d'IDs de prix. Les changements de plan utilisent `variantId`.

## Considérations de Sécurité

- Les signatures webhook sont vérifiées en utilisant HMAC SHA-256
- Le texte brut du corps est utilisé pour la vérification des signatures afin d'éviter les problèmes de re-sérialisation JSON
- Les clés API ne sont jamais exposées au client
- La journalisation en mode développement assainit les données personnelles (les adresses e-mail sont partiellement masquées)

## Pages Associées

- [Analyse Approfondie Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Analyse Approfondie Polar](./polar-deep-dive.md)
- [Analyse Approfondie Solidgate](./solidgate-deep-dive.md)
- [Architecture des Fournisseurs de Paiement](./payment-provider-architecture.md)
