---
id: stripe-webhook-deep-dive
title: "Approfondimento Webhook Stripe"
sidebar_label: "Webhook Stripe"
---

# Approfondimento Webhook Stripe

Questa pagina copre la gestione degli eventi webhook, la verifica della firma, i tipi di evento supportati, le notifiche email e i pattern di gestione degli errori.

## Panoramica

L'endpoint webhook Stripe elabora gli eventi in arrivo da Stripe, ne verifica l'autenticità tramite verifica della firma, li mappa a tipi di evento interni e li invia a gestori specializzati. Ogni gestore aggiorna il database tramite `WebhookSubscriptionService` e invia email transazionali.

## Tabella delle Route

| Metodo | Percorso | Auth | Descrizione |
|--------|----------|------|-------------|
| `POST` | `/api/stripe/webhook` | Firma Stripe | Elabora gli eventi webhook Stripe in arrivo |

## Verifica della Firma

Ogni webhook in arrivo deve includere un header `stripe-signature`. Il provider lo verifica usando il metodo `constructEvent` di Stripe:

```typescript
const event = this.stripe.webhooks.constructEvent(
  payload,
  signature,
  this.webhookSecret
);
```

Se la firma è assente, l'endpoint restituisce `400`:

```json
{ "error": "No signature provided" }
```

Se la firma non è valida, la chiamata `constructEvent` genera un'eccezione e l'endpoint restituisce:

```json
{ "error": "Webhook processing failed" }
```

## Mappatura dei Tipi di Evento

I tipi di evento Stripe vengono mappati ai valori interni `WebhookEventType`:

| Evento Stripe | Tipo Interno | Gestore |
|--------------|--------------|--------|
| `customer.subscription.created` | `SUBSCRIPTION_CREATED` | `handleSubscriptionCreated` |
| `customer.subscription.updated` | `SUBSCRIPTION_UPDATED` | `handleSubscriptionUpdated` |
| `customer.subscription.deleted` | `SUBSCRIPTION_CANCELLED` | `handleSubscriptionCancelled` |
| `invoice.payment_succeeded` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` | `handleSubscriptionPaymentSucceeded` |
| `invoice.payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` | `handleSubscriptionPaymentFailed` |
| `payment_intent.succeeded` | `PAYMENT_SUCCEEDED` | `handlePaymentSucceeded` |
| `payment_intent.payment_failed` | `PAYMENT_FAILED` | `handlePaymentFailed` |
| `customer.subscription.trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` | `handleSubscriptionTrialEnding` |
| `billing_portal.session.updated` | `BILLING_PORTAL_SESSION_UPDATED` | Solo registrazione |

## Flusso di Elaborazione del Webhook

```
Stripe invia POST -> Legge il corpo grezzo -> Estrae header stripe-signature
  -> stripeProvider.handleWebhook(body, signature)
    -> stripe.webhooks.constructEvent() (verifica firma)
    -> Mappa il tipo di evento al tipo interno
    -> Restituisce { received: true, type, id, data }
  -> Switch sul webhookResult.type
    -> Chiama il gestore appropriato
    -> Il gestore aggiorna il DB + invia email
  -> Restituisce { received: true }
```

## Gestori degli Eventi

### Abbonamento Creato

Gestisce la creazione di un nuovo abbonamento:

1. Verifica se l'abbonamento è uno sponsor ad (gestione speciale)
2. Chiama `webhookSubscriptionService.handleSubscriptionCreated(data)` per aggiornare il database
3. Estrae le informazioni sul piano (nome, importo, periodo di fatturazione)
4. Invia un'email di benvenuto con i dettagli dell'abbonamento e le funzionalità

### Abbonamento Aggiornato

Gestisce i cambiamenti dell'abbonamento (upgrade, downgrade del piano, ecc.):

1. Aggiorna il database tramite `webhookSubscriptionService.handleSubscriptionUpdated(data)`
2. Estrae le informazioni aggiornate sul piano
3. Invia un'email di notifica dell'aggiornamento

### Abbonamento Annullato

Gestisce gli annullamenti degli abbonamenti:

1. Verifica la presenza di abbonamenti sponsor ad
2. Aggiorna il database tramite `webhookSubscriptionService.handleSubscriptionCancelled(data)`
3. Invia un'email di annullamento con il motivo e l'URL di riattivazione

### Pagamento Riuscito (Una Tantum)

Gestisce i pagamenti una tantum avvenuti con successo:

1. Estrae le informazioni del cliente e i dettagli del pagamento
2. Formatta l'importo e il metodo di pagamento
3. Invia un'email di conferma del pagamento con l'URL della ricevuta

### Pagamento Fallito

Gestisce i pagamenti una tantum falliti:

1. Estrae le informazioni sull'errore da `last_payment_error`
2. Costruisce gli URL per il nuovo tentativo e l'aggiornamento del metodo di pagamento
3. Invia un'email di notifica del fallimento del pagamento

### Pagamento Abbonamento Riuscito

Gestisce i pagamenti ricorrenti dell'abbonamento avvenuti con successo:

1. Aggiorna il database tramite `webhookSubscriptionService.handleSubscriptionPaymentSucceeded(data)`
2. Estrae i dettagli della fattura e dell'abbonamento
3. Invia un'email con la ricevuta del pagamento dell'abbonamento

### Pagamento Abbonamento Fallito

Gestisce i pagamenti ricorrenti dell'abbonamento falliti:

1. Aggiorna il database tramite `webhookSubscriptionService.handleSubscriptionPaymentFailed(data)`
2. Invia una notifica di fallimento con URL per il nuovo tentativo e l'aggiornamento del pagamento

### Fine del Trial

Gestisce le notifiche di fine trial (3 giorni prima) inviate da Stripe:

1. Aggiorna il database tramite `webhookSubscriptionService.handleSubscriptionTrialEnding(data)`
2. Invia un'email di promemoria della fine del trial

## Notifiche Email

Ogni gestore usa `paymentEmailService` per inviare email transazionali. La configurazione email viene caricata in modo sicuro tramite `getEmailConfig()`:

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

| Evento | Template Email |
|--------|----------------|
| Abbonamento creato | `sendNewSubscriptionEmail` |
| Abbonamento aggiornato | `sendUpdatedSubscriptionEmail` |
| Abbonamento annullato | `sendCancelledSubscriptionEmail` |
| Pagamento riuscito | `sendPaymentSuccessEmail` |
| Pagamento fallito | `sendPaymentFailedEmail` |
| Pagamento abbonamento riuscito | `sendSubscriptionPaymentSuccessEmail` |
| Pagamento abbonamento fallito | `sendSubscriptionPaymentFailedEmail` |
| Fine trial | `sendUpdatedSubscriptionEmail` |

## Gestione degli Sponsor Ad

Il webhook include una gestione speciale per gli abbonamenti sponsor ad. Questi vengono identificati controllando i metadati:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const metadata = data.metadata as Record<string, string> | undefined;
  return metadata?.type === 'sponsor_ad';
}
```

Gli eventi sponsor ad attivano:
- **Attivazione**: Conferma il pagamento e imposta l'annuncio in attesa di revisione da parte dell'amministratore
- **Annullamento**: Disattiva lo sponsor ad
- **Rinnovo**: Estende la data di fine dello sponsor ad

## Funzionalità del Piano

La funzione `getSubscriptionFeatures` mappa i nomi dei piani agli elenchi di funzionalità usati nelle email di benvenuto:

```typescript
const features: Record<string, string[]> = {
  'Free Plan': ['Access to basic features', 'Email support', 'Limited storage'],
  'Standard Plan': ['All advanced features', 'Priority support', 'Unlimited storage', ...],
  'Premium Plan': ['All Pro features', 'Dedicated support', 'Custom features', ...]
};
```

## Gestione degli Errori

L'endpoint webhook segue un pattern resiliente:

- Ogni gestore individuale è racchiuso nel proprio blocco try/catch
- I fallimenti dei gestori vengono registrati ma non causano la restituzione di un errore da parte del webhook
- Il try/catch esterno cattura gli errori di verifica della firma e di parsing
- Restituisce `400` per tutti i fallimenti a livello di webhook per indicare a Stripe di non riprovare in caso di errori permanenti

```typescript
try {
  // ... verifica firma e invio degli eventi
  return NextResponse.json({ received: true });
} catch (error) {
  console.error('Webhook error:', error);
  return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
}
```

## Requisiti di Configurazione

| Variabile | Richiesta | Descrizione |
|-----------|-----------|-------------|
| `STRIPE_SECRET_KEY` | Sì | Chiave API segreta di Stripe |
| `STRIPE_WEBHOOK_SECRET` | Sì | Segreto di firma del webhook (dal Dashboard Stripe) |

Per configurare il webhook nel Dashboard Stripe:

1. Navigare su Developers > Webhooks
2. Aggiungere l'URL dell'endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Selezionare gli eventi elencati nella tabella di mappatura degli eventi sopra
4. Copiare il segreto di firma in `STRIPE_WEBHOOK_SECRET`

## Considerazioni sulla Sicurezza

- La verifica della firma è obbligatoria; le richieste senza firme valide vengono rifiutate
- Il corpo grezzo della richiesta viene utilizzato per la verifica della firma (non il JSON parsato)
- I segreti webhook non devono mai essere committati nel controllo versione
- L'endpoint non richiede l'autenticazione di sessione (Stripe lo chiama direttamente)
- I dati sensibili nei messaggi di errore vengono sanificati per gli ambienti di produzione

## Pagine Correlate

- [Approfondimento Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Approfondimento Abbonamenti Stripe](./stripe-subscription-deep-dive.md)
- [Approfondimento Metodi di Pagamento Stripe](./stripe-payment-methods-deep-dive.md)
- [Architettura del Provider di Pagamento](./payment-provider-architecture.md)
