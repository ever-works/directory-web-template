---
id: payment-endpoints
title: "Endpoints API de Pagos"
sidebar_label: "Endpoints de Pagos"
sidebar_position: 3
---

# Endpoints API de Pagos

La plataforma admite cuatro proveedores de pago: **Stripe**, **LemonSqueezy**, **Polar** y **Solidgate**. El proveedor activo se selecciona mediante la variable de entorno `PAYMENT_PROVIDER`. Cada proveedor expone un conjunto de rutas API bajo su propio prefijo de ruta, más un punto final genérico `/api/payment` compartido por todos los proveedores.

## Punto Final Genérico de Pago

### POST /api/payment

Crea una sesión de pago o checkout usando el proveedor configurado actualmente.

**Autenticación:** Requiere sesión de usuario autenticado.

**Cuerpo de la Solicitud:**
```json
{
  "planId": "pro_monthly",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

**Respuesta:**
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.provider.com/session_xxx"
}
```

---

## Puntos Finales de Stripe

Stripe expone el conjunto de rutas más completo, cubriendo checkout, webhooks, portal de cliente y 13 operaciones de gestión de suscripciones.

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| POST | `/api/stripe/checkout` | Sesión | Crear sesión de checkout de Stripe |
| GET | `/api/stripe/checkout` | Sesión | Obtener estado de la sesión de checkout |
| POST | `/api/stripe/webhook` | Firma de Stripe | Procesar eventos webhook de Stripe |
| GET | `/api/stripe/portal` | Sesión | Crear sesión del portal de cliente de Stripe |
| GET | `/api/stripe/subscription` | Sesión | Obtener suscripción actual del usuario |
| POST | `/api/stripe/subscription/cancel` | Sesión | Cancelar suscripción activa |
| POST | `/api/stripe/subscription/reactivate` | Sesión | Reactivar suscripción cancelada |
| POST | `/api/stripe/subscription/update` | Sesión | Actualizar plan de suscripción |
| POST | `/api/stripe/subscription/pause` | Sesión | Pausar colección de suscripción |
| POST | `/api/stripe/subscription/resume` | Sesión | Reanudar suscripción pausada |
| GET | `/api/stripe/subscription/invoices` | Sesión | Listar historial de facturas |
| GET | `/api/stripe/subscription/upcoming-invoice` | Sesión | Obtener vista previa de próxima factura |
| POST | `/api/stripe/subscription/preview-update` | Sesión | Vista previa de cambio de plan antes de aplicar |
| GET | `/api/stripe/subscription/payment-methods` | Sesión | Listar métodos de pago guardados |
| POST | `/api/stripe/subscription/payment-methods` | Sesión | Adjuntar nuevo método de pago |
| DELETE | `/api/stripe/subscription/payment-methods/[id]` | Sesión | Eliminar método de pago guardado |
| POST | `/api/stripe/subscription/payment-methods/[id]/default` | Sesión | Establecer método de pago predeterminado |

Para documentación detallada de Stripe, consulta el [Análisis Detallado de Stripe](../payment/stripe-deep-dive).

---

## Puntos Finales de LemonSqueezy

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| POST | `/api/lemonsqueezy/checkout` | Sesión | Crear URL de checkout de LemonSqueezy |
| GET | `/api/lemonsqueezy/checkout` | Sesión | Verificar estado del checkout |
| POST | `/api/lemonsqueezy/webhook` | Firma de LS | Procesar eventos webhook |
| GET | `/api/lemonsqueezy/subscription` | Sesión | Obtener detalles de suscripción |
| POST | `/api/lemonsqueezy/subscription/cancel` | Sesión | Cancelar suscripción |
| POST | `/api/lemonsqueezy/subscription/reactivate` | Sesión | Reactivar suscripción cancelada |
| POST | `/api/lemonsqueezy/subscription/update` | Sesión | Cambiar plan de suscripción |

Para documentación detallada de LemonSqueezy, consulta el [Análisis Detallado de LemonSqueezy](../payment/lemonsqueezy-deep-dive).

---

## Puntos Finales de Polar

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| POST | `/api/polar/checkout` | Sesión | Crear sesión de checkout de Polar |
| GET | `/api/polar/checkout` | Sesión | Verificar estado del checkout |
| POST | `/api/polar/webhook` | Firma de Polar | Procesar eventos webhook |
| GET | `/api/polar/subscription` | Sesión | Obtener suscripción activa |
| POST | `/api/polar/subscription/cancel` | Sesión | Cancelar suscripción |

Para documentación detallada de Polar, consulta el [Análisis Detallado de Polar](../payment/polar-deep-dive).

---

## Puntos Finales de Solidgate

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| POST | `/api/solidgate/checkout` | Sesión | Iniciar sesión de pago de Solidgate |
| POST | `/api/solidgate/webhook` | Firma de Solidgate | Procesar eventos webhook |

---

## Seguridad de Webhooks

Todos los puntos finales de webhook verifican la autenticidad de la solicitud usando la firma del proveedor:

| Proveedor | Método de Verificación |
|-----------|----------------------|
| Stripe | `stripe.webhooks.constructEvent()` con `STRIPE_WEBHOOK_SECRET` |
| LemonSqueezy | Verificación de firma HMAC-SHA256 con `LEMONSQUEEZY_WEBHOOK_SECRET` |
| Polar | `webhooks.validateEvent()` con `POLAR_WEBHOOK_SECRET` |
| Solidgate | Cabecera de firma en solicitud con `SOLIDGATE_SECRET_KEY` |

Las solicitudes con firmas inválidas reciben una respuesta `400 Bad Request` de inmediato.

## Variables de Entorno

### Configuración del Proveedor

| Variable | Descripción |
|----------|-------------|
| `PAYMENT_PROVIDER` | Proveedor activo: `stripe`, `lemonsqueezy`, `polar` o `solidgate` |

### Stripe

| Variable | Descripción |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Clave secreta de la API de Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Clave publicable de Stripe (pública) |
| `STRIPE_WEBHOOK_SECRET` | Secreto de firma del webhook de Stripe |
| `STRIPE_PRICE_ID_MONTHLY` | ID del precio del plan mensual de Stripe |
| `STRIPE_PRICE_ID_YEARLY` | ID del precio del plan anual de Stripe |

### LemonSqueezy

| Variable | Descripción |
|----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Clave de la API de LemonSqueezy |
| `LEMONSQUEEZY_STORE_ID` | ID de la tienda de LemonSqueezy |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Secreto para verificación de webhooks |
| `LEMONSQUEEZY_VARIANT_ID_MONTHLY` | ID de variante del plan mensual |
| `LEMONSQUEEZY_VARIANT_ID_YEARLY` | ID de variante del plan anual |

### Polar

| Variable | Descripción |
|----------|-------------|
| `POLAR_ACCESS_TOKEN` | Token de acceso a la API de Polar |
| `POLAR_WEBHOOK_SECRET` | Secreto para verificación de webhooks |
| `POLAR_PRODUCT_ID_MONTHLY` | ID de producto del plan mensual |
| `POLAR_PRODUCT_ID_YEARLY` | ID de producto del plan anual |

### Solidgate

| Variable | Descripción |
|----------|-------------|
| `SOLIDGATE_MERCHANT_ID` | ID de comerciante de Solidgate |
| `SOLIDGATE_SECRET_KEY` | Clave secreta para firmar solicitudes |

## Notas de Autenticación

- Todos los puntos finales de pago requieren una sesión de usuario activa (excepto los puntos finales de webhook que usan verificación de firma).
- Los usuarios con suscripción activa son redirigidos al portal de cliente en lugar del checkout.
- Los webhooks están libres de autenticación de sesión pero validan la firma del proveedor.
