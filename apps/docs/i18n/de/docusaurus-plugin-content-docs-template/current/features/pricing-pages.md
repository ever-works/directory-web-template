---
id: pricing-pages
title: Preis- und Checkout-Seiten
sidebar_label: Preisseiten
sidebar_position: 19
---

# Preis- und Checkout-Seiten

Die Ever Works-Vorlage umfasst ein voll ausgestattetes Preisseitensystem mit Multi-Provider-Checkout-Unterstützung (Stripe, LemonSqueezy, Polar), Umschalten des Abrechnungsintervalls, dynamischer Preisgestaltung von Stripe-Produkten, Währungsformatierung, Planvergleichskarten, Sponsor-Anzeigenabschnitten und eingebetteten oder weiterleitungsbasierten Zahlungsabläufen.

## Architekturübersicht

| Komponente | Pfad | Zweck |
|---|---|---|
| `usePricingFeatures` | `hooks/use-pricing-features.ts` | Planen Sie Konfigurationen, Funktionslisten und Aktionstext-Getter |
| `usePricingSection` | `hooks/use-pricing-section.ts` | Orchestriert die gesamte Preisstatus-, Checkout- und Zahlungslogik |
| `PricingSection` | `components/pricing/pricing-section.tsx` | Vollständige Benutzeroberfläche der Preisseite mit Plankarten und Checkout-Ablauf |
| `PlanCard` | `components/pricing/plan-card.tsx` | Individuelle Plan-Anzeigekarte |
| `PaymentFormModal` | `components/payment/stripe-payment-modal.tsx` | Eingebettetes Zahlungsformular modal |
| `PaymentFlowSelectorModal` | `components/payment/` | Flussauswahlmodalität (Jetzt bezahlen vs. am Ende bezahlen) |

## Plankonfiguration

Das System unterstützt drei bis `usePricingFeatures` konfigurierte Planstufen:

| Planen | Aktionstext (angemeldet) | Aktionstext (nicht angemeldet) |
|---|---|---|
| `free` | „Kostenlos starten“ | „Kostenlos einreichen“ |
| `standard` | „Upgrade auf Standard“ | „Jetzt abonnieren“ |
| `premium` | „Go Premium“ | „Jetzt abonnieren“ |

### Plan-Konfigurationsschnittstelle

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### Funktionslisten

Jeder Plan verfügt über eine typisierte Funktionsliste:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

| Planen | Feature-Anzahl | Bemerkenswerte Einschlüsse |
|---|---|---|
| Kostenlos | 9 Funktionen | Produkt, grundlegende Beschreibung, ein Bild, Website-Link einreichen |
| Standard | 9 Funktionen | Alle kostenlosen Funktionen, verifiziertes Abzeichen, Prioritätsprüfung, monatliche Statistiken |
| Prämie | 11 Funktionen | Alle Standardfunktionen, gesponserte Position, vorgestellte Homepage, unbegrenzte Galerie |

## Der `usePricingSection` -Haken

Dieser umfassende Hook orchestriert die gesamte Logik der Preisseite:

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### Staat

| Eigentum | Geben Sie | ein Beschreibung |
|---|---|---|
| `showSelector` | `boolean` | Ob die Zahlungsflussauswahl sichtbar ist |
| `billingInterval` | `PaymentInterval` | Aktuelles Abrechnungsintervall (monatlich/jährlich) |
| `processingPlan` | `string \| null` | ID des Plans, der derzeit verarbeitet wird |
| `selectedPlan` | `PaymentPlan \| null` | Aktuell ausgewählter Plan |
| `selectedFlow` | `PaymentFlow` | Zahlungsflusstyp (Jetzt bezahlen vs. am Ende bezahlen) |
| `isButton` | `boolean` | Ob der ausgewählte Flow den Schaltflächenmodus verwendet |

### Aktionen

| Methode | Beschreibung |
|---|---|
| `setBillingInterval(interval)` | Wechseln Sie zwischen monatlicher und jährlicher Abrechnung |
| `handleSelectPlan(plan)` | Wählen Sie einen Plan aus und benachrichtigen Sie die Eltern per Rückruf |
| `handleCheckout(plan)` | Auschecken für eine bestimmte Plankonfiguration einleiten |
| `calculatePrice(plan)` | Berechnen Sie den Preis anhand des Abrechnungsintervalls und des jährlichen Rabatts |
| `getSavingsText(plan)` | Jährlichen Spartext abrufen (z. B. „Sparen Sie 24 $/Jahr“) |
| `cancelCurrentProcess()` | Laufenden Checkout abbrechen und Status zurücksetzen |
| `formatPrice(amount)` | Betrag mit Währungssymbol | formatieren

### Preisberechnung

Der Hook berechnet Preise basierend auf dem Abrechnungsintervall:

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

## Zahlungsanbieter

Das System unterstützt drei Zahlungsanbieter, die je nach Konfiguration oder je nach Benutzerpräferenz ausgewählt werden können:

| Anbieter | Kassenhaken | Eingebetteter Support |
|---|---|---|
| Streifen | `useCreateCheckoutSession` | Ja (SetupIntent) |
| LemonSqueezy | `useCheckoutButton` | Ja (Überlagerung) |
| Polar | `usePolarCheckout` | Ja (eingebettete URL) |

### Anbieterauswahl

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### Checkout-Ablauf

Wenn ein Benutzer auf die Aktionsschaltfläche eines Plans klickt:

1. Vergewissern Sie sich, dass der Benutzer angemeldet ist (öffnen Sie ggf. den Anmeldemodus).
2. Brechen Sie einen eventuell bestehenden Checkout-Vorgang ab
3. Bestimmen Sie den Zahlungsanbieter
4. Rufen Sie die währungsbezogene Preis-ID oder Varianten-ID ab
5. Öffnen Sie das eingebettete Zahlungsformular oder leiten Sie zur Kasse des Anbieters weiter

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

## Dynamische Preisgestaltung (Stripe)

Wenn Stripe der aktive Anbieter ist und die dynamische Preisgestaltung aktiviert ist, ruft der Hook Live-Produktdaten ab:

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

## Währungsunterstützung

Das Preissystem unterstützt die Anzeige mehrerer Währungen:

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

Währungsbewusste Varianten-IDs werden durch anbieterspezifische Konfigurationsfunktionen aufgelöst:

| Anbieter | Konfigurationsfunktion |
|---|---|
| LemonSqueezy | `getLemonSqueezyPriceConfig(planName, currency, interval)` |
| Polar | `getPolarPriceConfig(planName, currency, interval)` |

## Zahlungsformular Modal

Das eingebettete Zahlungsformular unterstützt alle drei Anbieter:

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

## Preisabschnittskomponente

Die `PricingSection` -Komponente rendert die vollständige Preisseite:

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### Visuelle Funktionen

| Funktion | Beschreibung |
|---|---|
| Abrechnungsintervall umschalten | Animierter Schieberegler zwischen monatlich und jährlich |
| Plankartenraster | Responsives 1-Spalten-Layout (mobil) bis 3-Spalten-Layout (Desktop) |
| Beliebtes Abzeichen | Der Standardplan ist mit Leuchteffekten | als „beliebt“ markiert
| Sparabzeichen | Grüne Pillen zeigen gegebenenfalls jährliche Einsparungen |
| Vertrauensindikatoren | Symbole für „Keine versteckten Gebühren“, „Sofortige Aktivierung“, „Premium-Support“ |
| Abschnitt „Sponsorenanzeigen“ | Animierte Radarkreise mit Preisen für gesponserte Platzierung |
| Abschnitt fortsetzen | Wird nach der Planauswahl mit Call-to-Action | angezeigt

### Bedingtes Rendern

Die Komponente zeigt bedingt bezahlte Pläne basierend auf der Zahlungsverfügbarkeit an:

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## Internationalisierung

Alle benutzerseitigen Zeichenfolgen verwenden `next-intl` mit zwei Übersetzungs-Namespaces:

| Namensraum | Verwendung |
|---|---|
| `pricing` | Planen Sie Namen, Funktionen, Seiteninhalt, Sponsorbereich |
| `billing` | Monats-/Jahresbezeichnungen, Verarbeitungsstatus, Fehlermeldungen |

## Schlüsseldateien

| Datei | Pfad |
|---|---|
| Preismerkmale Haken | `hooks/use-pricing-features.ts` |
| Preisabschnitt-Haken | `hooks/use-pricing-section.ts` |
| Preisabschnittskomponente | `components/pricing/pricing-section.tsx` |
| Plankartenkomponente | `components/pricing/plan-card.tsx` |
| Zahlungsformular Modal | `components/payment/stripe-payment-modal.tsx` |
| Zahlungskonstanten | `lib/constants.ts` |
| Preiskonfigurationstyp | `lib/content.ts` |
