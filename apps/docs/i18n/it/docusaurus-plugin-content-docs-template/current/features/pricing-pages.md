---
id: pricing-pages
title: Pagine prezzi e pagamento
sidebar_label: Pagine dei prezzi
sidebar_position: 19
---

# Pagine prezzi e pagamento

Il modello Ever Works include un sistema di pagine dei prezzi completo con supporto per il pagamento multi-provider (Stripe, LemonSqueezy, Polar), attivazione/disattivazione dell'intervallo di fatturazione, prezzi dinamici dai prodotti Stripe, formattazione della valuta, schede di confronto dei piani, sezioni degli annunci degli sponsor e flussi di pagamento incorporati o basati su reindirizzamento.

## Panoramica dell'architettura

| Componente | Percorso | Scopo |
|---|---|---|
| `usePricingFeatures` | `hooks/use-pricing-features.ts` | Configurazioni del piano, elenchi di funzionalità e getter di testo di azione |
| `usePricingSection` | `hooks/use-pricing-section.ts` | Orchestra tutto lo stato dei prezzi, il checkout e la logica di pagamento |
| `PricingSection` | `components/pricing/pricing-section.tsx` | Interfaccia utente completa della pagina dei prezzi con schede del piano e flusso di pagamento |
| `PlanCard` | `components/pricing/plan-card.tsx` | Scheda grafica del piano individuale |
| `PaymentFormModal` | `components/payment/stripe-payment-modal.tsx` | Modulo di pagamento integrato modale |
| `PaymentFlowSelectorModal` | `components/payment/` | Modalità di selezione del flusso (paga adesso vs. paga alla fine) |

## Configurazione del piano

Il sistema supporta tre livelli di piano configurati tramite `usePricingFeatures` :

| Piano | Testo dell'azione (accesso effettuato) | Testo dell'azione (non connesso) |
|---|---|---|
| `free` | "Inizia gratuitamente" | "Invia gratuitamente" |
| `standard` | "Aggiornamento a standard" | "Iscriviti ora" |
| `premium` | "Vai Premium" | "Iscriviti ora" |

### Interfaccia di configurazione del piano

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### Elenchi di funzionalità

Ogni piano ha un elenco di funzionalità digitate:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

| Piano | Conteggio funzionalità | Inclusioni notevoli |
|---|---|---|
| Gratuito | 9 caratteristiche | Invia prodotto, descrizione di base, un'immagine, collegamento al sito Web |
| Norma | 9 caratteristiche | Tutte le funzionalità gratuite, badge verificato, revisione prioritaria, statistiche mensili |
| Premio | 11 caratteristiche | Tutte le funzionalità standard, posizione sponsorizzata, homepage in primo piano, galleria illimitata |

## Il gancio `usePricingSection` Questo hook completo orchestra l'intera logica della pagina dei prezzi:

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### Stato

| Immobile | Digitare | Descrizione |
|---|---|---|
| `showSelector` | `boolean` | Se il selettore del flusso di pagamento è visibile |
| `billingInterval` | `PaymentInterval` | Intervallo di fatturazione attuale (mensile/annuale) |
| `processingPlan` | `string \| null` | ID del piano attualmente in elaborazione |
| `selectedPlan` | `PaymentPlan \| null` | Piano attualmente selezionato |
| `selectedFlow` | `PaymentFlow` | Tipo di flusso di pagamento (paga adesso o paga alla fine) |
| `isButton` | `boolean` | Indica se il flusso selezionato utilizza la modalità pulsante |

### Azioni

| Metodo | Descrizione |
|---|---|
| `setBillingInterval(interval)` | Passa dalla fatturazione mensile a quella annuale |
| `handleSelectPlan(plan)` | Seleziona un piano e avvisa il genitore tramite richiamata |
| `handleCheckout(plan)` | Avvia il checkout per una determinata configurazione del piano |
| `calculatePrice(plan)` | Calcola il prezzo in base all'intervallo di fatturazione e allo sconto annuale |
| `getSavingsText(plan)` | Ricevi un messaggio di risparmio annuale (ad esempio "Risparmia $ 24 all'anno") |
| `cancelCurrentProcess()` | Annulla il pagamento in corso e ripristina lo stato |
| `formatPrice(amount)` | Formato importo con simbolo di valuta |

### Calcolo del prezzo

L'hook calcola i prezzi in base all'intervallo di fatturazione:

```tsx
const calculatePrice = (plan: PricingConfig): number => {
  if (billingInterval !== PaymentInterval.YEARLY || !plan.annualDiscount) {
    return plan.price;
  }
  const annualPrice = plan.price * 12;
  const discountMultiplier = 1 - plan.annualDiscount / 100;
  return Math.round(annualPrice * discountMultiplier);
};
```

## Fornitori di servizi di pagamento

Il sistema supporta tre fornitori di pagamento, selezionati per configurazione o preferenza per utente:

| Fornitore | Gancio alla cassa | Supporto integrato |
|---|---|---|
| Striscia | `useCreateCheckoutSession` | Sì (SetupIntent) |
| LemonSqueezy | `useCheckoutButton` | Sì (sovrapposizione) |
| Polare | `usePolarCheckout` | Sì (URL incorporato) |

### Selezione del fornitore

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### Flusso di pagamento

Quando un utente fa clic sul pulsante di azione di un piano:

1. Verifica che l'utente abbia effettuato l'accesso (in caso contrario, apri la modalità di accesso)
2. Annulla qualsiasi processo di pagamento esistente
3. Determinare il fornitore di servizi di pagamento
4. Ottieni l'ID prezzo o l'ID variante in base alla valuta
5. Apri il modulo di pagamento incorporato o reindirizza al pagamento del fornitore

```tsx
const handleCheckout = async (plan: PricingConfig) => {
  if (!user?.id) {
    loginModal.onOpen('Please sign in to continue with your purchase.');
    return;
  }

  if (paymentProvider === PaymentProvider.LEMONSQUEEZY) {
    await lemonsqueezyHook.handleSubmitWithParams({ variantId, metadata, embedded });
  } else if (paymentProvider === PaymentProvider.POLAR) {
    await polarHook.createCheckoutSession(priceId, user, plan, billingInterval);
  } else if (paymentProvider === PaymentProvider.STRIPE) {
    await stripeHook.createCheckoutSession(plan, user, billingInterval);
  }
};
```

## Prezzi dinamici (Stripe)

Quando Stripe è il fornitore attivo e i prezzi dinamici sono abilitati, l'hook recupera i dati del prodotto in tempo reale:

```tsx
const isDynamicPricingEnabled = paymentProvider === PaymentProvider.STRIPE
  && isStripeDynamicPricingEnabled();

const { data: stripeProductsData } = useStripeProducts({
  enabled: isDynamicPricingEnabled && !isReview
});

// Merge: dynamic values override static, but keep static as fallback
const { FREE, STANDARD, PREMIUM } = useMemo(() => {
  if (isDynamicPricingEnabled && stripeProductsData?.products?.length) {
    const dynamicPlans = mapStripeProductsToPricingPlans(stripeProductsData.products, currency);
    return {
      FREE: dynamicPlans.FREE ?? staticPlans.FREE,
      STANDARD: dynamicPlans.STANDARD ?? staticPlans.STANDARD,
      PREMIUM: dynamicPlans.PREMIUM ?? staticPlans.PREMIUM
    };
  }
  return staticPlans;
}, [isDynamicPricingEnabled, stripeProductsData, staticPlans, currency]);
```

## Supporto valutario

Il sistema dei prezzi supporta la visualizzazione multivaluta:

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

Gli ID delle varianti sensibili alla valuta vengono risolti tramite funzioni di configurazione specifiche del provider:

| Fornitore | Funzione di configurazione |
|---|---|
| LemonSqueezy | `getLemonSqueezyPriceConfig(planName, currency, interval)` |
| Polare | `getPolarPriceConfig(planName, currency, interval)` |

## Modulo di Pagamento Modale

Il modulo di pagamento incorporato supporta tutti e tre i fornitori:

```tsx
<PaymentFormModal
  isOpen={paymentForm.isOpen}
  onClose={paymentForm.closePaymentForm}
  onSuccess={paymentForm.onPaymentSuccess}
  onError={paymentForm.onPaymentError}
  planName={paymentForm.planForPayment?.name}
  planPrice={formatPrice(calculatePrice(paymentForm.planForPayment))}
  amount={calculatePrice(paymentForm.planForPayment)}
  currency={currency}
  clientSecret={clientSecret}
  checkoutUrl={paymentForm.checkoutUrl}
  provider={provider}
  theme={theme}
/>
```

## Componente della sezione prezzi

Il componente `PricingSection` visualizza la pagina completa dei prezzi:

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### Caratteristiche visive

| Caratteristica | Descrizione |
|---|---|
| Attiva/disattiva intervallo di fatturazione | Dispositivo di scorrimento animato tra mensile e annuale |
| Griglia delle carte del piano | Layout reattivo da 1 colonna (mobile) a 3 colonne (desktop) |
| Distintivo popolare | Il piano standard è contrassegnato come "popolare" con effetti luminosi |
| Badge di risparmio | Pillole verdi che mostrano i risparmi annuali quando applicabili |
| Indicatori di fiducia | Icone per "Nessun costo nascosto", "Attivazione istantanea", "Supporto Premium" |
| Sezione annunci sponsor | Cerchi radar animati con prezzi per il posizionamento sponsorizzato |
| Continua la sezione | Visualizzato dopo la selezione del piano con invito all'azione |

### Rendering condizionale

Il componente mostra in modo condizionale i piani a pagamento in base alla disponibilità del pagamento:

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## Internazionalizzazione

Tutte le stringhe rivolte all'utente utilizzano `next-intl` con due spazi dei nomi di traduzione:

| Spazio dei nomi | Utilizzo |
|---|---|
| `pricing` | Pianifica nomi, caratteristiche, contenuto della pagina, sezione sponsor |
| `billing` | Etichette mensili/annuali, stati di elaborazione, messaggi di errore |

## File chiave

| File | Percorso |
|---|---|
| Caratteristiche del prezzo Gancio | `hooks/use-pricing-features.ts` |
| Gancio sezione prezzi | `hooks/use-pricing-section.ts` |
| Componente sezione prezzi | `components/pricing/pricing-section.tsx` |
| Componente della carta piano | `components/pricing/plan-card.tsx` |
| Modulo di Pagamento Modale | `components/payment/stripe-payment-modal.tsx` |
| Costanti di pagamento | `lib/constants.ts` |
| Tipo di configurazione prezzi | `lib/content.ts` |
