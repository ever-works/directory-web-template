---
id: configuration
title: Zahlungskonfiguration
sidebar_label: Konfigurationshandbuch
sidebar_position: 6
description: Vollständige Anleitung zur Konfiguration von Zahlungsanbietern (Stripe, LemonSqueezy, Polar, Solidgate) mit Multi-Währungs-Unterstützung
keywords: [Zahlung, Konfiguration, stripe, lemonsqueezy, polar, solidgate, multi-währung]
---

# Zahlungskonfiguration

Diese Anleitung erklärt, wie die verschiedenen von der Anwendung unterstützten Zahlungsanbieter konfiguriert werden.

## Inhaltsverzeichnis

- [Übersicht](#overview)
- [Unterstützte Anbieter](#supported-providers)
- [Allgemeine Konfiguration](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [Multi-Währung](#multi-currency)
- [Testphasen und Einrichtungsgebühren](#trials-and-setup-fees)
- [Anbieterauswahl](#provider-selection)
- [Fehlerbehebung](#troubleshooting)

---

## Übersicht

Die Anwendung unterstützt mehrere Zahlungsanbieter für Abonnements:

| Anbieter     | Typ           | Multi-Währung  | Testphasen |
|--------------|---------------|----------------|--------|
| Stripe       | Abonnement    | ✅ Ja          | ✅ Ja  |
| LemonSqueezy | Abonnement    | ✅ Ja          | ✅ Ja  |
| Polar        | Abonnement    | ❌ Nein        | ❌ Nein |
| Solidgate    | Abonnement    | ⚠️ Teilweise  | ❌ Nein |

### Verfügbare Pläne

- **Kostenlos** - Kostenlos, grundlegende Funktionen
- **Standard** - Mittlerer Plan mit mehr Sichtbarkeit
- **Premium** - Vollständiger Plan mit allen Funktionen

---

## Unterstützte Anbieter

### Architektur

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # Exporte
│       ├── types.ts              # Gemeinsame Typen
│       ├── stripe.config.ts      # Stripe Multi-Währungs-Konfiguration
│       ├── lemonsqueezy.config.ts # LemonSqueezy Multi-Währungs-Konfiguration
│       └── solidgate.config.ts   # Solidgate-Konfiguration (WIP)
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (WIP)
└── utils/
    └── payment-provider.ts       # Anbieterauswahl
```

---

## Allgemeine Konfiguration

### Angezeigte Preise (für die Benutzeroberfläche)

Diese Variablen definieren die in der Benutzeroberfläche angezeigten Preise:

```bash
# Preise in Dollar (oder Hauptwährung) - nur zur Anzeige
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### Testphasen (Testzeitraum)

```bash
# Betrag-IDs für Testphasen (Anfangsgebühren während der Testphase)
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# Testphasen mit autorisiertem Betrag aktivieren/deaktivieren
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### Voraussetzungen

1. Konto auf [Stripe Dashboard](https://dashboard.stripe.com) erstellen
2. API-Schlüssel abrufen (Einstellungen → API-Schlüssel)
3. Webhook konfigurieren

### Grundlegende Umgebungsvariablen

```bash
# ============================================
# STRIPE - Grundkonfiguration
# ============================================

# API-Schlüssel (erforderlich)
STRIPE_SECRET_KEY=sk_live_xxx           # Geheimer Schlüssel (Server)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # Öffentlicher Schlüssel
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Öffentlicher Schlüssel (Client)

# Webhook (erforderlich für Ereignisse)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Produktkonfiguration (Legacy - nur USD)

```bash
# Einfache Preise (für Rückwärtskompatibilität, nur USD)
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### Multi-Währungs-Konfiguration (Empfohlen)

#### Standard-Plan

```bash
# ============================================
# STRIPE STANDARD-PLAN
# ============================================

# Produkt-ID
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# Monatliche Preise nach Währung
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# Jährliche Preise nach Währung
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# Einrichtungsgebühren / Testbeträge nach Währung
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### Premium-Plan

```bash
# ============================================
# STRIPE PREMIUM-PLAN
# ============================================

# Produkt-ID
NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

# Monatliche Preise nach Währung
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

# Jährliche Preise nach Währung
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

# Einrichtungsgebühren / Testbeträge nach Währung
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### Preise in Stripe erstellen

1. Geh zu **Produkte** → Produkt erstellen
2. Preise für jede Währung hinzufügen:
   - Klick auf "Einen weiteren Preis hinzufügen"
   - Währung auswählen (EUR, GBP, CAD)
   - Entsprechenden Betrag festlegen
3. Jede `price_xxx` in die entsprechenden Variablen kopieren

### Stripe-Webhook

Webhook im Stripe Dashboard konfigurieren:

- **URL**: `https://deine-domain.com/api/stripe/webhook`
- **Zu beobachtende Ereignisse**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### Voraussetzungen

1. Konto auf [LemonSqueezy](https://lemonsqueezy.com) erstellen
2. Shop erstellen
3. Produkte und Varianten erstellen

### Umgebungsvariablen

```bash
# ============================================
# LEMONSQUEEZY - Grundkonfiguration
# ============================================

# API (erforderlich)
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx

# Webhook
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://deine-domain.com/api/lemonsqueezy/webhook

# Testmodus
LEMONSQUEEZY_TEST_MODE=false
```

### Varianten-Konfiguration (Legacy)

```bash
# Einfache Varianten
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx

# Varianten mit Einrichtungsgebühr (für Testphasen)
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### Multi-Währungs-Konfiguration

#### Standard-Plan

```bash
# ============================================
# LEMONSQUEEZY STANDARD-PLAN
# ============================================

# Produkt-ID
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx

# Monatliche Preise nach Währung
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx

# Jährliche Preise nach Währung
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx

# Einrichtungsgebühren nach Währung
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx
```

#### Premium-Plan

```bash
# ============================================
# LEMONSQUEEZY PREMIUM-PLAN
# ============================================

# Produkt-ID
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx

# Monatliche Preise nach Währung
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx

# Jährliche Preise nach Währung
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx

# Einrichtungsgebühren nach Währung
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### Voraussetzungen

1. Konto auf [Polar](https://polar.sh) erstellen
2. Organisation erstellen
3. Abonnementpläne erstellen

### Umgebungsvariablen

```bash
# ============================================
# POLAR - Konfiguration
# ============================================

# API (erforderlich)
POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx

# Webhook
POLAR_WEBHOOK_SECRET=xxx

# Sandbox-Modus (true für Tests, false für Produktion)
POLAR_SANDBOX=true

# API-URL (optional, Standard: api.polar.sh)
POLAR_API_URL=https://api.polar.sh

# Plan-IDs
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx

# Testbeträge (optional)
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning In Entwicklung
Die Solidgate-Integration befindet sich derzeit in der Entwicklung. Einige Funktionen sind möglicherweise noch nicht vollständig verfügbar.
:::

### Voraussetzungen

1. Konto auf [Solidgate](https://solidgate.com) erstellen
2. API-Anmeldedaten vom Händlerportal abrufen
3. Webhook-Endpunkt konfigurieren

### Umgebungsvariablen

```bash
# ============================================
# SOLIDGATE - Konfiguration (WIP)
# ============================================

# API-Anmeldedaten (erforderlich)
SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx

# Webhook
SOLIDGATE_WEBHOOK_SECRET=xxx

# Umgebung (test oder live)
SOLIDGATE_ENVIRONMENT=test
```

### Produktkonfiguration

```bash
# ============================================
# SOLIDGATE-PLÄNE (WIP)
# ============================================

# Produkt-IDs
NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx

# Preis-IDs (derzeit nur USD)
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### Aktuelle Einschränkungen

| Funktion         | Status         | Hinweise                              |
|------------------|----------------|------------------------------------|
| Grundzahlungen   | ✅ Implementiert | Einmalige und Abonnementzahlungen |
| Multi-Währung    | ⚠️ Teilweise  | Derzeit nur USD                  |
| Testphasen       | ❌ Noch nicht  | Für zukünftige Veröffentlichung geplant |
| Webhooks         | ⚠️ Teilweise  | Nur grundlegende Ereignisse        |
| Rückerstattungen | ❌ Noch nicht  | Für zukünftige Veröffentlichung geplant |

---

## Multi-Währung

### Unterstützte Währungen

| Code | Währung          | Symbol |
|------|------------------|--------|
| USD  | US-Dollar        | $      |
| EUR  | Euro             | €      |
| GBP  | Britisches Pfund | £      |
| CAD  | Kanadischer Dollar | CA$  |

### Funktionsweise

1. Die Währung des Benutzers wird automatisch erkannt (Geolokalisierung, Einstellungen)
2. Das System wählt die `price_id` entsprechend der Währung aus
3. Wenn die Währung nicht konfiguriert ist, Fallback auf USD

### Verwendungsbeispiel

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  
  // Ruft automatisch die korrekte Preis-ID für die Währung ab
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      Abonnieren für {priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## Testphasen und Einrichtungsgebühren

### Konzept

- **Testphase**: Kostenloser oder vergünstigter Testzeitraum
- **Einrichtungsgebühr**: Anfangsgebühren zu Beginn der Testphase

### Konfiguration

```bash
# Testphasen mit autorisiertem Betrag aktivieren
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### Wichtig: Währungskonsistenz

:::caution
Alle Preise in einer Checkout-Sitzung müssen in der gleichen Währung sein.
:::

Wenn Testphasen mit Einrichtungsgebühren verwendet werden, muss eine Einrichtungsgebühr für jede Währung erstellt werden:

```bash
# ❌ FEHLER: Einrichtungsgebühr in USD + Hauptpreis in GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx  # USD
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP

# ✅ KORREKT: Beide in GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx  # GBP
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP
```

---

## Anbieterauswahl

### Priorität

1. **Vom Benutzer ausgewählter Anbieter** (Einstellungen)
2. **Standardanbieter** (Konfiguration)
3. **Fallback**: Stripe

### Standardanbieter-Konfiguration

In der Website-Konfigurationsdatei:

```typescript
// In der Website-Konfiguration
pricing: {
  provider: PaymentProvider.STRIPE  // oder LEMONSQUEEZY, POLAR
}
```

### Verwendungsbeispiel

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

## Fehlerbehebung

### Fehler: Währungskonflikt

```
Error: This price has currency=gbp, but other items use currency=usd
```

**Ursache**: Hauptpreis und Einrichtungsgebühr haben unterschiedliche Währungen.

**Lösung**: Einrichtungsgebühren für jede unterstützte Währung erstellen.

### Fehler: Ungültige Preis-ID

```
Error: Invalid price ID
```

**Ursache**: Die `price_id` existiert nicht oder ist nicht konfiguriert.

**Lösung**: Sicherstellen, dass die Umgebungsvariable eine gültige ID enthält.

### Webhook empfängt keine Ereignisse

1. Webhook-URL im Anbieter-Dashboard prüfen
2. Überprüfen, ob `WEBHOOK_SECRET` korrekt ist
3. Mit den Debugging-Tools des Anbieters testen

### Preise werden nicht korrekt angezeigt

1. `NEXT_PUBLIC_PRODUCT_PRICE_*` für angezeigte Werte prüfen
2. Sicherstellen, dass `price_id`-Werte den richtigen Währungen entsprechen
3. Entwicklungsserver nach Änderungen an `.env`-Dateien neu starten
