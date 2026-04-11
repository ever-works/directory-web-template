---
id: solidgate
title: Integración de puerta sólida
sidebar_label: puerta solida
sidebar_position: 5
---

# Integración de Solidgate

Solidgate es uno de los cuatro proveedores de pagos admitidos en la plantilla Ever Works. Proporciona sesiones de pago, manejo de webhooks, administración de suscripciones y soporte multidivisa a través de una interfaz de proveedor unificada.

## Ubicaciones de origen

```
lib/payment/lib/providers/solidgate-provider.ts    # Provider implementation
lib/payment/ui/solidgate/solidgate-elements.tsx     # React SDK component
lib/payment/config/payment-provider-manager.ts      # Config & initialization
app/api/solidgate/checkout/route.ts                 # Checkout API endpoint
app/api/solidgate/webhook/route.ts                  # Webhook handler
```

## Variables de entorno

Configure Solidgate configurando las siguientes variables de entorno:

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

El `ConfigManager` en `payment-provider-manager.ts` los valida en el primer acceso. Si falta alguna variable requerida, arroja un error con un mensaje descriptivo:

```
Solidgate configuration is incomplete.
Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID,
SOLIDGATE_WEBHOOK_SECRET, SOLIDGATE_SECRET_KEY
```

## Arquitectura del proveedor

El `SolidgateProvider` implementa el `PaymentProviderInterface` , haciéndolo intercambiable con Stripe, LemonSqueezy y Polar:

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

### Inicialización

Acceda al proveedor de Solidgate a través del administrador singleton:

```ts
import {
  getOrCreateSolidgateProvider,
  initializeSolidgateProvider,
} from '@/lib/payment/config/payment-provider-manager';

// Get or lazily create the singleton
const provider = getOrCreateSolidgateProvider();
```

## Flujo de pago

### 1. El cliente crea el pago

El cliente inicia un pago publicando en el punto final de API:

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

### 2. El servidor valida y crea la intención de pago

La ruta de pago ( `app/api/solidgate/checkout/route.ts` ) realiza estos pasos:

1. **Autentica** al usuario mediante `auth()` (NextAuth session)
2. **Valida** el cuerpo de la solicitud con Zod:
   ```ts
   const checkoutSchema = z.objeto({
     cantidad: z.número().positivo(),
     moneda: z.string().default('USD'),
     modo: z.enum(['one_time', 'subscription']).default('one_time'),
     URL de éxito: z.string().url(),
     cancelarUrl: z.string().url(),
     metadatos: z.record(z.string(), z.any()).opcional(),
   });
   ```
3. **Recupera o crea** un ID de cliente de Solidgate
4. **Crea una intención de pago** a través de la API de Solidgate
5. **Devuelve** el ID de pago y el secreto del cliente para el SDK.

### 3. Estructura de respuesta

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

### 4. El cliente presenta el formulario de pago

Utilice el ID de intención de pago devuelto para inicializar el SDK de Solidgate React.

## Reaccionar integración del SDK

La plantilla envuelve el `@solidgate/react-sdk` oficial en un componente personalizado:

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

El método `SolidgateProvider.getUIComponents()` inyecta automáticamente el ID del comerciante, la intención de pago y la firma HMAC en el contenedor:

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

## Generación de firma

Solidgate requiere firmas HMAC-SHA512 para la autenticación de API y la verificación de webhook:

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

## Gestión de clientes

El proveedor sigue una estrategia de búsqueda de tres niveles para las identificaciones de clientes:

1. **Metadatos del usuario**: marque `user.user_metadata.solidgate_customer_id` 2. **Base de datos**: consulta la tabla `PaymentAccount` mediante `paymentAccountClient` 3. **Crear nuevo**: llame a la API `/customers` de Solidgate y sincronice nuevamente con la base de datos.

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

## Gestión de suscripciones

### Crear suscripción

```ts
const subscription = await provider.createSubscription({
  customerId: 'cust_abc123',
  priceId: 'plan_monthly',
  metadata: { userId: 'user-id' },
});
```

### Cancelar suscripción

El proveedor admite tanto la cancelación de fin de período como la cancelación inmediata:

```ts
// Cancel at period end (default)
await provider.cancelSubscription(subscriptionId);

// Cancel immediately
await provider.cancelSubscription(subscriptionId, false);
```

El método de cancelación selecciona el punto final API apropiado según la bandera:

```ts
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Mapeo de estado

Los estados de suscripción de Solidgate se asignan a la enumeración `SubscriptionStatus` de la plantilla:

| Estado de Solidgate | Estado de la plantilla |
|------------------|-----------------|
| `active` | `ACTIVE` |
| `cancelled` / `canceled` | `CANCELED` |
| `past_due` | `PAST_DUE` |
| `trialing` / `trial` | `TRIALING` |
| `unpaid` | `UNPAID` |
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |

## Marcas de tarjetas admitidas

El proveedor declara soporte para Visa, Mastercard, Amex y Discover con íconos de temas claros/oscuros:

```ts
const solidgateCardBrands: CardBrandIcon[] = [
  { name: 'visa',       lightIcon: '/assets/payment/solidgate/visa-light.svg', ... },
  { name: 'mastercard', lightIcon: '/assets/payment/solidgate/mastercard-light.svg', ... },
  { name: 'amex',       lightIcon: '/assets/payment/solidgate/amex-light.svg', ... },
  { name: 'discover',   lightIcon: '/assets/payment/solidgate/discover-light.svg', ... },
];
```

## Localización

El proveedor incluye traducciones integradas para inglés y francés:

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

## Reembolsos

Emitir un reembolso total o parcial a través del proveedor:

```ts
// Full refund
const refund = await provider.refundPayment(paymentId);

// Partial refund (in decimal, e.g., $10.00)
const partialRefund = await provider.refundPayment(paymentId, 10.00);
```

Las cantidades se convierten a centavos antes de enviarlas a la API de Solidgate.

## Manejo de errores

Todos los métodos del proveedor utilizan un manejo de errores consistente con un registrador estructurado:

```ts
private get logger() {
  return {
    info: (msg, ctx?) => console.log(`[SolidgateProvider] ${msg}`, ctx),
    warn: (msg, ctx?) => console.warn(`[SolidgateProvider] ${msg}`, ctx),
    error: (msg, ctx?) => console.error(`[SolidgateProvider] ${msg}`, ctx),
  };
}
```

Los errores de API incluyen el código de estado HTTP y el cuerpo de respuesta para la depuración:

```
Solidgate API error: 422 Unprocessable Entity - {"error":"Invalid amount"}
```
