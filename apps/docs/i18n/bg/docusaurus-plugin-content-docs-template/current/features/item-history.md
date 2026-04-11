---
id: item-history
title: История на артикулите и одит
sidebar_label: История на артикулите и одит
sidebar_position: 17
---

# История и одит на артикул

Шаблонът Ever Works включва цялостна система за одитна пътека, която проследява всички промени, направени на елементи през целия им жизнен цикъл. Всяко създаване, актуализация, промяна на статуса, преглед, изтриване и възстановяване се регистрира с подробна информация за промяната, самоличност на изпълнителя и времеви клейма.

## Преглед на архитектурата

| Компонент | Път | Цел |
|---|---|---|
| `itemAuditService` | `lib/services/item-audit.service.ts` | Сервизен слой за регистриране на одитни действия |
| `item-audit.queries.ts` | `lib/db/queries/item-audit.queries.ts` | Заявки към база данни за журнал за проверка CRUD |
| `useItemHistory` | `hooks/use-item-history.ts` | React Query hook за извличане на журнали за проверка |
| `ItemHistoryModal` | `components/admin/items/item-history-modal.tsx` | Модален потребителски интерфейс за преглед на хронологията на елементи |

## Одитни действия

Системата проследява шест вида действия:

| Действие | Постоянно | Описание |
|---|---|---|
| Създаден | `ItemAuditAction.CREATED` | Артикулът е създаден |
| Актуализиран | `ItemAuditAction.UPDATED` | Полетата на артикулите бяха променени |
| Състоянието е променено | `ItemAuditAction.STATUS_CHANGED` | Състоянието на елемента беше променено |
| Прегледано | `ItemAuditAction.REVIEWED` | Артикулът беше прегледан (одобрен/отхвърлен) |
| Изтрито | `ItemAuditAction.DELETED` | Елементът беше изтрит (мек или твърд) |
| Възстановено | `ItemAuditAction.RESTORED` | Елементът беше възстановен от изтриване |

## Проследени полета

Услугата за одит наблюдава следните полета за откриване на промени:

| Поле | Тип |
|---|---|
| `name` | Име на артикул |
| `description` | Описание на артикула |
| `source_url` | URL адрес на източник/продукт |
| `category` | Присвояване на категория |
| `tags` | Масив от етикети |
| `collections` | Колекция задачи |
| `featured` | Представено състояние |
| `icon_url` | URL адрес на икона/лого |
| `status` | Състояние на артикул |

## Услуга за одит на артикул `itemAuditService` предоставя методи за регистриране на високо ниво, които се извикват от API маршрути и услуги.

### Създаване на елемент за регистриране

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### Регистриране на актуализации на елементи

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### Отзиви за регистриране

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### Изтриване и възстановяване на регистриране

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### Неблокиращ дизайн

Цялото регистриране на одита е обвито в блокове try-catch и няма да генерира грешки, които биха могли да блокират основната операция:

```tsx
async function logAction(params: LogActionParams): Promise<void> {
  try {
    await createItemAuditLog(createParams);
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    console.error('[ItemAuditService] Failed to log action:', error);
  }
}
```

## Откриване на промяна

Функцията `detectChanges` сравнява две състояния на елемент и връща подробна разлика:

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

Примерен резултат:

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

Функцията обработва дълбоко равенство за масиви (сортирано сравнение) и връща `null` , ако не бъдат открити промени.

## Слой база данни

### Схема на регистрационен файл за одит

Всеки запис в журнала за проверка съдържа:

| Поле | Тип | Описание |
|---|---|---|
| `id` | `string` | Уникален идентификатор |
| `itemId` | `string` | Охлюв/ИД на артикул |
| `itemName` | `string` | Име на елемент по време на действие |
| `action` | `ItemAuditActionValues` | Тип действие |
| `previousStatus` | `string \| null` | Състояние преди действие |
| `newStatus` | `string \| null` | Състояние след действие |
| `changes` | `JSON \| null` | Подробности за промяната на ниво поле |
| `performedBy` | `string \| null` | ID на потребителя, който е извършил действието |
| `performedByName` | `string \| null` | Екранно име на потребителя |
| `notes` | `string \| null` | Допълнителни бележки (напр. коментари за преглед) |
| `metadata` | `JSON \| null` | Допълнителни контекстни данни |
| `createdAt` | `timestamp` | Кога се е случило действието |

### Функции за заявки

| Функция | Описание |
|---|---|
| `createItemAuditLog(data)` | Създайте нов запис в журнала за проверка |
| `getItemHistory(params)` | Вземете пагинирана история с информация за изпълнител |
| `getLatestItemAuditLog(itemId)` | Вземете най-новия запис в журнала |
| `getAuditLogsByAction(action, limit)` | Филтрирайте регистрационните файлове по тип действие |
| `getAuditLogsByPerformer(userId, limit)` | Филтриране на регистрационни файлове по изпълнител |
| `getItemAuditStats(itemId)` | Вземете разбивка на броя по вид действие |

### Пагинирана хронология

```tsx
import { getItemHistory } from '@/lib/db/queries/item-audit.queries';

const result = await getItemHistory({
  itemId: 'my-item-slug',
  page: 1,
  limit: 20,
  actionFilter: ['updated', 'status_changed']
});

// Returns: { logs, total, page, limit, totalPages }
```

Заявката се присъединява към таблицата `users` , за да включва имейл на изпълнител заедно с всеки запис в журнала.

## Куката `useItemHistory`

```tsx
import { useItemHistory } from '@/hooks/use-item-history';

function ItemHistoryPanel({ itemId }) {
  const { data, isLoading, isError } = useItemHistory({
    itemId,
    page: 1,
    limit: 20,
    actionFilter: ['updated', 'reviewed'],
    enabled: true
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div>
      <p>Total entries: {data.total}</p>
      {data.logs.map(entry => (
        <div key={entry.id}>
          <span>{entry.action}</span>
          <span>{entry.performedByName}</span>
          <span>{entry.createdAt}</span>
        </div>
      ))}
    </div>
  );
}
```

### Конфигурация на куката

| Опция | По подразбиране | Описание |
|---|---|---|
| `itemId` | задължително | Идентификатор на артикул/препарат за извличане на история за |
| `page` | `1` | Номер на страница |
| `limit` | `20` | Елементи на страница |
| `actionFilter` | `undefined` | Масив от типове действия за филтриране по |
| `enabled` | `true` | Дали заявката е активна |
| `staleTime` | 30 секунди | Продължителност на свежестта на кеша |

## Модал на историята на артикулите

Компонентът `ItemHistoryModal` предоставя пълен потребителски интерфейс за преглед на хронологията на одита на елементи:

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### Модални характеристики

| Характеристика | Описание |
|---|---|
| Филтриране на действия | Падащо меню за филтриране по тип действие (Създадено, Актуализирано и т.н.) |
| Цветно кодирани записи | Всеки тип действие има отделна икона и цветова схема |
| Разширяеми промени | Щракнете, за да разгънете подробности за промените на ниво поле |
| Относителни времеви марки | „Преди 2 часа“, „Преди 3 дни“ с пълна дата при задържане |
| Дисплей на изпълнителя | Показва потребителско име, имейл или „Система“ за автоматизирани действия |
| Преглед на контекст | Показва етикети „Одобрено“/„Отхвърлено“ и причини за отхвърляне |
| Пагинация | Вградена пагинация за дълги истории |
| Поддръжка на клавиатура | Клавишът Escape затваря модалния |

### Цветова схема на действие

| Действие | Цвят | Икона |
|---|---|---|
| Създаден | Зелен | Плюс |
| Актуализиран | Син | Редактиране2 |
| Състоянието е променено | Жълто | RefreshCw |
| Прегледано | Лилаво | CheckCircle |
| Изтрито | Червено | Кошче2 |
| Възстановено | Синьозелен | Завъртане направо |

## Ключови файлове

| Файл | Път |
|---|---|
| Одиторска служба | `lib/services/item-audit.service.ts` |
| Запитвания за одит | `lib/db/queries/item-audit.queries.ts` |
| Историческа кука | `hooks/use-item-history.ts` |
| История Модал | `components/admin/items/item-history-modal.tsx` |
