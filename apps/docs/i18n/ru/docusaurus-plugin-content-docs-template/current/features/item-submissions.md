---
id: item-submissions
title: Предоставление предметов
sidebar_label: Предоставление предметов
sidebar_position: 31
---

# отправленных предметов

Система отправки элементов предоставляет пользователям полный рабочий процесс для отправки, управления и отслеживания списков каталогов. Он включает в себя отслеживание статуса (ожидание, одобрение, отклонение), фильтрацию, карточки статистики, модальные окна детализации, модальные окна редактирования и удаление с подтверждением.

## Обзор архитектуры

| Модуль | Путь | Цель |
|--------|------|---------|
| Список отправленных | `components/submissions/submission-list.tsx` | Компонент основного списка с нумерацией страниц |
| Элемент отправки | `components/submissions/submission-item.tsx` | Индивидуальная карта подачи |
| Фильтры отправки | `components/submissions/submission-filters.tsx` | Вкладки статуса и поиск |
| ПредставлениеСтатистикаКарточки | `components/submissions/submission-stats-cards.tsx` | Обзор карточек статистики |
| EditSubmissionModal | `components/submissions/edit-submission-modal.tsx` | Модальное встроенное редактирование |
| ПредставлениеПодробноМодальный | `components/submissions/submission-detail-modal.tsx` | Подробный просмотр только для чтения |
| Удалитьдиалог отправки | `components/submissions/delete-submission-dialog.tsx` | Подтверждение удаления |
| TrashItem | `components/submissions/trash-item.tsx` | Отображение выброшенных предметов |
| План Гвардии | `lib/guards/plan-features.guard.ts` | Ограничения на отправку по плану |

## Модель данных отправки

Интерфейс `Submission` представляет собой отправку в пользовательском интерфейсе:

```ts
export interface Submission {
  id: string;
  title: string;
  description: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  source_url?: string;
}
```

Помощник `toSubmission` преобразует модель данных API:

```ts
export function toSubmission(
  item: ClientSubmissionData
): Submission {
  const approvedAt =
    item.status === 'approved' ? item.reviewed_at : undefined;
  const rejectedAt =
    item.status === 'rejected' ? item.reviewed_at : undefined;

  return {
    id: item.id,
    title: item.name,
    description: item.description,
    status: (['approved', 'pending', 'rejected'].includes(
      item.status
    )
      ? item.status
      : 'pending') as Submission['status'],
    submittedAt: item.submitted_at || item.updated_at || null,
    approvedAt,
    rejectedAt,
    rejectionReason: item.review_notes,
    category: Array.isArray(item.category)
      ? item.category[0] || 'Uncategorized'
      : item.category || 'Uncategorized',
    tags: item.tags || [],
    views: item.views || 0,
    likes: item.likes || 0,
    source_url: item.source_url,
  };
}
```

## Компонент списка отправки

Компонент `SubmissionList` отображает список отправленных материалов с состояниями загрузки, пустого и заполненного:

```tsx
export interface SubmissionListProps {
  items: ClientSubmissionData[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  deletingId?: string | null;
  updatingId?: string | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateActionLabel?: string;
  emptyStateActionHref?: string;
  skeletonCount?: number;
}
```

Ключевые модели поведения:

- **Состояние загрузки** – отображает `SubmissionItemSkeleton` заполнителей.
- **Пустое состояние** – показывает призыв к действию, ссылающийся на `/submit` .
- **Заполненное состояние** — отображает элементы через `toSubmission()` и отображает `SubmissionItem` для каждого.
- **Оптимистичные индикаторы загрузки** -- `deletingId` и `updatingId` отключают затронутые элементы.

Вариант `SubmissionListWithInfo` добавляет отображение метаданных с нумерацией страниц.

## Конфигурация статуса

Каждый статус отправки соответствует значку, цветовой схеме и ключу перевода:

```ts
const statusConfig = {
  approved: {
    labelKey: "STATUS_APPROVED",
    icon: FiCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pending: {
    labelKey: "STATUS_PENDING",
    icon: FiClock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  rejected: {
    labelKey: "STATUS_REJECTED",
    icon: FiX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};
```

В случае отклонения заявок причина отклонения отображается в красном поле.

## Фильтры отправки

Компонент `SubmissionFilters` обеспечивает фильтрацию статуса в стиле табуляции и текстовый поиск:

```tsx
export interface SubmissionFiltersProps {
  status: ClientStatusFilter;
  search: string;
  onStatusChange: (status: ClientStatusFilter) => void;
  onSearchChange: (search: string) => void;
  isSearching?: boolean;
  disabled?: boolean;
  statusCounts?: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}
```

Особенности:

- **Вкладки статуса**. Кнопки для табличек «Все», «Одобрено», «Ожидание» и «Отклонено» с дополнительными значками подсчета.
- **Ввод поиска** — Полнотекстовый поиск с кнопкой очистки и индикатором загрузки.
- **Компактный вариант** – `SubmissionFiltersCompact` использует раскрывающийся список для макетов с ограниченным пространством.

## Карты статистики

Компонент `SubmissionStatsCards` отображает четыре карточки статистики в сетке:

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

Четыре карты показывают:

| Карта | Ключ | Цвет |
|------|-----|-------|
| Всего представлено | `total` | Синий |
| Одобрено | `approved` | Зеленый |
| В ожидании | `pending` | Желтый |
| Отклонено | `rejected` | Красный |

Каждая карточка имеет градиентный фон значка, анимированный скелет загрузки и эффект тени при наведении.

## Карточка отправленного предмета

Каждый `SubmissionItem` отображает:

- Титул со статусным значком
- Сокращенное описание (двухстрочный зажим)
- До 5 тегов со счетчиком переполнения
– Строка метаданных: категория, дата отправки, количество просмотров, количество лайков.
- Кнопки действий: Просмотр, Редактировать, Удалить.
- Загрузка счетчиков на кнопках редактирования/удаления во время выполнения операций.
- Отключенное состояние во время массовых операций.

## Ограничения на отправку на основе плана

Система защиты плана контролирует, сколько материалов может сделать пользователь:

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

Чтобы проверить лимиты перед отправкой:

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

Дополнительные запланированные функции для отправки:

| Особенность | Бесплатно | Стандарт | Премиум |
|---------|------|----------|---------|
| Отправить элементы | Да | Да | Да |
| Макс. изображений | 1 | 5 | Неограниченный |
| Слова описания | 200 | 500 | Неограниченный |
| Загрузка видео | Нет | Нет | Да |
| Проверенный значок | Нет | Да | Да |
| Приоритетный обзор | Нет | Да | Да |
| Мгновенный обзор | Нет | Нет | Да |
| Время рассмотрения (дней) | 7 | 3 | 1 |

## Рабочий процесс отправки

1. **Пользователь отправляет** – заполняет многоэтапную форму отправки.
2. **Проверка** – проверяются ограничения плана и проверка входных данных.
3. **Хранилище** – данные элемента хранятся в CMS на базе Git через службу элементов.
4. **Статус: Ожидание** – заявка попадает в очередь на проверку администратором.
5. **Проверка администратором** – администратор одобряет или отклоняет с необязательными примечаниями.
6. **Статус: одобрено/отклонено** – пользователь видит обновленный статус на своей панели управления.
7. **Редактировать** – пользователи могут редактировать отправленные материалы (в пределах ограничений плана).
8. **Удалить** – пользователи могут удалять свои собственные материалы с помощью диалогового окна подтверждения.

## Интернационализация

Весь текст пользовательского интерфейса использует переводы `next-intl` в пространстве имен `client.submissions` :

- `NO_SUBMISSIONS_TITLE` -- Пустой заголовок состояния
- `NO_SUBMISSIONS_DESC` -- Описание пустого состояния
- `SUBMIT_FIRST_PROJECT` -- Кнопка призыва к действию
- `STATUS_APPROVED` , `STATUS_PENDING` , `STATUS_REJECTED` -- Ярлыки состояния
- `SUBMITTED` -- Префикс даты
- `VIEWS_COUNT` , `LIKES_COUNT` -- Метрические метки с параметром количества
- `REJECTION_REASON` -- Метка уведомления об отклонении
- `SEARCH_PLACEHOLDER` -- Заполнитель для ввода поиска
- `SHOWING_RESULTS` , `PAGE_INFO` -- Текст нумерации страниц

## Сопутствующая документация

– [Многошаговые формы](/docs/template/features/multi-step-forms) – реализация формы отправки.
– [Управление администратором](/docs/template/features/admin-management) – рабочий процесс проверки администратором.
- [Голосование и комментарии](/docs/template/features/voting-comments) -- Участие в представленных материалах.
