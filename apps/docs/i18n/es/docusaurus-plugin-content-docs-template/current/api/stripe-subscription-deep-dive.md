---
id: stripe-subscription-deep-dive
title: "Análisis Detallado de Suscripciones Stripe"
sidebar_label: "Suscripciones Stripe"
sidebar_position: 2
---

# Análisis Detallado de Suscripciones Stripe

Esta página cubre todas las rutas de gestión de suscripciones: creación, actualización, cancelación y los métodos del proveedor subyacente con ejemplos de solicitud/respuesta.

## Descripción General

La API de suscripciones proporciona gestión del ciclo de vida completo para las suscripciones de Stripe. Admite la creación de suscripciones con métodos de pago y períodos de prueba, la actualización de planes o configuraciones de cancelación, y la cancelación de suscripciones de forma inmediata o al final del período de facturación.

## Tabla de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/stripe/subscription` | Sesión requerida | Crear una nueva suscripción |
| `PUT` | `/api/stripe/subscription` | Sesión requerida | Actualizar una suscripción existente |
| `DELETE` | `/api/stripe/subscription` | Sesión requerida | Cancelar una suscripción |

## Crear una Suscripción (POST)

### Cuerpo de la Solicitud

```typescript
interface CreateSubscriptionRequest {
  priceId: string;            // ID de precio de Stripe
  paymentMethodId: string;    // ID de método de pago de Stripe
  trialPeriodDays?: number;   // Período de prueba opcional en días
}
```

### Ejemplo de Solicitud

```bash
curl -X POST /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "paymentMethodId": "pm_1234567890abcdef",
    "trialPeriodDays": 14
  }'
```

### Cómo Funciona

El manejador de ruta realiza estos pasos:

1. Autentica al usuario via `auth()`
2. Resuelve o crea un cliente de Stripe via `stripeProvider.getCustomerId()`
3. Llama a `stripeProvider.createSubscription()` con el ID de cliente, precio, método de pago, días de prueba y metadatos

### Implementación del Proveedor

Dentro de `StripeProvider.createSubscription()`:

```typescript
// Adjuntar método de pago al cliente
if (paymentMethodId) {
  await this.stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });
  // Establecer como método de pago predeterminado
  await this.stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

// Crear la suscripción
const subscriptionParams: Stripe.SubscriptionCreateParams = {
  customer: customerId,
  items: [{ price: priceId }],
  default_payment_method: paymentMethodId,
  expand: ['latest_invoice'],
  metadata,
  collection_method: 'charge_automatically'
};

// Sin período de prueba: cobrar inmediatamente
if (trialPeriodDays === 0) {
  subscriptionParams.off_session = true;
  subscriptionParams.payment_settings = {
    save_default_payment_method: 'on_subscription'
  };
} else {
  subscriptionParams.trial_period_days = trialPeriodDays;
}
```

### Respuesta Exitosa (200)

```typescript
interface SubscriptionInfo {
  id: string;                    // "sub_1234567890abcdef"
  customerId: string;            // "cus_1234567890abcdef"
  status: SubscriptionStatus;    // "active" | "trialing" | etc.
  currentPeriodEnd?: number;     // Marca de tiempo Unix
  cancelAtPeriodEnd: boolean;    // false
  cancelAt: number | null;       // null
  trialEnd: number | null;       // Marca de tiempo Unix o null
  priceId: string;               // "price_1234567890abcdef"
  paymentIntentId?: string;      // "pi_..." si está disponible
}
```

## Actualizar una Suscripción (PUT)

### Cuerpo de la Solicitud

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;          // Requerido: suscripción a actualizar
  priceId?: string;                // Nuevo ID de precio (cambio de plan)
  cancelAtPeriodEnd?: boolean;     // Programar cancelación
}
```

### Ejemplo de Solicitud

```bash
curl -X PUT /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "priceId": "price_0987654321fedcba",
    "cancelAtPeriodEnd": false
  }'
```

### Implementación del Proveedor

El método `updateSubscription` maneja los cambios de plan reemplazando el elemento de la suscripción:

```typescript
if (priceId) {
  const existingSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
  if (existingSubscription.items.data[0]) {
    updateParams.items = [{
      id: existingSubscription.items.data[0].id,
      price: priceId
    }];
  }
}
```

También admite configurar `cancel_at_period_end`, `cancel_at` y actualizar metadatos.

### Respuesta Exitosa (200)

Devuelve la misma forma `SubscriptionInfo` con los valores actualizados.

## Cancelar una Suscripción (DELETE)

### Cuerpo de la Solicitud

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;           // Requerido: suscripción a cancelar
  cancelAtPeriodEnd?: boolean;      // true = cancelar al final del período, false = inmediatamente
}
```

### Ejemplo de Solicitud

```bash
curl -X DELETE /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "cancelAtPeriodEnd": true
  }'
```

### Implementación del Proveedor

La lógica de cancelación admite dos estrategias:

```typescript
if (cancelAtPeriodEnd) {
  // Cancelación suave: la suscripción permanece activa hasta el fin del período
  subscription = await this.stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
} else {
  // Cancelación inmediata: la suscripción termina de inmediato
  subscription = await this.stripe.subscriptions.cancel(subscriptionId);
}
```

### Respuesta Exitosa (200)

```json
{
  "id": "sub_1234567890abcdef",
  "customerId": "cus_1234567890abcdef",
  "status": "active",
  "cancelAtPeriodEnd": true,
  "cancelAt": null,
  "currentPeriodEnd": 1643673600,
  "trialEnd": null,
  "priceId": "price_1234567890abcdef"
}
```

## Mapeo de Estado de Suscripción

El proveedor mapea los estados de Stripe al enum interno `SubscriptionStatus`:

| Estado de Stripe | Estado Interno |
|---------------|-----------------|
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |
| `trialing` | `TRIALING` |
| `active` | `ACTIVE` |
| `past_due` | `PAST_DUE` |
| `canceled` | `CANCELED` |
| `unpaid` | `UNPAID` |

## Seguimiento de Metadatos

Todas las operaciones de suscripción adjuntan el `userId` de la sesión a los metadatos de la suscripción:

```typescript
metadata: {
  userId: session.user.id
}
```

Esto permite a los manejadores de webhooks reconciliar las suscripciones con los registros de usuario internos.

## Manejo de Errores

| Estado | Error | Causa |
|--------|-------|-------|
| 400 | `Failed to create customer` | Falló la resolución del cliente |
| 401 | `Unauthorized` | Sin sesión autenticada |
| 500 | `Failed to create subscription` | Error de la API de Stripe durante la creación |
| 500 | `Failed to update subscription` | Error de la API de Stripe durante la actualización |
| 500 | `Failed to cancel subscription` | Error de la API de Stripe durante la cancelación |

## Consideraciones de Seguridad

- Todos los endpoints de suscripción requieren autenticación
- La adjunción del método de pago y la configuración predeterminada se realizan del lado del servidor
- El flag `off_session` solo se establece para suscripciones sin período de prueba para habilitar cargos automáticos
- Los metadatos de la suscripción siempre incluyen el ID del usuario autenticado para auditoría
- En modo de desarrollo, las actualizaciones de suscripción se registran solo con campos no sensibles

## Páginas Relacionadas

- [Análisis Detallado de Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Análisis Detallado de Stripe Webhooks](./stripe-webhook-deep-dive.md)
- [Análisis Detallado de Métodos de Pago Stripe](./stripe-payment-methods-deep-dive.md)
- [Arquitectura del Proveedor de Pagos](./payment-provider-architecture.md)
