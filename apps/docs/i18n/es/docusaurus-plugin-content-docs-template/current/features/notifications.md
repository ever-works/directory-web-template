---
id: notifications
title: Sistema de notificación
sidebar_label: Notificaciones
sidebar_position: 3
---

# Sistema de notificación

La plantilla Ever Works proporciona notificaciones dentro de la aplicación (almacenadas en la base de datos) y notificaciones por correo electrónico (a través de Resend o Novu). Las notificaciones se activan mediante eventos del sistema, como envíos de artículos, informes de contenido y errores de pago.

## Notificaciones dentro de la aplicación

### Servicio de notificación

Ubicado en `lib/services/notification.service.ts` , el servicio gestiona notificaciones respaldadas por bases de datos:

```typescript
class NotificationService {
  // Create a generic notification
  static async create(data: CreateNotificationData);

  // Convenience methods for specific events
  static async createItemSubmissionNotification(adminUserId, itemId, itemName, submittedBy);
  static async createCommentReportedNotification(adminUserId, commentId, content, reportedBy);
  static async createItemReportedNotification(adminUserId, itemId, itemName, reportedBy);
  static async createUserRegisteredNotification(adminUserId, userName, userEmail);
  static async createPaymentFailedNotification(userId, subscriptionId, errorMessage);
  static async createSystemAlertNotification(adminUserId, title, message);
}
```

### Tipos de notificación

```typescript
type NotificationType =
  | "item_submission"      // New item requires admin review
  | "comment_reported"     // Comment flagged by user
  | "item_reported"        // Item flagged by user
  | "user_registered"      // New user account created
  | "payment_failed"       // Subscription payment failed
  | "system_alert";        // Generic system notification
```

### Estructura de datos de notificación

```typescript
interface CreateNotificationData {
  userId: string;                    // Recipient user ID
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;    // Arbitrary metadata (actionUrl, etc.)
}
```

### Estadísticas de notificaciones

```typescript
interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}
```

### Gancho de administrador

```typescript
import { useAdminNotifications } from '@/hooks/use-admin-notifications';

const {
  notifications,     // Notification[]
  stats,             // NotificationStats
  isLoading,
  markAsRead,        // (id: string) => Promise<boolean>
  markAllAsRead,     // () => Promise<boolean>
  deleteNotification,// (id: string) => Promise<boolean>
  refetch,
} = useAdminNotifications();
```

## Notificaciones por correo electrónico

### Servicio de notificación por correo electrónico

Ubicado en `lib/services/email-notification.service.ts` , este servicio maneja la entrega de correo electrónico transaccional:

```typescript
class EmailNotificationService {
  // Send notification emails for various events
  static async sendItemSubmissionEmail(adminEmail, itemData);
  static async sendPaymentSuccessEmail(userEmail, paymentData);
  static async sendPaymentFailedEmail(userEmail, paymentData);
  static async sendSubscriptionCancelledEmail(userEmail, subscriptionData);
  static async sendTrialEndingEmail(userEmail, trialData);
  static async sendWelcomeEmail(userEmail, userData);
}
```

### Configuración del proveedor de correo electrónico

La plantilla admite dos proveedores de correo electrónico:

**Reenviar** (predeterminado):
```bash
RESEND_API_KEY=re_xxx
```

**Nuevo**:
```bash
NOVU_API_KEY=xxx
NOVU_TEMPLATE_ID=xxx        # Optional: custom template ID
NOVU_BACKEND_URL=xxx         # Optional: self-hosted Novu URL
```

La selección de proveedor se configura en la configuración del sitio:
```json
{
  "mail": {
    "provider": "resend",
    "default_from": "noreply@yourdomain.com"
  }
}
```

### Servicio de correo electrónico de pago

El subsistema de pago tiene su propio servicio de correo electrónico ( `lib/payment/services/payment-email.service.ts` ) con ayudas para formatear los datos de pago:

```typescript
import {
  paymentEmailService,
  extractCustomerInfo,    // Extract customer data from webhook event
  formatAmount,           // Format currency amounts
  formatPaymentMethod,    // Format card details
  formatBillingDate,      // Format billing period dates
  getPlanName,            // Map plan ID to display name
  getBillingPeriod,       // Format billing interval
} from '@/lib/payment/services/payment-email.service';
```

## Preferencias de notificación

Los usuarios pueden administrar sus preferencias de notificación a través de la interfaz de configuración. Las preferencias controlan qué tipos de notificaciones activan la entrega de correo electrónico, mientras que siempre se crean notificaciones dentro de la aplicación.

## Flujo de eventos

```mermaid
flowchart TD
    A["User Action (e.g., submit item)"] --> B["API Route Handler"]
    B --> C["NotificationService.create()"]
    B --> D["EmailNotificationService.send()"]
    C --> E["Database (in-app)"]
    D --> F["Resend/Novu (email)"]
```

## Documentación relacionada

- [Informes y moderación de contenido] (./reports-moderation.md) -- Notificaciones activadas por informes
- [Webhooks de pago](../payment/webhooks.md) -- Notificaciones por correo electrónico relacionadas con pagos
