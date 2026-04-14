---
id: notification-types
title: Definizioni del tipo di notifica
sidebar_label: Tipi di notifica
sidebar_position: 14
---

# Definizioni del tipo di notifica

**Fonte:** `lib/services/email-notification.service.ts`, `lib/payment/services/payment-email.service.ts`, `lib/payment/types/payment-types.ts`

Le notifiche nel modello sono principalmente basate su e-mail, attivate da eventi di sistema come il completamento dei pagamenti, le modifiche agli abbonamenti e le revisioni degli invii.

## Interfacce

### `EmailNotificationData`

Il payload principale per l'invio di e-mail di notifica dell'amministratore.

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

|Campo|Obbligatorio|Descrizione|
|-------|----------|-------------|
|`to`|Sì|Indirizzo e-mail del destinatario|
|`title`|Sì|Oggetto e intestazione interna|
|`message`|Sì|Organismo principale di notifica|
|`actionUrl`|No|Link per il pulsante di invito all'azione|
|`actionText`|No|Testo dell'etichetta per il pulsante CTA|
|`notificationType`|Sì|Utilizzato per selezionare la variante del modello di posta elettronica|
|`timestamp`|Sì|Quando si è verificato l'evento scatenante|

### `WebhookEventType`

Eventi ricevuti dai webhook del fornitore di servizi di pagamento che attivano le notifiche.

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

Risultato standardizzato dell'elaborazione di un evento webhook.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## Categorie di notifica

Il modello attiva le notifiche per queste categorie di eventi:

|Categoria|Eventi scatenanti|
|----------|---------------|
|**Pagamento**|`payment_succeeded`, `payment_failed`, `refund_succeeded`|
|**Abbonamento**|`subscription_created`, `subscription_cancelled`, `subscription_trial_ending`|
|**Fattura**|`invoice_paid`, `invoice_payment_failed`|
|**Invio**|Articolo approvato, articolo rifiutato, nuovo invio ricevuto|
|**Conto**|Password modificata, email verificata|

## Integrazione del servizio di posta elettronica

Le notifiche vengono inviate tramite la classe `EmailNotificationService`:

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

Il servizio controlla la disponibilità del provider di posta elettronica prima dell'invio e restituisce un risultato `skipped` se nessun provider è configurato, prevenendo errori di runtime in ambienti senza configurazione della posta elettronica.

## Configurazione del provider di posta elettronica

La consegna delle notifiche dipende dalla configurazione dell'e-mail in `lib/config/schemas/email.schema.ts`:

|Fornitore|Var. inv. richiesta|Abilitato automaticamente|
|----------|-----------------|--------------|
|Invia nuovamente|`RESEND_API_KEY`|Quando la chiave è presente|
|Nuovo|`NOVU_API_KEY`|Quando la chiave è presente|
|SMTP|`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`|Quando sono presenti tutti e tre|

## Esempio di utilizzo

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

## Tipi correlati

- [Tipi di pagamento](./payment-types.md) -- `WebhookEventType` ed enumerazioni di pagamento
- [Tipi di abbonamento](./subscription-types.md) -- eventi del ciclo di vita dell'abbonamento
- [Tipi di configurazione](./config-types.md) -- `EmailConfig` per le impostazioni del provider
