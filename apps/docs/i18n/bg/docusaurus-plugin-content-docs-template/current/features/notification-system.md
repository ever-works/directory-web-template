---
id: notification-system
title: Дълбоко гмуркане на системата за уведомяване
sidebar_label: Система за уведомяване
sidebar_position: 34
---

# Дълбоко потапяне в системата за уведомяване

Шаблонът предоставя система за уведомяване в приложението, поддържана от PostgreSQL. Известията се създават от услуги от страна на сървъра и се използват чрез REST API, предимно от таблото за управление на администратора. Системата поддържа множество типове уведомления, пакетни операции и дефиниции на разширяем тип.

## Преглед на архитектурата

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

## Схема на база данни

Известията се съхраняват в таблица `notifications` :

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

### Дизайн на схема

- ** `type` колона** -- низ в свободна форма, категоризиращ известието. Не се прилага от enum, позволява нови типове без миграции.
- ** `data` колона** -- съхранява допълнителен контекст като JSON низ. Анализиран при четене за достъп до идентификатори на елементи, съдържание на коментари или специфична за събитие информация.
- ** `isRead` / `readAt` ** -- булев флаг за бързо преброяване на непрочетените плюс клеймо за време за проверка.
- **Четири индекса** -- покриват потребителско търсене, филтриране по тип, филтриране на непрочетени и хронологичен списък.

## Видове известия

Системата използва идентификатори на тип, базирани на низове. Вградените типове включват:

| Тип | Тригер | Типичен получател |
|------|---------|-------------------|
| `item_approved` | Администраторът одобрява изпратен елемент | Подател на артикул |
| `item_rejected` | Администраторът отхвърля изпратен елемент | Подател на артикул |
| `comment_received` | Някой коментира елемент на потребител | Собственик на артикул |
| `comment_reported` | Коментар е маркиран за преглед | Администратор |
| `item_reported` | Елемент е маркиран за преглед | Администратор |
| `user_registered` | Нов потребител се регистрира | Администратор |
| `payment_failed` | Неуспешен опит за плащане | Засегнат потребител |
| `system_alert` | Предупреждение или забележка на системно ниво | Администратор |

### Добавяне на потребителски типове

1. Изберете низ от описателен тип (напр. `survey_response_received` ).
2. Добавете удобен метод към `NotificationService` , който изгражда правилния полезен товар.
3. Извикайте метода от съответния API маршрут или услуга.
4. Актуализирайте по желание падащото меню за известия на администратора, за да изобразите персонализирана икона.

Не е необходима миграция на база данни, тъй като `type` е текстова колона със свободна форма.

## NotificationService

Разположена на `lib/services/notification.service.ts` , услугата предоставя удобни методи за създаване на известия от код от страна на сървъра:

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

Всеки удобен метод конструира правилния полезен товар `type` , `title` , `message` и `data` , преди да делегира към общия метод `create` .

### Използване

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

## API крайни точки

Всички крайни точки за уведомяване изискват администраторско удостоверяване.

### ВЗЕМЕТЕ /api/admin/notifications

Извлича 50-те най-нови известия за удостоверения администратор, сортирани първо най-новите. Връща известия и брой непрочетени в един отговор.

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

Броят на непрочетените използва отделен `SELECT count(*)` с `isRead = false` за ефективност.

### ПУБЛИКУВАЙТЕ /api/admin/notifications

Създава ново известие за конкретен потребител.

| Поле | Задължително | Описание |
|-------|----------|-------------|
| `type` | Да | Идентификатор на категория уведомяване |
| `title` | Да | Кратък заглавен текст |
| `message` | Да | Основен текст |
| `userId` | Да | Потребителски идентификатор на получателя |
| `data` | Не | Допълнителен полезен товар (автоматично стрингифициран) |

### ПУБЛИКУВАНЕ /api/admin/notifications/mark-all-read

Маркира всички непрочетени известия за текущия администратор като прочетени. Задава `isRead = true` и `readAt` на текущото времево клеймо в една пакетна актуализация.

### ПАТЧ /api/admin/notifications/[id]/read

Маркира едно известие като прочетено по ID.

## Интеграция на администраторското табло

Заглавката на администратора показва икона на звънец със значка за броя на непрочетените. Компонентът на падащото меню:

1. Извлича известия от крайната точка GET.
2. Изобразява всяко известие със специфични за типа икони и цветово кодиране.
3. Маркира отделни известия като прочетени при щракване.
4. Предоставя групово действие „Маркиране на всички като прочетени“.
5. Анкети на таймер или опресняване на администраторска навигация.

## Съображения в реално време

Текущото изпълнение използва опресняване, базирано на анкети. За актуализации в реално време архитектурата поддържа точки за разширение:

- **Изпратени от сървъра събития** -- добавете крайна точка на SSE, която предава нови известия.
- **WebSocket** -- интегриране с доставчик на WebSocket за двупосочна комуникация.
- **Интервал на анкетиране** -- регулируем чрез таймера за опресняване на компонента за уведомяване на администратора.

## Интегриране на имейл

Системата за уведомяване се фокусира върху известията в приложението. Изходящите имейл известия се обработват отделно чрез имейл услугата (Resend/Novu), но споделят едни и същи тригерни точки. Когато се създаде известие чрез `NotificationService` , кодът за повикване може по избор да задейства имейл в същата операция.

## Структура на полезния товар на данните

Колоната `data` съхранява JSON низове със специфичен за събитието контекст:

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

Тази гъвкава схема позволява на рендърите за известия да създават дълбоки връзки към съответните страници и да показват контекстна информация.

## Достъпност

- Значката на иконата на камбанка използва `aria-label` , за да съобщи броя на непрочетените на екранните четци.
- Елементите за уведомяване в падащото меню могат да се фокусират и навигират с клавиатура.
- Иконите, специфични за типа, са декоративни ( `aria-hidden="true"` ) с текстови етикети, осигуряващи контекст.
- Бутонът „Маркиране на всички като прочетени“ предоставя ясна обратна връзка чрез тост известие.
- Времевите клейма използват относително форматиране („преди 2 часа“) с пълна дата в `title` атрибута.

## Свързана документация

- [Административни компоненти](/docs/template/components/admin-components) - Потребителски интерфейс за известяване на администратор
- [Компоненти на таблото за управление](/docs/template/components/dashboard-components) -- Статистически данни за известия
– [Отчети и модериране](/docs/template/features/reports-moderation) – Известия, задействани от отчети
- [Гласуване и коментари](/docs/template/features/voting-comments) -- Известия, задействани от коментари
