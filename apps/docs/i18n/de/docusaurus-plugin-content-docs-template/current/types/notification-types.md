---
id: notification-types
title: Benachrichtigungstypdefinitionen
sidebar_label: Benachrichtigungstypen
sidebar_position: 14
---

# Benachrichtigungstypdefinitionen

**Quelle:** `lib/services/email-notification.service.ts`, `lib/payment/services/payment-email.service.ts`, `lib/payment/types/payment-types.ts`

Benachrichtigungen in der Vorlage erfolgen hauptsächlich per E-Mail und werden durch Systemereignisse wie Zahlungsabschlüsse, Abonnementänderungen und Einreichungsüberprüfungen ausgelöst.

## Schnittstellen

### `EmailNotificationData`

Die Kernnutzlast zum Versenden von Administrator-Benachrichtigungs-E-Mails.

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

|Feld|Erforderlich|Beschreibung|
|-------|----------|-------------|
|`to`|Ja|E-Mail-Adresse des Empfängers|
|`title`|Ja|Betreffzeile und interne Überschrift|
|`message`|Ja|Hauptmeldestelle|
|`actionUrl`|Nein|Link für den Call-to-Action-Button|
|`actionText`|Nein|Beschriftungstext für die CTA-Schaltfläche|
|`notificationType`|Ja|Wird zur Auswahl der E-Mail-Vorlagenvariante verwendet|
|`timestamp`|Ja|Wann das auslösende Ereignis aufgetreten ist|

### `WebhookEventType`

Von Webhooks des Zahlungsanbieters empfangene Ereignisse, die Benachrichtigungen auslösen.

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

Standardisiertes Ergebnis der Verarbeitung eines Webhook-Ereignisses.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## Benachrichtigungskategorien

Die Vorlage löst Benachrichtigungen für diese Ereigniskategorien aus:

|Kategorie|Trigger-Ereignisse|
|----------|---------------|
|**Zahlung**|`payment_succeeded`, `payment_failed`, `refund_succeeded`|
|**Abonnement**|`subscription_created`, `subscription_cancelled`, `subscription_trial_ending`|
|**Rechnung**|`invoice_paid`, `invoice_payment_failed`|
|**Einreichung**|Artikel genehmigt, Artikel abgelehnt, neue Einreichung erhalten|
|**Konto**|Passwort geändert, E-Mail bestätigt|

## E-Mail-Service-Integration

Benachrichtigungen werden über die Klasse `EmailNotificationService` gesendet:

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

Der Dienst prüft vor dem Senden die Verfügbarkeit des E-Mail-Anbieters und gibt ein `skipped`-Ergebnis zurück, wenn kein Anbieter konfiguriert ist, wodurch Laufzeitfehler in Umgebungen ohne E-Mail-Einrichtung verhindert werden.

## Konfiguration des E-Mail-Anbieters

Die Zustellung der Benachrichtigung hängt von der E-Mail-Konfiguration in `lib/config/schemas/email.schema.ts` ab:

|Anbieter|Erforderliche Umgebungsvariable|Automatisch aktiviert|
|----------|-----------------|--------------|
|Erneut senden|`RESEND_API_KEY`|Wenn der Schlüssel vorhanden ist|
|Novu|`NOVU_API_KEY`|Wenn der Schlüssel vorhanden ist|
|SMTP|`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`|Wenn alle drei vorhanden sind|

## Anwendungsbeispiel

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

## Verwandte Typen

- [Zahlungsarten](./zahlungsarten.md) – `WebhookEventType` und Zahlungsaufzählungen
- [Abonnementtypen](./subscription-types.md) – Ereignisse im Abonnementlebenszyklus
- [Config Types](./config-types.md) – `EmailConfig` für Anbietereinstellungen
