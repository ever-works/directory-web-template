---
id: notifications
title: System powiadomień
sidebar_label: Powiadomienia
sidebar_position: 3
---

# System powiadomień

Szablon Ever Works zapewnia zarówno powiadomienia w aplikacji (przechowywane w bazie danych), jak i powiadomienia e-mail (za pośrednictwem funkcji Resend lub Novu). Powiadomienia są wyzwalane przez zdarzenia systemowe, takie jak przesłanie przedmiotu, raporty dotyczące zawartości i niepowodzenia płatności.

## Powiadomienia w aplikacji

###Usługa powiadomień

Usługa zlokalizowana pod adresem `lib/services/notification.service.ts` zarządza powiadomieniami opartymi na bazie danych:

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

### Typy powiadomień

```typescript
type NotificationType =
  | "item_submission"      // New item requires admin review
  | "comment_reported"     // Comment flagged by user
  | "item_reported"        // Item flagged by user
  | "user_registered"      // New user account created
  | "payment_failed"       // Subscription payment failed
  | "system_alert";        // Generic system notification
```

### Struktura danych powiadomień

```typescript
interface CreateNotificationData {
  userId: string;                    // Recipient user ID
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;    // Arbitrary metadata (actionUrl, etc.)
}
```

### Statystyki powiadomień

```typescript
interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}
```

### Hak administratora

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

## Powiadomienia e-mailowe

### Usługa powiadamiania e-mailowego

Usługa ta, zlokalizowana pod adresem `lib/services/email-notification.service.ts` , obsługuje dostarczanie e-maili transakcyjnych:

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

### Konfiguracja dostawcy poczty e-mail

Szablon obsługuje dwóch dostawców poczty e-mail:

**Wyślij ponownie** (domyślnie):
```bash
RESEND_API_KEY=re_xxx
```

**Nowy**:
```bash
NOVU_API_KEY=xxx
NOVU_TEMPLATE_ID=xxx        # Optional: custom template ID
NOVU_BACKEND_URL=xxx         # Optional: self-hosted Novu URL
```

Wybór dostawcy jest konfigurowany w konfiguracji witryny:
```json
{
  "mail": {
    "provider": "resend",
    "default_from": "noreply@yourdomain.com"
  }
}
```

### Usługa płatności e-mailowych

Podsystem płatności posiada własną usługę e-mail ( `lib/payment/services/payment-email.service.ts` ) z pomocnikami do formatowania danych płatności:

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

## Preferencje powiadomień

Użytkownicy mogą zarządzać swoimi preferencjami powiadomień za pośrednictwem interfejsu ustawień. Preferencje kontrolują, które typy powiadomień uruchamiają dostarczanie wiadomości e-mail, podczas gdy powiadomienia w aplikacji są zawsze tworzone.

## Przepływ zdarzeń

```mermaid
flowchart TD
    A["User Action (e.g., submit item)"] --> B["API Route Handler"]
    B --> C["NotificationService.create()"]
    B --> D["EmailNotificationService.send()"]
    C --> E["Database (in-app)"]
    D --> F["Resend/Novu (email)"]
```

## Powiązana dokumentacja

– [Raporty i moderowanie treści](./reports-moderation.md) – Powiadomienia wywoływane przez raporty
- [Webhooks płatności](../payment/webhooks.md) -- Powiadomienia e-mail dotyczące płatności
