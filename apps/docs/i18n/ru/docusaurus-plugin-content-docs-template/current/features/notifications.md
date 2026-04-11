---
id: notifications
title: Система уведомлений
sidebar_label: Уведомления
sidebar_position: 3
---

# Система уведомлений

Шаблон Ever Works предоставляет как уведомления в приложении (хранящиеся в базе данных), так и уведомления по электронной почте (через повторную отправку или Novu). Уведомления инициируются системными событиями, такими как отправка элементов, отчеты о содержании и сбои платежей.

## Уведомления в приложении

### Служба уведомлений

Служба, расположенная по адресу `lib/services/notification.service.ts` , управляет уведомлениями, поддерживаемыми базой данных:

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

### Типы уведомлений

```typescript
type NotificationType =
  | "item_submission"      // New item requires admin review
  | "comment_reported"     // Comment flagged by user
  | "item_reported"        // Item flagged by user
  | "user_registered"      // New user account created
  | "payment_failed"       // Subscription payment failed
  | "system_alert";        // Generic system notification
```

### Структура данных уведомления

```typescript
interface CreateNotificationData {
  userId: string;                    // Recipient user ID
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;    // Arbitrary metadata (actionUrl, etc.)
}
```

### Статистика уведомлений

```typescript
interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}
```

### Администраторский крючок

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

## Уведомления по электронной почте

### Служба уведомлений по электронной почте

Эта служба, расположенная по адресу `lib/services/email-notification.service.ts` , обеспечивает транзакционную доставку электронной почты:

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

### Конфигурация поставщика электронной почты

Шаблон поддерживает двух провайдеров электронной почты:

**Отправить повторно** (по умолчанию):
```bash
RESEND_API_KEY=re_xxx
```

**Нову**:
```bash
NOVU_API_KEY=xxx
NOVU_TEMPLATE_ID=xxx        # Optional: custom template ID
NOVU_BACKEND_URL=xxx         # Optional: self-hosted Novu URL
```

Выбор провайдера настраивается в конфиге сайта:
```json
{
  "mail": {
    "provider": "resend",
    "default_from": "noreply@yourdomain.com"
  }
}
```

### Платежная электронная почта

Платежная подсистема имеет собственный почтовый сервис ( `lib/payment/services/payment-email.service.ts` ) с помощниками для форматирования платежных данных:

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

## Настройки уведомлений

Пользователи могут управлять своими настройками уведомлений через интерфейс настроек. Настройки определяют, какие типы уведомлений запускают доставку электронной почты, а уведомления в приложении создаются всегда.

## Поток событий

```mermaid
flowchart TD
    A["User Action (e.g., submit item)"] --> B["API Route Handler"]
    B --> C["NotificationService.create()"]
    B --> D["EmailNotificationService.send()"]
    C --> E["Database (in-app)"]
    D --> F["Resend/Novu (email)"]
```

## Сопутствующая документация

- [Отчеты и модерация контента](./reports-moderation.md) - Уведомления, инициируемые отчетами.
- [Платежные вебхуки](../paying/webhooks.md) – уведомления по электронной почте, связанные с платежами.
