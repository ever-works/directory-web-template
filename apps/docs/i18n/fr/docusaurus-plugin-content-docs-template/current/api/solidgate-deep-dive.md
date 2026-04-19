---
id: solidgate-deep-dive
title: "Analyse Approfondie Solidgate"
sidebar_label: "Solidgate"
sidebar_position: 7
---

# Analyse Approfondie Solidgate

Cette page couvre l'intégration complète de Solidgate, notamment la création de sessions de paiement, le traitement des webhooks, la vérification des paiements et le formulaire de paiement intégré.

## Aperçu

Solidgate est un fournisseur d'infrastructure de paiement qui prend en charge les flux de paiement hébergés et un SDK React intégrable pour les formulaires de paiement en ligne. L'intégration crée des intentions de paiement via l'API Solidgate et prend en charge le traitement des événements webhook avec protection contre la duplication. Solidgate utilise HMAC-SHA512 pour la vérification des signatures webhook.

## Résumé des Routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| `POST` | `/api/solidgate/checkout` | Session requise | Créer une session de paiement / intention de paiement |
| `POST` | `/api/solidgate/webhook` | Signature requise | Traiter les événements webhook entrants |
| `GET` | `/api/solidgate/webhook` | Non | Retourne la documentation du point de terminaison |

## Création de Paiement (POST)

### Corps de la Requête

Le point de terminaison de paiement utilise la validation Zod pour une vérification stricte des entrées :

```typescript
const checkoutSchema = z.object({
  amount: z.number().positive(),               // Montant du paiement
  currency: z.string().default('USD'),         // Code de devise
  mode: z.enum(['one_time', 'subscription']).default('one_time'),
  successUrl: z.string().url(),                // URL de redirection
  cancelUrl: z.string().url(),                 // URL d'annulation
  metadata: z.record(z.string(), z.any()).optional()
});
```

### Exemple de Requête

```bash
curl -X POST /api/solidgate/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "amount": 29.99,
    "currency": "USD",
    "mode": "one_time",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### Fonctionnement

1. Authentifie l'utilisateur via `auth()`
2. Valide le corps de la requête avec le schéma Zod
3. Résout ou crée un client Solidgate
4. Crée une intention de paiement via l'API Solidgate
5. Retourne l'ID de paiement et le secret client pour le SDK intégré

### Implémentation du Fournisseur

La méthode `createPaymentIntent` construit la requête API :

```typescript
const paymentRequest: SolidgatePaymentRequest = {
  amount: paymentAmount,                    // Montant en centimes
  currency: currency.toUpperCase(),
  order_id: `order_${crypto.randomUUID()}`,
  order_description: metadata?.planName || 'Payment',
  customer_email: metadata?.email,
  customer_id: customerId,
  redirect_url: successUrl || `${appUrl}/payment/success`,
  callback_url: `${appUrl}/api/solidgate/webhook`,
  metadata: { ...metadata, customerId, paymentIntentId }
};

const response = await this.makeApiRequest<SolidgatePaymentResponse>(
  '/payments', 'POST', paymentRequest
);
```

### Réponse de Succès (200)

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_abc123-def456"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

Le champ `url` contient l'ID de l'intention de paiement utilisé pour initialiser le SDK React Solidgate.

## Formulaire de Paiement Intégré

Solidgate fournit un SDK React pour les formulaires de paiement en ligne. Le fournisseur génère une signature pour l'initialisation du SDK :

```typescript
private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto.createHmac('sha512', this.secretKey).update(data).digest('hex');
}
```

La méthode `getUIComponents()` retourne un wrapper de formulaire de paiement configuré :

```typescript
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(paymentIntent, merchantId);

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature
    });
  };
  return { PaymentForm: SolidgatePaymentFormWithConfig, ... };
}
```

## Traitement des Webhooks

### Vérification de Signature

Solidgate utilise HMAC-SHA512 pour les signatures webhook. L'en-tête de signature peut être `x-signature` ou `solidgate-signature` :

```typescript
const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');
```

Le fournisseur vérifie la signature par rapport au corps brut :

```typescript
const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

private generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}
```

### Protection contre la Duplication

Le point de terminaison webhook inclut une protection contre la duplication en mémoire pour éviter le double traitement :

```typescript
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 heures

const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true }); // Acquitter sans traiter
}

if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::note
Dans un environnement serverless en production, le Set en mémoire doit être remplacé par Redis ou une table de base de données pour une protection contre la duplication multi-instances.
:::

### Correspondance des Événements

| Événement Solidgate | Type Interne |
|--------------------|--------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

### Structure du Gestionnaire

Chaque gestionnaire délègue au `WebhookSubscriptionService` :

```typescript
async function handleSubscriptionCreated(data: any) {
  try {
    await webhookSubscriptionService.handleSubscriptionCreated(data);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

Le `WebhookSubscriptionService` est initialisé avec la constante de fournisseur `SOLIDGATE` :

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.SOLIDGATE);
```

## Vérification des Paiements

Le fournisseur prend en charge la vérification des paiements via l'API Solidgate :

```typescript
async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
  const response = await this.makeApiRequest<SolidgatePaymentStatus>(
    `/payments/${paymentId}`, 'GET'
  );
  const isSuccess = response.transaction_status === 'success'
    || response.transaction_status === 'completed';

  return {
    isValid: isSuccess,
    paymentId: response.payment_id,
    status: response.transaction_status,
    details: {
      amount: response.amount / 100,
      currency: response.currency.toLowerCase(),
      orderId: response.order_id
    }
  };
}
```

## Gestion des Abonnements

### Création d'Abonnements

```typescript
async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
  const response = await this.makeApiRequest('/subscriptions', 'POST', {
    customer_id: customerId,
    plan_id: priceId,
    metadata
  });
  // Retourne SubscriptionInfo avec statut mappé
}
```

### Annulation d'Abonnements

Prend en charge l'annulation immédiate et en fin de période :

```typescript
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Mise à Jour des Abonnements

```typescript
const updateData: any = {};
if (priceId) updateData.plan_id = priceId;
if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
if (metadata) updateData.metadata = metadata;

await this.makeApiRequest(`/subscriptions/${subscriptionId}`, 'PUT', updateData);
```

## Communication API

Tous les appels API Solidgate utilisent une méthode centralisée `makeApiRequest` :

```typescript
private async makeApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<T> {
  const url = `${this.apiBaseUrl}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  // Gestion des erreurs et parsing JSON
}
```

## Gestion des Erreurs

| Statut | Erreur | Cause |
|--------|--------|-------|
| 400 | `Invalid request body` | Validation Zod échouée |
| 400 | `Invalid JSON` | Corps de la requête malformé |
| 400 | `Failed to create customer` | Résolution du client échouée |
| 400 | `No signature provided` | Signature manquante dans le webhook |
| 400 | `Webhook not processed` | Vérification de la signature échouée |
| 401 | `Unauthorized` | Aucune session authentifiée |
| 500 | `Failed to create checkout session` | Erreur API Solidgate |

Les erreurs de validation Zod retournent des messages détaillés au niveau des champs :

```typescript
const errorMessage = result.error.issues
  .map(issue => `${issue.path.join('.')}: ${issue.message}`)
  .join(', ');
```

## Configuration Requise

| Variable | Requis | Description |
|----------|--------|-------------|
| `SOLIDGATE_API_KEY` | Oui | Clé API Solidgate |
| `SOLIDGATE_SECRET_KEY` | Oui | Clé secrète pour la génération de signatures |
| `SOLIDGATE_WEBHOOK_SECRET` | Oui | Secret de signature webhook |
| `SOLIDGATE_PUBLISHABLE_KEY` | Oui | Clé publiable pour le SDK React |
| `SOLIDGATE_MERCHANT_ID` | Oui | Identifiant marchand |
| `SOLIDGATE_API_BASE_URL` | Non | URL de base de l'API (défaut : `https://api.solidgate.com/v1`) |

## Considérations de Sécurité

- HMAC-SHA512 est utilisé pour la vérification des signatures webhook et des intentions de paiement
- La clé secrète et le secret webhook ne sont jamais exposés au client
- La protection contre la duplication empêche le double traitement des webhooks
- La validation Zod assure une vérification stricte des entrées sur le point de terminaison de paiement
- Les traces de pile d'erreur ne sont incluses qu'en mode développement
- L'utilitaire `safeErrorMessage` assainit les messages d'erreur pour la production

## Pages Associées

- [Analyse Approfondie Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Analyse Approfondie LemonSqueezy](./lemonsqueezy-deep-dive.md)
- [Analyse Approfondie Polar](./polar-deep-dive.md)
- [Architecture des Fournisseurs de Paiement](./payment-provider-architecture.md)
