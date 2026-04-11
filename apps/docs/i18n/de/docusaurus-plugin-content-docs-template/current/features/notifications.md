---
id: notifications
title: Benachrichtigungssystem
sidebar_label: Benachrichtigungen
sidebar_position: 3
---

# Benachrichtigungssystem

Die Ever Works-Vorlage bietet sowohl In-App-Benachrichtigungen (in der Datenbank gespeichert) als auch E-Mail-Benachrichtigungen (über Resend oder Novu). Benachrichtigungen werden durch Systemereignisse wie Artikelübermittlungen, Inhaltsberichte und Zahlungsfehler ausgelöst.

## In-App-Benachrichtigungen

### NotificationService

Der Dienst befindet sich unter `lib/services/notification.service.ts` und verwaltet datenbankgestützte Benachrichtigungen:

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

### Benachrichtigungstypen

```typescript
type NotificationType =
  | "item_submission"      // New item requires admin review
  | "comment_reported"     // Comment flagged by user
  | "item_reported"        // Item flagged by user
  | "user_registered"      // New user account created
  | "payment_failed"       // Subscription payment failed
  | "system_alert";        // Generic system notification
```

### Benachrichtigungsdatenstruktur

```typescript
interface CreateNotificationData {
  userId: string;                    // Recipient user ID
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;    // Arbitrary metadata (actionUrl, etc.)
}
```

### Benachrichtigungsstatistiken

```typescript
interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}
```

### Admin-Hook

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

## E-Mail-Benachrichtigungen

### EmailNotificationService

Dieser Dienst befindet sich bei `lib/services/email-notification.service.ts` und übernimmt die Zustellung von Transaktions-E-Mails:

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

### Konfiguration des E-Mail-Anbieters

Die Vorlage unterstützt zwei E-Mail-Anbieter:

**Erneut senden** (Standard):
```bash
RESEND_API_KEY=re_xxx
```

**Neu**:
```bash
NOVU_API_KEY=xxx
NOVU_TEMPLATE_ID=xxx        # Optional: custom template ID
NOVU_BACKEND_URL=xxx         # Optional: self-hosted Novu URL
```

Die Anbieterauswahl wird in der Site-Konfiguration konfiguriert:
```json
{
  "mail": {
    "provider": "resend",
    "default_from": "noreply@yourdomain.com"
  }
}
```

### Zahlungs-E-Mail-Service

Das Zahlungssubsystem verfügt über einen eigenen E-Mail-Dienst ( `lib/payment/services/payment-email.service.ts` ) mit Helfern zur Formatierung von Zahlungsdaten:

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

## Benachrichtigungseinstellungen

Benutzer können ihre Benachrichtigungseinstellungen über die Einstellungsoberfläche verwalten. Die Einstellungen steuern, welche Benachrichtigungstypen die E-Mail-Zustellung auslösen, während In-App-Benachrichtigungen immer erstellt werden.

## Ereignisfluss

```mermaid
flowchart TD
    A["User Action (e.g., submit item)"] --> B["API Route Handler"]
    B --> C["NotificationService.create()"]
    B --> D["EmailNotificationService.send()"]
    C --> E["Database (in-app)"]
    D --> F["Resend/Novu (email)"]
```

## Verwandte Dokumentation

- [Berichte und Inhaltsmoderation](./reports-moderation.md) – Durch Berichte ausgelöste Benachrichtigungen
– [Payment Webhooks](../ payment/webhooks.md) – Zahlungsbezogene E-Mail-Benachrichtigungen
