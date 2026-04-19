---
id: notification-types
title: Définitions des types de notification
sidebar_label: Types de notifications
sidebar_position: 14
---

# Définitions des types de notification

**Source :** `lib/services/email-notification.service.ts`, `lib/payment/services/payment-email.service.ts`, `lib/payment/types/payment-types.ts`

Les notifications du modèle sont principalement envoyées par courrier électronique et déclenchées par des événements système tels que la fin des paiements, les modifications d'abonnement et les révisions de soumission.

## Interfaces

### `EmailNotificationData`

La charge utile principale pour l’envoi d’e-mails de notification à l’administrateur.

```typescript
interface EmailNotificationData {
  to: string;                  // Recipient email address
  title: string;               // Email subject / notification title
  message: string;             // Body text content
  actionUrl?: string;          // Optional CTA link
  actionText?: string;         // Optional CTA button label
  notificationType: string;    // Category identifier for template selection
  timestamp: string;           // ISO 8601 timestamp
}
```

|Champ|Obligatoire|Descriptif|
|-------|----------|-------------|
|`to`|Oui|Adresse e-mail du destinataire|
|`title`|Oui|Ligne d'objet et titre interne|
|`message`|Oui|Organe de notification principal|
|`actionUrl`|Non|Lien vers le bouton d'appel à l'action|
|`actionText`|Non|Texte de l'étiquette pour le bouton CTA|
|`notificationType`|Oui|Utilisé pour sélectionner la variante du modèle d'e-mail|
|`timestamp`|Oui|Quand l’événement déclencheur s’est produit|

### `WebhookEventType`

Événements reçus des webhooks du fournisseur de paiement qui déclenchent des notifications.

```typescript
enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
  // ... additional billing portal events
}
```

### `WebhookResult`

Résultat standardisé du traitement d’un événement webhook.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## Catégories de notifications

Le modèle déclenche des notifications pour ces catégories d'événements :

|Catégorie|Événements déclencheurs|
|----------|---------------|
|**Paiement**|`payment_succeeded`, `payment_failed`, `refund_succeeded`|
|**Abonnement**|`subscription_created`, `subscription_cancelled`, `subscription_trial_ending`|
|**Facture**|`invoice_paid`, `invoice_payment_failed`|
|**Soumission**|Article approuvé, article rejeté, nouvelle soumission reçue|
|**Compte**|Mot de passe modifié, email vérifié|

## Intégration du service de messagerie

Les notifications sont envoyées via la classe `EmailNotificationService` :

```typescript
import { EmailNotificationService } from '@/lib/services/email-notification.service';
import type { EmailNotificationData } from '@/lib/services/email-notification.service';

const notification: EmailNotificationData = {
  to: 'admin@example.com',
  title: 'New Submission Received',
  message: 'A new item "Acme Corp" has been submitted for review.',
  actionUrl: '/admin/items/pending',
  actionText: 'Review Now',
  notificationType: 'submission',
  timestamp: new Date().toISOString(),
};

const result = await EmailNotificationService.sendAdminNotification(notification);
```

Le service vérifie la disponibilité du fournisseur de messagerie avant l'envoi et renvoie un résultat `skipped` si aucun fournisseur n'est configuré, évitant ainsi les erreurs d'exécution dans les environnements sans configuration de messagerie.

## Configuration du fournisseur de messagerie

L'envoi des notifications dépend de la configuration de la messagerie dans `lib/config/schemas/email.schema.ts` :

|Fournisseur|Var d'environnement requis|Activé automatiquement|
|----------|-----------------|--------------|
|Renvoyer|`RESEND_API_KEY`|Lorsque la clé est présente|
|Novu|`NOVU_API_KEY`|Lorsque la clé est présente|
|SMTP|`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`|Quand tous les trois sont présents|

## Exemple d'utilisation

```typescript
// In a webhook handler
import { WebhookEventType } from '@/lib/payment/types/payment-types';

async function handleWebhook(event: WebhookResult) {
  if (event.type === WebhookEventType.SUBSCRIPTION_CANCELLED) {
    await EmailNotificationService.sendAdminNotification({
      to: adminEmail,
      title: 'Subscription Cancelled',
      message: `Customer ${event.data.customerId} cancelled their subscription.`,
      notificationType: 'subscription',
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Types associés

- [Types de paiement](./payment-types.md) -- `WebhookEventType` et énumérations de paiement
- [Types d'abonnement](./subscription-types.md) -- événements du cycle de vie des abonnements
- [Types de configuration](./config-types.md) -- `EmailConfig` pour les paramètres du fournisseur
