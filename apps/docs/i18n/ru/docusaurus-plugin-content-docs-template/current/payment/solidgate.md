---
id: solidgate
title: Интеграция Solidgate
sidebar_label: Солидгейт
sidebar_position: 5
---

# Интеграция Solidgate

Solidgate — один из четырех поставщиков платежей, поддерживаемых в шаблоне Ever Works. Он обеспечивает сеансы оформления заказа, обработку веб-перехватчиков, управление подписками и мультивалютную поддержку через единый интерфейс поставщика.

## Исходные локации

```
lib/payment/lib/providers/solidgate-provider.ts    # Provider implementation
lib/payment/ui/solidgate/solidgate-elements.tsx     # React SDK component
lib/payment/config/payment-provider-manager.ts      # Config & initialization
app/api/solidgate/checkout/route.ts                 # Checkout API endpoint
app/api/solidgate/webhook/route.ts                  # Webhook handler
```

## Переменные среды

Настройте Solidgate, задав следующие переменные среды:

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

`ConfigManager` в `payment-provider-manager.ts` подтверждает их при первом доступе. Если какая-либо обязательная переменная отсутствует, выдается ошибка с описательным сообщением:

```
Solidgate configuration is incomplete.
Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID,
SOLIDGATE_WEBHOOK_SECRET, SOLIDGATE_SECRET_KEY
```

## Архитектура поставщика `SolidgateProvider` реализует `PaymentProviderInterface` , что делает его взаимозаменяемым с Stripe, LemonSqueezy и Polar:

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

Получите доступ к поставщику Solidgate через менеджер синглтонов:

```ts
import {
  getOrCreateSolidgateProvider,
  initializeSolidgateProvider,
} from '@/lib/payment/config/payment-provider-manager';

// Get or lazily create the singleton
const provider = getOrCreateSolidgateProvider();
```

## Порядок оформления заказа

### 1. Клиент создает кассу

Клиент инициирует оформление заказа, отправив сообщение в конечную точку API:

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

### 2. Сервер проверяет и создает намерение платежа

Маршрут оформления заказа ( `app/api/solidgate/checkout/route.ts` ) выполняет следующие шаги:

1. **Аутентифицирует** пользователя через `auth()` (сеанс NextAuth).
2. **Проверяет** тело запроса с помощью Zod:
   ``` тс
   const checkoutSchema = z.object({
     сумма: z.number().positive(),
     валюта: z.string().default('USD'),
     режим: z.enum(['one_time', 'подписка']).default('one_time'),
     SuccessUrl: z.string().url(),
     cancelUrl: z.string().url(),
     метаданные: z.record(z.string(), z.any()).optional(),
   });
   ```
3. **Получает или создает** идентификатор клиента Solidgate.
4. **Создает платежное намерение** через Solidgate API.
5. **Возвращает** идентификатор платежа и секрет клиента для SDK.

### 3. Структура ответа

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

### 4. Клиент отображает форму платежа

Используйте возвращенный идентификатор платежного намерения для инициализации Solidgate React SDK.

## Интеграция React SDK

Шаблон оборачивает официальный `@solidgate/react-sdk` в пользовательский компонент:

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

Метод `SolidgateProvider.getUIComponents()` автоматически вставляет в оболочку идентификатор продавца, намерение платежа и подпись HMAC:

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

## Генерация подписи

Solidgate требует подписи HMAC-SHA512 для аутентификации API и проверки веб-перехватчика:

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

## Управление клиентами

Поставщик следует трехуровневой стратегии поиска идентификаторов клиентов:

1. **Метаданные пользователя** – отметьте `user.user_metadata.solidgate_customer_id` 2. **База данных** — запрос таблицы `PaymentAccount` через `paymentAccountClient` .
3. **Создать новый** – вызвать Solidgate `/customers` API и выполнить обратную синхронизацию с базой данных.

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

## Управление подпиской

### Создать подписку

```ts
const subscription = await provider.createSubscription({
  customerId: 'cust_abc123',
  priceId: 'plan_monthly',
  metadata: { userId: 'user-id' },
});
```

### Отменить подписку

Поставщик поддерживает как окончание периода, так и немедленную отмену:

```ts
// Cancel at period end (default)
await provider.cancelSubscription(subscriptionId);

// Cancel immediately
await provider.cancelSubscription(subscriptionId, false);
```

Метод отмены выбирает соответствующую конечную точку API на основе флага:

```ts
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Сопоставление состояний

Статусы подписки Solidgate сопоставляются с перечислением `SubscriptionStatus` шаблона:

| Статус Solidgate | Статус шаблона |
|------------------|-----------------|
| `active` | `ACTIVE` |
| `cancelled` / `canceled` | `CANCELED` |
| `past_due` | `PAST_DUE` |
| `trialing` / `trial` | `TRIALING` |
| `unpaid` | `UNPAID` |
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |

## Поддерживаемые бренды карт

Провайдер заявляет о поддержке Visa, Mastercard, Amex и Discover с помощью значков светлой/темной темы:

```ts
const solidgateCardBrands: CardBrandIcon[] = [
  { name: 'visa',       lightIcon: '/assets/payment/solidgate/visa-light.svg', ... },
  { name: 'mastercard', lightIcon: '/assets/payment/solidgate/mastercard-light.svg', ... },
  { name: 'amex',       lightIcon: '/assets/payment/solidgate/amex-light.svg', ... },
  { name: 'discover',   lightIcon: '/assets/payment/solidgate/discover-light.svg', ... },
];
```

## Локализация

Провайдер включает встроенные переводы на английский и французский языки:

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

## Возвраты

Оформить полный или частичный возврат средств через провайдера:

```ts
// Full refund
const refund = await provider.refundPayment(paymentId);

// Partial refund (in decimal, e.g., $10.00)
const partialRefund = await provider.refundPayment(paymentId, 10.00);
```

Суммы конвертируются в центы перед отправкой в ​​Solidgate API.

## Обработка ошибок

Все методы поставщика используют согласованную обработку ошибок с помощью структурированного журнала:

```ts
private get logger() {
  return {
    info: (msg, ctx?) => console.log(`[SolidgateProvider] ${msg}`, ctx),
    warn: (msg, ctx?) => console.warn(`[SolidgateProvider] ${msg}`, ctx),
    error: (msg, ctx?) => console.error(`[SolidgateProvider] ${msg}`, ctx),
  };
}
```

Ошибки API включают код состояния HTTP и тело ответа для отладки:

```
Solidgate API error: 422 Unprocessable Entity - {"error":"Invalid amount"}
```
