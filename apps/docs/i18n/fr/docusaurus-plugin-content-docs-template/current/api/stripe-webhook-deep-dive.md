---
id: stripe-webhook-deep-dive
title: "Analyse Approfondie Webhooks Stripe"
sidebar_label: "Webhooks Stripe"
sidebar_position: 4
---

# Analyse Approfondie Webhooks Stripe

Cette page couvre la gestion des événements webhook, la vérification des signatures, les types d'événements pris en charge, les notifications par e-mail et les modèles de gestion des erreurs.

## Aperçu

Le point de terminaison webhook Stripe traite les événements entrants de Stripe, vérifie leur authenticité via la vérification de signature, les associe à des types d'événements internes et les envoie à des gestionnaires spécialisés. Chaque gestionnaire met à jour la base de données via `WebhookSubscriptionService` et envoie des e-mails transactionnels.

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| `POST` | `/api/stripe/webhook` | Signature Stripe | Traiter les événements webhook Stripe entrants |

## Vérification des signatures

Chaque webhook entrant doit inclure un en-tête `stripe-signature`. Le fournisseur le vérifie en utilisant la méthode `constructEvent` de Stripe :

```typescript
const event = this.stripe.webhooks.constructEvent(
  payload,
  signature,
  this.webhookSecret
);
```

Si la signature est absente, le point de terminaison retourne `400` :

```json
{ "error": "No signature provided" }
```

Si la signature est invalide, l'appel à `constructEvent` lève une exception et le point de terminaison retourne :

```json
{ "error": "Webhook processing failed" }
```

## Correspondance des types d'événements

Les types d'événements Stripe sont associés aux valeurs internes `WebhookEventType` :

| Événement Stripe | Type interne | Gestionnaire |
|------------------|--------------|---------------|
| `customer.subscription.created` | `SUBSCRIPTION_CREATED` | `handleSubscriptionCreated` |
| `customer.subscription.updated` | `SUBSCRIPTION_UPDATED` | `handleSubscriptionUpdated` |
| `customer.subscription.deleted` | `SUBSCRIPTION_CANCELLED` | `handleSubscriptionCancelled` |
| `invoice.payment_succeeded` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` | `handleSubscriptionPaymentSucceeded` |
| `invoice.payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` | `handleSubscriptionPaymentFailed` |
| `payment_intent.succeeded` | `PAYMENT_SUCCEEDED` | `handlePaymentSucceeded` |
| `payment_intent.payment_failed` | `PAYMENT_FAILED` | `handlePaymentFailed` |
| `customer.subscription.trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` | `handleSubscriptionTrialEnding` |
| `billing_portal.session.updated` | `BILLING_PORTAL_SESSION_UPDATED` | Journalisation uniquement |

## Flux de traitement des webhooks

```
Stripe envoie POST -> Lire le corps brut -> Extraire l'en-tête stripe-signature
  -> stripeProvider.handleWebhook(body, signature)
    -> stripe.webhooks.constructEvent() (vérification de signature)
    -> Associer le type d'événement au type interne
    -> Retourner { received: true, type, id, data }
  -> Switch sur webhookResult.type
    -> Appeler le gestionnaire approprié
    -> Le gestionnaire met à jour la BDD + envoie un e-mail
  -> Retourner { received: true }
```

## Gestionnaires d'événements

### Abonnement créé

Gère la création d'un nouvel abonnement :

1. Vérifie si l'abonnement est une annonce sponsor (traitement spécial)
2. Appelle `webhookSubscriptionService.handleSubscriptionCreated(data)` pour mettre à jour la base de données
3. Extrait les informations du plan (nom, montant, période de facturation)
4. Envoie un e-mail de bienvenue avec les détails de l'abonnement et les fonctionnalités

### Abonnement mis à jour

Gère les modifications d'abonnement (mises à niveau, rétrogradations de plan, etc.) :

1. Met à jour la base de données via `webhookSubscriptionService.handleSubscriptionUpdated(data)`
2. Extrait les informations du plan mis à jour
3. Envoie un e-mail de notification de mise à jour

### Abonnement annulé

Gère les annulations d'abonnement :

1. Vérifie les abonnements d'annonces sponsor
2. Met à jour la base de données via `webhookSubscriptionService.handleSubscriptionCancelled(data)`
3. Envoie un e-mail d'annulation avec la raison de l'annulation et l'URL de réactivation

### Paiement réussi (paiement unique)

Gère les paiements uniques réussis :

1. Extrait les informations client et les détails du paiement
2. Formate le montant et la méthode de paiement
3. Envoie un e-mail de confirmation de paiement avec l'URL du reçu

### Paiement échoué

Gère les paiements uniques échoués :

1. Extrait les informations d'erreur depuis `last_payment_error`
2. Construit les URL de réessai et de mise à jour de la méthode de paiement
3. Envoie un e-mail de notification d'échec de paiement

### Paiement d'abonnement réussi

Gère les paiements récurrents d'abonnement réussis :

1. Met à jour la base de données via `webhookSubscriptionService.handleSubscriptionPaymentSucceeded(data)`
2. Extrait les détails de la facture et de l'abonnement
3. Envoie un e-mail de reçu de paiement d'abonnement

### Paiement d'abonnement échoué

Gère les paiements récurrents d'abonnement échoués :

1. Met à jour la base de données via `webhookSubscriptionService.handleSubscriptionPaymentFailed(data)`
2. Envoie une notification d'échec avec les URL de réessai et de mise à jour du paiement

### Fin d'essai imminente

Gère les notifications de fin d'essai à 3 jours de Stripe :

1. Met à jour la base de données via `webhookSubscriptionService.handleSubscriptionTrialEnding(data)`
2. Envoie un e-mail de rappel de fin d'essai

## Notifications par e-mail

Chaque gestionnaire utilise `paymentEmailService` pour envoyer des e-mails transactionnels. La configuration des e-mails est chargée de manière sécurisée via `getEmailConfig()` :

```typescript
function createEmailData(baseData: any, emailConfig: ReturnType<typeof getEmailConfig>) {
  return {
    ...baseData,
    companyName: emailConfig.companyName,
    companyUrl: emailConfig.companyUrl,
    supportEmail: emailConfig.supportEmail
  };
}
```

| Événement | Modèle d'e-mail |
|-----------|----------------|
| Abonnement créé | `sendNewSubscriptionEmail` |
| Abonnement mis à jour | `sendUpdatedSubscriptionEmail` |
| Abonnement annulé | `sendCancelledSubscriptionEmail` |
| Paiement réussi | `sendPaymentSuccessEmail` |
| Paiement échoué | `sendPaymentFailedEmail` |
| Paiement d'abonnement réussi | `sendSubscriptionPaymentSuccessEmail` |
| Paiement d'abonnement échoué | `sendSubscriptionPaymentFailedEmail` |
| Fin d'essai imminente | `sendUpdatedSubscriptionEmail` |

## Gestion des annonces sponsor

Le webhook inclut un traitement spécial pour les abonnements d'annonces sponsor. Ceux-ci sont identifiés en vérifiant les métadonnées :

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const metadata = data.metadata as Record<string, string> | undefined;
  return metadata?.type === 'sponsor_ad';
}
```

Les événements d'annonces sponsor déclenchent :
- **Activation** : Confirme le paiement et met l'annonce en attente de révision par l'administrateur
- **Annulation** : Désactive l'annonce sponsor
- **Renouvellement** : Prolonge la date de fin de l'annonce sponsor

## Fonctionnalités des plans

La fonction `getSubscriptionFeatures` associe les noms de plans à des listes de fonctionnalités utilisées dans les e-mails de bienvenue :

```typescript
const features: Record<string, string[]> = {
  'Free Plan': ['Access to basic features', 'Email support', 'Limited storage'],
  'Standard Plan': ['All advanced features', 'Priority support', 'Unlimited storage', ...],
  'Premium Plan': ['All Pro features', 'Dedicated support', 'Custom features', ...]
};
```

## Gestion des erreurs

Le point de terminaison webhook suit un modèle résilient :

- Chaque gestionnaire individuel est encapsulé dans son propre bloc try/catch
- Les échecs de gestionnaire sont journalisés mais ne provoquent pas d'erreur dans le retour du webhook
- Le try/catch externe intercepte les erreurs de vérification de signature et d'analyse
- Retourne `400` pour tous les échecs au niveau du webhook afin d'indiquer à Stripe de ne pas réessayer en cas d'erreurs permanentes

```typescript
try {
  // ... vérification de signature et envoi des événements
  return NextResponse.json({ received: true });
} catch (error) {
  console.error('Webhook error:', error);
  return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
}
```

## Exigences de configuration

| Variable | Requis | Description |
|----------|--------|-------------|
| `STRIPE_SECRET_KEY` | Oui | Clé API secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Oui | Secret de signature du webhook (depuis le tableau de bord Stripe) |

Pour configurer le webhook dans le tableau de bord Stripe :

1. Accédez à Développeurs > Webhooks
2. Ajoutez l'URL du point de terminaison : `https://votredomaine.com/api/stripe/webhook`
3. Sélectionnez les événements listés dans le tableau de correspondance des événements ci-dessus
4. Copiez le secret de signature dans `STRIPE_WEBHOOK_SECRET`

## Considérations de sécurité

- La vérification de signature est obligatoire ; les requêtes sans signatures valides sont rejetées
- Le corps brut de la requête est utilisé pour la vérification de signature (pas le JSON analysé)
- Les secrets webhook ne doivent jamais être commités dans le contrôle de version
- Le point de terminaison ne nécessite pas d'authentification de session (Stripe l'appelle directement)
- Les données sensibles dans les messages d'erreur sont assainies pour les environnements de production

## Pages connexes

- [Analyse Approfondie Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Analyse Approfondie des Abonnements Stripe](./stripe-subscription-deep-dive.md)
- [Analyse Approfondie des Méthodes de Paiement Stripe](./stripe-payment-methods-deep-dive.md)
- [Architecture du Fournisseur de Paiement](./payment-provider-architecture.md)
