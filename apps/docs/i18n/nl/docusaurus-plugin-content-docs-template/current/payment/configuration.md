---
id: configuration
title: Betalingsconfiguratie
sidebar_label: Configuratiegids
sidebar_position: 6
description: Volledige gids voor het configureren van betalingsproviders (Stripe, LemonSqueezy, Polar, Solidgate) met multi-valuta ondersteuning
keywords: [betaling, configuratie, stripe, lemonsqueezy, polar, solidgate, multi-valuta]
---

# Betalingsconfiguratie

Deze gids legt uit hoe de verschillende door de applicatie ondersteunde betalingsproviders geconfigureerd worden.

## Inhoudsopgave

- [Overzicht](#overview)
- [Ondersteunde providers](#supported-providers)
- [Algemene configuratie](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [Multi-valuta](#multi-currency)
- [Proefperiodes en installatiekosten](#trials-and-setup-fees)
- [Providerselectie](#provider-selection)
- [Probleemoplossing](#troubleshooting)

---

## Overzicht

De applicatie ondersteunt meerdere betalingsproviders voor abonnementen:

| Provider     | Type          | Multi-valuta   | Proefperiodes |
|--------------|---------------|----------------|--------|
| Stripe       | Abonnement    | ✅ Ja          | ✅ Ja  |
| LemonSqueezy | Abonnement    | ✅ Ja          | ✅ Ja  |
| Polar        | Abonnement    | ❌ Nee         | ❌ Nee |
| Solidgate    | Abonnement    | ⚠️ Gedeeltelijk | ❌ Nee |

### Beschikbare abonnementen

- **Gratis** - Gratis, basisfuncties
- **Standaard** - Tussenliggend abonnement met meer zichtbaarheid
- **Premium** - Volledig abonnement met alle functies

---

## Ondersteunde providers

### Architectuur

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # Exports
│       ├── types.ts              # Gemeenschappelijke typen
│       ├── stripe.config.ts      # Stripe multi-valuta config
│       ├── lemonsqueezy.config.ts # LemonSqueezy multi-valuta config
│       └── solidgate.config.ts   # Solidgate config (WIP)
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (WIP)
└── utils/
    └── payment-provider.ts       # Providerselectie
```

---

## Algemene configuratie

### Weergegeven prijzen (voor UI)

Deze variabelen definiëren de in de gebruikersinterface weergegeven prijzen:

```bash
# Prijzen in dollars (of hoofdvaluta) - alleen voor weergave
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### Proefperiodes (proeftijd)

```bash
# Bedrag-ID's voor proefperiodes (initiële vergoedingen tijdens de proefperiode)
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# Proefperiodes met geautoriseerd bedrag in-/uitschakelen
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### Vereisten

1. Maak een account aan op [Stripe Dashboard](https://dashboard.stripe.com)
2. Haal de API-sleutels op (Instellingen → API-sleutels)
3. Configureer de webhook

### Basis omgevingsvariabelen

```bash
# ============================================
# STRIPE - Basisconfiguratie
# ============================================

# API-sleutels (vereist)
STRIPE_SECRET_KEY=sk_live_xxx           # Geheime sleutel (server)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # Publiceerbare sleutel
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Publiceerbare sleutel (client)

# Webhook (vereist voor gebeurtenissen)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Productconfiguratie (Legacy - alleen USD)

```bash
# Eenvoudige prijzen (voor achterwaartse compatibiliteit, alleen USD)
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### Multi-valuta configuratie (Aanbevolen)

#### Standaard abonnement

```bash
# ============================================
# STRIPE STANDAARD ABONNEMENT
# ============================================

# Product-ID
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# Maandelijkse prijzen per valuta
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# Jaarlijkse prijzen per valuta
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# Installatiekosten / proefbedragen per valuta
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### Premium abonnement

```bash
# ============================================
# STRIPE PREMIUM ABONNEMENT
# ============================================

# Product-ID
NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

# Maandelijkse prijzen per valuta
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

# Jaarlijkse prijzen per valuta
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

# Installatiekosten / proefbedragen per valuta
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### Prijzen aanmaken in Stripe

1. Ga naar **Producten** → Maak een product aan
2. Voeg prijzen toe voor elke valuta:
   - Klik op "Nog een prijs toevoegen"
   - Selecteer de valuta (EUR, GBP, CAD)
   - Stel het equivalente bedrag in
3. Kopieer elke `price_xxx` naar de overeenkomstige variabelen

### Stripe Webhook

Configureer de webhook in het Stripe Dashboard:

- **URL**: `https://uw-domein.com/api/stripe/webhook`
- **Te beluisteren gebeurtenissen**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### Vereisten

1. Maak een account aan op [LemonSqueezy](https://lemonsqueezy.com)
2. Maak een winkel aan
3. Maak producten en varianten aan

### Omgevingsvariabelen

```bash
# ============================================
# LEMONSQUEEZY - Basisconfiguratie
# ============================================

# API (vereist)
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx

# Webhook
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://uw-domein.com/api/lemonsqueezy/webhook

# Testmodus
LEMONSQUEEZY_TEST_MODE=false
```

### Variantconfiguratie (Legacy)

```bash
# Eenvoudige varianten
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx

# Varianten met installatiekosten (voor proefperiodes)
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### Multi-valuta configuratie

#### Standaard abonnement

```bash
# ============================================
# LEMONSQUEEZY STANDAARD ABONNEMENT
# ============================================

# Product-ID
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx

# Maandelijkse prijzen per valuta
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx

# Jaarlijkse prijzen per valuta
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx

# Installatiekosten per valuta
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx
```

#### Premium abonnement

```bash
# ============================================
# LEMONSQUEEZY PREMIUM ABONNEMENT
# ============================================

# Product-ID
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx

# Maandelijkse prijzen per valuta
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx

# Jaarlijkse prijzen per valuta
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx

# Installatiekosten per valuta
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### Vereisten

1. Maak een account aan op [Polar](https://polar.sh)
2. Maak een organisatie aan
3. Maak abonnementsplannen aan

### Omgevingsvariabelen

```bash
# ============================================
# POLAR - Configuratie
# ============================================

# API (vereist)
POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx

# Webhook
POLAR_WEBHOOK_SECRET=xxx

# Sandboxmodus (true voor testen, false voor productie)
POLAR_SANDBOX=true

# API-URL (optioneel, standaard: api.polar.sh)
POLAR_API_URL=https://api.polar.sh

# Plan-ID's
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx

# Proefbedragen (optioneel)
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning In ontwikkeling
De Solidgate-integratie is momenteel in ontwikkeling. Sommige functies zijn mogelijk nog niet volledig functioneel.
:::

### Vereisten

1. Maak een account aan op [Solidgate](https://solidgate.com)
2. Haal API-referenties op uit het handelsportaal
3. Configureer het webhook-eindpunt

### Omgevingsvariabelen

```bash
# ============================================
# SOLIDGATE - Configuratie (WIP)
# ============================================

# API-referenties (vereist)
SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx

# Webhook
SOLIDGATE_WEBHOOK_SECRET=xxx

# Omgeving (test of live)
SOLIDGATE_ENVIRONMENT=test
```

### Productconfiguratie

```bash
# ============================================
# SOLIDGATE ABONNEMENTEN (WIP)
# ============================================

# Product-ID's
NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx

# Prijs-ID's (momenteel alleen USD)
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### Huidige beperkingen

| Functie          | Status         | Opmerkingen                              |
|------------------|----------------|------------------------------------|
| Basisbetalingen  | ✅ Geïmplementeerd | Eenmalige en abonnementsbetalingen |
| Multi-valuta     | ⚠️ Gedeeltelijk | Momenteel alleen USD              |
| Proefperiodes    | ❌ Nog niet    | Gepland voor toekomstige release   |
| Webhooks         | ⚠️ Gedeeltelijk | Alleen basisgebeurtenissen         |
| Terugbetalingen  | ❌ Nog niet    | Gepland voor toekomstige release   |

---

## Multi-valuta

### Ondersteunde valuta's

| Code | Valuta           | Symbool |
|------|------------------|--------|
| USD  | Amerikaanse dollar | $    |
| EUR  | Euro             | €      |
| GBP  | Brits pond       | £      |
| CAD  | Canadese dollar  | CA$    |

### Werking

1. De valuta van de gebruiker wordt automatisch gedetecteerd (geolocatie, voorkeuren)
2. Het systeem selecteert de `price_id` overeenkomstig de valuta
3. Als de valuta niet geconfigureerd is, terugval naar USD

### Gebruiksvoorbeeld

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  
  // Haalt automatisch de juiste prijs-ID op voor de valuta
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      Abonneer voor {priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## Proefperiodes en installatiekosten

### Concept

- **Proefperiode**: Gratis of goedkope proefperiode
- **Installatiekosten**: Initiële kosten aan het begin van de proefperiode

### Configuratie

```bash
# Proefperiodes met geautoriseerd bedrag inschakelen
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### Belangrijk: Valutaconsistentie

:::caution
Alle prijzen in een kassasessie moeten in dezelfde valuta zijn.
:::

Als proefperiodes met installatiekosten worden gebruikt, moet er een installatiekost worden aangemaakt voor elke valuta:

```bash
# ❌ FOUT: Installatiekosten in USD + Hoofdprijs in GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx  # USD
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP

# ✅ CORRECT: Beide in GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx  # GBP
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP
```

---

## Providerselectie

### Prioriteit

1. **Door gebruiker geselecteerde provider** (Instellingen)
2. **Standaardprovider** (configuratie)
3. **Terugval**: Stripe

### Standaardprovider configuratie

In het siteconfiguratibestand:

```typescript
// In de siteconfiguratie
pricing: {
  provider: PaymentProvider.STRIPE  // of LEMONSQUEEZY, POLAR
}
```

### Gebruiksvoorbeeld

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

## Probleemoplossing

### Fout: Valutatconflict

```
Error: This price has currency=gbp, but other items use currency=usd
```

**Oorzaak**: De hoofdprijs en installatiekosten zijn in verschillende valuta's.

**Oplossing**: Installatiekosten aanmaken voor elke ondersteunde valuta.

### Fout: Ongeldige prijs-ID

```
Error: Invalid price ID
```

**Oorzaak**: De `price_id` bestaat niet of is niet geconfigureerd.

**Oplossing**: Controleer of de omgevingsvariabele een geldige ID bevat.

### Webhook ontvangt geen gebeurtenissen

1. Controleer de webhook-URL in het providerdashboard
2. Verifieer dat `WEBHOOK_SECRET` correct is
3. Test met de foutopsporingstools van de provider

### Prijzen worden niet correct weergegeven

1. Controleer `NEXT_PUBLIC_PRODUCT_PRICE_*` voor weergegeven waarden
2. Verifieer dat `price_id`-waarden overeenkomen met de juiste valuta's
3. Start de ontwikkelingsserver opnieuw na het wijzigen van `.env`-bestanden
