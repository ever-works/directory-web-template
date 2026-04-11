---
id: solidgate
title: Solidgate-Integration
sidebar_label: Solidgate
sidebar_position: 5
---

# Solidgate-Integration

Solidgate ist einer von vier unterstützten Zahlungsanbietern in der Ever Works-Vorlage. Es bietet Checkout-Sitzungen, Webhook-Verwaltung, Abonnementverwaltung und Unterstützung für mehrere Währungen über eine einheitliche Anbieterschnittstelle.

## Quellorte

```
lib/payment/lib/providers/solidgate-provider.ts    # Provider implementation
lib/payment/ui/solidgate/solidgate-elements.tsx     # React SDK component
lib/payment/config/payment-provider-manager.ts      # Config & initialization
app/api/solidgate/checkout/route.ts                 # Checkout API endpoint
app/api/solidgate/webhook/route.ts                  # Webhook handler
```

## Umgebungsvariablen

Konfigurieren Sie Solidgate, indem Sie die folgenden Umgebungsvariablen festlegen:

```bash
# Required
SOLIDGATE_API_KEY=your_api_key
SOLIDGATE_SECRET_KEY=your_secret_key
SOLIDGATE_MERCHANT_ID=your_merchant_id
SOLIDGATE_WEBHOOK_SECRET=your_webhook_secret

# Optional
NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY=your_publishable_key
SOLIDGATE_API_BASE_URL=https://api.solidgate.com/v1
```

Das `ConfigManager` in `payment-provider-manager.ts` validiert diese beim ersten Zugriff. Wenn eine erforderliche Variable fehlt, wird ein Fehler mit einer beschreibenden Meldung ausgegeben:

```
Solidgate configuration is incomplete.
Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID,
SOLIDGATE_WEBHOOK_SECRET, SOLIDGATE_SECRET_KEY
```

## Anbieterarchitektur

Der `SolidgateProvider` implementiert den `PaymentProviderInterface` und macht ihn austauschbar mit Stripe, LemonSqueezy und Polar:

```ts
export class SolidgateProvider implements PaymentProviderInterface {
  private apiKey: string;
  private secretKey: string;
  private webhookSecret: string;
  private publishableKey: string;
  private apiBaseUrl: string;
  private merchantId: string;

  constructor(config: PaymentProviderConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey || '';
    this.webhookSecret = config.webhookSecret || '';
    this.publishableKey = config.options?.publishableKey || '';
    this.apiBaseUrl = config.options?.apiBaseUrl || SOLIDGATE_API_BASE_URL;
    this.merchantId = config.options?.merchantId || '';
  }
  // ... interface methods
}
```

### Initialisierung

Greifen Sie über den Singleton-Manager auf den Solidgate-Anbieter zu:

```ts
import {
  getOrCreateSolidgateProvider,
  initializeSolidgateProvider,
} from '@/lib/payment/config/payment-provider-manager';

// Get or lazily create the singleton
const provider = getOrCreateSolidgateProvider();
```

## Checkout-Ablauf

### 1. Kunde erstellt Checkout

Der Client initiiert einen Checkout, indem er Folgendes an den API-Endpunkt sendet:

```ts
const response = await fetch('/api/solidgate/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 29.99,
    currency: 'USD',
    mode: 'one_time',          // or 'subscription'
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    metadata: {
      planId: 'pro_plan',
      planName: 'Pro Plan',
    },
  }),
});
```

### 2. Server validiert und erstellt Zahlungsabsicht

Die Checkout-Route ( `app/api/solidgate/checkout/route.ts` ) führt folgende Schritte aus:

1. **Authentifiziert** den Benutzer über `auth()` (NextAuth-Sitzung)
2. **Validiert** den Anfragetext mit Zod:
   „Ts
   const checkoutSchema = z.object({
     Betrag: z.number().positive(),
     Währung: z.string().default('USD'),
     Modus: z.enum(['one_time', 'subscription']).default('one_time'),
     successUrl: z.string().url(),
     cancelUrl: z.string().url(),
     Metadaten: z.record(z.string(), z.any()).optional(),
   });
   „
3. **Ruft ab oder erstellt** eine Solidgate-Kunden-ID
4. **Erstellt eine Zahlungsabsicht** über die Solidgate-API
5. **Gibt** die Zahlungs-ID und das Client-Geheimnis für das SDK zurück

### 3. Antwortstruktur

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_generated-uuid_secret"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

### 4. Der Kunde gibt das Zahlungsformular aus

Verwenden Sie die zurückgegebene Zahlungsabsichts-ID, um das Solidgate React SDK zu initialisieren.

## SDK-Integration reagieren

Die Vorlage verpackt den offiziellen `@solidgate/react-sdk` in eine benutzerdefinierte Komponente:

```tsx
// lib/payment/ui/solidgate/solidgate-elements.tsx
import Payment from '@solidgate/react-sdk';

export function SolidgatePaymentForm({
  onSuccess,
  onError,
  merchantId,
  paymentIntent,
  signature,
}: SolidgateElementsWrapperProps) {
  const merchantData = {
    merchant: merchantId,
    signature: signature,
    paymentIntent: paymentIntent,
  };

  return (
    <div className="solidgate-payment-form space-y-4">
      <Payment
        merchantData={merchantData}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
```

Die `SolidgateProvider.getUIComponents()` -Methode fügt automatisch die Händler-ID, die Zahlungsabsicht und die HMAC-Signatur in den Wrapper ein:

```ts
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(
      paymentIntent, merchantId
    );

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature,
    });
  };

  return {
    PaymentForm: SolidgatePaymentFormWithConfig,
    logo: '/assets/payment/solidgate/solidgate-logo.svg',
    cardBrands: solidgateCardBrands,
    supportedPaymentMethods: ['card'],
    translations: solidgateTranslations,
  };
}
```

## Signaturgenerierung

Solidgate erfordert HMAC-SHA512-Signaturen für die API-Authentifizierung und Webhook-Überprüfung:

```ts
// Generic signature
private generateSignature(data: string, secret: string): string {
  return crypto
    .createHmac('sha512', secret)
    .update(data)
    .digest('hex');
}

// Payment intent signature for the React SDK
private generatePaymentIntentSignature(
  paymentIntent: string,
  merchantId: string
): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto
    .createHmac('sha512', this.secretKey)
    .update(data)
    .digest('hex');
}
```

## Kundenmanagement

Der Anbieter verfolgt eine dreistufige Suchstrategie für Kunden-IDs:

1. **Benutzermetadaten** – überprüfen Sie `user.user_metadata.solidgate_customer_id` 2. **Datenbank** – Abfrage der Tabelle `PaymentAccount` über `paymentAccountClient` 3. **Neu erstellen** – Rufen Sie die Solidgate `/customers` API auf und synchronisieren Sie sie wieder mit der Datenbank

```ts
async getCustomerId(user: User | null): Promise<string | null> {
  // 1. Check metadata
  const fromMetadata = this.extractCustomerIdFromMetadata(user);
  if (fromMetadata) return fromMetadata;

  // 2. Check database
  const fromDatabase = await this.retrieveCustomerIdFromDatabase(user.id);
  if (fromDatabase) return fromDatabase;

  // 3. Create new customer
  const newCustomer = await this.createNewSolidgateCustomer(user);
  await this.synchronizePaymentAccount(user.id, newCustomer.id);
  return newCustomer.id;
}
```

## Abonnementverwaltung

### Abonnement erstellen

```ts
const subscription = await provider.createSubscription({
  customerId: 'cust_abc123',
  priceId: 'plan_monthly',
  metadata: { userId: 'user-id' },
});
```

### Abonnement kündigen

Der Anbieter unterstützt sowohl die Kündigung am Ende der Periode als auch die sofortige Kündigung:

```ts
// Cancel at period end (default)
await provider.cancelSubscription(subscriptionId);

// Cancel immediately
await provider.cancelSubscription(subscriptionId, false);
```

Die Abbruchmethode wählt den entsprechenden API-Endpunkt basierend auf dem Flag aus:

```ts
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Statuszuordnung

Solidgate-Abonnementstatus werden der Enumeration `SubscriptionStatus` der Vorlage zugeordnet:

| Solidgate-Status | Vorlagenstatus |
|------------------|-----------------|
| `active` | `ACTIVE` |
| `cancelled` / `canceled` | `CANCELED` |
| `past_due` | `PAST_DUE` |
| `trialing` / `trial` | `TRIALING` |
| `unpaid` | `UNPAID` |
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |

## Unterstützte Kartenmarken

Der Anbieter erklärt die Unterstützung von Visa, Mastercard, Amex und Discover mit hellen/dunklen Themensymbolen:

```ts
const solidgateCardBrands: CardBrandIcon[] = [
  { name: 'visa',       lightIcon: '/assets/payment/solidgate/visa-light.svg', ... },
  { name: 'mastercard', lightIcon: '/assets/payment/solidgate/mastercard-light.svg', ... },
  { name: 'amex',       lightIcon: '/assets/payment/solidgate/amex-light.svg', ... },
  { name: 'discover',   lightIcon: '/assets/payment/solidgate/discover-light.svg', ... },
];
```

## Lokalisierung

Der Anbieter bietet integrierte Übersetzungen für Englisch und Französisch:

```ts
const solidgateTranslations = {
  en: {
    cardNumber: 'Card number',
    cardExpiry: 'Expiry date',
    cardCvc: 'CVV',
    submit: 'Pay securely',
    processingPayment: 'Processing your payment...',
    paymentSuccessful: 'Payment completed successfully',
    paymentFailed: 'Your payment could not be processed',
  },
  fr: {
    cardNumber: 'Numero de carte',
    cardExpiry: "Date d'expiration",
    // ...
  },
};
```

## Rückerstattungen

Veranlassen Sie eine vollständige oder teilweise Rückerstattung über den Anbieter:

```ts
// Full refund
const refund = await provider.refundPayment(paymentId);

// Partial refund (in decimal, e.g., $10.00)
const partialRefund = await provider.refundPayment(paymentId, 10.00);
```

Beträge werden vor dem Senden an die Solidgate-API in Cent umgerechnet.

## Fehlerbehandlung

Alle Anbietermethoden verwenden eine konsistente Fehlerbehandlung mit einem strukturierten Logger:

```ts
private get logger() {
  return {
    info: (msg, ctx?) => console.log(`[SolidgateProvider] ${msg}`, ctx),
    warn: (msg, ctx?) => console.warn(`[SolidgateProvider] ${msg}`, ctx),
    error: (msg, ctx?) => console.error(`[SolidgateProvider] ${msg}`, ctx),
  };
}
```

API-Fehler umfassen den HTTP-Statuscode und den Antworttext zum Debuggen:

```
Solidgate API error: 422 Unprocessable Entity - {"error":"Invalid amount"}
```
