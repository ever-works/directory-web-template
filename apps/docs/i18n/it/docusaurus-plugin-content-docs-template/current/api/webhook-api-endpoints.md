---
id: webhook-api-endpoints
title: "Endpoint API Webhook"
sidebar_label: "Webhook"
---

# Endpoint API Webhook

Il template supporta gestori webhook per quattro provider di pagamento: Stripe, LemonSqueezy, Polar e Solidgate. Ogni endpoint webhook elabora gli eventi in arrivo dal rispettivo provider di pagamento, gestendo la gestione del ciclo di vita degli abbonamenti, le notifiche di pagamento e la consegna delle email. Tutti gli endpoint verificano le firme delle richieste per la sicurezza.

## Panoramica

| Endpoint | Provider | Header Firma | Descrizione |
|---|---|---|---|
| `/api/stripe/webhook` | Stripe | `stripe-signature` | Elabora eventi di pagamento e abbonamento Stripe |
| `/api/lemonsqueezy/webhook` | LemonSqueezy | `x-signature` | Elabora eventi di pagamento LemonSqueezy |
| `/api/polar/webhook` | Polar | `webhook-signature` | Elabora eventi di pagamento Polar |
| `/api/solidgate/webhook` | Solidgate | `x-signature` | Elabora eventi di pagamento Solidgate |

Tutti gli endpoint webhook accettano solo richieste POST e restituiscono `{"received": true}` in caso di successo.

## Architettura Condivisa

Tutti e quattro i gestori webhook seguono lo stesso schema generale:

1. Legge il corpo grezzo della richiesta come testo (necessario per la verifica della firma)
2. Estrae la firma dagli header specifici del provider
3. Passa il corpo e la firma al metodo `handleWebhook()` del provider per la verifica e il parsing
4. Instrada l'evento parsato al gestore appropriato in base al `WebhookEventType`
5. Esegue la logica di business (aggiornamenti del database, notifiche email)
6. Restituisce `{"received": true}` per confermare la ricezione del webhook

### Tipi di Evento Comuni

L'enum `WebhookEventType` di `lib/payment/types/payment-types` standardizza gli eventi tra i provider:

| Tipo di Evento | Descrizione |
|---|---|
| `SUBSCRIPTION_CREATED` | Nuovo abbonamento attivato |
| `SUBSCRIPTION_UPDATED` | Piano o dettagli dell'abbonamento modificati |
| `SUBSCRIPTION_CANCELLED` | Abbonamento annullato |
| `PAYMENT_SUCCEEDED` | Pagamento una tantum completato |
| `PAYMENT_FAILED` | Tentativo di pagamento fallito |
| `SUBSCRIPTION_PAYMENT_SUCCEEDED` | Pagamento ricorrente dell'abbonamento completato |
| `SUBSCRIPTION_PAYMENT_FAILED` | Pagamento ricorrente dell'abbonamento fallito |
| `SUBSCRIPTION_TRIAL_ENDING` | Periodo di trial in scadenza |
| `REFUND_SUCCEEDED` | Rimborso elaborato |
| `BILLING_PORTAL_SESSION_UPDATED` | Sessione del portale di fatturazione modificata (solo Stripe) |

## Webhook Stripe

```
POST /api/stripe/webhook
```

Elabora gli eventi webhook Stripe con verifica della firma tramite l'header `stripe-signature`. Questo è il gestore webhook più completo, incluse le notifiche email per tutti i tipi di evento e la gestione degli abbonamenti sponsor ad.

**Header Richiesto:**

| Header | Descrizione |
|---|---|
| `stripe-signature` | Firma webhook Stripe (formato `t=...,v1=...`) |

**Eventi Supportati:**

| Evento Stripe | Tipo Mappato | Azioni |
|---|---|---|
| `customer.subscription.created` | `SUBSCRIPTION_CREATED` | Aggiornamento DB, email di benvenuto |
| `customer.subscription.updated` | `SUBSCRIPTION_UPDATED` | Aggiornamento DB, email di aggiornamento |
| `customer.subscription.deleted` | `SUBSCRIPTION_CANCELLED` | Aggiornamento DB, email di annullamento |
| `invoice.payment_succeeded` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` | Aggiornamento DB, email ricevuta |
| `invoice.payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` | Aggiornamento DB, email per nuovo tentativo |
| `payment_intent.succeeded` | `PAYMENT_SUCCEEDED` | Email di conferma |
| `payment_intent.payment_failed` | `PAYMENT_FAILED` | Email di notifica fallimento |
| `customer.subscription.trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` | Email fine trial |
| `billing_portal.session.updated` | `BILLING_PORTAL_SESSION_UPDATED` | Solo registrazione |

**Gestione degli Sponsor Ad:**

I webhook Stripe rilevano gli abbonamenti sponsor ad tramite `metadata.type === "sponsor_ad"` nei dati dell'abbonamento. Quando rilevati, gestori dedicati attivano, annullano o rinnovano gli sponsor ad invece di elaborare abbonamenti regolari.

**Risposte di Errore:**

| Stato | Condizione |
|---|---|
| 400 | Header `stripe-signature` mancante |
| 400 | Webhook non elaborato (firma non valida) |
| 400 | Elaborazione webhook fallita |

**Sorgente:** `template/app/api/stripe/webhook/route.ts`

## Webhook LemonSqueezy

```
POST /api/lemonsqueezy/webhook
```

Elabora gli eventi webhook LemonSqueezy con verifica della firma tramite l'header `x-signature`. Usa una funzione di mappatura degli eventi per tradurre i nomi degli eventi specifici di LemonSqueezy nel `WebhookEventType` generico.

**Header Richiesto:**

| Header | Descrizione |
|---|---|
| `x-signature` | Firma webhook LemonSqueezy |

**Mappatura degli Eventi:**

| Evento LemonSqueezy | Tipo Mappato |
|---|---|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_payment_success` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` |
| `subscription_trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `REFUND_SUCCEEDED` |

**Gestione degli Sponsor Ad:**

LemonSqueezy usa `custom_data.type === "sponsor_ad"` o `meta.custom_data.type === "sponsor_ad"` per identificare gli abbonamenti sponsor ad.

**Sorgente:** `template/app/api/lemonsqueezy/webhook/route.ts`

## Webhook Polar

```
POST /api/polar/webhook
```

Elabora gli eventi webhook Polar con verifica della firma multi-header. Polar usa tre header per la verifica della sicurezza e delega l'instradamento degli eventi a un modulo router separato.

**Header Richiesti:**

| Header | Descrizione |
|---|---|
| `webhook-signature` | Firma HMAC SHA256 (formato `v1,<hex_signature>`) |
| `webhook-timestamp` | Timestamp Unix dell'evento webhook |
| `webhook-id` | Identificatore univoco per la consegna del webhook |

**Eventi Supportati:**

| Evento Polar | Descrizione |
|---|---|
| `checkout.succeeded` | Checkout completato |
| `checkout.failed` | Checkout fallito |
| `subscription.created` | Abbonamento creato |
| `subscription.updated` | Abbonamento aggiornato |
| `subscription.canceled` | Abbonamento annullato |
| `invoice.paid` | Pagamento fattura completato |
| `invoice.payment_failed` | Pagamento fattura fallito |

**Elaborazione:**

A differenza degli altri provider, il gestore webhook Polar usa una funzione `routeWebhookEvent()` separata da un modulo `router` e un'utility `validateWebhookPayload()` per la validazione della struttura del payload prima della verifica della firma.

**Sorgente:** `template/app/api/polar/webhook/route.ts`

## Webhook Solidgate

```
POST /api/solidgate/webhook
```

Elabora gli eventi webhook Solidgate con verifica della firma. Include protezione idempotente in memoria per prevenire l'elaborazione duplicata dello stesso evento webhook.

**Header Richiesto:**

| Header | Descrizione |
|---|---|
| `x-signature` o `solidgate-signature` | Firma webhook Solidgate |

**Idempotenza:**

Il gestore mantiene un `Set` in memoria degli ID webhook elaborati. I webhook duplicati restituiscono `{"received": true}` senza rielaborazione. Gli ID webhook scadono dalla cache dopo 24 ore.

**Nota:** La cache di idempotenza in memoria non persiste tra le invocazioni di funzioni serverless. In ambienti serverless di produzione, dovrebbe essere sostituita con Redis o una soluzione basata su database.

**Eventi Supportati:**

Il gestore accetta sia le costanti generiche `WebhookEventType` che i nomi di evento basati su stringhe (ad es. sia `WebhookEventType.PAYMENT_SUCCEEDED` che `"payment_succeeded"`).

| Evento | Azioni |
|---|---|
| `payment_succeeded` | Registra pagamento |
| `payment_failed` | Registra fallimento |
| `subscription_created` | Crea abbonamento |
| `subscription_updated` | Aggiorna abbonamento |
| `subscription_cancelled` | Annulla abbonamento |
| `subscription_payment_succeeded` | Registra pagamento abbonamento |
| `subscription_payment_failed` | Registra fallimento pagamento abbonamento |
| `subscription_trial_ending` | Gestisce fine del trial |
| `refund_processed` | Registra rimborso |

**Endpoint GET:**

Solidgate espone anche un gestore GET che restituisce un messaggio informativo sull'endpoint webhook:

```json
{
  "message": "Solidgate webhook endpoint",
  "instructions": "This endpoint accepts POST requests from Solidgate webhooks",
  "method": "POST"
}
```

**Sorgente:** `template/app/api/solidgate/webhook/route.ts`

## Notifiche Email

Il gestore webhook Stripe invia le notifiche email più complete. Tutti i provider delegano al `WebhookSubscriptionService` per le operazioni sul database, ma i template email variano per provider.

| Tipo di Email | Trigger |
|---|---|
| Benvenuto / Nuovo Abbonamento | Abbonamento creato |
| Aggiornamento Abbonamento | Piano dell'abbonamento modificato |
| Conferma Annullamento | Abbonamento annullato |
| Ricevuta Pagamento | Pagamento abbonamento o una tantum riuscito |
| Pagamento Fallito / Nuovo Tentativo | Tentativo di pagamento fallito |
| Fine Trial | Periodo di trial in scadenza |

La configurazione email viene caricata da `lib/config/server-config` tramite `getEmailConfig()` e include nome dell'azienda, URL dell'azienda e indirizzo email del supporto.

## Dettagli Implementativi Chiave

- **Verifica della Firma:** Tutti i provider verificano le firme webhook prima di elaborare gli eventi. Le firme non valide comportano una risposta 400.
- **Parsing del Corpo Grezzo:** I webhook leggono il corpo della richiesta come testo usando `request.text()` anziché `request.json()` perché la verifica della firma richiede il payload grezzo e non modificato.
- **WebhookSubscriptionService:** La classe condivisa `WebhookSubscriptionService` gestisce le operazioni sul database per gli eventi del ciclo di vita degli abbonamenti tra tutti i provider.
- **Rilevamento Sponsor Ad:** I webhook Stripe e LemonSqueezy rilevano gli abbonamenti sponsor ad tramite i metadati e li instradano a gestori separati per l'attivazione, l'annullamento e il rinnovo degli annunci.
- **Gestione Graceful degli Errori:** I fallimenti nell'invio delle email vengono intercettati e registrati ma non causano la restituzione di un errore da parte del webhook. Il webhook conferma sempre la ricezione per prevenire i tentativi ripetuti del provider.
