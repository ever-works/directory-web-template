---
id: webhooks
title: Webhooks de pago
sidebar_label: Ganchos web
sidebar_position: 7
---

# Webhooks de pago

La plantilla Ever Works procesa webhooks de pago de los cuatro proveedores admitidos a través de rutas API dedicadas. Cada punto final de webhook maneja la verificación de firmas, el enrutamiento de eventos, la administración del ciclo de vida de la suscripción y las notificaciones por correo electrónico.

## Ubicaciones de origen

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## Arquitectura de webhook

Todas las rutas de webhooks de proveedores siguen el mismo patrón:

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

Cada ruta delega la lógica empresarial al `WebhookSubscriptionService` compartido, que normaliza los datos específicos del proveedor en un formato común antes de actualizar la base de datos.

## Tipos de eventos de webhook

La plantilla define un conjunto completo de tipos de eventos que todos los proveedores asignan:

```ts
enum WebhookEventType {
  // Payment events
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',

  // Subscription lifecycle
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',

  // Stripe-specific
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent_succeeded',
  CHARGE_SUCCEEDED = 'charge_succeeded',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',

  // Billing portal
  BILLING_PORTAL_SESSION_CREATED = 'billing_portal_session_created',
  // ... additional billing portal events
}
```

## Controlador de webhook de Solidgate

### Punto final

```
POST /api/solidgate/webhook
```

### Verificación de firma

La ruta del webhook de Solidgate lee la firma del encabezado `x-signature` o `solidgate-signature` :

```ts
const headersList = await headers();
const signature =
  headersList.get('x-signature') ||
  headersList.get('solidgate-signature');

if (!signature) {
  return NextResponse.json(
    { error: 'No signature provided' },
    { status: 400 }
  );
}
```

El proveedor verifica la firma utilizando HMAC-SHA512:

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Idempotencia

El controlador implementa una verificación de idempotencia en memoria para evitar el procesamiento de eventos duplicados:

```ts
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Check for duplicates
const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true });
}

// Track and auto-expire
if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::note
En un entorno de producción sin servidor, reemplace el `Set` en memoria con Redis o una tabla de base de datos para obtener una idempotencia confiable entre instancias.
:::

### Enrutamiento de eventos

Después de la verificación, los eventos se enrutan a controladores específicos:

```ts
switch (webhookResult.type) {
  case 'payment_succeeded':
    await handlePaymentSucceeded(webhookResult.data);
    break;
  case 'payment_failed':
    await handlePaymentFailed(webhookResult.data);
    break;
  case 'subscription_created':
    await handleSubscriptionCreated(webhookResult.data);
    break;
  case 'subscription_updated':
    await handleSubscriptionUpdated(webhookResult.data);
    break;
  case 'subscription_cancelled':
    await handleSubscriptionCancelled(webhookResult.data);
    break;
  case 'subscription_payment_succeeded':
    await handleSubscriptionPaymentSucceeded(webhookResult.data);
    break;
  case 'subscription_payment_failed':
    await handleSubscriptionPaymentFailed(webhookResult.data);
    break;
  case 'subscription_trial_ending':
    await handleSubscriptionTrialEnding(webhookResult.data);
    break;
  default:
    console.log(`Unhandled webhook event: ${webhookResult.type}`);
}
```

### Mapeo de eventos de Solidgate

El proveedor asigna nombres de eventos específicos de Solidgate a los tipos genéricos de la plantilla:

| Evento Solidgate | Evento de plantilla |
|-----------------|----------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

## Servicio de suscripción de Webhook

Todos los controladores de webhooks delegan en el `WebhookSubscriptionService` compartido. Este servicio se crea una instancia por proveedor:

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### Normalización de datos

El servicio normaliza las cargas útiles de webhooks en un formato `WebhookSubscriptionData` común:

```ts
interface WebhookSubscriptionData {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  subscriptionId: string;
  priceId: string;
  customerId: string;
  currency: string;
  amount: number;
  interval: string;
  intervalCount: number;
  trialStart: number;
  trialEnd: number;
  cancelledAt?: Date;
  cancelAtPeriodEnd: boolean;
  cancelReason: string;
  metadata: Record<string, any>;
  // ... additional fields
}
```

### Métodos de controlador

El servicio proporciona controladores para cada tipo de evento de webhook:

| Método | Evento | Descripción |
|--------|-------|-------------|
| `handlePaymentSucceeded` | Pago completado | Actualiza el registro de pago y activa el correo electrónico de confirmación |
| `handlePaymentFailed` | Pago fallido | Error de registro, puede notificar al usuario |
| `handleSubscriptionCreated` | Nueva suscripción | Crea registro de suscripción en base de datos |
| `handleSubscriptionUpdated` | Cambio de plan | Actualiza los detalles de la suscripción |
| `handleSubscriptionCancelled` | Cancelación | Actualiza el estado y establece la fecha de cancelación |
| `handleSubscriptionPaymentSucceeded` | Pago recurrente | Amplía el periodo de suscripción |
| `handleSubscriptionPaymentFailed` | Fallo recurrente | Marca como vencido, notifica al usuario |
| `handleSubscriptionTrialEnding` | Final del juicio | Envía notificación de finalización de prueba |

## Formato de respuesta del webhook

Todos los puntos finales de webhook devuelven un formato coherente:

**Éxito (200):**
```json
{ "received": true }
```

**Error del cliente (400):**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

Devolver un estado 200 es fundamental para acusar recibo. Si se devuelve un 400 o 500, los proveedores de pago normalmente volverán a intentar la entrega del webhook.

## OBTENER punto final

Cada ruta de webhook también maneja solicitudes GET con fines de diagnóstico:

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## Configuración de webhooks en paneles de proveedores

### Puerta sólida

1. Navegue a su panel de Solidgate
2. Vaya a **Configuración** y luego a **Webhooks**.
3. Agregue la URL de su webhook: `https://yourdomain.com/api/solidgate/webhook` 4. Seleccione eventos a los que suscribirse: pagos, suscripciones, reembolsos
5. Copie el secreto del webhook en su variable de entorno `SOLIDGATE_WEBHOOK_SECRET` .

### Patrón de URL de webhook

Cada proveedor tiene su propio punto final dedicado:

| Proveedor | URL de webhook |
|----------|-------------|
| Raya | `/api/stripe/webhook` |
| Puerta sólida | `/api/solidgate/webhook` |
| Limón exprimidor | `/api/lemonsqueezy/webhook` |
| polares | `/api/polar/webhook` |

## Probar webhooks localmente

### Usando ngrok o un túnel similar

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

Luego configure la URL de ngrok como su punto final de webhook en el panel del proveedor (por ejemplo, `https://abc123.ngrok.io/api/solidgate/webhook` ).

### Prueba manual con curl

```bash
# Test the GET diagnostic endpoint
curl http://localhost:3000/api/solidgate/webhook

# Send a test webhook (requires valid signature)
curl -X POST http://localhost:3000/api/solidgate/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: your-computed-hmac-signature" \
  -d '{
    "id": "evt_test_123",
    "type": "payment.succeeded",
    "data": {
      "payment_id": "pay_test_456",
      "amount": 2999,
      "currency": "USD"
    }
  }'
```

## Manejo de errores

Cada función del controlador está incluida en try/catch para evitar que un solo error del controlador provoque una respuesta 400/500:

```ts
async function handlePaymentSucceeded(data: any) {
  console.log('Payment succeeded:', data.id);
  try {
    await webhookSubscriptionService.handlePaymentSucceeded(data);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}
```

Esto garantiza que el webhook siempre se reconozca con una respuesta 200, incluso si falla el procesamiento interno. Los errores de procesamiento se registran para su investigación sin provocar bucles de reintento del proveedor.

## Consideraciones de seguridad

- **Verificar siempre las firmas**: nunca procesar cargas de webhooks sin la validación de la firma
- **Usar cuerpo sin formato**: analiza el texto de solicitud sin formato para verificar la firma, no el cuerpo analizado en JSON.
- **Idempotencia**: implemente la deduplicación para manejar los reintentos del proveedor con elegancia
- **Registro**: registra ID de webhook y tipos de eventos para seguimientos de auditoría
- **Solo HTTPS**: los puntos finales de webhook se deben servir a través de HTTPS en producción.
