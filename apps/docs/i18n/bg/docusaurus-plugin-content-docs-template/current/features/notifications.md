---
id: notifications
title: Система за уведомяване
sidebar_label: Известия
sidebar_position: 3
---

# Система за уведомяване

Шаблонът Ever Works предоставя както известия в приложението (съхранени в базата данни), така и известия по имейл (чрез Resend или Novu). Известията се задействат от системни събития като изпращане на артикули, доклади за съдържание и неуспешни плащания.

## Известия в приложението

### NotificationService

Разположена на `lib/services/notification.service.ts` , услугата управлява известия, поддържани от база данни:

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

### Видове известия

```typescript
type NotificationType =
  | "item_submission"      // New item requires admin review
  | "comment_reported"     // Comment flagged by user
  | "item_reported"        // Item flagged by user
  | "user_registered"      // New user account created
  | "payment_failed"       // Subscription payment failed
  | "system_alert";        // Generic system notification
```

### Структура на данните за известяване

```typescript
interface CreateNotificationData {
  userId: string;                    // Recipient user ID
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;    // Arbitrary metadata (actionUrl, etc.)
}
```

### Статистика на известията

```typescript
interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}
```

### Административна кука

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

## Известия по имейл

### EmailNotificationService

Разположена на `lib/services/email-notification.service.ts` , тази услуга обработва транзакционна доставка на имейл:

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

### Конфигурация на имейл доставчик

Шаблонът поддържа два имейл доставчика:

**Повторно изпращане** (по подразбиране):
```bash
RESEND_API_KEY=re_xxx
```

**Ново**:
```bash
NOVU_API_KEY=xxx
NOVU_TEMPLATE_ID=xxx        # Optional: custom template ID
NOVU_BACKEND_URL=xxx         # Optional: self-hosted Novu URL
```

Изборът на доставчик се конфигурира в конфигурацията на сайта:
```json
{
  "mail": {
    "provider": "resend",
    "default_from": "noreply@yourdomain.com"
  }
}
```

### Платежна имейл услуга

Платежната подсистема разполага със собствена имейл услуга ( `lib/payment/services/payment-email.service.ts` ) с помощници за форматиране на данни за плащане:

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

## Предпочитания за известяване

Потребителите могат да управляват своите предпочитания за уведомяване чрез интерфейса за настройки. Предпочитанията контролират кои типове известия задействат доставка на имейл, докато известията в приложението винаги се създават.

## Поток на събития

```mermaid
flowchart TD
    A["User Action (e.g., submit item)"] --> B["API Route Handler"]
    B --> C["NotificationService.create()"]
    B --> D["EmailNotificationService.send()"]
    C --> E["Database (in-app)"]
    D --> F["Resend/Novu (email)"]
```

## Свързана документация

- [Отчети и модериране на съдържание](./reports-moderation.md) - Известия, задействани от доклади
– [Payment Webhooks](../payment/webhooks.md) – Известия по имейл, свързани с плащане
