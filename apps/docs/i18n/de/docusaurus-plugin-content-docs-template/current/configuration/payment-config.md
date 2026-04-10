---
id: payment-config
title: "Zahlungskonfiguration"
sidebar_label: "Zahlung"
sidebar_position: 12
---

# Zahlungskonfiguration

Das Template unterstützt mehrere Zahlungsanbieter und flexible Abrechnungsworkflows. Diese Referenz deckt alle zahlungsbezogenen Konstanten, Enums und Konfigurationsoptionen ab.

## Zahlungskonstanten

Alle zentralen Zahlungs-Enums und -Typen sind in `lib/constants/payment.ts` definiert. Diese Datei wird bewusst vom Hauptkonfigurationsmodul getrennt gehalten, damit sie in Skripten importiert werden kann, die außerhalb der Next.js-Laufzeit laufen (Migrationen, Seeds, CLI-Tools).

### PaymentFlow

Bestimmt, wann die Zahlung relativ zum Einreichungsprozess erhoben wird.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| Wert | Beschreibung |
|------|--------------|
| `pay_at_start` | Benutzer zahlt vor der Einreichung; Eintrag wird sofort veröffentlicht |
| `pay_at_end` | Benutzer reicht zuerst ein; Zahlung wird nach Admin-Genehmigung erhoben |

### PaymentStatus

Verfolgt den Status eines Zahlungsversuchs.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

Optionen für die Abrechnungshäufigkeit.

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

Verfügbare Abonnement-Stufen.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

Unterstützte Zahlungs-Gateways.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## Zahlungskonfigurationsschema

Definiert in `lib/config/schemas/payment.schema.ts` und beim Start mit Zod validiert.

### Produktpreise (Anzeigewerte)

```typescript
pricing: {
  free: number;       // Standard: 0
  standard: number;   // Standard: 10
  premium: number;    // Standard: 20
}
```

| Umgebungsvariable | Feld | Standard |
|-------------------|------|----------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### Testkonfiguration

| Umgebungsvariable | Feld | Beschreibung |
|-------------------|------|--------------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | Preis-ID für Standard-Test |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | Preis-ID für Premium-Test |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | Testbeträge aktivieren (`true`/`false`) |

## Anbieter-Einrichtung

### Stripe

Wird automatisch aktiviert, wenn sowohl `secretKey` als auch `publishableKey` vorhanden sind.

| Umgebungsvariable | Erforderlich | Beschreibung |
|-------------------|--------------|--------------|
| `STRIPE_SECRET_KEY` | Ja | Serverseitiger API-Schlüssel |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Ja | Clientseitiger öffentlicher Schlüssel |
| `STRIPE_WEBHOOK_SECRET` | Empfohlen | Webhook-Signaturprüfung |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | Nein | Preis-ID für kostenlosen Plan |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | Nein | Preis-ID für Standard-Plan |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | Nein | Preis-ID für Premium-Plan |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | Nein | `true` setzen, um Preise von der Stripe-API abzurufen |

### LemonSqueezy

Wird automatisch aktiviert, wenn sowohl `apiKey` als auch `storeId` vorhanden sind.

| Umgebungsvariable | Erforderlich | Beschreibung |
|-------------------|--------------|--------------|
| `LEMONSQUEEZY_API_KEY` | Ja | API-Schlüssel aus dem LemonSqueezy-Dashboard |
| `LEMONSQUEEZY_STORE_ID` | Ja | Ihre Store-Kennung |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Empfohlen | Webhook-Signaturprüfung |
| `LEMONSQUEEZY_WEBHOOK_URL` | Nein | Webhook-Endpunkt-URL überschreiben |
| `LEMONSQUEEZY_TEST_MODE` | Nein | `true` für Testmodus setzen |
| `LEMONSQUEEZY_VARIANT_ID` | Nein | Standard-Varianten-ID |

### Polar

Wird automatisch aktiviert, wenn sowohl `accessToken` als auch `organizationId` vorhanden sind.

| Umgebungsvariable | Erforderlich | Beschreibung |
|-------------------|--------------|--------------|
| `POLAR_ACCESS_TOKEN` | Ja | API-Zugriffstoken |
| `POLAR_ORGANIZATION_ID` | Ja | Organisationskennung |
| `POLAR_WEBHOOK_SECRET` | Empfohlen | Webhook-Signaturprüfung |
| `POLAR_SANDBOX` | Nein | `false` für Produktion setzen (Standard: `true`) |
| `POLAR_API_URL` | Nein | Basis-URL der API überschreiben |

### Solidgate

Erfordert manuelle Konfiguration der Umgebungsvariablen.

| Umgebungsvariable | Erforderlich | Beschreibung |
|-------------------|--------------|--------------|
| `SOLIDGATE_API_KEY` | Ja | API-Schlüssel |
| `SOLIDGATE_SECRET_KEY` | Ja | Geheimer Schlüssel zum Signieren |
| `SOLIDGATE_WEBHOOK_SECRET` | Ja | Webhook-Verifizierung |
| `SOLIDGATE_MERCHANT_ID` | Ja | Händlerkennung |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | Nein | Clientseitiger Schlüssel |

## Mehrwährungs-Abrechnung

Jeder Anbieter unterstützt währungsspezifische Preise über die Abrechnungskonfigurationsmodule in `lib/config/billing/`.

### Abrechnungskonfigurationstypen

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // Preis-/Varianten-ID für monatliche Abrechnung
  yearly?: string;    // Preis-/Varianten-ID für jährliche Abrechnung
  setupFee?: string;  // Optionale Einrichtungsgebühr-Preis-ID
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // ISO 4217-Code (z.B. 'USD')
  symbol?: string;    // Anzeigesymbol (z.B. '$')
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### Unterstützte Währungen

Das `SUPPORTED_CURRENCIES`-Array in `lib/config/billing/types.ts` listet alle 32 ISO 4217-Codes auf, die vom System akzeptiert werden (USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF und mehr).

### Preisauflösungsfunktionen

Jeder Anbieter exportiert eine Preiskonfigurationsfunktion:

| Anbieter | Funktion | Quelle |
|----------|----------|--------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

Alle Funktionen greifen auf USD zurück, wenn die angeforderte Währung nicht konfiguriert ist.

## Zahlungsfluss-Konfiguration

Definiert in `lib/config/payment-flows.ts`, konfiguriert das `PAYMENT_FLOWS`-Array die zwei Zahlungsflussoptionen mit ihren UI-Eigenschaften:

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // Lucide-Icon-Name
  color: string;           // Tailwind-Gradient-Klassen
  features: string[];      // Feature-Aufzählungspunkte
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // Optionale Badge-Bezeichnung
  isDefault?: boolean;     // Ob dies der Standard-Fluss ist
}
```

Hilfsfunktionen:
- `getDefaultPaymentFlow()` -- gibt den Standard-`PaymentFlow`-Wert zurück
- `getPaymentFlowConfig(flowId)` -- gibt die `PaymentFlowConfig` für einen bestimmten Fluss zurück

## Zahlungsanbieter-Manager

Die `PaymentProviderManager`-Klasse in `lib/payment/config/payment-provider-manager.ts` bietet Singleton-Zugriff auf Anbieterinstanzen:

```typescript
// Einen bestimmten Anbieter abrufen
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// Oder die generische Funktion verwenden
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## Verwandte Seiten

- [Zahlungstypen](../types/payment-types.md) -- Typdefinitionen für Zahlungsvorgänge
- [Abonnementtypen](../types/subscription-types.md) -- Typen für den Abonnement-Lebenszyklus
- [Umgebungsreferenz](./environment-reference.md) -- vollständige Auflistung der Umgebungsvariablen
