---
id: stripe-checkout-deep-dive
title: "Análisis Detallado de Stripe Checkout"
sidebar_label: "Stripe Checkout"
sidebar_position: 1
---

# Análisis Detallado de Stripe Checkout

Esta página cubre el flujo completo de checkout de Stripe, incluyendo la creación de sesiones, la resolución del ID de precio, el manejo de monedas, las URL de redirección, los flujos de éxito/cancelación y la propagación de metadatos.

## Descripción General

La integración de checkout de Stripe proporciona una API del lado del servidor que crea Sesiones de Checkout de Stripe para pagos únicos y suscripciones. El flujo autentica al usuario, resuelve o crea un cliente de Stripe, construye elementos de línea con soporte opcional para períodos de prueba y devuelve una URL de checkout alojado.

## Tabla de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/stripe/checkout` | Sesión requerida | Crear una nueva sesión de checkout |
| `GET` | `/api/stripe/checkout` | Sesión requerida | Recuperar una sesión de checkout existente |

## Crear una Sesión de Checkout (POST)

### Cuerpo de la Solicitud

```typescript
interface CreateCheckoutRequest {
  priceId: string;                          // ID de precio de Stripe (ej. "price_1234567890abcdef")
  mode?: 'one_time' | 'subscription';       // Predeterminado "one_time"
  trialPeriodDays?: number;                 // Días de prueba (solo modo suscripción, predeterminado: 0)
  billingInterval?: 'month' | 'year';       // Intervalo de facturación (predeterminado: "month")
  trialAmountId?: string;                   // ID de precio para cargo de configuración del período de prueba
  isAuthorizedTrialAmount?: boolean;        // Si el monto de prueba está autorizado
  successUrl: string;                       // URL de redirección tras éxito
  cancelUrl: string;                        // URL de redirección tras cancelación
  metadata?: Record<string, string>;        // Metadatos personalizados (planId, planName, etc.)
}
```

### Ejemplo de Solicitud

```bash
curl -X POST /api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "mode": "subscription",
    "trialPeriodDays": 14,
    "billingInterval": "month",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": {
      "planId": "pro_plan",
      "planName": "Pro Plan"
    }
  }'
```

### Respuesta Exitosa (200)

```json
{
  "data": {
    "id": "cs_test_1234567890abcdef",
    "url": "https://checkout.stripe.com/pay/cs_test_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Mapeo de Modos

La API mapea los modos entrantes al tipo `Mode` esperado por Stripe:

```typescript
const stripeMode: 'payment' | 'setup' | 'subscription' =
  mode === 'one_time' ? 'payment'
    : mode === 'subscription' ? 'subscription'
    : 'setup';
```

- `one_time` se mapea al modo `payment` de Stripe
- `subscription` se mapea al modo `subscription` de Stripe
- Cualquier otro valor se mapea al modo `setup`

## Resolución del Cliente

Antes de crear una sesión de checkout, la API resuelve o crea un cliente de Stripe:

```typescript
const stripeCustomerId = await stripeProvider.getCustomerId(session.user);
```

El método `getCustomerId` sigue una resolución en tres pasos:

1. **Verificación de metadatos** -- Busca `stripe_customer_id` en los metadatos del usuario
2. **Consulta a la base de datos** -- Consulta la tabla `PaymentAccount` para un registro existente
3. **Crear nuevo** -- Crea un nuevo cliente de Stripe y sincroniza con la base de datos

Si la creación del cliente falla, el endpoint devuelve un error `400`.

## Configuración de Períodos de Prueba

Los períodos de prueba requieren que se cumplan dos condiciones:

```typescript
const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;
```

Cuando se habilita un período de prueba, `trialAmountId` es requerido. Esto permite cobrar una tarifa de configuración durante el período de prueba. El auxiliar `buildCheckoutLineItems` construye elementos de línea que incluyen tanto el precio de la suscripción como el monto de prueba opcional.

Si `hasTrial` es verdadero pero falta `trialAmountId`, el endpoint devuelve:

```json
{
  "error": "Invalid trial configuration",
  "message": "trialAmountId is required when trial is enabled"
}
```

## Configuración Específica de Suscripción

Cuando el modo es `subscription`, se aplica configuración adicional via `applySubscriptionConfig`:

```typescript
if (stripeMode === 'subscription') {
  applySubscriptionConfig(checkoutParams, {
    userId: session.user.id || '',
    planId: metadata.planId,
    planName: metadata.planName,
    billingInterval,
    trialPeriodDays: hasTrial ? trialPeriodDays : 0
  });
}
```

Esto adjunta metadatos de suscripción incluyendo `userId`, `planId`, `planName` e intervalo de facturación a los `subscription_data` de la sesión de checkout.

## Propagación de Metadatos

Los metadatos de la solicitud se fusionan con los datos del usuario de la sesión:

```typescript
metadata: {
  ...metadata,
  ...session.user
}
```

Esto garantiza que la información de identidad del usuario (ID, correo, nombre) siempre esté adjunta a la sesión de checkout para la reconciliación en los manejadores de webhooks.

## Recuperar una Sesión de Checkout (GET)

### Parámetros de Consulta

| Parámetro | Requerido | Descripción |
|-----------|----------|-------------|
| `session_id` | Sí | ID de la sesión de checkout de Stripe |

### Ejemplo de Solicitud

```bash
curl -X GET "/api/stripe/checkout?session_id=cs_test_1234567890abcdef" \
  -H "Cookie: session=..."
```

### Respuesta Exitosa (200)

```json
{
  "session": { "...objeto completo de sesión de checkout de Stripe..." },
  "status": "complete",
  "customer": "cus_1234567890abcdef",
  "subscription": "sub_1234567890abcdef"
}
```

La sesión se recupera con datos expandidos de `line_items` y `subscription`:

```typescript
const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## Soporte Multi-Moneda

El manejo de monedas se configura a través de `stripe.config.ts`. El objeto `STRIPE_CONFIG` mapea planes a IDs de precio específicos por moneda:

```typescript
export const STRIPE_CONFIG: Record<PlanName, PlanConfig> = {
  premium: {
    usd: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'USD', symbol: '$' },
    eur: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'EUR', symbol: '$' },
    // ... gbp, cad
  },
  standard: { /* ... */ },
  free: { productId: undefined }
};
```

Usa `getStripePriceConfig(plan, currency, interval)` para resolver el ID de precio correcto para un plan, moneda e intervalo de facturación dados.

## Precios Dinámicos

Cuando `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true`, el endpoint `/api/stripe/products` obtiene productos y precios directamente de la API de Stripe con un TTL de caché de 5 minutos. Los productos deben tener las siguientes claves de metadatos configuradas en el Dashboard de Stripe:

- `plan` -- Tipo de plan (`free`, `standard`, `premium`)
- `type` -- Tipo de producto (`subscription`, `sponsor_ad`)
- `features` -- Array JSON de cadenas de características
- `annualDiscount` -- Porcentaje de descuento anual

## Requisitos de Configuración

| Variable | Requerido | Descripción |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Sí | Clave secreta de la API de Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Sí | Clave publicable de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Sí | Secreto de firma del webhook |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | No | Habilitar precios dinámicos |
| `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD` | Condicional | IDs de precio por plan/moneda |

## Manejo de Errores

| Estado | Error | Causa |
|--------|-------|-------|
| 400 | `Failed to create customer` | Resolución/creación del cliente falló |
| 400 | `Invalid trial configuration` | Período de prueba habilitado sin `trialAmountId` |
| 400 | `Session ID is required` | Solicitud GET sin parámetro `session_id` |
| 401 | `Unauthorized` | Sin sesión autenticada |
| 500 | `Failed to create checkout session` | Error de la API de Stripe o error interno |

En modo de desarrollo, las respuestas de error incluyen un campo `details` con el stack trace.

## Consideraciones de Seguridad

- Todos los endpoints de checkout requieren una sesión autenticada via `auth()`
- La clave secreta de Stripe nunca se expone al cliente
- Los metadatos se fusionan del lado del servidor; los clientes no pueden falsificar la identidad del usuario
- Las sesiones de checkout están vinculadas al cliente de Stripe del usuario autenticado
- Los mensajes de error se sanean via `safeErrorMessage` para prevenir fuga de información en producción

## Páginas Relacionadas

- [Análisis Detallado de Stripe Subscriptions](./stripe-subscription-deep-dive.md)
- [Análisis Detallado de Stripe Webhooks](./stripe-webhook-deep-dive.md)
- [Análisis Detallado de Métodos de Pago Stripe](./stripe-payment-methods-deep-dive.md)
- [Arquitectura del Proveedor de Pagos](./payment-provider-architecture.md)
