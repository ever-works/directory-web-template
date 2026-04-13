---
id: stripe-payment-methods-deep-dive
title: "Análisis Detallado de Métodos de Pago Stripe"
sidebar_label: "Métodos de Pago Stripe"
sidebar_position: 3
---

# Análisis Detallado de Métodos de Pago Stripe

Esta página cubre el listado de métodos de pago, las intenciones de configuración para guardar tarjetas, la gestión del método predeterminado y la validación de tarjetas.

## Descripción General

El sistema de métodos de pago proporciona dos capacidades clave: listar los métodos de pago guardados de un usuario con el estado predeterminado, y crear intenciones de configuración que permitan a los usuarios guardar nuevos métodos de pago para uso futuro sin un cargo inmediato.

## Tabla de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/stripe/payment-methods/list` | Sesión requerida | Listar todos los métodos de pago del usuario |
| `POST` | `/api/stripe/setup-intent` | Sesión requerida | Crear una intención de configuración para guardar un nuevo método de pago |

## Listar Métodos de Pago (GET)

### Cómo Funciona

El endpoint de lista realiza estos pasos:

1. Autentica al usuario via `auth()`
2. Resuelve el ID de cliente de Stripe del usuario via `getUserStripeCustomerId()`
3. Recupera el cliente para determinar el método de pago predeterminado
4. Lista todos los métodos de pago de tipo `card` (hasta 100)
5. Formatea y ordena los resultados (predeterminado primero, luego por fecha de creación)

### Implementación Clave

```typescript
// Recuperar cliente para detección del método de pago predeterminado
const customer = await stripe.customers.retrieve(stripeCustomerId);
const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

// Listar todos los métodos de pago de tipo tarjeta
const paymentMethods = await stripe.paymentMethods.list({
  customer: stripeCustomerId,
  type: 'card',
  limit: 100
});

// Formatear con estado predeterminado
const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
  id: pm.id,
  type: pm.type,
  card: pm.card ? {
    brand: pm.card.brand,
    last4: pm.card.last4,
    funding: pm.card.funding,
    country: pm.card.country
  } : null,
  billing_details: pm.billing_details,
  created: pm.created,
  metadata: pm.metadata,
  is_default: pm.id === defaultPaymentMethodId
}));

// Ordenar: predeterminado primero, luego por más reciente
formattedPaymentMethods.sort((a, b) => {
  if (a.is_default && !b.is_default) return -1;
  if (!a.is_default && b.is_default) return 1;
  return b.created - a.created;
});
```

### Respuesta Exitosa (200)

```typescript
interface PaymentMethodListResponse {
  success: boolean;
  data: PaymentMethodItem[];
  meta: {
    total: number;
    default_payment_method: string | null;
    customer_id: string;
  };
  message?: string;  // Presente cuando no se encontraron métodos de pago
}

interface PaymentMethodItem {
  id: string;                    // "pm_1234567890abcdef"
  type: string;                  // "card"
  card: {
    brand: string;               // "visa", "mastercard", "amex", "discover"
    last4: string;               // "4242"
    funding: string;             // "credit", "debit", "prepaid", "unknown"
    country: string;             // "US"
  } | null;
  billing_details: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: {
      line1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
  };
  created: number;               // Marca de tiempo Unix
  metadata: Record<string, string>;
  is_default: boolean;
}
```

### Ejemplo: Usuario con Métodos de Pago

```json
{
  "success": true,
  "data": [
    {
      "id": "pm_1234567890abcdef",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "funding": "credit",
        "country": "US"
      },
      "billing_details": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": null,
        "address": null
      },
      "created": 1640995200,
      "metadata": {},
      "is_default": true
    }
  ],
  "meta": {
    "total": 1,
    "default_payment_method": "pm_1234567890abcdef",
    "customer_id": "cus_1234567890abcdef"
  }
}
```

### Ejemplo: Sin Métodos de Pago

```json
{
  "success": true,
  "data": [],
  "message": "No payment methods found"
}
```

## Crear una Intención de Configuración (POST)

Las intenciones de configuración permiten a los usuarios guardar un método de pago para uso futuro sin ser cobrados inmediatamente. Esto se usa cuando un usuario quiere agregar una tarjeta antes de suscribirse, o gestionar múltiples métodos de pago.

### Cómo Funciona

```typescript
async createSetupIntent(user: User | null): Promise<SetupIntent> {
  const customerId = user?.user_metadata?.customerId;
  const setupIntent = await this.stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card']
  });

  return { ...setupIntent, clientSecret: setupIntent.client_secret! };
}
```

### Respuesta Exitosa (200)

```typescript
interface SetupIntentResponse {
  id: string;                    // "seti_1234567890abcdef"
  client_secret: string;         // "seti_1234567890abcdef_secret_xyz"
  status: string;                // "requires_payment_method"
  usage: string;                 // "off_session"
  customer: string;              // "cus_1234567890abcdef"
  created: number;               // Marca de tiempo Unix
}
```

### Uso en el Frontend

Del lado del cliente, el `client_secret` se usa para confirmar la intención de configuración con Stripe.js:

```typescript
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});
```

## Gestión del Método de Pago Predeterminado

El método de pago predeterminado se determina desde `invoice_settings.default_payment_method` del cliente de Stripe. Al crear una suscripción, el método de pago se establece automáticamente como predeterminado:

```typescript
// Durante la creación de la suscripción
await this.stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId
  }
});
```

El flag `is_default` en la respuesta de la lista de métodos de pago permite al frontend mostrar el indicador de tarjeta predeterminada.

## Manejo de Errores

| Estado | Error | Causa |
|--------|-------|-------|
| 401 | `Unauthorized` | Sin sesión autenticada |
| 404 | `Customer not found` | El cliente de Stripe fue eliminado |
| 400 | Error de Stripe | Solicitud inválida a la API de Stripe |
| 500 | `Failed to list payment methods` | Error interno |
| 500 | `Failed to create setup intent` | Falló la creación de la intención de configuración |

Los errores específicos de Stripe se detectan y manejan:

```typescript
if (error instanceof Stripe.errors.StripeError) {
  const msg = safeErrorMessage(error, 'Stripe request failed');
  return NextResponse.json({ success: false, error: msg }, { status: 400 });
}
```

## Consideraciones de Seguridad

- Todos los endpoints requieren sesiones autenticadas
- El endpoint de lista solo devuelve métodos de pago pertenecientes al cliente de Stripe del usuario autenticado
- Los números de tarjeta nunca se almacenan ni devuelven -- solo se exponen los últimos 4 dígitos y la marca
- El `client_secret` de las intenciones de configuración solo debe pasarse al SDK frontend de Stripe.js
- Los IDs de cliente se resuelven del lado del servidor y no pueden ser anulados por solicitudes del cliente

## Requisitos de Configuración

| Variable | Requerido | Descripción |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Sí | Clave secreta de la API de Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Sí | Para inicialización de Stripe.js en el frontend |

## Páginas Relacionadas

- [Análisis Detallado de Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Análisis Detallado de Stripe Subscriptions](./stripe-subscription-deep-dive.md)
- [Análisis Detallado de Stripe Webhooks](./stripe-webhook-deep-dive.md)
- [Arquitectura del Proveedor de Pagos](./payment-provider-architecture.md)
