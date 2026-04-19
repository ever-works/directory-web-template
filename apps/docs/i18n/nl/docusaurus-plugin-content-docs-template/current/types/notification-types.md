---
id: notification-types
title: Definities van meldingstypen
sidebar_label: Meldingstypen
sidebar_position: 14
---

# Definities van meldingstypen

**Bron:** `lib/services/email-notification.service.ts`, `lib/payment/services/payment-email.service.ts`, `lib/payment/types/payment-types.ts`

Meldingen in de sjabloon zijn voornamelijk gebaseerd op e-mail en worden geactiveerd door systeemgebeurtenissen zoals voltooiing van betalingen, wijzigingen in abonnementen en beoordelingen van inzendingen.

## Interfaces

### `EmailNotificationData`

De belangrijkste payload voor het verzenden van e-mails met beheerdersmeldingen.

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

|Veld|Vereist|Beschrijving|
|-------|----------|-------------|
|`to`|Ja|E-mailadres van de ontvanger|
|`title`|Ja|Onderwerpregel en interne kop|
|`message`|Ja|Belangrijkste meldingsinstantie|
|`actionUrl`|Nee|Link voor de call-to-action-knop|
|`actionText`|Nee|Labeltekst voor de CTA-knop|
|`notificationType`|Ja|Wordt gebruikt om de e-mailsjabloonvariant te selecteren|
|`timestamp`|Ja|Wanneer de triggergebeurtenis plaatsvond|

### `WebhookEventType`

Gebeurtenissen ontvangen van webhooks van betalingsproviders die meldingen activeren.

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

Gestandaardiseerd resultaat van het verwerken van een webhookgebeurtenis.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## Meldingscategorieën

De sjabloon activeert meldingen voor deze gebeurteniscategorieën:

|Categorie|Gebeurtenissen activeren|
|----------|---------------|
|**Betaling**|`payment_succeeded`, `payment_failed`, `refund_succeeded`|
|**Abonnement**|`subscription_created`, `subscription_cancelled`, `subscription_trial_ending`|
|**Factuur**|`invoice_paid`, `invoice_payment_failed`|
|**Inzending**|Artikel goedgekeurd, artikel afgewezen, nieuwe inzending ontvangen|
|**Account**|Wachtwoord gewijzigd, e-mail geverifieerd|

## Integratie van e-mailservices

Meldingen worden verzonden via de klasse `EmailNotificationService`:

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

De service controleert de beschikbaarheid van de e-mailprovider voordat deze wordt verzonden en retourneert het resultaat `skipped` als er geen provider is geconfigureerd, waardoor runtimefouten worden voorkomen in omgevingen zonder e-mailconfiguratie.

## Configuratie van e-mailprovider

De bezorging van meldingen is afhankelijk van de e-mailconfiguratie in `lib/config/schemas/email.schema.ts`:

|Aanbieder|Vereiste omgevingsvar|Automatisch ingeschakeld|
|----------|-----------------|--------------|
|Opnieuw verzenden|`RESEND_API_KEY`|Wanneer sleutel aanwezig is|
|Nieuw|`NOVU_API_KEY`|Wanneer sleutel aanwezig is|
|SMTP|`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`|Wanneer ze alle drie aanwezig zijn|

## Gebruiksvoorbeeld

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

## Gerelateerde typen

- [Betalingstypen](./betalingstypes.md) -- `WebhookEventType` en betalingsopsommingen
- [Abonnementstypen](./subscription-types.md) - levenscyclusgebeurtenissen van abonnementen
- [Config Types](./config-types.md) -- `EmailConfig` voor providerinstellingen
