---
id: payment-config
title: "Betalingsconfiguratie"
sidebar_label: "Betaling"
sidebar_position: 12
---

# Betalingsconfiguratie

Het template ondersteunt meerdere betalingsproviders en flexibele factureringsworkflows. Deze referentie behandelt alle betalingsgerelateerde constanten, enums en configuratieopties.

## Betalingsconstanten

Alle kern betalings-enums en -typen zijn gedefinieerd in `lib/constants/payment.ts`. Dit bestand wordt bewust gescheiden gehouden van de hoofdconfiguratiemodul zodat het geïmporteerd kan worden in scripts die buiten de Next.js-runtime draaien (migraties, seeds, CLI-tools).

### PaymentFlow

Bepaalt wanneer betaling wordt geïnd ten opzichte van het indieningsproces.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| Waarde | Beschrijving |
|--------|--------------|
| `pay_at_start` | Gebruiker betaalt vóór indiening; item wordt direct gepubliceerd |
| `pay_at_end` | Gebruiker dient eerst in; betaling wordt geïnd na goedkeuring door beheerder |

### PaymentStatus

Bijhouden van de status van een betalingspoging.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

Factureringsfrequentie-opties.

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

Beschikbare abonnementsniveaus.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

Ondersteunde betalingsgateways.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## Betalingsconfiguratieschema

Gedefinieerd in `lib/config/schemas/payment.schema.ts` en bij opstarten gevalideerd met Zod.

### Productprijzen (weergavewaarden)

```typescript
pricing: {
  free: number;       // Standaard: 0
  standard: number;   // Standaard: 10
  premium: number;    // Standaard: 20
}
```

| Omgevingsvariabele | Veld | Standaard |
|--------------------|------|-----------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### Proefconfiguratie

| Omgevingsvariabele | Veld | Beschrijving |
|--------------------|------|--------------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | Prijs-ID voor standaard proefperiode |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | Prijs-ID voor premium proefperiode |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | Proefbedragen inschakelen (`true`/`false`) |

## Providerinstellingen

### Stripe

Automatisch ingeschakeld wanneer zowel `secretKey` als `publishableKey` aanwezig zijn.

| Omgevingsvariabele | Vereist | Beschrijving |
|--------------------|---------|--------------|
| `STRIPE_SECRET_KEY` | Ja | Serversijdige API-sleutel |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Ja | Clientsijdige publiceerbare sleutel |
| `STRIPE_WEBHOOK_SECRET` | Aanbevolen | Webhook-handtekeningverificatie |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | Nee | Prijs-ID voor gratis plan |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | Nee | Prijs-ID voor standaard plan |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | Nee | Prijs-ID voor premium plan |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | Nee | Stel `true` in om prijzen op te halen van de Stripe API |

### LemonSqueezy

Automatisch ingeschakeld wanneer zowel `apiKey` als `storeId` aanwezig zijn.

| Omgevingsvariabele | Vereist | Beschrijving |
|--------------------|---------|--------------|
| `LEMONSQUEEZY_API_KEY` | Ja | API-sleutel van het LemonSqueezy-dashboard |
| `LEMONSQUEEZY_STORE_ID` | Ja | Uw winkel-ID |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Aanbevolen | Webhook-handtekeningverificatie |
| `LEMONSQUEEZY_WEBHOOK_URL` | Nee | Webhook-eindpunt-URL overschrijven |
| `LEMONSQUEEZY_TEST_MODE` | Nee | Stel `true` in voor testmodus |
| `LEMONSQUEEZY_VARIANT_ID` | Nee | Standaard variant-ID |

### Polar

Automatisch ingeschakeld wanneer zowel `accessToken` als `organizationId` aanwezig zijn.

| Omgevingsvariabele | Vereist | Beschrijving |
|--------------------|---------|--------------|
| `POLAR_ACCESS_TOKEN` | Ja | API-toegangstoken |
| `POLAR_ORGANIZATION_ID` | Ja | Organisatie-ID |
| `POLAR_WEBHOOK_SECRET` | Aanbevolen | Webhook-handtekeningverificatie |
| `POLAR_SANDBOX` | Nee | Stel `false` in voor productie (standaard: `true`) |
| `POLAR_API_URL` | Nee | Basis-URL van de API overschrijven |

### Solidgate

Vereist handmatige configuratie van omgevingsvariabelen.

| Omgevingsvariabele | Vereist | Beschrijving |
|--------------------|---------|--------------|
| `SOLIDGATE_API_KEY` | Ja | API-sleutel |
| `SOLIDGATE_SECRET_KEY` | Ja | Geheime sleutel voor ondertekening |
| `SOLIDGATE_WEBHOOK_SECRET` | Ja | Webhook-verificatie |
| `SOLIDGATE_MERCHANT_ID` | Ja | Handelaar-ID |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | Nee | Clientsijdige sleutel |

## Facturering in meerdere valuta's

Elke provider ondersteunt prijzen per valuta via de factureringsconfiguratiemodules in `lib/config/billing/`.

### Factureringsconfiguratietypen

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // Prijs-/variant-ID voor maandelijkse facturering
  yearly?: string;    // Prijs-/variant-ID voor jaarlijkse facturering
  setupFee?: string;  // Optionele installatiekosten prijs-ID
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // ISO 4217-code (bijv. 'USD')
  symbol?: string;    // Weergavesymbool (bijv. '$')
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### Ondersteunde valuta's

De `SUPPORTED_CURRENCIES`-array in `lib/config/billing/types.ts` bevat alle 32 ISO 4217-codes die door het systeem worden geaccepteerd (USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF en meer).

### Prijsoplossingsfuncties

Elke provider exporteert een prijsconfiguratiefunctie:

| Provider | Functie | Bron |
|----------|---------|------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

Alle functies vallen terug op USD als de gevraagde valuta niet geconfigureerd is.

## Betalingsstroomconfiguratie

Gedefinieerd in `lib/config/payment-flows.ts`, configureert de `PAYMENT_FLOWS`-array de twee betalingsstroomopties met hun UI-eigenschappen:

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // Lucide-icoonnaam
  color: string;           // Tailwind-gradientklassen
  features: string[];      // Functie-opsommingspunten
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // Optioneel badge-label
  isDefault?: boolean;     // Of dit de standaardstroom is
}
```

Helperfuncties:
- `getDefaultPaymentFlow()` -- geeft de standaard `PaymentFlow`-waarde terug
- `getPaymentFlowConfig(flowId)` -- geeft de `PaymentFlowConfig` terug voor een bepaalde stroom

## Betalingsprovider Manager

De `PaymentProviderManager`-klasse in `lib/payment/config/payment-provider-manager.ts` biedt singleton-toegang tot providerinstanties:

```typescript
// Een specifieke provider ophalen
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// Of gebruik de generieke functie
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## Gerelateerde pagina's

- [Betalingstypen](../types/payment-types.md) -- typedefinities voor betalingsoperaties
- [Abonnementstypen](../types/subscription-types.md) -- abonnementslevenscyclus-typen
- [Omgevingsreferentie](./environment-reference.md) -- volledige lijst van omgevingsvariabelen
