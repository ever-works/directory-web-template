---
id: view-tracking
title: Просмотр отслеживания и взаимодействия
sidebar_label: Просмотр отслеживания
sidebar_position: 35
---

# Просмотр отслеживания и взаимодействия

Шаблон включает в себя систему отслеживания просмотров, обеспечивающую конфиденциальность, которая записывает уникальные ежедневные просмотры каждого элемента. Он обеспечивает подсчет просмотров на страницах элементов, аналитику информационной панели, рейтинг трендовых элементов и оценку популярности.

## Обзор архитектуры

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## Конвейер обработки

Когда пользователь посещает страницу сведений об элементе, компонент `ItemViewTracker` запускает запрос POST. Сервер обрабатывает его через многоэтапный конвейер:

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

### Формат ответа

```json
{ "success": true, "counted": true }
```

| Ответ | Значение |
|----------|---------|
| `counted: true` | Зафиксирован новый просмотр |
| `counted: false` | Дубликат на сегодня (тот же просмотрщик + элемент + дата) |
| `counted: false, reason: "bot"` | Обнаружен пользовательский агент бота |
| `counted: false, reason: "owner"` | Аутентифицированный пользователь просматривает свой товар |

## Клиентский трекер `ItemViewTracker` — это клиентский компонент, который запускает один POST-запрос при монтировании:

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

Трекер использует подход «максимальных усилий»: сбои молча игнорируются, поэтому отслеживание просмотров никогда не мешает работе пользователя.

## Обнаружение ботов

Модуль `lib/utils/bot-detection.ts` поддерживает список известных шаблонов пользовательских агентов ботов, включая сканеры поисковых систем, инструменты мониторинга и автоматические клиенты. При обнаружении бота конечная точка возвращает успешный ответ с `counted: false` , не затрагивая базу данных.

## Идентификация зрителя

Просмотры присваиваются идентификатору зрителя, хранящемуся в основном файле cookie только для HTTP:

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### Свойства конфиденциальности

- **Нет личных данных** — файл cookie содержит только случайный UUID, а не личность пользователя.
- **Только HTTP** – JavaScript не может прочитать файл cookie, что предотвращает утечку данных с помощью отслеживания XSS.
- **Слабость использования одного и того же сайта** – файл cookie не отправляется при запросах между источниками.
- **Флаг безопасности** – в рабочей среде применяется требование HTTPS.
- **Никаких сторонних сервисов** — все данные отслеживания остаются в вашей базе данных.

## Ежедневная дедупликация

Основная логика записи использует PostgreSQL `ON CONFLICT DO NOTHING` :

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

Таблица `itemViews` имеет уникальное ограничение на `(itemId, viewerId, viewedDateUtc)` . Первое представление дня для пары «просмотрщик-элемент» вставляет строку и возвращает `true` . Последующие просмотры в тот же день молча пропускаются. Дата вычисляется как UTC `YYYY-MM-DD` для последовательной дедупликации независимо от часового пояса.

## Исключение владельца

Когда аутентифицированный пользователь просматривает свой собственный элемент, просмотр не засчитывается:

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

Это не позволяет владельцам объектов искусственно увеличивать количество просмотров.

## Агрегационные запросы

Файл `item-view.queries.ts` экспортирует несколько функций для аналитики:

| Функция | Тип возврата | Описание |
|----------|-------------|-------------|
| `getTotalViewsCount(slugs)` | `number` | Общее количество просмотров отдельных фрагментов за все время |
| `getRecentViewsCount(slugs, days)` | `number` | Просмотры в скользящем окне (по умолчанию 7 дней) |
| `getDailyViewsData(slugs, days)` | `Map<string, number>` | Карта с датой для спарклайн-диаграмм |
| `getViewsPerItem(slugs)` | `Map<string, number>` | Общее количество просмотров по каждому элементу для рейтинга |

## Интеграция аналитики

### Оценка популярности

Количество просмотров учитывается в логарифмическом алгоритме оценки популярности, используемом системой общих карт:

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

Это гарантирует, что элементы с большим количеством просмотров будут иметь более высокий рейтинг в режиме сортировки «Популярные», предотвращая при этом неконтролируемый рост рейтинга вирусных элементов.

### Панель управления клиента

Панель управления клиента по адресу `/client/dashboard` отображает:
- Общее количество просмотров всех отправленных элементов.
- Просмотры за последние 7 дней с индикаторами тренда
- График ежедневных просмотров через `getDailyViewsData` ### Панель администратора

Панель администратора использует `GET /api/admin/dashboard/stats` для показателей просмотра по всему сайту. Конечная точка геоаналитики обеспечивает географическое распределение представлений.

## Обработка ошибок

Ошибки отслеживания просмотров обрабатываются в рабочей среде автоматически:

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

В режиме разработки регистрируются ошибки для отладки. Производство подавляет вывод консоли, чтобы избежать шума.

## Конфигурация

Отслеживание просмотров осуществляется автоматически, без необходимости использования переменных среды. Система изящно деградирует:

- **База данных отсутствует** — конечная точка возвращает 503, а клиент игнорирует ошибку.
- **Режим моделирования базы данных** — если этот параметр включен, представления отслеживаются по смоделированным данным.
– **Флаги функций** – количество просмотров отображается условно в зависимости от настроек шаблона.

## Доступность

- `ItemViewTracker` не отображает элементы DOM, что обеспечивает нулевое влияние на макет страницы и программы чтения с экрана.
- Количество просмотров, отображаемое на карточках, использует атрибуты `aria-label` для контекста программы чтения с экрана.
- Диаграммы представления информационной панели включают описательные заголовки и сводный текст.

## Сопутствующая документация

- [Компоненты информационной панели](/docs/template/comComponents/dashboard-comComponents) - Просмотр статистики.
- [Компоненты общей карты](/docs/template/comComponents/shared-card-comComponents) – Оценка популярности
– [Административная аналитика](/docs/template/features/admin-analytics) – показатели просмотра по всему сайту.
– [Голосование и комментарии](/docs/template/features/voting-comments) – Другие функции взаимодействия.
