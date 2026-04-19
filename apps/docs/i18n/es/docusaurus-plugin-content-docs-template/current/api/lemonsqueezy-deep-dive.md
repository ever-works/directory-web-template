---
id: lemonsqueezy-deep-dive
title: "Análisis Detallado de LemonSqueezy"
sidebar_label: "LemonSqueezy"
sidebar_position: 5
---

# Análisis Detallado de LemonSqueezy

Esta página cubre la integración completa de LemonSqueezy, incluyendo la creación del checkout, la gestión de suscripciones, el procesamiento de webhooks y la sincronización de productos.

## Descripción General

LemonSqueezy es un proveedor de pagos de tipo merchant-of-record que gestiona la recopilación de impuestos, el cumplimiento normativo y el procesamiento de pagos. La integración utiliza el flujo de checkout alojado de LemonSqueezy, el modelo de productos basado en variantes y el sistema de webhooks. A diferencia de Stripe, LemonSqueezy no admite setup intents ni gestión directa de métodos de pago -- todo el manejo de pagos ocurre a través de su interfaz alojada.

## Tabla de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `POST` | `/api/lemonsqueezy/checkout` | Sesión requerida | Crear sesión de checkout desde el cuerpo JSON |
| `GET` | `/api/lemonsqueezy/checkout` | Ninguna | Crear sesión de checkout desde parámetros de consulta |
| `POST` | `/api/lemonsqueezy/webhook` | Firma requerida | Procesar eventos de webhook entrantes |

## Creación de Checkout (POST)

### Cuerpo de la Solicitud

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // ID de variante de producto de LemonSqueezy
  dark?: boolean;                           // Habilitar checkout en modo oscuro
  customPrice?: number;                     // Precio personalizado en centavos (opcional)
  metadata?: Record<string, string>;        // Metadatos adicionales
}
```

### Ejemplo de Solicitud

```bash
curl -X POST /api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "variantId": "123456",
    "dark": true,
    "metadata": { "plan": "pro", "source": "website" }
  }'
```

### Cómo Funciona

1. Autentica al usuario mediante `auth()`
2. Valida el cuerpo de la solicitud usando `validateCheckoutRequestBody()`
3. Llama a `lemonsqueezyProvider.createCustomCheckout()` con metadatos del usuario
4. Devuelve la URL de checkout

### Implementación del Proveedor

El método `createCustomCheckout` crea un checkout de LemonSqueezy con configuración completa:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), Number(params.variantId), {
  customPrice: params.customPrice,
  productOptions: {
    redirectUrl: `${env.API_BASE_URL}/billing/success`,
    receiptButtonText: 'View Receipt',
    receiptLinkUrl: `${env.API_BASE_URL}/billing/receipt`,
    receiptThankYouNote: 'Thank you for your purchase!',
    enabledVariants: [Number(params.variantId)]
  },
  checkoutOptions: {
    embed: true,
    media: false,
    logo: false,
    dark: params.dark
  },
  checkoutData: {
    email: params.email,
    custom: params.metadata ?? {},
    variantQuantities: [{ variantId: Number(params.variantId), quantity: 1 }]
  },
  testMode: process.env.NODE_ENV === 'development',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
});
```

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.lemonsqueezy.com/checkout/custom/abc123",
    "email": "user@example.com",
    "customPrice": 2999,
    "variantId": "123456",
    "metadata": {
      "userId": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "pro"
    }
  },
  "message": "Checkout session created successfully"
}
```

## Checkout via Parámetros de Consulta (GET)

El punto final GET admite la creación de checkouts mediante parámetros de consulta para escenarios de enlace directo:

| Parámetro | Requerido | Descripción |
|-----------|-----------|-------------|
| `variantId` | Sí | ID de variante de LemonSqueezy |
| `email` | Sí | Email del cliente |
| `customPrice` | No | Precio personalizado en centavos |
| `metadata` | No | Cadena JSON de metadatos |

## Gestión de Suscripciones

### Crear Suscripciones

Las suscripciones se crean a través del flujo de checkout. El método `createSubscription` envuelve la API de checkout de LemonSqueezy:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), finalProductId, {
  checkoutOptions: {
    embed: true,
    subscriptionPreview: true
  },
  checkoutData: {
    email: email || '',
    custom: metadata ?? {}
  }
});
```

### Cancelar Suscripciones

```typescript
async cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
  const { data, error } = await cancelSubscription(Number(subscriptionId));
  return {
    id: subscriptionId,
    status: 'canceled' as SubscriptionStatus,
    // ...
  };
}
```

### Actualizar Suscripciones

El método de actualización admite cambios de plan, pausar, reanudar y reactivar:

```typescript
// Cambio de plan mediante ID de variante
if (params.priceId) {
  updatePayload.variantId = Number(params.priceId);
}

// Pausar suscripción
if (params.metadata?.pauseMode) {
  updatePayload.pause = {
    mode: params.metadata.pauseMode as 'void' | 'free',
    resumesAt: params.metadata.pauseUntil || null
  };
}

// Reanudar suscripción
if (params.metadata?.resumeAction) {
  if (currentSubscription?.status === 'paused') {
    updatePayload.pause = null;
  } else if (currentSubscription?.status === 'cancelled') {
    updatePayload.cancelled = false;
  }
}
```

## Procesamiento de Webhooks

### Verificación de Firma

LemonSqueezy usa HMAC SHA-256 para la verificación de firma del webhook. El proveedor verifica las firmas usando la Web Crypto API:

```typescript
const cryptoKey = await crypto.subtle.importKey(
  'raw', encoder.encode(this.webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

if (calculatedSignature !== signature) {
  return { received: false, type: 'verification_failed', ... };
}
```

### Mapeo de Eventos

| Evento de LemonSqueezy | Tipo Interno |
|------------------------|-------------|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_payment_success` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` |
| `subscription_trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `REFUND_SUCCEEDED` |

### Estructura del Manejador de Webhooks

Cada manejador sigue un patrón consistente:

```typescript
async function handleSubscriptionCreated(data: any) {
  if (isSponsorAdSubscription(data)) {
    await handleSponsorAdActivation(data);
    return;
  }
  try {
    const result = await webhookSubscriptionService.handleSubscriptionCreated(data);
    // ... registrar resultado
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

### Detección de Anuncio Patrocinado

LemonSqueezy usa `custom_data` en lugar de `metadata` de Stripe:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const customData = data.custom_data as Record<string, string> | undefined;
  const meta = data.meta as Record<string, unknown> | undefined;
  const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
  return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Gestión de Clientes

El proveedor sigue el mismo patrón de resolución de tres pasos que otros proveedores:

1. Verificar metadatos del usuario para `lemonsqueezy_customer_id`
2. Consultar la tabla de base de datos `PaymentAccount`
3. Crear un nuevo cliente mediante la API de LemonSqueezy

```typescript
const { data, error } = await createCustomer(Number(this.storeId), {
  email: params.email,
  name: params.name || '',
  city: params.metadata?.city || '',
  region: params.metadata?.region || '',
  country: params.metadata?.country || ''
});
```

## Manejo de Errores

| Estado | Código de Error | Causa |
|--------|----------------|-------|
| 400 | `VALIDATION_ERROR` | Cuerpo de solicitud o parámetros inválidos |
| 401 | `Unauthorized` | Sin sesión autenticada |
| 500 | `CONFIGURATION_ERROR` | Variables de entorno faltantes |
| 500 | `INTERNAL_ERROR` | Error no manejado |
| 503 | `PAYMENT_SERVICE_ERROR` | API de LemonSqueezy no disponible |

## Requisitos de Configuración

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Sí | Clave API de LemonSqueezy |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Sí | Secreto de firma del webhook |
| `LEMONSQUEEZY_STORE_ID` | Sí | ID numérico de la tienda |

## Limitaciones

- **Sin setup intents**: LemonSqueezy no admite guardar tarjetas sin una compra. El método `createSetupIntent` lanza un error.
- **Sin API de reembolso directo**: Los reembolsos deben procesarse a través del panel de LemonSqueezy.
- **Precios basados en variantes**: Los productos usan IDs de variante en lugar de IDs de precio. Los cambios de plan usan `variantId`.

## Consideraciones de Seguridad

- Las firmas de webhook se verifican usando HMAC SHA-256
- El texto del cuerpo sin procesar se usa para la verificación de firma para prevenir problemas de re-serialización JSON
- Las claves API nunca se exponen al cliente
- El registro en modo desarrollo sanea la PII (las direcciones de email se redactan parcialmente)

## Páginas Relacionadas

- [Análisis Detallado de Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Análisis Detallado de Polar](./polar-deep-dive.md)
- [Análisis Detallado de Solidgate](./solidgate-deep-dive.md)
- [Arquitectura de Proveedores de Pago](./payment-provider-architecture.md)
