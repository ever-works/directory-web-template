---
id: payment-endpoints
title: Endpoint API di Pagamento
sidebar_label: Endpoint di Pagamento
sidebar_position: 3
---

# Endpoint API di Pagamento

Il template supporta quattro provider di pagamento: **Stripe**, **Lemon Squeezy**, **Polar** e **Solidgate**. Ogni provider ha il proprio set di route API per il checkout, la gestione degli abbonamenti e la gestione dei webhook. Un gruppo generico `/api/payment` fornisce query sugli abbonamenti indipendenti dal provider.

## Stripe (`/api/stripe`)

Stripe è l'integrazione più completa con 17 handler di route che coprono checkout, abbonamenti, metodi di pagamento, setup intent e prodotti.

### Checkout

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/stripe/checkout` | Crea una sessione di Checkout Stripe |

### Abbonamenti

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/stripe/subscription` | Ottieni l'abbonamento attivo dell'utente corrente |
| `POST` | `/api/stripe/subscription` | Crea un nuovo abbonamento |
| `GET` | `/api/stripe/subscriptions` | Elenca tutti gli abbonamenti dell'utente |
| `POST` | `/api/stripe/subscription/[subscriptionId]/cancel` | Cancella un abbonamento |
| `POST` | `/api/stripe/subscription/[subscriptionId]/reactivate` | Riattiva un abbonamento cancellato |
| `POST` | `/api/stripe/subscription/[subscriptionId]/update` | Aggiorna l'abbonamento (cambia piano) |
| `POST` | `/api/stripe/subscription/portal` | Crea una sessione del Portale Cliente Stripe |

### Metodi di Pagamento

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/stripe/payment-methods/list` | Elenca i metodi di pagamento salvati |
| `POST` | `/api/stripe/payment-methods/create` | Aggiungi un nuovo metodo di pagamento |
| `PUT` | `/api/stripe/payment-methods/update` | Aggiorna il metodo di pagamento predefinito |
| `DELETE` | `/api/stripe/payment-methods/delete` | Rimuovi un metodo di pagamento |
| `GET` | `/api/stripe/payment-methods/[id]` | Ottieni i dettagli del metodo di pagamento |

### Setup Intent

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/stripe/setup-intent` | Crea un Setup Intent per salvare il metodo di pagamento |
| `GET` | `/api/stripe/setup-intent/[id]` | Ottieni lo stato del Setup Intent |

### Payment Intent

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/stripe/payment-intent` | Crea un Payment Intent una tantum |

### Prodotti

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/stripe/products` | Elenca i prodotti/prezzi Stripe disponibili |

### Webhook

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/stripe/webhook` | Handler degli eventi webhook Stripe |

L'handler del webhook Stripe elabora eventi quali:
- `checkout.session.completed` - Completamento del checkout
- `customer.subscription.created` - Nuovo abbonamento
- `customer.subscription.updated` - Modifiche all'abbonamento
- `customer.subscription.deleted` - Cancellazione dell'abbonamento
- `invoice.payment_succeeded` - Pagamento riuscito
- `invoice.payment_failed` - Pagamento fallito

## Lemon Squeezy (`/api/lemonsqueezy`)

Lemon Squeezy fornisce un modello di abbonamento più semplice con 7 endpoint.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/lemonsqueezy/checkout` | Crea un checkout Lemon Squeezy |
| `GET` | `/api/lemonsqueezy/list` | Elenca gli abbonamenti dell'utente |
| `POST` | `/api/lemonsqueezy/cancel` | Cancella un abbonamento |
| `POST` | `/api/lemonsqueezy/reactivate` | Riattiva un abbonamento cancellato |
| `POST` | `/api/lemonsqueezy/update` | Aggiorna i dettagli dell'abbonamento |
| `POST` | `/api/lemonsqueezy/update-plan` | Cambia il piano di abbonamento |
| `POST` | `/api/lemonsqueezy/webhook` | Handler del webhook Lemon Squeezy |

### Eventi Webhook

Il webhook Lemon Squeezy elabora:
- `subscription_created` - Nuovo abbonamento
- `subscription_updated` - Modifiche al piano
- `subscription_cancelled` - Cancellazione
- `subscription_payment_success` - Conferma del pagamento
- `subscription_payment_failed` - Fallimento del pagamento

## Polar (`/api/polar`)

Polar fornisce 5 endpoint per il checkout e la gestione degli abbonamenti.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/polar/checkout` | Crea una sessione di checkout Polar |
| `POST` | `/api/polar/subscription/[subscriptionId]/cancel` | Cancella abbonamento |
| `POST` | `/api/polar/subscription/[subscriptionId]/reactivate` | Riattiva abbonamento |
| `POST` | `/api/polar/subscription/portal` | Accedi al portale abbonamenti |
| `POST` | `/api/polar/webhook` | Handler del webhook Polar |

## Solidgate (`/api/solidgate`)

Solidgate è l'integrazione più minimale con 2 endpoint.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/solidgate/checkout` | Crea un checkout Solidgate |
| `POST` | `/api/solidgate/webhook` | Handler del webhook Solidgate |

## Pagamento Generico (`/api/payment`)

Endpoint di pagamento indipendenti dal provider per la gestione degli abbonamenti indipendentemente dal provider di pagamento sottostante.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/payment/[subscriptionId]` | Ottieni i dettagli dell'abbonamento per ID |
| `GET` | `/api/payment/account` | Ottieni l'account di pagamento per l'utente corrente |
| `GET` | `/api/payment/account/[userId]` | Ottieni l'account di pagamento per un utente specifico (admin) |

## Sicurezza dei Webhook

Tutti gli endpoint webhook implementano la verifica della firma specifica del provider:

### Stripe

I webhook Stripe verificano l'intestazione `stripe-signature` usando la variabile d'ambiente `STRIPE_WEBHOOK_SECRET` e il metodo `stripe.webhooks.constructEvent()`.

### Lemon Squeezy

I webhook Lemon Squeezy verificano l'intestazione `x-signature` usando HMAC-SHA256 con `LEMONSQUEEZY_WEBHOOK_SECRET`.

### Polar

I webhook Polar verificano le firme delle richieste usando `POLAR_WEBHOOK_SECRET`.

### Solidgate

I webhook Solidgate usano la verifica della firma integrata nell'SDK con `SOLIDGATE_SECRET_KEY`.

## Variabili d'Ambiente

### Stripe

| Variabile | Descrizione |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Chiave segreta API Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Chiave pubblicabile Stripe (lato client) |
| `STRIPE_WEBHOOK_SECRET` | Segreto per la firma del webhook |

### Lemon Squeezy

| Variabile | Descrizione |
|----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Chiave API Lemon Squeezy |
| `LEMONSQUEEZY_STORE_ID` | Identificatore del negozio |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Segreto per la firma del webhook |

### Polar

| Variabile | Descrizione |
|----------|-------------|
| `POLAR_ACCESS_TOKEN` | Token di accesso API Polar |
| `POLAR_WEBHOOK_SECRET` | Segreto per la firma del webhook |
| `POLAR_ORGANIZATION_ID` | Identificatore dell'organizzazione |

### Solidgate

| Variabile | Descrizione |
|----------|-------------|
| `SOLIDGATE_MERCHANT_ID` | Identificatore del merchant |
| `SOLIDGATE_SECRET_KEY` | Chiave segreta API |

## Requisiti di Autenticazione

| Tipo di Endpoint | Autenticazione Richiesta |
|--------------|---------------|
| Creazione checkout | Sì (utente autenticato) |
| Gestione abbonamenti | Sì (proprietario dell'abbonamento) |
| Gestione metodi di pagamento | Sì (cliente Stripe) |
| Elenco prodotti | Pubblico (prodotti Stripe) |
| Handler webhook | Verifica della firma (nessuna sessione) |
| Query pagamento generico | Sì (proprietario dell'account o admin) |
