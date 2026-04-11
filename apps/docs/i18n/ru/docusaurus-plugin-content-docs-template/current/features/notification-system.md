---
id: notification-system
title: Подробное описание системы уведомлений
sidebar_label: Система уведомлений
sidebar_position: 34
---

# Подробное описание системы уведомлений

Шаблон предоставляет систему уведомлений внутри приложения, поддерживаемую PostgreSQL. Уведомления создаются серверными службами и используются через REST API, в основном через панель администратора. Система поддерживает несколько типов уведомлений, пакетные операции и определения расширяемых типов.

## Обзор архитектуры

```
lib/db/schema.ts                    # notifications table definition
lib/services/notification.service.ts # NotificationService with convenience methods

app/api/admin/notifications/
  route.ts                           # GET (list) and POST (create) endpoints
  mark-all-read/route.ts             # POST mark all as read
  [id]/read/route.ts                 # PATCH mark single as read

components/admin/
  admin-notifications.tsx            # Notification dropdown UI
  admin-notification-stats.tsx       # Notification count badges
```

## Схема базы данных

Уведомления хранятся в таблице `notifications` :

```ts
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'),              // JSON string for extra payload
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIndex: index('notifications_user_idx').on(table.userId),
  typeIndex: index('notifications_type_idx').on(table.type),
  isReadIndex: index('notifications_is_read_idx').on(table.isRead),
  createdAtIndex: index('notifications_created_at_idx').on(table.createdAt),
}));
```

### Проектирование схемы

- ** `type` столбец** — строка произвольной формы, классифицирующая уведомление. Не применяется перечислением, что позволяет создавать новые типы без миграции.
- ** `data` столбец** – сохраняет дополнительный контекст в виде строки JSON. Анализируется при чтении для доступа к идентификаторам элементов, содержимому комментариев или информации, относящейся к событию.
- ** `isRead` / `readAt` ** — логический флаг для быстрого подсчета непрочитанных сообщений плюс метка времени для аудита.
- **Четыре индекса** — охватывают поиск пользователей, фильтрацию типов, фильтрацию непрочитанных сообщений и хронологический список.

## Типы уведомлений

Система использует идентификаторы типов на основе строк. К встроенным типам относятся:

| Тип | Триггер | Типичный получатель |
|------|---------|-------------------|
| `item_approved` | Администратор одобряет отправленный элемент | Отправитель товара |
| `item_rejected` | Администратор отклоняет отправленный элемент | Отправитель товара |
| `comment_received` | Кто-то комментирует запись пользователя | Владелец предмета |
| `comment_reported` | Комментарий помечен для проверки | Админ |
| `item_reported` | Элемент помечен для проверки | Админ |
| `user_registered` | Регистрируется новый пользователь | Админ |
| `payment_failed` | Попытка оплаты не удалась | Затронутый пользователь |
| `system_alert` | Предупреждение или уведомление на уровне системы | Админ |

### Добавление пользовательских типов

1. Выберите строку описательного типа (например, `survey_response_received` ).
2. Добавьте удобный метод в `NotificationService` , который создает правильную полезную нагрузку.
3. Вызовите метод из соответствующего маршрута или службы API.
4. При необходимости обновите раскрывающийся список уведомлений администратора, чтобы отобразить собственный значок.

Никакой миграции базы данных не требуется, поскольку `type` представляет собой текстовый столбец произвольной формы.

## Служба уведомлений

Расположенный по адресу `lib/services/notification.service.ts` , сервис предоставляет удобные методы создания уведомлений из серверного кода:

```ts
class NotificationService {
  static async create(data: CreateNotificationData);
  static async createItemSubmissionNotification(adminUserId, itemId, itemName, submittedBy);
  static async createCommentReportedNotification(adminUserId, commentId, content, reportedBy);
  static async createItemReportedNotification(adminUserId, itemId, itemName, reportedBy);
  static async createUserRegisteredNotification(adminUserId, userName, userEmail);
  static async createPaymentFailedNotification(userId, subscriptionId, errorMessage);
  static async createSystemAlertNotification(adminUserId, title, message);
}
```

Каждый удобный метод создает правильную полезную нагрузку `type` , `title` , `message` и `data` перед делегированием ее общему методу `create` .

### Использование

```ts
import { NotificationService } from '@/lib/services/notification.service';

// After approving an item
await NotificationService.createItemSubmissionNotification(
  adminUserId, item.id, item.name, item.submittedBy
);

// System-level alert
await NotificationService.createSystemAlertNotification(
  adminUserId, 'Database Warning', 'Connection pool reaching capacity'
);
```

## Конечные точки API

Все конечные точки уведомлений требуют аутентификации администратора.

### ПОЛУЧИТЕ /api/admin/notifications

Извлекает 50 последних уведомлений для проверенного администратора, отсортированные по принципу «самые новые». Возвращает уведомления и количество непрочитанных сообщений в одном ответе.

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

Для повышения эффективности счетчик непрочитанных сообщений использует отдельные `SELECT count(*)` и `isRead = false` .

### POST /api/admin/notifications

Создает новое уведомление для конкретного пользователя.

| Поле | Требуется | Описание |
|-------|----------|-------------|
| `type` | Да | Идентификатор категории уведомления |
| `title` | Да | Текст короткого заголовка |
| `message` | Да | Основной текст |
| `userId` | Да | Идентификатор пользователя получателя |
| `data` | Нет | Дополнительная полезная нагрузка (автоматическая строка) |

### POST /api/admin/notifications/mark-all-read

Помечает все непрочитанные уведомления текущего администратора как прочитанные. Устанавливает `isRead = true` и `readAt` в текущую временную метку в одном пакетном обновлении.

### ПАТЧ /api/admin/notifications/[id]/read

Помечает одно уведомление как прочитанное по идентификатору.

## Интеграция панели администратора

В заголовке администратора отображается значок колокольчика со значком непрочитанного. Выпадающий компонент:

1. Получает уведомления от конечной точки GET.
2. Отображает каждое уведомление с помощью значков конкретного типа и цветовой кодировки.
3. Помечает отдельные уведомления как прочитанные при нажатии.
4. Обеспечивает массовое действие «Отметить все как прочитанное».
5. Опросы по таймеру или обновление панели администратора.

## Рекомендации в режиме реального времени

Текущая реализация использует обновление на основе опроса. Для обновлений в реальном времени архитектура поддерживает точки расширения:

- **События, отправленные сервером** – добавьте конечную точку SSE, которая передает новые уведомления.
- **WebSocket** – интеграция с поставщиком WebSocket для двунаправленной связи.
- **Интервал опроса** — настраивается с помощью таймера обновления компонента уведомлений администратора.

## Интеграция электронной почты

Система уведомлений ориентирована на уведомления внутри приложения. Исходящие уведомления по электронной почте обрабатываются отдельно через службу электронной почты (Resend/Novu), но имеют одни и те же триггерные точки. Когда уведомление создается с помощью `NotificationService` , вызывающий код может дополнительно инициировать отправку электронного письма в рамках той же операции.

## Структура полезной нагрузки данных

Столбец `data` хранит строки JSON с контекстом, специфичным для события:

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

Эта гибкая схема позволяет средствам визуализации уведомлений создавать глубокие ссылки на соответствующие страницы и отображать контекстную информацию.

## Доступность

- На значке колокольчика используется цифра `aria-label` , чтобы сообщить программам чтения с экрана о количестве непрочитанных сообщений.
- Элементы уведомлений в раскрывающемся списке можно фокусировать и управлять ими с помощью клавиатуры.
- Значки для конкретных типов являются декоративными ( `aria-hidden="true"` ) с текстовыми метками, обеспечивающими контекст.
- Кнопка «Отметить все как прочитанное» обеспечивает четкую обратную связь с помощью всплывающего уведомления.
- Временные метки используют относительное форматирование («2 часа назад») с полной датой в атрибутах `title` .

## Сопутствующая документация

- [Компоненты администратора](/docs/template/comComponents/admin-comComponents) – Пользовательский интерфейс уведомлений администратора.
- [Компоненты информационной панели](/docs/template/comComponents/dashboard-comComponents) - Статистика уведомлений
– [Отчеты и модерация](/docs/template/features/reports-moderation) – уведомления, инициируемые отчетом.
- [Голосование и комментарии](/docs/template/features/voting-comments) – уведомления, активируемые комментариями.
