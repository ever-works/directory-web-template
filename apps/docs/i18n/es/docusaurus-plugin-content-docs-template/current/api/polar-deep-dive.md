---
id: polar-deep-dive
title: "Análisis Detallado de Polar"
sidebar_label: "Polar"
sidebar_position: 6
---

# Análisis Detallado de Polar

Esta página documenta la implementación completa de la integración de Polar como proveedor de pagos. Polar es una plataforma de pagos orientada a desarrolladores con soporte nativo para suscripciones de software.

**Archivos fuente:**
- `template/app/api/polar/checkout/route.ts`
- `template/app/api/polar/webhook/route.ts`
- `template/app/api/polar/subscription/route.ts`
- `template/app/api/polar/subscription/cancel/route.ts`
- `template/lib/payment/providers/polar.ts`

---

## POST /api/polar/checkout

Crea una sesión de checkout de Polar para el usuario autenticado.

### Autenticación

Requiere sesión de usuario. Si el usuario ya tiene una suscripción activa, se redirige al portal de gestión en lugar de crear un nuevo checkout.

### Cuerpo de la Solicitud

```typescript
{
  planId: string;      // El ID del producto de Polar a comprar
  successUrl: string;  // URL de redirección después del pago exitoso
  cancelUrl: string;   // URL de redirección cuando se cancela el checkout
}
```

### Respuesta Exitosa

```json
{
  "success": true,
  "checkoutUrl": "https://checkout.polar.sh/checkout/session_abc123"
}
```

### Sanitización de Metadatos

Antes de crear el checkout, los metadatos del usuario se sanean para que sean seguros para pasar a Polar:

```typescript
function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
}
```

Esto garantiza que todos los metadatos pasados a Polar sean cadenas de texto planas y no contengan valores `null` o `undefined`.

---

## GET /api/polar/checkout

Verifica el estado de una sesión de checkout de Polar existente.

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `session_id` | string | **Sí** | La ID de sesión de checkout de Polar |

### Respuesta

```json
{
  "success": true,
  "session": {
    "sessionId": "session_abc123",
    "status": "complete",
    "checkoutUrl": "https://checkout.polar.sh/...",
    "customerId": "customer_xyz"
  }
}
```

---

## Gestión de Suscripciones

### GET /api/polar/subscription

Obtiene los detalles de la suscripción activa del usuario autenticado.

**Respuesta:**
```json
{
  "success": true,
  "subscription": {
    "subscriptionId": "sub_polar_123",
    "customerId": "cust_polar_456",
    "planId": "prod_polar_789",
    "status": "active",
    "currentPeriodStart": "2024-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false
  }
}
```

### POST /api/polar/subscription/cancel

Cancela la suscripción activa del usuario al final del período de facturación actual.

**Comportamiento:** La suscripción permanece activa hasta `currentPeriodEnd`. Después de esa fecha, el estado cambia a `canceled` y el usuario pierde acceso.

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Subscription will be canceled at the end of the billing period"
}
```

### POST /api/polar/subscription/reactivate

Reactiva una suscripción que fue cancelada pero aún está dentro de su período activo.

**Respuesta Exitosa:**
```json
{
  "success": true,
  "subscription": { ... }
}
```

### POST /api/polar/subscription/update

Cambia el plan de suscripción del usuario (actualización o degradación).

**Cuerpo de la Solicitud:**
```json
{
  "newProductId": "prod_polar_yearly_999"
}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "subscription": { ... }
}
```

---

## POST /api/polar/webhook

Procesa eventos webhook de Polar. Polar envía eventos firmados para notificar cambios en el estado de suscripciones y pagos.

### Autenticación del Webhook

Los webhooks de Polar se verifican usando `webhooks.validateEvent()` del SDK de Polar. Se verifican tres cabeceras:

| Cabecera | Descripción |
|---------|-------------|
| `webhook-id` | Identificador único del mensaje webhook |
| `webhook-timestamp` | Marca de tiempo Unix del envío del evento |
| `webhook-signature` | Firma HMAC para verificación de autenticidad |

Si la verificación falla, el punto final devuelve `400 Bad Request`.

### Tipos de Eventos Manejados

| Tipo de Evento de Polar | Acción Interna |
|---|---|
| `subscription.created` | Crear registro de suscripción, actualizar estado de usuario a premium |
| `subscription.updated` | Actualizar detalles de suscripción en la base de datos |
| `subscription.active` | Confirmar estado activo de suscripción |
| `subscription.canceled` | Marcar suscripción como cancelada en la base de datos |
| `subscription.revoked` | Revocar acceso inmediatamente |
| `order.created` | Registrar evento de pago completado |

### Variable de Entorno del Webhook

```bash
POLAR_WEBHOOK_SECRET=whsec_xxx   # Requerido para verificación de firma
```

---

## Gestión de Clientes

Cuando un usuario completa un checkout por primera vez, se crea un cliente de Polar y su ID se almacena en el perfil del usuario en la base de datos:

```typescript
// Guardado en la tabla de perfiles de cliente
{
  polarCustomerId: "cust_polar_xxx"
}
```

Las llamadas de API posteriores usan el `polarCustomerId` almacenado para recuperar y gestionar directamente la suscripción del cliente, evitando búsquedas por email.

---

## Manejo de Errores

Todos los puntos finales de Polar usan `safeErrorResponse()` para evitar filtrar detalles internos de la implementación. Los errores específicos de Polar se mapean a códigos de estado HTTP:

| Error de Polar | Estado HTTP | Descripción |
|---|---|---|
| Token de acceso inválido | 401 | Configuración incorrecta de `POLAR_ACCESS_TOKEN` |
| Producto no encontrado | 404 | `POLAR_PRODUCT_ID_*` apunta a producto inexistente |
| Suscripción ya cancelada | 400 | El usuario intenta cancelar una suscripción ya cancelada |
| Firma de webhook inválida | 400 | El payload del webhook fue alterado o el secreto no coincide |

---

## Configuración Requerida

| Variable de Entorno | Descripción |
|---------------------|-------------|
| `PAYMENT_PROVIDER` | Debe ser `polar` |
| `POLAR_ACCESS_TOKEN` | Token de acceso de la API de Polar |
| `POLAR_WEBHOOK_SECRET` | Secreto para verificar firmas de webhook |
| `POLAR_PRODUCT_ID_MONTHLY` | ID del producto de plan mensual en Polar |
| `POLAR_PRODUCT_ID_YEARLY` | ID del producto de plan anual en Polar |

Para instrucciones completas de configuración, consulta la [documentación de integración de Polar](../integrations/polar).
