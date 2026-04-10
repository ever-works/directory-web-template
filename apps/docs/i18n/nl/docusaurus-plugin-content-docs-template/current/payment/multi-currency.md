---
id: multi-currency
title: Multi-Valuta Integratie
sidebar_label: Multi-Valuta
sidebar_position: 5
---

# Handleiding voor Multi-Valuta Integratie

Dit document legt uit hoe het multi-valuta systeem is geïntegreerd in de applicatie en hoe het samenwerkt met betalingsproviders (Stripe, LemonSqueezy en Polar).

## Architectuur

Het multi-valuta systeem werkt op meerdere niveaus:

1. **Basisconfiguratie** (`lib/types.ts`): Standaardconfiguratie met multi-valuta ondersteuning
2. **ConfigProvider** (`app/[locale]/config.tsx`): Verrijkt de configuratie met de valuta van de gebruiker
3. **Checkout-hooks**: Gebruiken multi-valuta configuraties om de juiste prijs-ID's te krijgen

## Gegevensstroom

```
CurrencyProvider (gebruikersvaluta)
    ↓
ConfigProvider (verrijkt config.pricing met valuta)
    ↓
usePricingSection / useCreateCheckoutSession
    ↓
getStripePriceConfig / getLemonSqueezyPriceConfig (valuta + plan)
    ↓
Correcte prijs-ID voor de valuta van de gebruiker
```

## Gewijzigde bestanden

### 1. `app/[locale]/config.tsx`
- Gebruikt `useCurrencyContext()` om de valuta van de gebruiker te krijgen
- Genereert automatisch een prijsconfiguratie op basis van valuta als er geen configuratie is opgegeven
- Gebruikt `getDefaultPricingConfigWithCurrency()` om een multi-valuta configuratie te maken

### 2. `hooks/use-create-checkout.ts`
- Gebruikt `useCurrencyContext()` om de valuta te krijgen
- Roept `getStripePriceConfig()` aan om de juiste prijs-ID te krijgen op basis van valuta
- Valt terug op `plan.stripePriceId` als multi-valuta configuratie niet beschikbaar is

### 3. `hooks/use-pricing-section.ts`
- Gebruikt `useCurrencyContext()` om de valuta te krijgen
- Roept `getLemonSqueezyPriceConfig()` aan voor LemonSqueezy
- Gebruikt valuta-gebaseerde prijs-ID's bij checkout

## Gebruik

### Voor Ontwikkelaars

Het systeem werkt automatisch. Er zijn geen wijzigingen nodig in bestaande componenten.

**Gebruiksvoorbeeld in een component:**

```tsx
import { useConfig } from '@/app/[locale]/config';
import { useCurrencyContext } from '@/components/context/currency-provider';

function PricingComponent() {
  const config = useConfig();
  const { currency } = useCurrencyContext();
  
  // config.pricing wordt automatisch verrijkt met de valuta van de gebruiker
  // Prijs-ID's zijn gebaseerd op de valuta van de gebruiker
  const standardPlan = config.pricing?.plans.STANDARD;
  
  // Valutasymbool wordt automatisch bijgewerkt
  const currencySymbol = config.pricing?.currency; // €, £, $, etc.
}
```

### Voor Checkout-hooks

Checkout-hooks gebruiken automatisch multi-valuta configuraties:

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## Configuratie van omgevingsvariabelen

Voor het systeem om te werken, moet u omgevingsvariabelen configureren voor elke valuta in:

- `lib/config/billing/stripe.config.ts`: `NEXT_PUBLIC_STRIPE_*_PRICE_ID_*` variabelen
- `lib/config/billing/lemonsqueezy.config.ts`: `NEXT_PUBLIC_LEMONSQUEEZY_*_PRICE_ID_*` variabelen

**Voorbeeld voor Stripe:**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## Ondersteunde valuta's

Ondersteunde valuta's zijn gedefinieerd in `lib/config/billing/types.ts`:

- USD, EUR, GBP, CAD (geconfigureerd in facturatieconfiguraties)
- Andere ISO 4217 valuta's (terugval naar USD)

## Terugval

Als een valuta niet wordt ondersteund of als multi-valuta configuraties niet beschikbaar zijn:

1. Het systeem gebruikt `plan.stripePriceId` / `plan.lemonVariantId` (statische configuratie)
2. Standaardvaluta is USD
3. Standaardsymbool is $

## Testen

Om het multi-valuta systeem te testen:

1. Wijzig de valuta van de gebruiker via `/api/user/currency`
2. Controleer of prijs-ID's veranderen op basis van de valuta
3. Test checkout met verschillende valuta's

## Belangrijke opmerkingen

- Prijs-ID's worden opgelost **op het moment van checkout**, niet op weergavetijd
- De prijsconfiguratie in `content/config.yml` heeft prioriteit boven de standaardconfiguratie
- Multi-valuta configuraties worden alleen gebruikt als omgevingsvariabelen zijn geconfigureerd

## Integratie met betalingsproviders

Het multi-valuta systeem werkt naadloos samen met alle betalingsproviders:

- **Stripe**: Gebruikt `getStripePriceConfig()` om valuta-specifieke prijs-ID's te krijgen
- **LemonSqueezy**: Gebruikt `getLemonSqueezyPriceConfig()` om valuta-specifieke variant-ID's te krijgen
- **Polar**: Ondersteunt multi-valuta via productconfiguratie

Voor gedetailleerde providerspecifieke configuratie, zie:
- [Stripe Configuratie](./stripe)
- [LemonSqueezy Configuratie](./lemonsqueezy)
- [Polar Configuratie](./polar)
