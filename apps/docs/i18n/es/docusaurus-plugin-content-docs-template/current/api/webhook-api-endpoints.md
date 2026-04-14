---
id: webhook-api-endpoints
title: "Endpoints API de Webhooks"
sidebar_label: "Webhooks"
sidebar_position: 27
---

# Endpoints API de Webhooks

Referencia completa para todos los endpoints de webhook del proveedor de pagos: Stripe, LemonSqueezy, Polar y Solidgate.

## Descripción General

| Ruta | Proveedor | Encabezado de Firma |
|------|----------|-------------------|
| `POST /api/stripe/webhook` | Stripe | `stripe-signature` |
| `POST /api/lemonsqueezy/webhook` | LemonSqueezy | `x-signature` |
| `POST /api/polar/webhook` | Polar | `webhook-signature`, `webhook-timestamp`, `webhook-id` |
| `POST /api/solidgate/webhook` | Solidgate | `x-signature` o `solidgate-signature` |

## Arquitectura Compartida

Todos los manejadores de webhook siguen el mismo patrón de 6 pasos:

1. **Leer el cuerpo sin procesar** — Requerido para verificación de firma (no se puede usar middleware de análisis de cuerpo)
2. **Verificar la firma** — Rechazar solicitudes no autenticadas con `400`
3. **Analizar el evento** — Extraer tipo de evento y datos del payload
4. **Enrutar por tipo de evento** — Llamar al manejador apropiado
5. **Actualizar la base de datos** — A través de `WebhookSubscriptionService`
6. **Enviar notificaciones** — Correos de transacción vía `EmailService`

## Tipos de Eventos Comunes

Todos los proveedores mapean al enum interno `WebhookEventType`:

| Valor del Enum | Descripción |
|------------|-------------|
| `SUBSCRIPTION_CREATED` | Nueva suscripción de pago creada |
| `SUBSCRIPTION_UPDATED` | Suscripción existente modificada |
| `SUBSCRIPTION_CANCELLED` | Suscripción cancelada |
| `SUBSCRIPTION_EXPIRED` | La suscripción expiró |
| `PAYMENT_SUCCEEDED` | Pago procesado exitosamente |
| `PAYMENT_FAILED` | Falló el intento de pago |
| `TRIAL_STARTED` | Período de prueba iniciado |
| `TRIAL_ENDING` | Prueba próxima a terminar |
| `TRIAL_ENDED` | Período de prueba finalizado |
| `REFUND_CREATED` | Reembolso procesado |

## Webhook de Stripe (POST /api/stripe/webhook)

### Verificación

```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,
  request.headers.get('stripe-signature')!,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

### Eventos Admitidos

| Evento de Stripe | Acción |
|------------|--------|
| `checkout.session.completed` | Ignorado (suscripción gestionada por evento dedicado) |
| `customer.subscription.created` | DB upsert → correo de bienvenida |
| `customer.subscription.updated` | DB upsert → correo de actualización |
| `customer.subscription.deleted` | Marcar cancelado → correo de cancelación |
| `invoice.payment_succeeded` | Correo de recibo (o confirmación única) |
| `invoice.payment_failed` | Correo de notificación de fallo |
| `customer.subscription.trial_will_end` | DB upsert → correo de recordatorio de prueba |

### Detección de Anuncio Patrocinado

Si `subscription.metadata.type === "sponsor_ad"`, el evento se enruta al `SponsorAdWebhookService` en lugar del flujo de suscripción estándar:

```typescript
if (subscription.metadata?.type === 'sponsor_ad') {
  await SponsorAdWebhookService.handleSponsorAdSubscriptionCreated(subscription);
  return;
}
```

### Respuestas de Error

| Estado | Descripción |
|--------|-------------|
| 400 | Verificación de firma fallida |
| 400 | Error en el procesamiento del evento |
| 200 | Evento procesado exitosamente |

## Webhook de LemonSqueezy (POST /api/lemonsqueezy/webhook)

### Verificación

Verificación de firma HMAC SHA256 usando el encabezado `x-signature` y la variable `LEMONSQUEEZY_WEBHOOK_SECRET`.

### Mapeo de Eventos

| Evento de LemonSqueezy | Evento Interno |
|----------------------|----------------|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_expired` | `SUBSCRIPTION_EXPIRED` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `subscription_payment_success` | `PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `PAYMENT_FAILED` |
| `subscription_trial_started` | `TRIAL_STARTED` |

### Detección de Anuncio Patrocinado

Para pagos de LemonSqueezy, la detección de anuncios patrocinados usa `custom_data`:

```typescript
const isSponsorAd = 
  payload.meta?.custom_data?.type === 'sponsor_ad' ||
  payload.data?.attributes?.custom_data?.type === 'sponsor_ad';
```

## Webhook de Polar (POST /api/polar/webhook)

### Verificación

Polar usa tres encabezados para verificación HMAC SHA256:

| Encabezado | Descripción |
|--------|-------------|
| `webhook-signature` | Formato `v1,<hex>` — firma HMAC |
| `webhook-timestamp` | Timestamp Unix del evento |
| `webhook-id` | ID único del evento para deduplicación |

### Implementación

```typescript
// Enrutar usando la utilidad de router de Polar
const eventType = routeWebhookEvent(event.type);

// Validar el payload contra el schema esperado
const validatedPayload = validateWebhookPayload(event);
```

### Eventos Admitidos

| Evento de Polar | Acción |
|------------|--------|
| `subscription.created` | DB upsert → bienvenida |
| `subscription.updated` | DB upsert → actualización |
| `subscription.canceled` | DB actualización → cancelación |
| `order.created` | Confirmación de pago único |
| `checkout.session.created` | Checkout iniciado |
| `checkout.session.updated` | Estado del checkout actualizado |
| `benefit_grant.created` | Beneficio otorgado al usuario |

## Webhook de Solidgate (POST /api/solidgate/webhook)

### Verificación

```typescript
const signature = 
  request.headers.get('x-signature') || 
  request.headers.get('solidgate-signature');
```

### Idempotencia

Los webhooks de Solidgate usan un `Set` en memoria para rastrear eventos procesados durante 24 horas, evitando el procesamiento duplicado de eventos:

```typescript
const processedEvents = new Map<string, number>(); // eventId → timestamp

if (processedEvents.has(eventId)) {
  const processedAt = processedEvents.get(eventId)!;
  if (Date.now() - processedAt < 24 * 60 * 60 * 1000) {
    return NextResponse.json({ received: true, duplicate: true });
  }
}
processedEvents.set(eventId, Date.now());
```

### Eventos Admitidos

Solidgate admite 9 acciones de evento incluyendo: payment completado, suscripción creada/actualizada/cancelada, fallo de pago y procesamiento de reembolso.

### Endpoint GET

`GET /api/solidgate/webhook` devuelve un JSON informativo sobre el endpoint:

```json
{
  "endpoint": "/api/solidgate/webhook",
  "methods": ["POST"],
  "description": "Solidgate payment webhook handler"
}
```

## Notificaciones por Correo Electrónico

| Tipo de Correo | Cuándo se Envía |
|------------|-------------|
| Bienvenida | Suscripción creada (incluye características del plan) |
| Actualización | Período de suscripción o cambio de estado |
| Cancelación | Suscripción cancelada o eliminada |
| Confirmación de Pago | Cargo único exitoso |
| Fallo de Pago | Fallo del cobro de suscripción |
| Recordatorio de Prueba | Prueba próxima a terminar (evento `trial_will_end`) |

## Detalles de Implementación

- **Verificación de firma**: Requerida en todos los webhooks — se rechaza con 400 antes de cualquier procesamiento
- **Análisis del cuerpo sin procesar**: `await request.text()` requerido; no se puede usar `request.json()` antes de verificar firma
- **`WebhookSubscriptionService`**: Maneja el upsert de la base de datos para todos los proveedores con un esquema de datos normalizado
- **Detección de anuncio patrocinado**: Verificado en `metadata.type` (Stripe) o `custom_data.type` (LemonSqueezy) antes del enrutamiento
- **Manejo resiliente de errores**: Los errores individuales de evento no bloquean el procesamiento de otros — se registran internamente

## Páginas Relacionadas

- [Análisis Detallado de Stripe Webhooks](./stripe-webhook-deep-dive.md)
- [Análisis Detallado de Solidgate](./solidgate-deep-dive.md)
- [Endpoints de Anuncios Patrocinados](./sponsor-ads-endpoints.md)
- [Arquitectura de Webhooks](../advanced-guide/webhook-architecture.md)
