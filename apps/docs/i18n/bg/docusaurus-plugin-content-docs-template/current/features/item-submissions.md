---
id: item-submissions
title: Изпращане на артикули
sidebar_label: Изпращане на артикули
sidebar_position: 31
---

# Изпращане на артикул

Системата за подаване на артикули предоставя пълен работен процес за потребителите да изпращат, управляват и проследяват списъци с директории. Включва проследяване на състоянието (предстоящо, одобрено, отхвърлено), филтриране, статистически карти, детайлни модали, модали за редактиране и изтриване с потвърждение.

## Преглед на архитектурата

| Модул | Път | Цел |
|--------|------|---------|
| SubmissionList | `components/submissions/submission-list.tsx` | Компонент на основния списък с пагинация |
| SubmissionItem | `components/submissions/submission-item.tsx` | Индивидуална карта за подаване |
| Филтри за подаване | `components/submissions/submission-filters.tsx` | Раздели за състояние и търсене |
| Изпращане на статистически карти | `components/submissions/submission-stats-cards.tsx` | Преглед на статистически карти |
| EditSubmissionModal | `components/submissions/edit-submission-modal.tsx` | Модал за вградено редактиране |
| SubmissionDetailModal | `components/submissions/submission-detail-modal.tsx` | Подробен изглед само за четене |
| Диалог за изтриване на изпращане | `components/submissions/delete-submission-dialog.tsx` | Потвърждение за изтриване |
| TrashItem | `components/submissions/trash-item.tsx` | Показване на кошчето |
| План Guard | `lib/guards/plan-features.guard.ts` | Ограничения за подаване по план |

## Модел на данни за подаване

Интерфейсът `Submission` представлява подаване в потребителския интерфейс:

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

Помощникът `toSubmission` преобразува от модела на данни на API:

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

## Компонент на списъка за изпращане

Компонентът `SubmissionList` изобразява списъка с изпращания със състояния на зареждане, празно и попълнено:

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

Ключови поведения:

- **Състояние на зареждане** -- изобразява `SubmissionItemSkeleton` контейнери
- **Празно състояние** -- показва призив за действие, свързващ към `/submit` - **Населено състояние** -- картографира елементи през `toSubmission()` и изобразява `SubmissionItem` за всеки
- **Оптимистични индикатори за зареждане** -- `deletingId` и `updatingId` деактивират засегнатите елементи

Вариантът `SubmissionListWithInfo` добавя показване на метаданни за страниране.

## Конфигурация на състоянието

Всеки статус на подаване се съпоставя с икона, цветова схема и ключ за превод:

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

Отхвърлените подавания показват причината за отхвърляне в червено допълнително поле.

## Филтри за подаване

Компонентът `SubmissionFilters` осигурява филтриране на състоянието в стил раздел и търсене на текст:

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

Характеристики:

- **Раздели за състояние** - Бутони за хапчета за всички, одобрени, чакащи и отхвърлени с незадължителни значки за преброяване
- **Въведено търсене** -- Пълнотекстово търсене с бутон за изчистване и бутон за зареждане
- **Компактен вариант** -- `SubmissionFiltersCompact` използва избор от падащо меню за оформления с ограничено пространство

## Статистически карти

Компонентът `SubmissionStatsCards` показва четири статистически карти в мрежа:

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

Четирите карти показват:

| Карта | Ключ | Цвят |
|------|-----|-------|
| Общо изпращания | `total` | Син |
| Одобрено | `approved` | Зелен |
| В очакване | `pending` | Жълто |
| Отхвърлен | `rejected` | Червено |

Всяка карта има фон на градиентна икона, анимиран скелет за зареждане и ефект на сянка при задържане.

## Карта на артикул за подаване

Всеки `SubmissionItem` изобразява:

- Заглавие със значка за статус
- Съкратено описание (двуредова скоба)
- До 5 етикета с препълващ брой
- Ред с метаданни: категория, дата на изпращане, брой прегледи, брой харесвания
- Бутони за действие: Преглед, Редактиране, Изтриване
- Зареждане на ротатори на бутоните за редактиране/изтриване, когато операциите са в ход
- Забранено състояние по време на групови операции

## Ограничения за подаване, базирани на плана

Системата за защита на плана контролира колко изпращания може да направи потребител:

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

За да проверите ограниченията преди изпращане:

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

Допълнителни функции с ограничен план за изпращане на документи:

| Характеристика | Безплатно | Стандартен | Премиум |
|---------|------|----------|---------|
| Изпратете елементи | Да | Да | Да |
| Макс изображения | 1 | 5 | Неограничен |
| Описателни думи | 200 | 500 | Неограничен |
| Качване на видео | Не | Не | Да |
| Потвърдена значка | Не | Да | Да |
| Приоритетен преглед | Не | Да | Да |
| Незабавен преглед | Не | Не | Да |
| Време за преглед (дни) | 7 | 3 | 1 |

## Работен процес на подаване

1. **Потребител изпраща** -- Попълва многоетапния формуляр за изпращане
2. **Проверка** -- Ограниченията на плана и проверката на входа се проверяват
3. **Съхранение** -- Данните за артикулите се съхраняват в базираната на Git CMS чрез услугата за артикули
4. **Статус: Предстоящо** -- Изпращането влиза в опашката за администраторски преглед
5. **Администраторски преглед** -- Администраторът одобрява или отхвърля с незадължителни бележки
6. **Статус: Одобрен/Отхвърлен** -- Потребителят вижда актуализиран статус в своето табло за управление
7. **Редактиране** -- Потребителите могат да редактират изпращания (в рамките на ограниченията за модификация на плана)
8. **Изтриване** -- Потребителите могат да изтрият своите собствени заявки с диалогов прозорец за потвърждение

## Интернационализация

Целият текст на потребителския интерфейс използва `next-intl` преводи под `client.submissions` пространство от имена:

- `NO_SUBMISSIONS_TITLE` -- Заглавие с празно състояние
- `NO_SUBMISSIONS_DESC` -- Описание на празно състояние
- `SUBMIT_FIRST_PROJECT` -- Бутон с призив за действие
- `STATUS_APPROVED` , `STATUS_PENDING` , `STATUS_REJECTED` -- Етикети за състояние
- `SUBMITTED` -- Префикс за дата
- `VIEWS_COUNT` , `LIKES_COUNT` -- Метрични етикети с параметър за броене
- `REJECTION_REASON` -- Етикет с надпис за отхвърляне
- `SEARCH_PLACEHOLDER` -- Заместител за въвеждане на търсене
- `SHOWING_RESULTS` , `PAGE_INFO` -- Текст на страниците

## Свързана документация

– [Формуляри в няколко стъпки](/docs/template/features/multi-step-forms) – Внедряване на формуляр за подаване
– [Администраторско управление](/docs/template/features/admin-management) – Работен процес за преглед на администраторите
- [Гласуване и коментари](/docs/template/features/voting-comments) -- Ангажираност при подаване
