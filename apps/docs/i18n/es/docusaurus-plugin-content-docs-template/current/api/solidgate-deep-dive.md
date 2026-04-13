---
id: solidgate-deep-dive
title: "Análisis Detallado de Solidgate"
sidebar_label: "Solidgate"
sidebar_position: 7
---

# Análisis Detallado de Solidgate

Esta página cubre la integración completa de Solidgate, incluyendo la creación del checkout, el procesamiento de webhooks, la verificación de pagos y el formulario de pago embebido.

## Descripción General

Solidgate es un proveedor de infraestructura de pagos que admite tanto flujos de checkout alojados como un SDK de React embebible para formularios de pago en línea. La integración crea intenciones de pago a través de la API de Solidgate y admite el procesamiento de eventos webhook con protección de idempotencia. Solidgate usa HMAC-SHA512 para la verificación de firmas de webhooks.

## Tabla de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/solidgate/checkout` | Sesión requerida | Crear una sesión de checkout / intención de pago |
| `POST` | `/api/solidgate/webhook` | Firma requerida | Procesar eventos webhook entrantes |
| `GET` | `/api/solidgate/webhook` | Ninguna | Devuelve documentación del punto final |

## Creación del Checkout (POST)

### Cuerpo de la Solicitud

El punto final de checkout usa validación Zod para verificación estricta de entrada:

```typescript
const checkoutSchema = z.object({
  amount: z.number().positive(),               // Monto del pago
  currency: z.string().default('USD'),         // Código de moneda
  mode: z.enum(['one_time', 'subscription']).default('one_time'),
  successUrl: z.string().url(),                // URL de redirección
  cancelUrl: z.string().url(),                 // URL de cancelación
  metadata: z.record(z.string(), z.any()).optional()
});
```

### Ejemplo de Solicitud

```bash
curl -X POST /api/solidgate/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "amount": 29.99,
    "currency": "USD",
    "mode": "one_time",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### Cómo Funciona

1. Autentica al usuario mediante `auth()`
2. Valida el cuerpo de la solicitud con el esquema Zod
3. Resuelve o crea un cliente de Solidgate
4. Crea una intención de pago a través de la API de Solidgate
5. Devuelve el ID de pago y el client secret para el SDK embebido

### Implementación del Proveedor

El método `createPaymentIntent` construye la solicitud a la API:

```typescript
const paymentRequest: SolidgatePaymentRequest = {
  amount: paymentAmount,                    // Monto en centavos
  currency: currency.toUpperCase(),
  order_id: `order_${crypto.randomUUID()}`,
  order_description: metadata?.planName || 'Payment',
  customer_email: metadata?.email,
  customer_id: customerId,
  redirect_url: successUrl || `${appUrl}/payment/success`,
  callback_url: `${appUrl}/api/solidgate/webhook`,
  metadata: { ...metadata, customerId, paymentIntentId }
};

const response = await this.makeApiRequest<SolidgatePaymentResponse>(
  '/payments', 'POST', paymentRequest
);
```

### Respuesta Exitosa (200)

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_abc123-def456"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

El campo `url` contiene el ID de la intención de pago utilizado para inicializar el SDK de React de Solidgate.

## Formulario de Pago Embebido

Solidgate proporciona un SDK de React para formularios de pago en línea. El proveedor genera una firma para la inicialización del SDK:

```typescript
private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto.createHmac('sha512', this.secretKey).update(data).digest('hex');
}
```

El método `getUIComponents()` devuelve un contenedor de formulario de pago configurado:

```typescript
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(paymentIntent, merchantId);

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature
    });
  };
  return { PaymentForm: SolidgatePaymentFormWithConfig, ... };
}
```

## Procesamiento de Webhooks

### Verificación de Firma

Solidgate usa HMAC-SHA512 para las firmas de webhooks. El encabezado de firma puede ser `x-signature` o `solidgate-signature`:

```typescript
const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');
```

El proveedor verifica la firma contra el cuerpo bruto:

```typescript
const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

private generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}
```

### Protección de Idempotencia

El punto final de webhook incluye protección de idempotencia en memoria para prevenir el procesamiento duplicado:

```typescript
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 horas

const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true }); // Confirmar sin procesar
}

if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::note
En un entorno serverless de producción, el Set en memoria debe reemplazarse con Redis o una tabla de base de datos para idempotencia entre instancias.
:::

### Mapeo de Eventos

| Evento de Solidgate | Tipo Interno |
|----------------|---------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

### Estructura del Manejador

Cada manejador delega al `WebhookSubscriptionService`:

```typescript
async function handleSubscriptionCreated(data: any) {
  try {
    await webhookSubscriptionService.handleSubscriptionCreated(data);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

El `WebhookSubscriptionService` se inicializa con la constante del proveedor `SOLIDGATE`:

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.SOLIDGATE);
```

## Verificación de Pago

El proveedor admite la verificación de pago a través de la API de Solidgate:

```typescript
async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
  const response = await this.makeApiRequest<SolidgatePaymentStatus>(
    `/payments/${paymentId}`, 'GET'
  );
  const isSuccess = response.transaction_status === 'success'
    || response.transaction_status === 'completed';

  return {
    isValid: isSuccess,
    paymentId: response.payment_id,
    status: response.transaction_status,
    details: {
      amount: response.amount / 100,
      currency: response.currency.toLowerCase(),
      orderId: response.order_id
    }
  };
}
```

## Gestión de Suscripciones

### Crear Suscripciones

```typescript
async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
  const response = await this.makeApiRequest('/subscriptions', 'POST', {
    customer_id: customerId,
    plan_id: priceId,
    metadata
  });
  // Devuelve SubscriptionInfo con estado mapeado
}
```

### Cancelar Suscripciones

Admite cancelación inmediata y al final del período:

```typescript
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Actualizar Suscripciones

```typescript
const updateData: any = {};
if (priceId) updateData.plan_id = priceId;
if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
if (metadata) updateData.metadata = metadata;

await this.makeApiRequest(`/subscriptions/${subscriptionId}`, 'PUT', updateData);
```

## Comunicación con la API

Todas las llamadas a la API de Solidgate usan un método centralizado `makeApiRequest`:

```typescript
private async makeApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<T> {
  const url = `${this.apiBaseUrl}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  // Manejo de errores y análisis JSON
}
```

## Manejo de Errores

| Estado | Error | Causa |
|--------|-------|-------|
| 400 | `Invalid request body` | Falló la validación de Zod |
| 400 | `Invalid JSON` | Cuerpo de solicitud malformado |
| 400 | `Failed to create customer` | Falló la resolución del cliente |
| 400 | `No signature provided` | Webhook sin firma |
| 400 | `Webhook not processed` | Falló la verificación de firma |
| 401 | `Unauthorized` | Sin sesión autenticada |
| 500 | `Failed to create checkout session` | Error de la API de Solidgate |

Los errores de validación de Zod devuelven mensajes detallados a nivel de campo:

```typescript
const errorMessage = result.error.issues
  .map(issue => `${issue.path.join('.')}: ${issue.message}`)
  .join(', ');
```

## Requisitos de Configuración

| Variable | Requerido | Descripción |
|----------|----------|-------------|
| `SOLIDGATE_API_KEY` | Sí | Clave de la API de Solidgate |
| `SOLIDGATE_SECRET_KEY` | Sí | Clave secreta para generación de firmas |
| `SOLIDGATE_WEBHOOK_SECRET` | Sí | Secreto de firma del webhook |
| `SOLIDGATE_PUBLISHABLE_KEY` | Sí | Clave publicable para el SDK de React |
| `SOLIDGATE_MERCHANT_ID` | Sí | Identificador del comerciante |
| `SOLIDGATE_API_BASE_URL` | No | URL base de la API (predeterminado: `https://api.solidgate.com/v1`) |

## Consideraciones de Seguridad

- HMAC-SHA512 se usa tanto para la verificación de firma del webhook como de la intención de pago
- La clave secreta y el secreto del webhook nunca se exponen al cliente
- La protección de idempotencia previene el procesamiento duplicado de webhooks
- La validación de Zod garantiza una verificación estricta de entrada en el punto final de checkout
- Los rastros de pila de errores solo se incluyen en modo de desarrollo
- La utilidad `safeErrorMessage` sanea los mensajes de error para producción

## Páginas Relacionadas

- [Análisis Detallado de Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Análisis Detallado de LemonSqueezy](./lemonsqueezy-deep-dive.md)
- [Análisis Detallado de Polar](./polar-deep-dive.md)
- [Arquitectura del Proveedor de Pagos](./payment-provider-architecture.md)
