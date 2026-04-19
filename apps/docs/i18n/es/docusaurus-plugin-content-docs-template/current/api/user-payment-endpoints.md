---
id: user-payment-endpoints
title: "Referencia API Pagos de Usuario"
sidebar_label: "Pagos de Usuario"
sidebar_position: 55
---

# Referencia API Pagos de Usuario

Referencia completa de los endpoints de pago del usuario con tipos TypeScript y ejemplos. Cubre detección de moneda, historial de facturas, estado del plan y detalles de la suscripción.

## Descripción General

Los endpoints de pago del usuario proporcionan acceso a los datos financieros del usuario autenticado. La detección de moneda utiliza los encabezados de CDN; los datos de pagos y suscripciones se obtienen de Stripe.

## GET /api/user/currency

Detecta o recupera la moneda preferida del usuario.

### Parámetros de Consulta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `provider` | `string` | Proveedor de CDN: `cloudflare`, `vercel`, `fastly`, `akamai` |

### Tipos TypeScript

```typescript
interface CurrencyDetectionResponse {
  currency: string;   // Código ISO 4217, p. ej. "USD"
  country: string;    // Código ISO 3166-1 alfa-2, p. ej. "US"
  detected: boolean;  // true si se detectó desde CDN, false si es predeterminado
}
```

### Ejemplo

```bash
curl /api/user/currency?provider=cloudflare \
  -H "CF-IPCountry: DE"
```

```json
{
  "currency": "EUR",
  "country": "DE",
  "detected": true
}
```

## PUT /api/user/currency

Guarda la moneda preferida del usuario. Requiere autenticación.

### Tipos TypeScript

```typescript
interface UpdateCurrencyRequest {
  currency: string;   // Debe estar en SUPPORTED_CURRENCIES
  country: string;    // Código de país ISO 3166-1 alfa-2
}

interface UpdateCurrencyResponse {
  success: boolean;
  currency: string;
  country: string;
}
```

### Ejemplo

```bash
curl -X PUT /api/user/currency \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"currency": "GBP", "country": "GB"}'
```

```json
{
  "success": true,
  "currency": "GBP",
  "country": "GB"
}
```

## GET /api/user/payments

Obtiene el historial de facturas del usuario desde Stripe. Requiere autenticación.

### Tipos TypeScript

```typescript
interface UserPayment {
  id: string;                    // ID de la factura de Stripe
  amount: number;                // En unidades mayores (p. ej. 9.99, no 999)
  currency: string;              // Código de moneda en minúsculas: "usd"
  status: string;                // "paid" | "open" | "void" | "uncollectible"
  created: number;               // Marca de tiempo Unix
  description: string | null;    // Descripción de la factura
  invoice_url: string | null;    // URL de la factura en PDF
  hosted_invoice_url: string | null;  // URL de la factura alojada en Stripe
  receipt_url: string | null;    // URL del recibo de pago
}

interface UserPaymentsResponse {
  success: boolean;
  data: UserPayment[];
}
```

### Ejemplo

```bash
curl /api/user/payments -H "Cookie: session=..."
```

```json
{
  "success": true,
  "data": [
    {
      "id": "in_1234567890abcdef",
      "amount": 29.99,
      "currency": "usd",
      "status": "paid",
      "created": 1672531200,
      "description": "Subscription to Pro Plan",
      "invoice_url": "https://pay.stripe.com/invoices/...",
      "hosted_invoice_url": "https://invoice.stripe.com/...",
      "receipt_url": "https://pay.stripe.com/receipts/..."
    }
  ]
}
```

Las facturas solo incluyen facturas `paid` y `open`, ordenadas de la más reciente a la más antigua.

## GET /api/user/plan-status

Obtiene el estado completo del plan del usuario. Requiere autenticación.

### Tipos TypeScript

```typescript
interface PlanStatusResponse {
  success: boolean;
  data: {
    planId: string;                  // ID del plan del usuario
    effectivePlan: string;           // Plan actualmente activo
    isExpired: boolean;              // Si el plan ha expirado
    expiresAt: string | null;        // Fecha de vencimiento ISO 8601
    daysUntilExpiration: number | null; // Días hasta el vencimiento
    isInWarningPeriod: boolean;      // Verdadero si vence en 7 días
    canAccessPlanFeatures: boolean;  // Si puede usar características de pago
    warningMessage: string | null;   // Mensaje de advertencia de UI
    status: 'active' | 'expired' | 'none';
  };
}
```

### Ejemplo

```bash
curl /api/user/plan-status -H "Cookie: session=..."
```

```json
{
  "success": true,
  "data": {
    "planId": "pro",
    "effectivePlan": "pro",
    "isExpired": false,
    "expiresAt": "2025-06-01T00:00:00.000Z",
    "daysUntilExpiration": 162,
    "isInWarningPeriod": false,
    "canAccessPlanFeatures": true,
    "warningMessage": null,
    "status": "active"
  }
}
```

#### Uso del Campo `canAccessPlanFeatures`

```typescript
// Verificar el acceso a características de pago en el frontend
const { data } = await fetch('/api/user/plan-status').then(res => res.json());

if (!data.canAccessPlanFeatures) {
  // Mostrar prompt de actualización
}

if (data.isInWarningPeriod && data.warningMessage) {
  // Mostrar banner de advertencia de vencimiento
  toast.warning(data.warningMessage);
}
```

## GET /api/user/subscription

Obtiene el estado de la suscripción activa y el historial de suscripciones anteriores. Requiere autenticación.

### Tipos TypeScript

```typescript
interface SubscriptionItem {
  id: string;
  status: string;
  priceId: string;
  currentPeriodEnd: number;    // Marca de tiempo Unix
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
  trialEnd: number | null;
}

interface UserSubscriptionResponse {
  success: boolean;
  hasActiveSubscription: boolean;
  message?: string;   // Presente si no hay suscripción activa
  currentSubscription?: SubscriptionItem;
  subscriptionHistory: SubscriptionItem[];
}
```

### Ejemplo con Suscripción Activa

```bash
curl /api/user/subscription -H "Cookie: session=..."
```

```json
{
  "success": true,
  "hasActiveSubscription": true,
  "currentSubscription": {
    "id": "sub_1234567890abcdef",
    "status": "active",
    "priceId": "price_pro_monthly",
    "currentPeriodEnd": 1706745600,
    "cancelAtPeriodEnd": false,
    "cancelAt": null,
    "trialEnd": null
  },
  "subscriptionHistory": []
}
```

### Ejemplo sin Suscripción Activa

```json
{
  "success": true,
  "hasActiveSubscription": false,
  "message": "No active subscription found",
  "subscriptionHistory": [
    {
      "id": "sub_prev_abc123",
      "status": "canceled",
      "priceId": "price_basic_monthly",
      "currentPeriodEnd": 1672531200,
      "cancelAtPeriodEnd": false,
      "cancelAt": null,
      "trialEnd": null
    }
  ]
}
```

## Autenticación

| Endpoint | Requerido |
|----------|----------|
| `GET /api/user/currency` | Opcional (usa sesión si está disponible) |
| `PUT /api/user/currency` | Sí — sesión del usuario |
| `GET /api/user/payments` | Sí — sesión del usuario |
| `GET /api/user/plan-status` | Sí — sesión del usuario |
| `GET /api/user/subscription` | Sí — sesión del usuario |

## Respuestas de Error

| Estado | Error | Causa |
|--------|-------|-------|
| 400 | `Invalid currency` | La moneda no está en `SUPPORTED_CURRENCIES` |
| 401 | `Unauthorized` | Sin sesión autenticada |
| 500 | `Failed to fetch payments` | Error de la API de Stripe |

## Limitación de Tasa

Estos endpoints utilizan la limitación de tasa estándar de la API. Los datos de pagos y suscripciones se obtienen directamente de Stripe en cada solicitud, por lo que las llamadas frecuentes pueden impactar los límites de tasa de Stripe.

## Endpoints Relacionados

- [Endpoints API de Anuncios Patrocinados y Pago](./sponsor-checkout-endpoints.md)
- [Análisis Detallado de Suscripciones Stripe](./stripe-subscription-deep-dive.md)
- [Análisis Detallado de Stripe Checkout](./stripe-checkout-deep-dive.md)
