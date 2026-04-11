---
id: pricing-pages
title: Prijzen en afrekenpagina's
sidebar_label: Prijspagina's
sidebar_position: 19
---

# Prijzen en afrekenpagina's

De Ever Works-sjabloon bevat een volledig uitgerust prijspaginasysteem met ondersteuning voor afrekenen bij meerdere providers (Stripe, LemonSqueezy, Polar), schakelen tussen factureringsintervallen, dynamische prijzen van Stripe-producten, valutaopmaak, planvergelijkingskaarten, sponsoradvertentiesecties en ingebedde of op omleidingen gebaseerde betalingsstromen.

## Architectuuroverzicht

| Onderdeel | Pad | Doel |
|---|---|---|
| `usePricingFeatures` | `hooks/use-pricing-features.ts` | Planconfiguraties, functielijsten en actietekstgetters |
| `usePricingSection` | `hooks/use-pricing-section.ts` | Orkesteert alle prijsstatus-, afreken- en betalingslogica |
| `PricingSection` | `components/pricing/pricing-section.tsx` | Gebruikersinterface van de volledige prijspagina met abonnementskaarten en afrekenstroom |
| `PlanCard` | `components/pricing/plan-card.tsx` | Individuele plankaart |
| `PaymentFormModal` | `components/payment/stripe-payment-modal.tsx` | Ingebed betalingsformulier modaal |
| `PaymentFlowSelectorModal` | `components/payment/` | Modaal voor stroomselectie (nu betalen vs. achteraf betalen) |

## Planconfiguratie

Het systeem ondersteunt drie planniveaus die zijn geconfigureerd via `usePricingFeatures` :

| Plannen | Actietekst (ingelogd) | Actietekst (niet ingelogd) |
|---|---|---|
| `free` | "Ga gratis aan de slag" | "Gratis indienen" |
| `standard` | "Upgraden naar standaard" | "Abonneer je nu" |
| `premium` | "Ga voor Premium" | "Abonneer je nu" |

### Planconfiguratie-interface

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### Functielijsten

Elk plan heeft een getypte lijst met functies:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

| Plannen | Aantal functies | Opmerkelijke insluitsels |
|---|---|---|
| Gratis | 9 kenmerken | Product indienen, basisbeschrijving, één afbeelding, websitelink |
| Standaard | 9 kenmerken | Alle gratis functies, geverifieerde badge, prioriteitsbeoordeling, maandelijkse statistieken |
| Premie | 11 kenmerken | Alle standaardfuncties, gesponsorde positie, homepage, onbeperkte galerij |

## De `usePricingSection` -haak

Deze uitgebreide hook orkestreert de volledige logica van de prijspagina:

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### Staat

| Eigendom | Typ | Beschrijving |
|---|---|---|
| `showSelector` | `boolean` | Of de betalingsstroomkiezer zichtbaar is |
| `billingInterval` | `PaymentInterval` | Huidig ​​factureringsinterval (maandelijks/jaarlijks) |
| `processingPlan` | `string \| null` | ID van het plan dat momenteel wordt verwerkt |
| `selectedPlan` | `PaymentPlan \| null` | Momenteel geselecteerd abonnement |
| `selectedFlow` | `PaymentFlow` | Type betalingsstroom (nu betalen versus betalen aan het eind) |
| `isButton` | `boolean` | Of de geselecteerde stroom de knopmodus | gebruikt

### Acties

| Werkwijze | Beschrijving |
|---|---|
| `setBillingInterval(interval)` | Schakelen tussen maandelijkse en jaarlijkse facturering |
| `handleSelectPlan(plan)` | Selecteer een abonnement en breng de ouder op de hoogte via terugbellen |
| `handleCheckout(plan)` | Afrekenen starten voor een bepaalde abonnementsconfiguratie |
| `calculatePrice(plan)` | Bereken de prijs op basis van factureringsinterval en jaarlijkse korting |
| `getSavingsText(plan)` | Ontvang een sms voor jaarlijkse besparingen (bijvoorbeeld 'Bespaar $ 24/jaar') |
| `cancelCurrentProcess()` | Annuleer lopende betaling en reset de status |
| `formatPrice(amount)` | Formaat bedrag met valutasymbool |

### Prijsberekening

De hook berekent prijzen op basis van het factureringsinterval:

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

## Betalingsproviders

Het systeem ondersteunt drie betalingsproviders, geselecteerd per configuratie of per gebruikervoorkeur:

| Aanbieder | Kassahaak | Ingebouwde ondersteuning |
|---|---|---|
| Streep | `useCreateCheckoutSession` | Ja (SetupIntent) |
| CitroenSqueezy | `useCheckoutButton` | Ja (overlay) |
| Polair | `usePolarCheckout` | Ja (ingesloten URL) |

### Selectie van aanbieders

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### Afrekenproces

Wanneer een gebruiker op de actieknop van een plan klikt:

1. Controleer of de gebruiker is ingelogd (open login modaal als dit niet het geval is)
2. Annuleer een bestaand afrekenproces
3. Bepaal de betalingsprovider
4. Haal de valutabewuste prijs-ID of variant-ID op
5. Open het ingebouwde betalingsformulier of stuur door naar de betaalpagina van de provider

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

## Dynamische prijzen (streep)

Wanneer Stripe de actieve aanbieder is en dynamische prijzen zijn ingeschakeld, haalt de hook live productgegevens op:

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

## Valutaondersteuning

Het prijssysteem ondersteunt weergave van meerdere valuta:

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

Valutabewuste variant-ID's worden opgelost via providerspecifieke configuratiefuncties:

| Aanbieder | Configuratiefunctie |
|---|---|
| CitroenSqueezy | `getLemonSqueezyPriceConfig(planName, currency, interval)` |
| Polair | `getPolarPriceConfig(planName, currency, interval)` |

## Betalingsformulier Modaal

Het ingebouwde betalingsformulier ondersteunt alle drie de providers:

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

## Component prijssectie

De component `PricingSection` geeft de volledige prijspagina weer:

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### Visuele kenmerken

| Kenmerk | Beschrijving |
|---|---|
| Wisselschakelaar voor factureringsinterval | Geanimeerde schuifregelaar tussen maandelijks en jaarlijks |
| Plankaartenraster | Responsieve lay-out van 1 kolom (mobiel) tot 3 kolommen (desktop) |
| Populaire badge | Standaardabonnement is gemarkeerd als 'populair' met gloedeffecten |
| Spaarbadges | Groene pillen met jaarlijkse besparingen, indien van toepassing |
| Vertrouwensindicatoren | Pictogrammen voor "Geen verborgen kosten", "Directe activering", "Premium ondersteuning" |
| Sectie sponsoradvertenties | Geanimeerde radarcirkels met prijzen voor gesponsorde plaatsing |
| Ga verder met sectie | Getoond na planselectie met call-to-action |

### Voorwaardelijke weergave

Het onderdeel toont voorwaardelijk betaalde abonnementen op basis van de beschikbaarheid van betalingen:

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## Internationalisering

Alle gebruikersgerichte tekenreeksen gebruiken `next-intl` met twee vertalingsnaamruimten:

| Naamruimte | Gebruik |
|---|---|
| `pricing` | Plannamen, functies, pagina-inhoud, sponsorsectie |
| `billing` | Maandelijkse/jaarlijkse labels, verwerkingsstatussen, foutmeldingen |

## Sleutelbestanden

| Bestand | Pad |
|---|---|
| Prijskenmerken Hook | `hooks/use-pricing-features.ts` |
| Prijssectie Haak | `hooks/use-pricing-section.ts` |
| Component prijssectie | `components/pricing/pricing-section.tsx` |
| Plankaartcomponent | `components/pricing/plan-card.tsx` |
| Betaalformulier Modaal | `components/payment/stripe-payment-modal.tsx` |
| Betalingsconstanten | `lib/constants.ts` |
| Prijsconfiguratietype | `lib/content.ts` |
