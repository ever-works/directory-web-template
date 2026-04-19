---
id: notification-types
title: Definiciones de tipos de notificación
sidebar_label: Tipos de notificación
sidebar_position: 14
---

# Definiciones de tipos de notificación

**Fuente:** `lib/services/email-notification.service.ts`, `lib/payment/services/payment-email.service.ts`, `lib/payment/types/payment-types.ts`

Las notificaciones de la plantilla se basan principalmente en correos electrónicos y se activan mediante eventos del sistema, como finalización de pagos, cambios de suscripción y revisiones de envíos.

## Interfaces

### `EmailNotificationData`

La carga útil principal para enviar correos electrónicos de notificación de administrador.

```typescript
interface EmailNotificationData {
  to: string;                  // Recipient email address
  title: string;               // Email subject / notification title
  message: string;             // Body text content
  actionUrl?: string;          // Optional CTA link
  actionText?: string;         // Optional CTA button label
  notificationType: string;    // Category identifier for template selection
  timestamp: string;           // ISO 8601 timestamp
}
```

|campo|Requerido|Descripción|
|-------|----------|-------------|
|`to`|si|Dirección de correo electrónico del destinatario|
|`title`|si|Línea de asunto y encabezado interno|
|`message`|si|Cuerpo principal de notificación|
|`actionUrl`|No|Enlace para el botón de llamada a la acción|
|`actionText`|No|Texto de etiqueta para el botón CTA|
|`notificationType`|si|Se utiliza para seleccionar la variante de plantilla de correo electrónico.|
|`timestamp`|si|Cuando ocurrió el hecho desencadenante|

### `WebhookEventType`

Eventos recibidos de webhooks de proveedores de pagos que activan notificaciones.

```typescript
enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
  // ... additional billing portal events
}
```

### `WebhookResult`

Resultado estandarizado del procesamiento de un evento de webhook.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## Categorías de notificación

La plantilla activa notificaciones para estas categorías de eventos:

|categoría|Eventos desencadenantes|
|----------|---------------|
|**Pago**|`payment_succeeded`, `payment_failed`, `refund_succeeded`|
|**Suscripción**|`subscription_created`, `subscription_cancelled`, `subscription_trial_ending`|
|**Factura**|`invoice_paid`, `invoice_payment_failed`|
|**Presentación**|Artículo aprobado, artículo rechazado, nuevo envío recibido|
|**Cuenta**|Contraseña cambiada, correo electrónico verificado|

## Integración del servicio de correo electrónico

Las notificaciones se envían a través de la clase `EmailNotificationService`:

```typescript
import { EmailNotificationService } from '@/lib/services/email-notification.service';
import type { EmailNotificationData } from '@/lib/services/email-notification.service';

const notification: EmailNotificationData = {
  to: 'admin@example.com',
  title: 'New Submission Received',
  message: 'A new item "Acme Corp" has been submitted for review.',
  actionUrl: '/admin/items/pending',
  actionText: 'Review Now',
  notificationType: 'submission',
  timestamp: new Date().toISOString(),
};

const result = await EmailNotificationService.sendAdminNotification(notification);
```

El servicio verifica la disponibilidad del proveedor de correo electrónico antes de enviarlo y devuelve un resultado `skipped` si no hay ningún proveedor configurado, lo que evita errores de tiempo de ejecución en entornos sin configuración de correo electrónico.

## Configuración del proveedor de correo electrónico

La entrega de notificaciones depende de la configuración del correo electrónico en `lib/config/schemas/email.schema.ts`:

|Proveedor|Var. ambiental requerida|Auto-habilitado|
|----------|-----------------|--------------|
|Reenviar|`RESEND_API_KEY`|Cuando la clave está presente|
|nuevo|`NOVU_API_KEY`|Cuando la clave está presente|
|SMTP|`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`|Cuando los tres están presentes|

## Ejemplo de uso

```typescript
// In a webhook handler
import { WebhookEventType } from '@/lib/payment/types/payment-types';

async function handleWebhook(event: WebhookResult) {
  if (event.type === WebhookEventType.SUBSCRIPTION_CANCELLED) {
    await EmailNotificationService.sendAdminNotification({
      to: adminEmail,
      title: 'Subscription Cancelled',
      message: `Customer ${event.data.customerId} cancelled their subscription.`,
      notificationType: 'subscription',
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Tipos relacionados

- [Tipos de pago](./paid-types.md) -- `WebhookEventType` y enumeraciones de pago
- [Tipos de suscripción](./subscription-types.md) -- eventos del ciclo de vida de la suscripción
- [Tipos de configuración](./config-types.md) -- `EmailConfig` para la configuración del proveedor
