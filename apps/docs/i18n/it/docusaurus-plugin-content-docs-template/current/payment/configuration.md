---
id: configuration
title: Configurazione Pagamenti
sidebar_label: Guida alla Configurazione
sidebar_position: 6
description: Guida completa per configurare i provider di pagamento (Stripe, LemonSqueezy, Polar, Solidgate) con supporto multi-valuta
keywords: [pagamento, configurazione, stripe, lemonsqueezy, polar, solidgate, multi-valuta]
---

# Configurazione Pagamenti

Questa guida spiega come configurare i diversi provider di pagamento supportati dall'applicazione.

## Indice

- [Panoramica](#overview)
- [Provider supportati](#supported-providers)
- [Configurazione comune](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [Multi-valuta](#multi-currency)
- [Periodi di prova e commissioni di configurazione](#trials-and-setup-fees)
- [Selezione del provider](#provider-selection)
- [Risoluzione dei problemi](#troubleshooting)

---

## Panoramica

L'applicazione supporta più provider di pagamento per gli abbonamenti:

| Provider     | Tipo          | Multi-valuta   | Periodi di prova |
|--------------|---------------|----------------|--------|
| Stripe       | Abbonamento   | ✅ Sì          | ✅ Sì  |
| LemonSqueezy | Abbonamento   | ✅ Sì          | ✅ Sì  |
| Polar        | Abbonamento   | ❌ No          | ❌ No  |
| Solidgate    | Abbonamento   | ⚠️ Parziale   | ❌ No  |

### Piani disponibili

- **Gratuito** - Gratuito, funzionalità di base
- **Standard** - Piano intermedio con maggiore visibilità
- **Premium** - Piano completo con tutte le funzionalità

---

## Provider supportati

### Architettura

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # Esportazioni
│       ├── types.ts              # Tipi comuni
│       ├── stripe.config.ts      # Configurazione multi-valuta Stripe
│       ├── lemonsqueezy.config.ts # Configurazione multi-valuta LemonSqueezy
│       └── solidgate.config.ts   # Configurazione Solidgate (WIP)
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (WIP)
└── utils/
    └── payment-provider.ts       # Selezione del provider
```

---

## Configurazione comune

### Prezzi visualizzati (per l'UI)

Queste variabili definiscono i prezzi mostrati nell'interfaccia utente:

```bash
# Prezzi in dollari (o valuta principale) - solo per visualizzazione
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### Periodi di prova (periodo di prova)

```bash
# ID importi di prova (commissioni iniziali durante il periodo di prova)
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# Abilitare/disabilitare i periodi di prova con importo autorizzato
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### Prerequisiti

1. Creare un account su [Stripe Dashboard](https://dashboard.stripe.com)
2. Recuperare le chiavi API (Impostazioni → Chiavi API)
3. Configurare il webhook

### Variabili d'ambiente di base

```bash
# ============================================
# STRIPE - Configurazione di base
# ============================================

# Chiavi API (obbligatorio)
STRIPE_SECRET_KEY=sk_live_xxx           # Chiave segreta (server)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # Chiave pubblicabile
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Chiave pubblicabile (client)

# Webhook (obbligatorio per gli eventi)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Configurazione prodotto (Legacy - solo USD)

```bash
# Prezzi semplici (per compatibilità con le versioni precedenti, solo USD)
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### Configurazione multi-valuta (Consigliata)

#### Piano Standard

```bash
# ============================================
# STRIPE PIANO STANDARD
# ============================================

# ID prodotto
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# Prezzi mensili per valuta
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# Prezzi annuali per valuta
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# Commissioni di configurazione / importi di prova per valuta
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### Piano Premium

```bash
# ============================================
# STRIPE PIANO PREMIUM
# ============================================

# ID prodotto
NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

# Prezzi mensili per valuta
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

# Prezzi annuali per valuta
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

# Commissioni di configurazione / importi di prova per valuta
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### Creazione prezzi in Stripe

1. Vai su **Prodotti** → Crea un prodotto
2. Aggiungi prezzi per ogni valuta:
   - Clicca su "Aggiungi un altro prezzo"
   - Seleziona la valuta (EUR, GBP, CAD)
   - Imposta l'importo equivalente
3. Copia ogni `price_xxx` nelle variabili corrispondenti

### Webhook Stripe

Configura il webhook nel Stripe Dashboard:

- **URL**: `https://tuo-dominio.com/api/stripe/webhook`
- **Eventi da ascoltare**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### Prerequisiti

1. Creare un account su [LemonSqueezy](https://lemonsqueezy.com)
2. Creare un negozio
3. Creare prodotti e varianti

### Variabili d'ambiente

```bash
# ============================================
# LEMONSQUEEZY - Configurazione di base
# ============================================

# API (obbligatorio)
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx

# Webhook
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://tuo-dominio.com/api/lemonsqueezy/webhook

# Modalità test
LEMONSQUEEZY_TEST_MODE=false
```

### Configurazione varianti (Legacy)

```bash
# Varianti semplici
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx

# Varianti con commissione di configurazione (per periodi di prova)
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### Configurazione multi-valuta

#### Piano Standard

```bash
# ============================================
# LEMONSQUEEZY PIANO STANDARD
# ============================================

# ID prodotto
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx

# Prezzi mensili per valuta
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx

# Prezzi annuali per valuta
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx

# Commissioni di configurazione per valuta
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx
```

#### Piano Premium

```bash
# ============================================
# LEMONSQUEEZY PIANO PREMIUM
# ============================================

# ID prodotto
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx

# Prezzi mensili per valuta
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx

# Prezzi annuali per valuta
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx

# Commissioni di configurazione per valuta
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### Prerequisiti

1. Creare un account su [Polar](https://polar.sh)
2. Creare un'organizzazione
3. Creare piani di abbonamento

### Variabili d'ambiente

```bash
# ============================================
# POLAR - Configurazione
# ============================================

# API (obbligatorio)
POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx

# Webhook
POLAR_WEBHOOK_SECRET=xxx

# Modalità sandbox (true per test, false per produzione)
POLAR_SANDBOX=true

# URL API (opzionale, predefinito: api.polar.sh)
POLAR_API_URL=https://api.polar.sh

# ID piani
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx

# Importi di prova (opzionale)
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning In corso di sviluppo
L'integrazione Solidgate è attualmente in fase di sviluppo. Alcune funzionalità potrebbero non essere ancora completamente operative.
:::

### Prerequisiti

1. Creare un account su [Solidgate](https://solidgate.com)
2. Recuperare le credenziali API dal portale commerciante
3. Configurare l'endpoint webhook

### Variabili d'ambiente

```bash
# ============================================
# SOLIDGATE - Configurazione (WIP)
# ============================================

# Credenziali API (obbligatorio)
SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx

# Webhook
SOLIDGATE_WEBHOOK_SECRET=xxx

# Ambiente (test o live)
SOLIDGATE_ENVIRONMENT=test
```

### Configurazione prodotti

```bash
# ============================================
# PIANI SOLIDGATE (WIP)
# ============================================

# ID prodotti
NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx

# ID prezzi (attualmente solo USD)
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### Limitazioni attuali

| Funzionalità     | Stato          | Note                              |
|------------------|----------------|------------------------------------|
| Pagamenti di base | ✅ Implementato | Pagamenti una tantum e abbonamento |
| Multi-valuta     | ⚠️ Parziale   | Attualmente solo USD              |
| Periodi di prova | ❌ Non ancora  | Pianificato per una versione futura |
| Webhook          | ⚠️ Parziale   | Solo eventi di base               |
| Rimborsi         | ❌ Non ancora  | Pianificato per una versione futura |

---

## Multi-valuta

### Valute supportate

| Codice | Valuta           | Simbolo |
|------|------------------|--------|
| USD  | Dollaro USA      | $      |
| EUR  | Euro             | €      |
| GBP  | Sterlina britannica | £   |
| CAD  | Dollaro canadese | CA$    |

### Come funziona

1. La valuta dell'utente viene rilevata automaticamente (geolocalizzazione, preferenze)
2. Il sistema seleziona il `price_id` corrispondente alla valuta
3. Se la valuta non è configurata, si ricade su USD

### Esempio di utilizzo

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  
  // Recupera automaticamente l'ID prezzo corretto per la valuta
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      Abbonati per {priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## Periodi di prova e commissioni di configurazione

### Concetto

- **Periodo di prova**: Periodo di prova gratuito o scontato
- **Commissione di configurazione**: Commissioni iniziali all'inizio del periodo di prova

### Configurazione

```bash
# Abilitare i periodi di prova con importo autorizzato
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### Importante: Coerenza della valuta

:::caution
Tutti i prezzi in una sessione di checkout devono essere nella stessa valuta.
:::

Se si utilizzano periodi di prova con commissioni di configurazione, è necessario creare una commissione di configurazione per ogni valuta:

```bash
# ❌ ERRORE: Commissione di configurazione in USD + Prezzo principale in GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx  # USD
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP

# ✅ CORRETTO: Entrambi in GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx  # GBP
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP
```

---

## Selezione del provider

### Priorità

1. **Provider selezionato dall'utente** (Impostazioni)
2. **Provider predefinito** (configurazione)
3. **Fallback**: Stripe

### Configurazione del provider predefinito

Nel file di configurazione del sito:

```typescript
// Nella configurazione del sito
pricing: {
  provider: PaymentProvider.STRIPE  // o LEMONSQUEEZY, POLAR
}
```

### Esempio di utilizzo

```typescript
import { determinePaymentProvider } from '@/lib/utils/payment-provider';
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function PaymentComponent() {
  const { getActiveProvider } = useSelectedCheckoutProvider();
  const config = useConfig();
  
  const provider = determinePaymentProvider(
    getActiveProvider(),
    config.pricing?.provider
  );
  
  // provider = 'stripe' | 'lemonsqueezy' | 'polar' | 'solidgate'
}
```

---

## Risoluzione dei problemi

### Errore: Conflitto di valuta

```
Error: This price has currency=gbp, but other items use currency=usd
```

**Causa**: Il prezzo principale e la commissione di configurazione sono in valute diverse.

**Soluzione**: Creare commissioni di configurazione per ogni valuta supportata.

### Errore: ID prezzo non valido

```
Error: Invalid price ID
```

**Causa**: Il `price_id` non esiste o non è configurato.

**Soluzione**: Verificare che la variabile d'ambiente contenga un ID valido.

### Il webhook non riceve eventi

1. Controllare l'URL webhook nel dashboard del provider
2. Verificare che `WEBHOOK_SECRET` sia corretto
3. Testare con gli strumenti di debug del provider

### I prezzi non vengono visualizzati correttamente

1. Controllare `NEXT_PUBLIC_PRODUCT_PRICE_*` per i valori visualizzati
2. Verificare che i valori `price_id` corrispondano alle valute corrette
3. Riavviare il server di sviluppo dopo aver modificato i file `.env`
