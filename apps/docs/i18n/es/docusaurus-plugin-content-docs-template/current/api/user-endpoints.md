---
id: user-endpoints
title: "Endpoints de Usuario"
sidebar_label: "Usuario"
sidebar_position: 21
---

# Endpoints de Usuario

Endpoints para gestionar las preferencias, historial de pagos, estado del plan, suscripciones y ubicación del perfil de un usuario autenticado.

## Descripción General

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/user/currency` | Detectar la moneda del usuario por geolocalización |
| `PUT` | `/api/user/currency` | Actualizar la preferencia de moneda del usuario |
| `GET` | `/api/user/payments` | Obtener el historial de pagos del usuario |
| `GET` | `/api/user/plan-status` | Obtener el estado actual del plan del usuario |
| `GET` | `/api/user/subscription` | Obtener los detalles de la suscripción del usuario |
| `GET` | `/api/user/profile/location` | Obtener la ubicación del perfil del usuario |
| `PATCH` | `/api/user/profile/location` | Actualizar la ubicación del perfil del usuario |

## Detección de Moneda (GET /api/user/currency)

Detecta la moneda del usuario según los encabezados de CDN de geolocalización o los metadatos de sesión.

### Parámetros de Consulta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `provider` | `string` | Proveedor de CDN: `cloudflare`, `vercel`, `fastly`, `akamai` |

### Respuesta 200

```json
{
  "currency": "EUR",
  "country": "DE",
  "detected": true
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `currency` | `string` | Código de moneda ISO 4217 detectado (p. ej., "USD", "EUR") |
| `country` | `string` | Código de país ISO 3166-1 alfa-2 |
| `detected` | `boolean` | `true` si se detectó automáticamente, `false` si es predeterminado |

La detección recurre con elegancia: si los encabezados del CDN no están disponibles, se usa la moneda de los metadatos de la sesión o "USD" como predeterminado.

## Actualizar Moneda (PUT /api/user/currency)

Guarda la preferencia de moneda del usuario en la base de datos.

### Cuerpo de la Solicitud

```json
{
  "currency": "GBP",
  "country": "GB"
}
```

La moneda se valida contra `SUPPORTED_CURRENCIES` usando Zod. Las solicitudes con monedas no admitidas devuelven `400`.

### Respuesta 200

```json
{
  "success": true,
  "currency": "GBP",
  "country": "GB"
}
```

## Historial de Pagos (GET /api/user/payments)

Obtiene el historial de pagos completo del usuario desde Stripe.

### Respuesta 200

```json
{
  "success": true,
  "data": [
    {
      "id": "in_1234567890abcdef",
      "amount": 9.99,
      "currency": "usd",
      "status": "paid",
      "created": 1640995200,
      "description": "Subscription to Pro Plan",
      "invoice_url": "https://invoice.stripe.com/...",
      "hosted_invoice_url": "https://invoice.stripe.com/...",
      "receipt_url": "https://pay.stripe.com/receipts/..."
    }
  ]
}
```

### Comportamiento

- Solo incluye facturas con estado `paid` o `open`
- Los importes se convierten de céntimos a unidades mayores (divididos por 100)
- Los resultados se ordenan de más reciente a más antiguo por fecha de creación

## Estado del Plan (GET /api/user/plan-status)

Obtiene el estado completo del plan del usuario, incluyendo fechas de vencimiento y períodos de advertencia.

### Respuesta 200

```json
{
  "success": true,
  "data": {
    "planId": "pro",
    "effectivePlan": "pro",
    "isExpired": false,
    "expiresAt": "2025-01-01T00:00:00.000Z",
    "daysUntilExpiration": 90,
    "isInWarningPeriod": false,
    "canAccessPlanFeatures": true,
    "warningMessage": null,
    "status": "active"
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `planId` | `string` | ID del plan suscrito del usuario |
| `effectivePlan` | `string` | Plan aplicado actualmente (puede diferir si expiró) |
| `isExpired` | `boolean` | Si el plan ha expirado |
| `expiresAt` | `string` | Fecha de vencimiento del plan (ISO 8601) |
| `daysUntilExpiration` | `number` | Días hasta el vencimiento |
| `isInWarningPeriod` | `boolean` | Si está en los últimos 7 días antes del vencimiento |
| `canAccessPlanFeatures` | `boolean` | Si el usuario puede usar actualmente las características de pago |
| `warningMessage` | `string \| null` | Mensaje de advertencia de vencimiento si aplica |
| `status` | `string` | Estado de la suscripción: `active`, `expired`, `none` |

## Detalles de la Suscripción (GET /api/user/subscription)

Obtiene la suscripción Stripe activa y el historial de suscripciones anteriores.

### Respuesta 200

```json
{
  "success": true,
  "data": {
    "hasActiveSubscription": true,
    "currentSubscription": {
      "id": "sub_1234567890abcdef",
      "status": "active",
      "priceId": "price_pro_monthly",
      "currentPeriodEnd": 1672531200,
      "cancelAtPeriodEnd": false,
      "trialEnd": null
    },
    "subscriptionHistory": [
      {
        "id": "sub_prev1234",
        "status": "canceled",
        "priceId": "price_basic_monthly",
        "currentPeriodEnd": 1640995200
      }
    ]
  }
}
```

## Ubicación del Perfil (GET /api/user/profile/location)

Obtiene los datos de ubicación almacenados del usuario.

### Respuesta 200

```json
{
  "success": true,
  "data": {
    "address": "123 Main St",
    "city": "Berlin",
    "state": "Berlin",
    "country": "DE",
    "postal_code": "10115",
    "latitude": 52.52,
    "longitude": 13.405,
    "service_area": "regional",
    "is_remote": false
  }
}
```

## Actualizar Ubicación del Perfil (PATCH /api/user/profile/location)

Actualiza los datos de ubicación del usuario. Se valida con `updateLocationSchema`.

### Cuerpo de la Solicitud

Todos los campos son opcionales — solo se actualizan los campos proporcionados:

```json
{
  "city": "Munich",
  "country": "DE",
  "latitude": 48.1351,
  "longitude": 11.5820
}
```

:::note
Si se proporciona `latitude`, también se debe proporcionar `longitude`, y viceversa.
:::

### Respuesta 200

```json
{
  "success": true,
  "data": {
    "city": "Munich",
    "country": "DE",
    "latitude": 48.1351,
    "longitude": 11.5820
  }
}
```

## Páginas Relacionadas

- [Referencia API de Pagos de Usuario](./user-payment-endpoints.md)
- [Análisis Detallado de Stripe Subscriptions](./stripe-subscription-deep-dive.md)
- [Análisis Detallado de Stripe Checkout](./stripe-checkout-deep-dive.md)
