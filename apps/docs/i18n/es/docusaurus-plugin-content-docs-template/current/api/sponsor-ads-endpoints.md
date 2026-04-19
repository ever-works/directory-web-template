---
id: sponsor-ads-endpoints
title: "Endpoints API de Anuncios Patrocinados"
sidebar_label: "Anuncios Patrocinados"
sidebar_position: 16
---

# Endpoints API de Anuncios Patrocinados

La API de Anuncios Patrocinados gestiona el ciclo de vida completo de los anuncios patrocinados: creación, checkout de pago, renovación, cancelación y estadísticas. Se integra con múltiples proveedores de pago (Stripe, LemonSqueezy, Polar) para la facturación.

**Archivos fuente:**
- `template/app/api/sponsor-ads/route.ts`
- `template/app/api/sponsor-ads/checkout/route.ts`
- `template/app/api/sponsor-ads/user/route.ts`
- `template/app/api/sponsor-ads/user/[id]/route.ts`
- `template/app/api/sponsor-ads/user/[id]/cancel/route.ts`
- `template/app/api/sponsor-ads/user/[id]/renew/route.ts`
- `template/app/api/sponsor-ads/user/stats/route.ts`

## Resumen de Endpoints

| Método | Ruta | Autenticación | Descripción |
|--------|------|------|-------------|
| GET | `/api/sponsor-ads` | Ninguna | Obtener anuncios patrocinados activos (público) |
| POST | `/api/sponsor-ads/checkout` | Sesión | Crear sesión de checkout |
| GET | `/api/sponsor-ads/user` | Sesión | Listar anuncios patrocinados del usuario |
| POST | `/api/sponsor-ads/user` | Sesión | Enviar nuevo anuncio patrocinado |
| GET | `/api/sponsor-ads/user/{id}` | Sesión | Obtener un anuncio patrocinado individual |
| POST | `/api/sponsor-ads/user/{id}/cancel` | Sesión | Cancelar un anuncio patrocinado |
| POST | `/api/sponsor-ads/user/{id}/renew` | Sesión | Renovar un anuncio patrocinado |
| GET | `/api/sponsor-ads/user/stats` | Sesión | Obtener estadísticas de anuncios del usuario |

---

## GET `/api/sponsor-ads`

Devuelve los anuncios patrocinados activos con los datos asociados del ítem para visualización pública. **No requiere autenticación.**

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Predeterminado | Descripción |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Máximo de anuncios a devolver (1-50) |

### Respuesta: 200

```json
{
  "success": true,
  "data": [
    {
      "sponsor": {
        "id": "sp_123",
        "itemSlug": "featured-tool",
        "status": "active",
        "interval": "monthly"
      },
      "item": {
        "name": "Featured Tool",
        "slug": "featured-tool",
        "description": "A great tool",
        "icon_url": "https://example.com/icon.png",
        "category": "productivity"
      }
    }
  ]
}
```

---

## POST `/api/sponsor-ads/checkout`

Crea una sesión de checkout de pago para un anuncio patrocinado aprobado. Admite los proveedores Stripe, LemonSqueezy y Polar.

### Cuerpo de la Solicitud

| Campo | Tipo | Requerido | Descripción |
|-------|------|----------|-------------|
| `sponsorAdId` | string | **Sí** | ID del anuncio patrocinado aprobado |
| `successUrl` | string | No | URL de redirección tras pago exitoso |
| `cancelUrl` | string | No | URL de redirección tras pago cancelado |

### Seguridad: Prevención de Open Redirect

Las URL de redirección se validan contra el origen de la aplicación para prevenir ataques de open redirect:

```ts
function validateRedirectUrl(url, allowedOrigin) {
  const urlObj = new URL(url, allowedOrigin);
  const allowedUrlObj = new URL(allowedOrigin);
  // Solo permite mismo protocolo, hostname y puerto
  return urlObj.protocol === allowedUrlObj.protocol &&
    urlObj.hostname === allowedUrlObj.hostname &&
    urlObj.port === allowedUrlObj.port;
}
```

Las URL inválidas se reemplazan silenciosamente por valores predeterminados seguros.

### Respuesta: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_live_abc123",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_abc123",
    "provider": "stripe"
  },
  "message": "Checkout session created successfully"
}
```

### Respuestas de Error

| Estado | Descripción |
|--------|-------------|
| 400 | ID de anuncio patrocinado faltante, anuncio no en estado `pending_payment`, o configuración de precio faltante |
| 401 | No autenticado |
| 403 | El usuario no es propietario de este anuncio patrocinado |
| 404 | Anuncio patrocinado no encontrado |

---

## GET `/api/sponsor-ads/user`

Devuelve una lista paginada de anuncios patrocinados pertenecientes al usuario autenticado.

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Predeterminado | Descripción |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Número de página |
| `limit` | integer | No | 10 | Ítems por página |
| `status` | string | No | -- | Filtro: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| `interval` | string | No | -- | Filtrar por intervalo de facturación |
| `search` | string | No | -- | Filtro de búsqueda de texto |

Los parámetros de consulta se validan con el esquema Zod `querySponsorAdsSchema`.

### Respuesta: 200

```json
{
  "success": true,
  "data": [
    {
      "id": "sp_123",
      "itemSlug": "my-tool",
      "status": "active",
      "interval": "monthly"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## POST `/api/sponsor-ads/user`

Crea un nuevo envío de anuncio patrocinado. El anuncio comienza en estado pendiente aguardando aprobación del administrador.

### Cuerpo de la Solicitud

| Campo | Tipo | Requerido | Descripción |
|-------|------|----------|-------------|
| `itemSlug` | string | **Sí** | Slug del ítem a patrocinar |
| `itemName` | string | **Sí** | Nombre para mostrar del ítem |
| `itemIconUrl` | string | No | URL del ícono |
| `itemCategory` | string | No | Categoría del ítem |
| `itemDescription` | string | No | Descripción (máx. 500 caracteres) |
| `interval` | `"weekly"` o `"monthly"` | **Sí** | Intervalo de suscripción |

### Respuesta: 201 Creado

```json
{
  "success": true,
  "data": {
    "id": "sp_new123",
    "status": "pending",
    "interval": "monthly"
  },
  "message": "Sponsor ad submission created successfully. Pending admin approval."
}
```

### 400 -- Envío Duplicado

```json
{
  "success": false,
  "error": "You already have an active sponsor ad"
}
```

---

## GET `/api/sponsor-ads/user/{id}`

Recupera un único anuncio patrocinado propiedad del usuario autenticado. Devuelve 404 si el anuncio no existe o pertenece a otro usuario (para prevenir fuga de información).

---

## POST `/api/sponsor-ads/user/{id}/cancel`

Cancela un anuncio patrocinado. Solo los anuncios con estado `pending_payment`, `pending` o `active` pueden cancelarse.

### Cuerpo de la Solicitud

| Campo | Tipo | Requerido | Descripción |
|-------|------|----------|-------------|
| `cancelReason` | string | No | Motivo de la cancelación (máx. 500 caracteres) |

### Respuesta: 200

```json
{
  "success": true,
  "data": { "id": "sp_123", "status": "cancelled" },
  "message": "Sponsor ad cancelled successfully"
}
```

### Respuestas de Error

| Estado | Descripción |
|--------|-------------|
| 400 | No se puede cancelar el anuncio con el estado actual |
| 403 | El usuario no es propietario de este anuncio patrocinado |
| 404 | Anuncio patrocinado no encontrado |

---

## POST `/api/sponsor-ads/user/{id}/renew`

Crea una sesión de checkout para renovar un anuncio patrocinado activo o vencido. Solo los anuncios con estado `active` o `expired` pueden renovarse.

### Cuerpo de la Solicitud

| Campo | Tipo | Requerido | Descripción |
|-------|------|----------|-------------|
| `successUrl` | string | No | URL de redirección tras el pago |
| `cancelUrl` | string | No | URL de redirección al cancelar |

### Respuesta: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_renewal_abc",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_renewal_abc",
    "provider": "stripe"
  },
  "message": "Renewal checkout session created successfully"
}
```

---

## GET `/api/sponsor-ads/user/stats`

Devuelve estadísticas de los anuncios patrocinados del usuario autenticado, incluyendo desglose por estado, distribución por intervalo y métricas de ingresos.

### Respuesta: 200

```json
{
  "success": true,
  "stats": {
    "overview": {
      "total": 15,
      "pendingPayment": 2,
      "pending": 3,
      "active": 5,
      "rejected": 1,
      "expired": 3,
      "cancelled": 1
    },
    "byInterval": {
      "weekly": 8,
      "monthly": 7
    },
    "revenue": {
      "totalRevenue": 45000,
      "weeklyRevenue": 20000,
      "monthlyRevenue": 25000
    }
  }
}
```

Los valores de ingresos están en **unidades de moneda menores** (por ejemplo, centavos para USD).

---

## Configuración del Proveedor de Pago

El proveedor de pago activo está determinado por `NEXT_PUBLIC_PAYMENT_PROVIDER` (predeterminado `"stripe"`). Cada proveedor requiere su propio conjunto de variables de entorno para IDs de precio/variante:

| Proveedor | Variable de precio semanal | Variable de precio mensual |
|----------|---------------------|-----------------------|
| Stripe | `STRIPE_SPONSOR_WEEKLY_PRICE_ID` | `STRIPE_SPONSOR_MONTHLY_PRICE_ID` |
| LemonSqueezy | `LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID` | `LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID` |
| Polar | `POLAR_SPONSOR_WEEKLY_PRICE_ID` | `POLAR_SPONSOR_MONTHLY_PRICE_ID` |

---

## Archivos Fuente Relacionados

| Archivo | Propósito |
|------|---------|
| `template/app/api/sponsor-ads/route.ts` | Punto final de anuncios activos públicos |
| `template/app/api/sponsor-ads/checkout/route.ts` | Creación de sesión de checkout |
| `template/app/api/sponsor-ads/user/route.ts` | Lista y creación de anuncios del usuario |
| `template/app/api/sponsor-ads/user/[id]/route.ts` | Recuperación de anuncio individual |
| `template/app/api/sponsor-ads/user/[id]/cancel/route.ts` | Cancelación de anuncio |
| `template/app/api/sponsor-ads/user/[id]/renew/route.ts` | Renovación de anuncio |
| `template/app/api/sponsor-ads/user/stats/route.ts` | Estadísticas del usuario |
| `template/lib/services/sponsor-ad.service.ts` | Capa de lógica de negocio |
| `template/lib/validations/sponsor-ad.ts` | Esquemas de validación Zod |
| `template/lib/payment/config/payment-provider-manager.ts` | Fábrica de proveedor de pagos |
