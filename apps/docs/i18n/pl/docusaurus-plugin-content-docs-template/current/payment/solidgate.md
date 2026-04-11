---
id: solidgate
title: Integracja z Solidgatem
sidebar_label: Solidgate
sidebar_position: 5
---

# Integracja z Solidgate

Solidgate jest jednym z czterech dostawców płatności obsługiwanych w szablonie Ever Works. Zapewnia sesje realizacji transakcji, obsługę webhooków, zarządzanie subskrypcjami i obsługę wielu walut za pośrednictwem ujednoliconego interfejsu dostawcy.

## Lokalizacje źródłowe

```
lib/payment/lib/providers/solidgate-provider.ts    # Provider implementation
lib/payment/ui/solidgate/solidgate-elements.tsx     # React SDK component
lib/payment/config/payment-provider-manager.ts      # Config & initialization
app/api/solidgate/checkout/route.ts                 # Checkout API endpoint
app/api/solidgate/webhook/route.ts                  # Webhook handler
```

## Zmienne środowiskowe

Skonfiguruj Solidgate, ustawiając następujące zmienne środowiskowe:

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

`ConfigManager` w `payment-provider-manager.ts` sprawdza je przy pierwszym dostępie. Jeśli brakuje jakiejkolwiek wymaganej zmiennej, zgłasza błąd z opisowym komunikatem:

```
Solidgate configuration is incomplete.
Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID,
SOLIDGATE_WEBHOOK_SECRET, SOLIDGATE_SECRET_KEY
```

## Architektura dostawcy `SolidgateProvider` implementuje `PaymentProviderInterface` , dzięki czemu jest wymienny z Stripe, LemonSqueezy i Polar:

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

### Inicjalizacja

Uzyskaj dostęp do dostawcy Solidgate poprzez menedżera singleton:

```ts
import {
  getOrCreateSolidgateProvider,
  initializeSolidgateProvider,
} from '@/lib/payment/config/payment-provider-manager';

// Get or lazily create the singleton
const provider = getOrCreateSolidgateProvider();
```

## Przebieg realizacji transakcji

### 1. Klient tworzy kasę

Klient inicjuje realizację transakcji, wysyłając do punktu końcowego API:

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

### 2. Serwer sprawdza i tworzy zamiar płatności

Trasa realizacji transakcji ( `app/api/solidgate/checkout/route.ts` ) obejmuje następujące kroki:

1. **Uwierzytelnia** użytkownika poprzez `auth()` (sesja NextAuth)
2. **Weryfikuje** treść żądania za pomocą Zoda:
   ```t
   const checkoutSchema = z.object({
     kwota: z.number().positive(),
     waluta: z.string().default('USD'),
     tryb: z.enum(['jednorazowy', 'subskrypcja']).default('jednorazowy'),
     SuccessUrl: z.string().url(),
     anulujUrl: z.string().url(),
     metadane: z.record(z.string(), z.any()).opcjonalne(),
   });
   ```
3. **Pobiera lub tworzy** identyfikator klienta Solidgate
4. **Tworzy intencję płatniczą** poprzez API Solidgate
5. **Zwraca** identyfikator płatności i sekret klienta dla SDK

### 3. Struktura odpowiedzi

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

### 4. Klient udostępnia Formularz Płatności

Użyj zwróconego identyfikatora zamiaru płatności, aby zainicjować pakiet Solidgate React SDK.

## Integracja Reaguj z SDK

Szablon otacza oficjalne `@solidgate/react-sdk` komponentem niestandardowym:

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

Metoda `SolidgateProvider.getUIComponents()` automatycznie wstawia do opakowania identyfikator sprzedawcy, zamiar płatności i podpis HMAC:

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

## Generowanie podpisu

Solidgate wymaga podpisów HMAC-SHA512 do uwierzytelniania API i weryfikacji webhooka:

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

## Zarządzanie klientami

Dostawca stosuje trójstopniową strategię wyszukiwania identyfikatorów klientów:

1. **Metadane użytkownika** -- zaznacz `user.user_metadata.solidgate_customer_id` 2. **Baza danych** -- odpytuj tabelę `PaymentAccount` poprzez `paymentAccountClient` 3. **Utwórz nowy** -- wywołaj API Solidgate `/customers` i zsynchronizuj z bazą danych

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

## Zarządzanie subskrypcjami

### Utwórz subskrypcję

```ts
const subscription = await provider.createSubscription({
  customerId: 'cust_abc123',
  priceId: 'plan_monthly',
  metadata: { userId: 'user-id' },
});
```

### Anuluj subskrypcję

Dostawca obsługuje zarówno anulowanie na koniec okresu, jak i natychmiastowe:

```ts
// Cancel at period end (default)
await provider.cancelSubscription(subscriptionId);

// Cancel immediately
await provider.cancelSubscription(subscriptionId, false);
```

Metoda cancel wybiera odpowiedni punkt końcowy API w oparciu o flagę:

```ts
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Mapowanie stanu

Statusy subskrypcji Solidgate są mapowane na wyliczenie `SubscriptionStatus` szablonu:

| Stan Solidgate | Stan szablonu |
|--------------------------------|--------------------------------|
| `active` | `ACTIVE` |
| `cancelled` / `canceled` | `CANCELED` |
| `past_due` | `PAST_DUE` |
| `trialing` / `trial` | `TRIALING` |
| `unpaid` | `UNPAID` |
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |

## Obsługiwane marki kart

Dostawca deklaruje obsługę kart Visa, Mastercard, Amex i Discover z jasnymi/ciemnymi ikonami motywu:

```ts
const solidgateCardBrands: CardBrandIcon[] = [
  { name: 'visa',       lightIcon: '/assets/payment/solidgate/visa-light.svg', ... },
  { name: 'mastercard', lightIcon: '/assets/payment/solidgate/mastercard-light.svg', ... },
  { name: 'amex',       lightIcon: '/assets/payment/solidgate/amex-light.svg', ... },
  { name: 'discover',   lightIcon: '/assets/payment/solidgate/discover-light.svg', ... },
];
```

## Lokalizacja

Dostawca zawiera wbudowane tłumaczenia na język angielski i francuski:

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

## Zwroty pieniędzy

Wydaj pełny lub częściowy zwrot pieniędzy za pośrednictwem dostawcy:

```ts
// Full refund
const refund = await provider.refundPayment(paymentId);

// Partial refund (in decimal, e.g., $10.00)
const partialRefund = await provider.refundPayment(paymentId, 10.00);
```

Kwoty są przeliczane na centy przed wysłaniem do API Solidgate.

## Obsługa błędów

Wszystkie metody dostawcy wykorzystują spójną obsługę błędów za pomocą rejestratora strukturalnego:

```ts
private get logger() {
  return {
    info: (msg, ctx?) => console.log(`[SolidgateProvider] ${msg}`, ctx),
    warn: (msg, ctx?) => console.warn(`[SolidgateProvider] ${msg}`, ctx),
    error: (msg, ctx?) => console.error(`[SolidgateProvider] ${msg}`, ctx),
  };
}
```

Błędy interfejsu API obejmują kod stanu HTTP i treść odpowiedzi do debugowania:

```
Solidgate API error: 422 Unprocessable Entity - {"error":"Invalid amount"}
```
