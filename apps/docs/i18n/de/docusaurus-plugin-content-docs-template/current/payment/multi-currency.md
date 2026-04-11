---
id: multi-currency
title: Multi-Währung Integration
sidebar_label: Multi-Währung
sidebar_position: 5
---

# Leitfaden zur Multi-Währung-Integration

Dieses Dokument erklärt, wie das Multi-Währung-System in die Anwendung integriert ist und wie es mit Zahlungsanbietern (Stripe, LemonSqueezy und Polar) zusammenarbeitet.

## Architektur

Das Multi-Währung-System funktioniert auf mehreren Ebenen:

1. **Basiskonfiguration** (`lib/types.ts`): Standardkonfiguration mit Multi-Währung-Unterstützung
2. **ConfigProvider** (`app/[locale]/config.tsx`): Ergänzt die Konfiguration mit der Währung des Benutzers
3. **Checkout-Hooks**: Verwenden Multi-Währung-Konfigurationen, um die richtigen Preis-IDs zu erhalten

## Datenfluss

```
CurrencyProvider (Benutzerwährung)
    ↓
ConfigProvider (ergänzt config.pricing mit Währung)
    ↓
usePricingSection / useCreateCheckoutSession
    ↓
getStripePriceConfig / getLemonSqueezyPriceConfig (Währung + Plan)
    ↓
Korrekte Preis-ID für die Währung des Benutzers
```

## Geänderte Dateien

### 1. `app/[locale]/config.tsx`
- Verwendet `useCurrencyContext()`, um die Währung des Benutzers zu erhalten
- Generiert automatisch eine Preiskonfiguration basierend auf der Währung, wenn keine Konfiguration angegeben wird
- Verwendet `getDefaultPricingConfigWithCurrency()`, um eine Multi-Währung-Konfiguration zu erstellen

### 2. `hooks/use-create-checkout.ts`
- Verwendet `useCurrencyContext()`, um die Währung zu erhalten
- Ruft `getStripePriceConfig()` auf, um die korrekte Preis-ID basierend auf der Währung zu erhalten
- Fällt auf `plan.stripePriceId` zurück, wenn keine Multi-Währung-Konfiguration verfügbar ist

### 3. `hooks/use-pricing-section.ts`
- Verwendet `useCurrencyContext()`, um die Währung zu erhalten
- Ruft `getLemonSqueezyPriceConfig()` für LemonSqueezy auf
- Verwendet währungsbasierte Preis-IDs zur Checkout-Zeit

## Verwendung

### Für Entwickler

Das System funktioniert automatisch. Keine Änderungen in bestehenden Komponenten erforderlich.

**Verwendungsbeispiel in einer Komponente:**

```tsx
import { useConfig } from '@/app/[locale]/config';
import { useCurrencyContext } from '@/components/context/currency-provider';

function PricingComponent() {
  const config = useConfig();
  const { currency } = useCurrencyContext();
  
  // config.pricing wird automatisch mit der Währung des Benutzers angereichert
  // Preis-IDs basieren auf der Währung des Benutzers
  const standardPlan = config.pricing?.plans.STANDARD;
  
  // Währungssymbol wird automatisch aktualisiert
  const currencySymbol = config.pricing?.currency; // €, £, $, etc.
}
```

### Für Checkout-Hooks

Checkout-Hooks verwenden automatisch Multi-Währung-Konfigurationen:

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## Konfiguration der Umgebungsvariablen

Damit das System funktioniert, müssen Umgebungsvariablen für jede Währung konfiguriert werden in:

- `lib/config/billing/stripe.config.ts`: `NEXT_PUBLIC_STRIPE_*_PRICE_ID_*` Variablen
- `lib/config/billing/lemonsqueezy.config.ts`: `NEXT_PUBLIC_LEMONSQUEEZY_*_PRICE_ID_*` Variablen

**Beispiel für Stripe:**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## Unterstützte Währungen

Unterstützte Währungen sind in `lib/config/billing/types.ts` definiert:

- USD, EUR, GBP, CAD (in Abrechnungskonfigurationen konfiguriert)
- Andere ISO 4217-Währungen (Fallback auf USD)

## Fallback

Falls eine Währung nicht unterstützt wird oder keine Multi-Währung-Konfigurationen verfügbar sind:

1. Das System verwendet `plan.stripePriceId` / `plan.lemonVariantId` (statische Konfiguration)
2. Standardwährung ist USD
3. Standardsymbol ist $

## Testen

Um das Multi-Währung-System zu testen:

1. Ändere die Währung des Benutzers über `/api/user/currency`
2. Überprüfe, dass sich Preis-IDs entsprechend der Währung ändern
3. Teste Checkout mit verschiedenen Währungen

## Wichtige Hinweise

- Preis-IDs werden **zur Checkout-Zeit** aufgelöst, nicht zur Anzeigezeit
- Die Preiskonfiguration in `content/config.yml` hat Vorrang vor der Standardkonfiguration
- Multi-Währung-Konfigurationen werden nur verwendet, wenn Umgebungsvariablen konfiguriert sind

## Integration mit Zahlungsanbietern

Das Multi-Währung-System funktioniert nahtlos mit allen Zahlungsanbietern:

- **Stripe**: Verwendet `getStripePriceConfig()`, um währungsspezifische Preis-IDs zu erhalten
- **LemonSqueezy**: Verwendet `getLemonSqueezyPriceConfig()`, um währungsspezifische Varianten-IDs zu erhalten
- **Polar**: Unterstützt Multi-Währung durch Produktkonfiguration

Für detaillierte anbieterspezifische Konfiguration, siehe:
- [Stripe-Konfiguration](./stripe)
- [LemonSqueezy-Konfiguration](./lemonsqueezy)
- [Polar-Konfiguration](./polar)
