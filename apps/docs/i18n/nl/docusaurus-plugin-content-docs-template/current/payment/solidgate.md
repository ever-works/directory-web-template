---
id: solidgate
title: Solidgate-integratie
sidebar_label: Solide poort
sidebar_position: 5
---

# Solidgate-integratie

Solidgate is een van de vier ondersteunde betalingsproviders in de Ever Works-sjabloon. Het biedt betaalsessies, webhook-afhandeling, abonnementsbeheer en ondersteuning voor meerdere valuta via een uniforme providerinterface.

## Bronlocaties

```
lib/payment/lib/providers/solidgate-provider.ts    # Provider implementation
lib/payment/ui/solidgate/solidgate-elements.tsx     # React SDK component
lib/payment/config/payment-provider-manager.ts      # Config & initialization
app/api/solidgate/checkout/route.ts                 # Checkout API endpoint
app/api/solidgate/webhook/route.ts                  # Webhook handler
```

## Omgevingsvariabelen

Configureer Solidgate door de volgende omgevingsvariabelen in te stellen:

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

De `ConfigManager` in `payment-provider-manager.ts` valideert deze bij de eerste toegang. Als een vereiste variabele ontbreekt, wordt er een fout gegenereerd met een beschrijvend bericht:

```
Solidgate configuration is incomplete.
Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID,
SOLIDGATE_WEBHOOK_SECRET, SOLIDGATE_SECRET_KEY
```

## Providerarchitectuur

De `SolidgateProvider` implementeert de `PaymentProviderInterface` , waardoor deze uitwisselbaar is met Stripe, LemonSqueezy en Polar:

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

### Initialisatie

Toegang tot de Solidgate-provider via de singleton-manager:

```ts
import {
  getOrCreateSolidgateProvider,
  initializeSolidgateProvider,
} from '@/lib/payment/config/payment-provider-manager';

// Get or lazily create the singleton
const provider = getOrCreateSolidgateProvider();
```

## Afrekenstroom

### 1. Klant maakt afrekening aan

De klant initieert een betaling door een bericht te posten op het API-eindpunt:

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

### 2. Server valideert en creëert betalingsintentie

De afrekenroute ( `app/api/solidgate/checkout/route.ts` ) voert deze stappen uit:

1. **Authenticeert** de gebruiker via `auth()` (NextAuth-sessie)
2. **Valideert** de verzoektekst met Zod:
   ```ts
   const checkoutSchema = z.object({
     bedrag: z.getal().positief(),
     valuta: z.string().default('USD'),
     mode: z.enum(['eenmalig', 'abonnement']).default('eenmalig'),
     succesUrl: z.string().url(),
     cancelUrl: z.string().url(),
     metadata: z.record(z.string(), z.any()).optioneel(),
   });
   ```
3. **Haalt of creëert** een Solidgate-klant-ID
4. **Maakt een betalingsintentie aan** via de Solidgate API
5. **Retourneert** de betalings-ID en het klantgeheim voor de SDK

### 3. Reactiestructuur

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

### 4. Klant geeft het betalingsformulier weer

Gebruik de geretourneerde betalingsintentie-ID om de Solidgate React SDK te initialiseren.

## Reageer SDK-integratie

De sjabloon verpakt de officiële `@solidgate/react-sdk` in een aangepaste component:

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

De `SolidgateProvider.getUIComponents()` -methode injecteert automatisch de verkoper-ID, betalingsintentie en HMAC-handtekening in de wrapper:

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

## Handtekening genereren

Solidgate vereist HMAC-SHA512-handtekeningen voor API-authenticatie en webhookverificatie:

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

## Klantenbeheer

De provider volgt een opzoekstrategie op drie niveaus voor klant-ID's:

1. **Gebruikersmetadata** -- vink `user.user_metadata.solidgate_customer_id` aan
2. **Database** -- doorzoek de `PaymentAccount` tabel via `paymentAccountClient` 3. **Nieuwe maken** -- roep de Solidgate `/customers` API aan en synchroniseer terug naar de database

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

## Abonnementsbeheer

### Abonnement aanmaken

```ts
const subscription = await provider.createSubscription({
  customerId: 'cust_abc123',
  priceId: 'plan_monthly',
  metadata: { userId: 'user-id' },
});
```

### Abonnement opzeggen

De aanbieder ondersteunt zowel eindeperiode als onmiddellijke opzegging:

```ts
// Cancel at period end (default)
await provider.cancelSubscription(subscriptionId);

// Cancel immediately
await provider.cancelSubscription(subscriptionId, false);
```

De annuleringsmethode selecteert het juiste API-eindpunt op basis van de vlag:

```ts
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Statustoewijzing

Solidgate-abonnementsstatussen worden toegewezen aan de `SubscriptionStatus` -enum van de sjabloon:

| Solidgate-status | Sjabloonstatus |
|----------------|----------------|
| `active` | `ACTIVE` |
| `cancelled` / `canceled` | `CANCELED` |
| `past_due` | `PAST_DUE` |
| `trialing` / `trial` | `TRIALING` |
| `unpaid` | `UNPAID` |
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |

## Ondersteunde kaartmerken

De aanbieder verklaart ondersteuning voor Visa, Mastercard, Amex en Discover met licht/donker themapictogrammen:

```ts
const solidgateCardBrands: CardBrandIcon[] = [
  { name: 'visa',       lightIcon: '/assets/payment/solidgate/visa-light.svg', ... },
  { name: 'mastercard', lightIcon: '/assets/payment/solidgate/mastercard-light.svg', ... },
  { name: 'amex',       lightIcon: '/assets/payment/solidgate/amex-light.svg', ... },
  { name: 'discover',   lightIcon: '/assets/payment/solidgate/discover-light.svg', ... },
];
```

## Lokalisatie

De provider bevat ingebouwde vertalingen voor Engels en Frans:

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

## Terugbetalingen

Voer een volledige of gedeeltelijke terugbetaling uit via de aanbieder:

```ts
// Full refund
const refund = await provider.refundPayment(paymentId);

// Partial refund (in decimal, e.g., $10.00)
const partialRefund = await provider.refundPayment(paymentId, 10.00);
```

Bedragen worden omgezet naar centen voordat ze naar de Solidgate API worden verzonden.

## Foutafhandeling

Alle providermethoden gebruiken consistente foutafhandeling met een gestructureerde logger:

```ts
private get logger() {
  return {
    info: (msg, ctx?) => console.log(`[SolidgateProvider] ${msg}`, ctx),
    warn: (msg, ctx?) => console.warn(`[SolidgateProvider] ${msg}`, ctx),
    error: (msg, ctx?) => console.error(`[SolidgateProvider] ${msg}`, ctx),
  };
}
```

API-fouten omvatten de HTTP-statuscode en de antwoordtekst voor foutopsporing:

```
Solidgate API error: 422 Unprocessable Entity - {"error":"Invalid amount"}
```
