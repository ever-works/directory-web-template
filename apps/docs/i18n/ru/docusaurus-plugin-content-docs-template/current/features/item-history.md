---
id: item-history
title: История предметов и аудит
sidebar_label: История предметов и аудит
sidebar_position: 17
---

# История предметов и аудит

Шаблон Ever Works включает комплексную систему контрольного журнала, которая отслеживает все изменения, внесенные в элементы на протяжении их жизненного цикла. Каждое создание, обновление, изменение статуса, просмотр, удаление и восстановление протоколируется с подробной информацией об изменениях, идентификационными данными исполнителя и временными метками.

## Обзор архитектуры

| Компонент | Путь | Цель |
|---|---|---|
| `itemAuditService` | `lib/services/item-audit.service.ts` | Сервисный уровень для регистрации действий аудита |
| `item-audit.queries.ts` | `lib/db/queries/item-audit.queries.ts` | Запросы к базе данных для журнала аудита CRUD |
| `useItemHistory` | `hooks/use-item-history.ts` | Перехватчик React Query для получения журналов аудита |
| `ItemHistoryModal` | `components/admin/items/item-history-modal.tsx` | Модальный интерфейс для просмотра истории элементов |

## Действия аудита

Система отслеживает шесть типов действий:

| Действие | Константа | Описание |
|---|---|---|
| Создано | `ItemAuditAction.CREATED` | Объект был создан |
| Обновлено | `ItemAuditAction.UPDATED` | Поля элементов были изменены |
| Статус изменен | `ItemAuditAction.STATUS_CHANGED` | Статус товара изменен |
| Рассмотрено | `ItemAuditAction.REVIEWED` | Товар был рассмотрен (одобрен/отклонен) |
| Удалено | `ItemAuditAction.DELETED` | Элемент был удален (мягко или жестко) |
| Восстановлен | `ItemAuditAction.RESTORED` | Товар восстановлен после удаления |

## Отслеживаемые поля

Служба аудита отслеживает следующие поля на предмет обнаружения изменений:

| Поле | Тип |
|---|---|
| `name` | Название предмета |
| `description` | Описание товара |
| `source_url` | URL-адрес источника/продукта |
| `category` | Присвоение категории |
| `tags` | Массив тегов |
| `collections` | Сбор заданий |
| `featured` | Рекомендуемый статус |
| `icon_url` | URL значка/логотипа |
| `status` | Статус товара |

## Служба аудита предметов `itemAuditService` предоставляет методы ведения журнала высокого уровня, которые вызываются из маршрутов и сервисов API.

### Регистрация создания элемента

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### Регистрация обновлений элементов

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### Регистрация отзывов

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### Удаление и восстановление журналов

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### Неблокирующий дизайн

Все журналы аудита заключены в блоки try-catch и не выдают ошибок, которые могут заблокировать основную операцию:

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

## Обнаружение изменений

Функция `detectChanges` сравнивает два состояния элемента и возвращает подробную разницу:

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

Пример вывода:

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

Функция обрабатывает глубокое равенство массивов (отсортированное сравнение) и возвращает `null` , если никаких изменений не обнаружено.

## Уровень базы данных

### Схема журнала аудита

Каждая запись журнала аудита содержит:

| Поле | Тип | Описание |
|---|---|---|
| `id` | `string` | Уникальный идентификатор |
| `itemId` | `string` | Пуля/идентификатор элемента |
| `itemName` | `string` | Название предмета во время действия |
| `action` | `ItemAuditActionValues` | Тип действия |
| `previousStatus` | `string \| null` | Статус перед действием |
| `newStatus` | `string \| null` | Статус после действия |
| `changes` | `JSON \| null` | Подробности изменений на уровне поля |
| `performedBy` | `string \| null` | ID пользователя, выполнившего действие |
| `performedByName` | `string \| null` | Отображаемое имя пользователя |
| `notes` | `string \| null` | Дополнительные примечания (например, комментарии к обзору) |
| `metadata` | `JSON \| null` | Дополнительные контекстные данные |
| `createdAt` | `timestamp` | Когда произошло действие |

### Функции запроса

| Функция | Описание |
|---|---|
| `createItemAuditLog(data)` | Создать новую запись в журнале аудита |
| `getItemHistory(params)` | Получить постраничную историю с информацией об исполнителе |
| `getLatestItemAuditLog(itemId)` | Получить самую последнюю запись журнала |
| `getAuditLogsByAction(action, limit)` | Фильтрация журналов по типу действия |
| `getAuditLogsByPerformer(userId, limit)` | Фильтрация журналов по исполнителям |
| `getItemAuditStats(itemId)` | Получить разбивку по типам действий |

### Запрос истории с разбивкой на страницы

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

Запрос объединяется с таблицей `users` , чтобы включить адрес электронной почты исполнителя рядом с каждой записью журнала.

## Крючок `useItemHistory`

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

### Конфигурация крюка

| Вариант | По умолчанию | Описание |
|---|---|---|
| `itemId` | требуется | Идентификатор элемента/ссылка для получения истории |
| `page` | `1` | Номер страницы |
| `limit` | `20` | Элементов на странице |
| `actionFilter` | `undefined` | Массив типов действий для фильтрации |
| `enabled` | `true` | Активен ли запрос |
| `staleTime` | 30 секунд | Продолжительность актуальности кэша |

## Модальное окно истории предмета

Компонент `ItemHistoryModal` предоставляет полноценный пользовательский интерфейс для просмотра истории аудита элементов:

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### Модальные функции

| Особенность | Описание |
|---|---|
| Фильтрация действий | Раскрывающийся список для фильтрации по типу действия (Создано, Обновлено и т. д.) |
| Записи с цветовой кодировкой | Каждый тип действия имеет отдельный значок и цветовую схему |
| Расширяемые изменения | Нажмите, чтобы развернуть сведения об изменении на уровне поля |
| Относительные временные метки | «2 часа назад», «3 дня назад» с полной датой при наведении |
| Дисплей исполнителя | Показывает имя пользователя, адрес электронной почты или «Систему» ​​для автоматических действий |
| Обзор контекста | Показывает метки «Одобрено»/«Отклонено» и причины отклонения |
| Пагинация | Встроенная нумерация страниц для длинных историй |
| Поддержка клавиатуры | Клавиша Escape закрывает модальное окно |

### Цветовая схема действий

| Действие | Цвет | Значок |
|---|---|---|
| Создано | Зеленый | Плюс |
| Обновлено | Синий | Редактировать2 |
| Статус изменен | Желтый | ОбновитьCw |
| Рассмотрено | Фиолетовый | ПроверитьКруг |
| Удалено | Красный | Мусор2 |
| Восстановлен | Бирюзовый | ПовернутьCcw |

## Ключевые файлы

| Файл | Путь |
|---|---|
| Аудиторская служба | `lib/services/item-audit.service.ts` |
| Аудиторские запросы | `lib/db/queries/item-audit.queries.ts` |
| Крючок истории | `hooks/use-item-history.ts` |
| Модальное окно истории | `components/admin/items/item-history-modal.tsx` |
