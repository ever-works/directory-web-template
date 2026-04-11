---
id: payment-config
title: "Configurazione Pagamenti"
sidebar_label: "Pagamenti"
sidebar_position: 12
---

# Configurazione Pagamenti

Il template supporta più provider di pagamento e flussi di fatturazione flessibili. Questo riferimento copre ogni costante, enum e opzione di configurazione relativa ai pagamenti.

## Costanti di Pagamento

Tutti gli enum e i tipi di pagamento principali sono definiti in `lib/constants/payment.ts`. Questo file viene mantenuto intenzionalmente separato dal modulo di configurazione principale in modo da poter essere importato in script che vengono eseguiti al di fuori del runtime di Next.js (migrazioni, seed, strumenti CLI).

### PaymentFlow

Determina quando il pagamento viene raccolto rispetto al processo di invio.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| Valore | Descrizione |
|--------|-------------|
| `pay_at_start` | L'utente paga prima di inviare; l'elemento viene pubblicato immediatamente |
| `pay_at_end` | L'utente invia prima; il pagamento viene raccolto dopo l'approvazione dell'amministratore |

### PaymentStatus

Tiene traccia dello stato di un tentativo di pagamento.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

Opzioni di frequenza di fatturazione.

```typescript
export enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### PaymentPlan

Livelli di abbonamento disponibili.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

Gateway di pagamento supportati.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## Schema di Configurazione Pagamenti

Definito in `lib/config/schemas/payment.schema.ts` e validato all'avvio con Zod.

### Prezzi Prodotto (Valori Visualizzati)

```typescript
pricing: {
  free: number;       // Predefinito: 0
  standard: number;   // Predefinito: 10
  premium: number;    // Predefinito: 20
}
```

| Variabile d'ambiente | Campo | Predefinito |
|----------------------|-------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### Configurazione Prova

| Variabile d'ambiente | Campo | Descrizione |
|----------------------|-------|-------------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | ID prezzo per prova standard |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | ID prezzo per prova premium |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | Abilita importi prova (`true`/`false`) |

## Configurazione Provider

### Stripe

Abilitato automaticamente quando sono presenti sia `secretKey` che `publishableKey`.

| Variabile d'ambiente | Richiesto | Descrizione |
|----------------------|-----------|-------------|
| `STRIPE_SECRET_KEY` | Sì | Chiave API lato server |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Sì | Chiave pubblicabile lato client |
| `STRIPE_WEBHOOK_SECRET` | Consigliato | Verifica firma webhook |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | No | ID prezzo per piano gratuito |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | No | ID prezzo per piano standard |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | No | ID prezzo per piano premium |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | No | Imposta `true` per recuperare i prezzi dall'API Stripe |

### LemonSqueezy

Abilitato automaticamente quando sono presenti sia `apiKey` che `storeId`.

| Variabile d'ambiente | Richiesto | Descrizione |
|----------------------|-----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Sì | Chiave API dal dashboard LemonSqueezy |
| `LEMONSQUEEZY_STORE_ID` | Sì | Il tuo identificatore store |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Consigliato | Verifica firma webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | No | Sovrascrivere l'URL endpoint webhook |
| `LEMONSQUEEZY_TEST_MODE` | No | Imposta `true` per modalità test |
| `LEMONSQUEEZY_VARIANT_ID` | No | ID variante predefinito |

### Polar

Abilitato automaticamente quando sono presenti sia `accessToken` che `organizationId`.

| Variabile d'ambiente | Richiesto | Descrizione |
|----------------------|-----------|-------------|
| `POLAR_ACCESS_TOKEN` | Sì | Token di accesso API |
| `POLAR_ORGANIZATION_ID` | Sì | Identificatore organizzazione |
| `POLAR_WEBHOOK_SECRET` | Consigliato | Verifica firma webhook |
| `POLAR_SANDBOX` | No | Imposta `false` per produzione (predefinito: `true`) |
| `POLAR_API_URL` | No | Sovrascrivere l'URL base API |

### Solidgate

Richiede la configurazione manuale delle variabili d'ambiente.

| Variabile d'ambiente | Richiesto | Descrizione |
|----------------------|-----------|-------------|
| `SOLIDGATE_API_KEY` | Sì | Chiave API |
| `SOLIDGATE_SECRET_KEY` | Sì | Chiave segreta per la firma |
| `SOLIDGATE_WEBHOOK_SECRET` | Sì | Verifica webhook |
| `SOLIDGATE_MERCHANT_ID` | Sì | Identificatore commerciante |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | No | Chiave lato client |

## Fatturazione Multi-valuta

Ogni provider supporta prezzi per valuta tramite i moduli di configurazione di fatturazione in `lib/config/billing/`.

### Tipi di Configurazione Fatturazione

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // ID prezzo/variante per fatturazione mensile
  yearly?: string;    // ID prezzo/variante per fatturazione annuale
  setupFee?: string;  // ID prezzo commissione di attivazione opzionale
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // Codice ISO 4217 (es. 'USD')
  symbol?: string;    // Simbolo di visualizzazione (es. '$')
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### Valute Supportate

L'array `SUPPORTED_CURRENCIES` in `lib/config/billing/types.ts` elenca tutti i 32 codici ISO 4217 accettati dal sistema (USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF e altri).

### Funzioni di Risoluzione Prezzi

Ogni provider esporta una funzione di configurazione prezzi:

| Provider | Funzione | Sorgente |
|----------|----------|---------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

Tutte le funzioni ricadono su USD se la valuta richiesta non è configurata.

## Configurazione Flusso di Pagamento

Definito in `lib/config/payment-flows.ts`, l'array `PAYMENT_FLOWS` configura le due opzioni di flusso di pagamento con le loro proprietà UI:

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // Nome icona Lucide
  color: string;           // Classi gradiente Tailwind
  features: string[];      // Punti elenco delle funzionalità
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // Etichetta badge opzionale
  isDefault?: boolean;     // Se questo è il flusso predefinito
}
```

Funzioni helper:
- `getDefaultPaymentFlow()` -- restituisce il valore `PaymentFlow` predefinito
- `getPaymentFlowConfig(flowId)` -- restituisce il `PaymentFlowConfig` per un determinato flusso

## Payment Provider Manager

La classe `PaymentProviderManager` in `lib/payment/config/payment-provider-manager.ts` fornisce accesso singleton alle istanze dei provider:

```typescript
// Ottieni un provider specifico
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// O usa la funzione generica
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## Pagine Correlate

- [Tipi di pagamento](../types/payment-types.md) -- definizioni di tipo per le operazioni di pagamento
- [Tipi di abbonamento](../types/subscription-types.md) -- tipi del ciclo di vita degli abbonamenti
- [Riferimento ambiente](./environment-reference.md) -- elenco completo delle variabili d'ambiente
