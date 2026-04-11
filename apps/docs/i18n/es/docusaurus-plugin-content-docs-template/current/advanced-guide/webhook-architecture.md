---
id: webhook-architecture
title: Arquitectura de webhook
sidebar_label: Ganchos web
sidebar_position: 3
---

# Arquitectura de webhook

Esta guía cubre el sistema de manejo de webhooks utilizado para procesar eventos de servicios externos como Stripe, LemonSqueezy y otros proveedores de pagos, incluida la verificación de firmas, el enrutamiento de eventos, la idempotencia y el manejo de reintentos.

## Descripción general de la arquitectura

```
Webhook Processing Pipeline
=============================

  External Service (Stripe, LemonSqueezy, etc.)
       |
       | POST /api/webhook/{provider}
       v
  +------------------------+
  | Signature Verification |  <-- HMAC / asymmetric verification
  +------------------------+
       |
       v
  +------------------------+
  | Raw Body Parsing       |  <-- Read raw body for signature check
  +------------------------+
       |
       v
  +------------------------+
  | Event Routing          |  <-- Map event type to handler
  +------------------------+
       |
       v
  +------------------------+
  | Idempotency Check      |  <-- Prevent duplicate processing
  +------------------------+
       |
       v
  +------------------------+
  | Event Handler          |  <-- Business logic execution
  +------------------------+
       |
       v
  +------------------------+
  | Response (200 / 4xx)   |  <-- Acknowledge receipt
  +------------------------+
```

## Webhooks de proveedores de pagos

La plantilla utiliza el patrón `PaymentServiceManager` para admitir múltiples proveedores de pagos:

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }
}
```

### Patrón de controlador de ruta de webhook

```typescript
// app/api/webhook/stripe/route.ts (typical pattern)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Step 1: Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Step 2: Verify webhook signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Step 3: Route to appropriate handler
  try {
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler failed:', error);
    return NextResponse.json(
      { error: 'Handler failed' },
      { status: 500 }
    );
  }
}
```

## Verificación de firma

### Webhooks de rayas

Stripe utiliza firmas HMAC-SHA256 con una marca de tiempo para evitar ataques de repetición:

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### Webhooks LemonSqueezy

```typescript
// HMAC verification for LemonSqueezy
import crypto from 'crypto';

function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

## Enrutamiento de eventos

### Tipo de evento para asignación de controlador

```typescript
type WebhookHandler = (event: WebhookEvent) => Promise<void>;

const eventHandlers: Record<string, WebhookHandler> = {
  // Subscription events
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,

  // Payment events
  'invoice.payment_succeeded': handlePaymentSucceeded,
  'invoice.payment_failed': handlePaymentFailed,

  // Checkout events
  'checkout.session.completed': handleCheckoutCompleted,
};

async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  const handler = eventHandlers[event.type];

  if (!handler) {
    console.log(`Unhandled webhook event type: ${event.type}`);
    return; // Return 200 for unhandled events
  }

  await handler(event);
}
```

## Idempotencia

### Prevención de procesamiento duplicado

Los proveedores de webhooks pueden reenviar eventos. Utilice el ID del evento para evitar el procesamiento duplicado:

```typescript
async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  // Check if event was already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  if (existing) {
    console.log(`Duplicate webhook event: ${event.id}`);
    return;
  }

  // Record event before processing
  await db.insert(webhookEvents).values({
    eventId: event.id,
    type: event.type,
    status: 'processing',
    receivedAt: new Date(),
  });

  try {
    const handler = eventHandlers[event.type];
    if (handler) await handler(event);

    await db.update(webhookEvents)
      .set({ status: 'completed' })
      .where(eq(webhookEvents.eventId, event.id));
  } catch (error) {
    await db.update(webhookEvents)
      .set({ status: 'failed', error: String(error) })
      .where(eq(webhookEvents.eventId, event.id));
    throw error;
  }
}
```

## Reintentar manejo

### Comportamiento de reintento del proveedor

| Proveedor | Programación de reintentos | Reintentos máximos | Tiempo de espera |
|----------|---------------|-------------|---------|
| Raya | Retroceso exponencial en 3 días | ~16 intentos | 20 segundos |
| Limón exprimidor | Retroceso exponencial | 5 intentos | 15 segundos |

### Mejores prácticas para controladores seguros para reintentos

1. **Devuelve 200 rápidamente**: acusa recibo en 5 segundos. Descargue procesamiento pesado.
2. **Controladores idempotentes**: asegúrese de que volver a procesar el mismo evento produzca el mismo resultado.
3. **Devuelve 4xx para fallas permanentes**: Devuelve 400 para firmas no válidas. El proveedor no volverá a intentarlo.
4. **Devuelve 5xx para fallas transitorias**: Devuelve 500 si tu base de datos no está disponible temporalmente. El proveedor lo volverá a intentar.

## Patrón de cola de mensajes fallidos

Para eventos que fallan repetidamente en el procesamiento, implemente un patrón de letra muerta:

```typescript
async function processWithDLQ(event: WebhookEvent): Promise<void> {
  const MAX_ATTEMPTS = 3;

  const record = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  const attempts = (record?.attempts ?? 0) + 1;

  if (attempts > MAX_ATTEMPTS) {
    // Move to dead letter queue for manual inspection
    await db.insert(deadLetterQueue).values({
      eventId: event.id,
      type: event.type,
      payload: JSON.stringify(event),
      failedAt: new Date(),
      attempts,
    });
    console.error(`Event ${event.id} moved to dead letter queue after ${MAX_ATTEMPTS} attempts`);
    return;
  }

  // Attempt processing...
}
```

## Consideraciones de seguridad

1. **Verifique siempre las firmas** antes de procesar cualquier carga útil de webhook.
2. **Utilice una comparación segura de tiempo** ( `crypto.timingSafeEqual` ) para evitar ataques de tiempo.
3. **Lea el cuerpo sin formato** antes del análisis JSON: la verificación de la firma requiere los bytes exactos recibidos.
4. **Restringir los puntos finales de webhook** a POST únicamente.
5. **No exponga los secretos del webhook** en el código o los registros del lado del cliente.
6. **Valide los datos del evento** antes de actuar en consecuencia. No confíe ciegamente en las cargas útiles del webhook.

## Consideraciones de rendimiento

1. **Reconocimiento rápido**: Devuelve 200 dentro del tiempo de espera del proveedor. Descargue el trabajo pesado a trabajos en segundo plano.
2. **Escrituras en bases de datos**: minimice las operaciones de bases de datos en el controlador del webhook. Actualizaciones por lotes cuando sea posible.
3. **Registro**: registre los ID y tipos de eventos para la depuración, pero evite registrar cargas útiles completas (pueden contener PII).

## Solución de problemas

### La verificación de firma falla

1. Asegúrese de leer el **cuerpo de la solicitud sin formato** (no JSON analizado).
2. Verifique que el secreto del webhook coincida con el del panel de su proveedor.
3. Verifique que no haya ningún middleware que modifique el cuerpo de la solicitud antes de que llegue al controlador.

### Eventos duplicados procesados

1. Implemente la idempotencia utilizando el ID del evento como se describe anteriormente.
2. Consulte la tabla `webhookEvents` para ver si hay entradas duplicadas.
3. Utilice restricciones únicas a nivel de base de datos en la columna de ID de evento.

### Eventos que se agotan

1. Mueva el procesamiento pesado a trabajos en segundo plano usando el `BackgroundJobManager` .
2. Reconozca el webhook inmediatamente y procese de forma asincrónica.
3. Aumente el tiempo de espera para llamadas API externas si es necesario.

## Documentación relacionada

- [Patrones de recuperación de errores](./error-recovery-patterns.md)
- [Arquitectura de limitación de velocidad] (./rate-limiting-architecture.md)
- [Arquitectura de cliente API] (./api-client-architecture.md)
