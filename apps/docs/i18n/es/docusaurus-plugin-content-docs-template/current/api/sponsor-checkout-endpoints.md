---
id: sponsor-checkout-endpoints
title: "Referencia API Anuncios Patrocinados y Pago"
sidebar_label: "An. Patrocinados & Pago"
sidebar_position: 59
---

# Referencia API Anuncios Patrocinados y Pago

## Descripción General

Los endpoints de Anuncios Patrocinados gestionan el ciclo de vida completo de los anuncios patrocinados en ítems del directorio. Esto incluye la exploración de anuncios activos, el envío de nuevas solicitudes de patrocinio, la gestión de anuncios del usuario, el procesamiento de pagos a través de múltiples proveedores (Stripe, LemonSqueezy, Polar) y el manejo de cancelaciones y renovaciones. El flujo de checkout admite intervalos de facturación semanal y mensual.

## Endpoints

### GET /api/sponsor-ads

Devuelve una lista de los anuncios patrocinados activos con los datos del ítem asociado para visualización pública.

**Solicitud**

| Parámetro | Tipo    | En    | Descripción                                      |
| --------- | ------- | ----- | ------------------------------------------------ |
| limit     | integer | query | Máximo de anuncios patrocinados a devolver (predeterminado: 10, máx: 50) |

**Respuesta**

```typescript
{
  success: true;
  data: Array<{
    sponsor: {
      id: string;
      itemSlug: string;
      status: string;
      interval: string;
    };
    item: {
      name: string;
      slug: string;
      description: string;
      icon_url: string;
      category: string;
    } | null;
  }>;
}
```

**Ejemplo**

```typescript
const response = await fetch("/api/sponsor-ads?limit=5");
const { data: sponsoredItems } = await response.json();
```

### GET /api/sponsor-ads/user

Devuelve una lista paginada de anuncios patrocinados enviados por el usuario autenticado.

**Solicitud**

| Parámetro | Tipo    | En    | Descripción                                                                             |
| --------- | ------- | ----- | --------------------------------------------------------------------------------------- |
| page      | integer | query | Número de página (predeterminado: 1)                                                                |
| limit     | integer | query | Ítems por página (predeterminado: 10)                                                            |
| status    | string  | query | Filtro: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| interval  | string  | query | Filtro: `"weekly"`, `"monthly"`                                                         |
| search    | string  | query | Término de búsqueda                                                                             |

**Respuesta**

```typescript
{
  success: true;
  data: Array<SponsorAd>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

**Ejemplo**

```typescript
const response = await fetch("/api/sponsor-ads/user?status=active&page=1");
const { data, pagination } = await response.json();
```

### POST /api/sponsor-ads/user

Crea un nuevo envío de anuncio patrocinado para el usuario autenticado. El envío comienza en estado pendiente aguardando aprobación del administrador.

**Solicitud**

```typescript
{
  itemSlug: string;          // Slug del ítem a patrocinar (requerido)
  itemName: string;          // Nombre del ítem (requerido)
  itemIconUrl?: string;      // URL del ícono
  itemCategory?: string;     // Categoría del ítem
  itemDescription?: string;  // Descripción (máx. 500 caracteres)
  interval: "weekly" | "monthly"; // Intervalo de facturación (requerido)
}
```

**Respuesta**

```typescript
{
  success: true;
  data: SponsorAd;
  message: "Sponsor ad submission created successfully. Pending admin approval.";
}
```

**Ejemplo**

```typescript
const response = await fetch("/api/sponsor-ads/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    itemSlug: "my-awesome-tool",
    itemName: "My Awesome Tool",
    interval: "monthly",
  }),
});
```

### GET /api/sponsor-ads/user/stats

Devuelve estadísticas de los anuncios patrocinados del usuario autenticado, incluyendo conteos por estado, distribución por intervalo y métricas de ingresos.

**Solicitud**

No se requieren parámetros. Autenticación mediante cookie de sesión.

**Respuesta**

```typescript
{
  success: true;
  stats: {
    overview: {
      total: number;
      pendingPayment: number;
      pending: number;
      active: number;
      rejected: number;
      expired: number;
      cancelled: number;
    }
    byInterval: {
      weekly: number;
      monthly: number;
    }
    revenue: {
      totalRevenue: number; // En unidades de moneda menores (centavos)
      weeklyRevenue: number;
      monthlyRevenue: number;
    }
  }
}
```

**Ejemplo**

```typescript
const response = await fetch("/api/sponsor-ads/user/stats");
const { stats } = await response.json();
console.log(
  `Active ads: ${stats.overview.active}, Total revenue: ${stats.revenue.totalRevenue}`,
);
```

### GET `/api/sponsor-ads/user/{id}`

Devuelve un único anuncio patrocinado propiedad del usuario autenticado.

**Solicitud**

| Parámetro | Tipo   | En   | Descripción              |
| --------- | ------ | ---- | ------------------------ |
| id        | string | path | ID del anuncio patrocinado (requerido) |

**Respuesta**

```typescript
{
  success: true;
  data: SponsorAd;
}
```

### POST /api/sponsor-ads/checkout

Crea una sesión de checkout para un anuncio patrocinado aprobado. El anuncio debe estar en estado `pending_payment` y ser propiedad del usuario autenticado.

**Solicitud**

```typescript
{
  sponsorAdId: string;      // ID del anuncio patrocinado aprobado (requerido)
  successUrl?: string;      // URL de redirección tras pago exitoso
  cancelUrl?: string;       // URL de redirección tras pago cancelado
}
```

**Respuesta**

```typescript
{
  success: true;
  data: {
    checkoutId: string; // ID de sesión de checkout del proveedor
    checkoutUrl: string; // URL para redirigir al usuario al pago
    provider: string; // "stripe", "lemonsqueezy" o "polar"
  }
  message: "Checkout session created successfully";
}
```

**Ejemplo**

```typescript
const response = await fetch("/api/sponsor-ads/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sponsorAdId: "ad-123",
    successUrl: "https://myapp.com/sponsor/success?sponsorAdId=ad-123",
    cancelUrl: "https://myapp.com/sponsor?cancelled=true",
  }),
});

const { data } = await response.json();
window.location.href = data.checkoutUrl; // Redirigir al pago
```

### POST `/api/sponsor-ads/user/{id}/cancel`

Cancela un anuncio patrocinado propiedad del usuario autenticado. Solo se pueden cancelar anuncios con estado `pending_payment`, `pending` o `active`.

**Solicitud**

```typescript
{
  cancelReason?: string;   // Motivo opcional de cancelación (máx. 500 caracteres)
}
```

**Respuesta**

```typescript
{
  success: true;
  data: SponsorAd; // El anuncio patrocinado cancelado
  message: "Sponsor ad cancelled successfully";
}
```

**Ejemplo**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/cancel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cancelReason: "No longer needed" }),
});
```

### POST `/api/sponsor-ads/user/{id}/renew`

Crea una sesión de checkout para renovar un anuncio patrocinado activo o vencido. Solo los anuncios con estado `active` o `expired` pueden renovarse.

**Solicitud**

```typescript
{
  successUrl?: string;     // URL de redirección tras pago exitoso
  cancelUrl?: string;      // URL de redirección tras pago cancelado
}
```

**Respuesta**

```typescript
{
  success: true;
  data: {
    checkoutId: string;
    checkoutUrl: string;
    provider: string;
  }
  message: "Renewal checkout session created successfully";
}
```

**Ejemplo**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/renew", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    successUrl:
      "https://myapp.com/sponsor/success?sponsorAdId=ad-123&renewal=true",
  }),
});
const { data } = await response.json();
window.location.href = data.checkoutUrl;
```

## Autenticación

| Endpoint                                 | Autenticación Requerida                         |
| ---------------------------------------- | ------------------------------------- |
| GET /api/sponsor-ads                     | Pública                                |
| GET /api/sponsor-ads/user                | Sesión requerida                      |
| POST /api/sponsor-ads/user               | Sesión requerida                      |
| GET /api/sponsor-ads/user/stats          | Sesión requerida                      |
| `GET /api/sponsor-ads/user/{id}`         | Sesión requerida (propiedad verificada) |
| POST /api/sponsor-ads/checkout           | Sesión requerida (propiedad verificada) |
| `POST /api/sponsor-ads/user/{id}/cancel` | Sesión requerida (propiedad verificada) |
| `POST /api/sponsor-ads/user/{id}/renew`  | Sesión requerida (propiedad verificada) |

Todos los endpoints específicos del usuario verifican la propiedad -- intentar acceder al anuncio patrocinado de otro usuario devuelve `404` (para GET) o `403` (para acciones).

## Respuestas de Error

| Estado | Descripción                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 400    | Entrada inválida, envío duplicado, estado no cancelable/no renovable, configuración de precio faltante o JSON malformado |
| 401    | No autorizado -- sin sesión autenticada                                                                                  |
| 403    | Prohibido -- el usuario no es propietario del anuncio patrocinado                                                             |
| 404    | Anuncio patrocinado no encontrado                                                                                      |
| 500    | Error interno del servidor -- fallo del proveedor de pago o error de base de datos                                                       |

## Limitación de Velocidad

Sin limitación de velocidad explícita. Las URL de redirección en los endpoints de checkout y renovación se validan contra el dominio de la aplicación para prevenir vulnerabilidades de open redirect. El proveedor de pago activo está determinado por la variable de entorno `NEXT_PUBLIC_PAYMENT_PROVIDER` (predeterminado Stripe).

## Endpoints Relacionados

- [Endpoints de Pagos de Usuario](./user-payment-endpoints) -- Historial de pagos del usuario y gestión de suscripciones
