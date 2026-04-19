---
id: stripe-webhook-deep-dive
title: "Análisis Detallado de Webhooks Stripe"
sidebar_label: "Webhooks Stripe"
sidebar_position: 4
---

# Análisis Detallado de Webhooks Stripe

Esta página cubre el endpoint `POST /api/stripe/webhook`, el procesamiento de eventos, el manejo de anuncios patrocinados y las notificaciones por correo electrónico enviadas para cada tipo de evento.

## Tabla de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/stripe/webhook` | Firma de Stripe | Procesar eventos de webhook de Stripe |

## Verificación de Firma

Todos los webhooks se verifican usando `stripe.webhooks.constructEvent()` con el encabezado `stripe-signature` y la variable de entorno `STRIPE_WEBHOOK_SECRET`:

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

Si la verificación de firma falla, se devuelve un `400 Bad Request` con el mensaje del error.

## Mapeo de Tipos de Eventos

El webhook escucha los siguientes tipos de eventos de Stripe:

| Evento de Stripe | Acción Tomada |
|------------|---------------|
| `checkout.session.completed` | Se ignora (las suscripciones están activas via `customer.subscription.created`) |
| `customer.subscription.created` | Actualizar DB → enviar correo de bienvenida con detalles del plan |
| `customer.subscription.updated` | Actualizar DB → enviar correo de actualización si el plan/período cambia |
| `customer.subscription.deleted` | Actualizar DB → enviar correo de cancelación |
| `invoice.payment_succeeded` | Pago único: enviar correo de confirmación; suscripción: actualizar DB + recibo |
| `invoice.payment_failed` | Notificar al usuario sobre el fallo del pago |
| `customer.subscription.trial_will_end` | Actualizar DB → enviar recordatorio de fin de prueba |

## Flujo de Procesamiento

Cuando llega un evento de webhook:

```
Webhook POST /api/stripe/webhook
  ├── Leer cuerpo sin procesar (requerido para verificación de firma)
  ├── Verificar firma: stripe.webhooks.constructEvent()
  │   └── Fallo: 400 Bad Request
  ├── Enrutar por event.type
  │   ├── customer.subscription.created → handleSubscriptionCreated()
  │   ├── customer.subscription.updated → handleSubscriptionUpdated()
  │   ├── customer.subscription.deleted → handleSubscriptionDeleted()
  │   ├── invoice.payment_succeeded → handlePaymentSucceeded()
  │   ├── invoice.payment_failed → handlePaymentFailed()
  │   └── customer.subscription.trial_will_end → handleTrialEndingSoon()
  └── Respuesta: 200 OK (siempre, incluso en errores de procesamiento individuales)
```

## Manejadores de Eventos

### Suscripción Creada

```typescript
async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  
  // Manejar anuncios patrocinados
  if (subscription.metadata?.type === 'sponsor_ad') {
    await SponsorAdWebhookService.handleSponsorAdSubscriptionCreated(subscription);
    return;
  }
  
  // Actualizar suscripción en la base de datos
  await WebhookSubscriptionService.upsertSubscriptionFromStripe(subscription);
  
  // Enviar correo de bienvenida
  const planFeatures = getPlanFeatures(priceId);
  await EmailService.sendWelcomeEmail(email, name, planName, planFeatures);
}
```

### Suscripción Actualizada

```typescript
async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  if (subscription.metadata?.type === 'sponsor_ad') {
    await SponsorAdWebhookService.handleSponsorAdSubscriptionUpdated(subscription);
    return;
  }
  
  await WebhookSubscriptionService.upsertSubscriptionFromStripe(subscription);
  
  // Enviar correo de actualización si hay cambios significativos
  if (hasSignificantChanges) {
    await EmailService.sendSubscriptionUpdateEmail(
      email, name, currentPlan, newStatus, periodEnd
    );
  }
}
```

### Suscripción Cancelada

Actualiza la suscripción como cancelada en la base de datos y envía un correo de confirmación de cancelación.

### Pago Exitoso

```typescript
async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  if (!subscriptionId) {
    // Cargo único (no de suscripción)
    await EmailService.sendPaymentConfirmationEmail(email, name, amount, currency);
    return;
  }
  
  // Pago de suscripción
  if (metadata?.type === 'sponsor_ad') {
    await SponsorAdWebhookService.handleSponsorAdPaymentSucceeded(subscription);
    return;
  }
  
  await WebhookSubscriptionService.upsertSubscriptionFromStripe(subscription);
  await EmailService.sendPaymentReceiptEmail(email, name, amount, currency, invoiceUrl);
}
```

### Prueba Terminando Pronto

```typescript
async handleTrialEndingSoon(subscription: Stripe.Subscription): Promise<void> {
  await WebhookSubscriptionService.upsertSubscriptionFromStripe(subscription);
  
  const trialEndDate = new Date(subscription.trial_end! * 1000);
  await EmailService.sendTrialEndingEmail(email, name, planName, trialEndDate);
}
```

## Notificaciones por Correo Electrónico

| Evento | Correo Enviado |
|-------|------------|
| Suscripción creada | Correo de bienvenida con nombre del plan y características |
| Suscripción actualizada | Correo de actualización con nuevo estado y período de facturación |
| Suscripción cancelada | Correo de confirmación de cancelación |
| Pago exitoso (único) | Correo de confirmación de pago |
| Pago fallido | Correo de notificación de fallo de pago |
| Pago de suscripción exitoso | Correo de recibo con enlace a factura |
| Prueba terminando pronto | Correo de recordatorio de fin de prueba |

## Manejo de Anuncios Patrocinados

Cuando los metadatos de la suscripción incluyen `type === "sponsor_ad"`, el procesamiento se delega al `SponsorAdWebhookService` en lugar del flujo de suscripción estándar:

```typescript
if (subscription.metadata?.type === 'sponsor_ad') {
  await SponsorAdWebhookService.handleSponsorAdSubscriptionCreated(subscription);
  return;
}
```

Esto permite que los anuncios patrocinados gestionen su propio mapeo de base de datos sin afectar las suscripciones regulares de usuarios.

## Mapeo de Características del Plan

```typescript
const getPlanFeatures = (priceId: string): string[] => {
  const planConfig = plans.find((p) => p.stripePriceId === priceId);
  const plan = planConfig ? planConfig.plan : 'free';
  return planFeatures[plan] || [];
};
```

## Manejo de Errores

El webhook sigue un patrón de manejo resiliente:

```typescript
try {
  // Procesar evento
  await handleEvent(event);
  return NextResponse.json({ received: true });
} catch (error) {
  // Registrar el error pero siempre responder 400 para indicar fallo
  console.error('Error processing webhook:', error);
  return NextResponse.json(
    { error: 'Webhook processing failed', message: safeErrorMessage(error) },
    { status: 400 }
  );
}
```

Los manejadores de eventos individuales usan su propio manejo de errores interno para evitar que un evento fallido bloquee el procesamiento de otros.

## Requisitos de Configuración

| Variable | Requerido | Descripción |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Sí | Clave secreta de la API de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Sí | Secreto del punto final del webhook para verificación de firma |

## Instrucciones de Configuración en el Panel de Stripe

1. Ir a Dashboard → Developers → Webhooks → Add endpoint
2. Establecer la URL del endpoint a `https://your-domain.com/api/stripe/webhook`
3. Seleccionar los eventos enumerados arriba
4. Copiar el secreto de firma al `STRIPE_WEBHOOK_SECRET` del entorno

Para pruebas locales, usar la CLI de Stripe:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Consideraciones de Seguridad

- La lectura del cuerpo sin procesar es requerida — Next.js no puede usar middleware de análisis de cuerpo para webhooks
- La verificación de firma debe ocurrir antes de cualquier procesamiento
- Los webhooks siempre responden con `200 OK` (o 400 en error) inmediatamente — el trabajo pesado ocurre de forma asíncrona
- Nunca registrar los datos de eventos completos ya que pueden contener información sensible del cliente

## Páginas Relacionadas

- [Análisis Detallado de Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Análisis Detallado de Stripe Subscriptions](./stripe-subscription-deep-dive.md)
- [Endpoints API de Anuncios Patrocinados](./sponsor-ads-endpoints.md)
- [Endpoints de Webhook API](./webhook-api-endpoints.md)
