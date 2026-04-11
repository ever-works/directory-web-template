---
id: solidgate
title: Integrazione Solidgate
sidebar_label: Solidgate
sidebar_position: 5
---

# Integrazione Solidgate

Solidgate è uno dei quattro fornitori di servizi di pagamento supportati nel modello Ever Works. Fornisce sessioni di pagamento, gestione dei webhook, gestione degli abbonamenti e supporto multivaluta attraverso un'interfaccia del provider unificata.

## Posizioni delle fonti

```
lib/payment/lib/providers/solidgate-provider.ts    # Provider implementation
lib/payment/ui/solidgate/solidgate-elements.tsx     # React SDK component
lib/payment/config/payment-provider-manager.ts      # Config & initialization
app/api/solidgate/checkout/route.ts                 # Checkout API endpoint
app/api/solidgate/webhook/route.ts                  # Webhook handler
```

## Variabili d'ambiente

Configura Solidgate impostando le seguenti variabili di ambiente:

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

Il `ConfigManager` in `payment-provider-manager.ts` li convalida al primo accesso. Se manca una variabile richiesta, viene generato un errore con un messaggio descrittivo:

```
Solidgate configuration is incomplete.
Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID,
SOLIDGATE_WEBHOOK_SECRET, SOLIDGATE_SECRET_KEY
```

## Architettura del fornitore

Il `SolidgateProvider` implementa il `PaymentProviderInterface` , rendendolo intercambiabile con Stripe, LemonSqueezy e Polar:

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

### Inizializzazione

Accedi al provider Solidgate tramite il gestore singleton:

```ts
import {
  getOrCreateSolidgateProvider,
  initializeSolidgateProvider,
} from '@/lib/payment/config/payment-provider-manager';

// Get or lazily create the singleton
const provider = getOrCreateSolidgateProvider();
```

## Flusso di pagamento

### 1. Il cliente crea il pagamento

Il client avvia un checkout pubblicando sull'endpoint API:

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

### 2. Il server convalida e crea l'intento di pagamento

Il percorso di pagamento ( `app/api/solidgate/checkout/route.ts` ) esegue questi passaggi:

1. **Autentica** l'utente tramite `auth()` (sessione NextAuth)
2. **Convalida** il corpo della richiesta con Zod:
   ```ts
   const checkoutSchema = z.object({
     importo: z.number().positive(),
     valuta: z.string().default('USD'),
     modalità: z.enum(['one_time', 'abbonamento']).default('one_time'),
     successUrl: z.string().url(),
     cancelUrl: z.string().url(),
     metadati: z.record(z.string(), z.any()).opzionale(),
   });
   ```
3. **Recupera o crea** un ID cliente Solidgate
4. **Crea un intento di pagamento** tramite l'API Solidgate
5. **Restituisce** l'ID pagamento e il segreto client per l'SDK

### 3. Struttura della risposta

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

### 4. Il Cliente visualizza il modulo di pagamento

Utilizza l'ID intento di pagamento restituito per inizializzare l'SDK Solidgate React.

## Integrazione dell'SDK React

Il modello racchiude il `@solidgate/react-sdk` ufficiale in un componente personalizzato:

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

Il metodo `SolidgateProvider.getUIComponents()` inserisce automaticamente l'ID commerciante, l'intento di pagamento e la firma HMAC nel wrapper:

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

## Generazione della firma

Solidgate richiede le firme HMAC-SHA512 per l'autenticazione API e la verifica del webhook:

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

##Gestione dei clienti

Il fornitore segue una strategia di ricerca a tre livelli per gli ID cliente:

1. **Metadati utente** -- seleziona `user.user_metadata.solidgate_customer_id` 2. **Database** -- interroga la tabella `PaymentAccount` tramite `paymentAccountClient` 3. **Crea nuovo**: richiama l'API Solidgate `/customers` e sincronizza nuovamente con il database

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

## Gestione degli abbonamenti

### Crea abbonamento

```ts
const subscription = await provider.createSubscription({
  customerId: 'cust_abc123',
  priceId: 'plan_monthly',
  metadata: { userId: 'user-id' },
});
```

### Annulla l'abbonamento

Il fornitore supporta sia la fine del periodo che la cancellazione immediata:

```ts
// Cancel at period end (default)
await provider.cancelSubscription(subscriptionId);

// Cancel immediately
await provider.cancelSubscription(subscriptionId, false);
```

Il metodo cancel seleziona l'endpoint API appropriato in base al flag:

```ts
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Mappatura dello stato

Gli stati dell'abbonamento a Solidgate sono mappati sull'enumerazione `SubscriptionStatus` del modello:

| Stato Solidgate | Stato del modello |
|------------------|------------------|
| `active` | `ACTIVE` |
| `cancelled` / `canceled` | `CANCELED` |
| `past_due` | `PAST_DUE` |
| `trialing` / `trial` | `TRIALING` |
| `unpaid` | `UNPAID` |
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |

## Marche di carte supportate

Il fornitore dichiara il supporto per Visa, Mastercard, Amex e Discover con icone a tema chiaro/scuro:

```ts
const solidgateCardBrands: CardBrandIcon[] = [
  { name: 'visa',       lightIcon: '/assets/payment/solidgate/visa-light.svg', ... },
  { name: 'mastercard', lightIcon: '/assets/payment/solidgate/mastercard-light.svg', ... },
  { name: 'amex',       lightIcon: '/assets/payment/solidgate/amex-light.svg', ... },
  { name: 'discover',   lightIcon: '/assets/payment/solidgate/discover-light.svg', ... },
];
```

## Localizzazione

Il fornitore include traduzioni integrate per inglese e francese:

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

## Rimborsi

Emetti un rimborso totale o parziale tramite il fornitore:

```ts
// Full refund
const refund = await provider.refundPayment(paymentId);

// Partial refund (in decimal, e.g., $10.00)
const partialRefund = await provider.refundPayment(paymentId, 10.00);
```

Gli importi vengono convertiti in centesimi prima dell'invio all'API Solidgate.

## Gestione degli errori

Tutti i metodi del provider utilizzano una gestione degli errori coerente con un logger strutturato:

```ts
private get logger() {
  return {
    info: (msg, ctx?) => console.log(`[SolidgateProvider] ${msg}`, ctx),
    warn: (msg, ctx?) => console.warn(`[SolidgateProvider] ${msg}`, ctx),
    error: (msg, ctx?) => console.error(`[SolidgateProvider] ${msg}`, ctx),
  };
}
```

Gli errori API includono il codice di stato HTTP e il corpo della risposta per il debug:

```
Solidgate API error: 422 Unprocessable Entity - {"error":"Invalid amount"}
```
