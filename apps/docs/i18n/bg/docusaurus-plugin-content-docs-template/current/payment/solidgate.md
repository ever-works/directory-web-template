---
id: solidgate
title: Интеграция на Solidgate
sidebar_label: Solidgate
sidebar_position: 5
---

# Интеграция на Solidgate

Solidgate е един от четирите поддържани доставчици на плащания в шаблона Ever Works. Той осигурява сесии за плащане, обработка на webhook, управление на абонаменти и поддръжка на няколко валути чрез унифициран интерфейс на доставчика.

## Изходни местоположения

```
lib/payment/lib/providers/solidgate-provider.ts    # Provider implementation
lib/payment/ui/solidgate/solidgate-elements.tsx     # React SDK component
lib/payment/config/payment-provider-manager.ts      # Config & initialization
app/api/solidgate/checkout/route.ts                 # Checkout API endpoint
app/api/solidgate/webhook/route.ts                  # Webhook handler
```

## Променливи на средата

Конфигурирайте Solidgate, като зададете следните променливи на средата:

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

`ConfigManager` в `payment-provider-manager.ts` ги валидира при първи достъп. Ако някоя необходима променлива липсва, тя извежда грешка с описателно съобщение:

```
Solidgate configuration is incomplete.
Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID,
SOLIDGATE_WEBHOOK_SECRET, SOLIDGATE_SECRET_KEY
```

## Архитектура на доставчика `SolidgateProvider` прилага `PaymentProviderInterface` , което го прави взаимозаменяем със Stripe, LemonSqueezy и Polar:

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

### Инициализация

Достъп до доставчика на Solidgate чрез мениджъра на сингълтън:

```ts
import {
  getOrCreateSolidgateProvider,
  initializeSolidgateProvider,
} from '@/lib/payment/config/payment-provider-manager';

// Get or lazily create the singleton
const provider = getOrCreateSolidgateProvider();
```

## Поток на плащане

### 1. Клиентът създава Checkout

Клиентът инициира плащане, като публикува в крайната точка на API:

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

### 2. Сървърът валидира и създава намерение за плащане

Маршрутът за плащане ( `app/api/solidgate/checkout/route.ts` ) изпълнява следните стъпки:

1. **Удостоверява** потребителя чрез `auth()` (NextAuth сесия)
2. **Потвърждава** тялото на заявката със Zod:
   ``` ц
   const checkoutSchema = z.object({
     сума: z.number().positive(),
     валута: z.string().default('USD'),
     режим: z.enum(['one_time', 'subscription']).default('one_time'),
     successUrl: z.string().url(),
     cancelUrl: z.string().url(),
     метаданни: z.record(z.string(), z.any()).optional(),
   });
   ```
3. **Извлича или създава** клиентски идентификатор на Solidgate
4. **Създава намерение за плащане** чрез Solidgate API
5. **Връща** идентификатора на плащане и тайната на клиента за SDK

### 3. Структура на отговора

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

### 4. Клиентът изобразява формуляра за плащане

Използвайте върнатия ID на намерение за плащане, за да инициализирате Solidgate React SDK.

## React SDK интеграция

Шаблонът обвива официалния `@solidgate/react-sdk` в персонализиран компонент:

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

Методът `SolidgateProvider.getUIComponents()` автоматично инжектира идентификатора на търговеца, намерението за плащане и HMAC подписа в обвивката:

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

## Генериране на подпис

Solidgate изисква HMAC-SHA512 подписи за удостоверяване на API и проверка на webhook:

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

## Управление на клиенти

Доставчикът следва тристепенна стратегия за търсене на клиентски идентификатори:

1. **Потребителски метаданни** -- отметнете `user.user_metadata.solidgate_customer_id` 2. **База данни** -- направете запитване до таблицата `PaymentAccount` чрез `paymentAccountClient` 3. **Създайте нов** -- извикайте Solidgate `/customers` API и синхронизирайте обратно към базата данни

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

## Управление на абонаменти

### Създаване на абонамент

```ts
const subscription = await provider.createSubscription({
  customerId: 'cust_abc123',
  priceId: 'plan_monthly',
  metadata: { userId: 'user-id' },
});
```

### Отказ от абонамент

Доставчикът поддържа както анулиране в края на периода, така и незабавно:

```ts
// Cancel at period end (default)
await provider.cancelSubscription(subscriptionId);

// Cancel immediately
await provider.cancelSubscription(subscriptionId, false);
```

Методът за отмяна избира подходящата крайна точка на API въз основа на флага:

```ts
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Картографиране на състоянието

Състоянията на абонамента на Solidgate се нанасят в списъка `SubscriptionStatus` на шаблона:

| Състояние на Solidgate | Състояние на шаблона |
|------------------|-----------------|
| `active` | `ACTIVE` |
| `cancelled` / `canceled` | `CANCELED` |
| `past_due` | `PAST_DUE` |
| `trialing` / `trial` | `TRIALING` |
| `unpaid` | `UNPAID` |
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |

## Поддържани марки карти

Доставчикът декларира поддръжка за Visa, Mastercard, Amex и Discover със светли/тъмни тематични икони:

```ts
const solidgateCardBrands: CardBrandIcon[] = [
  { name: 'visa',       lightIcon: '/assets/payment/solidgate/visa-light.svg', ... },
  { name: 'mastercard', lightIcon: '/assets/payment/solidgate/mastercard-light.svg', ... },
  { name: 'amex',       lightIcon: '/assets/payment/solidgate/amex-light.svg', ... },
  { name: 'discover',   lightIcon: '/assets/payment/solidgate/discover-light.svg', ... },
];
```

## Локализация

Доставчикът включва вградени преводи за английски и френски:

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

## Възстановявания

Издайте пълно или частично възстановяване на сумата чрез доставчика:

```ts
// Full refund
const refund = await provider.refundPayment(paymentId);

// Partial refund (in decimal, e.g., $10.00)
const partialRefund = await provider.refundPayment(paymentId, 10.00);
```

Сумите се преобразуват в центове, преди да бъдат изпратени към API на Solidgate.

## Обработка на грешки

Всички методи на доставчик използват последователно обработване на грешки със структуриран регистратор:

```ts
private get logger() {
  return {
    info: (msg, ctx?) => console.log(`[SolidgateProvider] ${msg}`, ctx),
    warn: (msg, ctx?) => console.warn(`[SolidgateProvider] ${msg}`, ctx),
    error: (msg, ctx?) => console.error(`[SolidgateProvider] ${msg}`, ctx),
  };
}
```

Грешките в API включват HTTP кода на състоянието и тялото на отговора за отстраняване на грешки:

```
Solidgate API error: 422 Unprocessable Entity - {"error":"Invalid amount"}
```
