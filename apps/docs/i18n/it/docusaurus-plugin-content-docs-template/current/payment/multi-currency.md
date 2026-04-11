---
id: multi-currency
title: Integrazione multivaluta
sidebar_label: Multivaluta
sidebar_position: 5
---

# Guida all'integrazione multivaluta

Questo documento spiega come il sistema multivaluta è integrato nell'applicazione e come funziona con i fornitori di pagamenti (Stripe, LemonSqueezy e Polar).

## Architettura

Il sistema multivaluta funziona a più livelli:

1. **Configurazione base** ( `lib/types.ts` ): configurazione predefinita con supporto multivaluta
2. **ConfigProvider** ( `app/[locale]/config.tsx` ): arricchisce la configurazione con la valuta dell'utente
3. **Checkout Hooks**: utilizza configurazioni multi-valuta per ottenere gli ID prezzo corretti

## Flusso di dati

```
CurrencyProvider (user currency)
    ↓
ConfigProvider (enriches config.pricing with currency)
    ↓
usePricingSection / useCreateCheckoutSession
    ↓
getStripePriceConfig / getLemonSqueezyPriceConfig (currency + plan)
    ↓
Correct Price ID for the user's currency
```

## File modificati

### 1. `app/[locale]/config.tsx` - Utilizza `useCurrencyContext()` per ottenere la valuta dell'utente
- Genera automaticamente una configurazione dei prezzi in base alla valuta se non viene fornita alcuna configurazione
- Utilizza `getDefaultPricingConfigWithCurrency()` per creare una configurazione multi-valuta

### 2. `hooks/use-create-checkout.ts` - Usa `useCurrencyContext()` per ottenere la valuta
- Chiama `getStripePriceConfig()` per ottenere l'ID prezzo corretto in base alla valuta
- Torna a `plan.stripePriceId` se la configurazione multivaluta non è disponibile

### 3. `hooks/use-pricing-section.ts` - Usa `useCurrencyContext()` per ottenere la valuta
- Chiama `getLemonSqueezyPriceConfig()` per LemonSqueezy
- Utilizza ID prezzo basati sulla valuta al momento del pagamento

## Utilizzo

### Per gli sviluppatori

Il sistema funziona automaticamente. Non sono necessarie modifiche ai componenti esistenti.

**Esempio di utilizzo in un componente:**

```tsx
import { useConfig } from '@/app/[locale]/config';
import { useCurrencyContext } from '@/components/context/currency-provider';

function PricingComponent() {
  const config = useConfig();
  const { currency } = useCurrencyContext();
  
  // config.pricing is automatically enriched with the user's currency
  // Price IDs are based on the user's currency
  const standardPlan = config.pricing?.plans.STANDARD;
  
  // Currency symbol is automatically updated
  const currencySymbol = config.pricing?.currency; // €, £, $, etc.
}
```

### Per i ganci di pagamento

Gli hook di checkout utilizzano automaticamente configurazioni multi-valuta:

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## Configurazione delle variabili d'ambiente

Affinché il sistema funzioni, è necessario configurare le variabili di ambiente per ciascuna valuta in:

- `lib/config/billing/stripe.config.ts` : variabili `NEXT_PUBLIC_STRIPE_*_PRICE_ID_*` - `lib/config/billing/lemonsqueezy.config.ts` : `NEXT_PUBLIC_LEMONSQUEEZY_*_PRICE_ID_*` variabili

**Esempio per Strisce:**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## Valute supportate

Le valute supportate sono definite in `lib/config/billing/types.ts` :

- USD, EUR, GBP, CAD (configurati nelle configurazioni di fatturazione)
- Altre valute ISO 4217 (fallback in USD)

## Ripiego

Se una valuta non è supportata o se le configurazioni multivaluta non sono disponibili:

1. Il sistema utilizza `plan.stripePriceId` / `plan.lemonVariantId` (configurazione statica)
2. La valuta predefinita è USD
3. Il simbolo predefinito è $

## Test

Per testare il sistema multivaluta:

1. Modificare la valuta dell'utente tramite `/api/user/currency` 2. Verificare che gli ID prezzo cambino in base alla valuta
3. Prova il pagamento con valute diverse

## Note importanti

- Gli ID prezzo vengono risolti **al momento del pagamento**, non al momento della visualizzazione
- La configurazione dei prezzi in `content/config.yml` ha la priorità sulla configurazione predefinita
- Le configurazioni multivaluta vengono utilizzate solo se sono configurate variabili di ambiente

## Integrazione con i fornitori di pagamenti

Il sistema multivaluta funziona perfettamente con tutti i fornitori di pagamenti:

- **Stripe**: utilizza `getStripePriceConfig()` per ottenere ID prezzo specifici per la valuta
- **LemonSqueezy**: utilizza `getLemonSqueezyPriceConfig()` per ottenere ID variante specifici per la valuta
- **Polar**: supporta multivaluta attraverso la configurazione del prodotto

Per la configurazione dettagliata specifica del provider, vedere:
- [Configurazione strisce](./stripe)
- [Configurazione LemonSqueezy](./lemonsqueezy)
- [Configurazione polare](./polare)
